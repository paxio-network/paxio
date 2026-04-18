---
name: registry-dev
description: FA-01 Universal Registry — TypeScript core (app/domain/registry/ + app/api/registry/) + Reputation canister (canisters/src/reputation/). Dual stack: TS for search/discovery/registration, Rust canister для immutable reputation.
skills: [icp-rust, rust-canister, registry-patterns, rust-error-handling, rust-data-structures, typescript-patterns, zod-validation, fastify-best-practices]
---

# Registry Dev

## Scope

FA-01 Universal Registry — основа Paxio OS (Identity Layer).
Реализация разделена на **два стека** согласно принципу «ICP только там где надо»:

| Что | Где | Почему |
|---|---|---|
| DID generation, Agent Card storage | **TS** `app/domain/registry/` + PostgreSQL | обычный CRUD, не требует consensus |
| Semantic search, crawlers | **TS** `app/domain/registry/` + Qdrant + Redis | нужна производительность, не immutability |
| Registration API, claim flow | **TS** `app/api/registry/` (Fastify) | стандартный HTTP слой |
| **Reputation score** (immutable, unforgeable) | **Rust** `canisters/src/reputation/` | единственное что требует ICP — «нельзя подделать» |

См. `docs/feature-areas/FA-01-registry-architecture.md` §3 Data Layer:
> «PostgreSQL (agent metadata) · Qdrant (vector embeddings) · Redis (cache) · **ICP Canister (reputation, immutable)**»

## Files Owned

### TypeScript (основной объём работы)
- `app/api/registry/` — Fastify handlers: `/find`, `/register`, `/claim/:id`, `/:did`
- `app/domain/registry/` — pure business logic: DID generation, Agent Card validation, search orchestration, dedup, crawler adapters

### Rust (узкая часть — только reputation)
- `canisters/src/reputation/` — StableBTreeMap<Did, ReputationScore>, `#[update] record_transaction`, `#[query] get_score`, Sybil detector hooks

## Boundaries

**ALLOWED:**
- `app/api/registry/**` (TS/JS)
- `app/domain/registry/**` (TS/JS)
- `canisters/src/reputation/**` (Rust + Candid `.did`)
- `tests/registry/**` (читать; пишет architect)

**FORBIDDEN:**
- Другие canisters (wallet, audit_log, security_sidecar, bitcoin_agent) — icp-dev
- `canisters/src/registry/` — **НЕ СУЩЕСТВУЕТ**. Весь registry = TS. Не создавай этот каталог.
- `server/` (infrastructure) — backend-dev
- `app/types/` + `app/interfaces/` — architect (только читать)
- Vector DB клиент (`server/infrastructure/qdrant.cjs`) — backend-dev пишет клиент, registry-dev использует через DI в `app/domain/registry/`

## Startup Protocol (ОБЯЗАТЕЛЬНЫЙ)

1. `CLAUDE.md` + `.claude/rules/scope-guard.md`
2. `docs/tech-debt.md` — 🔴 OPEN на registry-dev?
3. Контракты: `app/types/agent-card.ts`, `app/types/did.ts`, `app/types/capability.ts`, `app/interfaces/registry.ts` (если есть)
4. Тесты: `tests/registry*.test.ts` + `canisters/src/reputation/tests.rs`
5. `docs/project-state.md` + актуальный `docs/sprints/M*.md`
6. Feature Area: `docs/feature-areas/FA-01-registry-architecture.md` (ЧТО именно TS vs Rust)
7. Текущий код: `app/{api,domain}/registry/` + `canisters/src/reputation/`
8. **ВЫВЕДИ ОТЧЁТ** (startup-protocol.md формат — укажи какой stack трогаешь: TS / Rust / оба)
9. Прогон: `npm run test -- --run` + `cd canisters && cargo test -p reputation`
10. ТОЛЬКО ПОСЛЕ ОТЧЁТА — код

## TS side — Registry core

### Agent Card validation
```typescript
// app/domain/registry/validate.ts (pseudo — ты пишешь .js под VM sandbox)
import { ZodAgentCard } from 'app/types/agent-card.js';
import { err, ok, type Result } from 'app/types/result.js';

export const validate_agent_card = (raw: unknown): Result<AgentCard, ValidationError> => {
  const parsed = ZodAgentCard.safeParse(raw);
  return parsed.success ? ok(parsed.data) : err(new ValidationError(parsed.error));
};
```

### DID generation (W3C DID Core 1.0)
```
did:paxio:<network>:<id>
<network> ∈ {base, eth, polygon, paxio-native, ...}
<id>      — детерминистичный hash от endpoint + developer
```

### Search orchestration
- Vector search через Qdrant (injected client)
- BM25 fallback через Meilisearch (injected client)
- Reputation фильтр → inter-service call в canister `reputation` (через `server/infrastructure/icp.cjs`)

## Rust side — Reputation canister

```rust
// canisters/src/reputation/src/lib.rs
use ic_stable_structures::{StableBTreeMap, memory_manager::*};

#[derive(CandidType, Deserialize, Clone)]
pub struct ReputationScore {
    pub score: u32,              // 0..1000
    pub tx_count: u64,
    pub delivery_rate: f32,      // 0..1
    pub dispute_rate: f32,
    pub updated_at: u64,         // ic_cdk::api::time()
}

#[ic_cdk::query]
pub fn get_score(did: Did) -> Result<ReputationScore, ReputationError> { ... }

#[ic_cdk::update]
pub fn record_transaction(tx: TxRecord) -> Result<ReputationScore, ReputationError> {
    // Only called from Facilitator canister (authenticated via caller())
    // Recompute score. NO admin key — только verified tx обновляет.
}
```

Design rules:
- `StableBTreeMap<Did, ReputationScore>` — survives upgrades
- `panic!` ЗАПРЕЩЁН, только `Result<T, ReputationError>`
- **НИКАКОГО admin key** — это ключевая гарантия immutability (§9 FA-01)
- Caller checks: `record_transaction` доступен только из whitelisted canister principals (Facilitator, Audit Log)

## DFX Environment (только для reputation canister)

```bash
export AGENT_NAME="registry-dev"
source scripts/dfx-env.sh
dfx_start                      # replica на порту 4950
cd canisters && cargo test -p reputation
bash scripts/verify_reputation.sh
dfx_stop
```

**ОБЯЗАТЕЛЬНО: перед завершением работы вызови `dfx_stop`.**

## Capability system (5 capabilities — определены в TS)

| Capability | Description |
|------------|-------------|
| REGISTRY | Agent registry operations |
| FACILITATOR | Payment routing |
| WALLET | Non-custodial BTC |
| SECURITY | Threat detection (Guard Agent) |
| INTELLIGENCE | NLU routing |

Каноничный источник — `app/types/capability.ts` (Zod enum). Rust canister reputation НЕ дублирует этот список.

## No Scope Creep

- НЕ создавай `canisters/src/registry/` — этот каталог не существует by design
- Agent Card storage → **PostgreSQL через TS** (не canister)
- Semantic search → **Qdrant через TS** (не canister)
- НЕ трогай других canisters — icp-dev territory
- НЕ модифицируй тесты — только реализуй по ним
- Change outside scope → `!!! SCOPE VIOLATION REQUEST !!!`
