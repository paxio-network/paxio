// Intelligence ports — domain contracts for M-L11 real-data pipeline.
//
// 3 endpoints, 3 ports. Pure interfaces — no I/O assumptions.
// Implementations live in `products/07-intelligence/app/domain/` and are
// wired via `apps/back/server/wiring/07-intelligence.cjs`.
//
// Composition root passes injected agentStorage (for list), reputation
// canister proxy (for snapshot/movers), and clock (for windowed aggregates).

import type {
  PaeiSnapshot,
  AgentListPage,
  AgentListQuery,
  MarketMoversWindow,
  MoverWindow,
  Result,
} from '@paxio/types';

export type IntelligenceError =
  | { code: 'data_unavailable'; message: string }
  | { code: 'invalid_window'; message: string }
  | { code: 'invalid_query'; message: string }
  | { code: 'internal'; message: string };

/**
 * IntelligenceSnapshot port — composite + subindices + adoption.
 *
 * Public endpoint (B4 exception in scope-guard.md): no agentDid filter,
 * aggregate over all agents. Cache TTL ~30s server-side, downstream
 * frontend polls every 1.1s but gets stable values until snapshot regenerates.
 */
export interface IntelligenceSnapshot {
  /**
   * Latest PAEI snapshot — always fresh OR returns cached version with
   * `generatedAt` no older than 60s. If no agents yet (cold registry),
   * returns zero-filled snapshot, not error.
   */
  getPaeiSnapshot(): Promise<Result<PaeiSnapshot, IntelligenceError>>;
}

/**
 * RegistryList port — paginated agents listing for B5 hero table.
 *
 * Public endpoint: registry browsing is press-magnet (B4). No tenant filter,
 * but consumes PUBLIC AgentCard fields only — no internal billing/identity.
 *
 * Pagination: cursor-based (opaque string). Returns up to `query.limit`
 * matching `query.source/category/walletAttached/verifMin`, sorted by
 * `query.sort`.
 */
export interface RegistryList {
  list(
    query: AgentListQuery,
  ): Promise<Result<AgentListPage, IntelligenceError>>;
}

/**
 * Movers port — top gainers/losers + PAEI history for hero "market movers".
 *
 * Public endpoint. Window = 1h | 24h | 7d | 30d. Returns top-5 each side
 * + 90-day PAEI sparkline.
 */
export interface Movers {
  getMovers(
    window: MoverWindow,
  ): Promise<Result<MarketMoversWindow, IntelligenceError>>;
}
