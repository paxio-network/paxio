# M-L5 — Landing NetworkGraph wired to real Registry agents

> Phase 1 (Roadmap) — Landing Data Completion Track, next milestone after
> M-L1-impl MVP landed real crawler + Postgres storage.

## Готово когда:

Landing `/api/landing/network/snapshot` возвращает реальные nodes из Postgres
`agent_cards` (до 20 последних crawled агентов), deterministic position hash
из DID, `volume_usd_5m: 0` (real empty state — no transaction data yet),
`bitcoin_native` derived from capability `wallet`. Pairs stay empty `[]` —
no transaction-level data until Audit Log integration (M17+).

Real Data Invariant enforced:
- Nodes показываются ТОЛЬКО если реальные agent_cards в БД есть
- При пустой БД (0 crawled) — snapshot возвращает `nodes: [], pairs: []`
- NO `Math.random`, NO fake agent names, NO hardcoded positions — positions
  derive from SHA-1(DID) mod 100 for determinism

## Метод верификации:

- [ ] **unit tests** — `pnpm test -- --run` → вся suite GREEN:
  - `products/01-registry/tests/postgres-storage.test.ts` — новый describe block
    для `listRecent(limit)` — 6+ assertions (SQL shape, limit bound enforcement,
    ORDER BY determinism, empty result, projection, error mapping)
  - `products/07-intelligence/tests/network-snapshot-builder.test.ts` — NEW,
    10+ pure function tests (deterministic, frozen result, position hash,
    bitcoin_native detection, empty cards → empty nodes)
  - `products/07-intelligence/tests/landing-stats.test.ts` — новый describe
    block `getNetworkSnapshot (M-L5)` — 4+ assertions (calls agentStorage.listRecent,
    upstream error → LandingError, empty upstream → empty snapshot, result frozen)
- [ ] **acceptance script** — `bash scripts/verify_m_l5_network_snapshot.sh` → PASS
  (clean install + pnpm build + curl mock request against booted server →
  returns valid `NetworkSnapshot` Zod-parseable JSON)

## Зависимости:

- [x] M-L1-impl MVP — Postgres AgentStorage landed (`c754ee2`)
- [x] TD-19 fix merged — landing builds clean (blocker for acceptance step 4)
- [x] TD-20 reviewer Phase 1.5 in effect — acceptance script exercises clean install

## Архитектура

### Поток данных

```
apps/frontend/landing/app/sections/05-network.tsx
  └── useQuery(['landing-network-snapshot'], paxioClient.landing.getNetworkSnapshot)
         ↓ HTTP GET /api/landing/network/snapshot
apps/back/server (Fastify)
  └── loaded via VM sandbox: products/07-intelligence/app/api/landing-network-snapshot.js
         ↓ await domain['07-intelligence'].landing.getNetworkSnapshot()
products/07-intelligence/app/domain/landing-stats.ts::getNetworkSnapshot
  └── cards = await deps.agentStorage.listRecent(20)  ← NEW DEP (M-L5)
         ↓ buildNetworkSnapshot(cards, clock)         ← NEW PURE FN
packages/types::NetworkSnapshot ← returned up the stack
```

### Новые контракты (architect)

**1. `packages/interfaces/src/agent-storage.ts` — AgentStorage::listRecent**

```typescript
listRecent(limit: number): Promise<Result<readonly AgentCard[], StorageError>>;
```

Contract:
- `limit` в диапазоне [1, 100]. Impl SHOULD cap at 100 silently;
  caller (domain) MUST enforce upper bound.
- Order: `ORDER BY updated_at DESC, did ASC` — second key guarantees
  determinism при равных timestamps.
- Returns frozen readonly array.
- Empty array valid.

**2. `products/07-intelligence/app/domain/network-snapshot-builder.ts` — pure fn**

```typescript
export const buildNetworkSnapshot = (
  cards: readonly AgentCard[],
  nowMs: number,
): NetworkSnapshot => { ... };
```

Pure, deterministic, factory-free (plain function). Maps each AgentCard to
one NetworkNode:
- `id`: card.did
- `name`: card.name (truncated to 80)
- `x_pct`, `y_pct`: deterministic hash of DID (first 2 hex bytes of sha1)
  mod 100 each — caller guaranteed same position across calls
- `volume_usd_5m`: 0 — no transaction data yet (Real Data Invariant)
- `bitcoin_native`: `card.capabilities.includes('wallet')`

Pairs: always `[]` — transactions-derived, tracked for Audit Log milestone.

### Изменения в существующих файлах (dev)

