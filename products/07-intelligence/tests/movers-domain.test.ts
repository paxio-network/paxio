/**
 * M-L11 Phase 4 (I-2) RED — `Movers` port impl.
 *
 * Spec: `packages/interfaces/src/intelligence.ts::Movers`.
 * Implementation target:
 *   `products/07-intelligence/app/domain/movers.ts`
 *   exports `createMovers(deps)` factory.
 *
 * Architect-only — TESTS SACRED.
 *
 * Backend-dev creates a factory function that:
 *   - Reads windowed reputation deltas via injected `agentMetricsRepo` port
 *   - Returns top-5 gainers + top-5 losers + 90-day PAEI history sparkline
 *   - Caches via injected `cache` port (TTL ~60s — per port docstring)
 *   - Validates `window` parameter is one of '1h' | '24h' | '7d' | '30d'
 *   - Returns Result<MarketMoversWindow, IntelligenceError>
 */
import { describe, it, expect, vi } from 'vitest';
import { ZodMarketMoversWindow } from '@paxio/types';

let mod: typeof import('../app/domain/movers.js') | null = null;
try {
  mod = await import('../app/domain/movers.js');
} catch {
  mod = null;
}

const describeOrSkip = mod ? describe : describe.skip;

interface MoversRepo {
  getMoversForWindow(window: '1h' | '24h' | '7d' | '30d'): Promise<{
    /** All agents whose reputation changed during the window */
    candidates: Array<{
      did: string;
      name: string;
      category: string;
      rep: number;
      repD: number;
      vol24: number;
    }>;
  }>;
  getPaeiHistory(daysBack: number): Promise<Array<{ t: number; v: number }>>;
}

interface CachePort {
  get<T>(key: string): Promise<T | null>;
  setex<T>(key: string, ttlSec: number, value: T): Promise<void>;
}

