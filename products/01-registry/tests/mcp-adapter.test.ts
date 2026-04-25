// MCP Smithery adapter — unit tests.
//
// Covers:
//   - factory shape (frozen, sourceName='mcp', methods present)
//   - toCanonical (pure projection: valid descriptors → AgentCard, invalid → parse_error)
//   - fetchAgents (async generator, pagination via injected fake httpClient)
//   - capability inference (defaults to INTELLIGENCE, overrides for keywords)
//   - DID derivation (lowercased, dash-normalised)

import { describe, it, expect } from 'vitest';
import {
  createMcpSmitheryAdapter,
  type HttpClient,
  type HttpResponse,
} from '../app/domain/sources/mcp.js';
import type { McpServerDescriptor } from '@paxio/types';

const validDescriptor: McpServerDescriptor = {
  registrySource: 'smithery',
  slug: 'brave-search',
  displayName: 'Brave Search MCP',
  description: 'Web search via Brave API',
  repositoryUrl: 'https://github.com/example/brave-mcp',
  runtime: 'stdio',
  tools: [{ name: 'brave_web_search', description: 'Search the web' }],
  installCount: 12345,
  rating: null,
  lastPublishedAt: '2026-04-20T10:00:00.000Z',
};

const fakeHttp = (
  responses: ReadonlyArray<HttpResponse>,
): HttpClient => {
  let i = 0;
  return {
    async get(_url: string): Promise<HttpResponse> {
      const r = responses[i] ?? responses[responses.length - 1] ?? {
        status: 200,
        headers: new Map(),
        body: { servers: [], pagination: { totalPages: 1 } },
      };
      i += 1;
      return r;
    },
  };
};

describe('createMcpSmitheryAdapter — factory contract', () => {
  it('returns frozen adapter with sourceName=mcp', () => {
    const adapter = createMcpSmitheryAdapter({ httpClient: fakeHttp([]) });
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(adapter.sourceName).toBe('mcp');
    expect(typeof adapter.fetchAgents).toBe('function');
    expect(typeof adapter.toCanonical).toBe('function');
  });
});

describe('McpSmitheryAdapter.toCanonical', () => {
  const adapter = createMcpSmitheryAdapter({ httpClient: fakeHttp([]) });

  it('projects a valid descriptor to AgentCard with source=mcp', () => {
    const r = adapter.toCanonical(validDescriptor);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.source).toBe('mcp');
      expect(r.value.did).toBe('did:paxio:mcp:brave-search');
      expect(r.value.externalId).toBe('brave-search');
      expect(r.value.name).toBe('Brave Search MCP');
      expect(r.value.endpoint).toBe('https://github.com/example/brave-mcp');
      expect(r.value.sourceUrl).toBe('https://github.com/example/brave-mcp');
    }
  });

  it('is deterministic — same input → same output', () => {
    const a = adapter.toCanonical(validDescriptor);
    const b = adapter.toCanonical(validDescriptor);
    expect(a).toStrictEqual(b);
  });

  it('returns parse_error for invalid descriptor (missing slug)', () => {
    const bad = { ...validDescriptor, slug: '' } as unknown as McpServerDescriptor;
    const r = adapter.toCanonical(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('parse_error');
  });

  it('returns parse_error for unknown runtime', () => {
    const bad = { ...validDescriptor, runtime: 'wasm' } as unknown as McpServerDescriptor;
    const r = adapter.toCanonical(bad);
    expect(r.ok).toBe(false);
  });

  it('infers capability from keywords — payment → FACILITATOR', () => {
    const payDescriptor: McpServerDescriptor = {
      ...validDescriptor,
      slug: 'payment-router',
      displayName: 'Payment Router MCP',
      description: 'Routes payment intents',
    };
    const r = adapter.toCanonical(payDescriptor);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.capability).toBe('FACILITATOR');
  });

  it('infers capability from keywords — wallet → WALLET', () => {
    const walletDescriptor: McpServerDescriptor = {
      ...validDescriptor,
      slug: 'btc-wallet',
      displayName: 'BTC Wallet',
      description: 'Bitcoin wallet helper',
    };
    const r = adapter.toCanonical(walletDescriptor);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.capability).toBe('WALLET');
  });

  it('defaults capability to INTELLIGENCE when no keyword match', () => {
    const r = adapter.toCanonical(validDescriptor);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.capability).toBe('INTELLIGENCE');
  });

  it('AgentCard.source matches adapter.sourceName invariant', () => {
    const r = adapter.toCanonical(validDescriptor);
    if (r.ok) expect(r.value.source).toBe(adapter.sourceName);
  });

  it('falls back to epoch zero when lastPublishedAt absent', () => {
    const { lastPublishedAt: _omit, ...withoutDate } = validDescriptor;
    const r = adapter.toCanonical(withoutDate as McpServerDescriptor);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.createdAt).toBe('1970-01-01T00:00:00.000Z');
  });

  it('DID is lowercased and dash-normalised', () => {
    const weird: McpServerDescriptor = {
      ...validDescriptor,
      slug: 'My_Crazy/Slug.Name',
      displayName: 'Weird',
    };
    const r = adapter.toCanonical(weird);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.did).toBe('did:paxio:mcp:my-crazy-slug-name');
  });
});

