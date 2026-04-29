'use strict';

/**
 * Agent-metrics repository stub — W-1.2.
 *
 * TODO M-L1-impl: replace with Postgres-backed implementation once
 * FA-01 (M-L1-impl) lands analytics aggregates via agent_storage table.
 *
 * Cold-registry (totalAgents=0): aggregateAll returns zero-filled shape,
 * aggregatePrior returns null (no prior data). Wiring relies on this
 * zero-fill to produce deterministic cold-state PAEI snapshot.
 *
 * Port interface matches `AgentMetricsRepo` from
 * products/07-intelligence/app/domain/intelligence-snapshot.ts.
 */

const agentMetricsRepoStub = {
  /**
   * Aggregate over all agents — zero-fill for cold registry.
   * @returns {Promise<{
   *   totalAgents: number;
   *   volume24Sum: number;
   *   paei: number;
   *   btc: number;
   *   legal: number;
   *   finance: number;
   *   research: number;
   *   cx: number;
   *   walletAdoption: number;
   *   x402Share: number;
   *   btcShare: number;
   *   hhi: number;
   *   drift7: number;
   *   attacks24: number;
   *   slaP50: number;
   *   fapThroughput: number;
   *   uptimeAvg: number;
   *   txns24: number;
   * }>}
   */
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

  /**
   * Prior-period aggregate — null when cold registry has no history.
   * @returns {Promise<{
   *   paei: number;
   *   btc: number;
   *   legal: number;
   *   finance: number;
   *   research: number;
   *   cx: number;
   *   walletAdoption: number;
   *   x402Share: number;
   *   btcShare: number;
   *   txns24: number;
   * } | null>}
   */
  aggregatePrior: async () => null,
};

module.exports = { agentMetricsRepoStub };