# M-L1-launch — Crawler Scheduler (FA-01)

> **Цель:** запустить `runCrawler({source: 'mcp'})` в продакшн так, чтобы PostgreSQL `agent_cards` начала наполняться реальными данными — endpoints `/api/landing/*` стали возвращать ненулевые числа без изменений на frontend.
>
> Pre-state: M-L1-impl MVP merged → код crawler'а готов, MCP Smithery adapter рабочий, postgres-storage готов. **Но `runCrawler` ни разу не вызывался в продакшн** — БД пустая.

## Готово когда

- `POST /api/admin/crawl?source=mcp` endpoint работает, вызывает `runCrawler({source:'mcp', maxRecords:5000})`, возвращает `CrawlerSummary` JSON, защищён `ADMIN_TOKEN` env (Bearer header)
- `crawl_runs` таблица в PostgreSQL: каждый запуск пишет строку с timestamp/source/summary/duration_ms/triggered_by — observability и rate-limit базис
- Cron job на Hetzner host (или GitHub Actions scheduled workflow) вызывает endpoint каждые **6 часов** через `curl https://api.paxio.network/api/admin/crawl?source=mcp -H "Authorization: Bearer $ADMIN_TOKEN"`
- После первого успешного crawl (~10-30 мин на ~7K MCP servers): `SELECT count(*) FROM agent_cards` > 0; `GET /api/landing/hero` возвращает `{agents: N}` где N > 0
- `bash scripts/verify_M-L1-launch.sh` PASS=N FAIL=0
- Drift-guard tests `tests/crawler-scheduler.test.ts` GREEN

## Метод верификации (Тип 1 + Тип 2)

### Тип 1: Unit / drift-guard tests

- **`products/01-registry/tests/admin-crawl-handler.test.ts`** (NEW, architect) — 8 RED тестов для `POST /api/admin/crawl` handler:
  - returns 401 без `Authorization: Bearer <token>`
  - returns 401 с неправильным token
  - returns 400 на unknown source (не из CRAWLER_SOURCES enum)
  - returns 400 на отсутствующий `?source=` параметр
  - вызывает `runCrawler` с правильным adapter (по source)
  - возвращает 200 + `CrawlerSummary` JSON shape
  - persists `crawl_runs` row через injected `crawlRunsRepo` dep
  - rate-limit: returns 429 если последний run для same source < 5 минут назад

- **`products/01-registry/tests/crawl-runs-repo.test.ts`** (NEW, architect) — 6 RED тестов для `createCrawlRunsRepo(deps)`:
  - factory returns frozen object
  - `recordRun(summary, durationMs, triggeredBy)` insert idempotent
  - `lastRunForSource(source)` returns latest by `started_at DESC` или null если никогда не запускался
  - filters by source (multi-tenant aware если когда-то добавим org_id)
  - SQL parameterized (no string concat)
  - StorageError on driver error

- **`tests/crawler-launch-contract.test.ts`** (NEW, architect) — 4 RED тестов для типов в `packages/types/src/crawl-run.ts`:
  - `ZodCrawlRun` schema валидирует success case
  - `ZodCrawlRun` rejects на неверный `triggeredBy` (must be 'cron' | 'manual' | 'startup')
  - `ZodCrawlRunSummary` round-trip parse(stringify(x)) = x
  - Date fields ISO strings, не Date objects

### Тип 2: Acceptance script `scripts/verify_M-L1-launch.sh`

10 шагов:
1. `pnpm install --frozen-lockfile`
2. `pnpm build` (TypeScript → dist)
3. SQL migration `002_crawl_runs.sql` exists и valid через `psql --dry-run`
4. Backend boot на `:3401` с `DATABASE_URL=$TEST_DB_URL ADMIN_TOKEN=test123`
5. `POST /api/admin/crawl?source=mcp` без Authorization → 401
6. `POST /api/admin/crawl?source=mcp -H "Authorization: Bearer wrong"` → 401
7. `POST /api/admin/crawl?source=invalid -H "Authorization: Bearer test123"` → 400
8. `POST /api/admin/crawl?source=mcp -H "Authorization: Bearer test123"` → 200 + JSON
9. `SELECT count(*) FROM crawl_runs WHERE source='mcp'` ≥ 1 после step 8
10. `SELECT count(*) FROM agent_cards` ≥ 1 (если MCP Smithery доступен — может skip с warning если внешний registry down)

