// movers.ts — M-L11 Phase 4 (I-2) impl.
// Port: Movers (packages/interfaces/src/intelligence.ts).
// Factory: createMovers(deps) → Object.freeze({ getMovers }).
//
// Architecture:
//   - Pure domain — zero I/O, zero side-effects
//   - moversRepo / cache / clock injected (ports)
//   - Result<MarketMoversWindow, IntelligenceError> via ok/error tagged union
//   - Cache TTL ~60s, separate key per window
//   - Window enum validated, invalid_window error otherwise
//   - topGainers: top-5 desc by repD (positive)
//   - topLosers: ≤5 asc by repD (negative)
//   - paeiHistory: 90 points

import { ok, err } from '@paxio/types';
import type { MarketMoversWindow, MoverWindow } from '@paxio/types';
import type { Result } from '@paxio/types';
import type { Movers } from '@paxio/interfaces';
import type { IntelligenceError } from '@paxio/interfaces';

// ---------------------------------------------------------------------------
// Port interfaces (injected deps)
// ---------------------------------------------------------------------------

interface MoversRepo {
  getMoversForWindow(
    window: '1h' | '24h' | '7d' | '30d',
  ): Promise<{
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

interface ClockPort {
  now(): number; // unix ms
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format unix ms → ISO datetime string. Pure — no Date.now(). */
const formatIso = (ms: number): string => new Date(ms).toISOString();

/** All valid window values. */
const VALID_WINDOWS: readonly MoverWindow[] = ['1h', '24h', '7d', '30d'];

const CACHE_TTL = 60; // seconds — per port docstring

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

type CreateDeps = {
  moversRepo: MoversRepo;
  cache: CachePort;
  clock: ClockPort;
};

export const createMovers = (deps: CreateDeps): Movers => {
  const { moversRepo, cache, clock } = deps;

  const getMovers = async (
    window: MoverWindow,
  ): Promise<Result<MarketMoversWindow, IntelligenceError>> => {
    try {
      // Validate window enum
      if (!VALID_WINDOWS.includes(window)) {
        return err({
          code: 'invalid_window',
          message: `Unsupported window: ${window}. Must be one of: 1h, 24h, 7d, 30d`,
        });
      }

      // Check cache first — separate key per window
      const cacheKey = `movers:${window}`;
      const cached = await cache.get<MarketMoversWindow>(cacheKey);
      if (cached) {
        return ok(cached);
      }

      // Fetch data from repo
      const [moversData, historyData] = await Promise.all([
        moversRepo.getMoversForWindow(window),
        moversRepo.getPaeiHistory(90),
      ]);

      const { candidates } = moversData;

      // Partition: positive repD = gainers, negative = losers
      const positive = candidates.filter(c => c.repD > 0);
      const negative = candidates.filter(c => c.repD < 0);

      // Sort: gainers desc by repD, take top-5
      const topGainers = [...positive]
        .sort((a, b) => b.repD - a.repD)
        .slice(0, 5)
        .map(c => ({
          did: c.did,
          name: c.name,
          category: c.category,
          rep: c.rep,
          repD: c.repD,
          vol24: c.vol24,
        }));

      // Sort: losers asc by repD (most negative first), take up to-5
      const topLosers = [...negative]
        .sort((a, b) => a.repD - b.repD)
        .slice(0, 5)
        .map(c => ({
          did: c.did,
          name: c.name,
          category: c.category,
          rep: c.rep,
          repD: c.repD,
          vol24: c.vol24,
        }));

      // 90-point PAEI history
      const paeiHistory = historyData.slice(-90).map(p => ({
        t: p.t,
        v: p.v,
      }));

      const nowMs = clock.now();

      const result: MarketMoversWindow = {
        window,
        topGainers: Object.freeze(topGainers),
        topLosers: Object.freeze(topLosers),
        paeiHistory: Object.freeze(paeiHistory),
        generatedAt: formatIso(nowMs),
      };

      // Cache before returning
      await cache.setex(cacheKey, CACHE_TTL, result);

      return ok(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      return err({ code: 'internal', message });
    }
  };

  return Object.freeze({ getMovers });
};