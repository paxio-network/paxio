# M01c — Landing Implementation (paxio.network)

**Owner:** frontend-dev + backend-dev
**Branch:** `feature/m01c-landing` (one branch, two agents — coordinated via path isolation)
**Depends on:** M01b ✅ (bootstrap), M01 ✅ (Registry API), M04 ✅ (Audit Log)
**Estimate:** 7–10 days

## Готово когда:
- [ ] `apps/frontend/landing/` рендерит все 7 секций из ТЗ v2.0 с pixel-parity к HTML
- [ ] Все live-data значения приходят из `/api/landing/*` через `@paxio/api-client` — **НЕТ mock в компонентах**
- [ ] `products/07-intelligence/app/domain/landing-stats.ts` реализует `LandingStats` port
- [ ] `products/07-intelligence/app/api/*.js` выставляет 6 endpoints (landing, hero, ticker, agents/top, rails, network/snapshot, heatmap)
- [ ] Early product state = real empty values (0 agents, 0 txns) — НЕ fake 2.4M
- [ ] `bash scripts/verify_m01c_landing.sh` — PASS
- [ ] Playwright / Vitest smoke: главная страница отвечает 200, все секции в DOM

## Scope

### Backend (backend-dev)

| File | Purpose |
|---|---|
| `products/07-intelligence/app/domain/landing-stats.ts` | `createLandingStats(deps)` factory → `LandingStats` port impl. Pulls real from Registry.count, Audit Log aggregate, Security threat log, FAP stats. |
| `products/07-intelligence/app/api/landing-landing.js` | GET `/api/landing/landing` → `ZodLandingPayload` |
| `products/07-intelligence/app/api/landing-hero.js` | GET `/api/landing/hero` → `ZodHeroState` |
| `products/07-intelligence/app/api/landing-ticker.js` | GET `/api/landing/ticker` → `TickerLane[]` |
| `products/07-intelligence/app/api/landing-agents-top.js` | GET `/api/landing/agents/top?limit=20` → `AgentPreview[]` |
| `products/07-intelligence/app/api/landing-rails.js` | GET `/api/landing/rails` → `RailInfo[]` |
| `products/07-intelligence/app/api/landing-network-snapshot.js` | GET `/api/landing/network/snapshot` → `NetworkSnapshot` |
| `products/07-intelligence/app/api/landing-heatmap.js` | GET `/api/landing/heatmap` → `HeatGrid` |

**Backend stores consumed** (early phase — may return empty-but-real):
- Registry: `count()`, `find({limit: 20})` for top agents
- Audit Log: aggregate count of txns in 24h window
- Security Sidecar + Audit Log: count of BLOCK/HOLD verdicts by category (heatmap)
- FAP (M50s — может быть ещё не готов): rail share. Если не готов — вернуть `{rails: []}` → frontend показывает skeleton.

**Backend не использует setInterval — frontend поллит.** Endpoints идемпотентны, кешируются в Redis на 1s для defence-in-depth.

### Frontend (frontend-dev)

Расширить `@paxio/ui` до 22 компонентов (инвентарь в `.claude/agents/frontend-dev.md`). Ключевые для landing:
- `<LiveTicker lanes={lanes} />` — 3 lanes, каждая скроллится, `useTicker()` hook делает SWR / TanStack Query с refetchInterval: 1100.
- `<AgentTable agents={agents} />` — 11 rows, сортировка, facet filters (source/category/wallet/verif).
- `<Sparkline seed={n} />` — детерминированная PRNG на base seed (24-point polyline).
- `<FAPDiagram rails={rails} />` — circular SVG 6 rail nodes + dashed edges.
- `<NetworkGraph snapshot={snap} />` — force-directed, ~50 nodes, 3s refresh via hook.
- `<TerminalWidget script={steps} />` — staged reveal 6 шагов quickstart.
- `<HeatmapGrid grid={grid} />` — 6×6 SVG cells с gradient fill.
- `<SectionFrame kicker title subtitle>{children}</SectionFrame>` — layout wrapper.

### `apps/frontend/landing/`

