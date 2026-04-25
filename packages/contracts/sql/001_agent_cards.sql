-- =============================================================================
-- Migration 001: agent_cards — Universal Registry persistence (M-L1)
-- =============================================================================
--
-- Replaces the in-memory `Map<Did, AgentCard>` used in M01 MVP. Sized for
-- 500K–5M rows (Fetch.ai alone contributes ~2M). Column shapes mirror the
-- Zod `AgentCard` schema in packages/types/src/agent-card.ts; any change
-- there MUST be reflected here in a follow-up migration 002_*.
--
-- Extension requirements (enable once per database, outside this migration
-- if project policy prevents CREATE EXTENSION in app migrations):
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigram indexes for name search
--   CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- if UUID generation needed later
--
-- Rollback: DROP TABLE agent_cards CASCADE;

-- -----------------------------------------------------------------------------
-- Trigger: update `updated_at` on any row mutation.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Main table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_cards (
    -- Primary identity (matches ZodDid regex: did:paxio:<network>:<id>)
    did              TEXT PRIMARY KEY,

    -- AgentCard fields
    name             TEXT        NOT NULL  CHECK (length(name) BETWEEN 1 AND 200),
    description      TEXT        CHECK (description IS NULL OR length(description) <= 1000),
    capability       TEXT        NOT NULL  CHECK (capability IN ('REGISTRY','FACILITATOR','WALLET','SECURITY','INTELLIGENCE')),
    endpoint         TEXT,
    version          TEXT        NOT NULL  DEFAULT '0.0.1',

    -- Provenance (M-L1 extension)
    source           TEXT        NOT NULL  DEFAULT 'native'
                       CHECK (source IN ('native','erc8004','a2a','mcp','fetch-ai','virtuals')),
    external_id      TEXT        CHECK (external_id IS NULL OR length(external_id) BETWEEN 1 AND 500),
    source_url       TEXT,
    crawled_at       TIMESTAMPTZ,

    -- Timestamps
    created_at       TIMESTAMPTZ NOT NULL  DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL  DEFAULT NOW(),

    -- Raw payload — full original JSON from the source (for audit / re-ingest).
    -- Stored as JSONB so we can query fields without schema migrations when
    -- we discover new fields in external sources.
    raw_payload      JSONB
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

-- Source breakdown for landing hero + countBySource().
CREATE INDEX IF NOT EXISTS idx_agent_cards_source
    ON agent_cards (source);

-- Uniqueness + re-crawl idempotency. Partial index: only applies when both
-- columns present (native agents have externalId=NULL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_cards_source_external_id
    ON agent_cards (source, external_id)
    WHERE external_id IS NOT NULL;

-- Sort-by-reputation pattern (top-N queries): reputation column not yet
-- present in M-L1-contracts — added in a follow-up milestone. For now
-- we at least index created_at DESC for "recently registered" lists.
CREATE INDEX IF NOT EXISTS idx_agent_cards_created_at_desc
    ON agent_cards (created_at DESC);

-- Trigram index on name for LIKE '%search%' + similarity() queries. Requires
-- pg_trgm extension (see top of file).
-- Note: this index will fail to create if pg_trgm isn't enabled; ops should
-- create the extension before running this migration. Migration fails fast
-- rather than silently skipping.
CREATE INDEX IF NOT EXISTS idx_agent_cards_name_trgm
    ON agent_cards USING GIN (name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_agent_cards_updated_at ON agent_cards;
CREATE TRIGGER set_agent_cards_updated_at
    BEFORE UPDATE ON agent_cards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- -----------------------------------------------------------------------------
-- Verification (runs inline; fails migration if any invariant broken)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    -- Ensure CHECK constraints compile (cheap sanity).
    ASSERT (SELECT COUNT(*)
            FROM information_schema.check_constraints
            WHERE constraint_schema = current_schema()) >= 3,
        'expected at least 3 CHECK constraints on agent_cards';

    -- Ensure the partial unique index exists.
    ASSERT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'agent_cards'
          AND indexname = 'uq_agent_cards_source_external_id'
    ), 'partial unique index on (source, external_id) missing';
END $$;
