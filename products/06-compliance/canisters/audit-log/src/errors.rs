//! Error types for the audit-log canister.
//!
//! All public canister methods return `Result<T, AuditLogError>` — never panic.

use candid::{CandidType, Deserialize};
use serde::Serialize;
use thiserror::Error;

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, Error)]
pub enum AuditLogError {
    #[error("tx_id must not be empty")]
    EmptyTxId,

    #[error("agent_did must not be empty")]
    EmptyAgentDid,

    #[error("storage error: {0}")]
    StorageError(String),

    #[error("chain integrity violated at index {index}")]
    ChainIntegrityViolated { index: u64 },

    #[error("serialization failed: {0}")]
    SerializationError(String),
}
