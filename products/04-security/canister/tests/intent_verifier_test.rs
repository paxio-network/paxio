// M03 Security Sidecar — Intent Verifier specification (RED).
//
// Dev: icp-dev
// Crate: products/04-security/canister/ (to be created, name: `security_sidecar`)
//
// Target lib.rs MUST expose:
//   pub fn set_policy(policy: AgentPolicy) -> Result<(), SecurityError>;
//   pub fn get_policy(did: &str) -> Result<AgentPolicy, SecurityError>;
//   pub fn verify(req: VerifyRequest) -> VerifyResponse;
//   pub fn reset_for_test();
//
// Types mirror packages/types/src/security.ts. Candid .did next to lib.rs.
// M03 scope = Intent Verifier only. NO ML. Secrets Scanner is TS-side in M24.

use security_sidecar::{
    reset_for_test, set_policy, verify, AgentPolicy, Asset, Decision, Reason, TransactionIntent,
    VerifyRequest,
};

fn setup() {
    reset_for_test();
}

fn policy(did: &str, daily: u128, per_tx: u128, whitelist: Vec<&str>) -> AgentPolicy {
    AgentPolicy {
        did: did.to_string(),
        daily_budget: daily,
        per_tx_limit: per_tx,
        whitelist: whitelist.into_iter().map(String::from).collect(),
        allowed_hours: (0, 23), // 24h allowed unless test overrides
    }
}

fn intent(from: &str, to: &str, amount: u128) -> TransactionIntent {
    TransactionIntent {
        from: from.to_string(),
        to: to.to_string(),
        asset: Asset::Btc,
        amount,
        nonce: "n-1".to_string(),
        created_at: "2026-04-18T10:00:00.000Z".to_string(),
    }
}

#[test]
fn approves_transaction_within_all_limits() {
    setup();
    set_policy(policy(
        "did:paxio:base:0xalice",
        1_000_000,
        100_000,
        vec!["bc1qrecipient"],
    ))
    .unwrap();

    let r = verify(VerifyRequest {
        intent: intent("did:paxio:base:0xalice", "bc1qrecipient", 50_000),
        guard_confidence: None,
    });
    assert_eq!(r.decision, Decision::Approve);
    assert!(r.reason.is_none());
}

#[test]
fn blocks_when_recipient_not_whitelisted() {
    setup();
    set_policy(policy(
        "did:paxio:base:0xalice",
        1_000_000,
        100_000,
        vec!["bc1qallowed"],
    ))
    .unwrap();

    let r = verify(VerifyRequest {
        intent: intent("did:paxio:base:0xalice", "bc1qrandom", 50_000),
        guard_confidence: None,
    });
    assert_eq!(r.decision, Decision::Block);
    assert_eq!(r.reason, Some(Reason::RecipientNotWhitelisted));
}

#[test]
fn blocks_when_per_tx_limit_exceeded() {
    setup();
    set_policy(policy(
        "did:paxio:base:0xalice",
        10_000_000,
        100_000,
        vec!["bc1qrecipient"],
    ))
    .unwrap();

    let r = verify(VerifyRequest {
        intent: intent("did:paxio:base:0xalice", "bc1qrecipient", 200_000),
        guard_confidence: None,
    });
    assert_eq!(r.decision, Decision::Block);
    assert_eq!(r.reason, Some(Reason::PerTxLimitExceeded));
}

#[test]
fn blocks_when_daily_budget_exceeded() {
    setup();
    set_policy(policy(
        "did:paxio:base:0xalice",
        150_000,
        100_000,
        vec!["bc1qrecipient"],
    ))
    .unwrap();

    // First tx uses 100_000 from 150_000 budget → APPROVE.
    let r1 = verify(VerifyRequest {
        intent: intent("did:paxio:base:0xalice", "bc1qrecipient", 100_000),
        guard_confidence: None,
    });
    assert_eq!(r1.decision, Decision::Approve);

    // Second tx of 100_000 would push total to 200_000 > 150_000 → BLOCK.
    let r2 = verify(VerifyRequest {
        intent: intent("did:paxio:base:0xalice", "bc1qrecipient", 100_000),
        guard_confidence: None,
    });
    assert_eq!(r2.decision, Decision::Block);
    assert_eq!(r2.reason, Some(Reason::BudgetExceeded));
}

#[test]
fn holds_on_high_guard_confidence() {
    setup();
    set_policy(policy(
        "did:paxio:base:0xalice",
        1_000_000,
        100_000,
        vec!["bc1qrecipient"],
    ))
    .unwrap();

    let r = verify(VerifyRequest {
        intent: intent("did:paxio:base:0xalice", "bc1qrecipient", 50_000),
        guard_confidence: Some(0.95), // above injection threshold
    });
    assert_eq!(r.decision, Decision::Hold);
    assert_eq!(r.reason, Some(Reason::GuardInjectionSuspected));
}

#[test]
fn approves_when_guard_confidence_below_threshold() {
    setup();
    set_policy(policy(
        "did:paxio:base:0xalice",
        1_000_000,
        100_000,
        vec!["bc1qrecipient"],
    ))
    .unwrap();

    let r = verify(VerifyRequest {
        intent: intent("did:paxio:base:0xalice", "bc1qrecipient", 50_000),
        guard_confidence: Some(0.3),
    });
    assert_eq!(r.decision, Decision::Approve);
}

#[test]
fn verify_is_idempotent_for_same_intent() {
    setup();
    set_policy(policy(
        "did:paxio:base:0xalice",
        1_000_000,
        100_000,
        vec!["bc1qrecipient"],
    ))
    .unwrap();

    let req = VerifyRequest {
        intent: intent("did:paxio:base:0xalice", "bc1qrecipient", 50_000),
        guard_confidence: None,
    };
    let r1 = verify(req.clone());
    let r2 = verify(req);
    assert_eq!(r1.decision, r2.decision);
    // Same nonce → budget counted once, not twice.
}
