//! Pure cryptographic hash chain.
//!
//! `EntryCore` = all `LogEntry` fields EXCEPT `entry_hash`.  We bincode-serialize it
//! together with `prev_hash` and SHA-256 the result.  This is intentionally pure and
//! deterministic — no `ic_cdk::api::time()` calls, no global state — so unit tests
//! can call it directly outside the canister runtime.

use crate::types::{AuditAction, LogEntry};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

/// Subset of `LogEntry` covered by `entry_hash`.  Order of fields here defines the
/// canonical bincode layout — DO NOT reorder once entries exist.
#[derive(Serialize)]
pub struct EntryCore<'a> {
    pub index: u64,
    pub tx_id: &'a str,
    pub agent_did: &'a str,
    pub action: &'a AuditAction,
    pub amount: &'a Option<u128>,
    pub asset: &'a Option<String>,
    pub metadata: &'a BTreeMap<String, String>,
    pub timestamp: u64,
}

impl<'a> EntryCore<'a> {
    pub fn from_entry(e: &'a LogEntry) -> Self {
        Self {
            index: e.index,
            tx_id: &e.tx_id,
            agent_did: &e.agent_did,
            action: &e.action,
            amount: &e.amount,
            asset: &e.asset,
            metadata: &e.metadata,
            timestamp: e.timestamp,
        }
    }
}

/// Compute the `entry_hash` for a given `prev_hash` + entry core.
///
/// Format:  `sha256( prev_hash_bytes ‖ bincode(entry_core) )` → lowercase hex.
///
/// `prev_hash` is the ASCII hex representation (64 chars) — we hash its raw bytes
/// directly (no decoding) so a tampered entry surfaces immediately as a mismatch.
pub fn compute_entry_hash(prev_hash: &str, core: &EntryCore<'_>) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prev_hash.as_bytes());
    let serialized = bincode::serialize(core)
        .expect("bincode serialization of EntryCore must not fail (all fields are serializable)");
    hasher.update(&serialized);
    let digest = hasher.finalize();
    hex_lower(&digest)
}

/// Lowercase hex encoding without external deps — keeps Cargo.toml minimal.
fn hex_lower(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0x0f) as usize] as char);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_lower_produces_64_chars_for_sha256() {
        let h = compute_entry_hash(
            &"0".repeat(64),
            &EntryCore {
                index: 0,
                tx_id: "x",
                agent_did: "did:paxio:base:0xa",
                action: &AuditAction::Register,
                amount: &None,
                asset: &None,
                metadata: &BTreeMap::new(),
                timestamp: 0,
            },
        );
        assert_eq!(h.len(), 64);
        assert!(h
            .chars()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
    }

    #[test]
    fn hash_is_deterministic() {
        let core = EntryCore {
            index: 7,
            tx_id: "tx",
            agent_did: "did:paxio:base:0xa",
            action: &AuditAction::Sign,
            amount: &Some(123),
            asset: &Some("btc".to_string()),
            metadata: &BTreeMap::new(),
            timestamp: 42,
        };
        let h1 = compute_entry_hash(&"0".repeat(64), &core);
        let h2 = compute_entry_hash(&"0".repeat(64), &core);
        assert_eq!(h1, h2);
    }

    #[test]
    fn changing_prev_hash_changes_entry_hash() {
        let core = EntryCore {
            index: 0,
            tx_id: "tx",
            agent_did: "did:paxio:base:0xa",
            action: &AuditAction::Sign,
            amount: &None,
            asset: &None,
            metadata: &BTreeMap::new(),
            timestamp: 0,
        };
        let h1 = compute_entry_hash(&"0".repeat(64), &core);
        let h2 = compute_entry_hash(&"1".repeat(64), &core);
        assert_ne!(h1, h2);
    }
}
