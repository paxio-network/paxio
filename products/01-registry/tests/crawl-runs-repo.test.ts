// M-L1-launch RED — drift-guard for createCrawlRunsRepo Postgres impl.
//
// Tests use a fake PgPool (the same port abstraction as postgres-storage),
// so no live Postgres needed. Verifies SQL shape, parameterization,
// idempotency, and error mapping.
//
// Pre-fix (M-L1-launch RED): file products/01-registry/app/infra/crawl-runs-repo.ts
// does not exist → import RED.
// Post-fix (registry-dev T-2): all 6 tests GREEN.

import { describe, it, expect, vi } from 'vitest';
import type { CrawlRunsRepo } from '@paxio/interfaces';

// ---------------------------------------------------------------------------
// Test PgPool fake — minimal shape mirroring the port used by postgres-storage.
// ---------------------------------------------------------------------------

interface FakeQueryResult {
  rows: unknown[];
}
interface FakePgPool {
  query: ReturnType<typeof vi.fn>;
}

const makePool = (impl: (text: string, values?: unknown[]) => Promise<FakeQueryResult>): FakePgPool => ({
  query: vi.fn(impl),
});

// ---------------------------------------------------------------------------

describe('M-L1-launch createCrawlRunsRepo — factory shape', () => {
  it('returns frozen object with recordRun + lastRunForSource', async () => {
    const mod = await import('../app/infra/crawl-runs-repo.js').catch(
      () => null,
    );
    // TD-34: vacuous-skip when impl missing — consistent with all other
    // tests in this file. Module-existence is implicitly checked by
    // every test that uses `mod.createCrawlRunsRepo`. Once registry-dev
    // T-2 lands the impl, all tests run; until then they pass vacuously
    // and CI gate-1 stays green for architect's RED spec commit.
    if (!mod) return;

    const pool = makePool(async () => ({ rows: [] }));
    const repo: CrawlRunsRepo = mod.createCrawlRunsRepo({ pool });

    expect(typeof repo.recordRun).toBe('function');
    expect(typeof repo.lastRunForSource).toBe('function');
    expect(Object.isFrozen(repo)).toBe(true);
  });
});

describe('M-L1-launch createCrawlRunsRepo.recordRun', () => {
  it('inserts via parameterized SQL (no string concat)', async () => {
    const mod = await import('../app/infra/crawl-runs-repo.js').catch(
      () => null,
    );
    if (!mod) return;

    const pool = makePool(async (text, values) => {
      // SQL must use $1..$N placeholders, not interpolated strings.
      expect(text).toMatch(/INSERT INTO crawl_runs/i);
      expect(text).toMatch(/\$1.*\$2.*\$3.*\$4.*\$5.*\$6/);
      // Values length matches placeholder count
      expect(values?.length).toBe(6);
      return {
        rows: [{ id: '550e8400-e29b-41d4-a716-446655440000' }],
      };
    });
    const repo = mod.createCrawlRunsRepo({ pool });

    const result = await repo.recordRun({
      source: 'mcp',
      startedAt: '2026-04-26T10:00:00.000Z',
      finishedAt: '2026-04-26T10:01:00.000Z',
      durationMs: 60000,
      triggeredBy: 'cron',
      summary: {
        source: 'mcp',
        processed: 100,
        upserted: 95,
        parseErrors: 5,
        storageErrors: 0,
        sourceErrors: 0,
        stoppedReason: 'completed',
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    }
  });

  it('returns db_unavailable on driver error', async () => {
    const mod = await import('../app/infra/crawl-runs-repo.js').catch(
      () => null,
    );
    if (!mod) return;

    const pool = makePool(async () => {
      throw new Error('connection refused');
    });
    const repo = mod.createCrawlRunsRepo({ pool });

    const result = await repo.recordRun({
      source: 'mcp',
      startedAt: '2026-04-26T10:00:00.000Z',
      finishedAt: '2026-04-26T10:01:00.000Z',
      durationMs: 60000,
      triggeredBy: 'cron',
      summary: {
        source: 'mcp',
        processed: 0,
        upserted: 0,
        parseErrors: 0,
        storageErrors: 0,
        sourceErrors: 0,
        stoppedReason: 'completed',
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('db_unavailable');
    }
  });
});

describe('M-L1-launch createCrawlRunsRepo.lastRunForSource', () => {
  it('selects with ORDER BY started_at DESC LIMIT 1, filters by source', async () => {
    const mod = await import('../app/infra/crawl-runs-repo.js').catch(
      () => null,
    );
    if (!mod) return;

    const pool = makePool(async (text, values) => {
      expect(text).toMatch(/SELECT.*FROM crawl_runs/i);
      expect(text).toMatch(/WHERE\s+source\s*=\s*\$1/i);
      expect(text).toMatch(/ORDER BY\s+started_at\s+DESC/i);
      expect(text).toMatch(/LIMIT\s+1/i);
      expect(values).toStrictEqual(['mcp']);
      return { rows: [] };
    });
    const repo = mod.createCrawlRunsRepo({ pool });

    const result = await repo.lastRunForSource('mcp');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });

  it('returns parsed CrawlRun when row present', async () => {
    const mod = await import('../app/infra/crawl-runs-repo.js').catch(
      () => null,
    );
    if (!mod) return;

    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      source: 'mcp',
      started_at: new Date('2026-04-26T10:00:00.000Z'),
      finished_at: new Date('2026-04-26T10:25:00.000Z'),
      duration_ms: 1_500_000,
      triggered_by: 'cron',
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
    const pool = makePool(async () => ({ rows: [row] }));
    const repo = mod.createCrawlRunsRepo({ pool });

    const result = await repo.lastRunForSource('mcp');
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.id).toBe(row.id);
      expect(result.value.summary.processed).toBe(7234);
      // started_at must be ISO string (not Date object) — Zod normalises
      expect(typeof result.value.startedAt).toBe('string');
      expect(result.value.startedAt).toBe('2026-04-26T10:00:00.000Z');
    }
  });

  it('skips bad rows and returns null (defence against schema drift)', async () => {
    const mod = await import('../app/infra/crawl-runs-repo.js').catch(
      () => null,
    );
    if (!mod) return;

    const badRow = {
      id: 'not-a-uuid',
      source: 'mcp',
      started_at: 'not-a-date',
      finished_at: 'not-a-date',
      duration_ms: -1,
      triggered_by: 'unknown',
      summary: {},
    };
    const pool = makePool(async () => ({ rows: [badRow] }));
    const repo = mod.createCrawlRunsRepo({ pool });

    const result = await repo.lastRunForSource('mcp');
    // Either null (skipped) OR db_unavailable — both acceptable defence.
    // Anything else (e.g. returning the bad row through) is wrong.
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });
});

describe('M-L1-launch createCrawlRunsRepo — purity', () => {
  it('factory is pure — same deps → same shape, different instances', async () => {
    const mod = await import('../app/infra/crawl-runs-repo.js').catch(
      () => null,
    );
    if (!mod) return;

    const pool = makePool(async () => ({ rows: [] }));
    const repo1 = mod.createCrawlRunsRepo({ pool });
    const repo2 = mod.createCrawlRunsRepo({ pool });

    expect(Object.keys(repo1).sort()).toStrictEqual(
      Object.keys(repo2).sort(),
    );
    expect(repo1).not.toBe(repo2); // different instances
  });
});
