//! Pure decision function for the Intent Verifier.
//!
//! No I/O, no canister state, no side effects. The caller (`lib.rs::verify`)
//! looks up the policy, the running daily-spend total and the nonce cache, then
//! invokes [`verify_intent`] to derive the decision. State mutation (cache the
//! response, increment daily spend) happens in `lib.rs` after this returns.
//!
//! Decision precedence — see `tests/intent_verifier_test.rs`:
//! 1. `guard_confidence > 0.8` → `Hold(GuardInjectionSuspected)`
//! 2. `amount > per_tx_limit` → `Block(PerTxLimitExceeded)`
//! 3. `to ∉ whitelist` → `Block(RecipientNotWhitelisted)`
//! 4. `daily_spent + amount > daily_budget` → `Block(BudgetExceeded)`
//! 5. otherwise → `Approve`
//!
//! Idempotency / nonce dedup is the caller's responsibility — see
//! `lib.rs::verify`. This function is referentially transparent: same inputs,
//! same outputs, no observable effects (engineering-principles §6).

use crate::types::{AgentPolicy, Decision, Reason, TransactionIntent, VerifyResponse};

/// Confidence above which an injection signal blocks (puts on hold) the tx.
/// Threshold pulled from the spec table (M03 milestone, FA-04 §3 row "Runtime
/// OUTPUT защита"). Strict `>` so 0.8 itself still passes.
pub const GUARD_INJECTION_THRESHOLD: f32 = 0.8;

#[must_use]
pub fn verify_intent(
    policy: &AgentPolicy,
    intent: &TransactionIntent,
    daily_spent: u128,
    guard_confidence: Option<f32>,
) -> VerifyResponse {
    // 1. Guard ML signal — held for human review, NOT blocked outright.
    if guard_confidence.unwrap_or(0.0) > GUARD_INJECTION_THRESHOLD {
        return VerifyResponse {
            decision: Decision::Hold,
            reason: Some(Reason::GuardInjectionSuspected),
        };
    }

    // 2. Per-transaction cap.
    if intent.amount > policy.per_tx_limit {
        return VerifyResponse {
            decision: Decision::Block,
            reason: Some(Reason::PerTxLimitExceeded),
        };
    }

    // 3. Whitelist enforcement.
    if !policy.whitelist.iter().any(|addr| addr == &intent.to) {
        return VerifyResponse {
            decision: Decision::Block,
            reason: Some(Reason::RecipientNotWhitelisted),
        };
    }

    // 4. Daily budget. `saturating_add` keeps us safe against u128 overflow on
    //    pathological policy values; semantically equivalent for sane inputs.
    let projected = daily_spent.saturating_add(intent.amount);
    if projected > policy.daily_budget {
        return VerifyResponse {
            decision: Decision::Block,
            reason: Some(Reason::BudgetExceeded),
        };
    }

    // 5. All checks passed.
    VerifyResponse {
        decision: Decision::Approve,
        reason: None,
    }
}
