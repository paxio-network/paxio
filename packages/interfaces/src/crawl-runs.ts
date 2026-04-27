// CrawlRunsRepo port — observability persistence for every runCrawler call.
//
// Pure interface, no I/O assumption. Implementation lives in
// products/01-registry/app/infra/crawl-runs-repo.ts (registry-dev) and
// is wired through the VM-sandbox composition root in
// apps/back/server/wiring/01-registry.cjs.

import type {
  CrawlerSource,
  CrawlRun,
  CrawlRunSummary,
  CrawlRunTrigger,
  Result,
} from '@paxio/types';

export type CrawlRunsError =
  | { code: 'db_unavailable'; message: string }
  | { code: 'invalid_input'; message: string };

export interface CrawlRunsRepo {
  /**
   * Insert a crawl_runs row. Idempotent at the DB level — generates uuid via
   * `gen_random_uuid()`, callers don't supply id.
   * Returns the new row's id on success.
   */
  recordRun(input: {
    readonly source: CrawlerSource;
    readonly startedAt: string;
    readonly finishedAt: string;
    readonly durationMs: number;
    readonly triggeredBy: CrawlRunTrigger;
    readonly summary: CrawlRunSummary;
  }): Promise<Result<{ readonly id: string }, CrawlRunsError>>;

  /**
   * Returns the most recent CrawlRun for a source, or `null` if never run.
   * Used by handler rate-limit (last run < 5 min → 429).
   * Sorted by `started_at DESC LIMIT 1` at the DB level.
   */
  lastRunForSource(
    source: CrawlerSource,
  ): Promise<Result<CrawlRun | null, CrawlRunsError>>;
}
