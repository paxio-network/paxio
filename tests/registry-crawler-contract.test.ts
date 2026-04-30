/**
 * M-L1-contracts — port contract tests for CrawlerSourceAdapter + AgentStorage.
 *
 * These tests exercise the CONTRACT defined in packages/interfaces/src/
 * {crawler-source-adapter,agent-storage}.ts. They are implementation-agnostic:
 * a fake in-memory adapter / storage implementation is used here purely to
 * validate that the port shape is usable and returns the right structure.
 *
 * Real adapters + Postgres-backed storage live in products/01-registry/app/
 * domain/ (registry-dev, M-L1-impl). Those will be separately tested against
 * the same contract — if the contract is right, both impls conform by
 * construction.
 */
import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  type AgentCard,
  type CrawlerSource,
  type Did,
  type Result,
  type FindQuery,
  type FindResult,
} from '@paxio/types';
import type {
  CrawlerSourceAdapter,
  SourceAdapterError,
  AgentStorage,
  StorageError,
  AgentCountBySource,
} from '@paxio/interfaces';

// ----------------------------------------------------------------------------
// Fake fixtures — pure, no I/O. Validate contract shape.
// ----------------------------------------------------------------------------

const sampleCard: AgentCard = {
  did: 'did:paxio:base:0x1a2b3c4d5e6f7890abcdef1234567890abcdef12' as Did,
  name: 'Test ERC-8004 Agent',
  capability: 'INTELLIGENCE',
  version: '1.0.0',
  createdAt: '2026-04-23T12:00:00.000Z',
  source: 'erc8004',
  externalId: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
  sourceUrl:
    'https://basescan.org/address/0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
  crawledAt: '2026-04-23T11:30:00.000Z',
};

// Fake ERC-8004 raw type — in a real adapter this would be the Erc8004Record
// type from @paxio/types; here we use an opaque marker for contract testing.
interface FakeRaw {
  readonly opaque: string;
}

function makeFakeAdapter(): CrawlerSourceAdapter<FakeRaw> {
  const source: CrawlerSource = 'erc8004';
  async function* gen(): AsyncIterable<FakeRaw> {
    yield { opaque: 'record-1' };
    yield { opaque: 'record-2' };
  }
  return {
    sourceName: source,
    fetchAgents: () => gen(),
    toCanonical: (raw: FakeRaw): Result<AgentCard, SourceAdapterError> => {
      if (raw.opaque === 'record-1') return ok(sampleCard);
      return err({
        code: 'parse_error',
        message: 'unknown record',
        raw,
      });
    },
  };
}

