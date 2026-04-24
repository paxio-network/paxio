import type { Result, RailInfo } from '@paxio/types';

// FapRouter — port for the Meta-Facilitator's rails layer (FA-02).
//
// M-L4a shape: catalog only. `getRails()` returns a static list of rails
// loaded from a JSON file (products/02-facilitator/app/data/rails-catalog.json)
// — share_pct is 0 for all rails because no traffic flows yet. This unblocks
// the landing FAPDiagram visualization.
//
// M-L4b will add `route(intent)`, `getStats()` etc. — the full facilitator.
// This port intentionally stays minimal until then; we don't pre-design what
// we don't yet need.

export type FapError =
  | { readonly code: 'catalog_unavailable'; readonly message: string }
  | { readonly code: 'config_error'; readonly message: string };

export interface FapRouter {
  /**
   * Return the full rails catalog. Idempotent, deterministic — same call
   * yields the same value within one process lifetime (catalog is loaded
   * once at startup from JSON).
   *
   * Order is significant: callers (landing FAPDiagram) render in the
   * returned order. Implementation MUST sort deterministically.
   */
  getRails(): Promise<Result<readonly RailInfo[], FapError>>;
}
