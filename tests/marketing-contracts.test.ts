// Contract-level tests for marketing/landing Zod schemas.
// Locks down the on-wire shape so implementation cannot drift.
// These schemas drive the real-data API at /api/marketing/*.

import { describe, it, expect } from 'vitest';
import {
  ZodHeroState,
  ZodTickerCell,
  ZodTickerLane,
  ZodAgentPreview,
  ZodRailInfo,
  ZodNetworkNode,
  ZodNetworkPair,
  ZodNetworkSnapshot,
  ZodHeatGrid,
  ZodMarketingLanding,
  TICKER_LANES,
  AGENT_SOURCES,
  VERIFICATION_LEVELS,
  NETWORK_RAILS,
  HEAT_ROWS,
  HEAT_COLS,
} from '@paxio/types';

// --- Fixtures ---

const heroZero = {
  agents: 0,
  txns: 0,
  wallet_adoption: 0,
  wallet_adoption_d: 0,
  x402_share: 0,
  x402_share_d: 0,
  btc_share: 0,
  btc_share_d: 0,
  hhi: 0,
  drift7: 0,
  attacks24: 0,
  sla_p50: 0,
  uptime_avg: 0,
  fap_throughput: 0,
  paei: 0,
  paei_d: 0,
  btc: 0,
  btc_d: 0,
  legal: 0,
  legal_d: 0,
  finance: 0,
  finance_d: 0,
  research: 0,
  research_d: 0,
  cx: 0,
  cx_d: 0,
};

const sampleAgent = {
  name: 'btc-escrow.paxio',
  did: 'did:paxio:base:0x91abc',
  source: 'paxio-native' as const,
  category: 'Bitcoin · Escrow',
  wallet: { status: 'paxio-native' as const, type: 'btc+usdc' as const },
  rails: ['BTC L1', 'USDC', 'x402'],
  facilitator: 'Paxio FAP',
  reputation: 812,
  reputation_delta: 12,
  vol_24h_usd: 8_400_000,
  success_pct: 98.7,
  uptime_pct: 99.4,
  latency_p50_ms: 284,
  guard_attacks_24h: 12,
  drift_hours: null,
  sparkline_seed: 2,
  verification: 'gold' as const,
};

const sampleRail = {
  name: 'Coinbase x402',
  share_pct: 67,
  latency_ms: 120,
  fee_description: '0.18%',
  color_hex: '#A54233',
  concentration_risk: true,
};

const sampleNode = {
  id: 'btc-escrow.paxio',
  name: 'btc-escrow.paxio',
  x_pct: 50,
  y_pct: 28,
  volume_usd_5m: 84000,
  bitcoin_native: true,
};

const samplePair = {
  from_id: 'btc-escrow.paxio',
  to_id: 'payroll-agent.paxio',
  txn_count: 14,
  vol_usd_5m: 8400,
  rail: 'BTC L1' as const,
  last_timestamp: 1_713_547_200_000,
};

// --- ZodHeroState ---

describe('ZodHeroState', () => {
  it('accepts the zero state (fresh product, no users yet = real valid state)', () => {
    expect(ZodHeroState.safeParse(heroZero).success).toBe(true);
  });

  it('accepts fully populated live state', () => {
    const live = {
      ...heroZero,
      agents: 2_483_921,
      txns: 1_204_883,
      wallet_adoption: 42.3,
      wallet_adoption_d: 2.1,
      x402_share: 68.2,
      x402_share_d: -0.4,
      btc_share: 9.1,
      btc_share_d: 0.7,
      hhi: 4620,
      drift7: 312,
      attacks24: 1_204_883,
      sla_p50: 98.2,
      uptime_avg: 99.1,
      fap_throughput: 18_200_000,
      paei: 1284.7,
      paei_d: 0.82,
      btc: 431.9,
      btc_d: 1.42,
    };
    expect(ZodHeroState.safeParse(live).success).toBe(true);
  });

  it('rejects negative agents count', () => {
    expect(ZodHeroState.safeParse({ ...heroZero, agents: -1 }).success).toBe(false);
  });

  it('rejects wallet_adoption > 100', () => {
    expect(ZodHeroState.safeParse({ ...heroZero, wallet_adoption: 150 }).success).toBe(false);
  });

  it('accepts negative deltas (percentages CAN decrease)', () => {
    expect(ZodHeroState.safeParse({ ...heroZero, wallet_adoption_d: -2.5 }).success).toBe(true);
  });
});

