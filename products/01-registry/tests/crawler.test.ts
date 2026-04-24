// runCrawler — orchestration unit tests.
//
// Drives the runner with synthetic adapters + storages so we can assert:
//   - happy path: every yielded raw → toCanonical → upsert
//   - parse errors counted but iteration continues
//   - storage errors counted but iteration continues
//   - source-mismatch (adapter yields wrong source) counted as parseError
//   - source-throw caught and reported once
//   - maxRecords budget honoured
//   - progress callback fires every N

import { describe, it, expect, vi } from 'vitest';
import { runCrawler } from '../app/domain/crawler.js';
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
  AgentStorage,
  StorageError,
  AgentCountBySource,
  CrawlerSourceAdapter,
  SourceAdapterError,
} from '@paxio/interfaces';

const buildCard = (n: number, source: CrawlerSource = 'mcp'): AgentCard => ({
  did: `did:paxio:mcp:agent-${n}` as Did,
  name: `Agent ${n}`,
  capability: 'INTELLIGENCE',
  version: '0.0.1',
  createdAt: '2026-04-23T00:00:00.000Z',
  source,
  externalId: `agent-${n}`,
});

interface FakeStorage extends AgentStorage {
  readonly upsertedDids: string[];
}

const makeFakeStorage = (
  failOn: ReadonlySet<string> = new Set(),
): FakeStorage => {
  const upsertedDids: string[] = [];
  const store = new Map<Did, AgentCard>();
  return {
    upsertedDids,
    async upsert(card: AgentCard): Promise<Result<void, StorageError>> {
      if (failOn.has(card.did)) {
        return err({ code: 'db_unavailable', message: 'simulated' });
      }
      upsertedDids.push(card.did);
      store.set(card.did as Did, card);
      return ok(undefined);
    },
    async resolve(did: Did): Promise<Result<AgentCard, StorageError>> {
      const c = store.get(did);
      if (!c) return err({ code: 'not_found', did });
      return ok(c);
    },
    async find(_q: FindQuery): Promise<Result<readonly FindResult[], StorageError>> {
      return ok([]);
    },
    async count(): Promise<Result<number, StorageError>> {
      return ok(store.size);
    },
    async countBySource(): Promise<Result<AgentCountBySource, StorageError>> {
      return ok(
        Object.freeze({
          native: 0,
          erc8004: 0,
          a2a: 0,
          mcp: store.size,
          'fetch-ai': 0,
          virtuals: 0,
        }),
      );
    },
  };
};

const makeAdapter = (
  cards: ReadonlyArray<AgentCard>,
  opts: {
    parseErrorIndices?: ReadonlySet<number>;
    fetchThrows?: boolean;
    sourceName?: CrawlerSource;
  } = {},
): CrawlerSourceAdapter<AgentCard> => {
  const sourceName = opts.sourceName ?? 'mcp';
  return {
    sourceName,
    async *fetchAgents(): AsyncIterable<AgentCard> {
      if (opts.fetchThrows) throw new Error('upstream offline');
      for (const c of cards) yield c;
    },
    toCanonical(raw: AgentCard): Result<AgentCard, SourceAdapterError> {
      const idx = cards.indexOf(raw);
      if (opts.parseErrorIndices?.has(idx)) {
        return err({ code: 'parse_error', message: 'simulated', raw });
      }
      return ok(raw);
    },
  };
};

describe('runCrawler — happy path', () => {
  it('upserts each fetched record and returns frozen summary', async () => {
    const cards = [buildCard(1), buildCard(2), buildCard(3)];
    const storage = makeFakeStorage();
    const adapter = makeAdapter(cards);
    const summary = await runCrawler({ adapter, storage });
    expect(Object.isFrozen(summary)).toBe(true);
    expect(summary.source).toBe('mcp');
    expect(summary.processed).toBe(3);
    expect(summary.upserted).toBe(3);
    expect(summary.parseErrors).toBe(0);
    expect(summary.storageErrors).toBe(0);
    expect(summary.sourceErrors).toBe(0);
    expect(summary.stoppedReason).toBe('completed');
    expect(storage.upsertedDids).toEqual(cards.map((c) => c.did));
  });

  it('returns 0/0/0 summary for empty source', async () => {
    const storage = makeFakeStorage();
    const adapter = makeAdapter([]);
    const summary = await runCrawler({ adapter, storage });
    expect(summary.processed).toBe(0);
    expect(summary.upserted).toBe(0);
    expect(summary.stoppedReason).toBe('completed');
  });
});

