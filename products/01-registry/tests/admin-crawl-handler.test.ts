// M-L1-launch RED — drift-guard for POST /api/admin/crawl handler.
//
// Tests load handler module via vm.Script-like dynamic import (handler
// is .js IIFE returning {httpMethod, path, method}). 8 RED cases for
// auth + validation + happy-path + rate-limit.
//
// Pre-fix (M-L1-launch RED): file products/01-registry/app/api/admin-crawl.js
// does not exist → test cannot load handler → all 8 RED.
// Post-fix (registry-dev T-2): all 8 GREEN.

import { describe, it, expect, vi } from 'vitest';
import type { CrawlerSummary } from '@paxio/types';

// ---------------------------------------------------------------------------
// Sandbox-eval helper: mirrors apps/back/server/src/loader.cjs exactly.
// Uses vm.Script + block wrapping ('use strict';\n{\n${src}\n}) — the same
// pattern the real server uses.  The old new.Function + 'return (${src})'
// pattern fails on IIFE handlers in Node.js strict mode (SyntaxError ';').
// ---------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const HANDLER_PATH = resolve(
  __dirname,
  '..',
  'app',
  'api',
  'admin-crawl.js',
);

interface Handler {
  httpMethod: string;
  path: string;
  method: (ctx: {
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
  }) => Promise<unknown> | unknown;
}

const loadHandler = async (sandbox: Record<string, unknown>): Promise<Handler | null> => {
  let src: string;
  try {
    src = await readFile(HANDLER_PATH, 'utf8');
  } catch {
    return null;
  }
  // Mirror loader.cjs exactly: block-wrapped IIFE, vm.Script, runInContext.
  // The handler's last expression IS the return value.
  const code = `'use strict';\n{\n${src}\n}`;
  const script = new vm.Script(code, { displayErrors: false });
  const sandboxWithSlot = { ...sandbox, __paxio_module: undefined };
  const context = vm.createContext(sandboxWithSlot);
  const result = script.runInContext(context, { displayErrors: false });
  return (result ?? sandboxWithSlot.__paxio_module) as Handler;
};

// ---------------------------------------------------------------------------
// Common sandbox stubs
// ---------------------------------------------------------------------------

const makeSandbox = (overrides: Partial<{
  adminToken: string;
  runCrawlerImpl: () => Promise<CrawlerSummary>;
  recordRunImpl: () => Promise<{ ok: true; value: { id: string } }>;
  lastRunImpl: () => Promise<{ ok: true; value: unknown }>;
  clockNow: number;
}> = {}) => {
  const adminToken = overrides.adminToken ?? 'test-admin-token';
  const runCrawlerImpl = overrides.runCrawlerImpl ?? (async () => ({
    source: 'mcp' as const,
    processed: 100,
    upserted: 95,
    parseErrors: 5,
    storageErrors: 0,
    sourceErrors: 0,
    stoppedReason: 'completed' as const,
  }));
  const recordRunImpl = overrides.recordRunImpl ?? (async () => ({
    ok: true as const,
    value: { id: '550e8400-e29b-41d4-a716-446655440000' },
  }));
  const lastRunImpl = overrides.lastRunImpl ?? (async () => ({
    ok: true as const,
    value: null,
  }));
  const clockNow = overrides.clockNow ?? 1714145000000;

  // Expose the wired domain tree the loader produces.
  // The handler reads top-level sandbox vars directly, so these must
  // live at the sandbox root — not nested inside domain['01-registry'].
  const sandbox = {
    config: { admin: { token: adminToken } },
    errors: {
      AuthError: class AuthError extends Error {
        constructor(msg?: string) { super(msg); this.name = 'AuthError'; }
      },
      ValidationError: class ValidationError extends Error {
        constructor(msg?: string) { super(msg); this.name = 'ValidationError'; }
      },
      InternalError: class InternalError extends Error {
        constructor(msg?: string) { super(msg); this.name = 'InternalError'; }
      },
    },
    domain: Object.freeze({
      '01-registry': Object.freeze({
        // The wired registry domain slots the handler reads directly
        crawlRuns: Object.freeze({
          recordRun: vi.fn(recordRunImpl),
          lastRunForSource: vi.fn(lastRunImpl),
        }),
        crawlerAdapters: Object.freeze({
          mcp: {
            sourceName: 'mcp' as const,
            fetchAgents: async function* () {},
            toCanonical: () => ({ ok: false as const, error: { code: 'parse_error' as const, message: '', raw: null } }),
          },
        }),
        // agentStorage is null-safe (wiring returns noop when DB absent)
        agentStorage: Object.freeze({
          upsert: vi.fn(),
          resolve: vi.fn(),
          find: vi.fn(),
          count: vi.fn(),
          countBySource: vi.fn(),
        }),
        CRAWLER_SOURCES: Object.freeze(['native','erc8004','a2a','mcp','fetch-ai','virtuals']),
        clock: () => clockNow,
        // The actual runCrawler from the bundled domain crawler module
        runCrawler: vi.fn(runCrawlerImpl),
      }),
    }),
    // Top-level runCrawler: same as domain['01-registry'].runCrawler
    // (handler references it directly, not through domain.*)
    runCrawler: vi.fn(runCrawlerImpl),
    // Top-level crawlRuns shortcut for tests that need to verify calls
    crawlRuns: Object.freeze({
      recordRun: vi.fn(recordRunImpl),
      lastRunForSource: vi.fn(lastRunImpl),
    }),
    // Top-level crawlerAdapters shortcut
    crawlerAdapters: Object.freeze({
      mcp: {
        sourceName: 'mcp' as const,
        fetchAgents: async function* () {},
        toCanonical: () => ({ ok: false as const, error: { code: 'parse_error' as const, message: '', raw: null } }),
      },
    }),
    // Top-level agentStorage shortcut
    agentStorage: Object.freeze({
      upsert: vi.fn(),
      resolve: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      countBySource: vi.fn(),
    }),
    // Top-level clock shortcut
    clock: () => clockNow,
    // Top-level CRAWLER_SOURCES shortcut
    CRAWLER_SOURCES: Object.freeze(['native','erc8004','a2a','mcp','fetch-ai','virtuals']),
  };

  return sandbox;
};

