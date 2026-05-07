// PostgreSQL AgentStorage — unit tests against an injected fake PgPool.
//
// Real-Postgres integration test would live in
// products/01-registry/tests/postgres-storage.integration.ts and run via
// vitest --config vitest.integration.config.ts with testcontainers. Out of
// scope for the M-L1-impl overnight MVP — these unit tests still validate
// the SQL parameter shape, idempotency contract, error mapping, and row
// projection against the AgentStorage port.
//
// The fake records every query so we can assert the SQL string + parameter
// bindings the storage layer emits — that's the boundary we need to lock
// down so an integration run later can't surprise us.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPostgresStorage,
  type PgPool,
  type PgQueryResult,
} from '../app/infra/postgres-storage.js';
import type { AgentCard, Did } from '@paxio/types';

interface RecordedCall {
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
}

interface PgError extends Error {
  code?: string;
  constraint?: string;
}

const makePgError = (
  code: string,
  constraint?: string,
  message = 'simulated',
): PgError => {
  const e = new Error(message) as PgError;
  e.code = code;
  if (constraint) e.constraint = constraint;
  return e;
};

interface FakePool extends PgPool {
  readonly calls: RecordedCall[];
  setNextResult(result: PgQueryResult<unknown>): void;
  setQueryFn(fn: (sql: string, params?: ReadonlyArray<unknown>) => Promise<PgQueryResult<unknown>>): void;
}

const makeFakePool = (): FakePool => {
  const calls: RecordedCall[] = [];
  let queryFn: (
    sql: string,
    params?: ReadonlyArray<unknown>,
  ) => Promise<PgQueryResult<unknown>> = async () => ({
    rows: [],
    rowCount: 0,
  });
  return {
    calls,
    setNextResult(result) {
      const fn = queryFn;
      queryFn = async (sql, params) => {
        queryFn = fn;
        return result;
      };
    },
    setQueryFn(fn) {
      queryFn = fn;
    },
    async query<R = unknown>(
      sql: string,
      params?: ReadonlyArray<unknown>,
    ): Promise<PgQueryResult<R>> {
      calls.push({ sql, params: params ?? [] });
      const r = await queryFn(sql, params);
      return r as PgQueryResult<R>;
    },
  };
};

const sampleCard: AgentCard = {
  did: 'did:paxio:base:0x1a2b3c4d5e6f7890abcdef1234567890abcdef12' as Did,
  name: 'Test Agent',
  description: 'A test agent',
  capability: 'INTELLIGENCE',
  endpoint: 'https://agent.example.com',
  version: '1.0.0',
  createdAt: '2026-04-23T12:00:00.000Z',
  source: 'erc8004',
  externalId: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
  sourceUrl: 'https://basescan.org/address/0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
  crawledAt: '2026-04-23T11:30:00.000Z',
};

describe('createPostgresStorage — factory contract', () => {
  it('runs MIGRATION_004 after MIGRATION_003 when runMigrations=true', async () => {
    // M-L1-T3g: source CHECK constraint is expanded from 7 (M-L1-taxonomy)
    // to 13 canonical + 2 legacy values. MIGRATION_004_SOURCE_EXPANSION
    // must run on every startup AFTER MIGRATION_003_TAXONOMY so that
    // container restarts do not revert the constraint to the narrow set.
    // Without 004 wired inline, every restart re-runs 003 and blocks
    // fetch-ai source inserts (9226 storageErrors on 2026-05-07).
    const pool = makeFakePool();
    await createPostgresStorage({ pool, runMigrations: true });
    const allSql = pool.calls.map((c) => c.sql);
    // At minimum: 001 + 003 + 004 (may be more if pool returns extra rows).
    expect(allSql.length).toBeGreaterThanOrEqual(3);
    // 003 runs first (taxonomy adds the source CHECK).
    const idx003 = allSql.findIndex((s) =>
      s.includes('MIGRATION_003') || s.includes('agent_cards_category_check'),
    );
    expect(idx003).toBeGreaterThanOrEqual(0);
    // 004 runs after 003 — DROP CONSTRAINT IF EXISTS agent_cards_source_check
    // is the first statement in MIGRATION_004_SOURCE_EXPANSION.
    const sqlAfter003 = allSql.slice(idx003).join(' ');
    expect(sqlAfter003).toMatch(
      /DROP CONSTRAINT IF EXISTS agent_cards_source_check/,
    );
  });

  it('returns a frozen object that implements AgentStorage', async () => {
    const pool = makeFakePool();
    const storage = await createPostgresStorage({ pool });
    expect(Object.isFrozen(storage)).toBe(true);
    expect(typeof storage.upsert).toBe('function');
    expect(typeof storage.resolve).toBe('function');
    expect(typeof storage.find).toBe('function');
    expect(typeof storage.count).toBe('function');
    expect(typeof storage.countBySource).toBe('function');
  });

  it('runs migration when runMigrations=true', async () => {
    const pool = makeFakePool();
    await createPostgresStorage({ pool, runMigrations: true });
    expect(pool.calls.length).toBeGreaterThanOrEqual(1);
    expect(pool.calls[0]!.sql).toMatch(/CREATE TABLE IF NOT EXISTS agent_cards/);
  });

  it('does not run migration when runMigrations is omitted', async () => {
    const pool = makeFakePool();
    await createPostgresStorage({ pool });
    expect(pool.calls.length).toBe(0);
  });

  it('throws (not Result) when migration query fails', async () => {
    const pool = makeFakePool();
    pool.setQueryFn(async () => {
      throw new Error('connection refused');
    });
    await expect(
      createPostgresStorage({ pool, runMigrations: true }),
    ).rejects.toThrow(/migration/);
  });
});

