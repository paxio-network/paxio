//! Audit log types — Rust mirror of `packages/types/src/audit-log.ts`.
//!
//! All types derive `CandidType + Deserialize + Serialize + Clone + PartialEq` so they
//! can cross the Candid boundary AND be serialized via bincode for the hash chain.
//!
//! `metadata` uses `BTreeMap<String, String>` (not `HashMap`) so iteration order is
//! deterministic — required for stable bincode output and reproducible hashes.

use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::collections::BTreeMap;

// ---------------------------------------------------------------------------
// AuditAction — mirrors AUDIT_ACTIONS in audit-log.ts.
// Variant names MUST match what `tests/chain_test.rs` references (Sign, Verify, …).
// ---------------------------------------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, Hash)]
pub enum AuditAction {
    Sign,
    Verify,
    Approve,
    Hold,
    Block,
    Register,
    Claim,
}

// ---------------------------------------------------------------------------
// LogEntryInput — caller-provided shape (no index/timestamp/hashes).
// ---------------------------------------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub struct LogEntryInput {
    pub tx_id: String,
    pub agent_did: String,
    pub action: AuditAction,
    pub amount: Option<u128>,
    pub asset: Option<String>,
    pub metadata: BTreeMap<String, String>,
}

// ---------------------------------------------------------------------------
// LogEntry — stored shape. `entry_hash` excluded from EntryCore (see chain.rs).
// ---------------------------------------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub struct LogEntry {
    pub index: u64,
    pub tx_id: String,
    pub agent_did: String,
    pub action: AuditAction,
    pub amount: Option<u128>,
    pub asset: Option<String>,
    pub metadata: BTreeMap<String, String>,
    pub timestamp: u64,
    pub prev_hash: String,  // 64 hex chars — SHA-256 of previous entry (or "0"×64 for genesis)
    pub entry_hash: String, // 64 hex chars — SHA-256(prev_hash || bincode(EntryCore))
}

// ---------------------------------------------------------------------------
// LogQuery + LogQueryResponse — read API.
// ---------------------------------------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub struct LogQuery {
    pub agent_did: Option<String>,
    pub action: Option<AuditAction>,
    pub start_time: Option<u64>,
    pub end_time: Option<u64>,
    pub limit: u32,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub struct LogQueryResponse {
    pub entries: Vec<LogEntry>,
    pub total: u32,
}

// ---------------------------------------------------------------------------
// ForensicsTrail — full per-DID trail + chain validity + anchoring root hash.
// ---------------------------------------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub struct ForensicsTrail {
    pub agent_did: String,
    pub entries: Vec<LogEntry>,
    pub chain_valid: bool,
    pub root_hash: String, // 64 hex chars — entry_hash of last entry, or "0"×64 if no entries
}

// ---------------------------------------------------------------------------
// Defaults / helpers
// ---------------------------------------------------------------------------

/// Default per-page limit when caller passes 0 (treated as "use default").
pub const DEFAULT_LIMIT: u32 = 100;

/// Hard upper bound — even if caller asks for more, we return at most this.
pub const MAX_LIMIT: u32 = 1000;

/// Genesis prev_hash — 64 zero hex chars.
pub fn zero_hash() -> String {
    "0".repeat(64)
}
