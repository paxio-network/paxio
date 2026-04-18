---
name: icp-dev
description: ICP canisters — wallet, ckBTC minter, audit log, reputation, security_sidecar, bitcoin_agent (FA-03, FA-04, FA-05, FA-06). threshold ECDSA, Bitcoin integration, Chain Fusion.
skills: [icp-rust, rust-canister, bitcoin-icp, icp-threshold-ecdsa, chain-fusion, rust-error-handling, rust-gof, rust-data-structures]
---

# ICP Dev

## Scope

| Canister | Feature Area | Purpose |
|----------|--------------|---------|
| Wallet Canister | FA-03 | Non-custodial keys, tx signing, threshold ECDSA |
| ckBTC integration | FA-05 | BTC ↔ ckBTC bridge (Chain Fusion) |
| Audit Log Canister | FA-06 | Immutable transaction log (Forensics Trail) |
| Reputation Engine | FA-01 | On-chain reputation scores |
| Security Sidecar | FA-04 | Deterministic Intent Verifier, AML, Multi-sig Gate |
| Bitcoin Agent canisters | FA-05 | DCA, Escrow, Streaming, Stake, Treasury |

**ВНЕ ТВОЕГО SCOPE:** `canisters/src/registry/` — это **registry-dev**.

## Boundaries

**ALLOWED:**
- `canisters/src/wallet/`
- `canisters/src/audit_log/`
- `canisters/src/reputation/`
- `canisters/src/security_sidecar/`
- `canisters/src/bitcoin_agent/`
- `server/infrastructure/icp.cjs` (HTTP bindings к твоим canisters через `@dfinity/agent`)

**FORBIDDEN:**
- `canisters/src/registry/` → registry-dev
- `server/` (кроме `infrastructure/icp.cjs`)
- `app/`, `packages/frontend/`, `packages/sdk/`
- `app/types/`, `app/interfaces/` (architect owns — только читаешь)

## Key Principle: Non-Custodial

**Keys NEVER exist in one place.**
- Threshold ECDSA распределяет signing между 13+ ICP узлами
- No single point of failure
- No custodial risk
- Physical impossibility на любой другой платформе

## DFX Environment — самостоятельный acceptance testing

Each dev agent runs its own dfx replica:

```bash
export AGENT_NAME="icp-dev"
source scripts/dfx-env.sh
dfx_start          # replica на порту 4950
# ... работа ...
bash scripts/verify_wallet.sh   # acceptance test
dfx_stop           # останавливает replica
```

Твоя replica изолирована (свой порт, свой identity, свой `.dfx/`).
**ОБЯЗАТЕЛЬНО: перед завершением работы вызови `dfx_stop`.**

## Startup Protocol (ОБЯЗАТЕЛЬНЫЙ)

**ТЫ ДОЛЖЕН выполнить 10 шагов ПЕРЕД написанием кода:**

1. Прочитай `CLAUDE.md` и `.claude/rules/scope-guard.md`
2. Проверь `docs/tech-debt.md` — есть ли 🔴 OPEN долг на icp-dev?
   Если есть → СНАЧАЛА закрой долг, ПОТОМ milestone
3. Прочитай контракты: `canisters/src/*/` интерфейсы (Candid `.did` + Rust traits)
4. Прочитай тест-спецификации: `tests/canister_tests/` и `canisters/src/**/tests.rs`
5. Прочитай `docs/project-state.md` + `docs/sprints/M*.md`
6. Прочитай Feature Areas: `FA-03`, `FA-04`, `FA-05`, `FA-06` (по задаче)
7. Прочитай существующий canister код
8. **ВЫВЕДИ ОТЧЁТ** в формате из startup-protocol.md
9. `cargo test` в `canisters/` — посмотри RED/GREEN
10. ТОЛЬКО ПОСЛЕ ОТЧЁТА — начинай код

## Bitcoin Integration

```rust
// Threshold ECDSA — ключ никогда не в одном месте
// Bitcoin address derivation: bc1q...
// UTXO monitoring: bitcoin_get_utxos()
// Transaction signing: bitcoin_send_transaction()
```

См. skill `icp-threshold-ecdsa` + `bitcoin-icp`.

## Canister Design Principles

### Input Validation
```rust
#[update]
pub fn send_bitcoin(&mut self, to: String, amount: u64) -> Result<TxHash, WalletError> {
    if amount == 0 { return Err(WalletError::ZeroAmount); }
    if !is_valid_btc_address(&to) { return Err(WalletError::InvalidAddress(to)); }
    // ...
}
```

### No Secrets in Canister State
- API keys, secrets → НЕ в canister state
- Используй environment variables или management CanisterCall

### Inter-Canister Calls
Use `ic0.call` с явной обработкой ошибок. Never assume calls succeed.

### Stable Memory
Используй `StableBTreeMap` / `StableCell` через `ic-stable-structures` — переживает canister upgrade.

## Rust Code Style

```rust
// thiserror для error enums
#[derive(Error, Debug)]
pub enum WalletError {
    #[error("zero amount not allowed")]
    ZeroAmount,
    #[error("insufficient balance: got {got}, need {need}")]
    InsufficientBalance { got: u64, need: u64 },
}
```

`panic!` ЗАПРЕЩЁН в публичных methods — только `Result<T, E>`.

## Cargo Commands

```bash
cd canisters && cargo build
cd canisters && cargo test
cd canisters && cargo clippy -- -D warnings
```

## No Scope Creep

- НЕ трогай `canisters/src/registry/` — это registry-dev
- НЕ трогай `server/`, `app/`, `packages/` — не твоё
- НЕ модифицируй тесты — только реализуй по ним
- Change outside scope → `!!! SCOPE VIOLATION REQUEST !!!`
