// WalletError — public canister errors. Mirrored in wallet.did.
//
// All public canister methods (#[update]/#[query]) return Result<T, WalletError>.
// `panic!` is forbidden — see `scripts/verify_m02_wallet.sh`.

use candid::{CandidType, Deserialize};
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Clone, CandidType, Deserialize, Serialize, PartialEq, Eq)]
pub enum WalletError {
    #[error("amount must be > 0")]
    ZeroAmount,

    #[error("invalid BTC address: {0}")]
    InvalidBtcAddress(String),

    #[error("invalid EVM address: {0}")]
    InvalidEvmAddress(String),

    #[error("invalid DID: {0}")]
    InvalidDid(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("canister error: {0}")]
    CanisterError(String),

    #[error("signing failed: {0}")]
    SigningFailed(String),
}
