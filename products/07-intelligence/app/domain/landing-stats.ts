// LandingStats factory — pulls real data from Registry, Audit Log, Security,
// and FAP (or zero values if upstream is not yet available).
//
// Factory pattern: createLandingStats(deps) → LandingStats port impl.
// All functions are pure (no I/O inside the domain). Upstream calls happen
// in API handlers or are injected as async deps.
//
import type {
  Result,
  HeroState,
  TickerLane,
  AgentPreview,
  RailInfo,
  NetworkSnapshot,
  HeatGrid,
  LandingPayload,
} from '@paxio/types';
import { HEAT_ROWS, HEAT_COLS } from '@paxio/types';
import type { LandingStats, LandingError } from '@paxio/interfaces';

// --- Internal helpers (pure domain, no I/O) ---

/** Build a full 6×6 zero heatmap. Real empty state. */
const zeroHeatmap = (): HeatGrid => ({
  rows: [...HEAT_ROWS] as unknown as HeatGrid['rows'],
  cols: [...HEAT_COLS] as unknown as HeatGrid['cols'],
  cells: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0)),
  window_hours: 24,
});

/** Build zero rail array (early-phase FAP not ready). */
const zeroRails = (): RailInfo[] => [];

/** Build zero hero state (all zeros — real empty product state). */
const zeroHero = (): HeroState => ({
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
});

/** Build INDICES ticker lane from hero state. */
const buildIndicesLane = (hero: HeroState): TickerLane => ({
  lane: 'INDICES' as const,
  items: [
    {
      label: 'PAEI',
      value: hero.paei,
      delta_pct: hero.paei_d,
    },
    {
      label: 'HHI',
      value: hero.hhi > 0 ? String(hero.hhi.toLocaleString()) : '0',
      delta_pct: null,
    },
    {
      label: 'Agents',
      value: hero.agents,
      delta_pct: null,
    },
    {
      label: 'Txns 24h',
      value: hero.txns,
      delta_pct: null,
    },
  ],
});

/** Build RAILS ticker lane. */
const buildRailsLane = (hero: HeroState, rails: readonly RailInfo[]): TickerLane => {
  const items = [];
  if (hero.x402_share > 0) {
    items.push({
      label: 'x402',
      value: `${Math.round(hero.x402_share)}%`,
      delta_pct: hero.x402_share_d,
    });
  }
  if (hero.btc_share > 0) {
    items.push({
      label: 'BTC',
      value: `${Math.round(hero.btc_share)}%`,
      delta_pct: hero.btc_share_d,
      gold: true,
    });
  }
  if (rails.length > 0) {
    const topRail = rails.reduce((a, b) =>
      a.share_pct > b.share_pct ? a : b,
    );
    items.push({
      label: topRail.name,
      value: `${Math.round(topRail.share_pct)}%`,
      delta_pct: null,
    });
  }
  if (items.length === 0) {
    items.push({ label: 'x402', value: '0%', delta_pct: null });
  }
  return { lane: 'RAILS' as const, items };
};

/** Build ADOPTION ticker lane. */
const buildAdoptionLane = (hero: HeroState): TickerLane => ({
  lane: 'ADOPTION' as const,
  items: [
    {
      label: 'Wallet',
      value: `${Math.round(hero.wallet_adoption)}%`,
      delta_pct: hero.wallet_adoption_d,
      warn: hero.wallet_adoption < 5,
    },
    {
      label: 'Drift 7d',
      value: hero.drift7,
      delta_pct: null,
      warn: hero.drift7 > 50,
    },
    {
      label: 'Attacks 24h',
      value: hero.attacks24,
      delta_pct: null,
      warn: hero.attacks24 > 100,
    },
    {
      label: 'Uptime',
      value: `${Math.round(hero.uptime_avg)}%`,
      delta_pct: null,
    },
  ],
});

/** Server-generated ISO timestamp — derived from injected clock dep (purity, determinism). */
const nowIso = (clockMs: number): string => new Date(clockMs).toISOString();

// --- LandingStats factory ---

export interface LandingStatsDeps {
  /**
   * Monotonic wall-clock time in milliseconds (Unix epoch).
   * Injected for testability — avoids `new Date()` inside pure domain functions.
   */
  clock: () => number;

  /**
   * Registry count — returns number of registered agents.
   * If not available (upstream not ready), return 0.
   */
  getRegistryCount: () => Promise<Result<number, LandingError>>;

  /**
   * Registry find — returns agents sorted by reputation desc.
   * If not available, return empty array.
   */
  getRegistryAgents: (limit: number) => Promise<Result<readonly AgentPreview[], LandingError>>;

  /**
   * Audit log 24h transaction count.
   * If not available, return 0.
   */
  getAuditCount24h: () => Promise<Result<number, LandingError>>;

  /**
   * Guard attack count for last 24h.
   * If not available, return 0.
   */
  getGuardAttacks24h: () => Promise<Result<number, LandingError>>;
}

