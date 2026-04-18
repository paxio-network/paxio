//! Security Sidecar error type.
//!
//! All public canister methods return `Result<T, SecurityError>` for validation /
//! lookup failures. Successful `verify` returns `VerifyResponse` directly — the
//! Intent Verifier itself never errors, it only emits APPROVE / HOLD / BLOCK.

use candid::{CandidType, Deserialize};
use serde::Serialize;
use thiserror::Error;

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, Error, PartialEq, Eq)]
pub enum SecurityError {
    #[error("policy not found for did: {0}")]
    PolicyNotFound(String),

    #[error("invalid policy: {0}")]
    InvalidPolicy(String),

    #[error("invalid intent: {0}")]
    InvalidIntent(String),

    #[error("storage failure: {0}")]
    Storage(String),
}
