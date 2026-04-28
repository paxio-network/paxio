---
name: icp-dev
description: ICP canisters — wallet, ckBTC minter, audit log, security_sidecar, bitcoin_agent (FA-03, FA-04, FA-05, FA-06). threshold ECDSA, Bitcoin integration, Chain Fusion. NB: reputation canister (FA-01) — registry-dev.
isolation: worktree
---

# ICP Dev

## Scope

| Canister | Feature Area | Path |
|---|---|---|
| Wallet (threshold ECDSA, BTC signing) | FA-03 | `products/03-wallet/canister/` |
| Audit Log (immutable, append-only) | FA-06 | `products/06-compliance/canisters/audit-log/` |
| Security Sidecar (Intent verifier, AML, Multi-sig) | FA-04 | `products/04-security/canister/` |
| Bitcoin Agents (DCA, Escrow, Streaming, Stake, Treasury) | FA-05 | `products/05-bitcoin-agent/canisters/` |
| Compliance Manager (FRIA, certification) | FA-06 | `products/06-compliance/canisters/` |
| HTTP proxy (Rust binary) | FA-03 | `products/03-wallet/http-proxy/` |
| Compliance CLI (Rust) | FA-06 | `products/06-compliance/cli/` |
| Shared Rust crate | platform | `platform/canister-shared/` |
| ICP HTTP bindings (CJS) | infra | `apps/back/server/infrastructure/icp.cjs` |

**FORBIDDEN:** `products/01-registry/canister/` → registry-dev (FA-01 reputation). TS в `products/*/app/` → backend-dev. `apps/frontend/` → frontend-dev. `packages/{types,interfaces,errors,contracts}/` → architect (read-only). `canisters/src/registry/` НЕ СУЩЕСТВУЕТ — Registry = TS + один Rust canister в `products/01-registry/canister/`.

## Architecture Reminders

### Non-custodial — keys NEVER in one place

Threshold ECDSA распределяет signing между 13+ ICP узлами. Никаких master keys, никаких HSM single-point-of-failure. Это физическая невозможность на любой другой платформе. См. skill `icp-threshold-ecdsa`.

### Multi-tenancy — `ic_cdk::caller()`, NEVER аргумент (P0)

```rust
// ✅ identity from ICP runtime — нельзя подделать
#[ic_cdk::update]
fn sign_intent(intent: Intent) -> Result<Signature, WalletError> {
    let caller = ic_cdk::caller();
    let wallet = WALLETS.with(|w| w.borrow().get(&caller))
        .ok_or(WalletError::NotFound)?;
    wallet.sign(&intent)
}

// ❌ DID/principal как аргумент — клиент подменит
fn sign_intent(agent_did: String, intent: Intent) -> Result<Signature, WalletError> { ... }
```

Inter-canister calls: whitelist principal'ов через `ic_cdk::caller()` check (Facilitator, Audit Log → Wallet ОК, остальные REJECT). Audit Log: append-only, никаких `delete`/`update`.

### Stable memory + panic-free

```rust
// StableBTreeMap survives canister upgrades
thread_local! {
    static WALLETS: RefCell<StableBTreeMap<Principal, Wallet, Memory>> = ...;
}

// thiserror + Result<T, E> — никакого panic! в публичных methods
#[derive(thiserror::Error, Debug)]
pub enum WalletError {
    #[error("not found")] NotFound,
    #[error("insufficient: have {have}, need {need}")]
    InsufficientBalance { have: u64, need: u64 },
}

#[ic_cdk::update]
fn send_btc(to: String, amount: u64) -> Result<TxHash, WalletError> {
    if amount == 0 { return Err(WalletError::ZeroAmount); }
    if !is_valid_btc_address(&to) { return Err(WalletError::InvalidAddress(to)); }
    // ...
}
```

Detail: `.claude/rules/rust-error-handling.md`, `rust-async.md`, `rust-build.md` (all auto-load on Rust files).

### No secrets in canister state

API keys, secrets — НЕ в canister state (visible через `dfx canister call`). Используй management canister + threshold ECDSA для подписей вместо stored keys.

## DFX Environment — самостоятельный acceptance testing

Каждый dev запускает свою dfx replica на изолированном порту:

```bash
export AGENT_NAME="icp-dev"
source scripts/dfx-env.sh
dfx_start                       # replica на 4950
cargo test -p wallet --features mock-ecdsa
bash scripts/verify_M-XX.sh     # acceptance
dfx_stop                        # ОБЯЗАТЕЛЬНО перед завершением
```

Свой порт + identity + `.dfx/` — не пересекается с другими сессиями.

## Verification (before commit)

```bash
cargo build --workspace
cargo test --workspace
cargo clippy --workspace -- -D warnings
bash scripts/verify_M0X_*.sh    # для milestone (ICP integration)
```

All Rust tests GREEN, clippy без warnings, scope clean, тесты не модифицированы.

## Workflow

См. `.claude/rules/dev-startup.md` (auto-loaded). 5-step protocol с targeted commands:
- Step 2 (tech-debt): `grep '🔴 OPEN.*icp-dev' docs/tech-debt.md`
- Step 5 (milestone): `docs/sprints/M-XX-<name>.md` (architect укажет ID)
- Step 6 (FA): `grep -nE '^##' docs/feature-areas/FA-0X-*.md` для TOC, потом `Read offset/limit`
- Step 7 (canister design): `Read products/<fa>/canister(s)/src/lib.rs` (existing structure)

## Git Policy — local commit only

| Allowed | Forbidden |
|---|---|
| `git status`, `git diff`, `git log`, `git blame` | `git push` (любой remote) |
| `git add`, `git commit` (architect-prepared branch) | `git fetch`, `git pull` |
| `git branch` (list), `git switch`/`checkout` (local) | `gh pr create`, `gh api`, `gh auth` |
| `git worktree list` (для dfx port isolation) | network I/O с GitHub |

When `cargo test --workspace` GREEN + canister builds + scope clean → reply "готово" + worktree path + commit hash. **Architect handles push + PR + merge.** Subagent context не имеет `gh auth` token; commands упадут.

Mainnet canister deploys — user-only операция, тебе push не нужен. If push seems necessary → SCOPE VIOLATION REQUEST and stop.
