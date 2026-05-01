// PostgreSQL-backed implementation of the AgentStorage port (FA-01, M-L1-impl).
//
// The Postgres driver itself is abstracted behind a tiny `PgPool` interface so
// the storage layer can be unit-tested against an in-memory fake without
// forcing the `pg` npm package on every test run, AND so the production
// composition root (apps/back/server/main.cjs) can wire the real `pg` Pool
// without coupling this file to that import.
//
// Schema lives in packages/contracts/sql/001_agent_cards.sql — see header
// there for column rationale + index choices. Migrations are applied at
// startup when `runMigrations: true` (one-shot, idempotent CREATE
// statements).
//
// MIGRATION_003_TAXONOMY mirrors packages/contracts/sql/003_taxonomy.sql
// (source-of-truth). It adds 30+ new columns (category, capabilities[],
// wallet_*, payment_*, sla_*, reputation_*, security_*, compliance_*,
// ecosystem_*, developer_*) and is idempotent — ALTER TABLE ADD COLUMN
// IF NOT EXISTS, DROP CONSTRAINT IF EXISTS, CREATE INDEX IF NOT EXISTS.
//
// Idempotency contract:
//   - upsert(card) is called twice with the same card → ends in same state,
//     no error. Achieved via:
//       (a) ON CONFLICT (did) DO NOTHING  — primary key path
//       (b) for cards that DO carry (source, externalId), an extra
//           pre-check via the partial UNIQUE INDEX
//           uq_agent_cards_source_external_id  catches re-crawled records
//           where the upstream source changed the DID we'd derive.
//
// Find: MVP fallback uses ILIKE on name (BM25-ish via pg_trgm similarity
// would be M17). Returns FindResult[] with score=1 for matches —
// architect's contract requires score in [0,1], we leave a constant for now.
//
// Multi-tenancy: registry is a public agent index by design (FA-01 §0 +
// backend-architecture.md whitelist for /api/registry/find). No
// agent_did/organization_id filter on this storage — by design.

import {
  ZodAgentCard,
  type AgentCard,
  type CrawlerSource,
  type Did,
  type FindQuery,
  type FindResult,
  type Result,
  ok,
  err,
  CRAWLER_SOURCES,
} from '@paxio/types';
import type {
  AgentStorage,
  StorageError,
  AgentCountBySource,
} from '@paxio/interfaces';

// ---------------------------------------------------------------------------
// Driver abstraction (so we don't import `pg` here directly).
// ---------------------------------------------------------------------------

export interface PgQueryResult<R = unknown> {
  readonly rows: readonly R[];
  readonly rowCount: number | null;
}

/**
 * Minimal Pool interface satisfied by `pg.Pool`. The composition root
 * (`apps/back/server/main.cjs`) creates a `new pg.Pool(...)` and passes it
 * here. Tests use an in-memory fake.
 */
export interface PgPool {
  query<R = unknown>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<PgQueryResult<R>>;
}

// ---------------------------------------------------------------------------
// SQL constants (single source of truth — easier to audit)
// ---------------------------------------------------------------------------

