# M00c — platform/canister-shared + dfx-setup (bitgent salvage, Rust scope)

## Готово когда

Все canister'ы в Paxio работают поверх общего Rust-крейта `platform/canister-shared`, содержащего shared newtypes (`AgentId`, `TxHash`) + constants; per-worktree dfx-запуск автоматизирован через `scripts/dfx-setup.sh` (каждый dev-агент получает свой порт); `docs/paxio-dev-environment.md` описывает каноничный dfx-flow. Это разблокирует все будущие canister milestones (M05 Bitcoin Agent, M06 Compliance, M10 Oracle) — им не придётся заново определять те же примитивы.

## Метод верификации

- [ ] **Unit test (RED → GREEN):** `platform/canister-shared/tests/ids.rs`
  - `agent_id_serde_roundtrip` — `AgentId("did:paxio:abc")` → CBOR → обратно, идентично
  - `tx_hash_storable_bound` — `TxHash::BOUND.is_bounded() == true`, max_size корректный
  - `agent_id_candid_encoding` — tuple-struct сериализуется как bare `text` (wire-совместимо с `type AgentId = text` в .did)
  - `version_const` — `VERSION` совпадает с `CARGO_PKG_VERSION`
- [ ] **Acceptance script:** `bash scripts/verify_m00c_canister_shared.sh`
  - shared-crate существует и компилируется
  - добавлен в root `Cargo.toml` `[workspace.members]`
  - `scripts/dfx-setup.sh` executable, выдаёт корректный порт для каждого `AGENT_NAME`
  - `docs/paxio-dev-environment.md` существует + содержит обязательные секции
  - Ни один canister в products/*/ НЕ определяет свой собственный `AgentId` или `TxHash` (grep-check)

## Статус

🔴 PLANNED (2026-04-22).

## Зависимости

- M02/M03/M04 worktree-ветки НЕ требуются заранее — M00c можно мержить первым.
- После M00c будущие icp-dev milestones ДОЛЖНЫ импортировать из `canister-shared` вместо локального переопределения.

## Roadmap reference

Phase 0 foundation hygiene. Не в roadmap как фича, но необходимо для чистого icp-dev pipeline.

## FA reference

Cross-cutting — используется FA-01, FA-03, FA-05, FA-06. См. `docs/feature-areas/FA-09-icp-canister-architecture.md`.

## Salvage scope (из bitgent, по принципу «Rust-fits-Rust + tooling»)

| Bitgent источник | Paxio цель | Verdict | Обоснование |
|---|---|---|---|
| `canisters/shared/src/types.rs` — `AgentId`, `TxHash` newtypes (строки 1–17) | `platform/canister-shared/src/ids.rs` | **PORT-MINIMAL** | Pure primitives. Candid `text`-совместимы. |
| `canisters/shared/src/types.rs` — `AgentProfile`, `PaymentMethod`, `SecurityBadge`, `ReputationEntry` (строки 54–757) | — | **REJECT** | Paxio Registry = TS (FA-01). Domain-типы живут в `packages/types/` как Zod; в canister-shared им не место. Reputation canister (FA-01, registry-dev) определяет свои типы локально. |
| `canisters/shared/src/http.rs` (HTTP gateway helpers) | — | **REJECT** | В Paxio весь HTTP-сервинг в Fastify (`apps/back/server/`), не в canister'ах. Если понадобится HTTPS outcalls helper — добавим адресно в будущем milestone. |
| `scripts/dfx-env.sh` | `scripts/dfx-setup.sh` | **PORT-ADAPT** | Меняем имена агентов на Paxio-канон: `icp-dev`, `registry-dev`, `backend-dev`, `frontend-dev`, `test-runner`, `reviewer`. |
| `docs/BITGENT_DEV_ENVIRONMENT.md` (1 662 строки) | `docs/paxio-dev-environment.md` | **FRESH-WRITE** | Слишком bitgent-specific чтобы портировать дословно. Пишем свежий doc на основе структуры Paxio; bitgent используем как pattern-reference. |
| `canisters/registry/*`, `canisters/facilitator/*`, `canisters/wallet/*`, `canisters/security/*` (вся бизнес-логика) | — | **OUT-OF-SCOPE для M00c** | Это REFERENCE-ONLY для будущих milestones (в основном переписываем на TS), не для shared crate. |

**Ключевой принцип:** shared crate содержит ТОЛЬКО то, что нужно ≥2 canister'ам И не является domain-специфичным. Everything else — локально в canister'е-владельце.

## Шаг 1: Architect пишет скелет

### 1.1 Cargo workspace hook

`Cargo.toml` (root) — добавить в `[workspace.members]`:
```toml
[workspace]
members = [
  "platform/canister-shared",                     # M00c — cross-cutting primitives
  "products/03-wallet/canister",
  "products/04-security/canister",
  "products/06-compliance/canisters/audit-log",
]
```

### 1.2 `platform/canister-shared/Cargo.toml`

```toml
[package]
name = "canister-shared"
version.workspace = true
edition.workspace = true
license.workspace = true

[lib]
path = "src/lib.rs"

[dependencies]
candid.workspace = true
ic-stable-structures.workspace = true
serde.workspace = true
```

### 1.3 `platform/canister-shared/src/lib.rs`

```rust
//! Paxio canister-shared — cross-canister Rust primitives.
//!
//! Содержит ТОЛЬКО те типы/утилиты, которые нужны ≥2 canister'ам и
//! не являются domain-специфичными (domain типы живут в canister-е владельце).
//!
//! Порт из bitgent/canisters/shared/src/types.rs (строки 1–17) с обрезанием
//! domain-специфики (AgentProfile, PaymentMethod — не нужны здесь).

pub mod ids;

pub use ids::{AgentId, TxHash};

/// Версия crate (для диагностики upgrade compat).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
```

### 1.4 `platform/canister-shared/src/ids.rs`

```rust
use candid::CandidType;
use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

// ───────────────────────────────────────────────────────────────────────────
// AgentId — unique agent identifier, wire-compatible with `type AgentId = text`
// ───────────────────────────────────────────────────────────────────────────

#[derive(
    CandidType, Deserialize, Serialize,
    Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash,
)]
pub struct AgentId(pub String);

impl AgentId {
    pub const MAX_SIZE_BYTES: u32 = 512;

    pub fn as_str(&self) -> &str { &self.0 }
}

impl Storable for AgentId {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(self.0.as_bytes().to_vec()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(String::from_utf8(bytes.into_owned()).expect("AgentId: invalid UTF-8"))
    }
    const BOUND: Bound = Bound::Bounded { max_size: Self::MAX_SIZE_BYTES, is_fixed_size: false };
}

// ───────────────────────────────────────────────────────────────────────────
// TxHash — transaction hash (BTC, ETH, ICP)
// ───────────────────────────────────────────────────────────────────────────

#[derive(
    CandidType, Deserialize, Serialize,
    Clone, Debug, PartialEq, Eq, Hash,
)]
pub struct TxHash(pub String);

impl TxHash {
    pub const MAX_SIZE_BYTES: u32 = 128;

    pub fn as_str(&self) -> &str { &self.0 }
}

impl Storable for TxHash {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(self.0.as_bytes().to_vec()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(String::from_utf8(bytes.into_owned()).expect("TxHash: invalid UTF-8"))
    }
    const BOUND: Bound = Bound::Bounded { max_size: Self::MAX_SIZE_BYTES, is_fixed_size: false };
}
```

### 1.5 RED test — `platform/canister-shared/tests/ids.rs`

```rust
use canister_shared::{AgentId, TxHash, VERSION};
use candid::{Decode, Encode};
use ic_stable_structures::Storable;

#[test]
fn agent_id_candid_encoding_is_bare_text() {
    // Tuple-struct AgentId(String) должен сериализоваться как bare `text` в Candid
    // wire format — иначе .did с `type AgentId = text` сломается.
    let id = AgentId("did:paxio:agent-1".to_string());
    let encoded: Vec<u8> = Encode!(&id).unwrap();
    let decoded_as_string: String = Decode!(&encoded, String).unwrap();
    assert_eq!(decoded_as_string, "did:paxio:agent-1");
}

#[test]
fn agent_id_storable_roundtrip() {
    let id = AgentId("did:paxio:xyz".to_string());
    let bytes = id.to_bytes();
    let back = AgentId::from_bytes(bytes);
    assert_eq!(id, back);
}

#[test]
fn tx_hash_storable_bound_is_bounded() {
    match TxHash::BOUND {
        ic_stable_structures::storable::Bound::Bounded { max_size, is_fixed_size } => {
            assert_eq!(max_size, 128);
            assert!(!is_fixed_size);
        }
        _ => panic!("TxHash must be Bounded for StableBTreeMap use"),
    }
}

#[test]
fn version_matches_cargo_manifest() {
    assert_eq!(VERSION, env!("CARGO_PKG_VERSION"));
}
```

### 1.6 `scripts/dfx-setup.sh` — ported + adapted

Ported from `/home/nous/bitgent/scripts/dfx-env.sh`. Changes:
- Bitgent agent names → Paxio canon (`icp-dev`, `registry-dev`, `backend-dev`, `frontend-dev`, `test-runner`, `reviewer`, `architect`)
- Port scheme documented in header
- `dfx_configure` dropped (bitgent-specific inter-canister wiring; paxio does this per-milestone)

Port scheme:
```
architect:    4943  (default — baseline)
registry-dev: 4950
icp-dev:      4951
backend-dev:  4952
frontend-dev: 4953
test-runner:  4954
reviewer:     4955
```

### 1.7 `docs/paxio-dev-environment.md` — fresh write

Обязательные секции:
1. Prerequisites (dfx 0.24+, Node 22, Rust 1.80+, pnpm 10, uv 0.11)
2. First-time setup (`pnpm install`, `cargo fetch`, dfx install)
3. Per-agent dfx flow (`source scripts/dfx-setup.sh` + env `AGENT_NAME`)
4. Worktree pattern — `git worktree add /home/nous/paxio-worktrees/mXX-feature feature/mXX-xxx`
5. Running tests locally (vitest / cargo test / acceptance scripts)
6. Troubleshooting (port в use, dfx stale state)

### 1.8 Acceptance — `scripts/verify_m00c_canister_shared.sh`

```bash
#!/usr/bin/env bash
# M00c — canister-shared + dfx-setup acceptance.
set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0; FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

step "1. platform/canister-shared exists and compiles"
[ -f platform/canister-shared/Cargo.toml ] && ok "Cargo.toml" || bad "missing Cargo.toml"
[ -f platform/canister-shared/src/lib.rs ] && ok "lib.rs"     || bad "missing lib.rs"
[ -f platform/canister-shared/src/ids.rs ] && ok "ids.rs"     || bad "missing ids.rs"

if cargo build -p canister-shared --release >/tmp/m00c-build.log 2>&1; then
  ok "cargo build"
else
  bad "cargo build FAILED — see /tmp/m00c-build.log"
fi

step "2. canister-shared registered in root Cargo workspace"
grep -q '"platform/canister-shared"' Cargo.toml && ok "workspace member" || bad "not in root Cargo.toml members"

step "3. Unit tests GREEN"
if cargo test -p canister-shared >/tmp/m00c-test.log 2>&1; then
  ok "cargo test -p canister-shared"
else
  bad "tests FAILED — see /tmp/m00c-test.log"
fi

step "4. No canister re-defines AgentId / TxHash locally"
if grep -rn 'struct AgentId\|struct TxHash' products/*/canister*/src/ 2>/dev/null | grep -v canister_shared; then
  bad "duplicate AgentId/TxHash definition found"