// --- ZodTickerCell ---

describe('ZodTickerCell', () => {
  it('accepts numeric value with delta', () => {
    const cell = { label: 'PAEI', value: 1284.7, delta_pct: 0.82, gold: true };
    expect(ZodTickerCell.safeParse(cell).success).toBe(true);
  });

  it('accepts string value (pre-formatted, e.g. HHI)', () => {
    const cell = { label: 'HHI', value: '4,620', delta_pct: null };
    expect(ZodTickerCell.safeParse(cell).success).toBe(true);
  });

  it('requires delta_pct field (nullable, not optional)', () => {
    const cell = { label: 'PAEI', value: 1284.7 };
    expect(ZodTickerCell.safeParse(cell).success).toBe(false);
  });

  it('rejects label > 40 chars', () => {
    const cell = { label: 'x'.repeat(41), value: 1, delta_pct: null };
    expect(ZodTickerCell.safeParse(cell).success).toBe(false);
  });
});

// --- ZodTickerLane ---

describe('ZodTickerLane', () => {
  it('enumerates INDICES, RAILS, ADOPTION', () => {
    expect(TICKER_LANES).toEqual(['INDICES', 'RAILS', 'ADOPTION']);
  });

  it('accepts a lane with ≥1 cell', () => {
    const lane = {
      lane: 'INDICES' as const,
      items: [{ label: 'PAEI', value: 1284.7, delta_pct: 0.82 }],
    };
    expect(ZodTickerLane.safeParse(lane).success).toBe(true);
  });

  it('rejects empty items array', () => {
    expect(
      ZodTickerLane.safeParse({ lane: 'INDICES', items: [] }).success,
    ).toBe(false);
  });

  it('rejects unknown lane name', () => {
    expect(
      ZodTickerLane.safeParse({ lane: 'OTHER', items: [{ label: 'X', value: 1, delta_pct: null }] })
        .success,
    ).toBe(false);
  });
});

// --- ZodAgentPreview ---

describe('ZodAgentPreview', () => {
  it('accepts valid preview', () => {
    expect(ZodAgentPreview.safeParse(sampleAgent).success).toBe(true);
  });

  it('enumerates all agent sources from ТЗ v2.0', () => {
    expect(AGENT_SOURCES).toEqual([
      'paxio-native',
      'ERC-8004',
      'MCP',
      'Fetch.ai',
      'Virtuals',
      'ElizaOS',
      'A2A',
    ]);
  });

  it('enumerates verification levels', () => {
    expect(VERIFICATION_LEVELS).toEqual(['gold', 'silver', 'basic', 'none']);
  });

  it('rejects reputation > 1000', () => {
    expect(
      ZodAgentPreview.safeParse({ ...sampleAgent, reputation: 1500 }).success,
    ).toBe(false);
  });

  it('rejects success_pct > 100', () => {
    expect(
      ZodAgentPreview.safeParse({ ...sampleAgent, success_pct: 105 }).success,
    ).toBe(false);
  });

  it('accepts drift_hours = null (no drift)', () => {
    expect(
      ZodAgentPreview.safeParse({ ...sampleAgent, drift_hours: null }).success,
    ).toBe(true);
  });

  it('accepts drift_hours = 72.5 (numeric)', () => {
    expect(
      ZodAgentPreview.safeParse({ ...sampleAgent, drift_hours: 72.5 }).success,
    ).toBe(true);
  });

  it('rejects unknown source', () => {
    expect(
      ZodAgentPreview.safeParse({ ...sampleAgent, source: 'custom-chain' }).success,
    ).toBe(false);
  });
});