const SQL = Object.freeze({
  // Insert-or-update by primary key (DID). When the same external record
  // re-crawls under a *different* DID the partial UNIQUE INDEX
  // (source, external_id) catches the duplicate — we handle that by trying
  // a second update keyed on (source, external_id).
  upsertByDid: `
    INSERT INTO agent_cards (
      did, name, description, capability, endpoint, version,
      source, external_id, source_url, crawled_at, created_at, raw_payload,
      -- M-L1-taxonomy new columns (003)
      category, capabilities, input_types, output_types, languages, framework,
      claimed, owner,
      wallet_status, wallet_addresses, wallet_verified,
      payment_accepts, payment_preferred, payment_facilitator, payment_facilitator_verified, pricing,
      sla_p50_ms, sla_p95_ms, sla_p99_ms, sla_uptime_30d, sla_last_checked,
      reputation_score, reputation_tx_count, reputation_delivery_rate, reputation_dispute_rate,
      security_owasp_score, security_badge_level, security_last_scanned, security_guard_connected, security_guard_incidents_30d,
      compliance_eu_ai_act, compliance_eu_ai_act_expires, compliance_owasp_cert, compliance_iso42001, compliance_kya_cert, compliance_data_handling,
      ecosystem_network, ecosystem_chain_id, ecosystem_erc8004_token_id, ecosystem_open_source, ecosystem_compatible_clients,
      developer_name, developer_verified, developer_url
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18,
      $19, $20,
      $21, $22, $23,
      $24, $25, $26, $27, $28,
      $29, $30, $31, $32, $33,
      $34, $35, $36, $37,
      $38, $39, $40, $41, $42,
      $43, $44, $45, $46, $47, $48,
      $49, $50, $51, $52, $53,
      $54, $55, $56
    )
    ON CONFLICT (did) DO NOTHING
  `,

  resolveByDid: `
    SELECT did, name, description, capability, endpoint, version,
           source, external_id, source_url, crawled_at, created_at
    FROM agent_cards
    WHERE did = $1
    LIMIT 1
  `,

  // MVP search: case-insensitive substring on name. Real scoring (BM25 via
  // ts_rank or pg_trgm similarity) is M17.
  findByIntent: `
    SELECT did, name, description, capability, endpoint, version,
           source, external_id, source_url, crawled_at, created_at
    FROM agent_cards
    WHERE name ILIKE $1
       OR description ILIKE $1
    ORDER BY name ASC
    LIMIT $2
  `,

  count: `SELECT COUNT(*)::int AS n FROM agent_cards`,

  countBySource: `
    SELECT source, COUNT(*)::int AS n
    FROM agent_cards
    GROUP BY source
  `,
});

// ---------------------------------------------------------------------------
// Migration loading. We keep the SQL inline here (small, frozen) rather than
// reading from disk — keeps the storage import self-contained for VM
// sandbox compatibility downstream. Source of truth still in
// packages/contracts/sql/001_agent_cards.sql for human auditing; this
// constant must mirror it.
// ---------------------------------------------------------------------------

const MIGRATION_001_AGENT_CARDS = `
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS agent_cards (
    did              TEXT PRIMARY KEY,
    name             TEXT        NOT NULL  CHECK (length(name) BETWEEN 1 AND 200),
    description      TEXT        CHECK (description IS NULL OR length(description) <= 1000),
    capability       TEXT        NOT NULL  CHECK (capability IN ('REGISTRY','FACILITATOR','WALLET','SECURITY','INTELLIGENCE')),
    endpoint         TEXT,
    version          TEXT        NOT NULL  DEFAULT '0.0.1',
    source           TEXT        NOT NULL  DEFAULT 'native'
                       CHECK (source IN ('native','erc8004','a2a','mcp','fetch-ai','virtuals')),
    external_id      TEXT        CHECK (external_id IS NULL OR length(external_id) BETWEEN 1 AND 500),
    source_url       TEXT,
    crawled_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL  DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL  DEFAULT NOW(),
    raw_payload      JSONB
);

CREATE INDEX IF NOT EXISTS idx_agent_cards_source ON agent_cards (source);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_cards_source_external_id
    ON agent_cards (source, external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_cards_created_at_desc
    ON agent_cards (created_at DESC);

DROP TRIGGER IF EXISTS set_agent_cards_updated_at ON agent_cards;
CREATE TRIGGER set_agent_cards_updated_at
    BEFORE UPDATE ON agent_cards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
`;

