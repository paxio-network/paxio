# M-L11 Phase 6 — Intelligence composition root wiring

**Status:** RED (architect spec written, awaits backend-dev impl)
**Owner:** backend-dev
**Effort:** 1–2 days
**Branch:** `feature/M-L11-P6-intelligence-wiring`
**Parent milestone:** `docs/sprints/M-L11-real-data-pipeline.md` (Phase 6, task W-1)

## Цель

Расширить `apps/back/server/wiring/07-intelligence.cjs` чтобы инжектировать
`intelligenceSnapshot` + `movers` factories в `sandbox.domain['07-intelligence']`.
После этого handlers `/api/intelligence/paei/snapshot` и `/api/intelligence/movers`
шипшеные в Phase 5 (commits `d87ed61` + `1fa195c`) реально вызывают domain layer
вместо «handler не находит domain». Это unblock'ает Phase 7 (frontend migration
preview.ts → paxioClient).

## Scope (узкий — ТОЛЬКО W-1, не W-2)

W-2 (`apps/back/server/wiring/01-registry.cjs::registryList`) wait'ит на:
- H-3 `products/01-registry/app/api/registry-list.js` (registry-dev territory, FA-01)
- I-3 `products/01-registry/app/domain/registry-list.ts`

Эти blocker'ы — отдельный milestone (M-L11 P6.5 OR FA-01 M-L1-impl).

## Готово когда

1. `apps/back/server/wiring/07-intelligence.cjs` экспортирует
   `wireIntelligenceDomain(rawDomain, deps)` который возвращает frozen object с
   тремя полями: `landing` (existing), `intelligenceSnapshot` (NEW), `movers` (NEW)
2. `intelligenceSnapshot.getPaeiSnapshot()` для cold registry (zero-state)
   возвращает `ok({ paei: 0, paeiD: 0, btc: 0, ..., generatedAt: ISO-string })` —
   shape матчит `ZodPaeiSnapshot`
3. `movers.getMovers('24h')` для cold registry возвращает
   `ok({ window: '24h', gainers: [], losers: [], paeiHistory: [], generatedAt })`
4. `movers.getMovers('invalid')` возвращает `err({ code: 'invalid_window', ... })`
5. Wiring frozen (`Object.isFrozen(result)` true)
6. Stub `agentMetricsRepo` / `moversRepo` adapters return zero-fill — НЕ
   throw, НЕ реальные Postgres queries (Postgres ждёт FA-01 M-L1-impl)
7. Stub `cache` adapter — простой in-memory Map (Redis NOT required для P6,
   приходит вместе с FA-01 M-L1-impl или отдельно как infra milestone)
8. RED тест `products/07-intelligence/tests/intelligence-wiring.test.ts` GREEN
9. Acceptance script `scripts/verify_M-L11-P6.sh` PASS

## Tasks

| # | Task | Agent | Directory | Verification | Architecture Requirements |
|---|------|-------|-----------|-------------|--------------------------|
| W-1.1 | Extend `wireIntelligenceDomain` to include `intelligenceSnapshot` + `movers` factories. Use existing `createIntelligenceSnapshot` / `createMovers` from P4. | backend-dev | apps/back/server/wiring/07-intelligence.cjs | wiring test GREEN | CJS module, no `import`; load TS factories via existing loader; stay frozen |
| W-1.2 | Stub `agentMetricsRepo` (zero-fill) — implements `aggregateAll` / `aggregatePrior` returning all-zeros object. | backend-dev | apps/back/server/infrastructure/agent-metrics-repo-stub.cjs (NEW) | wiring test GREEN | Pure factory, deterministic, no I/O. TODO M-L1-impl marker for replacement with Postgres adapter |
| W-1.3 | Stub `moversRepo` — `getMoversForWindow` returns `{ candidates: [] }`, `getPaeiHistory` returns `[]`. | backend-dev | apps/back/server/infrastructure/movers-repo-stub.cjs (NEW) | wiring test GREEN | Same — TODO M-L1-impl marker |
| W-1.4 | In-memory cache adapter (`Map`-based, no TTL eviction за рамками теста). | backend-dev | apps/back/server/infrastructure/cache-memory.cjs (NEW) | wiring test GREEN | TODO marker for Redis upgrade |

## Архитектурные требования

- **VM sandbox compatible** — wiring живёт в `server/` (CJS), но факторя возвращают объект который инжектируется в `sandbox.domain['07-intelligence']` — handlers в `app/` обращаются через injected `domain`, не require
- **No real I/O в P6** — все stubs returning zero-fill, не Postgres / Redis вызовы
- **Frozen result** — `Object.freeze()` на верхнем уровне returned object
- **TODO markers** — каждый stub adapter имеет `// TODO M-L1-impl: replace with <Postgres|Redis> adapter` чтобы M-L11 Phase 7 + FA-01 M-L1-impl walker нашёл sites
- **Loader compatibility** — если loader nests TS files in `domain/`, wiring обращается к `rawDomain['intelligence-snapshot'].createIntelligenceSnapshot` и `rawDomain['movers'].createMovers` (паттерн как existing `rawDomain['landing-stats'].createLandingStats`)

## Метод верификации

Тип 1 (unit logic): RED test `intelligence-wiring.test.ts` — boots wiring with stub deps, asserts:
- shape (3 services), frozen
- snapshot zero-fill returns Zod-valid PaeiSnapshot
- movers cold returns Zod-valid MarketMoversWindow
- invalid window → err

Тип 2 (acceptance): `scripts/verify_M-L11-P6.sh` — typecheck + targeted vitest GREEN + root vitest baseline + landing-app baseline preserved.

## Предусловия среды

- [x] pnpm install
- [x] pnpm typecheck clean (baseline at dev=02b867d)
- [x] Root vitest baseline GREEN (1310 tests at dev tip)
- [x] Phase 4 (`f32582d`) + Phase 5 (`d87ed61`) merged в dev (factories + handlers exist)

## Out-of-scope (correctly deferred)

- W-2 registry-list wiring → blocked on H-3 + I-3 (FA-01 territory)
- Real Postgres adapter for `AgentMetricsRepo` → FA-01 M-L1-impl
- Redis cache → optional infra milestone (in-memory stub суффициентен для P6)
- Phase 7 frontend migration → separate milestone (frontend-dev)

## Рисков и митигации

| Риск | Митигация |
|------|-----------|
| In-memory cache не survive'ит restart server | Acceptable для P6 — cache TTL 30s/60s, restart redраю стирает; production Redis приходит позже |
| Stub `aggregateAll` возвращает строго zeros — handler видит все нули | Это design — cold registry zero-fill матчит handler RED spec semantics («cold registry returns ZodPaeiSnapshot-shaped data, NOT 500») |
| Loader не подхватит новые TS factories автоматически | backend-dev должен убедиться что `intelligence-snapshot.ts` + `movers.ts` уже в `rawDomain` (они должны после P4 merge — to verify in spec env-check) |

## После merge Phase 6

Phase 7 (frontend migration) разблокирован:
- F-1: `PREVIEW_TICKER_INITIAL` → `useQuery(paxioClient.intelligence.getPaeiSnapshot)`
- F-3: `PREVIEW_MOVERS` → `useQuery(paxioClient.intelligence.getMovers)`
- F-2 (`PREVIEW_AGENTS`) НЕ разблокирован — wait'ит на W-2 + H-3 + I-3 + FA-01 M-L1-impl

После Phase 7 frontend-dev может удалить TODO M-L11 markers для ticker + movers exports в `preview.ts`.
