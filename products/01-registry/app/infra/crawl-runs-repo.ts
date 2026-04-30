// CrawlRunsRepo — PostgreSQL implementation.
//
// Persists CrawlRun records (one per runCrawler invocation) to the
// `crawl_runs` table. Used by POST /api/admin/crawl handler for:
//   - rate-limiting (lastRunForSource < 5 min → 429)
//   - audit trail + operator dashboard
//
// Port: CrawlRunsRepo (packages/interfaces/src/crawl-runs.ts)

import { ZodCrawlRun } from '@paxio/types';
import type {
  CrawlRun,
  CrawlRunSummary,
  CrawlRunTrigger,
  CrawlerSource,
  Result,
} from '@paxio/types';
import type { CrawlRunsError } from '@paxio/interfaces';

export interface PgPool {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
}

export interface CrawlRunsRepoDeps {
  pool: PgPool;
}

/**
 * Inline migration mirrors packages/contracts/sql/002_crawl_runs.sql.
 * Source-of-truth rule: any change in the .sql file MUST be reflected here
 * (and vice-versa) in the same PR — this constant is for VM-sandbox-friendly
 * one-shot startup migration without requiring psql tooling on host.
 */
const MIGRATION_002_CRAWL_RUNS = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS crawl_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL CHECK (source IN ('native','erc8004','a2a','mcp','fetch-ai','virtuals')),
  started_at   TIMESTAMPTZ NOT NULL,
  finished_at  TIMESTAMPTZ NOT NULL,
  duration_ms  INTEGER NOT NULL CHECK (duration_ms >= 0),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cron','manual','startup')),
  summary      JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crawl_runs_source_started
  ON crawl_runs (source, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_crawl_runs_started
  ON crawl_runs (started_at DESC);
`;

/**
 * Encode CrawlRunSummary -> JSON string for PostgreSQL JSONB column.
 * PostgreSQL driver handles parameterisation; we pass the summary as a
 * JSON-encoded string so Zod can parse it back on read.
 */
const encodeSummary = (s: CrawlRunSummary): string => JSON.stringify(s);

/**
 * Decode a raw DB row (snake_case) into CrawlRun.
 * Returns null if the row fails Zod validation (defence against schema drift).
 */
const parseRow = (raw: unknown): CrawlRun | null => {
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  // Parse the JSONB summary field — may be string or already-parsed object
  let summary: CrawlRunSummary;
  try {
    const rawSummary = r.summary;
    summary =
      typeof rawSummary === 'string'
        ? JSON.parse(rawSummary)
        : (rawSummary as CrawlRunSummary);
  } catch {
    return null;
  }

  // Normalise date fields — DB may return Date objects or ISO strings
  const toIsoString = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (v instanceof Date) return v.toISOString();
    return String(v);
  };

  // Validate the full shape — safeParse can throw on malformed input
  let parsed;
  try {
    parsed = ZodCrawlRun.safeParse({
      id: r.id,
      source: r.source,
      startedAt: toIsoString(r.started_at),
      finishedAt: toIsoString(r.finished_at),
      durationMs:
        typeof r.duration_ms === 'number'
          ? r.duration_ms
          : typeof r.duration_ms === 'string'
            ? Number(r.duration_ms)
            : -1,
      triggeredBy: r.triggered_by,
      summary,
    });
  } catch {
    return null;
  }

  return parsed.success ? parsed.data : null;
};

/**
 * Factory — creates a CrawlRunsRepo bound to the provided PgPool.
 * The pool is injected so tests can use a fake; production wiring uses
 * the real pg Pool instance from infrastructure.
 */
/**
 * Run the crawl_runs migration once. Idempotent. Composition root calls
 * this BEFORE createCrawlRunsRepo so the factory stays sync (existing
 * tests call it synchronously and we keep TESTS SACRED).
 */
export const runCrawlRunsMigration = async (pool: PgPool): Promise<void> => {
  try {
    await pool.query(MIGRATION_002_CRAWL_RUNS);
  } catch (e) {
    throw new Error(
      `crawl-runs-repo: migration 002_crawl_runs failed: ${(e as Error).message}`,
    );
  }
};

export const createCrawlRunsRepo = (deps: CrawlRunsRepoDeps) => {
  const { pool } = deps;

  const recordRun = async (input: {
    source: CrawlerSource;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    triggeredBy: CrawlRunTrigger;
    summary: CrawlRunSummary;
  }): Promise<Result<{ id: string }, CrawlRunsError>> => {
    const summaryJson = encodeSummary(input.summary);
    // $1=source $2=started_at $3=finished_at $4=duration_ms $5=triggered_by $6=summary
    const text =
      'INSERT INTO crawl_runs (source, started_at, finished_at, duration_ms, triggered_by, summary) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
    const values = [
      input.source,
      input.startedAt,
      input.finishedAt,
      input.durationMs,
      input.triggeredBy,
      summaryJson,
    ];
    try {
      const res = await pool.query(text, values);
      const row = res.rows[0] as { id: string } | undefined;
      if (!row) {
        return {
          ok: false,
          error: { code: 'db_unavailable', message: 'no RETURNING row' },
        };
      }
      return { ok: true, value: { id: row.id } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: { code: 'db_unavailable', message: msg } };
    }
  };

  const lastRunForSource = async (
    source: CrawlerSource,
  ): Promise<Result<CrawlRun | null, CrawlRunsError>> => {
    const text =
      'SELECT id, source, started_at, finished_at, duration_ms, triggered_by, summary FROM crawl_runs WHERE source = $1 ORDER BY started_at DESC LIMIT 1';
    try {
      const res = await pool.query(text, [source]);
      if (res.rows.length === 0) return { ok: true, value: null };
      const parsed = parseRow(res.rows[0]);
      return { ok: true, value: parsed };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: { code: 'db_unavailable', message: msg } };
    }
  };

  return Object.freeze({ recordRun, lastRunForSource });
};