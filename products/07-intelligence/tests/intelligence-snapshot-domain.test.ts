/**
 * M-L11 Phase 4 (I-1) RED — `IntelligenceSnapshot` port impl.
 *
 * Spec: `packages/interfaces/src/intelligence.ts::IntelligenceSnapshot`.
 * Implementation target:
 *   `products/07-intelligence/app/domain/intelligence-snapshot.ts`
 *   exports `createIntelligenceSnapshot(deps)` factory.
 *
 * Architect-only — TESTS SACRED per scope-guard.md::Five Hard Rules #2.
 *
 * Backend-dev creates a factory function that:
 *   - Reads agent_metrics aggregate from injected `agentMetricsRepo` port
 *   - Computes composite PAEI + 5 sub-indices (btc/legal/finance/research/cx)
 *   - Computes adoption metrics (walletAdoption/x402Share/btcShare)
 *   - Caches via injected `cache` port (TTL ~30s — per port docstring)
 *   - Returns Result<PaeiSnapshot, IntelligenceError>
 */
import { describe, it, expect, vi } from 'vitest';
import { ZodPaeiSnapshot } from '@paxio/types';

// Module-load gate: vacuous-skip until backend-dev creates the file.
// Architect convention — same pattern as products/01-registry/tests/cron-scheduler.test.ts.
let mod: typeof import('../app/domain/intelligence-snapshot.js') | null = null;
try {
  mod = await import('../app/domain/intelligence-snapshot.js');
} catch {
  mod = null;
}

const describeOrSkip = mod ? describe : describe.skip;

interface AgentMetricsRepo {
  aggregateAll(): Promise<{
    /** Total agents counted */
    totalAgents: number;
    /** Sum of vol24 across all agents */
    volume24Sum: number;
    /** Reputation-weighted top-100 PAEI score */
    paei: number;
    /** Per-category sub-indices */
    btc: number;
    legal: number;
    finance: number;
    research: number;
    cx: number;
    /** Adoption % (0-100) */
    walletAdoption: number;
    x402Share: number;
    btcShare: number;
    /** Concentration & risk */
    hhi: number;
    drift7: number;
    attacks24: number;
    slaP50: number;
    fapThroughput: number;
    uptimeAvg: number;
    txns24: number;
  }>;
  aggregatePrior(): Promise<{
    paei: number;
    btc: number;
    legal: number;
    finance: number;
    research: number;
    cx: number;
    walletAdoption: number;
    x402Share: number;
    btcShare: number;
    txns24: number;
  } | null>;
}

interface CachePort {
  get<T>(key: string): Promise<T | null>;
  setex<T>(key: string, ttlSec: number, value: T): Promise<void>;
}

const buildRepo = (overrides: Partial<Awaited<ReturnType<AgentMetricsRepo['aggregateAll']>>> = {}): AgentMetricsRepo => ({
  aggregateAll: async () => ({
    totalAgents: 100,
    volume24Sum: 1_000_000,
    paei: 142.5,
    btc: 168.0,
    legal: 95.0,
    finance: 110.0,
    research: 75.0,
    cx: 88.0,
    walletAdoption: 64.5,
    x402Share: 42.0,
    btcShare: 35.0,
    hhi: 0.18,
    drift7: 4.2,
    attacks24: 12,
    slaP50: 280,
    fapThroughput: 8400,
    uptimeAvg: 99.1,
    txns24: 50_000,
    ...overrides,
  }),
  aggregatePrior: async () => ({
    paei: 138.7,
    btc: 162.0,
    legal: 92.0,
    finance: 108.0,
    research: 73.5,
    cx: 86.0,
    walletAdoption: 63.0,
    x402Share: 40.5,
    btcShare: 33.5,
    txns24: 47_500,
  }),
});

const buildCache = (): CachePort & { _store: Map<string, unknown> } => {
  const store = new Map<string, unknown>();
  return {
    _store: store,
    async get<T>(key: string): Promise<T | null> {
      return (store.get(key) as T) ?? null;
    },
    async setex<T>(key: string, _ttlSec: number, value: T): Promise<void> {
      store.set(key, value);
    },
  };
};

