// Stub adapter tests — the 4 stubs (ERC-8004, A2A, Fetch.ai, Virtuals)
// don't crawl real sources yet, but they DO implement toCanonical for
// downstream testability. Validate:
//   - factory returns frozen object
//   - sourceName is correct
//   - fetchAgents is an empty AsyncIterable
//   - toCanonical projects valid raw → AgentCard with matching source
//   - toCanonical returns parse_error for malformed input
//   - source invariant: card.source === adapter.sourceName

import { describe, it, expect } from 'vitest';
import { createErc8004Adapter } from '../app/domain/sources/erc8004.js';
import { createA2aAdapter } from '../app/domain/sources/a2a.js';
import { createFetchAiAdapter } from '../app/domain/sources/fetch-ai.js';
import { createVirtualsAdapter } from '../app/domain/sources/virtuals.js';
import type {
  Erc8004Record,
  A2aAgentCard,
  FetchAiAgent,
  VirtualsAgent,
} from '@paxio/types';

// ---------------------------------------------------------------------------
// ERC-8004
// ---------------------------------------------------------------------------

const validErc8004: Erc8004Record = {
  chainId: 8453,
  contractAddress: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
  agentAddress: '0xABcDef1234567890abcdef1234567890ABcDeF12',
  name: 'ERC-8004 Agent',
  serviceEndpoint: 'https://agent.example.com',
  capabilityHash: '0x' + 'a'.repeat(64),
  blockNumber: 12345678,
  transactionHash: '0x' + 'b'.repeat(64),
  registeredAt: 1714000000,
};

describe('erc8004 stub adapter', () => {
  const adapter = createErc8004Adapter();

  it('sourceName=erc8004 and frozen', () => {
    expect(adapter.sourceName).toBe('erc8004');
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it('fetchAgents yields zero records (stub)', async () => {
    const collected: Erc8004Record[] = [];
    for await (const r of adapter.fetchAgents()) collected.push(r);
    expect(collected.length).toBe(0);
  });

  it('toCanonical projects valid record with source=erc8004', () => {
    const r = adapter.toCanonical(validErc8004);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.source).toBe('erc8004');
      expect(r.value.did).toBe(
        'did:paxio:erc8004:8453-0xabcdef1234567890abcdef1234567890abcdef12',
      );
      expect(r.value.externalId).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef12',
      );
      expect(r.value.createdAt).toBe(
        new Date(validErc8004.registeredAt * 1000).toISOString(),
      );
    }
  });

  it('toCanonical returns parse_error on invalid contractAddress', () => {
    const r = adapter.toCanonical({ ...validErc8004, contractAddress: '0xabc' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('parse_error');
  });

  it('is deterministic', () => {
    const a = adapter.toCanonical(validErc8004);
    const b = adapter.toCanonical(validErc8004);
    expect(a).toStrictEqual(b);
  });
});

// ---------------------------------------------------------------------------
// A2A
// ---------------------------------------------------------------------------

const validA2a: A2aAgentCard = {
  cardUrl: 'https://agent.example.com/.well-known/agent.json',
  name: 'A2A Agent',
  description: 'Test',
  version: '1.0.0',
  url: 'https://agent.example.com/rpc',
  capabilities: [{ name: 'tool-use' }],
  provider: { organization: 'Example' },
};

describe('a2a adapter — sourceName + toCanonical (post-T-3-round2)', () => {
  // M-L1 T-3 round 2 (commit 529facb): createA2aAdapter is no longer a zero-arg
  // stub; it requires deps (httpClient, seeds, maxDepth, maxHosts). These tests
  // pin sourceName + toCanonical projection only — fetchAgents behavior is
  // covered by a2a-adapter.test.ts (well-known / peers BFS / dedup, 9/9 GREEN).
  const noopHttpClient = {
    async fetch() {
      return { status: 404, headers: new Map<string, string>(), body: null };
    },
  };
  const adapter = createA2aAdapter({
    httpClient: noopHttpClient,
    seeds: [],
    maxDepth: 0,
    maxHosts: 1,
  });

  it('sourceName=a2a and frozen', () => {
    expect(adapter.sourceName).toBe('a2a');
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it('fetchAgents yields zero when seeds=[] (no discovery target)', async () => {
    const collected: A2aAgentCard[] = [];
    for await (const r of adapter.fetchAgents()) collected.push(r);
    expect(collected.length).toBe(0);
  });

  it('toCanonical projects valid card with source=a2a', () => {
    const r = adapter.toCanonical(validA2a);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.source).toBe('a2a');
      expect(r.value.did).toMatch(/^did:paxio:a2a:agent\.example\.com/);
      expect(r.value.endpoint).toBe(validA2a.url);
      expect(r.value.externalId).toBe(validA2a.cardUrl);
    }
  });

  it('toCanonical returns parse_error on missing provider', () => {
    const bad = {
      ...validA2a,
      provider: { url: 'https://example.com' },
    } as unknown as A2aAgentCard;
    const r = adapter.toCanonical(bad);
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fetch.ai
// ---------------------------------------------------------------------------
//
// M-L1-T3c (2026-05-03): fetch-ai is no longer a stub — real Agentverse REST
// adapter ships in this milestone. Comprehensive coverage moved to
// products/01-registry/tests/fetch-ai-adapter.test.ts (factory + pagination
// + error handling + toCanonical projection). Block kept here as a thin
// integration smoke (factory is part of canonical adapters listed by name).

describe('fetch-ai real adapter (smoke)', () => {
  const adapter = createFetchAiAdapter({ httpClient: { fetch: async () => ({ status: 200, headers: new Map(), body: { agents: [] } }) } });

  it('sourceName=fetch-ai and frozen', () => {
    expect(adapter.sourceName).toBe('fetch-ai');
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it('fetchAgents yields zero from empty mock httpClient', async () => {
    const collected: FetchAiAgent[] = [];
    for await (const r of adapter.fetchAgents()) collected.push(r);
    expect(collected.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Virtuals
// ---------------------------------------------------------------------------

const validVirtuals: VirtualsAgent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Virtuals Agent',
  ticker: 'AIXBT',
  tokenContract: '0xabcdef1234567890abcdef1234567890abcdef12',
  creatorAddress: '0x1234567890abcdef1234567890abcdef12345678',
  socials: [],
  mcapUsd: null,
  volume24hUsd: null,
  profileUrl: 'https://virtuals.io/agents/aixbt',
  launchedAt: 1714000000000,
};

describe('virtuals stub adapter', () => {
  const adapter = createVirtualsAdapter();

  it('sourceName=virtuals and frozen', () => {
    expect(adapter.sourceName).toBe('virtuals');
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it('fetchAgents yields zero (stub)', async () => {
    const collected: VirtualsAgent[] = [];
    for await (const r of adapter.fetchAgents()) collected.push(r);
    expect(collected.length).toBe(0);
  });

  it('toCanonical projects valid agent with source=virtuals', () => {
    const r = adapter.toCanonical(validVirtuals);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.source).toBe('virtuals');
      expect(r.value.did).toBe(`did:paxio:virtuals:${validVirtuals.id}`);
      expect(r.value.externalId).toBe(validVirtuals.id);
      expect(r.value.sourceUrl).toBe(validVirtuals.profileUrl);
    }
  });

  it('toCanonical returns parse_error on non-UUID id', () => {
    const r = adapter.toCanonical({ ...validVirtuals, id: 'not-a-uuid' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('parse_error');
  });
});
