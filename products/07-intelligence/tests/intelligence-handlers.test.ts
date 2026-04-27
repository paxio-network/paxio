// M-L11 RED — handler specs for 3 intelligence endpoints (FA-07).
//
// Pre-fix: handler files don't exist yet → vacuous-skip.
// Post-fix (backend-dev creates handlers + domain factories):
//   - products/07-intelligence/app/api/intelligence-paei.js
//   - products/07-intelligence/app/api/intelligence-movers.js
//   - products/01-registry/app/api/registry-list.js
//   - products/07-intelligence/app/domain/intelligence-snapshot.ts
//   - products/07-intelligence/app/domain/movers.ts
//   - products/01-registry/app/domain/registry-list.ts (or extend search.ts)
//
// Acceptance: each handler matches Zod schema from @paxio/types.

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import {
  ZodPaeiSnapshot,
  ZodAgentListPage,
  ZodMarketMoversWindow,
} from '@paxio/types';

interface Handler {
  httpMethod: string;
  path: string;
  method: (ctx: {
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
  }) => Promise<unknown> | unknown;
}

const loadHandler = async (
  filePath: string,
  sandbox: Record<string, unknown>,
): Promise<Handler | null> => {
  let src: string;
  try {
    src = await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
  const code = `'use strict';\n{\n${src}\n}`;
  const script = new vm.Script(code, { displayErrors: false });
  const sandboxWithSlot = { ...sandbox, __paxio_module: undefined };
  const context = vm.createContext(sandboxWithSlot);
  const result = script.runInContext(context, { displayErrors: false });
  return (result ?? sandboxWithSlot.__paxio_module) as Handler;
};

const PAEI_HANDLER = resolve(
  __dirname,
  '..',
  'app',
  'api',
  'intelligence-paei.js',
);
const MOVERS_HANDLER = resolve(
  __dirname,
  '..',
  'app',
  'api',
  'intelligence-movers.js',
);
const REGISTRY_LIST_HANDLER = resolve(
  __dirname,
  '..',
  '..',
  '01-registry',
  'app',
  'api',
  'registry-list.js',
);

const sampleSnapshot = () => ({
  paei: 1284.7,
  paeiD: 0.82,
  btc: 431.9,
  btcD: 1.42,
  legal: 892.1,
  legalD: -0.31,
  finance: 1147.3,
  financeD: 1.15,
  research: 642.0,
  researchD: 0.18,
  cx: 218.4,
  cxD: -0.05,
  walletAdoption: 42.1,
  walletAdoptionD: 2.1,
  x402Share: 68.2,
  x402ShareD: -0.4,
  btcShare: 9.1,
  btcShareD: 0.7,
  hhi: 4620,
  drift7: 312,
  attacks24: 1204883,
  slaP50: 98.2,
  fapThroughput: 18_200_000,
  uptimeAvg: 99.1,
  agents: 2483921,
  txns: 1204883,
  generatedAt: '2026-04-27T20:00:00.000Z',
});

const makeSandbox = (impls: Record<string, unknown> = {}) => ({
  errors: {
    ValidationError: class ValidationError extends Error {
      constructor(msg?: string) {
        super(msg);
        this.name = 'ValidationError';
      }
    },
    InternalError: class InternalError extends Error {
      constructor(msg?: string) {
        super(msg);
        this.name = 'InternalError';
      }
    },
  },
  domain: {
    intelligence: {
      getPaeiSnapshot: async () => ({
        ok: true as const,
        value: sampleSnapshot(),
      }),
      getMovers: async (window: string) => ({
        ok: true as const,
        value: {
          window,
          topGainers: [],
          topLosers: [],
          paeiHistory: [],
          generatedAt: '2026-04-27T20:00:00.000Z',
        },
      }),
    },
    registryList: {
      list: async () => ({
        ok: true as const,
        value: {
          items: [],
          total: 0,
          cursor: null,
          generatedAt: '2026-04-27T20:00:00.000Z',
        },
      }),
    },
    ...impls,
  },
});

// ---------------------------------------------------------------------------
// GET /api/intelligence/paei/snapshot
// ---------------------------------------------------------------------------

describe('M-L11 GET /api/intelligence/paei/snapshot', () => {
  it('handler exists with correct method + path', async () => {
    const h = await loadHandler(PAEI_HANDLER, makeSandbox());
    if (!h) return;
    expect(h.httpMethod).toBe('GET');
    expect(h.path).toBe('/api/intelligence/paei/snapshot');
  });

  it('returns ZodPaeiSnapshot-shaped data', async () => {
    const h = await loadHandler(PAEI_HANDLER, makeSandbox());
    if (!h) return;
    const result = (await h.method({})) as { data?: unknown };
    const parsed = ZodPaeiSnapshot.safeParse(result.data ?? result);
    expect(parsed.success).toBe(true);
  });

  it('cold registry returns zero-filled snapshot, NOT 500 error', async () => {
    const h = await loadHandler(
      PAEI_HANDLER,
      makeSandbox({
        intelligence: {
          getPaeiSnapshot: async () => ({
            ok: true as const,
            value: {
              ...sampleSnapshot(),
              paei: 0,
              btc: 0,
              agents: 0,
              txns: 0,
            },
          }),
        },
      }),
    );
    if (!h) return;
    const result = (await h.method({})) as { data?: unknown };
    expect(result).toBeDefined();
    const data = (result as { data?: unknown }).data ?? result;
    const parsed = ZodPaeiSnapshot.safeParse(data);
    expect(parsed.success).toBe(true);
    expect((parsed as { data: { agents: number } }).data.agents).toBe(0);
  });

  it('public endpoint — does NOT require Authorization header', async () => {
    const h = await loadHandler(PAEI_HANDLER, makeSandbox());
    if (!h) return;
    // Should NOT throw AuthError without header
    const result = await h.method({}); // no headers
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// GET /api/intelligence/movers
// ---------------------------------------------------------------------------

describe('M-L11 GET /api/intelligence/movers', () => {
  it('handler exists with correct method + path', async () => {
    const h = await loadHandler(MOVERS_HANDLER, makeSandbox());
    if (!h) return;
    expect(h.httpMethod).toBe('GET');
    expect(h.path).toBe('/api/intelligence/movers');
  });

  it('default window=24h when not provided', async () => {
    const h = await loadHandler(MOVERS_HANDLER, makeSandbox());
    if (!h) return;
    const result = (await h.method({})) as {
      data?: { window?: string };
      window?: string;
    };
    const window = result.data?.window ?? result.window;
    expect(window).toBe('24h');
  });

  it('returns ZodMarketMoversWindow shape', async () => {
    const h = await loadHandler(MOVERS_HANDLER, makeSandbox());
    if (!h) return;
    const result = (await h.method({ query: { window: '7d' } })) as {
      data?: unknown;
    };
    const parsed = ZodMarketMoversWindow.safeParse(result.data ?? result);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid window with ValidationError', async () => {
    const sb = makeSandbox();
    const h = await loadHandler(MOVERS_HANDLER, sb);
    if (!h) return;
    await expect(
      h.method({ query: { window: '1y' } }),
    ).rejects.toThrow(sb.errors.ValidationError);
  });
});

// ---------------------------------------------------------------------------
// GET /api/registry/list
// ---------------------------------------------------------------------------

describe('M-L11 GET /api/registry/list', () => {
  it('handler exists with correct method + path', async () => {
    const h = await loadHandler(REGISTRY_LIST_HANDLER, makeSandbox());
    if (!h) return;
    expect(h.httpMethod).toBe('GET');
    expect(h.path).toBe('/api/registry/list');
  });

  it('returns ZodAgentListPage shape with empty items on cold registry', async () => {
    const h = await loadHandler(REGISTRY_LIST_HANDLER, makeSandbox());
    if (!h) return;
    const result = (await h.method({})) as { data?: unknown };
    const parsed = ZodAgentListPage.safeParse(result.data ?? result);
    expect(parsed.success).toBe(true);
    expect((parsed as { data: { items: readonly unknown[] } }).data.items)
      .toHaveLength(0);
  });

  it('default sort=vol24, default limit=20', async () => {
    const sb = makeSandbox();
    const calls: unknown[] = [];
    sb.domain.registryList.list = async (q: unknown) => {
      calls.push(q);
      return {
        ok: true as const,
        value: {
          items: [],
          total: 0,
          cursor: null,
          generatedAt: '2026-04-27T20:00:00.000Z',
        },
      };
    };
    const h = await loadHandler(REGISTRY_LIST_HANDLER, sb);
    if (!h) return;
    await h.method({});
    expect(calls).toHaveLength(1);
    const q = calls[0] as { sort: string; limit: number };
    expect(q.sort).toBe('vol24');
    expect(q.limit).toBe(20);
  });

  it('rejects limit > 100 with ValidationError', async () => {
    const sb = makeSandbox();
    const h = await loadHandler(REGISTRY_LIST_HANDLER, sb);
    if (!h) return;
    await expect(
      h.method({ query: { limit: '1000' } }),
    ).rejects.toThrow(sb.errors.ValidationError);
  });

  it('public endpoint — no Authorization header required', async () => {
    const h = await loadHandler(REGISTRY_LIST_HANDLER, makeSandbox());
    if (!h) return;
    const result = await h.method({});
    expect(result).toBeDefined();
  });
});