describe('createPostgresStorage.upsert', () => {
  let pool: FakePool;

  beforeEach(() => {
    pool = makeFakePool();
  });

  it('emits ON CONFLICT (did) DO NOTHING SQL with all 56 params (M-L1-taxonomy T-6 + T-2)', async () => {
    // M-L1-taxonomy T-6: skip-if-exists semantics — registered DIDs are
    //   skipped silently so crawler естественно идёт «вперёд» (старые
    //   записи не перезатираются каждый cron tick).
    // M-L1-taxonomy T-2: INSERT carries 56 params covering legacy 12
    //   columns + 44 new taxonomy columns (category, capabilities[],
    //   framework, wallet_*, payment_*, sla_*, reputation_*, security_*,
    //   compliance_*, ecosystem_*, developer_*) per migration
    //   packages/contracts/sql/003_taxonomy.sql.
    const storage = await createPostgresStorage({ pool });
    const r = await storage.upsert(sampleCard);
    expect(r.ok).toBe(true);
    expect(pool.calls.length).toBe(1);
    expect(pool.calls[0]!.sql).toMatch(/ON CONFLICT \(did\) DO NOTHING/);
    expect(pool.calls[0]!.sql).not.toMatch(/DO UPDATE SET/);
    expect(pool.calls[0]!.params.length).toBe(56);
    // Legacy positional asserts (params[0..11] retain their meaning —
    // migration 003 appended new columns; existing positions stable).
    expect(pool.calls[0]!.params[0]).toBe(sampleCard.did);
    expect(pool.calls[0]!.params[1]).toBe(sampleCard.name);
    expect(pool.calls[0]!.params[6]).toBe(sampleCard.source);
    expect(pool.calls[0]!.params[7]).toBe(sampleCard.externalId);
  });

  it('returns ok and is idempotent on second call (same DID)', async () => {
    const storage = await createPostgresStorage({ pool });
    const r1 = await storage.upsert(sampleCard);
    const r2 = await storage.upsert(sampleCard);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Both calls hit the same SQL.
    expect(pool.calls.length).toBe(2);
    expect(pool.calls[0]!.sql).toBe(pool.calls[1]!.sql);
  });

  it('M-L1-T3e: upsertParams provides defaults for CHECK-constrained columns when AgentCard fields absent', async () => {
    // Production bug 2026-05-07: fetch-ai crawl returns processed:9226 storageErrors:9226.
    // Root cause: pg CHECK constraints on framework/wallet_status/payment_facilitator/
    // security_badge_level/payment_facilitator/ecosystem_network/compliance_data_handling
    // /compliance_eu_ai_act DO NOT allow NULL — only enum values. Adapter doesn't populate
    // these (Zod-optional in AgentCard). upsertParams used `?? undefined` → pg → NULL →
    // CHECK violation on every insert.
    //
    // Fix: upsertParams MUST emit DEFAULT-equivalent values (e.g. 'unknown'/'none')
    // matching SQL DEFAULT for those columns, not undefined.
    const storage = await createPostgresStorage({ pool });
    await storage.upsert(sampleCard);
    expect(pool.calls.length).toBe(1);
    const params = pool.calls[0]!.params;

    // SQL position → CHECK-constrained column → expected default
    const checkConstrainedDefaults: ReadonlyArray<{
      readonly position: number;     // 1-based per SQL $N
      readonly column: string;
      readonly expected: string;
    }> = [
      { position: 18, column: 'framework',            expected: 'unknown' },
      { position: 21, column: 'wallet_status',        expected: 'none' },
      { position: 26, column: 'payment_facilitator',  expected: 'unknown' },
      { position: 39, column: 'security_badge_level', expected: 'none' },
    ];

    for (const { position, column, expected } of checkConstrainedDefaults) {
      const value = params[position - 1];
      expect(
        value,
        `param[$${position}] (${column}) should be '${expected}' (SQL DEFAULT) when AgentCard does not set it; got ${JSON.stringify(value)} which would fail CHECK constraint`,
      ).toBe(expected);
    }

    // No undefined values anywhere — pg 8.x deprecates undefined params.
    for (let i = 0; i < params.length; i += 1) {
      expect(
        params[i],
        `param[$${i + 1}] is undefined — would be coerced to NULL or rejected by pg`,
      ).not.toBeUndefined();
    }
  });

  it('returns validation_error on malformed AgentCard', async () => {
    const storage = await createPostgresStorage({ pool });
    const bad = { ...sampleCard, did: 'not-a-did' as Did };
    const r = await storage.upsert(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('validation_error');
    // Must NOT touch the DB on validation error.
    expect(pool.calls.length).toBe(0);
  });

  it('skips silently on (source, external_id) partial-unique violation (M-L1-taxonomy T-6)', async () => {
    // M-L1-taxonomy T-6: with DO NOTHING ON CONFLICT (did), the partial
    // UNIQUE INDEX (source, external_id) is the only path that can still
    // raise 23505. Storage should treat that the same as DID conflict —
    // skip silently (return ok), NOT fall back to an UPDATE that
    // overwrites the existing row's metadata.
    const storage = await createPostgresStorage({ pool });
    pool.setQueryFn(async () => {
      throw makePgError('23505', 'uq_agent_cards_source_external_id');
    });
    const r = await storage.upsert(sampleCard);
    expect(r.ok).toBe(true);
    expect(pool.calls.length).toBe(1);
    expect(pool.calls[0]!.sql).toMatch(/ON CONFLICT \(did\)/);
    // No second UPDATE call — only one INSERT attempt
  });

  it('returns constraint_violation only on non-uniqueness 23505 (e.g. CHECK)', async () => {
    // M-L1-taxonomy T-6: per-uniqueness 23505 → silent skip (covered by
    // sibling test). Other 23505 (CHECK constraint, FK, etc.) → still
    // surface as constraint_violation.
    const storage = await createPostgresStorage({ pool });
    pool.setQueryFn(async () => {
      throw makePgError('23514', 'agent_cards_category_check'); // CHECK violation
    });
    const r = await storage.upsert(sampleCard);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('constraint_violation');
    }
  });

  it('returns db_unavailable on generic driver error', async () => {
    const storage = await createPostgresStorage({ pool });
    pool.setQueryFn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const r = await storage.upsert(sampleCard);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('db_unavailable');
      expect(r.error.message).toMatch(/ECONNREFUSED/);
    }
  });
});

