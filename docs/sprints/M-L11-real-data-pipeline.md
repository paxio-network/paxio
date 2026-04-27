# M-L11 — Real Data Pipeline (B5 Landing → Real Backend)

**Тип**: Backend major feature (composite of FA-01 + FA-07).
**Статус**: 🟢 ACTIVE — contracts phase в работе (этот PR)
**Branch (contracts)**: `feature/M-L1T4-M-L11-specs`
**FA**: FA-01 (Universal Registry — list endpoint) + FA-07 (Intelligence — PAEI snapshot, movers)
**Зависимости**:
- M-L1-launch T-3 (PR #43, awaits reviewer Phase N) — wireRegistryDomain wiring
- M-L1-launch T-4 (cron scheduler) — populate DB autonomously
- M-L1-expansion (real adapters: erc8004, a2a, fetch-ai, virtuals) — multi-source data
- M-L10 P1 (B5 foundation — merged) — preview.ts placeholders awaiting these endpoints

---

## Цель

Заменить simulated `app/data/preview.ts` exports в landing app на реальные backend
endpoints. Когда все три миграции land'ят:
- `data-production` flip с `"false"` на `"true"`
- `<PreviewRibbon>` удаляется
- Landing работает на 100% real data

3 endpoints:
1. `GET /api/intelligence/paei/snapshot` → `PaeiSnapshot` (FA-07)
2. `GET /api/registry/list?source=...&sort=vol24` → `AgentListPage` (FA-01)
3. `GET /api/intelligence/movers?window=24h` → `MarketMoversWindow` (FA-07)

## Готово когда (этот PR — contracts only)

1. `packages/types/src/cron-scheduler.ts` — `ZodCronTickConfig` + `SchedulerTickDecision` ADT
2. `packages/types/src/intelligence.ts` — `ZodPaeiSnapshot` + `ZodAgentListItem` + `ZodAgentListQuery` + `ZodAgentListPage` + `ZodMarketMoversWindow` + `ZodMoverWindow` + `ZodAgentVerificationTier` + `ZodAgentWalletStatus`
3. `packages/interfaces/src/cron-scheduler.ts` — `CronScheduler` port
4. `packages/interfaces/src/intelligence.ts` — `IntelligenceSnapshot` + `RegistryList` + `Movers` ports
5. Both barrels (`@paxio/types`, `@paxio/interfaces`) re-export new modules
6. RED tests:
   - `tests/intelligence-contracts.test.ts` — 19 tests Zod schema validation
   - `products/01-registry/tests/cron-scheduler.test.ts` — 19 tests scheduler factory (vacuous-skip)
   - `products/07-intelligence/tests/intelligence-handlers.test.ts` — 13 tests handler shapes (vacuous-skip)
7. `scripts/verify_M-L11.sh` — idempotent acceptance verifying contracts + RED specs
8. Этот milestone doc

## Декомпозиция (28 задач — 7 phases)

### Phase 1 — Contracts (architect-only, ЭТОТ PR)

| # | Task | Verification |
|---|------|--------------|
| C-1 | `cron-scheduler.ts` types + interface | typecheck clean |
| C-2 | `intelligence.ts` types (3 shapes + 5 enums) | typecheck clean + 19 Zod tests GREEN |
| C-3 | T-4 scheduler factory RED specs (19 tests, vacuous-skip) | tests file present, GREEN against missing impl |
| C-4 | M-L11 handler RED specs (13 tests, vacuous-skip) | tests file present, GREEN against missing impl |
| C-5 | Milestone doc + acceptance script | verify_M-L11.sh PASS=N FAIL=0 |

### Phase 2 — T-4 Cron Scheduler impl (registry-dev, follow-up PR)

| # | Task | Verification |
|---|------|--------------|
| T4-1 | `products/01-registry/app/domain/cron-scheduler.ts` — factory implementing `CronScheduler` port | T-4 tests GREEN (19/19) |
| T4-2 | `apps/back/server/wiring/01-registry.cjs` — wire scheduler с inject'ом adapters/crawler/crawlRuns/clock/logger | server starts → scheduler.start() OK |
| T4-3 | `apps/back/server/main.cjs` — call `cronScheduler.start()` after wiring + register graceful shutdown | server logs "cron scheduler started: 6 sources, 60s tick" |

### Phase 3 — Reputation persistence (registry-dev, прерывистый)

| # | Task |
|---|------|
| R-1 | DB migration `002_agent_metrics.sql` — table per-agent: vol24, success_rate, uptime_pct, p50, guard24, drift_hours_ago, rep_score, rep_d24, last_aggregated |
| R-2 | `agent_metrics` upsert path в `runCrawler` после successful upsert agent_card |
| R-3 | Cron job (sub-task of T-4 либо separate) — каждые 5 min пересчитывает aggregate metrics из crawl_runs + transaction_log |

### Phase 4 — Intelligence domain (backend-dev, separate PR)

| # | Task | Verification |
|---|------|--------------|
| I-1 | `products/07-intelligence/app/domain/intelligence-snapshot.ts` — implements `IntelligenceSnapshot` port. SQL aggregate over agent_metrics. Cache 30s in Redis. | M-L11 PAEI handler tests GREEN |
| I-2 | `products/07-intelligence/app/domain/movers.ts` — implements `Movers` port. SQL window-aggregate (rep_d delta), top-5 each side. Cache 60s. | M-L11 movers handler tests GREEN |
| I-3 | `products/01-registry/app/domain/registry-list.ts` (либо extend search.ts) — implements `RegistryList` port. Cursor-based pagination. | M-L11 list handler tests GREEN |

### Phase 5 — API handlers (backend-dev)

| # | Task | Files |
|---|------|-------|
| H-1 | `products/07-intelligence/app/api/intelligence-paei.js` — `GET /api/intelligence/paei/snapshot` | handler IIFE format |
| H-2 | `products/07-intelligence/app/api/intelligence-movers.js` — `GET /api/intelligence/movers?window=` | handler IIFE format |
| H-3 | `products/01-registry/app/api/registry-list.js` — `GET /api/registry/list?source=...` | handler IIFE format |

### Phase 6 — Composition root (backend-dev)

| # | Task |
|---|------|
| W-1 | `apps/back/server/wiring/07-intelligence.cjs` extended с `intelligence` + `movers` factories injected в sandbox.domain |
| W-2 | `apps/back/server/wiring/01-registry.cjs` extended с `registryList` factory injected |
| W-3 | smoke test: hit `/api/intelligence/paei/snapshot`, `/api/intelligence/movers`, `/api/registry/list` против local server → 200 + valid Zod parse |

### Phase 7 — Frontend migration (frontend-dev)

| # | Task | Files |
|---|------|-------|
| F-1 | `apps/frontend/landing/app/data/preview.ts::PREVIEW_TICKER_INITIAL` → `useQuery(paxioClient.intelligence.getPaeiSnapshot)` | TODO marker removed for ticker |
| F-2 | `app/data/preview.ts::PREVIEW_AGENTS` → `useQuery(paxioClient.registry.list)` paginated | TODO marker removed for agents |
| F-3 | `app/data/preview.ts::PREVIEW_MOVERS` → `useQuery(paxioClient.intelligence.getMovers)` | TODO marker removed for movers |
| F-4 | When ALL TODO markers gone → `app/layout.tsx` flip `data-production="true"` + remove `<PreviewRibbon/>` | drift-guard test confirms ribbon absent |

### Phase 8 — Production deploy (user gate)

| # | Task |
|---|------|
| D-1 | `dev → main` PR (after all phases) → user OK → `gh pr merge` |
| D-2 | `deploy-backend.yml` runs → Docker → ghcr.io → SSH Hetzner → healthcheck |
| D-3 | Cron scheduler triggered → ~30 min DB populated с agents → landing serves real numbers |
| D-4 | Frontend Vercel auto-deploy → paxio.network shows full real data, no ribbon |

## Метод верификации

**Phase 1 (этот PR — contracts):**
- `pnpm exec vitest run tests/intelligence-contracts.test.ts` 19 GREEN
- `pnpm exec vitest run products/01-registry/tests/cron-scheduler.test.ts` 19 vacuous-skip
- `pnpm exec vitest run products/07-intelligence/tests/intelligence-handlers.test.ts` 13 vacuous-skip
- `bash scripts/verify_M-L11.sh` PASS=N FAIL=0

**Phase 2-7 (impl follow-up PRs):**
- Each phase = свой milestone-под (M-L11.2 scheduler, M-L11.4 intelligence, …) с RED specs от architect
- Phase 7 = frontend-dev migrates preview.ts exports один за другим
- Phase 8 = production deploy цепочкой dev → main

## Архитектурные требования (Phase 1 — этот PR)

- Все contract files в architect zone (`packages/types/`, `packages/interfaces/`,
  `tests/`, `products/*/tests/`, `scripts/`, `docs/sprints/`)
- НЕТ изменений в `apps/`, `products/*/app/`, `packages/{ui,hooks,api-client,auth,utils}/`
- НЕТ зависимостей: ни `package.json`, ни `pnpm-lock.yaml`
- TESTS SACRED — все 3 test files NEW; existing tests НЕ modified
- AppError hierarchy: `IntelligenceError` 4-variant DU (data_unavailable, invalid_window,
  invalid_query, internal). Handlers throw `errors.ValidationError` / `errors.InternalError`
  на boundary
- Zod validation на каждом public boundary
- Multi-tenant: ВСЕ 3 endpoints — публичные (registry browsing + intel free tier — B4
  exception в scope-guard.md::Public exceptions)

## Анти-цели (Phase 1)

- НЕ начинать impl scheduler/intelligence/handlers — это Phase 2-7
- НЕ модифицировать M-L9 / M-L10 frontend — preview.ts migration в Phase 7
- НЕ трогать `apps/back/server/main.cjs` — wiring в Phase 6
- НЕ создавать Redis cache module сейчас — это в Phase 4 (I-1)

## Predusловия среды

- pnpm install clean
- pnpm typecheck clean
- vitest baseline GREEN
- M-L1-launch T-3 (PR #43) ИЛИ ещё OPEN — этот PR не блокирует frontend, оба progress в parallel
- M-L10 frontend (frontend-dev's `/tmp/paxio-ml10-impl`) — параллельная работа, не конфликт

## Рисков и митигации

| Риск | Митигация |
|------|-----------|
| Зависимость от M-L1-launch T-4 (scheduler) для real data — если не impl'ится timely | Frontend остаётся на preview.ts с simulated, ribbon discloses, миграция Phase 7 incremental |
| Reputation canister (FA-09) ещё не impl'ится → repD синтетический | Phase 3 R-3 пересчитывает rep_d из transaction_log + agent_metrics локально, Reputation canister Phase 4+ |
| Cursor-based pagination сложнее offset — frontend нужно тестировать | RED tests M-L11 проверяют empty page + cursor=null. Реальные cursor encoding (base64-encoded `(sort_key, id)` tuple) — Phase 4 задача |
| 3 endpoints + cron + reputation = много impl work | Phases independent: scheduler можно ship'нуть без intelligence; intelligence без movers; etc. |

## Acceptance criteria (для reviewer Phase 0)

- [ ] All 8 «Готово когда» имеют конкретный test или acceptance check
- [ ] Phase 1 RED specs покрывают all phases T-4 + I-1/I-2/I-3 + H-1/H-2/H-3
- [ ] Все contract files architect zone (нет touches в `apps/`, `products/*/app/`)
- [ ] Acceptance script idempotent (2× прогон без manual cleanup)
- [ ] No package.json / pnpm-lock.yaml diff

## Связанные TD

- TD-30 hook (architect-as-frontend-dev) — этот milestone строго architect-only
- M-L10 P1 (B5 foundation) — этот milestone defines endpoints which preview.ts будет
  consume в Phase 7

## После merge Phase 1

Architect открывает дочерние milestones:
- **M-L11.2** — T-4 cron scheduler impl (registry-dev) — promt для user'а готовлю отдельно
- **M-L11.3** — agent_metrics persistence (registry-dev)
- **M-L11.4** — Intelligence + Movers + RegistryList domain (backend-dev)
- **M-L11.5** — 3 handlers + composition root (backend-dev)
- **M-L11.6** — frontend preview.ts migration (frontend-dev)

Каждое idle. Когда все 5 land'ят + production deploy → paxio.network на 100% real data.
