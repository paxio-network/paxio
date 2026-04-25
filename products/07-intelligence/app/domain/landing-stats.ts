// LandingStats factory — pulls real data from Registry, Audit Log, Security,
// and FAP (or zero values if upstream is not yet available).
//
// Factory pattern: createLandingStats(deps) → LandingStats port impl.
// All functions are pure (no I/O inside the domain). Upstream calls happen
// in API handlers or are injected as async deps.
//
// Node transformation (position hash, bitcoin_native, name truncation,
// volume_usd_5m) is delegated to the pure `buildNetworkSnapshot` from
// `network-snapshot-builder.ts` — no duplication.
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
import { buildNetworkSnapshot } from './network-snapshot-builder.js';

// --- Internal helpers (pure domain, no I/O) ---

/** Build a full 6×6 zero heatmap. Real empty state. */
const zeroHeatmap = (): HeatGrid => ({
  rows: [...HEAT_ROWS] as unknown as HeatGrid['rows'],
  cols: [...HEAT_COLS] as unknown as HeatGrid['cols'],
  cells: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0)),
  window_hours: 24,
});

/** Build zero rail array (fallback when upstream FAP is unreachable). */
const zeroRails = (): readonly RailInfo[] => Object.freeze<RailInfo[]>([]);

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

  /**
   * FAP rails catalog — canonical list of payment rails Paxio exposes
   * (x402, MPP, TAP, BTC L1, …). Returned by FapRouter.getRails().
   *
   * Injected as a dep so landing stays independent of FA-02 internals.
   * When upstream FAP is unreachable, implementations should resolve to
   * `err({ code: 'upstream_error', … })` and landing will fall back to
   * an empty array (Real Data Invariant — empty real > fake 2.4M).
   */
  getRailsCatalog: () => Promise<Result<readonly RailInfo[], LandingError>>;

  /**
   * AgentStorage port — provides listRecent for NetworkGraph nodes.
   * Introduced M-L5. Optional until PostgresStorage is landed by registry-dev.
   */
  agentStorage?: {
    listRecent(limit: number): Promise<Result<readonly import('@paxio/types').AgentCard[], LandingError>>;
  };

  /**
   * Pure node transformer for NetworkGraph.
   * Delegates to `buildNetworkSnapshot(cards, nowMs)` from
   * `network-snapshot-builder.ts` — eliminates duplicated node-building logic
   * (position hash, name truncation, bitcoin_native, volume_usd_5m).
   *
   * Optional: falls back to the real implementation when absent so existing
   * callers (test fixtures, legacy code) are not broken.
   */
  buildNetworkSnapshot?: typeof import('./network-snapshot-builder.js').buildNetworkSnapshot;
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
    // Ticker RAILS lane doesn't need the FAP catalog when traffic is zero
    // (all share_pct=0 → no interesting "top rail"). Keep it empty here.
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
  // Pulls the canonical catalog from the FAP router (FA-02). Real data:
  // 4 rails with `share_pct = 0` until M-L4b wires traffic metering.
  // On upstream failure we fall back to an empty array — Real Data
  // Invariant says "empty real is better than fake populated".
  const getRails = async (): Promise<Result<readonly RailInfo[], LandingError>> => {
    try {
      const result = await deps.getRailsCatalog();
      if (!result.ok) {
        return { ok: true, value: zeroRails() };
      }
      return { ok: true, value: result.value };
    } catch (err) {
      return { ok: true, value: zeroRails() };
    }
  };

  // --- getNetworkSnapshot ---
  // Delegates node transformation to buildNetworkSnapshot (no duplication of
  // position hash, name truncation, bitcoin_native, volume_usd_5m logic).
  const getNetworkSnapshot = async (): Promise<Result<NetworkSnapshot, LandingError>> => {
    // M-L5: populate nodes from agentStorage.listRecent when available.
    // When agentStorage is absent (legacy/in-memory impl pre-PostgresStorage),
    // return empty snapshot — Real Data Invariant (empty real > fake).
    if (deps.agentStorage?.listRecent) {
      try {
        const cardsResult = await deps.agentStorage.listRecent(20);
        if (!cardsResult.ok) {
          return { ok: false, error: { code: 'upstream_error', message: String(cardsResult.error) } };
        }
        const build = deps.buildNetworkSnapshot ?? buildNetworkSnapshot;
        return { ok: true, value: build(cardsResult.value, deps.clock()) };
      } catch (err) {
        return { ok: false, error: { code: 'upstream_error', message: String(err) } };
      }
    }
    const build = deps.buildNetworkSnapshot ?? buildNetworkSnapshot;
    return { ok: true, value: build([], deps.clock()) };
  };

  // --- getHeatmap ---
  // Early phase: Guard not ready — return all-zero grid (real empty state)
  const getHeatmap = async (): Promise<Result<HeatGrid, LandingError>> => {
    return { ok: true, value: zeroHeatmap() };
  };

  // --- getLanding ---
  // SSR one-shot — aggregates all incremental responses into one payload.
  const getLanding = async (): Promise<Result<LandingPayload, LandingError>> => {
    const [heroResult, tickerResult, agentsResult, railsResult] = await Promise.allSettled([
      getHero(),
      getTickerLanes(),
      getTopAgents(20),
      getRails(),
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

    // ZodLandingPayload requires rails.length >= 1. Once the FAP catalog
    // lands we always have ≥4 rails; the zero-rails fallback here is for
    // the narrow window where FAP is down and the landing still renders.
    const rails = railsResult.status === 'fulfilled' && railsResult.value.ok
      ? railsResult.value.value as RailInfo[]
      : zeroRails() as RailInfo[];

    const ts = deps.clock();
    return {
      ok: true,
      value: {
        hero,
        ticker_lanes,
        agents,
        rails,
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