describe('createPostgresStorage.resolve', () => {
  it('returns ok with parsed AgentCard when row found', async () => {
    const pool = makeFakePool();
    pool.setNextResult({
      rows: [
        {
          did: sampleCard.did,
          name: sampleCard.name,
          description: sampleCard.description,
          capability: sampleCard.capability,
          endpoint: sampleCard.endpoint,
          version: sampleCard.version,
          source: sampleCard.source,
          external_id: sampleCard.externalId,
          source_url: sampleCard.sourceUrl,
          crawled_at: sampleCard.crawledAt,
          created_at: sampleCard.createdAt,
        },
      ],
      rowCount: 1,
    });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.resolve(sampleCard.did as Did);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.did).toBe(sampleCard.did);
      expect(r.value.source).toBe('erc8004');
    }
  });

  it('returns not_found when no row', async () => {
    const pool = makeFakePool();
    const storage = await createPostgresStorage({ pool });
    const r = await storage.resolve('did:paxio:base:0xunknown' as Did);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('not_found');
      if (r.error.code === 'not_found') {
        expect(r.error.did).toBe('did:paxio:base:0xunknown');
      }
    }
  });

  it('returns db_unavailable on driver error', async () => {
    const pool = makeFakePool();
    pool.setQueryFn(async () => {
      throw new Error('connection lost');
    });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.resolve(sampleCard.did as Did);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('db_unavailable');
  });
});

