/**
 * M-L11 Phase 6 RED — composition root wiring spec for intelligence factories.
 *
 * Pre-impl state: `apps/back/server/wiring/07-intelligence.cjs` only wires
 * `landing` (M-L8 lineage). M-L11 Phase 6 W-1 extends it to also wire
 * `intelligenceSnapshot` + `movers` so handlers shipped in Phase 5
 * (`intelligence-paei.js` + `intelligence-movers.js`) actually have a domain
 * implementation to call.
 *
 * Backend-dev's task per `docs/sprints/M-L11-P6-intelligence-wiring.md`:
 *   - W-1.1: extend `wireIntelligenceDomain` to include the 2 new factories
 *   - W-1.2..1.4: add stub adapters in `apps/back/server/infrastructure/`
 *     (zero-fill agentMetricsRepo, empty moversRepo, in-memory cache)
 *
 * The wiring contract pinned here:
 *   - Returned object is `Object.freeze()`d
 *   - Has 3 services: `landing` (existing), `intelligenceSnapshot` (NEW), `movers` (NEW)
 *   - `intelligenceSnapshot.getPaeiSnapshot()` for cold registry → `ok({ paei: 0, ... })`
 *     matching ZodPaeiSnapshot shape
 *   - `movers.getMovers('24h')` for cold registry → `ok({ window, topGainers: [], topLosers: [], paeiHistory: [] })`
 *     matching ZodMarketMoversWindow shape
 *   - `movers.getMovers('invalid' as MoverWindow)` → `err({ code: 'invalid_window', ... })`
 *
 * Test SACRED — only architect modifies.
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { ZodPaeiSnapshot, ZodMarketMoversWindow } from '@paxio/types';

const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const WIRING_PATH = resolve(REPO_ROOT, 'apps/back/server/wiring/07-intelligence.cjs');

// Vacuous-skip if wiring file missing. After backend-dev impl this stays true,
// but the actual `wireIntelligenceDomain` shape changes. Tests use dynamic
// require + capability-probe to stay loose.
type WireFn = (
  rawDomain: Record<string, unknown>,
  deps: Record<string, unknown>,
) => Record<string, unknown>;

const tryRequireWiring = (): { wire: WireFn } | null => {
  if (!existsSync(WIRING_PATH)) return null;
  // Use require() — wiring is CJS infra module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(WIRING_PATH) as { wireIntelligenceDomain?: WireFn };
  if (typeof mod.wireIntelligenceDomain !== 'function') return null;
  return { wire: mod.wireIntelligenceDomain };
};

// rawDomain shape that loader produces — TS factories accessible via file-stem keys.
// In real impl, loader nests by `products/07-intelligence/app/domain/<file-stem>` keys.
// For test, we provide both factories directly through this stub.
const buildRawDomainStub = async (): Promise<Record<string, unknown>> => {
  const snapMod = await import('../app/domain/intelligence-snapshot.js');
  const moversMod = await import('../app/domain/movers.js');
  const landingMod = await import('../app/domain/landing-stats.js');
  return {
    'intelligence-snapshot': snapMod,
    movers: moversMod,
    'landing-stats': landingMod,
  };
};

// Minimal deps stub for wiring — adapter fields the wiring expects to inject.
// Backend-dev's actual wiring may demand more (agentStorage for landing path).
// We provide a generous superset; wiring may ignore unused fields.
const buildDepsStub = (): Record<string, unknown> => ({
  agentStorage: {
    list: async () => ({ items: [], total: 0, hasMore: false }),
    networkSnapshot: async () => ({
      generatedAt: new Date().toISOString(),
      agents: 0,
      txns24h: 0,
      walletsActive24h: 0,
      adoptionBySource: {},
      facilitatorMix: [],
    }),
  },
  // Stub adapters — fields match the AgentMetricsRepo port shape declared
  // in products/07-intelligence/app/domain/intelligence-snapshot.ts. Cold
  // registry: every numeric aggregate = 0, prior = null. ZodPaeiSnapshot
  // requires hhi/drift7/attacks24/slaP50/fapThroughput/uptimeAvg/txns24
  // present (not just composite paei/btc/...) so stub returns full shape.
  agentMetricsRepo: {
    aggregateAll: async () => ({
      totalAgents: 0,
      volume24Sum: 0,
      paei: 0,
      btc: 0,
      legal: 0,
      finance: 0,
      research: 0,
      cx: 0,
      walletAdoption: 0,
      x402Share: 0,
      btcShare: 0,
      hhi: 0,
      drift7: 0,
      attacks24: 0,
      slaP50: 0,
      fapThroughput: 0,
      uptimeAvg: 0,
      txns24: 0,
    }),
    aggregatePrior: async () => null,
  },
  moversRepo: {
    getMoversForWindow: async () => ({ candidates: [] }),
    getPaeiHistory: async () => [],
  },
  cache: (() => {
    const store = new Map<string, unknown>();
    return {
      get: async <T>(k: string): Promise<T | null> => (store.get(k) as T) ?? null,
      setex: async <T>(k: string, _ttl: number, v: T): Promise<void> => {
        store.set(k, v);
      },
    };
  })(),
  clock: { now: () => Date.parse('2026-04-29T20:00:00Z') },
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Wiring file exists + exports the function
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L11 P6 — wireIntelligenceDomain shape', () => {
  it('apps/back/server/wiring/07-intelligence.cjs exports wireIntelligenceDomain', () => {
    expect(existsSync(WIRING_PATH), `wiring file missing at ${WIRING_PATH}`).toBe(true);
    const wired = tryRequireWiring();
    expect(wired, 'wireIntelligenceDomain export missing').not.toBeNull();
  });

  it('wired result is Object.freeze()d', async () => {
    const wired = tryRequireWiring();
    if (!wired) return;
    const raw = await buildRawDomainStub();
    const result = wired.wire(raw, buildDepsStub());
    expect(Object.isFrozen(result), 'wiring result must be frozen').toBe(true);
  });

  it('wired result exposes 3 services: landing, intelligenceSnapshot, movers', async () => {
    const wired = tryRequireWiring();
    if (!wired) return;
    const raw = await buildRawDomainStub();
    const result = wired.wire(raw, buildDepsStub());
    expect(result.landing, 'landing service required (M-L8 lineage)').toBeDefined();
    expect(
      result.intelligenceSnapshot,
      'intelligenceSnapshot service required (M-L11 P6 W-1.1)',
    ).toBeDefined();
    expect(result.movers, 'movers service required (M-L11 P6 W-1.1)').toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. intelligenceSnapshot.getPaeiSnapshot — cold registry zero-fill
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L11 P6 — intelligenceSnapshot zero-fill (cold registry)', () => {
  it('getPaeiSnapshot() returns ok({ paei: 0, ... }) for cold registry', async () => {
    const wired = tryRequireWiring();
    if (!wired) return;
    const raw = await buildRawDomainStub();
    const services = wired.wire(raw, buildDepsStub()) as {
      intelligenceSnapshot?: { getPaeiSnapshot: () => Promise<unknown> };
    };
    if (!services.intelligenceSnapshot) return;
    const result = await services.intelligenceSnapshot.getPaeiSnapshot();
    expect(result, 'snapshot Result must exist').toBeDefined();
    const r = result as { ok: boolean; value?: unknown; error?: unknown };
    expect(r.ok, `snapshot ok=true expected, got error: ${JSON.stringify(r.error)}`).toBe(true);
    if (!r.ok) return;
    const parsed = ZodPaeiSnapshot.safeParse(r.value);
    expect(parsed.success, `cold snapshot must match ZodPaeiSnapshot: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`).toBe(true);
    if (!parsed.success) return;
    // Cold registry: paei composite is 0, all sub-indices 0
    expect(parsed.data.paei, 'cold registry paei composite is 0').toBe(0);
    expect(parsed.data.btc, 'cold registry btc sub-index is 0').toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. movers.getMovers — cold registry empty arrays + invalid window error
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L11 P6 — movers zero-fill (cold registry) + error path', () => {
  it("getMovers('24h') for cold registry returns ok({ topGainers: [], topLosers: [], paeiHistory: [] })", async () => {
    const wired = tryRequireWiring();
    if (!wired) return;
    const raw = await buildRawDomainStub();
    const services = wired.wire(raw, buildDepsStub()) as {
      movers?: { getMovers: (w: string) => Promise<unknown> };
    };
    if (!services.movers) return;
    const result = await services.movers.getMovers('24h');
    const r = result as { ok: boolean; value?: unknown; error?: unknown };
    expect(r.ok, `movers ok=true expected, got error: ${JSON.stringify(r.error)}`).toBe(true);
    if (!r.ok) return;
    const parsed = ZodMarketMoversWindow.safeParse(r.value);
    expect(parsed.success, `cold movers must match ZodMarketMoversWindow: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.window).toBe('24h');
    expect(parsed.data.topGainers, 'cold registry topGainers empty').toEqual([]);
    expect(parsed.data.topLosers, 'cold registry topLosers empty').toEqual([]);
  });

  it("getMovers('invalid') returns err({ code: 'invalid_window', ... })", async () => {
    const wired = tryRequireWiring();
    if (!wired) return;
    const raw = await buildRawDomainStub();
    const services = wired.wire(raw, buildDepsStub()) as {
      movers?: { getMovers: (w: string) => Promise<unknown> };
    };
    if (!services.movers) return;
    const result = await services.movers.getMovers('invalid');
    const r = result as { ok: boolean; error?: { code?: string } };
    expect(r.ok, 'invalid window must return err').toBe(false);
    if (r.ok) return;
    expect(r.error?.code, 'error.code must be invalid_window').toBe('invalid_window');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Stub adapters present in apps/back/server/infrastructure/
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L11 P6 — stub adapters scaffolded in infrastructure/', () => {
  const INFRA = resolve(REPO_ROOT, 'apps/back/server/infrastructure');

  it('agent-metrics-repo-stub.cjs exists (W-1.2)', () => {
    expect(
      existsSync(resolve(INFRA, 'agent-metrics-repo-stub.cjs')),
      'agent-metrics-repo-stub.cjs required by W-1.2',
    ).toBe(true);
  });

  it('movers-repo-stub.cjs exists (W-1.3)', () => {
    expect(
      existsSync(resolve(INFRA, 'movers-repo-stub.cjs')),
      'movers-repo-stub.cjs required by W-1.3',
    ).toBe(true);
  });

  it('cache-memory.cjs exists (W-1.4)', () => {
    expect(
      existsSync(resolve(INFRA, 'cache-memory.cjs')),
      'cache-memory.cjs required by W-1.4',
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. TODO M-L1-impl markers for stub-replacement walker
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L11 P6 — stubs marked for FA-01 M-L1-impl replacement', () => {
  it('agent-metrics-repo-stub has TODO M-L1-impl marker', async () => {
    const path = resolve(REPO_ROOT, 'apps/back/server/infrastructure/agent-metrics-repo-stub.cjs');
    if (!existsSync(path)) return;
    const fs = await import('node:fs/promises');
    const src = await fs.readFile(path, 'utf8');
    expect(src, 'TODO M-L1-impl marker required for replacement walker').toMatch(/TODO M-L1-impl/);
  });

  it('movers-repo-stub has TODO M-L1-impl marker', async () => {
    const path = resolve(REPO_ROOT, 'apps/back/server/infrastructure/movers-repo-stub.cjs');
    if (!existsSync(path)) return;
    const fs = await import('node:fs/promises');
    const src = await fs.readFile(path, 'utf8');
    expect(src).toMatch(/TODO M-L1-impl/);
  });

  it('cache-memory has TODO M-L1-impl OR Redis upgrade marker', async () => {
    const path = resolve(REPO_ROOT, 'apps/back/server/infrastructure/cache-memory.cjs');
    if (!existsSync(path)) return;
    const fs = await import('node:fs/promises');
    const src = await fs.readFile(path, 'utf8');
    expect(src).toMatch(/TODO.*Redis|TODO M-L1-impl/i);
  });
});
