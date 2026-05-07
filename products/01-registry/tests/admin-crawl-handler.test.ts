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
// Sandbox-eval helper: handler файлы используют последнее-выражение IIFE
// pattern (см. apps/back/server/src/loader.cjs). Тесты эмулируют loader
// через `vm.Script` с block-wrapping (точная копия server/loader.cjs).
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
  // Block-wrapping IIFE pattern — mirrors apps/back/server/src/loader.cjs.
  // vm.Script with block wrapping correctly handles `});` at end of handler IIFE.
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

  return {
    config: { admin: { token: adminToken } },
    // Pino-style logger mock (ctx-first, msg-second). M-L1-T3i: handler MUST
    // bind this to runCrawler logger arg via msg/ctx-swap wrapper.
    console: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
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
    // Wiring shape (apps/back/server/wiring/01-registry.cjs):
    //   domain['01-registry'].{crawler, crawlRuns, crawlerAdapters,
    //                          agentStorage, CRAWLER_SOURCES, clock}
    // Tests must mirror real shape — handler reads via FA-name nesting.
    domain: {
      '01-registry': {
        crawler: { runCrawler: vi.fn(runCrawlerImpl) },
        crawlRuns: {
          recordRun: vi.fn(recordRunImpl),
          lastRunForSource: vi.fn(lastRunImpl),
        },
        crawlerAdapters: {
          mcp: { sourceName: 'mcp' as const, fetchAgents: async function* () {}, toCanonical: () => ({ ok: false as const, error: { code: 'parse_error' as const, message: '', raw: null } }) },
        },
        agentStorage: { upsert: vi.fn(), resolve: vi.fn(), find: vi.fn(), count: vi.fn(), countBySource: vi.fn() },
        clock: () => clockNow,
        CRAWLER_SOURCES: ['native','erc8004','a2a','mcp','fetch-ai','virtuals'] as const,
      },
    },
  };
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

    expect(sb.domain['01-registry'].crawler.runCrawler).toHaveBeenCalledTimes(1);
    const callArgs = sb.domain['01-registry'].crawler.runCrawler.mock.calls[0][0];
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

  it('M-L1-T3i: passes a logger to runCrawler so storage errors are observable', async () => {
    // Production diagnosis 2026-05-07: fetch-ai pipeline took 8 iterations to
    // fix because admin-crawl.js called runCrawler WITHOUT passing a logger.
    // crawler.ts line 71: `const logger = deps.logger ?? noopLogger;` —
    // noop swallows ALL logger.warn('crawler_storage_error', ...) calls.
    // Result: 9226 silent storageErrors with zero diagnostics in `docker logs`.
    //
    // This test asserts handler injects the sandbox-bound `console` as logger,
    // wrapped to match CrawlerLogger contract (msg-first, ctx-second; Pino
    // uses ctx-first). Future bugs surface in container stdout via Pino
    // level=warn entries instead of dying silently.
    const sb = makeSandbox();
    const handler = await loadHandler(sb);
    if (!handler) return;

    await handler.method({
      query: { source: 'mcp' },
      headers: { authorization: 'Bearer test-admin-token' },
    });

    const callArgs = sb.domain['01-registry'].crawler.runCrawler.mock.calls[0][0];
    expect(callArgs.logger, 'logger MUST be passed to runCrawler').toBeDefined();
    expect(typeof callArgs.logger.info).toBe('function');
    expect(typeof callArgs.logger.warn).toBe('function');

    // Probe that the wrapper forwards to sandbox console (msg-first, ctx-second
    // → console.info/warn(ctx, msg) Pino-style).
    callArgs.logger.warn('test-event', { foo: 'bar' });
    expect(sb.console.warn).toHaveBeenCalledWith(
      expect.objectContaining({ foo: 'bar' }),
      'test-event',
    );
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
    expect(sb.domain['01-registry'].crawler.runCrawler).not.toHaveBeenCalled();
  });
});