describe('createPostgresStorage.find', () => {
  it('emits ILIKE query with escaped wildcards', async () => {
    const pool = makeFakePool();
    const storage = await createPostgresStorage({ pool });
    await storage.find({ intent: 'translator 50%', limit: 10 });
    expect(pool.calls.length).toBe(1);
    expect(pool.calls[0]!.sql).toMatch(/ILIKE \$1/);
    // % inside the term must be escaped so SQL doesn't treat it as wildcard
    expect(pool.calls[0]!.params[0]).toBe('%translator 50\\%%');
    expect(pool.calls[0]!.params[1]).toBe(10);
  });

  it('returns empty results for empty intent (no DB call)', async () => {
    const pool = makeFakePool();
    const storage = await createPostgresStorage({ pool });
    const r = await storage.find({ intent: '   ', limit: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBe(0);
    expect(pool.calls.length).toBe(0);
  });

  it('returns FindResult[] with score=1 for each row', async () => {
    const pool = makeFakePool();
    pool.setNextResult({
      rows: [
        {
          did: sampleCard.did,
          name: sampleCard.name,
          description: sampleCard.description,
          capability: sampleCard.capability,
          endpoint: sampleCard.endpoint,
          version: sampleCard.version,
          source: sampleCard.source,
          external_id: sampleCard.externalId,
          source_url: sampleCard.sourceUrl,
          crawled_at: sampleCard.crawledAt,
          created_at: sampleCard.createdAt,
        },
      ],
      rowCount: 1,
    });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.find({ intent: 'test', limit: 5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBe(1);
      expect(r.value[0]!.score).toBe(1);
      expect(r.value[0]!.card.did).toBe(sampleCard.did);
    }
  });
});

describe('createPostgresStorage.count', () => {
  it('returns the integer from COUNT(*)', async () => {
    const pool = makeFakePool();
    pool.setNextResult({ rows: [{ n: 42 }], rowCount: 1 });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.count();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('returns 0 on empty result', async () => {
    const pool = makeFakePool();
    pool.setNextResult({ rows: [], rowCount: 0 });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.count();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(0);
  });
});

describe('createPostgresStorage.countBySource', () => {
  it('returns frozen complete map with all 6 buckets', async () => {
    const pool = makeFakePool();
    pool.setNextResult({
      rows: [
        { source: 'native', n: 5 },
        { source: 'erc8004', n: 3 },
        { source: 'mcp', n: 100 },
      ],
      rowCount: 3,
    });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.countBySource();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.isFrozen(r.value)).toBe(true);
      const keys = Object.keys(r.value).sort();
      expect(keys).toEqual([
        'a2a',
        'erc8004',
        'fetch-ai',
        'mcp',
        'native',
        'virtuals',
      ]);
      expect(r.value['native']).toBe(5);
      expect(r.value['erc8004']).toBe(3);
      expect(r.value['mcp']).toBe(100);
      // Buckets without rows default to 0.
      expect(r.value['a2a']).toBe(0);
      expect(r.value['fetch-ai']).toBe(0);
      expect(r.value['virtuals']).toBe(0);
    }
  });

  it('ignores rows with unknown source value (defence)', async () => {
    const pool = makeFakePool();
    pool.setNextResult({
      rows: [
        { source: 'native', n: 1 },
        { source: 'unknown-bogus', n: 99 },
      ],
      rowCount: 2,
    });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.countBySource();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value['native']).toBe(1);
      // Bogus key must NOT appear.
      expect(Object.keys(r.value)).not.toContain('unknown-bogus');
    }
  });
});

// --- M-L5: listRecent(limit) — freshest N agents for landing NetworkGraph -----
//
// Contract (see packages/interfaces/src/agent-storage.ts::listRecent):
//   - limit in [1, 100] — impl MUST clamp silently to 100 if asked more
//   - ORDER BY updated_at DESC, did ASC (second key for determinism when
//     two agents share the same updated_at — e.g. crawled in same batch)
//   - Returns readonly frozen array
//   - Empty array valid (no agents crawled yet)
//   - Deterministic: same data + same limit → identical order
//
// Used by M-L5 landing NetworkGraph — only requests up to 20.

describe('createPostgresStorage.listRecent (M-L5)', () => {
  it('emits SELECT ... ORDER BY updated_at DESC, did ASC LIMIT $1', async () => {
    const pool = makeFakePool();
    pool.setNextResult({ rows: [], rowCount: 0 });
    const storage = await createPostgresStorage({ pool });
    await storage.listRecent(10);

    const lastCall = pool.calls[pool.calls.length - 1]!;
    const sql = lastCall.sql.toLowerCase().replace(/\s+/g, ' ');
    expect(sql).toContain('select');
    expect(sql).toContain('from agent_cards');
    expect(sql).toContain('order by updated_at desc');
    expect(sql).toContain('did asc');
    expect(sql).toContain('limit $1');
    expect(lastCall.params).toStrictEqual([10]);
  });

  it('returns a readonly frozen array of AgentCards', async () => {
    const pool = makeFakePool();
    pool.setNextResult({
      rows: [
        {
          did: sampleCard.did,
          name: sampleCard.name,
          description: sampleCard.description,
          capability: sampleCard.capability,
          endpoint: sampleCard.endpoint,
          version: sampleCard.version,
          source: sampleCard.source,
          external_id: sampleCard.externalId,
          source_url: sampleCard.sourceUrl,
          crawled_at: sampleCard.crawledAt,
          created_at: sampleCard.createdAt,
        },
      ],
      rowCount: 1,
    });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.listRecent(20);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.isFrozen(r.value)).toBe(true);
      expect(r.value).toHaveLength(1);
      expect(r.value[0]!.did).toBe(sampleCard.did);
      expect(r.value[0]!.source).toBe('erc8004');
    }
  });

  it('returns empty frozen array when no rows', async () => {
    const pool = makeFakePool();
    pool.setNextResult({ rows: [], rowCount: 0 });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.listRecent(20);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toStrictEqual([]);
      expect(Object.isFrozen(r.value)).toBe(true);
    }
  });

  it('clamps limit at 100 silently (impl defence)', async () => {
    const pool = makeFakePool();
    pool.setNextResult({ rows: [], rowCount: 0 });
    const storage = await createPostgresStorage({ pool });
    await storage.listRecent(500);

    const lastCall = pool.calls[pool.calls.length - 1]!;
    expect(lastCall.params).toStrictEqual([100]);
  });

  it('clamps limit at 1 for zero/negative inputs (impl defence)', async () => {
    const pool = makeFakePool();
    pool.setNextResult({ rows: [], rowCount: 0 });
    const storage = await createPostgresStorage({ pool });
    await storage.listRecent(0);

    const lastCall = pool.calls[pool.calls.length - 1]!;
    expect(lastCall.params).toStrictEqual([1]);
  });

  it('skips rows that fail Zod validation (defence against bad rows)', async () => {
    const pool = makeFakePool();
    pool.setNextResult({
      rows: [
        {
          did: sampleCard.did,
          name: sampleCard.name,
          description: sampleCard.description,
          capability: sampleCard.capability,
          endpoint: sampleCard.endpoint,
          version: sampleCard.version,
          source: sampleCard.source,
          external_id: sampleCard.externalId,
          source_url: sampleCard.sourceUrl,
          crawled_at: sampleCard.crawledAt,
          created_at: sampleCard.createdAt,
        },
        {
          // Malformed row — missing required fields; should be skipped, not error.
          did: 'malformed',
        },
      ],
      rowCount: 2,
    });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.listRecent(20);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toHaveLength(1);
      expect(r.value[0]!.did).toBe(sampleCard.did);
    }
  });

  it('returns db_unavailable on driver error', async () => {
    const pool = makeFakePool();
    pool.setQueryFn(async () => {
      throw makePgError('08006', undefined, 'connection terminated');
    });
    const storage = await createPostgresStorage({ pool });
    const r = await storage.listRecent(20);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('db_unavailable');
    }
  });
});
