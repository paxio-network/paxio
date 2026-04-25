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
// Idempotency contract:
//   - upsert(card) is called twice with the same card → ends in same state,
//     no error. Achieved via:
//       (a) ON CONFLICT (did) DO UPDATE  — primary key path
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
      source, external_id, source_url, crawled_at, created_at, raw_payload
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12
    )
    ON CONFLICT (did) DO UPDATE SET
      name        = EXCLUDED.name,
      description = EXCLUDED.description,
      capability  = EXCLUDED.capability,
      endpoint    = EXCLUDED.endpoint,
      version     = EXCLUDED.version,
      source      = EXCLUDED.source,
      external_id = EXCLUDED.external_id,
      source_url  = EXCLUDED.source_url,
      crawled_at  = EXCLUDED.crawled_at,
      raw_payload = EXCLUDED.raw_payload
  `,

  // Update existing row keyed on (source, external_id) — used when the
  // (source, external_id) partial UNIQUE constraint fires (different DID,
  // same external record).
  updateBySourceExternalId: `
    UPDATE agent_cards SET
      did         = $1,
      name        = $2,
      description = $3,
      capability  = $4,
      endpoint    = $5,
      version     = $6,
      source_url  = $9,
      crawled_at  = $10,
      raw_payload = $12
    WHERE source = $7 AND external_id = $8
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
  readonly detail?: string;
  readonly message?: string;
}

const isUniqueExternalIdViolation = (e: unknown): boolean => {
  if (!e || typeof e !== 'object') return false;
  const pe = e as PgErrorLike;
  // PG SQLSTATE 23505 = unique_violation. Constraint name is set up by the
  // partial unique index: uq_agent_cards_source_external_id.
  return (
    pe.code === '23505' &&
    typeof pe.constraint === 'string' &&
    pe.constraint.includes('source_external_id')
  );
};

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
    } catch (e) {
      // Migration failure is fatal — surface as db_unavailable so callers
      // can decide to abort startup.
      throw new Error(
        `postgres-storage: migration 001_agent_cards failed: ${(e as Error).message}`,
      );
    }
  }

  const upsertParams = (card: AgentCard): ReadonlyArray<unknown> => [
    card.did,
    card.name,
    card.description ?? null,
    card.capability,
    card.endpoint ?? null,
    card.version,
    card.source,
    card.externalId ?? null,
    card.sourceUrl ?? null,
    card.crawledAt ?? null,
    card.createdAt,
    JSON.stringify(card),
  ];

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
      // Same external record arriving with a different DID — update by
      // (source, external_id) and the consumer is none the wiser.
      if (
        isUniqueExternalIdViolation(e) &&
        valid.externalId !== undefined
      ) {
        try {
          await deps.pool.query(
            SQL.updateBySourceExternalId,
            upsertParams(valid),
          );
          return ok(undefined);
        } catch (e2) {
          return err(toStorageError(e2));
        }
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
