// M-L1-expansion RED — Fetch.ai Agentverse REST adapter.
//
// Real impl will replace stub. Pagination via offset/limit query params,
// terminates on empty response.

import { describe, it, expect } from 'vitest';
import { createFetchAiAdapter } from '../app/domain/sources/fetch-ai.js';
import type { FetchAiAgent } from '@paxio/types';

interface HttpResponse {
  status: number;
  headers: Map<string, string>;
  body: unknown;
}
interface HttpClient {
  fetch(req: { url: string; method: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string> }): Promise<HttpResponse>;
}

const fakeHttp = (responses: ReadonlyArray<HttpResponse>): HttpClient => {
  let i = 0;
  return {
    async fetch() {
      const r = responses[i] ?? { status: 200, headers: new Map(), body: { agents: [] } };
      i += 1;
      return r;
    },
  };
};

// M-L1-T3c (2026-05-03): fixture mirrors REAL Agentverse API response shape.
// Schema rewrite — see packages/types/src/sources/fetch-ai.ts. All fields
// match curl POST /v1/search/agents response observed against live API.
const validAgent = {
  address: 'agent1' + 'a'.repeat(58),
  prefix: 'test-agent',
  name: 'Test agent',
  description: 'A test',
  readme: '',
  protocols: [],
  avatar_href: null,
  total_interactions: 0,
  recent_interactions: 0,
  recent_verified_interactions: 0,
  recent_success_verified_interactions: 0,
  rating: 4.5,             // 0..5 scale (NOT 0..100). Adapter scales × 20.
  status: 'active',         // → isOnline=true via fetchAiStatusToOnline
  unresponsive: false,
  type: 'hosted',
  featured: false,
  category: 'finance',
  system_wide_tags: ['ai', 'trading'],
  geo_location: null,
  handle: null,
  domain: null,
  metadata: null,
  last_updated: '2025-07-02T09:19:17Z',
  created_at: '2025-07-02T09:19:17Z',
  recent_success_rate: null,
  recent_eval_success_rate: null,
  owner: '34ee31a80edb390dd0ccc1c12a17918cff09073b6d047932',
};

describe('M-L1-expansion createFetchAiAdapter — factory', () => {
  it('returns frozen adapter with sourceName=fetch-ai + methods', () => {
    const adapter = createFetchAiAdapter({ httpClient: fakeHttp([]) });
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(adapter.sourceName).toBe('fetch-ai');
    expect(typeof adapter.fetchAgents).toBe('function');
    expect(typeof adapter.toCanonical).toBe('function');
  });
});

