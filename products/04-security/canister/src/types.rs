//! Security Sidecar shared types.
//!
//! Mirrors `packages/types/src/security.ts` (+ `wallet.ts::ZodTransactionIntent`).
//! Field / variant names MUST match the integration tests in
//! `tests/intent_verifier_test.rs` exactly.
//!
//! Wire format note: `u128` amounts serialize across Candid as `nat`. TS side
//! uses `bigint` (see `wallet.ts`). String variants of `Asset` / `Decision` /
//! `Reason` map to lowercase / SCREAMING_SNAKE in TS — translation is the
//! responsibility of the TS-side Candid binding (out of scope for M03).

use candid::{CandidType, Deserialize};
use serde::Serialize;

// --- Asset ---------------------------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, Hash)]
pub enum Asset {
    Btc,
    Eth,
    Usdc,
}

// --- Decision ------------------------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
pub enum Decision {
    Approve,
    Hold,
    Block,
}

// --- Reason --------------------------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
pub enum Reason {
    BudgetExceeded,
    RecipientNotWhitelisted,
    PerTxLimitExceeded,
    OutsideAllowedHours,
    SanctionsListMatch,
    BehavioralAnomaly,
    GuardInjectionSuspected,
    ManualReviewRequired,
}

// --- Agent policy --------------------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
pub struct AgentPolicy {
    pub did: String,
    pub daily_budget: u128,
    pub per_tx_limit: u128,
    pub whitelist: Vec<String>,
    /// `(start_hour_utc, end_hour_utc)` — both inclusive, range `0..=23`.
    pub allowed_hours: (u8, u8),
}

// --- Transaction intent --------------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
pub struct TransactionIntent {
    pub from: String,
    pub to: String,
    pub asset: Asset,
    pub amount: u128,
    pub nonce: String,
    pub created_at: String,
}

// --- Verify request / response ------------------------------------------

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub struct VerifyRequest {
    pub intent: TransactionIntent,
    pub guard_confidence: Option<f32>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub struct VerifyResponse {
    pub decision: Decision,
    pub reason: Option<Reason>,
}