describe('McpSmitheryAdapter.fetchAgents', () => {
  it('paginates through totalPages and yields normalised descriptors', async () => {
    const page1: HttpResponse = {
      status: 200,
      headers: new Map(),
      body: {
        servers: [
          {
            qualifiedName: 'one',
            displayName: 'One',
            description: 'first',
            remote: false,
            tools: [{ name: 'tool-a' }],
            useCount: 100,
          },
          {
            qualifiedName: 'two',
            displayName: 'Two',
            remote: true,
            useCount: 50,
          },
        ],
        pagination: { currentPage: 1, totalPages: 2 },
      },
    };
    const page2: HttpResponse = {
      status: 200,
      headers: new Map(),
      body: {
        servers: [
          {
            qualifiedName: 'three',
            displayName: 'Three',
            remote: false,
            useCount: 1,
          },
        ],
        pagination: { currentPage: 2, totalPages: 2 },
      },
    };
    const adapter = createMcpSmitheryAdapter({
      httpClient: fakeHttp([page1, page2]),
    });
    const collected: McpServerDescriptor[] = [];
    for await (const d of adapter.fetchAgents()) collected.push(d);
    expect(collected.length).toBe(3);
    expect(collected[0]!.slug).toBe('one');
    expect(collected[1]!.runtime).toBe('http'); // remote=true → http
    expect(collected[2]!.slug).toBe('three');
  });

  it('terminates on 429 rate limit without throwing', async () => {
    const adapter = createMcpSmitheryAdapter({
      httpClient: fakeHttp([
        {
          status: 429,
          headers: new Map([['retry-after', '60']]),
          body: null,
        },
      ]),
    });
    const collected: McpServerDescriptor[] = [];
    for await (const d of adapter.fetchAgents()) collected.push(d);
    expect(collected.length).toBe(0);
  });

  it('terminates on 500 without throwing', async () => {
    const adapter = createMcpSmitheryAdapter({
      httpClient: fakeHttp([
        { status: 500, headers: new Map(), body: null },
      ]),
    });
    const collected: McpServerDescriptor[] = [];
    for await (const d of adapter.fetchAgents()) collected.push(d);
    expect(collected.length).toBe(0);
  });

  it('terminates on httpClient throw without leaking exception', async () => {
    const adapter = createMcpSmitheryAdapter({
      httpClient: {
        async get() {
          throw new Error('ECONNRESET');
        },
      },
    });
    const collected: McpServerDescriptor[] = [];
    for await (const d of adapter.fetchAgents()) collected.push(d);
    expect(collected.length).toBe(0);
  });

  it('skips raw rows that fail normalisation but continues iteration', async () => {
    const adapter = createMcpSmitheryAdapter({
      httpClient: fakeHttp([
        {
          status: 200,
          headers: new Map(),
          body: {
            servers: [
              { qualifiedName: '' }, // invalid (empty slug)
              { qualifiedName: 'good', displayName: 'Good' },
            ],
            pagination: { totalPages: 1 },
          },
        },
      ]),
    });
    const collected: McpServerDescriptor[] = [];
    for await (const d of adapter.fetchAgents()) collected.push(d);
    expect(collected.length).toBe(1);
    expect(collected[0]!.slug).toBe('good');
  });
});
