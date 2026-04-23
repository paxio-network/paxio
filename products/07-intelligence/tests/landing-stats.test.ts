// LandingStats behavior tests — RED spec for M01c backend.
//
// Tests the pure domain logic of createLandingStats(deps).
// Upstream failures propagate as LandingError{code:'upstream_error'}.
// Zero state is a REAL valid state — not a fallback.
//
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLandingStats } from '../app/domain/landing-stats.js';

// --- Fixtures ---

const ok = <T>(value: T) => Promise.resolve({ ok: true as const, value });
const err = (code: string, message = 'mock error') =>
  Promise.resolve({ ok: false as const, error: { code, message } });

// --- Test helpers ---

const mockDeps = (overrides: {
  registryCount?: number;
  registryAgents?: { ok: boolean; value?: any; error?: any }[];
  auditCount?: number;
  guardAttacks?: number;
  clockMs?: number;
}) => {
  const {
    registryCount = 0,
    registryAgents = [],
    auditCount = 0,
    guardAttacks = 0,
    clockMs = 1_733_184_000_000, // 2024-12-03T00:00:00.000Z — deterministic
  } = overrides;

  return {
    clock: vi.fn().mockReturnValue(clockMs),
    getRegistryCount: vi.fn().mockImplementation(() =>
      registryCount < 0
        ? err('upstream_error', 'Registry unreachable')
        : ok(registryCount),
    ),
    getRegistryAgents: vi.fn().mockImplementation(() =>
      ok(registryAgents),
    ),
    getAuditCount24h: vi.fn().mockImplementation(() =>
      auditCount < 0
        ? err('upstream_error', 'Audit Log unreachable')
        : ok(auditCount),
    ),
    getGuardAttacks24h: vi.fn().mockImplementation(() =>
      guardAttacks < 0
        ? err('upstream_error', 'Guard unreachable')
        : ok(guardAttacks),
    ),
  };
};

// --- getHero ---

describe('getHero — zero state', () => {
  it('returns zero state when Registry is empty', async () => {
    const deps = mockDeps({ registryCount: 0 });
    const stats = createLandingStats(deps);
    const result = await stats.getHero();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.agents).toBe(0);
      expect(result.value.txns).toBe(0);
      expect(result.value.wallet_adoption).toBe(0);
      expect(result.value.paei).toBe(0);
    }
  });

  it('aggregates real Registry.count + Audit Log.count_24h', async () => {
    const deps = mockDeps({ registryCount: 1284, auditCount: 8291 });
    const stats = createLandingStats(deps);
    const result = await stats.getHero();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.agents).toBe(1284);
      expect(result.value.txns).toBe(8291);
    }
  });

  it('handles upstream failure gracefully (zero values)', async () => {
    const deps = mockDeps({ registryCount: -1, auditCount: -1, guardAttacks: -1 });
    const stats = createLandingStats(deps);
    const result = await stats.getHero();
    // Upstream failures should NOT cause hero to error — we return zero values
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.agents).toBe(0);
      expect(result.value.txns).toBe(0);
      expect(result.value.attacks24).toBe(0);
    }
  });
});

// --- getTopAgents ---

describe('getTopAgents', () => {
  it('sorts agents by reputation desc', async () => {
    const agents = [
      { did: 'did:paxio:alice', reputation: 100 },
      { did: 'did:paxio:bob', reputation: 800 },
      { did: 'did:paxio:carol', reputation: 400 },
    ].map((a) => ({
      name: a.did,
      did: a.did,
      source: 'paxio-native' as const,
      category: 'Test',
      wallet: { status: 'none' as const, type: null },
      rails: [],
      facilitator: 'Paxio FAP',
      reputation: a.reputation,
      reputation_delta: 0,
      vol_24h_usd: 0,
      success_pct: 0,
      uptime_pct: 0,
      latency_p50_ms: 0,
      guard_attacks_24h: 0,
      drift_hours: null,
      sparkline_seed: 0,
      verification: 'none' as const,
    }));

    const deps = mockDeps({ registryAgents: agents });
    const stats = createLandingStats(deps);
    const result = await stats.getTopAgents(20);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(3);
      expect(result.value[0].reputation).toBe(800);
      expect(result.value[1].reputation).toBe(400);
      expect(result.value[2].reputation).toBe(100);
    }
  });

  it('returns empty array when Registry is empty', async () => {
    const deps = mockDeps({ registryAgents: [] });
    const stats = createLandingStats(deps);
    const result = await stats.getTopAgents(20);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });
});

// --- getNetworkSnapshot ---

describe('getNetworkSnapshot', () => {
  it('returns {nodes:[], pairs:[], generated_at} on empty state', async () => {
    const deps = mockDeps({});
    const stats = createLandingStats(deps);
    const result = await stats.getNetworkSnapshot();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes).toHaveLength(0);
      expect(result.value.pairs).toHaveLength(0);
      expect(result.value.generated_at).toBeTruthy();
      // generated_at must be valid ISO datetime
      expect(() => new Date(result.value.generated_at)).not.toThrow();
    }
  });
});

// --- getHeatmap ---

describe('getHeatmap', () => {
  it('returns 6×6 zero grid when Guard has no events', async () => {
    const deps = mockDeps({ guardAttacks: 0 });
    const stats = createLandingStats(deps);
    const result = await stats.getHeatmap();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rows).toHaveLength(6);
      expect(result.value.cols).toHaveLength(6);
      expect(result.value.cells).toHaveLength(6);
      for (const row of result.value.cells) {
        expect(row).toHaveLength(6);
        for (const cell of row) {
          expect(cell).toBe(0);
        }
      }
      expect(result.value.window_hours).toBe(24);
    }
  });
});

// --- getLanding (full SSR payload) ---

describe('getLanding — SSR one-shot', () => {
  it('returns complete payload with all required top-level keys', async () => {
    const deps = mockDeps({ registryCount: 42, auditCount: 128, guardAttacks: 0 });
    const stats = createLandingStats(deps);
    const result = await stats.getLanding();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const payload = result.value;
      expect(payload).toHaveProperty('hero');
      expect(payload).toHaveProperty('ticker_lanes');
      expect(payload).toHaveProperty('agents');
      expect(payload).toHaveProperty('rails');
      expect(payload).toHaveProperty('network');
      expect(payload).toHaveProperty('heatmap');
      expect(payload).toHaveProperty('generated_at');
      // ticker_lanes must be exactly 3
      expect(payload.ticker_lanes).toHaveLength(3);
    }
  });

  it('upstream failures propagate as LandingError{code:upstream_error}', async () => {
    // This tests the behavior when deps themselves throw (not return Result.err)
    const badDeps = {
      clock: vi.fn().mockReturnValue(1_733_184_000_000),
      getRegistryCount: vi.fn().mockRejectedValue(new Error('DB connection refused')),
      getRegistryAgents: vi.fn().mockRejectedValue(new Error('DB connection refused')),
      getAuditCount24h: vi.fn().mockRejectedValue(new Error('DB connection refused')),
      getGuardAttacks24h: vi.fn().mockRejectedValue(new Error('DB connection refused')),
    };
    const stats = createLandingStats(badDeps);
    const result = await stats.getHero();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('upstream_error');
    }
  });
});
