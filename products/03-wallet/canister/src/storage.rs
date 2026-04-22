// Per-DID wallet state storage.
//
// MVP implementation uses a `thread_local! RefCell<HashMap<...>>` for two reasons:
// 1. `cargo test` runs outside the IC runtime — the stable-memory manager would
//    need explicit init plumbing that doesn't add value to M02.
// 2. The canister is a single-tenant CDK module; HashMap inside a thread_local
//    behaves identically under the single-threaded WASM execution model.
//
// Production path (M03+): swap in `StableBTreeMap<String, WalletState>` with
// `pre_upgrade`/`post_upgrade` hooks via `ic-stable-structures`. The
// API surface in this module already hides the storage choice.

use std::cell::RefCell;
use std::collections::HashMap;

use crate::types::{SignResponse, TxRecord, WalletState};

thread_local! {
    static WALLETS: RefCell<HashMap<String, WalletState>> = RefCell::new(HashMap::new());
}

/// Apply `f` to a mutable reference to the wallet state for `did`,
/// inserting a default state if missing.
pub fn with_wallet_mut<R, F>(did: &str, f: F) -> R
where
    F: FnOnce(&mut WalletState) -> R,
{
    WALLETS.with(|w| {
        let mut map = w.borrow_mut();
        let entry = map.entry(did.to_string()).or_default();
        f(entry)
    })
}

/// Read-only access. Returns the default `WalletState` (zero balances, empty
/// history) if the wallet does not yet exist — consistent with the
/// `fresh_wallet_has_zero_balance` test contract.
pub fn with_wallet<R, F>(did: &str, f: F) -> R
where
    F: FnOnce(&WalletState) -> R,
{
    WALLETS.with(|w| {
        let map = w.borrow();
        match map.get(did) {
            Some(state) => f(state),
            None => f(&WalletState::default()),
        }
    })
}

/// Look up an idempotent signature for `(did, nonce)`. Returns `Some` only on
/// exact match — different nonces always re-sign.
pub fn cached_signature(did: &str, nonce: &str) -> Option<SignResponse> {
    WALLETS.with(|w| {
        w.borrow()
            .get(did)
            .and_then(|state| state.nonce_cache.get(nonce).cloned())
    })
}

/// Persist a freshly produced signature in the nonce cache.
pub fn cache_signature(did: &str, nonce: String, sig: SignResponse) {
    with_wallet_mut(did, |state| {
        state.nonce_cache.insert(nonce, sig);
    });
}

/// Append a transaction record to the wallet's history.
pub fn append_tx(did: &str, record: TxRecord) {
    with_wallet_mut(did, |state| {
        state.tx_history.push(record);
    });
}

/// Clear all wallet state. Test-only — wired through `lib::reset_for_test`.
pub fn reset() {
    WALLETS.with(|w| w.borrow_mut().clear());
}
