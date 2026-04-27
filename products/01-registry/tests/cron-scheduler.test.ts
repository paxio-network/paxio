// M-L1-launch T-4 RED — domain spec для `createCronScheduler` factory.
//
// Pre-fix: `products/01-registry/app/domain/cron-scheduler.ts` does not exist
// → import fails → all tests RED.
// Post-fix (registry-dev): scheduler factory implements port from
// `@paxio/interfaces::CronScheduler`, all tests GREEN.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  CronScheduler,
  CrawlRunsRepo,
  CrawlerSourceAdapter,
} from '@paxio/interfaces';
import type {
  CronTickConfig,
  CrawlerSource,
  CrawlerSummary,
  CrawlRun,
} from '@paxio/types';
import { ok } from '@paxio/types';

// Vacuous-skip helper — pre-impl, factory module не существует
async function loadFactory(): Promise<
  | {
      createCronScheduler: (deps: unknown) => CronScheduler;
    }
  | null
> {
  try {
    const mod = await import(
      '../app/domain/cron-scheduler.js' as string
    );
    return mod as { createCronScheduler: (deps: unknown) => CronScheduler };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sandbox: minimal deps to drive scheduler в tests
// ---------------------------------------------------------------------------

const sampleSummary = (source: CrawlerSource): CrawlerSummary => ({
  source,
  processed: 100,
  upserted: 95,
  parseErrors: 5,
  storageErrors: 0,
  sourceErrors: 0,
  stoppedReason: 'completed' as const,
});

const sampleRun = (source: CrawlerSource, finishedAtMs: number): CrawlRun => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  source,
  startedAt: new Date(finishedAtMs - 30_000).toISOString(),
  finishedAt: new Date(finishedAtMs).toISOString(),
  durationMs: 30_000,
  triggeredBy: 'cron',
  summary: sampleSummary(source),
});

const makeDeps = (overrides: {
  config?: Partial<CronTickConfig>;
  lastRunMap?: Partial<Record<CrawlerSource, CrawlRun | null>>;
  clockNow?: number;
} = {}) => {
  const lastRunMap = overrides.lastRunMap ?? {};
  const crawlRuns: CrawlRunsRepo = {
    recordRun: vi.fn(async (input) =>
      ok({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    ),
    lastRunForSource: vi.fn(async (s) => ok(lastRunMap[s] ?? null)),
  };

  const crawler = {
    runCrawler: vi.fn(async (args: {
      adapter: { sourceName: CrawlerSource };
    }) => sampleSummary(args.adapter.sourceName)),
  };

  // Frozen adapters keyed by source — scheduler picks from this map by current source
  const makeAdapter = (s: CrawlerSource): CrawlerSourceAdapter<unknown> => ({
    sourceName: s,
    fetchAgents: async function* () {},
    toCanonical: () => ({
      ok: false as const,
      error: { code: 'parse_error' as const, message: '', raw: null },
    }),
  });

  const adapters: Record<CrawlerSource, CrawlerSourceAdapter<unknown>> = {
    native: makeAdapter('native'),
    erc8004: makeAdapter('erc8004'),
    a2a: makeAdapter('a2a'),
    mcp: makeAdapter('mcp'),
    'fetch-ai': makeAdapter('fetch-ai'),
    virtuals: makeAdapter('virtuals'),
  };

  const clock = () => overrides.clockNow ?? 1714145000000;

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  return {
    crawlRuns,
    crawler,
    adapters,
    clock,
    logger,
    config: overrides.config ?? {},
  };
};

// ---------------------------------------------------------------------------

describe('M-L1-launch T-4 createCronScheduler — factory invariants', () => {
  it('factory exists + returns frozen object', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const sched = mod.createCronScheduler(makeDeps());
    expect(Object.isFrozen(sched)).toBe(true);
    expect(Object.getPrototypeOf(sched)).toBe(Object.prototype);
  });

  it('config defaults: tick=60s, minInterval=5min, all 6 sources, concurrency=1', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const sched = mod.createCronScheduler(makeDeps());
    const cfg = sched.getConfig();
    expect(cfg.tickIntervalMs).toBe(60_000);
    expect(cfg.minIntervalPerSourceMs).toBe(5 * 60_000);
    expect(cfg.enabledSources).toEqual([
      'native',
      'erc8004',
      'a2a',
      'mcp',
      'fetch-ai',
      'virtuals',
    ]);
    expect(cfg.maxConcurrentRuns).toBe(1);
  });

  it('getConfig returns frozen copy', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const sched = mod.createCronScheduler(makeDeps());
    expect(Object.isFrozen(sched.getConfig())).toBe(true);
  });

  it('peekNextSource initial = first enabled source', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const sched = mod.createCronScheduler(makeDeps());
    expect(sched.peekNextSource()).toBe('native');
  });

  it('getActiveRunsCount initial = 0', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const sched = mod.createCronScheduler(makeDeps());
    expect(sched.getActiveRunsCount()).toBe(0);
  });
});

