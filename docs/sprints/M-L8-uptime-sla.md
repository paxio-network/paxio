# M-L8 — Uptime / SLA p50 / FAP Throughput

**Owner:** backend-dev
**Branch:** `feature/m-l8-uptime-sla` (to be created)
**Depends on:** M01c-backend ✅, M-L4a ✅ (landing-stats + FAP skeleton готовы)
**Estimate:** 2 дня
**Status:** ⬜ READY TO START

## Зачем

Три hero-поля сейчас hardcoded к `0` в `products/07-intelligence/app/domain/landing-stats.ts::zeroHero()`:

```typescript
sla_p50: 0,       // median response latency (ms)
uptime_avg: 0,    // server uptime %
fap_throughput: 0 // FAP daily throughput (USD)
```

Для uptime + sla_p50 данные можно собрать **прямо из работающего Fastify без внешних зависимостей** — это самые простые метрики из landing hero, которые ещё zero. Они не требуют Guard, Wallet, threshold ECDSA или даже агентов в registry.

**fap_throughput** пока остаётся 0 — требует real facilitator traffic (M-L4b). Но структура сбора должна быть готова, чтобы при M-L4b подключить реальные данные.

## Готово когда:

- [ ] `packages/interfaces/src/telemetry.ts` — NEW port `Telemetry` с методами:
  - `recordRequest(ms: number): void` — вызывается middleware'ом на каждый HTTP request
  - `getUptimePct(windowMs: number): number` — % времени server был up за последние N ms (всегда ~100% пока не рестартовал, становится <100% после downtime)
  - `getP50Latency(): number` — median per-request latency в ms (из sliding window)
  - `getFapThroughput24h(): number` — USD throughput (пока всегда 0, возвращает stored counter)
- [ ] `apps/back/server/src/telemetry.cjs` — in-memory impl:
  - `bootedAt: Date` (фиксированный момент запуска)
  - ring buffer последних N=10000 latencies
  - P50 через quickselect (amortized O(N))
  - uptime — 100 * (1 - downtime_ms / windowMs); downtime_ms=0 пока canonical рестарт detection не реализован (следующий milestone)
- [ ] `apps/back/server/src/http.cjs` — `onRequest` + `onResponse` hooks вызывают `recordRequest(ms)`
- [ ] `apps/back/server/main.cjs` — инжектит `telemetry` в sandbox context
- [ ] `products/07-intelligence/app/domain/landing-stats.ts`:
  - `LandingStatsDeps.telemetry: Telemetry` добавлен как dep
  - `getHero()` вызывает `deps.telemetry.getUptimePct(24*60*60*1000)` + `.getP50Latency()` + `.getFapThroughput24h()` — заполняет `sla_p50`, `uptime_avg`, `fap_throughput`
- [ ] `tests/m-l8-telemetry.test.ts` — 15+ assertions GREEN:
  - `recordRequest(ms)` накапливает в буфер, p50 детерминистичен для фиксированного input
  - P50 на 10000 одинаковых значений = то самое значение
  - P50 на [1,2,3,4,5,6,7,8,9,10] = 5 или 6 (depends on convention; tests spec both)
  - `getUptimePct(window)` = 100.0 на fresh boot
  - `getUptimePct(window)` scales correctly для window < uptime (всегда 100)
  - `getFapThroughput24h()` = 0 по умолчанию
  - `Telemetry` factory is `Object.freeze`'d
  - `Telemetry` pure (recordRequest deterministic в пределах одного state, возвращает void)
  - ring buffer overflow behavior — после 10001 записи, первая вытеснена
  - `createLandingStats` с mock telemetry (detemirnitic returns) → hero.sla_p50 === mock return, etc.
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test -- --run` → 528+/528+ GREEN (было 513)

## Метод верификации:

- [ ] **unit test** — `pnpm test -- --run tests/m-l8-telemetry.test.ts` → GREEN
- [ ] **integration** — curl fresh server `/api/landing/hero` → `uptime_avg: 100, sla_p50: <N>ms, fap_throughput: 0`
- [ ] **acceptance** — `bash scripts/verify_m-l8_telemetry.sh` (optional — Type 2)

## Scope (backend-dev)

| File | Purpose |
|---|---|
| `apps/back/server/src/telemetry.cjs` | NEW — in-memory telemetry impl (CJS, boots at server start) |
| `apps/back/server/src/http.cjs` | onRequest/onResponse hooks call `telemetry.recordRequest(ms)` |
| `apps/back/server/main.cjs` | inject `telemetry` into VM sandbox context |
| `products/07-intelligence/app/domain/landing-stats.ts` | add `telemetry: Telemetry` to `LandingStatsDeps`, use in `getHero()` for 3 fields |

**НЕ TRONAY:**
- `packages/types/` (architect уже написал `ZodHeroState` с полями — не нужно расширять)
- `packages/interfaces/src/telemetry.ts` (architect напишет)
- `tests/m-l8-telemetry.test.ts` (architect пишет RED)

## Контракт (architect готовит перед стартом)

### `packages/interfaces/src/telemetry.ts`

```typescript
// Telemetry port — minimal contract for server-side runtime metrics.
// In-memory impl lives in apps/back/server/src/telemetry.cjs. Will be
// swapped for Prometheus/OpenTelemetry in M-L8b when those land.

