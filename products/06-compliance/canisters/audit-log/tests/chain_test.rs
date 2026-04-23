// M04 Audit Log canister — chain integrity specification (RED).
//
// Dev: icp-dev
// Crate: products/06-compliance/canisters/audit-log/ (to be created)
//
// Target lib.rs MUST expose (for integration tests — mark `#[cfg(test)]` versions if needed):
//   pub fn log_entry(input: LogEntryInput) -> Result<LogEntry, AuditLogError>;
//   pub fn get_entries(query: LogQuery) -> LogQueryResponse;
//   pub fn verify_chain() -> bool;
//   pub fn reset_for_test();  // test-only helper, gated behind #[cfg(test)]
//
// Types mirror packages/types/src/audit-log.ts. Candid .did file lives next to lib.rs.

use audit_log::{
    log_entry, get_entries, verify_chain, reset_for_test,
    AuditAction, LogEntryInput, LogQuery,
};

fn setup() {
    reset_for_test();
}

#[test]
fn genesis_entry_has_zero_prev_hash() {
    setup();
    let e = log_entry(LogEntryInput {
        tx_id: "tx-genesis".to_string(),
        agent_did: "did:paxio:base:0xalice".to_string(),
        action: AuditAction::Register,
        amount: None,
        asset: None,
        metadata: Default::default(),
    })
    .expect("genesis log_entry must succeed");

    assert_eq!(e.index, 0);
    assert_eq!(e.prev_hash, "0".repeat(64));
    assert_eq!(e.entry_hash.len(), 64);
}

#[test]
fn each_entry_chains_to_previous() {
    setup();
    let e1 = log_entry(LogEntryInput {
        tx_id: "tx-1".to_string(),
        agent_did: "did:paxio:base:0xalice".to_string(),
        action: AuditAction::Sign,
        amount: Some(100_000),
        asset: Some("btc".to_string()),
        metadata: Default::default(),
    })
    .unwrap();

    let e2 = log_entry(LogEntryInput {
        tx_id: "tx-2".to_string(),
        agent_did: "did:paxio:base:0xalice".to_string(),
        action: AuditAction::Sign,
        amount: Some(200_000),
        asset: Some("btc".to_string()),
        metadata: Default::default(),
    })
    .unwrap();

    assert_eq!(e1.index, 0);
    assert_eq!(e2.index, 1);
    assert_eq!(e2.prev_hash, e1.entry_hash);
}

#[test]
fn log_entry_is_idempotent_on_same_tx_id() {
    setup();
    let a = log_entry(LogEntryInput {
        tx_id: "dup-tx".to_string(),
        agent_did: "did:paxio:base:0xalice".to_string(),
        action: AuditAction::Sign,
        amount: Some(1),
        asset: Some("btc".to_string()),
        metadata: Default::default(),
    })
    .unwrap();

    let b = log_entry(LogEntryInput {
        tx_id: "dup-tx".to_string(),
        agent_did: "did:paxio:base:0xalice".to_string(),
        action: AuditAction::Sign,
        amount: Some(1),
        asset: Some("btc".to_string()),
        metadata: Default::default(),
    })
    .unwrap();

    // Same index + same hash = idempotent; the second call returns the original.
    assert_eq!(a.index, b.index);
    assert_eq!(a.entry_hash, b.entry_hash);
}

#[test]
fn verify_chain_returns_true_on_fresh_log() {
    setup();
    for i in 0..10 {
        log_entry(LogEntryInput {
            tx_id: format!("tx-{i}"),
            agent_did: "did:paxio:base:0xalice".to_string(),
            action: AuditAction::Sign,
            amount: Some(i as u128),
            asset: Some("btc".to_string()),
            metadata: Default::default(),
        })
        .unwrap();
    }
    assert!(verify_chain());
}

#[test]
fn get_entries_filters_by_agent_did() {
    setup();
    for did in &["did:paxio:base:0xalice", "did:paxio:base:0xbob"] {
        log_entry(LogEntryInput {
            tx_id: format!("tx-{did}"),
            agent_did: (*did).to_string(),
            action: AuditAction::Register,
            amount: None,
            asset: None,
            metadata: Default::default(),
        })
        .unwrap();
    }

    let r = get_entries(LogQuery {
        agent_did: Some("did:paxio:base:0xalice".to_string()),
        action: None,
        start_time: None,
        end_time: None,
        limit: 100,
    });
    assert_eq!(r.total, 1);
    assert_eq!(r.entries.len(), 1);
    assert_eq!(r.entries[0].agent_did, "did:paxio:base:0xalice");
}

#[test]
fn get_entries_filters_by_action() {
    setup();
    log_entry(LogEntryInput {
        tx_id: "tx-reg".to_string(),
        agent_did: "did:paxio:base:0xa".to_string(),
        action: AuditAction::Register,
        amount: None,
        asset: None,
        metadata: Default::default(),
    })
    .unwrap();
    log_entry(LogEntryInput {
        tx_id: "tx-sign".to_string(),
        agent_did: "did:paxio:base:0xa".to_string(),
        action: AuditAction::Sign,
        amount: Some(1),
        asset: Some("btc".to_string()),
        metadata: Default::default(),
    })
    .unwrap();

    let r = get_entries(LogQuery {
        agent_did: None,
        action: Some(AuditAction::Sign),
        start_time: None,
        end_time: None,
        limit: 100,
    });
    assert_eq!(r.total, 1);
    assert_eq!(r.entries[0].action, AuditAction::Sign);
}

#[test]
fn get_entries_respects_limit() {
    setup();
    for i in 0..50 {
        log_entry(LogEntryInput {
            tx_id: format!("tx-{i}"),
            agent_did: "did:paxio:base:0xalice".to_string(),
            action: AuditAction::Verify,
            amount: None,
            asset: None,
            metadata: Default::default(),
        })
        .unwrap();
    }
    let r = get_entries(LogQuery {
        agent_did: None,
        action: None,
        start_time: None,
        end_time: None,
        limit: 10,
    });
    assert_eq!(r.entries.len(), 10);
    assert_eq!(r.total, 50);
}
