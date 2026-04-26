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

describe('M-L1-expansion FetchAi fetchAgents — Agentverse REST pagination', () => {
  it('GETs /v1/search/agents with offset/limit', async () => {
    const calls: string[] = [];
    const httpClient: HttpClient = {
      async fetch(req) {
        calls.push(req.url);
        return { status: 200, headers: new Map(), body: { agents: [] } };
      },
    };
    const adapter = createFetchAiAdapter({ httpClient });
    for await (const _ of adapter.fetchAgents()) { /* noop */ }
    expect(calls[0]).toMatch(/agentverse\.ai\/v1\/search\/agents/);
    expect(calls[0]).toMatch(/(offset|limit)/);
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

describe('M-L1-expansion FetchAi toCanonical — pure (regression check)', () => {
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
