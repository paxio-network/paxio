// CrawlRun — observability record для каждого invocation `runCrawler`.
//
// Используется CrawlRunsRepo (port в @paxio/interfaces) и handler
// `POST /api/admin/crawl` (FA-01) чтобы persist'ить crawl history в
// PostgreSQL `crawl_runs`. Источник для:
//   - rate-limiting на handler (last run < 5 min → 429)
//   - operator dashboard (когда что crawled, сколько upserted/failed)
//   - debugging (сравнение successive runs same source)

import { z } from 'zod';
import { ZodCrawlerSource } from './crawler-source';

export const ZodCrawlRunTrigger = z.enum(['cron', 'manual', 'startup']);
export type CrawlRunTrigger = z.infer<typeof ZodCrawlRunTrigger>;

export const ZodStoppedReason = z.enum([
  'completed',
  'max_records',
  'source_error',
]);
export type StoppedReason = z.infer<typeof ZodStoppedReason>;

/**
 * Snapshot of CrawlerSummary as it landed in PostgreSQL.
 * Mirrors `CrawlerSummary` shape from products/01-registry/app/domain/crawler.ts
 * but lives in @paxio/types so it's shareable with admin handler + reposit.
 */
export const ZodCrawlRunSummary = z.object({
  source: ZodCrawlerSource,
  processed: z.number().int().nonnegative(),
  upserted: z.number().int().nonnegative(),
  parseErrors: z.number().int().nonnegative(),
  storageErrors: z.number().int().nonnegative(),
  sourceErrors: z.number().int().nonnegative(),
  stoppedReason: ZodStoppedReason,
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
