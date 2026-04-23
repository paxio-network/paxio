//! Stable storage layout for the audit log.
//!
//! Three logical tables (each backed by its own virtual memory region):
//!
//! | Region | Key       | Value     | Purpose                                   |
//! |--------|-----------|-----------|-------------------------------------------|
//! | 0      | u64 index | LogEntry  | Append-only ordered log                   |
//! | 1      | tx_id Str | u64 index | Idempotency: tx_id → existing index       |
//! | 2      | ()        | String    | Last entry_hash (chain head, hex 64)      |
//! | 3      | ()        | u64       | Next index to assign (== current length)  |
//!
//! In **canister** runtime everything lives in stable memory (survives upgrades).
//! In **native test** builds we shadow the same API with `RefCell<BTreeMap>` so
//! integration tests don't need a replica.

use crate::types::{zero_hash, LogEntry};

// ---------------------------------------------------------------------------
//  Time source — wraps ic_cdk::api::time() so unit tests don't trap.
// ---------------------------------------------------------------------------

#[cfg(target_arch = "wasm32")]
pub fn now_ns() -> u64 {
    ic_cdk::api::time()
}

#[cfg(not(target_arch = "wasm32"))]
pub fn now_ns() -> u64 {
    // Tests don't assert specific timestamps — return 0 so behaviour is deterministic.
    0
}

// ---------------------------------------------------------------------------
//  Native (non-wasm) backend — used by `cargo test` and any non-canister build.
//  This is the only backend M04 actually exercises through tests.
// ---------------------------------------------------------------------------

#[cfg(not(target_arch = "wasm32"))]
mod backend {
    use super::*;
    use std::cell::RefCell;
    use std::collections::BTreeMap;

    thread_local! {
        static ENTRIES: RefCell<BTreeMap<u64, LogEntry>> = const { RefCell::new(BTreeMap::new()) };
        static TX_INDEX: RefCell<BTreeMap<String, u64>> = const { RefCell::new(BTreeMap::new()) };
        static LAST_HASH: RefCell<String> = RefCell::new(zero_hash());
        static NEXT_INDEX: RefCell<u64> = const { RefCell::new(0) };
    }

    pub fn next_index() -> u64 {
        NEXT_INDEX.with(|n| *n.borrow())
    }

    pub fn last_hash() -> String {
        LAST_HASH.with(|h| h.borrow().clone())
    }

    pub fn lookup_tx(tx_id: &str) -> Option<u64> {
        TX_INDEX.with(|t| t.borrow().get(tx_id).copied())
    }

    pub fn get_entry(index: u64) -> Option<LogEntry> {
        ENTRIES.with(|e| e.borrow().get(&index).cloned())
    }

    /// Atomically append a new entry, advancing the chain head and `next_index`.
    /// Caller must have already verified the entry's `prev_hash`/`entry_hash`.
    pub fn append(entry: LogEntry) {
        let idx = entry.index;
        let hash = entry.entry_hash.clone();
        let tx_id = entry.tx_id.clone();
        ENTRIES.with(|e| e.borrow_mut().insert(idx, entry));
        TX_INDEX.with(|t| t.borrow_mut().insert(tx_id, idx));
        LAST_HASH.with(|h| *h.borrow_mut() = hash);
        NEXT_INDEX.with(|n| *n.borrow_mut() = idx + 1);
    }

    /// Iterate every entry in index order.  Used by `verify_chain` and queries.
    pub fn iter_entries<F: FnMut(&LogEntry)>(mut f: F) {
        ENTRIES.with(|e| {
            for entry in e.borrow().values() {
                f(entry);
            }
        });
    }

    /// Test-only reset — clears all in-memory tables.
    pub fn reset() {
        ENTRIES.with(|e| e.borrow_mut().clear());
        TX_INDEX.with(|t| t.borrow_mut().clear());
        LAST_HASH.with(|h| *h.borrow_mut() = zero_hash());
        NEXT_INDEX.with(|n| *n.borrow_mut() = 0);
    }
}

// ---------------------------------------------------------------------------
//  WASM backend — stable structures, survives canister upgrades.
//  Layout mirrors the native API one-to-one so lib.rs is backend-agnostic.
// ---------------------------------------------------------------------------