// --- ZodRailInfo ---

describe('ZodRailInfo', () => {
  it('accepts a typical rail', () => {
    expect(ZodRailInfo.safeParse(sampleRail).success).toBe(true);
  });

  it('rejects share_pct > 100', () => {
    expect(
      ZodRailInfo.safeParse({ ...sampleRail, share_pct: 125 }).success,
    ).toBe(false);
  });

  it('rejects invalid color hex', () => {
    expect(
      ZodRailInfo.safeParse({ ...sampleRail, color_hex: 'red' }).success,
    ).toBe(false);
  });

  it('accepts optional growing flag', () => {
    expect(
      ZodRailInfo.safeParse({ ...sampleRail, growing: true }).success,
    ).toBe(true);
  });
});

// --- ZodNetworkNode / Pair / Snapshot ---

describe('ZodNetworkNode', () => {
  it('accepts a node in-canvas', () => {
    expect(ZodNetworkNode.safeParse(sampleNode).success).toBe(true);
  });

  it('rejects x_pct > 100 (out of canvas)', () => {
    expect(
      ZodNetworkNode.safeParse({ ...sampleNode, x_pct: 150 }).success,
    ).toBe(false);
  });
});

describe('ZodNetworkPair', () => {
  it('accepts a valid pair', () => {
    expect(ZodNetworkPair.safeParse(samplePair).success).toBe(true);
  });

  it('enumerates known rails', () => {
    expect(NETWORK_RAILS).toEqual(['BTC L1', 'x402', 'USDC', 'MPP', 'Skyfire']);
  });

  it('rejects unknown rail', () => {
    expect(
      ZodNetworkPair.safeParse({ ...samplePair, rail: 'ACH' }).success,
    ).toBe(false);
  });
});

describe('ZodNetworkSnapshot', () => {
  it('accepts empty snapshot (early product state — real, not mock)', () => {
    const snap = { nodes: [], pairs: [], generated_at: '2026-04-22T10:00:00.000Z' };
    expect(ZodNetworkSnapshot.safeParse(snap).success).toBe(true);
  });

  it('accepts a 1-node 1-pair snapshot', () => {
    const snap = {
      nodes: [sampleNode],
      pairs: [samplePair],
      generated_at: '2026-04-22T10:00:00.000Z',
    };
    expect(ZodNetworkSnapshot.safeParse(snap).success).toBe(true);
  });

  it('rejects missing generated_at', () => {
    expect(
      ZodNetworkSnapshot.safeParse({ nodes: [], pairs: [] }).success,
    ).toBe(false);
  });
});

// --- ZodHeatGrid ---

describe('ZodHeatGrid', () => {
  it('exposes exactly 6 rows and 6 cols per ТЗ v2.0', () => {
    expect(HEAT_ROWS.length).toBe(6);
    expect(HEAT_COLS.length).toBe(6);
  });

  it('accepts an all-zero 6×6 heatmap (real empty state)', () => {
    const grid = {
      rows: [...HEAT_ROWS] as unknown as typeof HEAT_ROWS,
      cols: [...HEAT_COLS] as unknown as typeof HEAT_COLS,
      cells: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0)),
      window_hours: 24 as const,
    };
    expect(ZodHeatGrid.safeParse(grid).success).toBe(true);
  });

  it('rejects 5×6 cells grid (size mismatch)', () => {
    const bad = {
      rows: [...HEAT_ROWS] as unknown as typeof HEAT_ROWS,
      cols: [...HEAT_COLS] as unknown as typeof HEAT_COLS,
      cells: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => 0)),
      window_hours: 24 as const,
    };
    expect(ZodHeatGrid.safeParse(bad).success).toBe(false);
  });

  it('rejects negative cell values', () => {
    const bad = {
      rows: [...HEAT_ROWS] as unknown as typeof HEAT_ROWS,
      cols: [...HEAT_COLS] as unknown as typeof HEAT_COLS,
      cells: Array.from({ length: 6 }, (_, i) =>
        Array.from({ length: 6 }, (_, j) => (i === 0 && j === 0 ? -1 : 0)),
      ),
      window_hours: 24 as const,
    };
    expect(ZodHeatGrid.safeParse(bad).success).toBe(false);
  });

  it('rejects window_hours other than 24', () => {
    const bad = {
      rows: [...HEAT_ROWS] as unknown as typeof HEAT_ROWS,
      cols: [...HEAT_COLS] as unknown as typeof HEAT_COLS,
      cells: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0)),
      window_hours: 48,
    };
    expect(ZodHeatGrid.safeParse(bad).success).toBe(false);
  });
});