export interface Telemetry {
  /** Called by Fastify onResponse hook with request duration. */
  readonly recordRequest: (latencyMs: number) => void;

  /** Fraction of `windowMs` the server has been serving requests (0..100). */
  readonly getUptimePct: (windowMs: number) => number;

  /** Median per-request latency across the sliding window. 0 if no requests. */
  readonly getP50Latency: () => number;

  /** Cumulative USD FAP throughput over last 24h. 0 until M-L4b. */
  readonly getFapThroughput24h: () => number;
}
```

### Добавить в `packages/interfaces/src/index.ts`

```typescript
export type { Telemetry } from './telemetry.js';
```

### `packages/interfaces/src/landing.ts` — extend `LandingStatsDeps`

Добавить поле `telemetry: Telemetry` в `LandingStatsDeps`.

## Архитектурные требования (enforced в тестах)

| # | Требование | Тест |
|---|---|---|
| 1 | Factory pattern — `createTelemetry()` возвращает `Object.freeze`'d impl | `is frozen` assertion |
| 2 | Pure порты — `getUptimePct`/`getP50Latency`/`getFapThroughput24h` детерминированы для фиксированного state | `same input → same output` |
| 3 | P50 корректен на диапазоне (монотонен к input, bounded к min/max) | 5 numeric assertions |
| 4 | `recordRequest` воздействует на state (но не возвращает) — state modifier | `p50 changes after recordRequest` |
| 5 | Ring buffer bounded — overflow eviction | `записать N+1, проверить первой нет` |
| 6 | Uptime fresh boot = 100% | `getUptimePct(1_000_000) === 100` |
| 7 | FAP throughput = 0 до M-L4b | `getFapThroughput24h() === 0` |
| 8 | `createLandingStats` использует telemetry в `getHero()` — inject + verify через mock | `hero.sla_p50 === mockTelemetry.getP50Latency()` |

## Commit sequence

1. **architect (сейчас)** — контракт `packages/interfaces/src/telemetry.ts` + обновление `packages/interfaces/src/landing.ts::LandingStatsDeps` + barrel export + RED тест `tests/m-l8-telemetry.test.ts`. Push on `feature/m-l8-contracts`.

2. **backend-dev** — impl в `apps/back/server/src/telemetry.cjs` + hook в http.cjs + inject в main.cjs + update landing-stats.ts. Push on `feature/m-l8-impl` (off `feature/m-l8-contracts`).

3. **test-runner** — verify GREEN.

4. **reviewer** — quality + scope.

5. **architect** — PR to dev.

## Не в M-L8 (будет M-L8b/позже)

- Prometheus/OpenTelemetry интеграция
- Distributed p50 across fleet (multi-instance)
- P99 + latency histograms
- Real downtime detection (требует durable restart log)
- FAP throughput из real facilitator (ждёт M-L4b)
- Chainlink / Bloomberg-style uptime oracles (ждёт Intelligence layer L-stage)
