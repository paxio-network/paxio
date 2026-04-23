// Audit Log port (FA-06).
// Append-only log with SHA-256 chain. Concrete implementation is a Rust canister
// at products/06-compliance/canisters/audit-log/.

import type {
  Result,
  Did,
  LogEntry,
  LogEntryInput,
  LogQuery,
  LogQueryResponse,
  ForensicsTrail,
} from '@paxio/types';

export interface AuditLogError {
  readonly code:
    | 'validation_error'
    | 'not_found'
    | 'chain_corrupted'
    | 'canister_error';
  readonly message: string;
}

export interface AuditLog {
  /** Append a new entry. Idempotent: repeat call with same txId returns the existing entry. */
  logEntry(input: LogEntryInput): Promise<Result<LogEntry, AuditLogError>>;

  /** Query entries by filters. */
  getEntries(
    query: LogQuery,
  ): Promise<Result<LogQueryResponse, AuditLogError>>;

  /** Assemble a forensics trail for a single agent. */
  getForensicsTrail(
    did: Did,
  ): Promise<Result<ForensicsTrail, AuditLogError>>;

  /** Verify chain integrity: recompute hashes, return false if any linkage is broken. */
  verifyChain(): Promise<Result<boolean, AuditLogError>>;
}
