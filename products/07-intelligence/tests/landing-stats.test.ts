// LandingStats behavior tests — RED spec for M01c backend.
//
// Tests the pure domain logic of createLandingStats(deps).
// Upstream failures propagate as LandingError{code:'upstream_error'}.
// Zero state is a REAL valid state — not a fallback.
//
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLandingStats } from '../app/domain/landing-stats.js';
import { buildNetworkSnapshot } from '../app/domain/network-snapshot-builder.js';

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
  /**
   * M-L5: agentStorage.listRecent() result override. Default is empty array
   * (real empty state — no agents crawled yet). Pass AgentCard[] to exercise
   * the populated-snapshot path, or set `agentStorageError: true` to simulate
   * storage failure propagating as LandingError{code:'upstream_error'}.
   */
  agentCards?: any[];
  agentStorageError?: boolean;
  /**
   * Pass the real `buildNetworkSnapshot` so the factory uses it instead of
   * falling back to the module-level import. Makes tests explicit.
   */
  buildNetworkSnapshot?: typeof import('../app/domain/network-snapshot-builder.js').buildNetworkSnapshot;
}) => {
  const {
    registryCount = 0,
    registryAgents = [],
    auditCount = 0,
    guardAttacks = 0,
    clockMs = 1_733_184_000_000, // 2024-12-03T00:00:00.000Z — deterministic
    agentCards = [],
    agentStorageError = false,
    buildNetworkSnapshot: buildSnapshotFn = buildNetworkSnapshot,
  } = overrides;

  // AgentStorage port mock — only listRecent is used by getNetworkSnapshot
  // today. Full port (upsert/resolve/find/count/countBySource) is stubbed
  // with deterministic no-ops so the factory accepts the dep shape.
  const agentStorage = {
    listRecent: vi.fn().mockImplementation(() =>
      agentStorageError
        ? err('db_unavailable', 'Registry DB unreachable')
        : ok(agentCards),
    ),
    upsert: vi.fn().mockImplementation(() => ok(undefined)),
    resolve: vi.fn().mockImplementation(() => err('not_found', 'stub')),
    find: vi.fn().mockImplementation(() => ok([])),
    count: vi.fn().mockImplementation(() => ok(0)),
    countBySource: vi.fn().mockImplementation(() =>
      ok({
        native: 0,
        erc8004: 0,
        a2a: 0,
        mcp: 0,
        'fetch-ai': 0,
        virtuals: 0,
      }),
    ),
  };

  return {
    clock: vi.fn().mockReturnValue(clockMs),
    buildNetworkSnapshot: buildSnapshotFn,
    agentStorage,
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

// --- getNetworkSnapshot (M-L5) wired to AgentStorage.listRecent ----------------
//
// Contract (see docs/sprints/M-L5-network-snapshot.md T-4):
//   - Calls `deps.agentStorage.listRecent(20)` EXACTLY once per invocation
//   - Passes those cards to pure `buildNetworkSnapshot(cards, deps.clock())`
//   - On storage error → returns LandingError{code:'upstream_error'}
//   - Result is frozen (factory invariant)
//   - Never calls Date.now() directly — uses deps.clock()

describe('getNetworkSnapshot — M-L5 wired to agentStorage.listRecent', () => {
  const sampleAgentCards = [
    {
      did: 'did:paxio:base:0xaaaabbbbccccdddd1111222233334444',
      name: 'Wired Alice',
      description: 'test',
      capability: 'INTELLIGENCE',
      endpoint: 'https://alice.example.com',
      version: '1.0.0',
      createdAt: '2026-04-23T10:00:00.000Z',
      source: 'erc8004',
      externalId: '0xaaaabbbb',
      sourceUrl: 'https://basescan.org/address/0xaaaa',
      crawledAt: '2026-04-23T10:30:00.000Z',
    },
    {
      did: 'did:paxio:mcp:wired-bob',
      name: 'Wired Bob Wallet',
      description: 'wallet',
      capability: 'WALLET',
      endpoint: 'https://bob.example.com',
      version: '1.0.0',
      createdAt: '2026-04-23T11:00:00.000Z',
      source: 'mcp',
      externalId: 'wired-bob',
      sourceUrl: 'https://smithery.ai/server/wired-bob',
      crawledAt: '2026-04-23T11:30:00.000Z',
    },
  ];

  it('calls agentStorage.listRecent(20) exactly once', async () => {
    const deps = mockDeps({ agentCards: sampleAgentCards });
    const stats = createLandingStats(deps);
    await stats.getNetworkSnapshot();
    expect(deps.agentStorage.listRecent).toHaveBeenCalledTimes(1);
    expect(deps.agentStorage.listRecent).toHaveBeenCalledWith(20);
  });

  it('populates nodes array with one entry per card returned by storage', async () => {
    const deps = mockDeps({ agentCards: sampleAgentCards });
    const stats = createLandingStats(deps);
    const result = await stats.getNetworkSnapshot();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes).toHaveLength(2);
      const ids = result.value.nodes.map((n) => n.id);
      expect(ids).toContain(sampleAgentCards[0]!.did);
      expect(ids).toContain(sampleAgentCards[1]!.did);
    }
  });

  it('pairs stays empty array (MVP — no transaction data)', async () => {
    const deps = mockDeps({ agentCards: sampleAgentCards });
    const stats = createLandingStats(deps);
    const result = await stats.getNetworkSnapshot();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pairs).toStrictEqual([]);
    }
  });

  it('returns upstream_error when agentStorage fails', async () => {
    const deps = mockDeps({ agentStorageError: true });
    const stats = createLandingStats(deps);
    const result = await stats.getNetworkSnapshot();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('upstream_error');
    }
  });

  it('uses deps.clock() for generated_at (not Date.now)', async () => {
    const FIXED_MS = 1_714_000_000_000;
    const deps = mockDeps({ agentCards: [], clockMs: FIXED_MS });
    const stats = createLandingStats(deps);
    const result = await stats.getNetworkSnapshot();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.generated_at).toBe(new Date(FIXED_MS).toISOString());
    }
    expect(deps.clock).toHaveBeenCalled();
  });

  it('returns frozen snapshot (top-level + nested arrays)', async () => {
    const deps = mockDeps({ agentCards: sampleAgentCards });
    const stats = createLandingStats(deps);
    const result = await stats.getNetworkSnapshot();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.nodes)).toBe(true);
      expect(Object.isFrozen(result.value.pairs)).toBe(true);
    }
  });

  it('deterministic (same input → same output)', async () => {
    const deps1 = mockDeps({ agentCards: sampleAgentCards, clockMs: 1_714_000_000_000 });
    const deps2 = mockDeps({ agentCards: sampleAgentCards, clockMs: 1_714_000_000_000 });
    const r1 = await createLandingStats(deps1).getNetworkSnapshot();
    const r2 = await createLandingStats(deps2).getNetworkSnapshot();
    expect(r1).toStrictEqual(r2);
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
      agentStorage: {
        listRecent: vi.fn().mockRejectedValue(new Error('DB connection refused')),
        upsert: vi.fn().mockRejectedValue(new Error('DB connection refused')),
        resolve: vi.fn().mockRejectedValue(new Error('DB connection refused')),
        find: vi.fn().mockRejectedValue(new Error('DB connection refused')),
        count: vi.fn().mockRejectedValue(new Error('DB connection refused')),
        countBySource: vi.fn().mockRejectedValue(new Error('DB connection refused')),
      },
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