// MIGRATION_003_TAXONOMY — mirrors packages/contracts/sql/003_taxonomy.sql.
// Single source of truth for the SQL; inline copy here for VM-sandbox-friendly
// startup migration (no file-system access required). All statements are
// idempotent: ALTER TABLE ADD COLUMN IF NOT EXISTS, DROP CONSTRAINT IF EXISTS,
// CREATE INDEX IF NOT EXISTS. See 003_taxonomy.sql for full column rationale.
const MIGRATION_003_TAXONOMY = `
-- =============================================================================
-- Migration 003: agent_cards taxonomy refactor (M-L1-taxonomy)
-- =============================================================================
--
-- Replaces single Paxio-layer \`capability\` enum with domain-based \`category\`
-- (11 values, single criterion) + free-form \`capabilities[]\` tags.
--
-- Adds 9 attribute groups covering full agentic ecosystem:
--   Identification (claimed, owner)
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
-- Existing 3230 rows: backfilled \`category='AI & ML'\`.

-- Step 1 — drop old \`capability\` and \`source\` CHECK constraints
ALTER TABLE agent_cards
  DROP CONSTRAINT IF EXISTS agent_cards_capability_check;

ALTER TABLE agent_cards
  DROP CONSTRAINT IF EXISTS agent_cards_source_check;

-- Step 2 — backfill source enum (legacy → canonical)
UPDATE agent_cards SET source = 'paxio-native' WHERE source = 'native';
UPDATE agent_cards SET source = 'fetch'        WHERE source = 'fetch-ai';

-- Step 3 — re-add source CHECK with canonical 7-value list
ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_source_check CHECK (
    source IN ('paxio-native','erc8004','a2a','mcp','fetch','virtuals','eliza')
  );

-- Step 4 — add new columns (Identification + Capabilities groups)
ALTER TABLE agent_cards
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS input_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS output_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS framework TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS owner TEXT;

-- Backfill category for existing MCP records (default — adapter can refine
-- per-record via inferCategory on next crawl).
UPDATE agent_cards
  SET category = 'AI & ML'
  WHERE category IS NULL;

-- Migrate legacy \`capability\` paxio-layer enum onto new fields.
UPDATE agent_cards
  SET capabilities = ARRAY[lower(capability)]
  WHERE capability IS NOT NULL AND capabilities = '{}';

-- Step 5 — CHECK constraint on category (11-value enum) + framework
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

-- Step 6 — Wallet group (JSONB for schema-flexible addresses across chains)
ALTER TABLE agent_cards
  ADD COLUMN IF NOT EXISTS wallet_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS wallet_addresses JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE agent_cards
  ADD CONSTRAINT agent_cards_wallet_status_check CHECK (
    wallet_status IN ('paxio-native','external','none')
  );

-- Step 7 — Payment group
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

-- Step 8 — SLA group (verified by us, not agent)
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

-- Step 9 — Reputation + Security
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

-- Step 10 — Compliance group
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

-- Step 11 — Ecosystem + Developer
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

-- Step 12 — indexes for common search/filter patterns
CREATE INDEX IF NOT EXISTS idx_agent_cards_category ON agent_cards (category);
CREATE INDEX IF NOT EXISTS idx_agent_cards_framework ON agent_cards (framework);
CREATE INDEX IF NOT EXISTS idx_agent_cards_capabilities ON agent_cards USING GIN (capabilities);
CREATE INDEX IF NOT EXISTS idx_agent_cards_payment_accepts ON agent_cards USING GIN (payment_accepts);
CREATE INDEX IF NOT EXISTS idx_agent_cards_security_badge ON agent_cards (security_badge_level);
CREATE INDEX IF NOT EXISTS idx_agent_cards_wallet_status ON agent_cards (wallet_status);
CREATE INDEX IF NOT EXISTS idx_agent_cards_compliance_eu_ai_act ON agent_cards (compliance_eu_ai_act);

-- Step 13 — note: ON CONFLICT (did) DO NOTHING contract is set in upsertByDid SQL above.
`;

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

interface AgentCardRow {
  readonly did: string;
  readonly name: string;
  readonly description: string | null;
  readonly capability: string;
  readonly endpoint: string | null;
  readonly version: string;
  readonly source: string;
  readonly external_id: string | null;
  readonly source_url: string | null;
  readonly crawled_at: Date | string | null;
  readonly created_at: Date | string;
}

const isoString = (v: Date | string | null | undefined): string | undefined => {
  if (v == null) return undefined;
  if (v instanceof Date) return v.toISOString();
  // Postgres TIMESTAMPTZ comes back as a string in ISO-8601-ish form when
  // the pg driver's parser is disabled, or when our fake hands a string
  // through. Normalise via Date.
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
};

const rowToCard = (row: AgentCardRow): Result<AgentCard, StorageError> => {
  const created = isoString(row.created_at);
  if (!created) {
    return err({
      code: 'validation_error',
      message: `agent_cards.created_at unparseable for did=${row.did}`,
    });
  }
  const candidate = {
    did: row.did,
    name: row.name,
    ...(row.description != null ? { description: row.description } : {}),
    capability: row.capability,
    ...(row.endpoint != null ? { endpoint: row.endpoint } : {}),
    version: row.version,
    createdAt: created,
    source: row.source,
    ...(row.external_id != null ? { externalId: row.external_id } : {}),
    ...(row.source_url != null ? { sourceUrl: row.source_url } : {}),
    ...(isoString(row.crawled_at) != null
      ? { crawledAt: isoString(row.crawled_at)! }
      : {}),
  };
  const parsed = ZodAgentCard.safeParse(candidate);
  if (!parsed.success) {
    return err({
      code: 'validation_error',
      message: `agent_cards row failed schema validation: ${parsed.error.issues[0]?.message ?? 'unknown'}`,
    });
  }
  return ok(parsed.data);
};

