//! Security Sidecar — Intent Verifier (M03).
//!
//! Public surface (mirrored in `security_sidecar.did`):
//!   * `set_policy(AgentPolicy) -> Result<(), SecurityError>`  — `#[update]`
//!   * `get_policy(text) -> Result<AgentPolicy, SecurityError>` — `#[query]`
//!   * `verify(VerifyRequest) -> VerifyResponse`               — `#[update]`
//!
//! In-process tests reach for the same functions plus `reset_for_test()` to
//! get a clean stable map between tests (see `tests/intent_verifier_test.rs`).
//!
//! Decision logic lives in [`verifier::verify_intent`] (pure). Persistence
//! and idempotency caching live in [`storage`]. This module is the thin glue
//! that orchestrates the two and adds canister attributes.

pub mod errors;
pub mod storage;
pub mod types;
pub mod verifier;

pub use errors::SecurityError;
pub use types::{
    AgentPolicy, Asset, Decision, Reason, TransactionIntent, VerifyRequest, VerifyResponse,
};

use ic_cdk_macros::{query, update};

// --- Public canister API ------------------------------------------------

/// Replace (or insert) the policy for `policy.did`.
#[update]
pub fn set_policy(policy: AgentPolicy) -> Result<(), SecurityError> {
    storage::put_policy(policy)
}

/// Look up the active policy for `did`. Returns `PolicyNotFound` if none.
#[query]
pub fn get_policy(did: String) -> Result<AgentPolicy, SecurityError> {
    storage::get_policy(&did)
}

/// Run the Intent Verifier over `req`. Pure decision logic on top of the
/// stable-memory policy + spend tracker.
///
/// Idempotency model (engineering-principles §15):
///   * Each unique `nonce` may consume budget AT MOST once. Re-verifying
///     with the same nonce will not double-count, even if the second call
///     would otherwise APPROVE again.
///   * The decision itself is recomputed each call against the current
///     daily-spend snapshot — so an approved intent followed by a retry of
///     the same intent with the same nonce returns APPROVE (cache hit on
///     budget side), but a *different* intent that would push past the
///     daily budget will correctly BLOCK.
///
/// Returns `VerifyResponse` directly (NOT `Result`). A missing policy is
/// treated as a hard `Block(ManualReviewRequired)` rather than an error,
/// because the upstream wallet MUST have a deterministic answer to make
/// signing safe — see FA-04 §3.
#[update]
pub fn verify(req: VerifyRequest) -> VerifyResponse {
    // 1. Lookup policy for the sender. Missing policy = hard fail-safe.
    let policy = match storage::get_policy(&req.intent.from) {
        Ok(p) => p,
        Err(_) => {
            return VerifyResponse {
                decision: Decision::Block,
                reason: Some(Reason::ManualReviewRequired),
            };
        }
    };

    // 2. Pure decision against the current daily-spend snapshot.
    let daily_spent = storage::get_daily_spent(&req.intent.from);
    let response = verifier::verify_intent(&policy, &req.intent, daily_spent, req.guard_confidence);

    // 3. Burn budget on APPROVE — but at most once per nonce. This makes
    //    `verify` idempotent w.r.t. a given (intent, nonce) pair.
    if response.decision == Decision::Approve && !storage::is_nonce_approved(&req.intent.nonce) {
        storage::add_daily_spent(&req.intent.from, req.intent.amount);
        storage::mark_nonce_approved(&req.intent.nonce);
    }

    response
}

// --- Test helper --------------------------------------------------------

/// Reset all stable state. Used by integration tests in `tests/` to start
/// each test from a clean slate. Not exposed in the Candid interface.
///
/// Safe at runtime but never called by canister methods, so a hostile caller
/// has no path to invoke it.
#[doc(hidden)]
pub fn reset_for_test() {
    storage::reset();
}

// --- Candid export ------------------------------------------------------

ic_cdk::export_candid!();