const buildRepo = (): MoversRepo => ({
  getMoversForWindow: async () => ({
    candidates: [
      // 8 candidates — impl picks top 5 each side
      { did: 'did:1', name: 'btc-escrow.paxio',  category: 'Bitcoin · Escrow', rep: 812, repD: +44, vol24: 8_400_000 },
      { did: 'did:2', name: 'btc-dca.paxio',     category: 'Bitcoin · DCA',    rep: 881, repD: +36, vol24: 2_100_000 },
      { did: 'did:3', name: 'oracle-prime',      category: 'Research',         rep: 712, repD: +28, vol24: 320_000 },
      { did: 'did:4', name: 'fap-router-1',      category: 'Infrastructure',   rep: 623, repD: +22, vol24: 1_200_000 },
      { did: 'did:5', name: 'kyc-bridge',        category: 'Compliance',       rep: 491, repD: +14, vol24: 450_000 },
      // gainers above (5)
      { did: 'did:6', name: 'kyc-eu-stub',       category: 'Compliance',       rep: 320, repD: -45, vol24: 80_000 },
      { did: 'did:7', name: 'oracle-stub-2',     category: 'Research',         rep: 190, repD: -38, vol24: 25_000 },
      { did: 'did:8', name: 'agent-dust',        category: 'Other',            rep: 100, repD: -15, vol24: 5_000 },
    ],
  }),
  getPaeiHistory: async (daysBack: number) =>
    Array.from({ length: daysBack }, (_, i) => ({
      t: 1714000000 + i * 86400,
      v: 100 + Math.sin(i / 10) * 20,
    })),
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

const buildClock = (initialMs = Date.parse('2026-04-29T12:00:00Z')) => ({
  now: vi.fn(() => initialMs),
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Factory shape
// ─────────────────────────────────────────────────────────────────────────────

describeOrSkip('M-L11 P4 I-2 — createMovers factory shape', () => {
  it('exports createMovers named factory', () => {
    expect(mod).toBeTruthy();
    expect(typeof mod!.createMovers).toBe('function');
  });

  it('factory returns frozen object with single getMovers method', () => {
    const svc = mod!.createMovers({
      moversRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    expect(Object.isFrozen(svc)).toBe(true);
    expect(typeof svc.getMovers).toBe('function');
    expect(Object.keys(svc).sort()).toEqual(['getMovers']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Output shape — ZodMarketMoversWindow
// ─────────────────────────────────────────────────────────────────────────────

describeOrSkip('M-L11 P4 I-2 — getMovers returns ZodMarketMoversWindow-shaped Result', () => {
  it('on success returns Result<MarketMoversWindow, _> conformant', async () => {
    const svc = mod!.createMovers({
      moversRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    const r = await svc.getMovers('24h');
    expect(r.ok, `expected ok=true, got: ${JSON.stringify(r)}`).toBe(true);
    if (r.ok) {
      const parsed = ZodMarketMoversWindow.safeParse(r.value);
      if (!parsed.success) {
        const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new Error(`MarketMoversWindow fails Zod: ${issues}`);
      }
    }
  });

  it('topGainers contains exactly 5 entries sorted desc by repD', async () => {
    const svc = mod!.createMovers({
      moversRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    const r = await svc.getMovers('24h');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.topGainers.length).toBe(5);
      const repDs = r.value.topGainers.map(g => g.repD);
      expect(repDs).toEqual([...repDs].sort((a, b) => b - a));
      expect(repDs.every(d => d > 0), 'gainers must have positive repD').toBe(true);
    }
  });

  it('topLosers contains exactly the negative-repD entries sorted asc by repD', async () => {
    const svc = mod!.createMovers({
      moversRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    const r = await svc.getMovers('24h');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.topLosers.length).toBeGreaterThan(0);
      expect(r.value.topLosers.length).toBeLessThanOrEqual(5);
      const repDs = r.value.topLosers.map(l => l.repD);
      expect(repDs).toEqual([...repDs].sort((a, b) => a - b));
      expect(repDs.every(d => d < 0), 'losers must have negative repD').toBe(true);
    }
  });

  it('paeiHistory has 90 points (90-day chart per port docstring)', async () => {
    const svc = mod!.createMovers({
      moversRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    const r = await svc.getMovers('24h');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.paeiHistory.length).toBe(90);
    }
  });

  it('window field echoes input window', async () => {
    const svc = mod!.createMovers({
      moversRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    for (const w of ['1h', '24h', '7d', '30d'] as const) {
      const r = await svc.getMovers(w);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.window).toBe(w);
      }
    }
  });

  it('generatedAt is ISO datetime string from injected clock', async () => {
    const fixedMs = Date.parse('2026-04-29T12:00:00Z');
    const svc = mod!.createMovers({
      moversRepo: buildRepo(),
      cache: buildCache(),
      clock: { now: () => fixedMs },
    });
    const r = await svc.getMovers('24h');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.generatedAt).toBe('2026-04-29T12:00:00.000Z');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Window validation
// ─────────────────────────────────────────────────────────────────────────────

describeOrSkip('M-L11 P4 I-2 — window param validation', () => {
  it('returns invalid_window error for unsupported window value', async () => {
    const svc = mod!.createMovers({
      moversRepo: buildRepo(),
      cache: buildCache(),
      clock: buildClock(),
    });
    // @ts-expect-error — '12h' is not in ZodMoverWindow enum
    const r = await svc.getMovers('12h');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('invalid_window');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cache behaviour — TTL ~60s per port docstring
// ─────────────────────────────────────────────────────────────────────────────

describeOrSkip('M-L11 P4 I-2 — caching (TTL ~60s)', () => {
  it('first call hits repo, second within TTL hits cache', async () => {
    const cache = buildCache();
    const repo = buildRepo();
    const spy = vi.spyOn(repo, 'getMoversForWindow');
    const svc = mod!.createMovers({
      moversRepo: repo,
      cache,
      clock: buildClock(),
    });
    await svc.getMovers('24h');
    await svc.getMovers('24h');
    expect(spy.mock.calls.length, 'second call must hit cache').toBe(1);
  });

  it('different window values cache separately', async () => {
    const cache = buildCache();
    const repo = buildRepo();
    const spy = vi.spyOn(repo, 'getMoversForWindow');
    const svc = mod!.createMovers({
      moversRepo: repo,
      cache,
      clock: buildClock(),
    });
    await svc.getMovers('1h');
    await svc.getMovers('24h');
    await svc.getMovers('7d');
    await svc.getMovers('30d');
    expect(spy.mock.calls.length, 'each unique window hits repo').toBe(4);
    // Re-call all 4 — should be cache hits
    await svc.getMovers('1h');
    await svc.getMovers('24h');
    await svc.getMovers('7d');
    await svc.getMovers('30d');
    expect(spy.mock.calls.length, 'repeats hit cache').toBe(4);
  });

  it('cache key contains "movers" + window for namespace stability', async () => {
    const cache = buildCache();
    const svc = mod!.createMovers({
      moversRepo: buildRepo(),
      cache,
      clock: buildClock(),
    });
    await svc.getMovers('24h');
    const keys = [...cache._store.keys()];
    expect(keys.some(k => k.includes('movers') && k.includes('24h'))).toBe(true);
  });
});
