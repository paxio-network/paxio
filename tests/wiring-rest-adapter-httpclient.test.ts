// M-L1-T3-wiring — wiring/01-registry.cjs MUST inject httpClient
// with the `fetch({url, method, body?, headers?})` shape into REST
// adapters that expect it (fetch-ai, future a2a/erc8004/virtuals/...).
//
// Bug captured here (PR #120 silent failure mode):
//   - createFetchAiAdapter signature:
//       (deps: { httpClient: { fetch(req): Promise<HttpResponse> } }) => Adapter
//   - Wiring passed `{}` for fetch-ai → deps.httpClient = undefined
//   - Adapter try{ deps.httpClient.fetch(...) } catch { return; }
//     → silently yielded zero agents
//   - Crawler reported processed=0, sourceErrors=0, stoppedReason='completed'
//
// This RED test loads the actual wiring module, calls wireRegistryDomain
// with a mock raw domain that captures createFetchAiAdapter's deps argument,
// and asserts that deps.httpClient.fetch is a function. (We don't make a
// real HTTP call — just check the shape that the adapter consumes.)

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const wiringPath = resolve(
  here,
  '..',
  'apps',
  'back',
  'server',
  'wiring',
  '01-registry.cjs',
);
const { wireRegistryDomain } = require_(wiringPath);

// Helpers ────────────────────────────────────────────────────────────────────

const makeMockSource = () => {
  let captured: unknown = null;
  const factory = (deps: unknown) => {
    captured = deps;
    return Object.freeze({
      sourceName: '__mock__',
      fetchAgents: async function* () {
        /* yield nothing — placeholder */
      },
      toCanonical: () => ({
        ok: false,
        error: { code: 'parse_error', message: 'mock' },
      }),
    });
  };
  return { factory, get captured() { return captured; } };
};

// Tests ──────────────────────────────────────────────────────────────────────

describe('wireRegistryDomain — REST adapter httpClient injection', () => {
  it('injects httpClient with fetch({url,method}) shape into fetch-ai adapter', () => {
    const mock = makeMockSource();
    const rawDomain = {
      '01-registry': {
        sources: {
          'fetch-ai': { createFetchAiAdapter: mock.factory },
        },
      },
    };

    wireRegistryDomain(rawDomain, {});

    expect(mock.captured).not.toBeNull();
    const deps = mock.captured as { httpClient?: { fetch?: unknown } };
    expect(deps.httpClient).toBeDefined();
    expect(typeof deps.httpClient?.fetch).toBe('function');
  });

  it('fetch-ai httpClient.fetch returns HttpResponse shape {status,headers,body}', async () => {
    const mock = makeMockSource();
    const rawDomain = {
      '01-registry': {
        sources: {
          'fetch-ai': { createFetchAiAdapter: mock.factory },
        },
      },
    };

    // Replace global fetch with a deterministic mock for this assertion.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown) =>
      ({
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ agents: [{ address: 'fetch1xyz', name: 'foo' }] }),
      }) as Response) as typeof globalThis.fetch;

    try {
      wireRegistryDomain(rawDomain, {});
      const deps = mock.captured as {
        httpClient: {
          fetch: (req: { url: string; method: 'GET' | 'POST' }) => Promise<{
            status: number;
            headers: ReadonlyMap<string, string>;
            body: unknown;
          }>;
        };
      };
      const response = await deps.httpClient.fetch({
        url: 'https://example.invalid/v1/search/agents?offset=0&limit=100',
        method: 'GET',
      });

      expect(response.status).toBe(200);
      // headers MUST be a Map-like (with .get) per HttpResponse contract
      expect(typeof response.headers.get).toBe('function');
      expect(response.body).toStrictEqual({
        agents: [{ address: 'fetch1xyz', name: 'foo' }],
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('M-L1-T3d: fetch-ai httpClient.fetch JSON.stringifies object body before native fetch', async () => {
    // Production bug 2026-05-03: wiring passed body as JS object to native fetch.
    // Node's fetch coerces object to "[object Object]" string → Agentverse rejects
    // (parses as JSON, fails) → adapter sees empty agents → processed:0 silent zero.
    //
    // Fix: wiring wraps body with JSON.stringify before native fetch call.
    const mock = makeMockSource();
    const rawDomain = {
      '01-registry': {
        sources: {
          'fetch-ai': { createFetchAiAdapter: mock.factory },
        },
      },
    };

    let capturedInit: RequestInit | null = null;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      capturedInit = init ?? null;
      return {
        status: 200,
        headers: new Headers(),
        json: async () => ({ agents: [] }),
      } as Response;
    }) as typeof globalThis.fetch;

    try {
      wireRegistryDomain(rawDomain, {});
      const deps = mock.captured as {
        httpClient: {
          fetch: (req: {
            url: string;
            method: 'POST';
            body: unknown;
            headers?: Record<string, string>;
          }) => Promise<unknown>;
        };
      };

      await deps.httpClient.fetch({
        url: 'https://example.invalid/v1/search/agents',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { search_text: '', offset: 0, limit: 100 },
      });

      expect(capturedInit, 'native fetch must be called with init').not.toBeNull();
      // CRITICAL: body passed to native fetch MUST be a JSON string, NOT an object.
      // Node's fetch coerces objects via String() → "[object Object]" → server 400.
      expect(typeof capturedInit!.body).toBe('string');
      // Round-trip the JSON string and verify shape preserved
      const parsed = JSON.parse(capturedInit!.body as string);
      expect(parsed.search_text).toBe('');
      expect(parsed.offset).toBe(0);
      expect(parsed.limit).toBe(100);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('paxio-curated still receives curatedAgentsPath + fs (regression guard)', () => {
    const mock = makeMockSource();
    const rawDomain = {
      '01-registry': {
        sources: {
          'paxio-curated': { createPaxioCuratedAdapter: mock.factory },
        },
      },
    };

    wireRegistryDomain(rawDomain, {});

    const deps = mock.captured as {
      curatedAgentsPath?: string;
      fs?: { readFile?: unknown };
    };
    expect(typeof deps.curatedAgentsPath).toBe('string');
    expect(typeof deps.fs?.readFile).toBe('function');
  });

  it('mcp still receives httpClient.get(url) (regression guard)', () => {
    const mock = makeMockSource();
    const rawDomain = {
      '01-registry': {
        sources: {
          mcp: { createMcpSmitheryAdapter: mock.factory },
        },
      },
    };

    wireRegistryDomain(rawDomain, {});

    const deps = mock.captured as { httpClient?: { get?: unknown } };
    expect(typeof deps.httpClient?.get).toBe('function');
  });
});