export const createLandingStats = (deps: LandingStatsDeps): LandingStats => {
  // --- getHero ---
  const getHero = async (): Promise<Result<HeroState, LandingError>> => {
    try {
      const [agentsResult, txnsResult, attacksResult] = await Promise.allSettled([
        deps.getRegistryCount(),
        deps.getAuditCount24h(),
        deps.getGuardAttacks24h(),
      ]);

      // Collect values from fulfilled ok results. Failures → zero.
      // This implements the "zero is real data" invariant.
      let agents = 0;
      let txns = 0;
      let attacks24 = 0;

      if (
        agentsResult.status === 'fulfilled' &&
        agentsResult.value.ok
      ) {
        agents = agentsResult.value.value;
      }
      if (
        txnsResult.status === 'fulfilled' &&
        txnsResult.value.ok
      ) {
        txns = txnsResult.value.value;
      }
      if (
        attacksResult.status === 'fulfilled' &&
        attacksResult.value.ok
      ) {
        attacks24 = attacksResult.value.value;
      }

      // If at least one dep call threw (rejected Promise), that's an upstream_error.
      // Promise.allSettled swallows thrown exceptions — we detect them via status.
      if (
        agentsResult.status === 'rejected' ||
        txnsResult.status === 'rejected' ||
        attacksResult.status === 'rejected'
      ) {
        const reason =
          (agentsResult.status === 'rejected' ? agentsResult.reason : null) ??
          (txnsResult.status === 'rejected' ? txnsResult.reason : null) ??
          (attacksResult.status === 'rejected' ? attacksResult.reason : null);
        return {
          ok: false,
          error: { code: 'upstream_error', message: String(reason) },
        };
      }

      return {
        ok: true,
        value: {
          ...zeroHero(),
          agents,
          txns,
          attacks24,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: { code: 'upstream_error', message: String(err) },
      };
    }
  };

  // --- getTickerLanes ---
  const getTickerLanes = async (): Promise<Result<readonly TickerLane[], LandingError>> => {
    const heroResult = await getHero();
    if (!heroResult.ok) return heroResult;
    const hero = heroResult.value;
    const rails = zeroRails();
    return {
      ok: true,
      value: Object.freeze([
        buildIndicesLane(hero),
        buildRailsLane(hero, rails),
        buildAdoptionLane(hero),
      ]),
    };
  };

  // --- getTopAgents ---
  const getTopAgents = async (limit: number): Promise<Result<readonly AgentPreview[], LandingError>> => {
    try {
      const result = await deps.getRegistryAgents(limit);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      const sorted = [...result.value].sort((a, b) => b.reputation - a.reputation);
      return { ok: true, value: Object.freeze(sorted) };
    } catch (err) {
      return {
        ok: false,
        error: { code: 'upstream_error', message: String(err) },
      };
    }
  };

  // --- getRails ---
  // Early phase: FAP not ready — return empty array, frontend shows skeleton
  const getRails = async (): Promise<Result<readonly RailInfo[], LandingError>> => {
    return { ok: true, value: [] };
  };

  // --- getNetworkSnapshot ---
  // Early phase: no agent graph data — return empty snapshot
  const getNetworkSnapshot = async (): Promise<Result<NetworkSnapshot, LandingError>> => {
    return {
      ok: true,
      value: {
        nodes: [],
        pairs: [],
        generated_at: nowIso(deps.clock()),
      },
    };
  };

  // --- getHeatmap ---
  // Early phase: Guard not ready — return all-zero grid (real empty state)
  const getHeatmap = async (): Promise<Result<HeatGrid, LandingError>> => {
    return { ok: true, value: zeroHeatmap() };
  };

  // --- getLanding ---
  // SSR one-shot — aggregates all incremental responses into one payload
  const getLanding = async (): Promise<Result<LandingPayload, LandingError>> => {
    const [heroResult, tickerResult, agentsResult] = await Promise.allSettled([
      getHero(),
      getTickerLanes(),
      getTopAgents(20),
    ]);

    const hero = heroResult.status === 'fulfilled' && heroResult.value.ok
      ? heroResult.value.value
      : zeroHero();

    const ticker_lanes = tickerResult.status === 'fulfilled' && tickerResult.value.ok
      ? tickerResult.value.value as TickerLane[]
      : Object.freeze([
          buildIndicesLane(hero),
          buildRailsLane(hero, []),
          buildAdoptionLane(hero),
        ]) as TickerLane[];

    const agents = agentsResult.status === 'fulfilled' && agentsResult.value.ok
      ? agentsResult.value.value as AgentPreview[]
      : [] as AgentPreview[];

    const ts = deps.clock();
    return {
      ok: true,
      value: {
        hero,
        ticker_lanes,
        agents,
        rails: [],
        network: {
          nodes: [],
          pairs: [],
          generated_at: nowIso(ts),
        },
        heatmap: zeroHeatmap(),
        generated_at: nowIso(ts),
      },
    };
  };

  return {
    getLanding,
    getHero,
    getTickerLanes,
    getTopAgents,
    getRails,
    getNetworkSnapshot,
    getHeatmap,
  };
};