describe('runCrawler — error counters', () => {
  it('counts parse errors but continues iteration', async () => {
    const cards = [buildCard(1), buildCard(2), buildCard(3)];
    const storage = makeFakeStorage();
    const adapter = makeAdapter(cards, { parseErrorIndices: new Set([1]) });
    const summary = await runCrawler({ adapter, storage });
    expect(summary.processed).toBe(3);
    expect(summary.upserted).toBe(2);
    expect(summary.parseErrors).toBe(1);
    expect(summary.stoppedReason).toBe('completed');
  });

  it('counts storage errors but continues iteration', async () => {
    const cards = [buildCard(1), buildCard(2), buildCard(3)];
    const storage = makeFakeStorage(new Set([cards[1]!.did]));
    const adapter = makeAdapter(cards);
    const summary = await runCrawler({ adapter, storage });
    expect(summary.processed).toBe(3);
    expect(summary.upserted).toBe(2);
    expect(summary.storageErrors).toBe(1);
    expect(summary.parseErrors).toBe(0);
  });

  it('counts as parseError when adapter yields wrong-source card', async () => {
    // Adapter says mcp but yields fetch-ai cards — defence against buggy adapter.
    const cards = [buildCard(1, 'fetch-ai')];
    const storage = makeFakeStorage();
    const adapter = makeAdapter(cards, { sourceName: 'mcp' });
    const summary = await runCrawler({ adapter, storage });
    expect(summary.parseErrors).toBe(1);
    expect(summary.upserted).toBe(0);
  });

  it('catches source throw and ends with source_error reason', async () => {
    const storage = makeFakeStorage();
    const adapter = makeAdapter([], { fetchThrows: true });
    const summary = await runCrawler({ adapter, storage });
    expect(summary.sourceErrors).toBe(1);
    expect(summary.stoppedReason).toBe('source_error');
    expect(summary.processed).toBe(0);
  });
});

describe('runCrawler — budget + progress', () => {
  it('honours maxRecords budget', async () => {
    const cards = Array.from({ length: 50 }, (_, i) => buildCard(i));
    const storage = makeFakeStorage();
    const adapter = makeAdapter(cards);
    const summary = await runCrawler({ adapter, storage, maxRecords: 10 });
    expect(summary.processed).toBe(10);
    expect(summary.upserted).toBe(10);
    expect(summary.stoppedReason).toBe('max_records');
  });

  it('fires onProgress every N processed records', async () => {
    const cards = Array.from({ length: 25 }, (_, i) => buildCard(i));
    const storage = makeFakeStorage();
    const adapter = makeAdapter(cards);
    const calls: number[] = [];
    await runCrawler({
      adapter,
      storage,
      progressEvery: 10,
      onProgress: (p) => calls.push(p),
    });
    expect(calls).toEqual([10, 20]);
  });

  it('uses noop logger when none provided (does not throw)', async () => {
    const storage = makeFakeStorage();
    const adapter = makeAdapter([buildCard(1)]);
    const summary = await runCrawler({ adapter, storage });
    expect(summary.upserted).toBe(1);
  });

  it('logger receives start, end, and per-error events', async () => {
    const storage = makeFakeStorage();
    const adapter = makeAdapter([buildCard(1)], { parseErrorIndices: new Set([0]) });
    const info = vi.fn();
    const warn = vi.fn();
    await runCrawler({ adapter, storage, logger: { info, warn } });
    expect(info).toHaveBeenCalledWith('crawler_start', expect.any(Object));
    expect(info).toHaveBeenCalledWith('crawler_end', expect.any(Object));
    expect(warn).toHaveBeenCalledWith('crawler_parse_error', expect.any(Object));
  });
});
