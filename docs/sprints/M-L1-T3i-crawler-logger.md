# M-L1-T3i — admin-crawl handler injects logger into runCrawler

**Status:** RED → GREEN
**Owner:** registry-dev
**Branch:** `feature/M-L1-T3i-crawler-logger`

## Why

Production diagnosis 2026-05-07: fetch-ai pipeline took 8 PRs to fix because
`admin-crawl.js` calls `runCrawler` WITHOUT passing a logger. crawler.ts:
```ts
const logger = deps.logger ?? noopLogger;
```
noopLogger swallows `logger.warn('crawler_storage_error', ...)`. Result:
9226 silent storageErrors with **zero** diagnostics in `docker logs`.

This PR injects sandbox `console` (Pino) as crawler logger so future bugs
surface in container logs (level=warn) instead of dying silently.

**Argument order mismatch:** Pino uses `console.warn(ctx, msg)`,
CrawlerLogger interface uses `warn(msg, ctx)`. Wrapper swaps args.

## Готово когда

1. `products/01-registry/tests/admin-crawl-handler.test.ts` — T-3i test GREEN.
2. typecheck clean, baseline GREEN.
3. Production smoke (post-merge): trigger fetch-ai crawl with a known-bad
   record → `docker logs paxio-backend | grep crawler_storage_error` shows
   structured warn entry.

## Slim spec for registry-dev session

```
You are registry-dev. Task: inject sandbox console into runCrawler so
crawler-internal warnings (storage_error/parse_error/source_threw) are
visible in container logs.

Setup:
  cd /home/nous/paxio
  mkdir -p /home/nous/paxio-worktrees
  git worktree add /home/nous/paxio-worktrees/rd-t3i -B feature/M-L1-T3i-crawler-logger origin/feature/M-L1-T3i-crawler-logger
  cd /home/nous/paxio-worktrees/rd-t3i
  git config user.name registry-dev
  git config user.email registry-dev@paxio.network
  pnpm install

Read ONLY (2 files):
  products/01-registry/tests/admin-crawl-handler.test.ts   (RED spec, T-3i test)
  products/01-registry/app/api/admin-crawl.js              (file to modify)

Implement:
  В admin-crawl.js найди вызов:
    const summary = await reg.crawler.runCrawler({
      adapter: srcAdapter,
      storage: reg.agentStorage,
      maxRecords: 50000,
    });

  Замени на:
    const summary = await reg.crawler.runCrawler({
      adapter: srcAdapter,
      storage: reg.agentStorage,
      maxRecords: 50000,
      // M-L1-T3i: wrap sandbox console (Pino: ctx-first) to match
      // CrawlerLogger contract (msg-first, ctx-second).
      logger: {
        info: (msg, ctx) => console.info(ctx ?? {}, msg),
        warn: (msg, ctx) => console.warn(ctx ?? {}, msg),
      },
    });

DO NOT touch:
  - tests/* (architect-owned, except products/01-registry/tests/ which is
    YOUR FA-01 zone — but architect already wrote T-3i test)
  - other files

Verify (3 commands):
  pnpm typecheck
  pnpm exec vitest run products/01-registry/tests/admin-crawl-handler.test.ts   # 10/10 GREEN
  pnpm exec vitest run                                                            # full baseline

Commit:
  feat(M-L1-T3i): inject sandbox logger into runCrawler

  admin-crawl.js previously called runCrawler without `logger` dep, so
  crawler.ts fell back to noopLogger — swallowed all warn-level events.
  Production fetch-ai pipeline took 8 PRs because storage errors were
  invisible in docker logs. This commit binds sandbox `console` (Pino)
  as logger, wrapped to match CrawlerLogger contract (msg-first arg
  order vs Pino's ctx-first).

  10/10 admin-crawl-handler tests GREEN.

Push (TD-dev-push policy):
  git push origin feature/M-L1-T3i-crawler-logger

Reply «готово» + commit sha + verification.

Skills доступны on-demand: (none beyond registry-dev's always-on allowlist).
```
