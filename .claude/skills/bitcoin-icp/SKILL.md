---
name: bitcoin-icp
description: Bitcoin integration via ICP threshold ECDSA. Use when implementing non-custodial Bitcoin transactions, address generation, or BTC payment verification from ICP canisters.
---

# Bitcoin on ICP — Threshold ECDSA

## Why ICP for Bitcoin
ICP is the ONLY platform that can natively sign Bitcoin transactions without custodians.
Threshold ECDSA: the private key is split across 13+ subnet nodes.
No single node ever holds the full key. No HSM, no custodian, no bridge.

## Bitcoin address generation

```rust
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa,
    EcdsaPublicKeyArgument, SignWithEcdsaArgument,
    EcdsaKeyId, EcdsaCurve,
};

async fn get_bitcoin_address(agent_principal: Principal) -> Result<String, String> {
    let key_name = "dfx_test_key".to_string();  // "key_1" on mainnet
    let derivation_path = vec![agent_principal.as_slice().to_vec()];

    let (result,) = ecdsa_public_key(EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path,
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: key_name,
        },
    })
    .await
    .map_err(|(code, msg)| format!("ECDSA key failed: {:?} {}", code, msg))?;

    Ok(bitcoin_address_from_public_key(&result.public_key))
}
```

## Signing Bitcoin transactions

```rust
async fn sign_bitcoin_transaction(
    tx_hash: Vec<u8>,
    derivation_path: Vec<Vec<u8>>,
) -> Result<Vec<u8>, String> {
    let key_name = "dfx_test_key".to_string();

    let (result,) = sign_with_ecdsa(SignWithEcdsaArgument {
        message_hash: tx_hash,
        derivation_path,
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: key_name,
        },
    })
    .await
    .map_err(|(code, msg)| format!("ECDSA sign failed: {:?} {}", code, msg))?;

    Ok(result.signature)
}
```

## Cost model
- Threshold ECDSA signature: ~$0.026 per signature (26B cycles)
- Minimum fee to charge user: $0.03 (covers cost + margin)
- Bitcoin transaction fee (L1): varies, typically $0.50-5.00
- For micropayments: batch multiple agent payments into one BTC tx

## Security rules (CRITICAL)
- NEVER store private keys in canister state
- NEVER log or expose the derivation path in errors
- NEVER allow arbitrary derivation paths from user input
- Use agent's principal as derivation seed — deterministic and secure
- Key name: "dfx_test_key" for local dev, "key_1" for mainnet

## BTC↔ckBTC bridge (FA-05)
- ckBTC = "canister-issued BTC" on ICP, 1:1 backed by real BTC
- Mint: user deposits BTC → ICP mints ckBTC
- Redeem: user burns ckBTC → ICP releases BTC
- No third-party bridge, no wrapped tokens

## Gotchas
- Threshold ECDSA requires `#[ic_cdk::update]` (async, costs cycles)
- Signing takes ~2-5 seconds (consensus across 13+ nodes)
- Bitcoin address format: P2WPKH (SegWit) for lower fees
- Test with regtest/testnet before mainnet
- dfx local replica supports ECDSA with `dfx_test_key`
