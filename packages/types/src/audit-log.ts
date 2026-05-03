// Audit Log canister contracts (FA-06).
// Append-only log with cryptographic chain. Each entry carries hash(prev || payload).

import { z } from 'zod';
import { ZodDid } from './did';
import { ZodAsset } from './wallet';

// --- Action types logged ---

export const AUDIT_ACTIONS = [
  'SIGN',       // Wallet canister signed a transaction
  'VERIFY',     // Security Sidecar verified an intent
  'APPROVE',    // Security Sidecar returned APPROVE
  'HOLD',       // Security Sidecar returned HOLD
  'BLOCK',      // Security Sidecar returned BLOCK
  'REGISTER',   // Registry registered an agent
  'CLAIM',      // Registry completed a claim-flow
] as const;

export const ZodAuditAction = z.enum(AUDIT_ACTIONS);
export type AuditAction = z.infer<typeof ZodAuditAction>;

// --- Log entry (both request shape and stored shape) ---

export const ZodLogEntryInput = z.object({
  txId: z.string().min(1),          // Idempotency key — repeat log_entry with same txId = no-op.
  agentDid: ZodDid,
  action: ZodAuditAction,
  amount: z.bigint().nonnegative().optional(),
  asset: ZodAsset.optional(),
  metadata: z.record(z.string(), z.string()).default({}),
});
export type LogEntryInput = z.infer<typeof ZodLogEntryInput>;

export const ZodLogEntry = z.object({
  index: z.number().int().nonnegative(),  // monotonic — 0,1,2,…
  txId: z.string(),
  agentDid: ZodDid,
  action: ZodAuditAction,
  amount: z.bigint().nonnegative().optional(),
  asset: ZodAsset.optional(),
  metadata: z.record(z.string(), z.string()),
  timestamp: z.bigint().nonnegative(),    // ic_cdk::api::time() — nanoseconds since Unix epoch
  prevHash: z.string().length(64),         // SHA-256 hex of prev entry (or zeros for genesis)
  entryHash: z.string().length(64),        // SHA-256 hex of (prevHash || serialized entry)
});
export type LogEntry = z.infer<typeof ZodLogEntry>;

// --- Query ---

export const ZodLogQuery = z.object({
  agentDid: ZodDid.optional(),
  action: ZodAuditAction.optional(),
  startTime: z.bigint().nonnegative().optional(),
  endTime: z.bigint().nonnegative().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
});
export type LogQuery = z.infer<typeof ZodLogQuery>;

export const ZodLogQueryResponse = z.object({
  entries: z.array(ZodLogEntry),
  total: z.number().int().nonnegative(),
});
export type LogQueryResponse = z.infer<typeof ZodLogQueryResponse>;

// --- Forensics trail ---

export const ZodForensicsTrail = z.object({
  agentDid: ZodDid,
  entries: z.array(ZodLogEntry),
  chainValid: z.boolean(),                 // All prevHash/entryHash linkages verified.
  rootHash: z.string().length(64),         // entryHash of the last entry — anchored proof.
});
export type ForensicsTrail = z.infer<typeof ZodForensicsTrail>;