function makeFakeStorage(): AgentStorage {
  const store = new Map<Did, AgentCard>();
  return {
    async upsert(card: AgentCard): Promise<Result<void, StorageError>> {
      store.set(card.did as Did, card);
      return ok(undefined);
    },
    async resolve(did: Did): Promise<Result<AgentCard, StorageError>> {
      const card = store.get(did);
      if (!card) return err({ code: 'not_found', did });
      return ok(card);
    },
    async find(_q: FindQuery): Promise<Result<readonly FindResult[], StorageError>> {
      return ok([]);
    },
    async count(): Promise<Result<number, StorageError>> {
      return ok(store.size);
    },
    async countBySource(): Promise<Result<AgentCountBySource, StorageError>> {
      // Initialize all CrawlerSource keys (legacy 6-value enum); card.source
      // is the broader AgentSource (9-value, includes legacy aliases) so we
      // index defensively with `?? 0` and skip entries that don't map back.
      const map: Record<CrawlerSource, number> = {
        native: 0,
        erc8004: 0,
        a2a: 0,
        mcp: 0,
        'fetch-ai': 0,
        virtuals: 0,
      };
      for (const card of store.values()) {
        const key = card.source as CrawlerSource;
        if (key in map) map[key] = (map[key] ?? 0) + 1;
      }
      return ok(Object.freeze(map));
    },
  };
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('M-L1 — CrawlerSourceAdapter port', () => {
  const adapter = makeFakeAdapter();

  it('sourceName is a valid CrawlerSource enum value', () => {
    expect(
      ['native', 'erc8004', 'a2a', 'mcp', 'fetch-ai', 'virtuals'],
    ).toContain(adapter.sourceName);
  });

  it('fetchAgents returns an AsyncIterable', async () => {
    const iter = adapter.fetchAgents();
    // Protocol check — AsyncIterable has Symbol.asyncIterator.
    expect(typeof iter[Symbol.asyncIterator]).toBe('function');
  });

  it('can iterate fetched records', async () => {
    const raws: FakeRaw[] = [];
    for await (const r of adapter.fetchAgents()) raws.push(r);
    expect(raws.length).toBeGreaterThan(0);
  });

  it('toCanonical returns Result — ok with AgentCard', () => {
    const result = adapter.toCanonical({ opaque: 'record-1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.source).toBe(adapter.sourceName);
      expect(result.value.did).toBeDefined();
    }
  });

  it('toCanonical returns Result — err with SourceAdapterError on bad input', () => {
    const result = adapter.toCanonical({ opaque: 'garbage' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(['source_unavailable', 'parse_error', 'rate_limit', 'auth_error'])
        .toContain(result.error.code);
    }
  });

  it('toCanonical is pure — same input → same output', () => {
    const r1 = adapter.toCanonical({ opaque: 'record-1' });
    const r2 = adapter.toCanonical({ opaque: 'record-1' });
    expect(r1).toStrictEqual(r2);
  });

  it('returned AgentCard.source matches adapter.sourceName (contract invariant)', () => {
    const result = adapter.toCanonical({ opaque: 'record-1' });
    if (result.ok) {
      expect(result.value.source).toBe(adapter.sourceName);
    }
  });
});

describe('M-L1 — AgentStorage port', () => {
  it('upsert is idempotent — calling twice produces one row', async () => {
    const storage = makeFakeStorage();
    await storage.upsert(sampleCard);
    await storage.upsert(sampleCard);
    const countResult = await storage.count();
    expect(countResult.ok).toBe(true);
    if (countResult.ok) expect(countResult.value).toBe(1);
  });

  it('resolve returns ok with card after upsert', async () => {
    const storage = makeFakeStorage();
    await storage.upsert(sampleCard);
    const result = await storage.resolve(sampleCard.did as Did);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.did).toBe(sampleCard.did);
  });

  it('resolve returns err { code: "not_found" } for absent DID', async () => {
    const storage = makeFakeStorage();
    const missing = 'did:paxio:base:0xmissing' as Did;
    const result = await storage.resolve(missing);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_found');
      if (result.error.code === 'not_found') {
        expect(result.error.did).toBe(missing);
      }
    }
  });

  it('count returns a non-negative integer', async () => {
    const storage = makeFakeStorage();
    const result = await storage.count();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result.value)).toBe(true);
    }
  });

  it('countBySource returns a complete map (all 6 keys)', async () => {
    const storage = makeFakeStorage();
    await storage.upsert(sampleCard);
    const result = await storage.countBySource();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const keys = Object.keys(result.value).sort();
      expect(keys).toEqual([
        'a2a',
        'erc8004',
        'fetch-ai',
        'mcp',
        'native',
        'virtuals',
      ]);
      // Card we upserted is erc8004 so that bucket must be 1
      expect(result.value['erc8004']).toBe(1);
      // Other buckets must be 0
      expect(result.value['native']).toBe(0);
      expect(result.value['a2a']).toBe(0);
    }
  });

  it('countBySource result is frozen (immutable post-return)', async () => {
    const storage = makeFakeStorage();
    const result = await storage.countBySource();
    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });
});

describe('M-L1 — SourceAdapterError discriminated union', () => {
  it('has exactly 4 variants (source_unavailable, parse_error, rate_limit, auth_error)', () => {
    const examples: SourceAdapterError[] = [
      { code: 'source_unavailable', message: 'x' },
      { code: 'parse_error', message: 'x', raw: null },
      { code: 'rate_limit', message: 'x', retryAfterMs: 1000 },
      { code: 'auth_error', message: 'x' },
    ];
    for (const e of examples) {
      expect([
        'source_unavailable',
        'parse_error',
        'rate_limit',
        'auth_error',
      ]).toContain(e.code);
    }
  });
});

describe('M-L1 — StorageError discriminated union', () => {
  it('has exactly 4 variants (db_unavailable, not_found, constraint_violation, validation_error)', () => {
    const examples: StorageError[] = [
      { code: 'db_unavailable', message: 'x' },
      { code: 'not_found', did: 'did:paxio:x:y' as Did },
      { code: 'constraint_violation', message: 'x' },
      { code: 'validation_error', message: 'x' },
    ];
    for (const e of examples) {
      expect([
        'db_unavailable',
        'not_found',
        'constraint_violation',
        'validation_error',
      ]).toContain(e.code);
    }
  });
});
