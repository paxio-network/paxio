import type { Result, AgentCard, CrawlerSource } from '@paxio/types';

// CrawlerSourceAdapter — crawler port for Universal Registry (FA-01, M-L1).
//
// Each external ecosystem (ERC-8004, A2A, MCP, Fetch.ai, Virtuals) gets a
// concrete adapter in `products/01-registry/app/domain/sources/<source>.ts`
// that implements this port.
//
// Responsibilities (enforced via RED tests in tests/registry-crawler-contract.test.ts):
//
//   1. `fetchAgents()` — stream raw records from the external source.
//      Returns AsyncIterable so memory stays bounded for multi-million-agent
//      sources (Fetch.ai ~2M). Adapter handles pagination + rate-limit +
//      retry internally.
//
//   2. `toCanonical(raw)` — pure function (no I/O) mapping a single raw
//      record to the canonical AgentCard. Rejects with SourceAdapterError
//      when validation fails. MUST NOT throw — always returns Result.
//
//   3. `sourceName` — immutable identifier matching one of CrawlerSource enum
//      values. The adapter's output AgentCard MUST have `card.source ===
//      adapter.sourceName` — this is checked at the storage boundary.
//
// Contract programming:
//   pre:  `raw` is of type TRaw (or unknown — Zod validates)
//   post: returns either { ok: true, value: AgentCard with .source ===
//         sourceName } or { ok: false, error: SourceAdapterError }
//   inv:  adapter has no hidden state that leaks across calls of toCanonical.
//         fetchAgents may hold pagination cursor, but each yielded record
//         is independently parseable.

export type SourceAdapterError =
  | { readonly code: 'source_unavailable'; readonly message: string }
  | {
      readonly code: 'parse_error';
      readonly message: string;
      readonly raw: unknown;
    }
  | {
      readonly code: 'rate_limit';
      readonly message: string;
      readonly retryAfterMs: number;
    }
  | { readonly code: 'auth_error'; readonly message: string };

export interface CrawlerSourceAdapter<TRaw> {
  /** Identifier pinning this adapter to one CrawlerSource enum variant. */
  readonly sourceName: CrawlerSource;

  /**
   * Stream raw records from the external source.
   *
   * - Lazy — each `for await` step triggers at most one HTTP/RPC call.
   * - Idempotent from consumer's perspective — calling twice yields the
   *   same (or a current) snapshot.
   * - Rate-limit aware — adapter sleeps or returns `rate_limit` error
   *   (consumer's choice how to propagate).
   * - May never yield if the source is empty — always terminates in
   *   finite time (crawler scheduler handles periodic re-invocation).
   */
  fetchAgents(): AsyncIterable<TRaw>;

  /**
   * Validate + project a single raw record to a canonical AgentCard.
   *
   * Pure function — no I/O, no side effects, no wall-clock reads (caller
   * injects `crawledAt` if needed via deps, not via `new Date()`).
   *
   * The returned AgentCard MUST satisfy `card.source === this.sourceName`.
   */
  toCanonical(raw: TRaw): Result<AgentCard, SourceAdapterError>;
}
