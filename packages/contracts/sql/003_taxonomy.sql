-- =============================================================================
-- Migration 003: agent_cards taxonomy refactor (M-L1-taxonomy)
-- =============================================================================
--
-- Replaces single Paxio-layer `capability` enum with domain-based `category`
-- (11 values, single criterion) + free-form `capabilities[]` tags.
--
-- Adds 9 attribute groups covering full agentic ecosystem:
--   Identification (claimed, owner, updated_at)
--   Capabilities  (category, capabilities[], input_types, output_types, languages, framework)
--   Wallet         (status, addresses, verified)
--   Payment        (accepts[], preferred, facilitator, facilitator_verified, pricing)
--   SLA            (p50_ms, p95_ms, p99_ms, uptime_30d, last_checked)
--   Reputation     (score, tx_count, delivery_rate, dispute_rate)
--   Security       (owasp_score, badge_level, last_scanned, guard_connected, guard_incidents_30d)
--   Compliance     (eu_ai_act, owasp_cert, iso42001, kya_cert, data_handling)
--   Ecosystem      (network, chain_id, erc8004_token_id, open_source, compatible_clients)
--   Developer      (name, verified, url)
--
-- Source enum changes: rename 'native' → 'paxio-native', 'fetch-ai' → 'fetch';
-- add 'eliza' (ElizaOS framework agents). Old values backfilled, new CHECK
-- constraint replaces old.
--
-- Existing 3230 rows: backfilled `category='AI & ML'` (default for MCP tool
-- servers — registry-dev session can refine via inferCapability per-source).
-- All other new fields = NULL until their owners populate.
--
-- Mirror constant `MIGRATION_003_TAXONOMY` lives in
-- `products/01-registry/app/infra/postgres-storage.ts` (registry-dev impl
-- task). Source-of-truth here; same SQL inline there for VM-sandbox-friendly
-- startup migration.

-- ─────────────────────────────────────────────────────────────────────────
-- Step 1 — drop old `capability` and `source` CHECK constraints
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  DROP CONSTRAINT IF EXISTS agent_cards_capability_check;

ALTER TABLE agent_cards
  DROP CONSTRAINT IF EXISTS agent_cards_source_check;

-- ─────────────────────────────────────────────────────────────────────────
-- Step 2 — backfill source enum (legacy → canonical)
-- ─────────────────────────────────────────────────────────────────────────

UPDATE agent_cards SET source = 'paxio-native' WHERE source = 'native';
UPDATE agent_cards SET source = 'fetch'        WHERE source = 'fetch-ai';

