//! Stable-memory storage for the Security Sidecar.
//!
//! Three maps survive canister upgrades via `StableBTreeMap`:
//!   * `POLICIES`         — per-agent rule set, keyed by DID.
//!   * `DAILY_SPEND`      — running total of approved spend per DID. NOTE: the
//!     M03 spec (FA-04 §3) keeps this as a single rolling counter — daily
//!     reset / sliding window is M22+ scope.
//!   * `APPROVED_NONCES`  — per-nonce flag marking that this intent has
//!     already burned budget. Re-verifying with the same nonce will NOT
//!     double-count (engineering-principles §15).
//!
//! We deliberately do NOT cache the `VerifyResponse` itself — see
//! `lib.rs::verify` for the rationale. Briefly: caching would freeze a stale
//! APPROVE even after the budget has been exhausted by other intents in the
//! same period (the M03 acceptance suite covers this case directly:
//! `blocks_when_daily_budget_exceeded` calls `verify` twice with identical
//! intents and expects APPROVE then BLOCK).
//!
//! Each value is wrapped in [`Cbor`] (a tiny `Storable` adapter using
//! `candid::Encode!` / `Decode!`) so that struct evolution stays
//! upgrade-safe — Candid is forward / backward compatible by tag.
//!
//! Test note: `ic-stable-structures::DefaultMemoryImpl` falls back to a plain
//! in-memory `Vec<u8>` outside of a canister, so the same code path runs
//! under `cargo test` and on-chain.

use std::cell::RefCell;

use candid::{decode_one, encode_one, CandidType};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::storable::Bound;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use serde::de::DeserializeOwned;
use std::borrow::Cow;
use std::marker::PhantomData;

use crate::errors::SecurityError;
use crate::types::AgentPolicy;

type Memory = VirtualMemory<DefaultMemoryImpl>;

const MEM_POLICIES: MemoryId = MemoryId::new(0);
const MEM_DAILY_SPEND: MemoryId = MemoryId::new(1);
const MEM_APPROVED_NONCES: MemoryId = MemoryId::new(2);

// --- Generic Candid-encoded value wrapper -------------------------------

/// Newtype wrapping any `CandidType + DeserializeOwned` value so it can be
/// stored as raw bytes inside a `StableBTreeMap`. Encoding is bounded only by
/// available memory; we use `Bound::Unbounded` since policies and verify
/// responses have no compile-time size cap.
#[derive(Clone, Debug)]
pub struct Cbor<T>(pub T, PhantomData<T>);

impl<T> Cbor<T> {
    pub fn new(value: T) -> Self {
        Self(value, PhantomData)
    }

    pub fn into_inner(self) -> T {
        self.0
    }
}

impl<T> Storable for Cbor<T>
where
    T: CandidType + DeserializeOwned + Clone,
{
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        // `encode_one` cannot fail for well-formed Candid types in our schema.
        Cow::Owned(encode_one(&self.0).expect("candid encode"))
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        let value: T = decode_one(&bytes).expect("candid decode");
        Self::new(value)
    }

    const BOUND: Bound = Bound::Unbounded;
}

// --- Thread-local stable maps -------------------------------------------

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static POLICIES: RefCell<StableBTreeMap<String, Cbor<AgentPolicy>, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|mm| mm.borrow().get(MEM_POLICIES))
        ));

    static DAILY_SPEND: RefCell<StableBTreeMap<String, u128, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|mm| mm.borrow().get(MEM_DAILY_SPEND))
        ));

    // Value is `()` — only the key (nonce) matters. `StableBTreeMap` requires
    // a value type, so we use a single byte placeholder.
    static APPROVED_NONCES: RefCell<StableBTreeMap<String, u8, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|mm| mm.borrow().get(MEM_APPROVED_NONCES))
        ));
}

// --- Policy CRUD --------------------------------------------------------

pub fn put_policy(policy: AgentPolicy) -> Result<(), SecurityError> {
    if policy.did.is_empty() {
        return Err(SecurityError::InvalidPolicy("did must not be empty".into()));
    }
    let (start, end) = policy.allowed_hours;
    if start > 23 || end > 23 {
        return Err(SecurityError::InvalidPolicy(
            "allowed_hours must be in 0..=23".into(),
        ));
    }
    POLICIES.with(|m| {
        m.borrow_mut().insert(policy.did.clone(), Cbor::new(policy));
    });
    Ok(())
}

pub fn get_policy(did: &str) -> Result<AgentPolicy, SecurityError> {
    POLICIES.with(|m| {
        m.borrow()
            .get(&did.to_string())
            .map(Cbor::into_inner)
            .ok_or_else(|| SecurityError::PolicyNotFound(did.to_string()))
    })
}

// --- Daily-spend tracker ------------------------------------------------

pub fn get_daily_spent(did: &str) -> u128 {
    DAILY_SPEND.with(|m| m.borrow().get(&did.to_string()).unwrap_or(0))
}

pub fn add_daily_spent(did: &str, amount: u128) {
    DAILY_SPEND.with(|m| {
        let mut map = m.borrow_mut();
        let key = did.to_string();
        let current = map.get(&key).unwrap_or(0);
        map.insert(key, current.saturating_add(amount));
    });
}

// --- Approved-nonce ledger ---------------------------------------------

/// `true` if `nonce` has already been counted toward the daily spend.
pub fn is_nonce_approved(nonce: &str) -> bool {
    APPROVED_NONCES.with(|m| m.borrow().contains_key(&nonce.to_string()))
}

/// Mark `nonce` as having burned budget. Idempotent.
pub fn mark_nonce_approved(nonce: &str) {
    APPROVED_NONCES.with(|m| {
        m.borrow_mut().insert(nonce.to_string(), 1u8);
    });
}

// --- Test reset ---------------------------------------------------------

/// Wipe all stable state. Exposed for the integration tests (`tests/`) — they
/// run in the same process and need a fresh slate per test.
///
/// Safe to call at runtime as well; it simply zeroes the maps. Not invoked
/// by any `#[update]` method, only by `lib::reset_for_test`.
pub fn reset() {
    POLICIES.with(|m| {
        let mut map = m.borrow_mut();
        let keys: Vec<String> = map.iter().map(|(k, _)| k).collect();
        for k in keys {
            map.remove(&k);
        }
    });
    DAILY_SPEND.with(|m| {
        let mut map = m.borrow_mut();
        let keys: Vec<String> = map.iter().map(|(k, _)| k).collect();
        for k in keys {
            map.remove(&k);
        }
    });
    APPROVED_NONCES.with(|m| {
        let mut map = m.borrow_mut();
        let keys: Vec<String> = map.iter().map(|(k, _)| k).collect();
        for k in keys {
            map.remove(&k);
        }
    });
}
