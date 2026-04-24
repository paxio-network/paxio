import type {
  Result,
  AgentCard,
  CrawlerSource,
  Did,
  FindQuery,
  FindResult,
} from '@paxio/types';

// AgentStorage — persistence port for Registry (FA-01).
//
// MVP (M01): in-memory `Map<Did, AgentCard>` implementation in
// `products/01-registry/app/domain/registry.ts`.
//
// M-L1-impl (upcoming): PostgreSQL-backed implementation in
// `products/01-registry/app/infra/postgres-storage.ts` — 500K+ agents
// fit only in a DB, and crawler re-runs need upsert semantics.
//
// Contract programming:
//   - upsert: called with the SAME AgentCard twice MUST produce the same
//             end state and NOT return an error on the second call.
//             (Idempotent — required for crawler retry safety.)
//   - resolve: returns `not_found` if DID absent, never null.
//   - find: FindResult[] sorted by .score descending.
//   - count / countBySource: non-negative integers; countBySource returns
//             a complete map (zero entries allowed; no missing keys).

export type StorageError =
  | { readonly code: 'db_unavailable'; readonly message: string }
  | { readonly code: 'not_found'; readonly did: Did }
  | {
      readonly code: 'constraint_violation';
      readonly message: string;
      readonly field?: string;
    }
  | { readonly code: 'validation_error'; readonly message: string };

/**
 * Map `CrawlerSource` → count. All known sources appear as keys, zero values
 * allowed. Order is not significant. Frozen by implementations.
 */
export type AgentCountBySource = Readonly<Record<CrawlerSource, number>>;

export interface AgentStorage {
  /**
   * Insert-or-update an AgentCard. Idempotent.
   * Storage layer uses (did) as primary key, plus unique index on
   * (source, externalId) when both are present — same external record
   * re-crawled will UPDATE rather than duplicate.
   */
  upsert(card: AgentCard): Promise<Result<void, StorageError>>;

  /** Fetch one card by DID. Returns `not_found` if absent. */
  resolve(did: Did): Promise<Result<AgentCard, StorageError>>;

  /**
   * Full-text search. MVP implementation uses in-memory BM25; Postgres
   * impl uses `tsvector` + trigram. Returned list is sorted by score
   * descending, capped at `query.limit`.
   */
  find(query: FindQuery): Promise<Result<readonly FindResult[], StorageError>>;

  /** Total number of stored agents across all sources. */
  count(): Promise<Result<number, StorageError>>;

  /**
   * Map of CrawlerSource → count. Every CrawlerSource enum variant present
   * as a key, zero values allowed. Used by landing hero + admin dashboards
   * to show ecosystem breakdown.
   */
  countBySource(): Promise<Result<AgentCountBySource, StorageError>>;
}
