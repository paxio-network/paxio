// Threshold ECDSA wrappers (FA-03 §2).
//
// Two compile-time variants behind the `mock-ecdsa` feature flag:
//
// - `mock-ecdsa` (default for unit tests + acceptance): deterministic fake
//   pubkey + signature derived from sha256. NO management canister calls,
//   NO cycles spent. Lets `cargo test -p wallet` run on a developer machine
//   without dfx.
//
// - real (feature off): calls `ic_cdk::api::management_canister::ecdsa::*` to
//   sign with the production `key_1` curve. Used in `dfx deploy` integration
//   and on mainnet.
//
// Determinism contract for tests:
//   derive_pubkey(did)              → same did → same 33-byte pubkey
//   sign_with_ecdsa_for(did, hash)  → (same did, same hash) → same 64-byte sig

use crate::errors::WalletError;
use sha2::{Digest, Sha256};

/// Length of a compressed secp256k1 pubkey in bytes (= 66 hex chars).
pub const PUBKEY_LEN: usize = 33;
/// Length of a raw secp256k1 ECDSA signature in bytes (= 128 hex chars).
pub const SIGNATURE_LEN: usize = 64;

// ─── Mock implementation (feature: mock-ecdsa) ────────────────────────────

#[cfg(feature = "mock-ecdsa")]
pub fn derive_pubkey(did: &str) -> Result<Vec<u8>, WalletError> {
    // 33-byte compressed pubkey: prefix 0x02 + 32 bytes from sha256(did).
    // Deterministic ⇒ different DID → different pubkey (sha256 collision-free).
    let hash = Sha256::digest(did.as_bytes());
    let mut out = Vec::with_capacity(PUBKEY_LEN);
    out.push(0x02);
    out.extend_from_slice(&hash);
    debug_assert_eq!(out.len(), PUBKEY_LEN);
    Ok(out)
}

#[cfg(feature = "mock-ecdsa")]
pub fn sign_with_ecdsa_for(did: &str, message_hash: &[u8]) -> Result<Vec<u8>, WalletError> {
    // 64-byte sig = sha256(did ‖ msg) ‖ sha256(msg ‖ did). Two halves keep
    // total length stable while ensuring determinism per (did, hash) pair.
    let mut hasher_a = Sha256::new();
    hasher_a.update(did.as_bytes());
    hasher_a.update(message_hash);
    let half_a = hasher_a.finalize();

    let mut hasher_b = Sha256::new();
    hasher_b.update(message_hash);
    hasher_b.update(did.as_bytes());
    let half_b = hasher_b.finalize();

    let mut sig = Vec::with_capacity(SIGNATURE_LEN);
    sig.extend_from_slice(&half_a);
    sig.extend_from_slice(&half_b);
    debug_assert_eq!(sig.len(), SIGNATURE_LEN);
    Ok(sig)
}

// ─── Real implementation (feature: not(mock-ecdsa)) ───────────────────────
//
// NOTE: this branch is only compiled when the canister is built without the
// default `mock-ecdsa` feature, e.g. `cargo build --no-default-features`. The
// surface is async because the management canister call is async.

#[cfg(not(feature = "mock-ecdsa"))]
pub async fn derive_pubkey(did: &str) -> Result<Vec<u8>, WalletError> {
    use ic_cdk::api::management_canister::ecdsa::{
        ecdsa_public_key, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument,
    };

    let arg = EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path: vec![did.as_bytes().to_vec()],
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: "key_1".to_string(),
        },
    };
    let (resp,) = ecdsa_public_key(arg)
        .await
        .map_err(|(code, msg)| WalletError::CanisterError(format!("{:?} {}", code, msg)))?;
    Ok(resp.public_key)
}

#[cfg(not(feature = "mock-ecdsa"))]
pub async fn sign_with_ecdsa_for(did: &str, message_hash: &[u8]) -> Result<Vec<u8>, WalletError> {
    use ic_cdk::api::management_canister::ecdsa::{
        sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, SignWithEcdsaArgument,
    };

    let arg = SignWithEcdsaArgument {
        message_hash: message_hash.to_vec(),
        derivation_path: vec![did.as_bytes().to_vec()],
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: "key_1".to_string(),
        },
    };
    let (resp,) = sign_with_ecdsa(arg)
        .await
        .map_err(|(code, msg)| WalletError::SigningFailed(format!("{:?} {}", code, msg)))?;
    Ok(resp.signature)
}

/// Encode raw bytes as lowercase hex.
pub fn to_hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push_str(&format!("{:02x}", b));
    }
    s
}

/// Hash a `TransactionIntent` to a 32-byte digest suitable for ECDSA signing.
///
/// We bind every field that could change the meaning of the signed payload:
/// `from`, `to`, asset discriminant, amount, nonce, created_at. Keeping this
/// separate from `sign_with_ecdsa_for` so callers can audit the digest.
pub fn hash_intent(
    from: &str,
    to: &str,
    asset_tag: u8,
    amount: u64,
    nonce: &str,
    created_at: &str,
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(from.as_bytes());
    hasher.update([0u8]);
    hasher.update(to.as_bytes());
    hasher.update([0u8]);
    hasher.update([asset_tag]);
    hasher.update(amount.to_be_bytes());
    hasher.update([0u8]);
    hasher.update(nonce.as_bytes());
    hasher.update([0u8]);
    hasher.update(created_at.as_bytes());

    let digest = hasher.finalize();
    let mut out = [0u8; 32];
    out.copy_from_slice(&digest);
    out
}
