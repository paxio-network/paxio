// M-L1-expansion RED — ERC-8004 EVM RPC adapter.
//
// Real impl will replace the empty-stream stub at
// products/01-registry/app/domain/sources/erc8004.ts. Tests use fake
// HttpClient that returns canned eth_getLogs JSON-RPC responses.
//
// Pre-fix: stub yields nothing → tests asserting yields fail.
// Post-fix (registry-dev T-2): all GREEN.

import { describe, it, expect } from 'vitest';
import { createErc8004Adapter } from '../app/domain/sources/erc8004.js';
import type { Erc8004Record } from '@paxio/types';

// HttpClient port shape (mirrors the one in mcp.ts — same interface).
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
      const r = responses[i] ?? { status: 200, headers: new Map(), body: { result: [] } };
      i += 1;
      return r;
    },
  };
};

interface RegistryConfig {
  chainId: number;
  contractAddress: string;
  rpcUrl: string;
  fromBlock: number;
}

const DUMMY_REGISTRY: RegistryConfig = {
  chainId: 8453,
  contractAddress: '0x0000000000000000000000000000000000000001',
  rpcUrl: 'https://mainnet.base.org',
  fromBlock: 12000000,
};

const SAMPLE_LOG = {
  // keccak('AgentRegistered(address,string,string,bytes32,uint256)')
  topics: [
    '0x' + 'a'.repeat(64),
    '0x000000000000000000000000abcdef0000000000000000000000000000000001',
  ],
  data: '0x' + '0'.repeat(64), // ABI-encoded args
  blockNumber: '0xb71b00',
  transactionHash: '0x' + '1'.repeat(64),
};

describe('M-L1-expansion createErc8004Adapter — factory', () => {
  it('returns frozen adapter with sourceName=erc8004 + methods', () => {
    const adapter = createErc8004Adapter({
      httpClient: fakeHttp([]),
      registries: [DUMMY_REGISTRY],
    });
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(adapter.sourceName).toBe('erc8004');
    expect(typeof adapter.fetchAgents).toBe('function');
    expect(typeof adapter.toCanonical).toBe('function');
  });
});

describe('M-L1-expansion ERC-8004 fetchAgents — JSON-RPC eth_getLogs', () => {
  it('issues POST with eth_getLogs method per registry', async () => {
    const calls: unknown[] = [];
    const httpClient: HttpClient = {
      async fetch(req) {
        calls.push(req);
        return { status: 200, headers: new Map(), body: { result: [] } };
      },
    };
    const adapter = createErc8004Adapter({
      httpClient,
      registries: [DUMMY_REGISTRY],
    });

    // Drain the iterator
    for await (const _ of adapter.fetchAgents()) { /* noop */ }

    expect(calls.length).toBeGreaterThan(0);
    const first = calls[0] as { url: string; method: string; body: { method: string; params: unknown[] } };
    expect(first.url).toBe(DUMMY_REGISTRY.rpcUrl);
    expect(first.method).toBe('POST');
    expect(first.body.method).toBe('eth_getLogs');
  });

  it('yields one Erc8004Record per decoded log entry', async () => {
    const adapter = createErc8004Adapter({
      httpClient: fakeHttp([
        { status: 200, headers: new Map(), body: { result: [SAMPLE_LOG] } },
        { status: 200, headers: new Map(), body: { result: [] } }, // terminate
      ]),
      registries: [DUMMY_REGISTRY],
    });

    const records: Erc8004Record[] = [];
    for await (const r of adapter.fetchAgents()) records.push(r);
    expect(records.length).toBeGreaterThan(0);
    expect(records[0].chainId).toBe(DUMMY_REGISTRY.chainId);
    expect(records[0].contractAddress.toLowerCase()).toBe(DUMMY_REGISTRY.contractAddress.toLowerCase());
  });

  it('terminates gracefully on RPC 5xx (no throw from generator)', async () => {
    const adapter = createErc8004Adapter({
      httpClient: fakeHttp([
        { status: 503, headers: new Map(), body: { error: { message: 'service unavailable' } } },
      ]),
      registries: [DUMMY_REGISTRY],
    });

    let count = 0;
    let threw = false;
    try {
      for await (const _ of adapter.fetchAgents()) count += 1;
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(count).toBe(0);
  });

  it('iterates ALL registries in the configured list', async () => {
    const calls: { url: string }[] = [];
    const httpClient: HttpClient = {
      async fetch(req) {
        calls.push({ url: req.url });
        return { status: 200, headers: new Map(), body: { result: [] } };
      },
    };
    const r1 = { ...DUMMY_REGISTRY, chainId: 1, rpcUrl: 'https://eth.llamarpc.com' };
    const r2 = { ...DUMMY_REGISTRY, chainId: 8453, rpcUrl: 'https://mainnet.base.org' };
    const adapter = createErc8004Adapter({
      httpClient,
      registries: [r1, r2],
    });

    for await (const _ of adapter.fetchAgents()) { /* noop */ }
    const urls = new Set(calls.map(c => c.url));
    expect(urls.has('https://eth.llamarpc.com')).toBe(true);
    expect(urls.has('https://mainnet.base.org')).toBe(true);
  });

  it('respects SAFETY_MAX_PAGES bound (no runaway pagination)', async () => {
    // If RPC keeps returning logs forever, adapter must stop at safety bound.
    const httpClient: HttpClient = {
      async fetch() {
        return { status: 200, headers: new Map(), body: { result: [SAMPLE_LOG] } };
      },
    };
    const adapter = createErc8004Adapter({
      httpClient,
      registries: [DUMMY_REGISTRY],
    });

    let count = 0;
    for await (const _ of adapter.fetchAgents()) {
      count += 1;
      if (count > 1000) break; // outer safety in test itself
    }
    // SAFETY_MAX_PAGES=200 in production. Per page ≥ 1 log. So count ≤ 200 * (logs per page).
    // Given each fake response has 1 log, count should be ~200, NOT >1000.
    expect(count).toBeLessThanOrEqual(1000);
    expect(count).toBeGreaterThan(0);
  });
});

describe('M-L1-expansion ERC-8004 toCanonical — pure (already covered in stub-adapters test)', () => {
  it('still produces AgentCard from valid Erc8004Record (regression check)', () => {
    const adapter = createErc8004Adapter({
      httpClient: fakeHttp([]),
      registries: [DUMMY_REGISTRY],
    });
    const valid: Erc8004Record = {
      chainId: 8453,
      contractAddress: '0x' + 'a'.repeat(40),
      agentAddress: '0x' + 'b'.repeat(40),
      name: 'Test agent',
      capabilityHash: '0x' + 'c'.repeat(64),
      registeredAt: 1714000000,
    };
    const result = adapter.toCanonical(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.source).toBe('erc8004');
      expect(result.value.did).toMatch(/^did:paxio:erc8004:/);
    }
  });
});