-- ─────────────────────────────────────────────────────────────────────────
-- Step 3 — re-add source CHECK with canonical 7-value list
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_source_check CHECK (
    source IN ('paxio-native','erc8004','a2a','mcp','fetch','virtuals','eliza')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Step 4 — add new columns (Identification + Capabilities groups)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS input_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS output_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS framework TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS owner TEXT;

-- Backfill category for existing 3230 MCP records (default — adapter can
-- refine per-record via inferCategory on next crawl).
UPDATE agent_cards
  SET category = 'AI & ML'
  WHERE category IS NULL;

-- Migrate legacy `capability` paxio-layer enum onto new fields:
--   capability='REGISTRY' / 'FACILITATOR'    → keep capabilities[] tag
--   capability='WALLET' / 'SECURITY' /etc.    → keep tag
-- Then DROP the old column.
UPDATE agent_cards
  SET capabilities = ARRAY[lower(capability)]
  WHERE capability IS NOT NULL AND capabilities = '{}';

-- ─────────────────────────────────────────────────────────────────────────
-- Step 5 — CHECK constraint on category (11-value enum)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_category_check CHECK (
    category IS NULL OR category IN (
      'Finance',
      'Legal & Compliance',
      'Security',
      'Developer',
      'Data & Research',
      'Infrastructure',
      'Productivity',
      'AI & ML',
      'Language',
      'Entertainment',
      'Customer Experience'
    )
  );

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_framework_check CHECK (
    framework IN (
      'langchain','crewai','autogen','eliza','llamaindex',
      'vercel-ai','autogpt','paxio-native','custom','unknown'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Step 6 — Wallet group (JSONB to keep schema flexible across chains)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  ADD COLUMN IF NOT EXISTS wallet_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS wallet_addresses JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_wallet_status_check CHECK (
    wallet_status IN ('paxio-native','external','none')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Step 7 — Payment group
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  ADD COLUMN IF NOT EXISTS payment_accepts TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_preferred TEXT,
  ADD COLUMN IF NOT EXISTS payment_facilitator TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS payment_facilitator_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pricing JSONB DEFAULT '{}'::jsonb;

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_payment_facilitator_check CHECK (
    payment_facilitator IN ('paxio','coinbase','skyfire','stripe','self','unknown')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Step 8 — SLA group (verified by us, not agent)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  ADD COLUMN IF NOT EXISTS sla_p50_ms INTEGER,
  ADD COLUMN IF NOT EXISTS sla_p95_ms INTEGER,
  ADD COLUMN IF NOT EXISTS sla_p99_ms INTEGER,
  ADD COLUMN IF NOT EXISTS sla_uptime_30d NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS sla_last_checked TIMESTAMPTZ;

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_sla_uptime_check CHECK (
    sla_uptime_30d IS NULL OR (sla_uptime_30d >= 0 AND sla_uptime_30d <= 1)
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Step 9 — Reputation + Security
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  ADD COLUMN IF NOT EXISTS reputation_score INTEGER,
  ADD COLUMN IF NOT EXISTS reputation_tx_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reputation_delivery_rate NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS reputation_dispute_rate NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS security_owasp_score NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS security_badge_level TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS security_last_scanned TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS security_guard_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS security_guard_incidents_30d INTEGER DEFAULT 0;

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_reputation_score_check CHECK (
    reputation_score IS NULL OR (reputation_score >= 0 AND reputation_score <= 1000)
  ),
  ADD CONSTRAINT agent_cards_security_badge_check CHECK (
    security_badge_level IN ('gold','silver','bronze','none')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Step 10 — Compliance group
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  ADD COLUMN IF NOT EXISTS compliance_eu_ai_act TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS compliance_eu_ai_act_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS compliance_owasp_cert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS compliance_iso42001 NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS compliance_kya_cert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS compliance_data_handling TEXT DEFAULT 'ephemeral';

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_compliance_eu_ai_act_check CHECK (
    compliance_eu_ai_act IN ('certified','in_progress','none')
  ),
  ADD CONSTRAINT agent_cards_compliance_data_handling_check CHECK (
    compliance_data_handling IN ('no-storage','ephemeral','logged')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Step 11 — Ecosystem + Developer
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_cards
  ADD COLUMN IF NOT EXISTS ecosystem_network TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS ecosystem_chain_id INTEGER,
  ADD COLUMN IF NOT EXISTS ecosystem_erc8004_token_id TEXT,
  ADD COLUMN IF NOT EXISTS ecosystem_open_source TEXT,
  ADD COLUMN IF NOT EXISTS ecosystem_compatible_clients TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS developer_name TEXT,
  ADD COLUMN IF NOT EXISTS developer_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS developer_url TEXT;

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_ecosystem_network_check CHECK (
    ecosystem_network IN ('ethereum','base','solana','icp','fetch','none')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Step 12 — indexes for common search/filter patterns
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agent_cards_category ON agent_cards (category);
CREATE INDEX IF NOT EXISTS idx_agent_cards_framework ON agent_cards (framework);
CREATE INDEX IF NOT EXISTS idx_agent_cards_capabilities ON agent_cards USING GIN (capabilities);
CREATE INDEX IF NOT EXISTS idx_agent_cards_payment_accepts ON agent_cards USING GIN (payment_accepts);
CREATE INDEX IF NOT EXISTS idx_agent_cards_security_badge ON agent_cards (security_badge_level);
CREATE INDEX IF NOT EXISTS idx_agent_cards_wallet_status ON agent_cards (wallet_status);
CREATE INDEX IF NOT EXISTS idx_agent_cards_compliance_eu_ai_act ON agent_cards (compliance_eu_ai_act);

-- ─────────────────────────────────────────────────────────────────────────
-- Step 13 — UPSERT semantics: ON CONFLICT DO NOTHING (instead of UPDATE)
-- ─────────────────────────────────────────────────────────────────────────
--
-- Storage layer (postgres-storage.ts) currently uses ON CONFLICT (did) DO
-- UPDATE — per M-L1-taxonomy task list this changes to DO NOTHING so that
-- crawler естественно идёт «вперёд» (известные DID'ы skip'аются, новые
-- insert'ятся).
--
-- This SQL is the source-of-truth; registry-dev impl rewrites the inline
-- SQL.upsertByDid constant in postgres-storage.ts to mirror.
--
-- (This file declares the CONTRACT — the change happens at the inline SQL
-- in postgres-storage.ts, not by ALTER on a CONSTRAINT here.)