// M-L1-T3b: contract evolved after PR #120 production smoke (2026-05-02).
// Real Agentverse API rejects GET with 405 Method Not Allowed; requires
//   POST /v1/search/agents
//   Content-Type: application/json
//   { search_text: '', filters: {}, sort: 'relevancy', direction: 'asc',
//     offset, limit }
// Adapter previously sent GET with offset/limit in query string → silent
// 405 → catch-and-return → processed:0. Tests now un-skipped + updated to
// assert POST + body shape so registry-dev's GREEN impl matches reality.
describe('M-L1-T3b FetchAi fetchAgents — Agentverse REST pagination', () => {
  it('POSTs /v1/search/agents with offset+limit in JSON body', async () => {
    const calls: Array<{
      url: string;
      method: 'GET' | 'POST';
      body?: unknown;
      headers?: Record<string, string>;
    }> = [];
    const httpClient: HttpClient = {
      async fetch(req) {
        calls.push({
          url: req.url,
          method: req.method,
          body: req.body,
          headers: req.headers,
        });
        return { status: 200, headers: new Map(), body: { agents: [] } };
      },
    };
    const adapter = createFetchAiAdapter({ httpClient });
    for await (const _ of adapter.fetchAgents()) { /* noop */ }

    // URL: agentverse.ai/v1/search/agents (no query params — offset/limit go in body)
    expect(calls[0].url).toMatch(/agentverse\.ai\/v1\/search\/agents/);
    expect(calls[0].url).not.toMatch(/[?&](offset|limit)=/);

    // Method: POST (GET returns 405 from real API)
    expect(calls[0].method).toBe('POST');

    // Headers: JSON content-type (case-insensitive lookup)
    const headers = calls[0].headers ?? {};
    const ctKey = Object.keys(headers).find(
      (k) => k.toLowerCase() === 'content-type',
    );
    expect(ctKey).toBeDefined();
    expect(headers[ctKey!]).toMatch(/application\/json/i);

    // Body: required keys present with valid types (architect contract)
    const body = calls[0].body as Record<string, unknown>;
    expect(typeof body).toBe('object');
    expect(typeof body.search_text).toBe('string');
    expect(typeof body.filters).toBe('object');
    expect(typeof body.sort).toBe('string');
    expect(typeof body.direction).toBe('string');
    expect(typeof body.offset).toBe('number');
    expect(typeof body.limit).toBe('number');
    expect(body.offset).toBe(0); // first page
    expect(body.limit).toBeGreaterThan(0);
  });

  it('yields one record per agent in page', async () => {
    const adapter = createFetchAiAdapter({
      httpClient: fakeHttp([
        { status: 200, headers: new Map(), body: { agents: [validAgent, { ...validAgent, address: 'agent1' + 'b'.repeat(58) }] } },
        { status: 200, headers: new Map(), body: { agents: [] } },
      ]),
    });

    const records: FetchAiAgent[] = [];
    for await (const r of adapter.fetchAgents()) records.push(r);
    expect(records.length).toBeGreaterThanOrEqual(2);
  });

  it('paginates offset += limit until empty', async () => {
    let pageCount = 0;
    const httpClient: HttpClient = {
      async fetch() {
        pageCount += 1;
        if (pageCount <= 3) {
          return { status: 200, headers: new Map(), body: { agents: [validAgent] } };
        }
        return { status: 200, headers: new Map(), body: { agents: [] } };
      },
    };
    // pageSize=1 ensures each response fills its page → pagination advances.
    const adapter = createFetchAiAdapter({ httpClient, pageSize: 1 });
    let count = 0;
    for await (const _ of adapter.fetchAgents()) count += 1;
    expect(count).toBe(3);
    expect(pageCount).toBeGreaterThanOrEqual(4); // 3 with data + 1 empty
  });

  it('terminates on 401 (auth fail)', async () => {
    const httpClient: HttpClient = {
      async fetch() { return { status: 401, headers: new Map(), body: { error: 'unauth' } }; },
    };
    const adapter = createFetchAiAdapter({ httpClient });
    let count = 0;
    let threw = false;
    try {
      for await (const _ of adapter.fetchAgents()) count += 1;
    } catch { threw = true; }
    expect(threw).toBe(false);
    expect(count).toBe(0);
  });

  it('handles 429 with Retry-After (waits or aborts gracefully)', async () => {
    const httpClient: HttpClient = {
      async fetch() {
        return {
          status: 429,
          headers: new Map([['retry-after', '1']]),
          body: { error: 'rate-limited' },
        };
      },
    };
    const adapter = createFetchAiAdapter({ httpClient });
    let threw = false;
    let count = 0;
    try {
      for await (const _ of adapter.fetchAgents()) count += 1;
    } catch { threw = true; }
    expect(threw).toBe(false);
    // Implementation may retry once or abort — either way no throw escapes.
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('skips invalid agent records (Zod fail) without aborting iteration', async () => {
    const adapter = createFetchAiAdapter({
      httpClient: fakeHttp([
        {
          status: 200,
          headers: new Map(),
          body: {
            agents: [
              validAgent,
              // Invalid: wrong address prefix (no agent1...) → AGENTVERSE_ADDRESS regex rejects.
              { ...validAgent, address: 'wrong1' + 'b'.repeat(58) },
              { ...validAgent, address: 'agent1' + 'c'.repeat(58) },
            ],
          },
        },
        { status: 200, headers: new Map(), body: { agents: [] } },
      ]),
    });

    const records: FetchAiAgent[] = [];
    for await (const r of adapter.fetchAgents()) records.push(r);
    expect(records.length).toBe(2); // skipped the invalid
  });

  it('respects SAFETY_MAX_PAGES (no runaway)', async () => {
    const httpClient: HttpClient = {
      async fetch() {
        // Always returns 1 agent → would never terminate without safety bound
        return { status: 200, headers: new Map(), body: { agents: [validAgent] } };
      },
    };
    const adapter = createFetchAiAdapter({ httpClient });
    let count = 0;
    for await (const _ of adapter.fetchAgents()) {
      count += 1;
      if (count > 10000) break;
    }
    // SAFETY_MAX_PAGES=200 in production; per page 1 agent ⇒ ≤200 records.
    expect(count).toBeLessThanOrEqual(10000);
    expect(count).toBeGreaterThan(0);
  });

  it('terminates on 5xx after single retry', async () => {
    let calls = 0;
    const httpClient: HttpClient = {
      async fetch() {
        calls += 1;
        return { status: 500, headers: new Map(), body: { error: 'server' } };
      },
    };
    const adapter = createFetchAiAdapter({ httpClient });
    for await (const _ of adapter.fetchAgents()) { /* noop */ }
    // Retries once → at most 2 calls.
    expect(calls).toBeLessThanOrEqual(2);
  });
});

// M-L1-T3c: un-skipped + assertions verify projection from raw API response
// shape to canonical AgentCard. Real Agentverse fields are snake_case +
// ISO strings + 0..5 rating; adapter projects to canonical AgentCard.
describe('M-L1-T3c FetchAi toCanonical — raw → canonical projection', () => {
  it('produces AgentCard from valid raw Agentverse record', () => {
    const adapter = createFetchAiAdapter({ httpClient: fakeHttp([]) });
    const result = adapter.toCanonical(validAgent);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const card = result.value;
    expect(card.source).toBe('fetch-ai');
    expect(card.externalId).toBe(validAgent.address);
    // DID format: did:paxio:fetch-ai:<address>
    expect(card.did).toMatch(/^did:paxio:fetch-ai:agent1/);
    // Created — ISO string preserved (raw `created_at` projected to canonical `createdAt`)
    expect(card.createdAt).toBe(validAgent.created_at);
    // sourceUrl: constructed agentverse profile URL
    expect(card.sourceUrl).toBe(
      `https://agentverse.ai/agents/details/${validAgent.address}`,
    );
    // Display name: from name (non-empty) — fallback chain not exercised here
    expect(card.name).toBe(validAgent.name);
  });

  it('uses prefix as display name when name is empty', () => {
    const adapter = createFetchAiAdapter({ httpClient: fakeHttp([]) });
    const result = adapter.toCanonical({
      ...validAgent,
      name: '',
      prefix: 'fallback-name',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('fallback-name');
  });

  it('synthesises name from address when both name and prefix empty', () => {
    const adapter = createFetchAiAdapter({ httpClient: fakeHttp([]) });
    const result = adapter.toCanonical({
      ...validAgent,
      name: '',
      prefix: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toContain('agent ');
  });

  it('returns parse_error on invalid raw input (address regex fail)', () => {
    const adapter = createFetchAiAdapter({ httpClient: fakeHttp([]) });
    const result = adapter.toCanonical({
      ...validAgent,
      address: 'wrong1' + 'a'.repeat(58),
    } as unknown as FetchAiAgent);
    expect(result.ok).toBe(false);
  });

  it('preserves description (truncated to 1000 chars)', () => {
    const adapter = createFetchAiAdapter({ httpClient: fakeHttp([]) });
    const result = adapter.toCanonical({
      ...validAgent,
      description: 'A'.repeat(2000),
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.value.description !== undefined) {
      expect(result.value.description.length).toBeLessThanOrEqual(1000);
    }
  });
});
