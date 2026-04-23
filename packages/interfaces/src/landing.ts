// Landing data port (FA-07 Intelligence + composite from FA-01/02/04).
//
// Concrete implementation: products/07-intelligence/app/domain/landing-stats.ts
// Pulls real values from Registry count + Intel indices + FAP throughput +
// Security attack log + Audit Log txn history. Empty-but-real values allowed.

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

export interface LandingError {
  readonly code:
    | 'validation_error'
    | 'upstream_error'        // Registry / Intel / FAP unreachable
    | 'not_enough_data';      // insufficient data to compute index
  readonly message: string;
}

export interface LandingStats {
  /** Full landing snapshot — SSR one-shot on page load. */
  getLanding(): Promise<Result<LandingPayload, LandingError>>;

  /** Live hero strip — 14 live fields + indices. Poll every 1100ms. */
  getHero(): Promise<Result<HeroState, LandingError>>;

  /** 3-lane ticker (INDICES / RAILS / ADOPTION). Poll every 1100ms. */
  getTickerLanes(): Promise<Result<readonly TickerLane[], LandingError>>;

  /** Top N agents (sorted by reputation by default). */
  getTopAgents(limit: number): Promise<Result<readonly AgentPreview[], LandingError>>;

  /** Current payment rail distribution. Poll every 60s. */
  getRails(): Promise<Result<readonly RailInfo[], LandingError>>;

  /** 50-agent transaction graph snapshot. Poll every 3000ms. */
  getNetworkSnapshot(): Promise<Result<NetworkSnapshot, LandingError>>;

  /** Threat heatmap 6×6 for last 24h. Poll every 60s. */
  getHeatmap(): Promise<Result<HeatGrid, LandingError>>;
}
