// intelligence-snapshot.ts — M-L11 Phase 4 (I-1) impl.
// Port: IntelligenceSnapshot (packages/interfaces/src/intelligence.ts).
// Factory: createIntelligenceSnapshot(deps) → Object.freeze({ getPaeiSnapshot }).
//
// Architecture:
//   - Pure domain — zero I/O, zero side-effects
//   - agentMetricsRepo / cache / clock injected (ports)
//   - Result<PaeiSnapshot, IntelligenceError> via ok/error tagged union
//   - Cache TTL ~30s (key contains "paei-snapshot")
//   - Cold registry (totalAgents=0) → zero-filled, NOT error

import { ok, err } from '@paxio/types';
import type { PaeiSnapshot } from '@paxio/types';
import type { Result } from '@paxio/types';
import type { IntelligenceSnapshot } from '@paxio/interfaces';
import type { IntelligenceError } from '@paxio/interfaces';

// ---------------------------------------------------------------------------
// Port interfaces (injected deps)
// ---------------------------------------------------------------------------

interface AgentMetricsRepo {
  aggregateAll(): Promise<{
    totalAgents: number;
    volume24Sum: number;
    paei: number;
    btc: number;
    legal: number;
    finance: number;
    research: number;
    cx: number;
    walletAdoption: number;
    x402Share: number;
    btcShare: number;
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

interface ClockPort {
  now(): number; // unix ms
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format unix ms → ISO datetime string. Pure — no Date.now(). */
const formatIso = (ms: number): string => new Date(ms).toISOString();

/** Compute % delta vs prior value. 0 if no prior or prior=0. */
const pctDelta = (current: number, prior: number): number => {
  if (prior === 0) return 0;
  return Math.round(((current - prior) / prior) * 100 * 100) / 100;
};

const CACHE_KEY = 'paei-snapshot';
const CACHE_TTL = 30; // seconds — per port docstring

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

type CreateDeps = {
  agentMetricsRepo: AgentMetricsRepo;
  cache: CachePort;
  clock: ClockPort;
};

export const createIntelligenceSnapshot = (deps: CreateDeps): IntelligenceSnapshot => {
  const { agentMetricsRepo, cache, clock } = deps;

  const getPaeiSnapshot = async (): Promise<Result<PaeiSnapshot, IntelligenceError>> => {
    try {
      // Check cache first
      const cached = await cache.get<PaeiSnapshot>(CACHE_KEY);
      if (cached) {
        return ok(cached);
      }

      // Fetch current + prior aggregates
      const [current, priorAgg] = await Promise.all([
        agentMetricsRepo.aggregateAll(),
        agentMetricsRepo.aggregatePrior(),
      ]);

      const nowMs = clock.now();
      const generatedAt = formatIso(nowMs);

      // Cold registry → zero-filled snapshot (not error)
      const isCold = current.totalAgents === 0;

      const snapshot: PaeiSnapshot = {
        paei: isCold ? 0 : current.paei,
        paeiD: isCold
          ? 0
          : pctDelta(current.paei, priorAgg?.paei ?? 0),

        btc: isCold ? 0 : current.btc,
        btcD: isCold ? 0 : pctDelta(current.btc, priorAgg?.btc ?? 0),

        legal: isCold ? 0 : current.legal,
        legalD: isCold ? 0 : pctDelta(current.legal, priorAgg?.legal ?? 0),

        finance: isCold ? 0 : current.finance,
        financeD: isCold ? 0 : pctDelta(current.finance, priorAgg?.finance ?? 0),

        research: isCold ? 0 : current.research,
        researchD: isCold ? 0 : pctDelta(current.research, priorAgg?.research ?? 0),

        cx: isCold ? 0 : current.cx,
        cxD: isCold ? 0 : pctDelta(current.cx, priorAgg?.cx ?? 0),

        walletAdoption: isCold ? 0 : current.walletAdoption,
        walletAdoptionD: isCold ? 0 : pctDelta(current.walletAdoption, priorAgg?.walletAdoption ?? 0),

        x402Share: isCold ? 0 : current.x402Share,
        x402ShareD: isCold ? 0 : pctDelta(current.x402Share, priorAgg?.x402Share ?? 0),

        btcShare: isCold ? 0 : current.btcShare,
        btcShareD: isCold ? 0 : pctDelta(current.btcShare, priorAgg?.btcShare ?? 0),

        hhi: isCold ? 0 : Math.round(current.hhi),
        drift7: isCold ? 0 : Math.round(current.drift7),
        attacks24: isCold ? 0 : current.attacks24,

        slaP50: isCold ? 0 : Math.min(Math.round(current.slaP50), 100),
        fapThroughput: isCold ? 0 : current.fapThroughput,
        uptimeAvg: isCold ? 0 : Math.min(Math.round(current.uptimeAvg * 100) / 100, 100),

        agents: current.totalAgents,
        txns: current.txns24,

        generatedAt,
      };

      // Cache result before returning
      await cache.setex(CACHE_KEY, CACHE_TTL, snapshot);

      return ok(snapshot);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      return err({ code: 'internal', message });
    }
  };

  return Object.freeze({ getPaeiSnapshot });
};