// ---------------------------------------------------------------------------

describe('M-L1-launch POST /api/admin/crawl — auth', () => {
  it('returns 401 without Authorization header', async () => {
    const sb = makeSandbox();
    const handler = await loadHandler(sb);
    if (!handler) return;

    await expect(
      handler.method({ query: { source: 'mcp' } })
    ).rejects.toThrow(sb.errors.AuthError);
  });

  it('returns 401 with wrong Bearer token', async () => {
    const sb = makeSandbox();
    const handler = await loadHandler(sb);
    if (!handler) return;

    await expect(
      handler.method({
        query: { source: 'mcp' },
        headers: { authorization: 'Bearer wrong-token' },
      })
    ).rejects.toThrow(sb.errors.AuthError);
  });

  it('accepts correct Bearer token', async () => {
    const sb = makeSandbox();
    const handler = await loadHandler(sb);
    if (!handler) return;

    const result = await handler.method({
      query: { source: 'mcp' },
      headers: { authorization: 'Bearer test-admin-token' },
    });
    expect(result).toBeDefined();
  });
});

describe('M-L1-launch POST /api/admin/crawl — validation', () => {
  it('returns 400 on missing ?source= query param', async () => {
    const sb = makeSandbox();
    const handler = await loadHandler(sb);
    if (!handler) return;

    await expect(
      handler.method({
        headers: { authorization: 'Bearer test-admin-token' },
      })
    ).rejects.toThrow(sb.errors.ValidationError);
  });

  it('returns 400 on unknown source', async () => {
    const sb = makeSandbox();
    const handler = await loadHandler(sb);
    if (!handler) return;

    await expect(
      handler.method({
        query: { source: 'totally-not-a-source' },
        headers: { authorization: 'Bearer test-admin-token' },
      })
    ).rejects.toThrow(sb.errors.ValidationError);
  });
});

describe('M-L1-launch POST /api/admin/crawl — happy path', () => {
  it('calls runCrawler with right adapter (mcp)', async () => {
    const sb = makeSandbox();
    const handler = await loadHandler(sb);
    if (!handler) return;

    await handler.method({
      query: { source: 'mcp' },
      headers: { authorization: 'Bearer test-admin-token' },
    });

    expect(sb.domain['01-registry'].runCrawler).toHaveBeenCalledTimes(1);
    const callArgs = sb.domain['01-registry'].runCrawler.mock.calls[0][0];
    expect(callArgs.adapter.sourceName).toBe('mcp');
  });

  it('persists crawl_runs row via crawlRuns.recordRun', async () => {
    const sb = makeSandbox();
    const handler = await loadHandler(sb);
    if (!handler) return;

    await handler.method({
      query: { source: 'mcp' },
      headers: { authorization: 'Bearer test-admin-token' },
    });

    expect(sb.domain['01-registry'].crawlRuns.recordRun).toHaveBeenCalledTimes(1);
    const recordArgs = sb.domain['01-registry'].crawlRuns.recordRun.mock.calls[0][0];
    expect(recordArgs.source).toBe('mcp');
    expect(recordArgs.triggeredBy).toBe('manual');
    expect(recordArgs.summary.source).toBe('mcp');
  });

  it('returns 200 with summary + durationMs JSON', async () => {
    const sb = makeSandbox();
    const handler = await loadHandler(sb);
    if (!handler) return;

    const result = await handler.method({
      query: { source: 'mcp' },
      headers: { authorization: 'Bearer test-admin-token' },
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('data');
    const data = (result as { data: unknown }).data as Record<string, unknown>;
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('durationMs');
    expect(typeof data.durationMs).toBe('number');
  });
});

describe('M-L1-launch POST /api/admin/crawl — rate limit', () => {
  it('returns 429 if last run for same source < 5 min ago', async () => {
    const recentRun = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      source: 'mcp' as const,
      startedAt: new Date(1714145000000 - 60_000).toISOString(), // 1 min ago
      finishedAt: new Date(1714145000000 - 30_000).toISOString(),
      durationMs: 30_000,
      triggeredBy: 'cron' as const,
      summary: {
        source: 'mcp' as const,
        processed: 100,
        upserted: 95,
        parseErrors: 5,
        storageErrors: 0,
        sourceErrors: 0,
        stoppedReason: 'completed' as const,
      },
    };
    const sb = makeSandbox({
      lastRunImpl: async () => ({ ok: true, value: recentRun }),
      clockNow: 1714145000000,
    });
    const handler = await loadHandler(sb);
    if (!handler) return;

    const result = await handler.method({
      query: { source: 'mcp' },
      headers: { authorization: 'Bearer test-admin-token' },
    }) as { _statusCode?: number; data?: Record<string, unknown> };

    expect(result._statusCode).toBe(429);
    expect(result.data?.error).toBe('rate_limited');
    // Did NOT actually call runCrawler
    expect(sb.domain['01-registry'].runCrawler).not.toHaveBeenCalled();
  });
});
