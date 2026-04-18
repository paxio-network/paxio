# M02 — Wallet Canister MVP (threshold ECDSA)

**Owner:** icp-dev
**Branch:** `feature/m02-wallet-canister`
**Depends on:** M00 ✅, M01a ✅
**Parallel with:** M01 (registry-dev), M03 (icp-dev), M04 (icp-dev)
**Estimate:** 4–5 days

## Готово когда:
- [ ] `cargo build -p wallet --release` — clean
- [ ] `cargo test -p wallet --features mock-ecdsa` — all GREEN
- [ ] `cargo clippy -p wallet -- -D warnings` — clean
- [ ] `bash scripts/verify_m02_wallet.sh` — PASS
- [ ] `wallet.did` matches TS schemas in `packages/types/src/wallet.ts`

## Scope (FA-03 §1 canister API)

| Method | Mode | Purpose |
|---|---|---|
| `derive_btc_address(did)` | `#[update]` | Deterministic BTC bech32 from DID (threshold ECDSA pubkey) |
| `derive_evm_address(did)` | `#[update]` | Deterministic EVM 0x-address (same tECDSA key, different derivation) |
| `get_balance(did)` | `#[query]` | Returns `{btc, eth, usdc}` (MVP: stored balance, no chain scan) |
| `sign_transaction(intent)` | `#[update]` | Sign via `sign_with_ecdsa` management call |
| `get_tx_history(did, asset, limit)` | `#[query]` | Paginated TxRecord list |

**Not in M02:**
- Real `sign_with_ecdsa` on ICP mainnet — acceptance via `mock-ecdsa` feature flag for unit tests; real integration in E2E (`docs/e2e/wallet-bitcoin.md`) via dfx.
- UTXO monitoring, broadcast to BTC L1 — M58 Bitcoin Agent Core.
- Security Sidecar integration (verify_intent before signing) — M03 wires it.

## Threshold ECDSA flow (§2)

```
caller (SDK/Proxy/MCP)
     │  sign_transaction(intent)
     ▼
┌────────────────────────────────────────────┐
│  Wallet Canister                           │
│  1. validate intent (nonce, addr, amount)  │
│  2. derive pubkey via ecdsa_public_key     │
│  3. hash intent → message_hash (32 bytes)  │
│  4. sign_with_ecdsa(message_hash) ←───────┐│
│  5. assemble signed tx blob               ││
│  6. append TxRecord                        ││
└────────────────────────────────────────────┘│
                                              │ 13+ ICP nodes
                                              │ threshold t-of-n
                                              │
```

## Crate structure

```
products/03-wallet/canister/
├── Cargo.toml              # name = "wallet", crate-type = ["cdylib"]
├── wallet.did              # Candid — mirrors packages/types/src/wallet.ts
├── src/
│   ├── lib.rs              # #[ic_cdk::init], #[update], #[query] entry points
│   ├── types.rs            # CandidType structs: TransactionIntent, BalanceResponse, TxRecord
│   ├── ecdsa.rs            # derive_btc_address, sign_with_ecdsa wrapper (feature-gated mock)
│   ├── addresses.rs        # bech32 encoding, EVM keccak hashing
│   ├── storage.rs          # StableBTreeMap<Did, WalletState>
│   └── errors.rs           # thiserror-based WalletError enum
└── tests/
    └── wallet_test.rs      # RED specs (already written)
```

## Root workspace setup (already done by architect)

`Cargo.toml` at repo root is pre-created with all Phase 0 canister members registered and workspace-wide dependency versions locked. Dev-agents **DO NOT** edit root `Cargo.toml` — they only create their crate `Cargo.toml` under the pre-registered path, using `.workspace = true` to pull deps:

```toml
# products/03-wallet/canister/Cargo.toml
[package]
name = "wallet"
version.workspace = true
edition.workspace = true

[lib]
crate-type = ["cdylib", "rlib"]

[features]
default = ["mock-ecdsa"]
mock-ecdsa = []

[dependencies]
ic-cdk.workspace = true
ic-cdk-macros.workspace = true
ic-stable-structures.workspace = true
candid.workspace = true
serde.workspace = true
thiserror.workspace = true
sha2.workspace = true

[dev-dependencies]
tokio.workspace = true
```

## Files to implement

### `products/03-wallet/canister/src/lib.rs`
Canister entry: `derive_btc_address`, `derive_evm_address`, `get_balance`, `sign_transaction`, `get_tx_history`. Also `#[cfg(test)] pub fn reset_for_test()`.

### `src/ecdsa.rs` — threshold ECDSA wrapper
```rust
#[cfg(not(feature = "mock-ecdsa"))]
async fn sign_with_ecdsa_real(hash: [u8;32]) -> Result<Vec<u8>, WalletError> {
    ic_cdk::api::management_canister::ecdsa::sign_with_ecdsa(/* ... */).await
}

#[cfg(feature = "mock-ecdsa")]
fn sign_with_ecdsa_mock(hash: [u8;32]) -> Vec<u8> {
    // Deterministic 64-byte output from hash — for unit tests only.
    let mut out = [0u8; 64]; /* sha512 / blake2 of hash */ out.to_vec()
}
```

### `src/storage.rs`
`StableBTreeMap<Did, WalletState>` where `WalletState { balances, tx_history, nonce_cache }`.

## Tests (RED, written by architect)

- `products/03-wallet/canister/tests/wallet_test.rs` — 8 tests: derivation determinism, address format, zero balance, signature format, zero-amount rejection, invalid address, idempotent sign-on-same-nonce.

## Acceptance script

`bash scripts/verify_m02_wallet.sh` — 5 steps: crate exists, build clean, tests GREEN, Candid matches, no `panic!` in public methods.

## Таблица задач

| # | Задача | Агент | Метод верификации | Файлы |
|---|---|---|---|---|
| 1 | Cargo workspace root + wallet crate | icp-dev | `cargo build -p wallet` | `Cargo.toml`, `products/03-wallet/canister/Cargo.toml` |
| 2 | Candid interface (wallet.did) | icp-dev | `grep derive_btc_address products/03-wallet/canister/wallet.did` | `wallet.did` |
| 3 | Types (TransactionIntent, etc. — Candid) | icp-dev | tests compile | `src/types.rs` |
| 4 | BTC bech32 + EVM address derivation | icp-dev | `cargo test wallet_test::derive_*` | `src/addresses.rs`, `src/ecdsa.rs` |
| 5 | Mock-ECDSA signer (feature flag) | icp-dev | `cargo test --features mock-ecdsa` | `src/ecdsa.rs` |
| 6 | sign_transaction with nonce idempotency | icp-dev | `cargo test wallet_test::sign_is_idempotent_on_same_nonce` | `src/lib.rs`, `src/storage.rs` |
| 7 | Public `reset_for_test` (cfg(test)) | icp-dev | test suite runs | `src/lib.rs` |

## Dependencies
- **No runtime deps** on M01/M03/M04.
- **Contract dep**: types in `wallet.did` MUST mirror `packages/types/src/wallet.ts` — if architect changes TS schema, icp-dev regenerates .did.

## Статус: ТЕСТЫ НАПИСАНЫ — ЖДЁТ icp-dev