#[cfg(target_arch = "wasm32")]
mod backend {
    use super::*;
    use candid::{Decode, Encode};
    use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
    use ic_stable_structures::storable::Bound;
    use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
    use std::borrow::Cow;
    use std::cell::RefCell;

    type Mem = VirtualMemory<DefaultMemoryImpl>;

    // ---- Storable wrappers (StableBTreeMap requires Storable + bounded sizes) ----

    impl Storable for LogEntry {
        fn to_bytes(&self) -> Cow<[u8]> {
            Cow::Owned(Encode!(self).expect("encode LogEntry"))
        }
        fn from_bytes(bytes: Cow<[u8]>) -> Self {
            Decode!(bytes.as_ref(), LogEntry).expect("decode LogEntry")
        }
        const BOUND: Bound = Bound::Unbounded;
    }

    /// Newtype around String so we can implement bounded Storable for tx_id keys.
    #[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
    pub struct TxIdKey(pub String);

    impl Storable for TxIdKey {
        fn to_bytes(&self) -> Cow<[u8]> {
            Cow::Owned(self.0.as_bytes().to_vec())
        }
        fn from_bytes(bytes: Cow<[u8]>) -> Self {
            TxIdKey(String::from_utf8(bytes.into_owned()).expect("tx_id utf8"))
        }
        const BOUND: Bound = Bound::Bounded {
            max_size: 256,
            is_fixed_size: false,
        };
    }

    /// Wrapper for the chain-head hash so we can store it in a StableCell.
    #[derive(Clone, Debug)]
    pub struct HashCell(pub String);

    impl Default for HashCell {
        fn default() -> Self {
            HashCell(zero_hash())
        }
    }

    impl Storable for HashCell {
        fn to_bytes(&self) -> Cow<[u8]> {
            Cow::Owned(self.0.as_bytes().to_vec())
        }
        fn from_bytes(bytes: Cow<[u8]>) -> Self {
            HashCell(String::from_utf8(bytes.into_owned()).expect("hash utf8"))
        }
        const BOUND: Bound = Bound::Bounded {
            max_size: 64,
            is_fixed_size: true,
        };
    }

    thread_local! {
        static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
            RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

        static ENTRIES: RefCell<StableBTreeMap<u64, LogEntry, Mem>> = RefCell::new(
            StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))),
        );

        static TX_INDEX: RefCell<StableBTreeMap<TxIdKey, u64, Mem>> = RefCell::new(
            StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))),
        );

        static LAST_HASH: RefCell<StableCell<HashCell, Mem>> = RefCell::new(
            StableCell::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2))),
                HashCell::default(),
            )
            .expect("init last-hash cell"),
        );

        static NEXT_INDEX: RefCell<StableCell<u64, Mem>> = RefCell::new(
            StableCell::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))),
                0u64,
            )
            .expect("init next-index cell"),
        );
    }

    pub fn next_index() -> u64 {
        NEXT_INDEX.with(|n| *n.borrow().get())
    }

    pub fn last_hash() -> String {
        LAST_HASH.with(|h| h.borrow().get().0.clone())
    }

    pub fn lookup_tx(tx_id: &str) -> Option<u64> {
        TX_INDEX.with(|t| t.borrow().get(&TxIdKey(tx_id.to_string())))
    }

    pub fn get_entry(index: u64) -> Option<LogEntry> {
        ENTRIES.with(|e| e.borrow().get(&index))
    }

    pub fn append(entry: LogEntry) {
        let idx = entry.index;
        let hash = entry.entry_hash.clone();
        let tx_id = entry.tx_id.clone();
        ENTRIES.with(|e| {
            e.borrow_mut().insert(idx, entry);
        });
        TX_INDEX.with(|t| {
            t.borrow_mut().insert(TxIdKey(tx_id), idx);
        });
        LAST_HASH.with(|h| {
            let _ = h.borrow_mut().set(HashCell(hash));
        });
        NEXT_INDEX.with(|n| {
            let _ = n.borrow_mut().set(idx + 1);
        });
    }

    pub fn iter_entries<F: FnMut(&LogEntry)>(mut f: F) {
        ENTRIES.with(|e| {
            for (_, entry) in e.borrow().iter() {
                f(&entry);
            }
        });
    }

    /// Test-only: never compiled into the canister WASM artifact.
    #[cfg(test)]
    pub fn reset() {}
}

// Re-export the active backend's API at module level so lib.rs is backend-agnostic.
pub use backend::*;
