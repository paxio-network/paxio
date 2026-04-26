// M-L1-expansion RED — A2A (Google Agent2Agent) discovery adapter.
//
// Real impl will replace stub. Discovery model: GET <host>/.well-known/agent.json
// for each seed host, then BFS-traverse the optional `peers[]` field up to
// max depth.

import { describe, it, expect } from 'vitest';
import { createA2aAdapter } from '../app/domain/sources/a2a.js';

interface HttpResponse {
  status: number;
  headers: Map<string, string>;
  body: unknown;
}
interface HttpClient {
  fetch(req: { url: string; method: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string> }): Promise<HttpResponse>;
}

const SEED_HOST = 'https://example.com';

const validAgentJson = {
  name: 'Example Agent',
  description: 'Test',
  version: '1.0.0',
  url: 'https://example.com/rpc',
  capabilities: [{ name: 'search' }],
  provider: { organization: 'Example Inc', url: 'https://example.com' },
};

describe('M-L1-expansion createA2aAdapter — factory', () => {
  it('returns frozen adapter with sourceName=a2a + methods', () => {
    const httpClient: HttpClient = {
      async fetch() { return { status: 404, headers: new Map(), body: null }; },
    };
    const adapter = createA2aAdapter({
      httpClient,
      seeds: [SEED_HOST],
      maxDepth: 3,
      maxHosts: 100,
    });
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(adapter.sourceName).toBe('a2a');
    expect(typeof adapter.fetchAgents).toBe('function');
    expect(typeof adapter.toCanonical).toBe('function');
  });
});

describe('M-L1-expansion A2A fetchAgents — well-known discovery', () => {
  it('GETs <host>/.well-known/agent.json for each seed', async () => {
    const calls: string[] = [];
    const httpClient: HttpClient = {
      async fetch(req) {
        calls.push(req.url);
        return { status: 200, headers: new Map(), body: validAgentJson };
      },
    };
    const adapter = createA2aAdapter({
      httpClient,
      seeds: [SEED_HOST, 'https://other.example'],
      maxDepth: 1,
      maxHosts: 100,
    });

    for await (const _ of adapter.fetchAgents()) { /* noop */ }
    expect(calls.some(u => u.includes('/.well-known/agent.json'))).toBe(true);
    expect(calls.some(u => u.startsWith(SEED_HOST))).toBe(true);
  });

  it('yields one record per discovered agent.json', async () => {
    const httpClient: HttpClient = {
      async fetch() { return { status: 200, headers: new Map(), body: validAgentJson }; },
    };
    const adapter = createA2aAdapter({
      httpClient,
      seeds: [SEED_HOST],
      maxDepth: 1,
      maxHosts: 100,
    });

    let count = 0;
    for await (const _ of adapter.fetchAgents()) count += 1;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('skips host on 404 (graceful)', async () => {
    const httpClient: HttpClient = {
      async fetch() { return { status: 404, headers: new Map(), body: null }; },
    };
    const adapter = createA2aAdapter({
      httpClient,
      seeds: [SEED_HOST],
      maxDepth: 1,
      maxHosts: 100,
    });

    let threw = false;
    let count = 0;
    try {
      for await (const _ of adapter.fetchAgents()) count += 1;
    } catch { threw = true; }
    expect(threw).toBe(false);
    expect(count).toBe(0);
  });

  it('follows peers[] field for transitive discovery (BFS depth=2)', async () => {
    const peerHost = 'https://peer.example';
    const visited: string[] = [];
    const httpClient: HttpClient = {
      async fetch(req) {
        visited.push(req.url);
        if (req.url.startsWith(SEED_HOST)) {
          return {
            status: 200,
            headers: new Map(),
            body: { ...validAgentJson, peers: [peerHost] },
          };
        }
        if (req.url.startsWith(peerHost)) {
          return { status: 200, headers: new Map(), body: validAgentJson };
        }
        return { status: 404, headers: new Map(), body: null };
      },
    };
    const adapter = createA2aAdapter({
      httpClient,
      seeds: [SEED_HOST],
      maxDepth: 2,
      maxHosts: 100,
    });

    for await (const _ of adapter.fetchAgents()) { /* noop */ }
    expect(visited.some(u => u.startsWith(peerHost))).toBe(true);
  });

  it('de-duplicates: same host visited twice yields once', async () => {
    const httpClient: HttpClient = {
      async fetch() {
        // peer points back at seed → cycle
        return {
          status: 200,
          headers: new Map(),
          body: { ...validAgentJson, peers: [SEED_HOST] },
        };
      },
    };
    const adapter = createA2aAdapter({
      httpClient,
      seeds: [SEED_HOST],
      maxDepth: 5,
      maxHosts: 100,
    });

    let count = 0;
    for await (const _ of adapter.fetchAgents()) count += 1;
    expect(count).toBe(1);
  });

  it('respects maxHosts bound (no unbounded BFS)', async () => {
    // Each host points at a new unseen peer ad-infinitum
    let counter = 0;
    const httpClient: HttpClient = {
      async fetch() {
        counter += 1;
        return {
          status: 200,
          headers: new Map(),
          body: {
            ...validAgentJson,
            peers: [`https://host-${counter}.example`],
          },
        };
      },
    };
    const adapter = createA2aAdapter({
      httpClient,
      seeds: [SEED_HOST],
      maxDepth: 1000,
      maxHosts: 5,
    });

    let count = 0;
    for await (const _ of adapter.fetchAgents()) count += 1;
    expect(count).toBeLessThanOrEqual(5);
  });

  it('terminates on consecutive 5xx (graceful, no throw)', async () => {
    const httpClient: HttpClient = {
      async fetch() { return { status: 503, headers: new Map(), body: null }; },
    };
    const adapter = createA2aAdapter({
      httpClient,
      seeds: [SEED_HOST],
      maxDepth: 1,
      maxHosts: 10,
    });

    let threw = false;
    try {
      for await (const _ of adapter.fetchAgents()) { /* noop */ }
    } catch { threw = true; }
    expect(threw).toBe(false);
  });

  it('respects maxDepth=0 (no recursion, only seeds visited)', async () => {
    const visited: string[] = [];
    const httpClient: HttpClient = {
      async fetch(req) {
        visited.push(req.url);
        return {
          status: 200,
          headers: new Map(),
          body: { ...validAgentJson, peers: ['https://peer.example'] },
        };
      },
    };
    const adapter = createA2aAdapter({
      httpClient,
      seeds: [SEED_HOST],
      maxDepth: 0,
      maxHosts: 100,
    });

    for await (const _ of adapter.fetchAgents()) { /* noop */ }
    // peer.example must NOT have been visited
    expect(visited.some(u => u.startsWith('https://peer.example'))).toBe(false);
  });
});
