/**
 * M-L1-contracts — per-source Zod schemas.
 *
 * Validates packages/types/src/sources/{erc8004,a2a,mcp,fetch-ai,virtuals}.ts
 * round-trip correctness: a known-valid fixture passes, known-invalid fixtures
 * fail, frozen parse output, etc.
 *
 * These schemas are the VALIDATION BOUNDARY that separates external-world
 * mess from Paxio's canonical AgentCard. Every raw record from a crawler
 * MUST pass through one of these schemas before reaching `toCanonical()`.
 * Keeping the boundary strict is a P0 safety property.
 */
import { describe, it, expect } from 'vitest';
import {
  ZodErc8004Record,
  ZodA2aAgentCard,
  ZodMcpServerDescriptor,
  ZodFetchAiAgent,
  ZodVirtualsAgent,
} from '@paxio/types';

describe('M-L1 — ERC-8004 record schema', () => {
  const valid = {
    chainId: 8453,
    contractAddress: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    agentAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    name: 'Test Agent',
    serviceEndpoint: 'https://agent.example.com',
    capabilityHash:
      '0x' + 'a'.repeat(64),
    blockNumber: 12345678,
    transactionHash: '0x' + 'b'.repeat(64),
    registeredAt: 1714000000,
  };

  it('parses a valid record', () => {
    expect(ZodErc8004Record.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid contractAddress (not 20 bytes)', () => {
    const bad = { ...valid, contractAddress: '0xabc' };
    expect(ZodErc8004Record.safeParse(bad).success).toBe(false);
  });

  it('rejects invalid capabilityHash (not 32 bytes)', () => {
    const bad = { ...valid, capabilityHash: '0x1234' };
    expect(ZodErc8004Record.safeParse(bad).success).toBe(false);
  });

  it('rejects negative chainId', () => {
    const bad = { ...valid, chainId: -1 };
    expect(ZodErc8004Record.safeParse(bad).success).toBe(false);
  });

  it('allows missing serviceEndpoint (optional)', () => {
    const { serviceEndpoint: _endpoint, ...rest } = valid;
    expect(ZodErc8004Record.safeParse(rest).success).toBe(true);
  });

  it('is deterministic (same input → same output)', () => {
    const a = ZodErc8004Record.parse(valid);
    const b = ZodErc8004Record.parse(valid);
    expect(a).toStrictEqual(b);
  });
});

describe('M-L1 — A2A Agent Card schema', () => {
  const valid = {
    cardUrl: 'https://agent.example.com/.well-known/agent.json',
    name: 'A2A Test Agent',
    description: 'An agent in the A2A network',
    version: '1.0.0',
    url: 'https://agent.example.com/rpc',
    capabilities: [{ name: 'tool-use', description: 'Can invoke tools' }],
    provider: {
      organization: 'Example Corp',
      url: 'https://example.com',
    },
    authentication: 'bearer',
  };

  it('parses a valid card', () => {
    expect(ZodA2aAgentCard.safeParse(valid).success).toBe(true);
  });

  it('rejects empty capabilities array', () => {
    const bad = { ...valid, capabilities: [] };
    expect(ZodA2aAgentCard.safeParse(bad).success).toBe(false);
  });

  it('rejects non-URL cardUrl', () => {
    const bad = { ...valid, cardUrl: 'not-a-url' };
    expect(ZodA2aAgentCard.safeParse(bad).success).toBe(false);
  });

  it('rejects missing provider.organization', () => {
    const bad = { ...valid, provider: { url: 'https://example.com' } };
    expect(ZodA2aAgentCard.safeParse(bad).success).toBe(false);
  });

  it('allows missing authentication (optional)', () => {
    const { authentication: _a, ...rest } = valid;
    expect(ZodA2aAgentCard.safeParse(rest).success).toBe(true);
  });
});

describe('M-L1 — MCP server descriptor schema', () => {
  const valid = {
    registrySource: 'smithery' as const,
    slug: 'brave-search',
    displayName: 'Brave Search MCP',
    description: 'Web search via Brave API',
    repositoryUrl: 'https://github.com/example/brave-mcp',
    runtime: 'stdio' as const,
    tools: [
      { name: 'brave_web_search', description: 'Search the web' },
      { name: 'brave_local_search', description: 'Local search' },
    ],
    installCount: 12345,
    rating: 4.5,
    author: 'Brave Software',
    lastPublishedAt: '2026-04-20T10:00:00.000Z',
  };

  it('parses a valid Smithery descriptor', () => {
    expect(ZodMcpServerDescriptor.safeParse(valid).success).toBe(true);
  });

  it('parses a valid Anthropic descriptor (null stats)', () => {
    const anthropic = {
      ...valid,
      registrySource: 'anthropic' as const,
      installCount: null,
      rating: null,
    };
    expect(ZodMcpServerDescriptor.safeParse(anthropic).success).toBe(true);
  });

  it('rejects rating above 5', () => {
    const bad = { ...valid, rating: 6 };
    expect(ZodMcpServerDescriptor.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown runtime', () => {
    const bad = { ...valid, runtime: 'javascript' };
    expect(ZodMcpServerDescriptor.safeParse(bad).success).toBe(false);
  });

  it('rejects more than 500 tools', () => {
    const tools = Array.from({ length: 501 }, (_, i) => ({
      name: `t${i}`,
    }));
    const bad = { ...valid, tools };
    expect(ZodMcpServerDescriptor.safeParse(bad).success).toBe(false);
  });

  it('tools defaults to empty array when omitted', () => {
    const { tools: _tools, ...rest } = valid;
    const parsed = ZodMcpServerDescriptor.parse(rest);
    expect(parsed.tools).toEqual([]);
  });
});

describe('M-L1-T3c — Fetch.ai (Agentverse) raw API schema', () => {
  // Mirrors REAL Agentverse response (verified 2026-05-03 via curl POST
  // /v1/search/agents). See packages/types/src/sources/fetch-ai.ts header.
  const valid = {
    address: 'agent1q000e4kxnlv0rwcms3al3vfpaa2fy83x6jtrz79ghfq9d87n79cpwaj8695',
    prefix: 'test-agent',
    name: 'Fetch Test Agent',
    description: 'A Fetch.ai agent',
    readme: '',
    protocols: ['chat'],
    rating: 4.5,
    status: 'active',
    unresponsive: false,
    type: 'hosted',
    featured: false,
    category: 'finance',
    system_wide_tags: ['trading', 'defi'],
    last_updated: '2025-07-02T09:19:17Z',
    created_at: '2025-07-02T09:19:17Z',
    owner: '34ee31a80edb390dd0ccc1c12a17918cff09073b6d047932',
  };

  it('parses a valid Agentverse agent record', () => {
    expect(ZodFetchAiAgent.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid agent address (non-agent1 prefix)', () => {
    const bad = { ...valid, address: 'fetch1' + 'a'.repeat(45) };
    expect(ZodFetchAiAgent.safeParse(bad).success).toBe(false);
  });

  it('rejects non-ISO created_at', () => {
    const bad = { ...valid, created_at: '2025-07-02 09:19:17' };
    expect(ZodFetchAiAgent.safeParse(bad).success).toBe(false);
  });

  it('tolerates unknown fields (passthrough for forward-compat)', () => {
    const withExtra = { ...valid, future_field: 'whatever' };
    expect(ZodFetchAiAgent.safeParse(withExtra).success).toBe(true);
  });

  it('defaults rating to 0 when omitted', () => {
    const { rating: _r, ...rest } = valid;
    const parsed = ZodFetchAiAgent.parse(rest);
    expect(parsed.rating).toBe(0);
  });
});

describe('M-L1 — Virtuals agent schema', () => {
  const valid = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Virtuals Test Agent',
    ticker: 'AIXBT',
    tokenContract: '0xabcdef1234567890abcdef1234567890abcdef12',
    creatorAddress: '0x1234567890abcdef1234567890abcdef12345678',
    description: 'An AI-driven trading agent',
    category: 'defi',
    imageUrl: 'https://virtuals.io/images/aixbt.png',
    mcapUsd: 1250000,
    volume24hUsd: 50000,
    socials: [
      { platform: 'twitter' as const, url: 'https://twitter.com/aixbt' },
    ],
    profileUrl: 'https://virtuals.io/agents/aixbt',
    launchedAt: 1714000000000,
  };

  it('parses a valid Virtuals agent', () => {
    expect(ZodVirtualsAgent.safeParse(valid).success).toBe(true);
  });

  it('rejects non-UUID id', () => {
    const bad = { ...valid, id: 'not-a-uuid' };
    expect(ZodVirtualsAgent.safeParse(bad).success).toBe(false);
  });

  it('rejects invalid tokenContract (not EVM)', () => {
    const bad = { ...valid, tokenContract: '0x123' };
    expect(ZodVirtualsAgent.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown social platform', () => {
    const bad = {
      ...valid,
      socials: [{ platform: 'myspace', url: 'https://myspace.com/x' }],
    };
    expect(ZodVirtualsAgent.safeParse(bad).success).toBe(false);
  });

  it('allows null mcapUsd / volume24hUsd for fresh launches', () => {
    const fresh = { ...valid, mcapUsd: null, volume24hUsd: null };
    expect(ZodVirtualsAgent.safeParse(fresh).success).toBe(true);
  });

  it('rejects negative mcapUsd', () => {
    const bad = { ...valid, mcapUsd: -1 };
    expect(ZodVirtualsAgent.safeParse(bad).success).toBe(false);
  });
});