// --- ZodMarketingLanding (composite SSR payload) ---

describe('ZodMarketingLanding', () => {
  it('accepts a complete landing payload', () => {
    const payload = {
      hero: heroZero,
      ticker_lanes: [
        { lane: 'INDICES' as const, items: [{ label: 'PAEI', value: 0, delta_pct: null }] },
        { lane: 'RAILS' as const, items: [{ label: 'x402', value: '0%', delta_pct: null }] },
        { lane: 'ADOPTION' as const, items: [{ label: 'Wallet', value: '0%', delta_pct: null }] },
      ],
      agents: [],
      rails: [sampleRail],
      network: { nodes: [], pairs: [], generated_at: '2026-04-22T10:00:00.000Z' },
      heatmap: {
        rows: [...HEAT_ROWS] as unknown as typeof HEAT_ROWS,
        cols: [...HEAT_COLS] as unknown as typeof HEAT_COLS,
        cells: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0)),
        window_hours: 24 as const,
      },
      generated_at: '2026-04-22T10:00:00.000Z',
    };
    expect(ZodMarketingLanding.safeParse(payload).success).toBe(true);
  });

  it('requires exactly 3 ticker lanes', () => {
    const payload = {
      hero: heroZero,
      ticker_lanes: [
        { lane: 'INDICES' as const, items: [{ label: 'PAEI', value: 0, delta_pct: null }] },
      ],
      agents: [],
      rails: [sampleRail],
      network: { nodes: [], pairs: [], generated_at: '2026-04-22T10:00:00.000Z' },
      heatmap: {
        rows: [...HEAT_ROWS] as unknown as typeof HEAT_ROWS,
        cols: [...HEAT_COLS] as unknown as typeof HEAT_COLS,
        cells: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0)),
        window_hours: 24 as const,
      },
      generated_at: '2026-04-22T10:00:00.000Z',
    };
    expect(ZodMarketingLanding.safeParse(payload).success).toBe(false);
  });

  it('rejects agents array > 20', () => {
    const bigAgents = Array.from({ length: 21 }, () => sampleAgent);
    const payload = {
      hero: heroZero,
      ticker_lanes: [
        { lane: 'INDICES' as const, items: [{ label: 'PAEI', value: 0, delta_pct: null }] },
        { lane: 'RAILS' as const, items: [{ label: 'x402', value: '0%', delta_pct: null }] },
        { lane: 'ADOPTION' as const, items: [{ label: 'Wallet', value: '0%', delta_pct: null }] },
      ],
      agents: bigAgents,
      rails: [sampleRail],
      network: { nodes: [], pairs: [], generated_at: '2026-04-22T10:00:00.000Z' },
      heatmap: {
        rows: [...HEAT_ROWS] as unknown as typeof HEAT_ROWS,
        cols: [...HEAT_COLS] as unknown as typeof HEAT_COLS,
        cells: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0)),
        window_hours: 24 as const,
      },
      generated_at: '2026-04-22T10:00:00.000Z',
    };
    expect(ZodMarketingLanding.safeParse(payload).success).toBe(false);
  });
});