| File | Purpose |
|---|---|
| `app/page.tsx` | Root — compose all 7 sections, SSR initial payload via `/api/landing/landing` |
| `app/sections/01-hero.tsx` | Hero + 3-lane ticker + agent table + state strip |
| `app/sections/02-quickstart.tsx` | `<TerminalWidget>` — SDK install 6-stage reveal |
| `app/sections/02b-bitcoin.tsx` | BTC-native marketing copy (static) |
| `app/sections/03-radar.tsx` | `<HeatmapGrid>` — risk matrix |
| `app/sections/04-pay.tsx` | `<FAPDiagram>` — circular routing |
| `app/sections/05-network.tsx` | `<NetworkGraph>` — live 50-agent snapshot |
| `app/sections/06-doors.tsx` | 3 CTA cards (Builder / Enterprise / Auditor) |
| `app/layout.tsx` | Geist + JetBrains Mono, Header (from @paxio/ui), Footer |

## Real data invariant (critical)

```tsx
// ✅ CORRECT
'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';

export function LiveTicker() {
  const { data, isPending } = useQuery({
    queryKey: ['landing-ticker'],
    queryFn: () => paxioClient.landing.getTicker(),
    refetchInterval: 1100,
  });
  if (isPending) return <TickerSkeleton />;
  return <TickerLanes lanes={data} />;
}

// ❌ FORBIDDEN (fake random walk in render)
const [value, setValue] = useState(1284.7);
useEffect(() => {
  setInterval(() => setValue(v => v + (Math.random() - 0.5)), 1100);
}, []);
```

Backend endpoint может возвращать `{paei: 0, ...}` в ранней фазе продукта — это **реальное пустое состояние**. Компонент рендерит `0` или отображает skeleton на `isPending`. Никаких hardcoded миллионов.

## Tests (RED — architect пишет до dev)

### Contract-level (уже ✅ GREEN в `tests/landing-contracts.test.ts` — 41 тест)

### Behavior-level
- `products/07-intelligence/tests/landing-stats.test.ts` — RED:
  - `getHero returns zero state when Registry is empty`
  - `getHero aggregates real Registry.count + Audit Log.count_24h`
  - `getTopAgents sorts by reputation desc`
  - `getNetworkSnapshot returns {nodes:[], pairs:[], generated_at}` on empty state
  - `getHeatmap returns 6x6 zero grid when Guard has no events`
  - `upstream failures propagate as LandingError{code:'upstream_error'}`

### Frontend
- `apps/frontend/landing/tests/sections.test.tsx` — smoke: каждая секция рендерит без crash с mocked react-query client (NOT mocked data в компонентах — mocked API layer)
- `apps/frontend/landing/tests/live-ticker.test.tsx` — делает `useQuery`, fetch мокируется через MSW, lane renders

## Acceptance script

`bash scripts/verify_m01c_landing.sh`:
1. backend endpoints: 7 paths return 200 + валидный Zod shape
2. frontend build (`pnpm turbo run build --filter=@paxio/landing-app`) — clean
3. Playwright (headless): GET http://localhost:3000 returns 200, все 7 `<section>` в DOM
4. `grep -rn 'Math.random\|setInterval' apps/frontend/landing/app/` — ZERO matches (no fake live data)
5. `grep -rn 'hardcoded_value\|mock_' apps/frontend/landing/app/` — ZERO matches (no mock imports in prod code)

## Таблица задач

