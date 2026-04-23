// Paxio Wallet Canister — public entry points (FA-03 §1, M02 MVP).
//
// All public methods return `Result<T, WalletError>` — never `panic!`.
// Compiled with `--features mock-ecdsa` for unit tests; without it, the
// canister calls the real ICP `sign_with_ecdsa` management endpoint.
//
// IMPORTANT (engineering-principles §6 — purity):
// Validation lives at this presentation boundary. `addresses::is_valid_*`
// is pure; the storage and ecdsa modules treat inputs as already-validated.

#![deny(clippy::unwrap_used)]

pub mod addresses;
pub mod ecdsa;
pub mod errors;
pub mod storage;
pub mod types;

pub use errors::WalletError;
pub use types::{
    Asset, BalanceResponse, SignResponse, TransactionIntent, TxDirection, TxRecord, TxStatus,
    WalletState,
};

use addresses::{
    derive_btc_address_from_pubkey, derive_evm_address_from_pubkey, is_valid_btc_address,
    is_valid_did, is_valid_evm_address,
};

// ─── Public canister API ──────────────────────────────────────────────────

/// Derive the wallet's Bitcoin mainnet (bech32) address for a DID.
///
/// Deterministic: same DID → same address. Different DIDs → different
/// addresses (sha256 collision-free domain).
#[cfg_attr(target_arch = "wasm32", ic_cdk_macros::update)]
pub async fn derive_btc_address(did: String) -> Result<String, WalletError> {
    if !is_valid_did(&did) {
        return Err(WalletError::InvalidDid(did));
    }
    let pubkey = derive_pubkey(&did).await?;
    Ok(derive_btc_address_from_pubkey(&pubkey))
}

/// Derive the wallet's EVM address for a DID. Same threshold ECDSA key as
/// BTC, different derivation path / hashing.
#[cfg_attr(target_arch = "wasm32", ic_cdk_macros::update)]
pub async fn derive_evm_address(did: String) -> Result<String, WalletError> {
    if !is_valid_did(&did) {
        return Err(WalletError::InvalidDid(did));
    }
    let pubkey = derive_pubkey(&did).await?;
    Ok(derive_evm_address_from_pubkey(&pubkey))
}

/// Return the wallet's current balances (MVP: stored only, no chain scan).
#[cfg_attr(target_arch = "wasm32", ic_cdk_macros::query)]
pub fn get_balance(did: String) -> Result<BalanceResponse, WalletError> {
    if !is_valid_did(&did) {
        return Err(WalletError::InvalidDid(did));
    }
    Ok(storage::with_wallet(&did, |state| state.balances.clone()))
}

/// Sign a `TransactionIntent` via threshold ECDSA.
///
/// Idempotent on `nonce` (engineering-principles §15): re-submitting the same
/// intent within the same wallet returns the cached signature.
#[cfg_attr(target_arch = "wasm32", ic_cdk_macros::update)]
pub async fn sign_transaction(intent: TransactionIntent) -> Result<SignResponse, WalletError> {
    // 1. Validate inputs at the boundary — domain stays pure.
    if !is_valid_did(&intent.from) {
        return Err(WalletError::InvalidDid(intent.from));
    }
    if intent.amount == 0 {
        return Err(WalletError::ZeroAmount);
    }
    match intent.asset {
        Asset::Btc => {
            if !is_valid_btc_address(&intent.to) {
                return Err(WalletError::InvalidBtcAddress(intent.to));
            }
        }
        Asset::Eth | Asset::Usdc => {
            if !is_valid_evm_address(&intent.to) {
                return Err(WalletError::InvalidEvmAddress(intent.to));
            }
        }
    }

    // 2. Idempotency cache hit → return existing signature.
    if let Some(cached) = storage::cached_signature(&intent.from, &intent.nonce) {
        return Ok(cached);
    }

    // 3. Derive pubkey + hash intent + sign.
    let pubkey = derive_pubkey(&intent.from).await?;
    let asset_tag: u8 = match intent.asset {
        Asset::Btc => 1,
        Asset::Eth => 2,
        Asset::Usdc => 3,
    };
    let digest = ecdsa::hash_intent(
        &intent.from,
        &intent.to,
        asset_tag,
        intent.amount,
        &intent.nonce,
        &intent.created_at,
    );
    let signature_bytes = sign_with_ecdsa_for(&intent.from, &digest).await?;

    let response = SignResponse {
        signature: ecdsa::to_hex(&signature_bytes),
        public_key: ecdsa::to_hex(&pubkey),
    };

    // 4. Cache for future identical retries.
    storage::cache_signature(&intent.from, intent.nonce, response.clone());

    Ok(response)
}

/// Paginated transaction history for a DID/asset pair.
///
/// MVP: returns at most `limit` of the most recent records; `0` returns
/// everything. Full pagination (cursor-based) lands in M58.
#[cfg_attr(target_arch = "wasm32", ic_cdk_macros::query)]
pub fn get_tx_history(did: String, asset: Asset, limit: u32) -> Result<Vec<TxRecord>, WalletError> {
    if !is_valid_did(&did) {
        return Err(WalletError::InvalidDid(did));
    }
    let cap: usize = if limit == 0 {
        usize::MAX
    } else {
        limit as usize
    };
    let records = storage::with_wallet(&did, |state| {
        state
            .tx_history
            .iter()
            .rev()
            .filter(|r| r.asset == asset)
            .take(cap)
            .cloned()
            .collect::<Vec<_>>()
    });
    Ok(records)
}

/// Test-only state reset. Public so integration tests in `tests/` can call it,
/// but never wired into the Candid surface.
pub fn reset_for_test() {
    storage::reset();
}

// ─── ECDSA dispatch (mock vs real) ────────────────────────────────────────
//
// The `mock-ecdsa` feature swaps the ecdsa primitives between deterministic
// sha256-based fakes (sync) and real management-canister calls (async).
// We keep the public lib surface async in both modes so tests' signatures
// don't change.

#[cfg(feature = "mock-ecdsa")]
async fn derive_pubkey(did: &str) -> Result<Vec<u8>, WalletError> {
    ecdsa::derive_pubkey(did)
}

#[cfg(not(feature = "mock-ecdsa"))]
async fn derive_pubkey(did: &str) -> Result<Vec<u8>, WalletError> {
    ecdsa::derive_pubkey(did).await
}

#[cfg(feature = "mock-ecdsa")]
async fn sign_with_ecdsa_for(did: &str, digest: &[u8]) -> Result<Vec<u8>, WalletError> {
    ecdsa::sign_with_ecdsa_for(did, digest)
}

#[cfg(not(feature = "mock-ecdsa"))]
async fn sign_with_ecdsa_for(did: &str, digest: &[u8]) -> Result<Vec<u8>, WalletError> {
    ecdsa::sign_with_ecdsa_for(did, digest).await
}

// ─── Candid export (only meaningful for wasm builds) ──────────────────────

#[cfg(target_arch = "wasm32")]
#[ic_cdk_macros::query]
fn __get_candid_interface_tmp_hack() -> String {
    include_str!("../wallet.did").to_string()
}
