// Wallet canister types — Candid-mirrored to packages/types/src/wallet.ts.
//
// Field naming conventions:
// - snake_case for Rust struct fields and TS sees them via the `.did`.
// - `amount`/`btc`/`eth`/`usdc` are nat64 in Candid → u64 in Rust (MVP precision).

use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::collections::BTreeMap;

use crate::errors::WalletError;

/// Supported settlement assets for M02 MVP.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, CandidType, Deserialize, Serialize)]
pub enum Asset {
    Btc,
    Eth,
    Usdc,
}

/// Direction of a recorded transaction relative to the wallet owner.
#[derive(Debug, Clone, Copy, PartialEq, Eq, CandidType, Deserialize, Serialize)]
pub enum TxDirection {
    In,
    Out,
}

/// Status lifecycle of a transaction record.
#[derive(Debug, Clone, Copy, PartialEq, Eq, CandidType, Deserialize, Serialize)]
pub enum TxStatus {
    Pending,
    Confirmed,
    Failed,
}

/// Caller-supplied intent to sign a transfer.
///
/// `nonce` doubles as the idempotency key — re-submitting the same intent
/// returns the cached `SignResponse` instead of re-running threshold ECDSA
/// (engineering-principles §15).
#[derive(Debug, Clone, PartialEq, Eq, CandidType, Deserialize, Serialize)]
pub struct TransactionIntent {
    pub from: String,
    pub to: String,
    pub asset: Asset,
    pub amount: u64,
    pub nonce: String,
    pub created_at: String,
}

/// Wallet balance snapshot — MVP returns canister-stored balances only,
/// chain scanning lives in M58 Bitcoin Agent.
#[derive(Debug, Clone, PartialEq, Eq, Default, CandidType, Deserialize, Serialize)]
pub struct BalanceResponse {
    pub btc: u64,
    pub eth: u64,
    pub usdc: u64,
}

/// Result of `sign_transaction` — hex-encoded ECDSA signature + compressed pubkey.
#[derive(Debug, Clone, PartialEq, Eq, CandidType, Deserialize, Serialize)]
pub struct SignResponse {
    pub signature: String,
    pub public_key: String,
}

/// Append-only transaction log entry per wallet.
#[derive(Debug, Clone, PartialEq, Eq, CandidType, Deserialize, Serialize)]
pub struct TxRecord {
    pub tx_id: String,
    pub asset: Asset,
    pub amount: u64,
    pub counterparty: String,
    pub direction: TxDirection,
    pub status: TxStatus,
    pub timestamp: String,
}

/// Per-DID wallet state stored in stable memory.
///
/// Composition over inheritance (engineering-principles §3): one struct
/// aggregates balances, history and the nonce idempotency cache.
#[derive(Debug, Clone, Default, PartialEq, CandidType, Deserialize, Serialize)]
pub struct WalletState {
    pub balances: BalanceResponse,
    pub tx_history: Vec<TxRecord>,
    /// nonce → cached signature for idempotent `sign_transaction`.
    pub nonce_cache: BTreeMap<String, SignResponse>,
}

/// Convenience type alias for the universal canister `Result`.
pub type WalletResult<T> = Result<T, WalletError>;