| # | Задача | Агент | Метод верификации | Архитектурные требования |
|---|---|---|---|---|
| 1 | LandingStats factory + port impl | backend-dev | `landing-stats.test.ts` GREEN | Factory `createLandingStats(deps)` frozen, pure domain fn, Result<T,E>, agentDid filter where applicable |
| 2 | 7 API handlers | backend-dev | contract tests pass + typecheck | VM sandbox format (backend-api-patterns.md), Zod at boundary, `throw errors.InternalError` on upstream fail |
| 3 | Redis 1s cache wrapper | backend-dev | cache hit test | Idempotent, same-input → same-output |
| 4 | `<LiveTicker>` in @paxio/ui | frontend-dev | smoke test + vitest | useQuery-based, no setInterval in component, `'use client'` only on wrapper |
| 5 | `<AgentTable>` with facets | frontend-dev | smoke test + interaction test | Zod-parsed props, no `any`, accessibility (keyboard nav, ARIA) |
| 6 | `<Sparkline>` with seeded PRNG | frontend-dev | Pure function test: same seed → same polyline | Pure `computeSparkline(seed:number):string` outside component; component thin |
| 7 | `<NetworkGraph>` SVG | frontend-dev | smoke + interaction | D3 force sim in effect, cleanup on unmount, SSR-safe |
| 8 | `<HeatmapGrid>` + `<FAPDiagram>` + `<TerminalWidget>` | frontend-dev | smoke each | Pure presentation, props only, no data fetching inside |
| 9 | 7 section components | frontend-dev | section tests + Playwright | Compose from `@paxio/ui`, inject data via props from page.tsx |
| 10 | `app/page.tsx` SSR prefetch | frontend-dev | Playwright 200 + all sections present | Server Component, uses `fetch` with `cache: 'no-store'` for live, handles loading states |

## Dependencies

- **M01** (Registry TS) — provides `GET /registry/count` и `GET /registry/find`.
- **M04** (Audit Log) — provides txn count aggregate. If M04 not merged — `getHero.txns = 0` (real empty).
- **FAP (M50s)** — provides rail share. If not ready — `getRails = []`, frontend renders skeleton (not hardcoded 67%).

## Статус

| Дата | Событие |
|---|---|
| 2026-04-22 | Contracts + Zod schemas committed (`packages/types/src/landing.ts`) — 41/41 contract tests GREEN |
| 2026-04-22 | M01c v1 backend (commit `8afaa06` от architect@4.7) **REJECTED** reviewer'ом: scope violation + globals-as-DI + composition root unwired |
| 2026-04-22 | Reverted (`ca7c943`); architect committed RED behavior spec + HARD CONSTRAINTS на feature/m01c-landing |
| 2026-04-22 | M01c v2 backend (commit `54ac343` от architect@4.6, прямо в dev) **CONDITIONAL APPROVED** reviewer'ом: scope violation повторён (TD-04 ACK), но код качественный (DI factory, Result pattern, 9/9 tests GREEN). 2 нюанса записаны: TD-05 (impure nowIso) + TD-06 (no Zod query validation). |
| 2026-04-22 | Architect написал RED тесты для TD-05 + TD-06 в `products/07-intelligence/tests/landing-td-fixes.test.ts` (8 тестов, 6 RED). |

### Готовность по разделам

| Раздел | Статус |
|---|---|
| Backend domain (`createLandingStats` factory) | ✅ partial-DONE — реализовано, 9/9 поведенческих тестов GREEN. Остаётся: TD-05 (Clock DI) + TD-06 (Zod validation) — backend-dev может зафиксить по тестам, лежащим в `landing-td-fixes.test.ts` |
| Backend 7 API handlers | ✅ partial-DONE — все 7 handlers есть, шапка корректная. TD-06 fix добавит Zod-валидацию query |
| Backend composition root (main.cjs ↔ landingStore wiring) | 🔴 NOT DONE — `loadApplication` не передаёт реальные stores. В runtime endpoints упадут на `deps.getRegistryCount is undefined`. Backend-dev должен в `apps/back/server/main.cjs` создать store-инстансы и передать в sandbox через `serverContext.landingStore` |
| Backend Redis 1s cache wrapper | 🔴 NOT DONE — задача #3 в таблице |
| Frontend bootstrap (M01b) | 🔴 NOT DONE — `apps/frontend/` пуст, `packages/{ui,hooks,api-client,auth}/` отсутствуют. Блокирует M01c frontend задачи #4–10. См. M01b RED спеки в `tests/frontend-bootstrap.test.ts` (111 RED тестов) |
| Frontend 7 sections | 🔴 NOT DONE — ждёт frontend-dev после M01b |
