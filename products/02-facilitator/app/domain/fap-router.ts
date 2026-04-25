// FAP Router — M-L4a catalog-only implementation.
//
// Pure domain factory: loads the canonical rails catalog from
// `products/02-facilitator/app/data/rails-catalog.json` at module load
// time, validates every entry against `ZodRailInfo`, freezes the result,
// and exposes it through `getRails()`.
//
// No I/O happens inside the factory or the `getRails()` call — the JSON
// is embedded at bundle time via the `with { type: 'json' }` import
// (ES2023). This keeps `app/domain/` pure (engineering-principles §6)
// while still honouring the data-externalization rule (no hardcoded
// rails list in TypeScript).
//
// M-L4b will extend this port with `route(intent)`, `getStats()`, etc.
// Until then the router only publishes the catalog so the landing
// FAPDiagram can render 4 rails honestly (share_pct = 0 for all).

import type { FapRouter, FapError } from '@paxio/interfaces';
import type { Result, RailInfo } from '@paxio/types';
import { ZodRailInfo, ok } from '@paxio/types';

import railsRaw from '../data/rails-catalog.json' with { type: 'json' };

/**
 * Dependencies for the FAP router factory.
 *
 * Intentionally empty for M-L4a — the catalog is a static asset and
 * needs no injection. Keeping the shape as a real object (not `void`)
 * leaves room for M-L4b to add `clock`, `database`, `guard` etc.
 * without a breaking signature change.
 */
export type FapRouterDeps = Record<string, never>;

// Validate-once at module load. A malformed rails-catalog.json is a
// build-time bug (backend-dev authored it, architect's schema pins it),
// so we fail fast rather than returning an Err per call.
//
// Order of the JSON file is preserved; callers (landing FAPDiagram) rely
// on a deterministic order.
const RAILS_CATALOG: readonly RailInfo[] = Object.freeze(
  (railsRaw as readonly unknown[]).map((raw, index): RailInfo => {
    const parsed = ZodRailInfo.safeParse(raw);
    if (!parsed.success) {
      // Build-time invariant violation — throw AppError at load.
      // This happens only if the JSON is out of sync with the Zod schema.
      throw new Error(
        `rails-catalog.json: entry #${index} failed ZodRailInfo — ${parsed.error.message}`,
      );
    }
    return Object.freeze(parsed.data);
  }),
);

/**
 * Factory: creates a frozen `FapRouter` port implementation.
 *
 * Pure, deterministic. Two factories built with the same (trivial) deps
 * return structurally identical services that read the same catalog.
 */
export const createFapRouter = (_deps: FapRouterDeps = {} as FapRouterDeps): FapRouter => {
  const getRails = async (): Promise<Result<readonly RailInfo[], FapError>> => {
    return ok(RAILS_CATALOG);
  };

  return Object.freeze({ getRails });
};