else
  ok "no duplicate newtypes"
fi

step "5. scripts/dfx-setup.sh executable + port scheme intact"
[ -x scripts/dfx-setup.sh ] && ok "dfx-setup.sh +x" || bad "dfx-setup.sh not executable"
for agent in architect registry-dev icp-dev backend-dev frontend-dev test-runner reviewer; do
  expected_port=$(AGENT_NAME="$agent" bash -c 'source scripts/dfx-setup.sh; echo $DFX_PORT' 2>/dev/null)
  if [ -n "$expected_port" ]; then
    ok "AGENT_NAME=$agent → DFX_PORT=$expected_port"
  else
    bad "AGENT_NAME=$agent → no DFX_PORT"
  fi
done

step "6. docs/paxio-dev-environment.md present + complete"
[ -f docs/paxio-dev-environment.md ] && ok "doc exists" || bad "missing doc"
for section in "Prerequisites" "First-time setup" "Per-agent dfx" "Worktree" "Troubleshooting"; do
  grep -q "$section" docs/paxio-dev-environment.md && ok "has section: $section" || bad "missing section: $section"
done

echo; echo "====================================="
echo "M00c canister-shared: $PASS passed, $FAIL failed"
echo "====================================="
[ "$FAIL" -eq 0 ] || exit 1
```

## Задачи

| # | Задача | Агент | Метод верификации | Файлы |
|---|---|---|---|---|
| 1 | Написать shared Rust newtypes (AgentId, TxHash) | architect | unit test `cargo test -p canister-shared` GREEN (4 tests) | `platform/canister-shared/src/{lib,ids}.rs`, `Cargo.toml` |
| 2 | Зарегистрировать crate в root `Cargo.toml` workspace | architect | acceptance step 2 PASS | `Cargo.toml` |
| 3 | Портировать `dfx-setup.sh` с bitgent + paxio-naming | architect | acceptance step 5 PASS (7 агентов → 7 портов) | `scripts/dfx-setup.sh` |
| 4 | Написать `docs/paxio-dev-environment.md` | architect | acceptance step 6 PASS (5 секций) | `docs/paxio-dev-environment.md` |
| 5 | Acceptance script | architect | `bash scripts/verify_m00c_canister_shared.sh` PASS | `scripts/verify_m00c_canister_shared.sh` |

**Примечание:** M00c целиком architect-owned (shared contracts + scripts + docs — всё архитектурный поверхностный слой). Dev-agent handoff не требуется. RED→GREEN циклы делает architect в одном коммите.

## После merge

1. Обновить `docs/NOUS_Development_Roadmap.md` — добавить M00c ✅ DONE в секцию Phase 0.
2. Будущие canister milestones (M05 Bitcoin Agent, M06 audit stack expansion, M10 Oracle) импортируют `canister-shared::{AgentId, TxHash}` вместо локального определения.
3. Существующие M02/M03/M04 (ещё в worktree) можно опционально рефакторнуть после merge в dev (не блокирующее).
