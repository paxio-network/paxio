//! Paxio M04 — Audit Log canister (FA-06).
//!
//! Append-only, tamper-evident log.  Every entry is chained to the previous via
//! `entry_hash = sha256(prev_hash || bincode(entry_core))`, so altering any
//! historical entry invalidates every subsequent entry's hash.
//!
//! ## Public API (mirrors `audit_log.did` / `packages/types/src/audit-log.ts`)
//!
//! | Method                   | Mode      | Behaviour                                           |
//! |--------------------------|-----------|-----------------------------------------------------|
//! | `log_entry(input)`       | `update`  | Append.  Idempotent on `tx_id`.                     |
//! | `get_entries(query)`     | `query`   | Filter by agent/action/time + paginate.             |
//! | `get_forensics_trail(d)` | `query`   | All entries for `d` + `chain_valid` + `root_hash`.  |
//! | `verify_chain()`         | `query`   | Recompute every hash, return `true` if intact.      |
//!
//! ## Immutability
//!
//! The audit log is strictly append-only — there is no removal or admin-reset
//! endpoint in production code (acceptance step 5 enforces this via grep).
//! The only mutation method is `log_entry`.  `reset_for_test` is gated behind
//! `#[cfg(not(target_arch = "wasm32"))]` and is therefore stripped from the
//! canister WASM artifact.

#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
// `expect` is allowed in `chain.rs` for the bincode call (infallible by construction)
// and in storage.rs WASM init.  Re-allow inside this crate where pragmatic.
#![allow(clippy::expect_used)]

mod chain;
mod errors;
mod storage;
mod types;

pub use errors::AuditLogError;
pub use types::{
    AuditAction, ForensicsTrail, LogEntry, LogEntryInput, LogQuery, LogQueryResponse,
    DEFAULT_LIMIT, MAX_LIMIT,
};

use chain::{compute_entry_hash, EntryCore};
use types::zero_hash;

// `#[update]` / `#[query]` are emitted only when targeting wasm32 — the macros
// generate `canister_update`/`canister_query` linker directives that the native
// linker can't parse.  All four functions are still `pub` and callable from
// native integration tests; the canister WASM artifact gets the IC entry points.
#[cfg(target_arch = "wasm32")]
use ic_cdk_macros::{query, update};

// ---------------------------------------------------------------------------
//  log_entry — append + idempotent on tx_id.
// ---------------------------------------------------------------------------

#[cfg_attr(target_arch = "wasm32", update)]
pub fn log_entry(input: LogEntryInput) -> Result<LogEntry, AuditLogError> {
    if input.tx_id.is_empty() {
        return Err(AuditLogError::EmptyTxId);
    }
    if input.agent_did.is_empty() {
        return Err(AuditLogError::EmptyAgentDid);
    }

    // Idempotency: if tx_id already logged, return the existing entry verbatim.
    if let Some(existing_index) = storage::lookup_tx(&input.tx_id) {
        if let Some(existing) = storage::get_entry(existing_index) {
            return Ok(existing);
        }
        // tx_id index points at a missing entry → storage corruption.
        return Err(AuditLogError::StorageError(format!(
            "tx_id index references missing entry at index {existing_index}"
        )));
    }

    let index = storage::next_index();
    let prev_hash = storage::last_hash();
    let timestamp = storage::now_ns();

    // Compute hash on a borrowed view of the new entry's fields.
    let core = EntryCore {
        index,
        tx_id: &input.tx_id,
        agent_did: &input.agent_did,
        action: &input.action,
        amount: &input.amount,
        asset: &input.asset,
        metadata: &input.metadata,
        timestamp,
    };
    let entry_hash = compute_entry_hash(&prev_hash, &core);

    let entry = LogEntry {
        index,
        tx_id: input.tx_id,
        agent_did: input.agent_did,
        action: input.action,
        amount: input.amount,
        asset: input.asset,
        metadata: input.metadata,
        timestamp,
        prev_hash,
        entry_hash,
    };

    storage::append(entry.clone());
    Ok(entry)
}

// ---------------------------------------------------------------------------
//  get_entries — filter + paginate.
// ---------------------------------------------------------------------------

#[cfg_attr(target_arch = "wasm32", query)]
pub fn get_entries(query: LogQuery) -> LogQueryResponse {
    let limit = effective_limit(query.limit);

    let mut matches: Vec<LogEntry> = Vec::new();
    let mut total: u32 = 0;

    storage::iter_entries(|entry| {
        if !matches_filters(entry, &query) {
            return;
        }
        total = total.saturating_add(1);
        if (matches.len() as u32) < limit {
            matches.push(entry.clone());
        }
    });

    LogQueryResponse {
        entries: matches,
        total,
    }
}

fn matches_filters(entry: &LogEntry, q: &LogQuery) -> bool {
    if let Some(ref did) = q.agent_did {
        if entry.agent_did != *did {
            return false;
        }
    }
    if let Some(ref action) = q.action {
        if entry.action != *action {
            return false;
        }
    }
    if let Some(start) = q.start_time {
        if entry.timestamp < start {
            return false;
        }
    }
    if let Some(end) = q.end_time {
        if entry.timestamp > end {
            return false;
        }
    }
    true
}

fn effective_limit(requested: u32) -> u32 {
    let l = if requested == 0 { DEFAULT_LIMIT } else { requested };
    l.min(MAX_LIMIT)
}

// ---------------------------------------------------------------------------
//  get_forensics_trail — full per-DID trail with chain validation + anchor.
// ---------------------------------------------------------------------------

#[cfg_attr(target_arch = "wasm32", query)]
pub fn get_forensics_trail(agent_did: String) -> ForensicsTrail {
    let mut entries: Vec<LogEntry> = Vec::new();
    storage::iter_entries(|entry| {
        if entry.agent_did == agent_did {
            entries.push(entry.clone());
        }
    });

    let chain_valid = verify_chain();
    let root_hash = entries
        .last()
        .map(|e| e.entry_hash.clone())
        .unwrap_or_else(zero_hash);

    ForensicsTrail {
        agent_did,
        entries,
        chain_valid,
        root_hash,
    }
}

// ---------------------------------------------------------------------------
//  verify_chain — recompute every hash, return true if intact.
// ---------------------------------------------------------------------------

#[cfg_attr(target_arch = "wasm32", query)]
pub fn verify_chain() -> bool {
    let mut expected_prev = zero_hash();
    let mut expected_index: u64 = 0;
    let mut ok = true;

    storage::iter_entries(|entry| {
        if !ok {
            return;
        }
        if entry.index != expected_index {
            ok = false;
            return;
        }
        if entry.prev_hash != expected_prev {
            ok = false;
            return;
        }
        let core = EntryCore::from_entry(entry);
        let recomputed = compute_entry_hash(&entry.prev_hash, &core);
        if recomputed != entry.entry_hash {
            ok = false;
            return;
        }
        expected_prev = entry.entry_hash.clone();
        expected_index += 1;
    });

    ok
}

// ---------------------------------------------------------------------------
//  reset_for_test — visible to native (cargo test) builds, NEVER in canister WASM.
//  Statically removed from the WASM artifact via cfg guard below.
// ---------------------------------------------------------------------------

#[cfg(not(target_arch = "wasm32"))]
pub fn reset_for_test() {
    storage::reset();
}

// ---------------------------------------------------------------------------
//  Candid export — generates the .did file when invoked via `candid-extractor`.
//  Only emitted for the WASM target; native builds don't need the C symbols.
// ---------------------------------------------------------------------------

#[cfg(target_arch = "wasm32")]
ic_cdk::export_candid!();
