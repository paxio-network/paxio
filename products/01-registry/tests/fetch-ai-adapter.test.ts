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

const validAgent = {
  address: 'fetch1' + 'a'.repeat(38),
  name: 'Test agent',
  description: 'A test',
  category: 'finance',
  registeredAt: '2026-04-20T10:00:00.000Z',
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
        { status: 200, headers: new Map(), body: { agents: [validAgent, { ...validAgent, address: 'fetch1' + 'b'.repeat(38) }] } },
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
    const adapter = createFetchAiAdapter({ httpClient });
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
              { address: 'invalid-no-fetch1', name: 'bad', registeredAt: '2026-04-20T10:00:00.000Z' },
              { ...validAgent, address: 'fetch1' + 'c'.repeat(38) },
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

// TD-34: skip — same as erc8004 toCanonical, fixture-vs-stub-Zod drift.
// Registry-dev T-4 will reconcile.
describe.skip('M-L1-expansion FetchAi toCanonical — pure (regression check)', () => {
  it('produces AgentCard from valid FetchAiAgent', () => {
    const adapter = createFetchAiAdapter({ httpClient: fakeHttp([]) });
    const result = adapter.toCanonical(validAgent);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.source).toBe('fetch-ai');
      expect(result.value.did).toMatch(/^did:paxio:fetch-ai:/);
    }
  });

  it('returns parse_error on invalid input', () => {
    const adapter = createFetchAiAdapter({ httpClient: fakeHttp([]) });
    const result = adapter.toCanonical({ address: 'not-fetch', name: 'bad', registeredAt: 'now' });
    expect(result.ok).toBe(false);
  });
});