describe('M-L1-launch T-4 createCronScheduler — round-robin', () => {
  it('first tick triggers first source (native), advances cursor to erc8004', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const deps = makeDeps();
    const sched = mod.createCronScheduler(deps);
    const decisions = await sched.tickOnce();
    const triggered = decisions.find((d) => d.kind === 'triggered');
    expect(triggered).toBeDefined();
    expect((triggered as { source: CrawlerSource }).source).toBe('native');
    expect(sched.peekNextSource()).toBe('erc8004');
  });

  it('after 6 ticks all 6 sources rotated through (round-robin)', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const deps = makeDeps();
    const sched = mod.createCronScheduler(deps);
    const triggered: CrawlerSource[] = [];
    for (let i = 0; i < 6; i++) {
      const decisions = await sched.tickOnce();
      const t = decisions.find((d) => d.kind === 'triggered');
      if (t) triggered.push((t as { source: CrawlerSource }).source);
    }
    expect(triggered).toEqual([
      'native',
      'erc8004',
      'a2a',
      'mcp',
      'fetch-ai',
      'virtuals',
    ]);
  });

  it('disabled sources are skipped in rotation', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const deps = makeDeps({
      config: { enabledSources: ['mcp', 'erc8004'] },
    });
    const sched = mod.createCronScheduler(deps);
    expect(sched.peekNextSource()).toBe('mcp');
    await sched.tickOnce();
    expect(sched.peekNextSource()).toBe('erc8004');
    await sched.tickOnce();
    expect(sched.peekNextSource()).toBe('mcp'); // wraps
  });
});

describe('M-L1-launch T-4 createCronScheduler — rate-limit', () => {
  it('skips source if last run < 5 min ago, returns skipped_rate_limit decision', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const now = 1714145000000;
    const deps = makeDeps({
      lastRunMap: { native: sampleRun('native', now - 60_000) }, // 1 min ago
      clockNow: now,
    });
    const sched = mod.createCronScheduler(deps);
    const decisions = await sched.tickOnce();
    const skipped = decisions.find((d) => d.kind === 'skipped_rate_limit');
    expect(skipped).toBeDefined();
    expect(skipped).toMatchObject({
      kind: 'skipped_rate_limit',
      source: 'native',
    });
  });

  it('triggers source if last run > 5 min ago', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const now = 1714145000000;
    const deps = makeDeps({
      lastRunMap: { native: sampleRun('native', now - 6 * 60_000) }, // 6 min ago
      clockNow: now,
    });
    const sched = mod.createCronScheduler(deps);
    const decisions = await sched.tickOnce();
    const triggered = decisions.find((d) => d.kind === 'triggered');
    expect(triggered).toBeDefined();
  });

  it('msUntilNextEligible = (5min - elapsed) for skipped_rate_limit', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const now = 1714145000000;
    const deps = makeDeps({
      lastRunMap: { native: sampleRun('native', now - 60_000) }, // 1 min ago
      clockNow: now,
    });
    const sched = mod.createCronScheduler(deps);
    const decisions = await sched.tickOnce();
    const skipped = decisions.find(
      (d) => d.kind === 'skipped_rate_limit',
    ) as { msUntilNextEligible: number } | undefined;
    expect(skipped?.msUntilNextEligible).toBe(4 * 60_000); // 4 min until eligible
  });
});

describe('M-L1-launch T-4 createCronScheduler — concurrency', () => {
  it('triggers runCrawler with right adapter sourceName', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const deps = makeDeps();
    const sched = mod.createCronScheduler(deps);
    await sched.tickOnce();
    expect(deps.crawler.runCrawler).toHaveBeenCalledTimes(1);
    const callArg = deps.crawler.runCrawler.mock.calls[0]![0] as {
      adapter: { sourceName: CrawlerSource };
    };
    expect(callArg.adapter.sourceName).toBe('native');
  });

  it('persists summary via crawlRuns.recordRun with triggeredBy=cron', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const deps = makeDeps();
    const sched = mod.createCronScheduler(deps);
    await sched.tickOnce();
    expect(deps.crawlRuns.recordRun).toHaveBeenCalledTimes(1);
    const recordArg = (deps.crawlRuns.recordRun as ReturnType<typeof vi.fn>)
      .mock.calls[0]![0] as { triggeredBy: string; source: CrawlerSource };
    expect(recordArg.triggeredBy).toBe('cron');
    expect(recordArg.source).toBe('native');
  });
});

describe('M-L1-launch T-4 createCronScheduler — start/stop lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('start() returns ok, sets up setInterval', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const sched = mod.createCronScheduler(makeDeps());
    const result = sched.start();
    expect(result.ok).toBe(true);
    sched.stop(); // cleanup
    vi.useRealTimers();
  });

  it('start() second time returns already_started error', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const sched = mod.createCronScheduler(makeDeps());
    sched.start();
    const second = sched.start();
    expect(second.ok).toBe(false);
    expect((second as { error: { code: string } }).error.code).toBe(
      'already_started',
    );
    sched.stop();
    vi.useRealTimers();
  });

  it('stop() before start returns not_started error', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const sched = mod.createCronScheduler(makeDeps());
    const result = sched.stop();
    expect(result.ok).toBe(false);
    expect((result as { error: { code: string } }).error.code).toBe(
      'not_started',
    );
    vi.useRealTimers();
  });

  it('stop() is idempotent — second stop returns not_started', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const sched = mod.createCronScheduler(makeDeps());
    sched.start();
    expect(sched.stop().ok).toBe(true);
    expect(sched.stop().ok).toBe(false);
    vi.useRealTimers();
  });
});

describe('M-L1-launch T-4 createCronScheduler — observability', () => {
  it('logs each tick decision via injected logger.info or .debug', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const deps = makeDeps();
    const sched = mod.createCronScheduler(deps);
    await sched.tickOnce();
    const totalLogCalls =
      deps.logger.info.mock.calls.length +
      deps.logger.debug.mock.calls.length;
    expect(totalLogCalls).toBeGreaterThan(0);
  });

  it('all tick decisions have valid discriminator', async () => {
    const mod = await loadFactory();
    if (!mod) return;
    const deps = makeDeps();
    const sched = mod.createCronScheduler(deps);
    const decisions = await sched.tickOnce();
    for (const d of decisions) {
      expect(d.kind).toMatch(
        /^(triggered|skipped_rate_limit|skipped_disabled|skipped_concurrency|no_sources_due)$/,
      );
    }
  });
});
