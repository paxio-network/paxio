/**
 * RED tests for tech-debt items TD-05 and TD-06.
 *
 * - TD-05: `landing-stats.ts::nowIso` is impure (calls `new Date()`).
 *          Spec: `LandingStatsDeps` must accept a `clock: () => number` dep,
 *          and `nowIso` must derive from it. This makes `getLanding` /
 *          `getNetworkSnapshot.generated_at` deterministic for testing.
 *
 * - TD-06: 7 API handlers don't validate `query` via Zod.
 *          Spec: `landing-agents-top.js` (and siblings that take query) must
 *          parse `query.limit` against an integer 1..100 schema and throw a
 *          `ValidationError` on out-of-range or non-numeric input.
 *
 * Both tests will GREEN after backend-dev applies the fixes.
 * See `docs/tech-debt.md` rows TD-05 / TD-06.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { createLandingStats } from '../app/domain/landing-stats';
import type { Result } from '@paxio/types';
import type { LandingError } from '@paxio/interfaces';

// ─── Common test fixtures ─────────────────────────────────────────────────

const FIXED_NOW_MS = 1_733_184_000_000; // 2024-12-03T00:00:00.000Z

const ok = <T>(v: T): Result<T, LandingError> => ({ ok: true, value: v });

/**
 * Build deps with `clock` injected. Cast through `unknown` because today
 * `LandingStatsDeps` does NOT yet declare `clock` — adding it is the fix.
 * Once backend-dev adds the field, this cast becomes redundant and the test
 * type-checks naturally.
 */
function makeDepsWithClock(clockMs: number) {
  const clock = () => clockMs;
  return {
    getRegistryCount: async () => ok(0),
    getRegistryAgents: async () => ok([]),
    getAuditCount24h: async () => ok(0),
    getGuardAttacks24h: async () => ok(0),
    clock,
  } as unknown as Parameters<typeof createLandingStats>[0];
}

// ─── TD-05: Clock DI for nowIso (purity) ──────────────────────────────────

describe('TD-05: createLandingStats uses injected Clock for nowIso', () => {
  it('getNetworkSnapshot.generated_at derives from deps.clock() — not new Date()', async () => {
    const stats = createLandingStats(makeDepsWithClock(FIXED_NOW_MS));
    const r = await stats.getNetworkSnapshot();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.generated_at).toBe(new Date(FIXED_NOW_MS).toISOString());
  });

  it('getLanding.generated_at derives from deps.clock() — not new Date()', async () => {
    const stats = createLandingStats(makeDepsWithClock(FIXED_NOW_MS));
    const r = await stats.getLanding();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.generated_at).toBe(new Date(FIXED_NOW_MS).toISOString());
  });

  it('two factory instances with same clock produce identical generated_at (purity)', async () => {
    const a = createLandingStats(makeDepsWithClock(FIXED_NOW_MS));
    const b = createLandingStats(makeDepsWithClock(FIXED_NOW_MS));
    const [r1, r2] = await Promise.all([a.getLanding(), b.getLanding()]);
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.value.generated_at).toBe(r2.value.generated_at);
  });

  it('different clocks produce different generated_at (DI works)', async () => {
    const earlier = createLandingStats(makeDepsWithClock(1_000_000_000_000));
    const later = createLandingStats(makeDepsWithClock(2_000_000_000_000));
    const [r1, r2] = await Promise.all([earlier.getLanding(), later.getLanding()]);
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.value.generated_at).not.toBe(r2.value.generated_at);
  });
});

// ─── TD-06: Zod-style limit validation in API handlers ────────────────────

class FakeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class FakeInternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalError';
  }
}

/**
 * Loads an api/ handler the same way `apps/back/server/src/loader.cjs` does:
 * wrap source as IIFE in a frozen VM context, return the handler object.
 */
function loadApiHandler(filename: string, sandbox: Record<string, unknown>) {
  const src = readFileSync(join(__dirname, '..', 'app', 'api', filename), 'utf8');
  const code = `'use strict';\n{\n${src}\n}`;
  const ctx = vm.createContext(Object.freeze({ ...sandbox }));
  const script = new vm.Script(code);
  return script.runInContext(ctx) as {
    httpMethod: string;
    path: string;
    method: (req: { query?: Record<string, unknown>; body?: unknown }) => Promise<unknown>;
  };
}

const okDomain = {
  '07-intelligence': {
    landing: {
      getTopAgents: async (_n: number) => ok([]),
    },
  },
};

describe('TD-06: landing API handlers validate query via Zod (bounds-check)', () => {
  it('landing-agents-top.js rejects limit=-1 with ValidationError', async () => {
    const handler = loadApiHandler('landing-agents-top.js', {
      domain: okDomain,
      errors: { ValidationError: FakeValidationError, InternalError: FakeInternalError },
    });
    await expect(handler.method({ query: { limit: -1 } })).rejects.toThrow(
      /ValidationError|limit|range|negative/i,
    );
  });

  it('landing-agents-top.js rejects limit=999999 with ValidationError', async () => {
    const handler = loadApiHandler('landing-agents-top.js', {
      domain: okDomain,
      errors: { ValidationError: FakeValidationError, InternalError: FakeInternalError },
    });
    await expect(handler.method({ query: { limit: 999999 } })).rejects.toThrow(
      /ValidationError|limit|range|max|exceed/i,
    );
  });

  it('landing-agents-top.js rejects limit="20" (string) with ValidationError', async () => {
    const handler = loadApiHandler('landing-agents-top.js', {
      domain: okDomain,
      errors: { ValidationError: FakeValidationError, InternalError: FakeInternalError },
    });
    await expect(handler.method({ query: { limit: '20' } })).rejects.toThrow(
      /ValidationError|limit|number|integer/i,
    );
  });

  it('landing-agents-top.js accepts a valid in-range limit (e.g. 20) without throwing', async () => {
    const handler = loadApiHandler('landing-agents-top.js', {
      domain: okDomain,
      errors: { ValidationError: FakeValidationError, InternalError: FakeInternalError },
    });
    const r = await handler.method({ query: { limit: 20 } });
    expect(Array.isArray(r)).toBe(true);
  });
});
