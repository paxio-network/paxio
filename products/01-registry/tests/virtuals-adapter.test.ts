// M-L1-expansion RED — Virtuals Protocol GraphQL adapter.
//
// Real impl will replace stub. POST GraphQL with after-cursor pagination,
// terminate on hasNextPage=false or empty nodes.

import { describe, it, expect } from 'vitest';
import { createVirtualsAdapter } from '../app/domain/sources/virtuals.js';
import type { VirtualsAgent } from '@paxio/types';

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
      const r = responses[i] ?? {
        status: 200,
        headers: new Map(),
        body: { data: { agents: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } },
      };
      i += 1;
      return r;
    },
  };
};

const validAgent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Aixbt',
  ticker: 'AIXBT',
  tokenContract: '0x' + 'a'.repeat(40),
  category: 'gaming',
  mcap: 50_000_000,
  socials: [],
  createdAt: '2026-04-20T10:00:00.000Z',
};

const pageWith = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) => ({
  status: 200,
  headers: new Map(),
  body: { data: { agents: { nodes, pageInfo: { hasNextPage, endCursor } } } },
});

describe('M-L1-expansion createVirtualsAdapter — factory', () => {
  it('returns frozen adapter with sourceName=virtuals + methods', () => {
    const adapter = createVirtualsAdapter({ httpClient: fakeHttp([]) });
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(adapter.sourceName).toBe('virtuals');
    expect(typeof adapter.fetchAgents).toBe('function');
    expect(typeof adapter.toCanonical).toBe('function');
  });
});

describe('M-L1-expansion Virtuals fetchAgents — GraphQL after-cursor pagination', () => {
  it('POSTs to api.virtuals.io/graphql with query body', async () => {
    const calls: { url: string; method: string; body: unknown }[] = [];
    const httpClient: HttpClient = {
      async fetch(req) {
        calls.push({ url: req.url, method: req.method, body: req.body });
        return pageWith([]);
      },
    };
    const adapter = createVirtualsAdapter({ httpClient });
    for await (const _ of adapter.fetchAgents()) { /* noop */ }
    expect(calls[0].url).toMatch(/api\.virtuals\.io\/graphql/);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toBeDefined();
  });

  it('yields one record per node', async () => {
    const adapter = createVirtualsAdapter({
      httpClient: fakeHttp([
        pageWith([validAgent, { ...validAgent, id: '550e8400-e29b-41d4-a716-446655440001' }]),
      ]),
    });

    const records: VirtualsAgent[] = [];
    for await (const r of adapter.fetchAgents()) records.push(r);
    expect(records.length).toBe(2);
  });

  it('paginates while hasNextPage=true', async () => {
    let page = 0;
    const httpClient: HttpClient = {
      async fetch() {
        page += 1;
        if (page === 1) return pageWith([validAgent], true, 'cursor-1');
        if (page === 2) return pageWith([{ ...validAgent, id: '550e8400-e29b-41d4-a716-446655440002' }], true, 'cursor-2');
        return pageWith([], false);
      },
    };
    const adapter = createVirtualsAdapter({ httpClient });
    let count = 0;
    for await (const _ of adapter.fetchAgents()) count += 1;
    expect(count).toBe(2);
    expect(page).toBeGreaterThanOrEqual(3);
  });

  it('passes endCursor as `after` argument in subsequent requests', async () => {
    const calls: unknown[] = [];
    let p = 0;
    const httpClient: HttpClient = {
      async fetch(req) {
        calls.push(req.body);
        p += 1;
        if (p === 1) return pageWith([validAgent], true, 'CURSOR-AFTER-PAGE-1');
        return pageWith([], false);
      },
    };
    const adapter = createVirtualsAdapter({ httpClient });
    for await (const _ of adapter.fetchAgents()) { /* noop */ }

    // Second call's body string should reference the cursor
    const body2 = JSON.stringify(calls[1]);
    expect(body2).toContain('CURSOR-AFTER-PAGE-1');
  });

  it('terminates on hasNextPage=false', async () => {
    const adapter = createVirtualsAdapter({
      httpClient: fakeHttp([
        pageWith([validAgent], false, null),
      ]),
    });
    let count = 0;
    for await (const _ of adapter.fetchAgents()) count += 1;
    expect(count).toBe(1);
  });

  it('terminates on empty nodes (defence-in-depth)', async () => {
    const adapter = createVirtualsAdapter({
      httpClient: fakeHttp([pageWith([], true, 'fake-cursor')]),
    });
    let count = 0;
    for await (const _ of adapter.fetchAgents()) count += 1;
    expect(count).toBe(0);
  });

  it('skips invalid nodes (Zod fail) without aborting', async () => {
    const adapter = createVirtualsAdapter({
      httpClient: fakeHttp([
        pageWith([
          validAgent,
          { id: 'not-a-uuid', name: 'bad' }, // invalid
          { ...validAgent, id: '550e8400-e29b-41d4-a716-446655440003' },
        ]),
      ]),
    });
    let count = 0;
    for await (const _ of adapter.fetchAgents()) count += 1;
    expect(count).toBe(2);
  });

  it('handles GraphQL errors array (terminates on global error)', async () => {
    const adapter = createVirtualsAdapter({
      httpClient: fakeHttp([
        {
          status: 200,
          headers: new Map(),
          body: { data: null, errors: [{ message: 'rate limit', extensions: { code: 'RATE_LIMITED' } }] },
        },
      ]),
    });
    let threw = false;
    let count = 0;
    try {
      for await (const _ of adapter.fetchAgents()) count += 1;
    } catch { threw = true; }
    expect(threw).toBe(false);
    expect(count).toBe(0);
  });

  it('respects SAFETY_MAX_PAGES (no runaway pagination)', async () => {
    const httpClient: HttpClient = {
      async fetch() {
        // Always returns 1 node + hasNextPage=true
        return pageWith([validAgent], true, 'cursor');
      },
    };
    const adapter = createVirtualsAdapter({ httpClient });
    let count = 0;
    for await (const _ of adapter.fetchAgents()) {
      count += 1;
      if (count > 10000) break;
    }
    expect(count).toBeLessThanOrEqual(10000);
    expect(count).toBeGreaterThan(0);
  });

  it('terminates on 5xx after single retry', async () => {
    let calls = 0;
    const httpClient: HttpClient = {
      async fetch() {
        calls += 1;
        return { status: 503, headers: new Map(), body: null };
      },
    };
    const adapter = createVirtualsAdapter({ httpClient });
    for await (const _ of adapter.fetchAgents()) { /* noop */ }
    expect(calls).toBeLessThanOrEqual(2);
  });
});
