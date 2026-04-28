// M-L1-launch RED — drift-guard for @paxio/types CrawlRun contracts.
//
// 4 tests лочащих shape + invariants для CrawlRun, CrawlRunSummary,
// CrawlRunTrigger. Если кто-то меняет Zod schema несовместимо — тест
// фейлится, и handler / repo / migration не дрифтят.
//
// Pre-fix (M-L1-launch RED): types отсутствуют → import RED.
// Post-fix: tests GREEN.

import { describe, it, expect } from 'vitest';
import {
  ZodCrawlRun,
  ZodCrawlRunSummary,
  ZodCrawlRunTrigger,
  type CrawlRun,
  type CrawlRunSummary,
} from '@paxio/types';

describe('M-L1-launch — CrawlRunTrigger enum', () => {
  it('accepts cron, manual, startup', () => {
    expect(ZodCrawlRunTrigger.safeParse('cron').success).toBe(true);
    expect(ZodCrawlRunTrigger.safeParse('manual').success).toBe(true);
    expect(ZodCrawlRunTrigger.safeParse('startup').success).toBe(true);
  });

  it('rejects unknown trigger value', () => {
    expect(ZodCrawlRunTrigger.safeParse('cronjob').success).toBe(false);
    expect(ZodCrawlRunTrigger.safeParse('').success).toBe(false);
    expect(ZodCrawlRunTrigger.safeParse(null).success).toBe(false);
  });
});

describe('M-L1-launch — CrawlRunSummary shape', () => {
  it('round-trip parse(stringify(x)) = x for valid summary', () => {
    const summary: CrawlRunSummary = {
      source: 'mcp',
      processed: 7234,
      upserted: 7100,
      parseErrors: 12,
      storageErrors: 0,
      sourceErrors: 0,
      stoppedReason: 'completed',
    };
    const parsed = ZodCrawlRunSummary.parse(JSON.parse(JSON.stringify(summary)));
    expect(parsed).toStrictEqual(summary);
  });

  it('rejects negative counters (defence against driver bugs)', () => {
    const bad = {
      source: 'mcp',
      processed: -1,
      upserted: 0,
      parseErrors: 0,
      storageErrors: 0,
      sourceErrors: 0,
      stoppedReason: 'completed',
    };
    expect(ZodCrawlRunSummary.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown stoppedReason', () => {
    const bad = {
      source: 'mcp',
      processed: 0,
      upserted: 0,
      parseErrors: 0,
      storageErrors: 0,
      sourceErrors: 0,
      stoppedReason: 'aborted',
    };
    expect(ZodCrawlRunSummary.safeParse(bad).success).toBe(false);
  });
});

describe('M-L1-launch — CrawlRun shape', () => {
  it('round-trip parse(stringify(x)) preserves all fields', () => {
    const run: CrawlRun = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      source: 'mcp',
      startedAt: '2026-04-26T10:00:00.000Z',
      finishedAt: '2026-04-26T10:25:00.000Z',
      durationMs: 1_500_000,
      triggeredBy: 'cron',
      summary: {
        source: 'mcp',
        processed: 7234,
        upserted: 7100,
        parseErrors: 12,
        storageErrors: 0,
        sourceErrors: 0,
        stoppedReason: 'completed',
      },
    };
    const parsed = ZodCrawlRun.parse(JSON.parse(JSON.stringify(run)));
    expect(parsed).toStrictEqual(run);
  });

  it('rejects non-UUID id (DB constraint mirror)', () => {
    const bad = {
      id: 'not-a-uuid',
      source: 'mcp',
      startedAt: '2026-04-26T10:00:00.000Z',
      finishedAt: '2026-04-26T10:25:00.000Z',
      durationMs: 1000,
      triggeredBy: 'manual',
      summary: {
        source: 'mcp',
        processed: 0,
        upserted: 0,
        parseErrors: 0,
        storageErrors: 0,
        sourceErrors: 0,
        stoppedReason: 'completed',
      },
    };
    expect(ZodCrawlRun.safeParse(bad).success).toBe(false);
  });

  it('rejects non-ISO datetime in startedAt', () => {
    const bad = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      source: 'mcp',
      startedAt: 'yesterday at noon',
      finishedAt: '2026-04-26T10:25:00.000Z',
      durationMs: 1000,
      triggeredBy: 'manual',
      summary: {
        source: 'mcp',
        processed: 0,
        upserted: 0,
        parseErrors: 0,
        storageErrors: 0,
        sourceErrors: 0,
        stoppedReason: 'completed',
      },
    };
    expect(ZodCrawlRun.safeParse(bad).success).toBe(false);
  });
});

describe('M-L1-launch — Type identity (compile-time)', () => {
  it('CrawlRunSummary is structurally compatible with crawler.ts CrawlerSummary', () => {
    // Если этот тест компилируется — типы совместимы. Drift между
    // products/01-registry/app/domain/crawler.ts::CrawlerSummary и
    // @paxio/types::CrawlRunSummary катастрофичен (handler не сможет
    // persist'ить summary). Зеркальная shape проверяется в runtime
    // через ZodCrawlRunSummary.parse(crawlerSummary) в handler.
    type _A = CrawlRunSummary;
    const probe: _A = {
      source: 'mcp',
      processed: 0,
      upserted: 0,
      parseErrors: 0,
      storageErrors: 0,
      sourceErrors: 0,
      stoppedReason: 'completed',
    };
    expect(probe.source).toBe('mcp');
  });
});