const buildClock = (initialMs = Date.parse('2026-04-29T12:00:00Z')) => {
  let ms = initialMs;
  return {
    now: vi.fn(() => ms),
    advance(deltaMs: number) {
      ms += deltaMs;
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Factory shape — frozen, port contract
// ─────────────────────────────────────────────────────────────────────────────

describeOrSkip('M-L11 P4 I-1 — createIntelligenceSnapshot factory shape', () => {
  it('exports createIntelligenceSnapshot named factory', () => {
    expect(mod).toBeTruthy();
    expect(typeof mod!.createIntelligenceSnapshot).toBe('function');
  });

  it('factory returns frozen object with single getPaeiSnapshot method', () => {
    const svc = mod!.createIntelligenceSnapshot({
      agentMetricsRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    expect(Object.isFrozen(svc)).toBe(true);
    expect(Object.getPrototypeOf(svc)).toBe(Object.prototype);
    expect(typeof svc.getPaeiSnapshot).toBe('function');
    expect(Object.keys(svc).sort()).toEqual(['getPaeiSnapshot']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Output shape — ZodPaeiSnapshot conformance
// ─────────────────────────────────────────────────────────────────────────────

describeOrSkip('M-L11 P4 I-1 — getPaeiSnapshot returns ZodPaeiSnapshot-shaped Result', () => {
  it('on success returns Result<PaeiSnapshot, _> with all 17 scalar fields', async () => {
    const svc = mod!.createIntelligenceSnapshot({
      agentMetricsRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    const r = await svc.getPaeiSnapshot();
    expect(r.ok, `expected ok=true, got: ${JSON.stringify(r)}`).toBe(true);
    if (r.ok) {
      const parsed = ZodPaeiSnapshot.safeParse(r.value);
      if (!parsed.success) {
        const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new Error(`PaeiSnapshot fails Zod: ${issues}`);
      }
    }
  });

  it('paeiD computed as % change vs prior (when prior available)', async () => {
    const svc = mod!.createIntelligenceSnapshot({
      agentMetricsRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    const r = await svc.getPaeiSnapshot();
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Computed: (142.5 - 138.7) / 138.7 * 100 ≈ 2.74
      expect(r.value.paeiD).toBeCloseTo(2.74, 1);
    }
  });

  it('zero-fills snapshot when registry is cold (totalAgents=0)', async () => {
    const repo: AgentMetricsRepo = {
      aggregateAll: async () => ({
        totalAgents: 0, volume24Sum: 0,
        paei: 0, btc: 0, legal: 0, finance: 0, research: 0, cx: 0,
        walletAdoption: 0, x402Share: 0, btcShare: 0,
        hhi: 0, drift7: 0, attacks24: 0, slaP50: 0,
        fapThroughput: 0, uptimeAvg: 0, txns24: 0,
      }),
      aggregatePrior: async () => null,
    };
    const svc = mod!.createIntelligenceSnapshot({
      agentMetricsRepo: repo,
      cache: buildCache(),
      clock: buildClock(),
    });
    const r = await svc.getPaeiSnapshot();
    // Per IntelligenceSnapshot port docstring: "If no agents yet (cold registry),
    // returns zero-filled snapshot, not error."
    expect(r.ok, 'cold registry must NOT be error').toBe(true);
    if (r.ok) {
      expect(r.value.paei).toBe(0);
      expect(r.value.paeiD).toBe(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cache behaviour — TTL ~30s per port docstring
// ─────────────────────────────────────────────────────────────────────────────

describeOrSkip('M-L11 P4 I-1 — caching (TTL ~30s)', () => {
  it('first call hits repo, second within TTL hits cache', async () => {
    const cache = buildCache();
    const repo = buildRepo();
    const aggSpy = vi.spyOn(repo, 'aggregateAll');
    const svc = mod!.createIntelligenceSnapshot({
      agentMetricsRepo: repo,
      cache,
      clock: buildClock(),
    });
    await svc.getPaeiSnapshot();
    await svc.getPaeiSnapshot();
    expect(aggSpy.mock.calls.length, 'second call must hit cache, not repo').toBe(1);
  });

  it('cache key contains "paei-snapshot" for namespace stability', async () => {
    const cache = buildCache();
    const svc = mod!.createIntelligenceSnapshot({
      agentMetricsRepo: buildRepo(),
      cache,
      clock: buildClock(),
    });
    await svc.getPaeiSnapshot();
    const keys = [...cache._store.keys()];
    expect(keys.some(k => k.includes('paei-snapshot'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Determinism — same inputs → same shape (V8 monomorphic)
// ─────────────────────────────────────────────────────────────────────────────

describeOrSkip('M-L11 P4 I-1 — deterministic shape across calls', () => {
  it('two calls return objects with identical key sets', async () => {
    const svc1 = mod!.createIntelligenceSnapshot({
      agentMetricsRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    const svc2 = mod!.createIntelligenceSnapshot({
      agentMetricsRepo: buildRepo({ totalAgents: 250, paei: 200 }),
      cache: buildCache(),
      clock: buildClock(),
    });
    const r1 = await svc1.getPaeiSnapshot();
    const r2 = await svc2.getPaeiSnapshot();
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(Object.keys(r1.value).sort()).toEqual(Object.keys(r2.value).sort());
    }
  });
});
