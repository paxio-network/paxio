-- =============================================================================
-- Migration 004: agent_cards source enum expansion (M-L1-expansion)
-- =============================================================================
--
-- Expands the source CHECK constraint from 7 (M-L1-taxonomy) to 13 canonical
-- values + 2 legacy aliases. Each new value = independent crawler adapter
-- (see docs/sprints/M-L1-expansion.md task table).
--
-- Note: agent_cards columns остаются неизменными — миграция трогает ТОЛЬКО
-- CHECK constraint на source. New adapters (T-3..T-13) populate categories
-- in subsequent rows; backfill not required (existing 3261 records keep
-- source='mcp').
--
-- Mirror inline в `products/01-registry/app/infra/postgres-storage.ts`
-- (registry-dev impl задача T-1.5 — обновить inline migration constant).

-- ─────────────────────────────────────────────────────────────────────────
-- Drop old source CHECK
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  DROP CONSTRAINT IF EXISTS agent_cards_source_check;

-- ─────────────────────────────────────────────────────────────────────────
-- Re-add source CHECK with 13 canonical + 2 legacy values
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_source_check CHECK (
    source IN (
      -- Direct entry
      'paxio-native',
      'paxio-curated',
      -- On-chain
      'erc8004',
      'a2a',
      'bittensor',
      'virtuals',
      -- Framework hubs
      'mcp',
      'eliza',
      'langchain-hub',
      'fetch',
      -- Discovery
      'huggingface',
      'vercel-ai',
      'github-discovered',
      -- Legacy aliases (retained until cleanup migration)
      'native',
      'fetch-ai'
    )
  );

-- Same change для crawl_runs.source CHECK (mirrors agent_cards source set
-- so that crawler invocations record the source correctly).
ALTER TABLE crawl_runs
  DROP CONSTRAINT IF EXISTS crawl_runs_source_check;

ALTER TABLE crawl_runs
  ADD CONSTRAINT crawl_runs_source_check CHECK (
    source IN (
      'paxio-native',
      'paxio-curated',
      'erc8004',
      'a2a',
      'bittensor',
      'virtuals',
      'mcp',
      'eliza',
      'langchain-hub',
      'fetch',
      'huggingface',
      'vercel-ai',
      'github-discovered',
      'native',
      'fetch-ai'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- No backfill — existing rows have source='mcp' (from M-L1-launch crawler).
-- New sources only get populated when adapters land + cron tick triggers
-- their respective crawls (see M-L1-expansion task table T-2..T-13).