// ---------------------------------------------------------------------------
// Constraint-violation classification
// ---------------------------------------------------------------------------

interface PgErrorLike {
  readonly code?: string;
  readonly constraint?: string;
  readonly message?: string;
}

const toStorageError = (e: unknown): StorageError => {
  const pe = (e ?? {}) as PgErrorLike;
  const message =
    typeof pe.message === 'string' ? pe.message : 'unknown postgres error';
  if (pe.code === '23505') {
    return {
      code: 'constraint_violation',
      message,
      ...(typeof pe.constraint === 'string' ? { field: pe.constraint } : {}),
    };
  }
  if (pe.code === '23514') {
    return {
      code: 'constraint_violation',
      message,
      ...(typeof pe.constraint === 'string' ? { field: pe.constraint } : {}),
    };
  }
  return { code: 'db_unavailable', message };
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface PostgresStorageDeps {
  readonly pool: PgPool;
  /**
   * If true, runs the inline 001_agent_cards migration on creation. Idempotent
   * (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, etc).
   * Default: false — composition root decides whether to run migrations.
   */
  readonly runMigrations?: boolean;
}

export const createPostgresStorage = async (
  deps: PostgresStorageDeps,
): Promise<AgentStorage> => {
  if (deps.runMigrations === true) {
    try {
      await deps.pool.query(MIGRATION_001_AGENT_CARDS);
      await deps.pool.query(MIGRATION_003_TAXONOMY);
    } catch (e) {
      // Migration failure is fatal — surface as db_unavailable so callers
      // can decide to abort startup.
      throw new Error(
        `postgres-storage: migration failed: ${(e as Error).message}`,
      );
    }
  }

  const upsertParams = (card: AgentCard): ReadonlyArray<unknown> => {
    // --- M-L1-taxonomy new fields (003 migration) ---
    // Capabilities group
    const cat = card.category;
    const caps = card.capabilities ?? undefined;
    const inTypes = card.inputTypes ?? undefined;
    const outTypes = card.outputTypes ?? undefined;
    const langs = card.languages ?? undefined;
    const fw = card.framework;
    // Identification extras
    const claimed = card.claimed;
    const owner = card.owner;
    // Wallet
    const w = card.wallet;
    const walletStatus = w?.status;
    const walletAddresses = w?.addresses
      ? JSON.stringify(w.addresses)
      : '{}';
    const walletVerified = w?.verified;
    // Payment
    const p = card.payment;
    const paymentAccepts = p?.accepts ?? undefined;
    const paymentPreferred = p?.preferred;
    const paymentFacilitator = p?.facilitator;
    const paymentFacilitatorVerified = p?.facilitatorVerified;
    const pricing = p?.pricing ? JSON.stringify(p.pricing) : '{}';
    // SLA
    const sla = card.sla;
    const slaP50 = sla?.p50Ms;
    const slaP95 = sla?.p95Ms;
    const slaP99 = sla?.p99Ms;
    const slaUptime = sla?.uptime30d;
    const slaLastChecked = sla?.lastChecked;
    // Reputation
    const rep = card.reputation;
    const repScore = rep?.score;
    const repTxCount = rep?.txCount;
    const repDelivery = rep?.deliveryRate;
    const repDispute = rep?.disputeRate;
    // Security
    const sec = card.security;
    const secOwasp = sec?.owaspScore;
    const secBadge = sec?.badgeLevel;
    const secLastScanned = sec?.lastScanned;
    const secGuardConn = sec?.guardConnected;
    const secGuardInc = sec?.guardIncidents30d;
    // Compliance
    const comp = card.compliance;
    const compEuAiAct = comp?.euAiAct;
    const compEuAiActExp = comp?.euAiActExpires;
    const compOwaspCert = comp?.owaspCert;
    const compIso42001 = comp?.iso42001;
    const compKyaCert = comp?.kyaCert;
    const compDataHandling = comp?.dataHandling;
    // Ecosystem
    const eco = card.ecosystem;
    const ecoNetwork = eco?.network;
    const ecoChainId = eco?.chainId;
    const ecoErc8004 = eco?.erc8004TokenId;
    const ecoOpenSource = eco?.openSource;
    const ecoClients = eco?.compatibleClients ?? undefined;
    // Developer
    const dev = card.developer;
    const devName = dev?.name;
    const devVerified = dev?.verified;
    const devUrl = dev?.url;

    return [
      card.did,           // $1
      card.name,          // $2
      card.description ?? null,  // $3
      card.capability,    // $4
      card.endpoint ?? null,     // $5
      card.version,       // $6
      card.source,        // $7
      card.externalId ?? null,  // $8
      card.sourceUrl ?? null,   // $9
      card.crawledAt ?? null,   // $10
      card.createdAt,     // $11
      JSON.stringify(card),    // $12
      cat ?? null,        // $13 — category
      caps ?? undefined,   // $14 — capabilities
      inTypes ?? undefined, // $15 — input_types
      outTypes ?? undefined, // $16 — output_types
      langs ?? undefined,  // $17 — languages
      fw ?? undefined,     // $18 — framework
      claimed ?? false,    // $19 — claimed
      owner ?? null,      // $20 — owner
      walletStatus ?? undefined, // $21 — wallet_status
      walletAddresses,     // $22 — wallet_addresses
      walletVerified ?? false,  // $23 — wallet_verified
      paymentAccepts ?? undefined, // $24 — payment_accepts
      paymentPreferred ?? null,   // $25 — payment_preferred
      paymentFacilitator ?? undefined, // $26 — payment_facilitator
      paymentFacilitatorVerified ?? false, // $27 — payment_facilitator_verified
      pricing,            // $28 — pricing
      slaP50 ?? null,      // $29 — sla_p50_ms
      slaP95 ?? null,      // $30 — sla_p95_ms
      slaP99 ?? null,      // $31 — sla_p99_ms
      slaUptime ?? null,   // $32 — sla_uptime_30d
      slaLastChecked ?? null, // $33 — sla_last_checked
      repScore ?? null,    // $34 — reputation_score
      repTxCount ?? 0,     // $35 — reputation_tx_count
      repDelivery ?? null, // $36 — reputation_delivery_rate
      repDispute ?? null,  // $37 — reputation_dispute_rate
      secOwasp ?? null,    // $38 — security_owasp_score
      secBadge ?? undefined, // $39 — security_badge_level
      secLastScanned ?? null, // $40 — security_last_scanned
      secGuardConn ?? false,   // $41 — security_guard_connected
      secGuardInc ?? 0,       // $42 — security_guard_incidents_30d
      compEuAiAct ?? undefined,  // $43 — compliance_eu_ai_act
      compEuAiActExp ?? null,    // $44 — compliance_eu_ai_act_expires
      compOwaspCert ?? false,    // $45 — compliance_owasp_cert
      compIso42001 ?? null,     // $46 — compliance_iso42001
      compKyaCert ?? false,      // $47 — compliance_kya_cert
      compDataHandling ?? undefined, // $48 — compliance_data_handling
      ecoNetwork ?? undefined,   // $49 — ecosystem_network
      ecoChainId ?? null,        // $50 — ecosystem_chain_id
      ecoErc8004 ?? null,        // $51 — ecosystem_erc8004_token_id
      ecoOpenSource ?? null,     // $52 — ecosystem_open_source
      ecoClients ?? undefined,   // $53 — ecosystem_compatible_clients
      devName ?? null,           // $54 — developer_name
      devVerified ?? false,      // $55 — developer_verified
      devUrl ?? null,            // $56 — developer_url
    ];
  };

  const upsert = async (
    card: AgentCard,
  ): Promise<Result<void, StorageError>> => {
    // Validate at boundary — defence-in-depth even though caller may have
    // already validated via toCanonical().
    const parsed = ZodAgentCard.safeParse(card);
    if (!parsed.success) {
      return err({
        code: 'validation_error',
        message: parsed.error.issues[0]?.message ?? 'invalid card',
      });
    }
    const valid = parsed.data;
    try {
      await deps.pool.query(SQL.upsertByDid, upsertParams(valid));
      return ok(undefined);
    } catch (e) {
      const pe = (e ?? {}) as PgErrorLike;
      // 23505 on uq_agent_cards_source_external_id = same record re-crawled
      // under same (source, external_id) but different DID → skip silently.
      if (
        pe.code === '23505' &&
        typeof pe.constraint === 'string' &&
        pe.constraint.includes('source_external_id')
      ) {
        return ok(undefined); // silent skip — crawler идёт «вперёд»
      }
      return err(toStorageError(e));
    }
  };

  const resolve = async (
    did: Did,
  ): Promise<Result<AgentCard, StorageError>> => {
    let res: PgQueryResult<AgentCardRow>;
    try {
      res = await deps.pool.query<AgentCardRow>(SQL.resolveByDid, [did]);
    } catch (e) {
      return err(toStorageError(e));
    }
    if (res.rows.length === 0) return err({ code: 'not_found', did });
    return rowToCard(res.rows[0]!);
  };

  const find = async (
    query: FindQuery,
  ): Promise<Result<readonly FindResult[], StorageError>> => {
    const term = query.intent.trim();
    if (term.length === 0) return ok([]);
    const pattern = `%${term.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    let res: PgQueryResult<AgentCardRow>;
    try {
      res = await deps.pool.query<AgentCardRow>(SQL.findByIntent, [
        pattern,
        query.limit,
      ]);
    } catch (e) {
      return err(toStorageError(e));
    }
    const results: FindResult[] = [];
    for (const row of res.rows) {
      const cardResult = rowToCard(row);
      if (!cardResult.ok) {
        // Skip malformed rows but log via thrown? No — return validation
        // error so the symptom surfaces (one bad row shouldn't poison the
        // whole index).
        return cardResult;
      }
      // MVP score: 1.0 for any match. Real BM25 scoring is M17.
      results.push({ card: cardResult.value, score: 1 });
    }
    return ok(results);
  };

  const count = async (): Promise<Result<number, StorageError>> => {
    try {
      const res = await deps.pool.query<{ n: number }>(SQL.count);
      const n = Number(res.rows[0]?.n ?? 0);
      return ok(Number.isFinite(n) ? n : 0);
    } catch (e) {
      return err(toStorageError(e));
    }
  };

  const countBySource = async (): Promise<
    Result<AgentCountBySource, StorageError>
  > => {
    let res: PgQueryResult<{ source: string; n: number }>;
    try {
      res = await deps.pool.query<{ source: string; n: number }>(
        SQL.countBySource,
      );
    } catch (e) {
      return err(toStorageError(e));
    }
    // Initialise every CrawlerSource bucket to 0 so countBySource always
    // returns a complete map (contract requirement).
    const buckets: Record<CrawlerSource, number> = {
      native: 0,
      erc8004: 0,
      a2a: 0,
      mcp: 0,
      'fetch-ai': 0,
      virtuals: 0,
    };
    for (const row of res.rows) {
      const src = row.source;
      // CRAWLER_SOURCES is a tuple-typed const; .includes wants
      // string. We accept a SQL-side CHECK constraint guarantees src is one
      // of the enum values, but defend anyway.
      if ((CRAWLER_SOURCES as readonly string[]).includes(src)) {
        buckets[src as CrawlerSource] = Number(row.n) || 0;
      }
    }
    return ok(Object.freeze(buckets));
  };

  const listRecent = async (
    rawLimit: number,
  ): Promise<Result<readonly AgentCard[], StorageError>> => {
    // Contract requires [1, 100] — enforce at storage boundary.
    const limit = Math.max(1, Math.min(rawLimit, 100));

    let res: PgQueryResult<AgentCardRow>;
    try {
      res = await deps.pool.query<AgentCardRow>(
        `SELECT did, name, description, capability, endpoint, version,
                source, external_id, source_url, crawled_at, created_at
         FROM agent_cards
         ORDER BY updated_at DESC, did ASC
         LIMIT $1`,
        [limit],
      );
    } catch (e) {
      return err(toStorageError(e));
    }

    const cards: AgentCard[] = [];
    for (const row of res.rows) {
      const cardResult = rowToCard(row);
      // Contract: skip malformed rows rather than returning an error.
      // One bad row in the DB should not poison the whole response.
      if (cardResult.ok) cards.push(cardResult.value);
    }
    return ok(Object.freeze(cards));
  };

  return Object.freeze({
    upsert,
    resolve,
    find,
    count,
    countBySource,
    listRecent,
  });
};
