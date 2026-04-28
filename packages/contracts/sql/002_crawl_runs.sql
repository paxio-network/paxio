-- M-L1-launch (FA-01) — observability table for every runCrawler invocation.
--
-- One row per crawl pass. Source for:
--   - rate-limit on POST /api/admin/crawl (last run < 5 min → 429)
--   - operator dashboard (when/what/how-many)
--   - debugging (compare successive same-source runs)
--
-- Idempotency-by-design: id is server-generated uuid. We never UPSERT here,
-- always INSERT — each invocation is a distinct event in time.

CREATE TABLE IF NOT EXISTS crawl_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL CHECK (source IN ('native','erc8004','a2a','mcp','fetch-ai','virtuals')),
  started_at   TIMESTAMPTZ NOT NULL,
  finished_at  TIMESTAMPTZ NOT NULL,
  duration_ms  INTEGER NOT NULL CHECK (duration_ms >= 0),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cron','manual','startup')),
  summary      JSONB NOT NULL
);

-- Lookup pattern for rate-limit + operator dashboard:
-- "most recent run for this source"
CREATE INDEX IF NOT EXISTS idx_crawl_runs_source_started
  ON crawl_runs (source, started_at DESC);

-- Generic recency feed: "last N runs across all sources"
CREATE INDEX IF NOT EXISTS idx_crawl_runs_started
  ON crawl_runs (started_at DESC);

-- Verification block: ensure CHECK constraints reject invalid values.
-- Runs at migration time inside `psql` only (not at runtime).
DO $$
BEGIN
  -- source enum check
  BEGIN
    INSERT INTO crawl_runs (source, started_at, finished_at, duration_ms, triggered_by, summary)
    VALUES ('invalid-source', NOW(), NOW(), 0, 'manual', '{}'::jsonb);
    RAISE EXCEPTION 'CHECK on source did not reject invalid-source';
  EXCEPTION WHEN check_violation THEN
    NULL;  -- expected
  END;

  -- triggered_by enum check
  BEGIN
    INSERT INTO crawl_runs (source, started_at, finished_at, duration_ms, triggered_by, summary)
    VALUES ('mcp', NOW(), NOW(), 0, 'invalid-trigger', '{}'::jsonb);
    RAISE EXCEPTION 'CHECK on triggered_by did not reject invalid-trigger';
  EXCEPTION WHEN check_violation THEN
    NULL;  -- expected
  END;

  -- duration_ms >= 0 check
  BEGIN
    INSERT INTO crawl_runs (source, started_at, finished_at, duration_ms, triggered_by, summary)
    VALUES ('mcp', NOW(), NOW(), -1, 'manual', '{}'::jsonb);
    RAISE EXCEPTION 'CHECK on duration_ms did not reject negative';
  EXCEPTION WHEN check_violation THEN
    NULL;  -- expected
  END;

  RAISE NOTICE 'crawl_runs constraints verified';
END $$;