| Файл | Агент | Изменение |
|---|---|---|
| `products/01-registry/app/infra/postgres-storage.ts` | registry-dev | +`listRecent(limit)` method — `SELECT ... ORDER BY updated_at DESC, did ASC LIMIT $1`, clamp limit at 100, existing `rowToAgentCard` projection, Result<T,E> error mapping |
| `products/07-intelligence/app/domain/landing-stats.ts` | backend-dev | Add `agentStorage: AgentStorage` to `LandingStatsDeps`; `getNetworkSnapshot` вызывает `deps.agentStorage.listRecent(20)` → `buildNetworkSnapshot(cards, deps.clock())` |
| `products/07-intelligence/app/domain/network-snapshot-builder.ts` | backend-dev (NEW) | Pure function per contract above |
| `apps/back/server/main.cjs` | backend-dev | Wire Postgres-backed AgentStorage into `createLandingStats({ ..., agentStorage })` composition root (reuses existing `createPostgresStorage` instance from M-L1-impl) |
| `apps/frontend/landing/app/sections/05-network.tsx` | frontend-dev | NO CHANGE — already queries `/api/landing/network/snapshot`, just starts returning non-empty data once backend wired |

## Предусловия среды (architect обеспечивает):

- [x] `pnpm install` clean
- [x] `pnpm typecheck` clean на dev base
- [x] `cargo build --workspace` clean
- [ ] Postgres реальный доступен для acceptance: запущен через docker-compose
  (план M17-dev-infra — coming after M-L5 unblock) ИЛИ пропускать step 4
  acceptance в локальной разработке
- [ ] TD-19 merged в dev (landing builds) — **hard blocker for step 4**

## Таблица задач

| # | Задача | Агент | Метод верификации | Архитектурные требования | Файлы |
|---|---|---|---|---|---|
| T-1 | Add `listRecent(limit)` to AgentStorage port | architect | tests compile against new contract | interface-only change, no impl | `packages/interfaces/src/agent-storage.ts` |
| T-2 | RED test: Postgres listRecent | architect | `pnpm test` → listRecent tests RED | SQL-shape assertion via fake pool, deterministic ORDER BY check, limit bound check | `products/01-registry/tests/postgres-storage.test.ts` (+describe block) |
| T-3 | RED test: network-snapshot-builder (pure fn) | architect | `pnpm test` → builder tests RED | Pure fn (deterministic same input → same output via `toStrictEqual`), frozen result, no Date.now, no Math.random, empty input → empty output | `products/07-intelligence/tests/network-snapshot-builder.test.ts` (NEW) |
| T-4 | RED test: landing-stats.getNetworkSnapshot wired | architect | `pnpm test` → wired test RED | Calls `agentStorage.listRecent(20)` exactly once; upstream err → `LandingError{code:'upstream_error'}`; result frozen; agentStorage injected in deps | `products/07-intelligence/tests/landing-stats.test.ts` (+describe block) |
| T-5 | Impl Postgres `listRecent` | registry-dev | T-2 tests GREEN | `ORDER BY updated_at DESC, did ASC LIMIT $1`, clamp `Math.min(100, Math.max(1, limit))`, reuse `rowToAgentCard`, Result<T,E>, no raw throws | `products/01-registry/app/infra/postgres-storage.ts` |
| T-6 | Impl `buildNetworkSnapshot` pure fn | backend-dev | T-3 tests GREEN | Pure function (no `async`, no `Date.now`, no `Math.random`), `Object.freeze({ nodes: Object.freeze([...]), pairs: Object.freeze([]), generated_at })`, deterministic SHA-1 hash for position, consistent return shape | `products/07-intelligence/app/domain/network-snapshot-builder.ts` (NEW) |
| T-7 | Wire agentStorage in landing-stats | backend-dev | T-4 tests GREEN | Add `agentStorage: AgentStorage` to `LandingStatsDeps`, update `getNetworkSnapshot`, do NOT remove `clock` dep (TD-05 fix intact), result still frozen | `products/07-intelligence/app/domain/landing-stats.ts` |
| T-8 | Wire composition root | backend-dev | acceptance step 5 PASS (server boots + endpoint returns valid JSON) | Reuse existing `createPostgresStorage` instance — do NOT create a second pool | `apps/back/server/main.cjs` |
| T-9 | Acceptance script | architect | `bash scripts/verify_m_l5_network_snapshot.sh` runs and fails gracefully at step 5 until T-5..T-8 land | Clean install + build + server boot + HTTP curl + Zod validation of response | `scripts/verify_m_l5_network_snapshot.sh` (NEW) |

## Оценка: 2-3 дня (2 параллельно: registry-dev T-5 + backend-dev T-6..T-8)

## Статус: ТЕСТЫ ГОТОВЯТСЯ

## Post-milestone

- Architect: update `docs/NOUS_Development_Roadmap.md` → M-L5 ✅
- Architect: update `docs/project-state.md` via reviewer after APPROVED
- Unblocks: M-L8 (Uptime/SLA/FAP throughput — similar pattern, real data from FAP router)