## Зависимости

- ✅ M-L1-impl MVP merged в dev (есть `runCrawler` + MCP adapter + postgres-storage)
- ✅ M-L8 backend deploy → api.paxio.network работает
- ✅ TD-26/27 closed → handlers reach `.landing.getHero()` через VM sandbox composition root
- ⚠️ `ADMIN_TOKEN` env должен быть на Hetzner host (architect добавит в `.env.production.example`, user — в реальный `.env.production`)

## Архитектура

### Новый contract: `packages/types/src/crawl-run.ts`

```typescript
import { z } from 'zod';
import { ZodCrawlerSource, type CrawlerSource } from './crawler-source.js';

export const ZodCrawlRunTrigger = z.enum(['cron', 'manual', 'startup']);
export type CrawlRunTrigger = z.infer<typeof ZodCrawlRunTrigger>;

export const ZodCrawlRunSummary = z.object({
  source: ZodCrawlerSource,
  processed: z.number().int().nonnegative(),
  upserted: z.number().int().nonnegative(),
  parseErrors: z.number().int().nonnegative(),
  storageErrors: z.number().int().nonnegative(),
  sourceErrors: z.number().int().nonnegative(),
  stoppedReason: z.enum(['completed', 'max_records', 'source_error']),
});
export type CrawlRunSummary = z.infer<typeof ZodCrawlRunSummary>;

export const ZodCrawlRun = z.object({
  id: z.string().uuid(),
  source: ZodCrawlerSource,
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  triggeredBy: ZodCrawlRunTrigger,
  summary: ZodCrawlRunSummary,
});
export type CrawlRun = z.infer<typeof ZodCrawlRun>;
```

### Новый port: `packages/interfaces/src/crawl-runs.ts`

```typescript
import type { CrawlerSource, CrawlRun, CrawlRunSummary, CrawlRunTrigger, Result } from '@paxio/types';

export type CrawlRunsError =
  | { code: 'db_unavailable'; message: string }
  | { code: 'invalid_input'; message: string };

export interface CrawlRunsRepo {
  recordRun(input: {
    source: CrawlerSource;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    triggeredBy: CrawlRunTrigger;
    summary: CrawlRunSummary;
  }): Promise<Result<{ id: string }, CrawlRunsError>>;

  lastRunForSource(
    source: CrawlerSource,
  ): Promise<Result<CrawlRun | null, CrawlRunsError>>;
}
```

### SQL migration: `packages/contracts/sql/002_crawl_runs.sql`

```sql
CREATE TABLE IF NOT EXISTS crawl_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL CHECK (source IN ('native','erc8004','a2a','mcp','fetch-ai','virtuals')),
  started_at   TIMESTAMPTZ NOT NULL,
  finished_at  TIMESTAMPTZ NOT NULL,
  duration_ms  INTEGER NOT NULL CHECK (duration_ms >= 0),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cron','manual','startup')),
  summary      JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crawl_runs_source_started ON crawl_runs (source, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_runs_started ON crawl_runs (started_at DESC);
```

### API handler: `products/01-registry/app/api/admin-crawl.js`

```javascript
({
  httpMethod: 'POST',
  path: '/api/admin/crawl',
  method: async ({ query, headers }) => {
    // 1. Auth via Bearer ADMIN_TOKEN
    const auth = headers?.authorization ?? '';
    const expected = `Bearer ${config.admin.token}`;
    if (!auth || auth !== expected) {
      throw new errors.AuthError('admin token required');
    }

    // 2. Validate source
    const source = query?.source;
    if (!source || !CRAWLER_SOURCES.includes(source)) {
      throw new errors.ValidationError(`unknown source: ${source}`);
    }

    // 3. Rate-limit: last run for same source must be ≥ 5 min ago
    const last = await domain.crawlRuns.lastRunForSource(source);
    if (last.ok && last.value) {
      const ageMs = clock() - new Date(last.value.startedAt).getTime();
      if (ageMs < 5 * 60 * 1000) {
        return {
          _statusCode: 429,
          data: { error: 'rate_limited', retry_after_ms: 5*60*1000 - ageMs },
        };
      }
    }

    // 4. Pick adapter by source
    const adapter = domain.crawlerAdapters[source];
    if (!adapter) {
      throw new errors.InternalError(`no adapter for source: ${source}`);
    }

    // 5. Run + record
    const startedAt = new Date(clock()).toISOString();
    const startTs = clock();
    const summary = await domain.crawler.runCrawler({
      adapter,
      storage: domain.agentStorage,
      maxRecords: 5000,
    });
    const finishedAt = new Date(clock()).toISOString();
    const durationMs = clock() - startTs;

    await domain.crawlRuns.recordRun({
      source,
      startedAt,
      finishedAt,
      durationMs,
      triggeredBy: 'manual',  // cron passes ?triggeredBy=cron in body
      summary,
    });

    return { data: { summary, durationMs } };
  },
})
```

