// CrawlRunsRepo — PostgreSQL implementation.
//
// Persists CrawlRun records (one per runCrawler invocation) to the
// `crawl_runs` table. Used by POST /api/admin/crawl handler for:
//   - rate-limiting (lastRunForSource < 5 min → 429)
//   - audit trail + operator dashboard
//
// Port: CrawlRunsRepo (packages/interfaces/src/crawl-runs.js)

import { ZodCrawlRun } from '@paxio/types';
import type {
  CrawlRun,
  CrawlRunSummary,
  CrawlRunsError,
  CrawlRunTrigger,
  CrawlerSource,
  Result,
} from '@paxio/types';

export interface PgPool {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
}

export interface CrawlRunsRepoDeps {
  pool: PgPool;
}

/**
 * Encode CrawlRunSummary -> JSON string for PostgreSQL JSONB column.
 * PostgreSQL driver handles parameterisation; we pass the summary as a
 * JSON-encoded string so Zod can parse it back on read.
 */
const encodeSummary = (s: CrawlRunSummary): string =>
  JSON.stringify(s);

/**
 * Decode a raw DB row (snake_case) into CrawlRun.
 * Returns null if the row fails Zod validation (defence against schema drift).
 */
const parseRow = (raw: unknown): CrawlRun | null => {
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  // Parse the JSONB summary field back from string or object
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
  // Validate the full shape — safeParse can throw on malformed input
  let parsed;
  try {
    parsed = ZodCrawlRun.safeParse({
      id: r.id,
      source: r.source,
      startedAt:
        typeof r.started_at === 'string'
          ? r.started_at
          : new Date(r.started_at as Date).toISOString(),
      finishedAt:
        typeof r.finished_at === 'string'
          ? r.finished_at
          : new Date(r.finished_at as Date).toISOString(),
      durationMs:
        typeof r.duration_ms === 'number'
          ? r.duration_ms
          : typeof r.duration_ms === 'string'
            ? Number(r.duration_ms)
            : r.duration_ms === null
              ? -1
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
      'SELECT * FROM crawl_runs WHERE source = $1 ORDER BY started_at DESC LIMIT 1';
    try {
      const res = await pool.query(text, [source]);
      const raw = res.rows[0];
      if (!raw) return { ok: true, value: null };
      const run = parseRow(raw);
      return { ok: true, value: run };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: { code: 'db_unavailable', message: msg } };
    }
  };

  return Object.freeze({ recordRun, lastRunForSource });
};