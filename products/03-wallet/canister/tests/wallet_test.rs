// M02 Wallet canister — threshold ECDSA specification (RED).
//
// Dev: icp-dev
// Crate: products/03-wallet/canister/ (to be created, name: `wallet`)
//
// Target lib.rs MUST expose:
//   pub async fn derive_btc_address(did: String) -> Result<String, WalletError>;
//   pub async fn derive_evm_address(did: String) -> Result<String, WalletError>;
//   pub fn get_balance(did: String) -> Result<BalanceResponse, WalletError>;
//   pub async fn sign_transaction(intent: TransactionIntent) -> Result<SignResponse, WalletError>;
//   pub fn reset_for_test();
//
// For M02 MVP the `sign_with_ecdsa` management call is stubbed behind a feature flag
// `#[cfg(feature = "mock-ecdsa")]` that returns a deterministic fake signature. Integration
// against the real management canister happens on ICP testnet in the acceptance step
// (scripts/verify_wallet.sh).
//
// Types mirror packages/types/src/wallet.ts.

use wallet::{
    derive_btc_address, derive_evm_address, get_balance, reset_for_test, sign_transaction, Asset,
    TransactionIntent,
};

fn setup() {
    reset_for_test();
}

#[tokio::test]
async fn derive_btc_address_is_deterministic_per_did() {
    setup();
    let a = derive_btc_address("did:paxio:base:0xalice".into())
        .await
        .expect("derivation must succeed");
    let b = derive_btc_address("did:paxio:base:0xalice".into())
        .await
        .unwrap();
    assert_eq!(a, b, "same DID must derive same address");
    assert!(a.starts_with("bc1"), "must be bech32 mainnet: {a}");
}

#[tokio::test]
async fn derive_btc_address_differs_per_did() {
    setup();
    let a = derive_btc_address("did:paxio:base:0xalice".into())
        .await
        .unwrap();
    let b = derive_btc_address("did:paxio:base:0xbob".into())
        .await
        .unwrap();
    assert_ne!(a, b, "different DIDs must derive different addresses");
}

#[tokio::test]
async fn derive_evm_address_is_valid_format() {
    setup();
    let a = derive_evm_address("did:paxio:base:0xalice".into())
        .await
        .unwrap();
    assert!(a.starts_with("0x"));
    assert_eq!(a.len(), 42, "0x + 40 hex = 42 chars, got {}", a.len());
    assert!(a[2..].chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn fresh_wallet_has_zero_balance() {
    setup();
    let b = get_balance("did:paxio:base:0xalice".into()).expect("balance query");
    assert_eq!(b.btc, 0);
    assert_eq!(b.eth, 0);
    assert_eq!(b.usdc, 0);
}

#[tokio::test]
async fn sign_transaction_returns_signature_and_pubkey() {
    setup();
    let intent = TransactionIntent {
        from: "did:paxio:base:0xalice".into(),
        to: "bc1q".to_owned() + &"a".repeat(39),
        asset: Asset::Btc,
        amount: 50_000,
        nonce: "n-1".into(),
        created_at: "2026-04-18T10:00:00.000Z".into(),
    };
    let r = sign_transaction(intent).await.expect("sign must succeed");
    // 64-byte ECDSA signature = 128 hex chars.
    assert_eq!(r.signature.len(), 128, "signature hex length");
    // 33-byte compressed pubkey = 66 hex chars.
    assert_eq!(r.public_key.len(), 66, "pubkey hex length");
    assert!(r.signature.chars().all(|c| c.is_ascii_hexdigit()));
}

#[tokio::test]
async fn sign_rejects_zero_amount() {
    setup();
    let intent = TransactionIntent {
        from: "did:paxio:base:0xalice".into(),
        to: "bc1q".to_owned() + &"a".repeat(39),
        asset: Asset::Btc,
        amount: 0,
        nonce: "n-zero".into(),
        created_at: "2026-04-18T10:00:00.000Z".into(),
    };
    let r = sign_transaction(intent).await;
    assert!(r.is_err(), "zero amount must be rejected");
}

#[tokio::test]
async fn sign_rejects_invalid_btc_address() {
    setup();
    let intent = TransactionIntent {
        from: "did:paxio:base:0xalice".into(),
        to: "not-a-btc-address".into(),
        asset: Asset::Btc,
        amount: 100,
        nonce: "n-bad".into(),
        created_at: "2026-04-18T10:00:00.000Z".into(),
    };
    let r = sign_transaction(intent).await;
    assert!(r.is_err(), "invalid BTC address must be rejected");
}

#[tokio::test]
async fn sign_is_idempotent_on_same_nonce() {
    setup();
    let intent = TransactionIntent {
        from: "did:paxio:base:0xalice".into(),
        to: "bc1q".to_owned() + &"a".repeat(39),
        asset: Asset::Btc,
        amount: 50_000,
        nonce: "stable-nonce".into(),
        created_at: "2026-04-18T10:00:00.000Z".into(),
    };
    let r1 = sign_transaction(intent.clone()).await.unwrap();
    let r2 = sign_transaction(intent).await.unwrap();
    assert_eq!(r1.signature, r2.signature, "same intent → same signature");
}