### Cron / GitHub Actions trigger

**Option A** (recommended): GitHub Actions scheduled workflow `.github/workflows/scheduled-crawl.yml`:
```yaml
on:
  schedule:
    - cron: '0 */6 * * *'  # every 6 hours
jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sf -X POST \
            "https://api.paxio.network/api/admin/crawl?source=mcp" \
            -H "Authorization: Bearer ${{ secrets.ADMIN_TOKEN }}"
```

**Option B**: cron на Hetzner host. Backend-dev выбирает исходя из ops простоты — рекомендую A (нет SSH-управления cron).

## Tasks

| # | Кто | Что | Где | Verification | Architecture Requirements |
|---|-----|-----|-----|-----|---|
| T-1 | architect | Milestone + types + interface + RED tests + acceptance + SQL migration | этот файл, `packages/types/src/crawl-run.ts`, `packages/interfaces/src/crawl-runs.ts`, `packages/contracts/sql/002_crawl_runs.sql`, `tests/crawler-launch-contract.test.ts`, `products/01-registry/tests/{admin-crawl-handler,crawl-runs-repo}.test.ts`, `scripts/verify_M-L1-launch.sh` | this PR | Zod validation, Result<T,E>, frozen factory results |
| T-2 | registry-dev | `createCrawlRunsRepo(deps)` Postgres impl + handler `POST /api/admin/crawl` + DI wiring в `apps/back/server/wiring/01-registry.cjs` | `products/01-registry/app/{infra/crawl-runs-repo.ts, api/admin-crawl.js}` + new `apps/back/server/wiring/01-registry.cjs` | T-1 unit tests GREEN, acceptance steps 4-9 PASS | Factory `Object.freeze`, parameterized SQL, idempotent recordRun, no ORM |
| T-3 | backend-dev | `ADMIN_TOKEN` через config (`apps/back/server/main.cjs` reads `process.env.ADMIN_TOKEN`, injects через sandbox `config.admin.token`) + update `.env.production.example` | `apps/back/server/main.cjs`, `infra/paxio-prod/.env.production.example` | acceptance steps 5-7 PASS | env-only secret, no hardcode, frozen config |
| T-4 | architect | GitHub Actions scheduled workflow + secrets doc | `.github/workflows/scheduled-crawl.yml`, `docs/secrets.md` (add ADMIN_TOKEN row) | manual: workflow runs on schedule (verify on `dev` after merge) | curl with -sf flag, fail on non-200, no logging of token |

## Предусловия среды

- [x] PostgreSQL prod up на api.paxio.network
- [x] M-L1-impl MVP merged
- [x] M-L8 backend deploy GREEN
- [ ] `ADMIN_TOKEN` сгенерирован (`openssl rand -base64 32`) и записан в Hetzner `.env.production`
- [ ] GitHub Secret `ADMIN_TOKEN` создан для workflow

## Не делаем в M-L1-launch

- Realtime crawl progress streaming (WebSocket) — только sync HTTP в этом milestone
- Multiple sources одновременно — только `?source=mcp` (расширение в M-L1-expansion)
- Per-tenant crawling (multi-tenant) — registry публичный, agent_cards общие
- Web UI для admin trigger — раз в 6 часов cron, manual через curl

## Tech debt expected

- TD candidate: `ADMIN_TOKEN` вращение (rotation policy) — пока статичный, ротация ручная
- TD candidate: Smithery API rate-limit handling если возвращает 429 на каждый pageSize=100 — реализовано в `mcp.ts`, но прод-тест может выявить timing issues
- TD candidate: cron run может перекрыться с предыдущим (если crawl > 6h) — rate-limit на handler ловит, но без queue
