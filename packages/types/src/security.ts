// Security Sidecar contracts (FA-04).
// Mirrors Candid interface of products/04-security/canister — Intent Verifier only
// (Secrets Scanner is TS-side in M24 per FA-04 §9).

import { z } from 'zod';
import { ZodDid } from './did';
import { ZodTransactionIntent } from './wallet';

// --- Decision ---

export const DECISIONS = ['APPROVE', 'HOLD', 'BLOCK'] as const;
export const ZodDecision = z.enum(DECISIONS);
export type Decision = z.infer<typeof ZodDecision>;

// --- Verification reasons — populated for HOLD / BLOCK ---

export const BLOCK_REASONS = [
  'budget_exceeded',
  'recipient_not_whitelisted',
  'per_tx_limit_exceeded',
  'outside_allowed_hours',
  'sanctions_list_match',
] as const;

export const HOLD_REASONS = [
  'behavioral_anomaly',
  'guard_injection_suspected',
  'manual_review_required',
] as const;

export const ZodReason = z.enum([...BLOCK_REASONS, ...HOLD_REASONS]);
export type Reason = z.infer<typeof ZodReason>;

// --- Budget / whitelist config ---

export const ZodAgentPolicy = z.object({
  did: ZodDid,
  dailyBudget: z.bigint().nonnegative(),   // per-day cap, same unit as asset
  perTxLimit: z.bigint().nonnegative(),    // single-transaction cap
  whitelist: z.array(z.string()),          // explicitly allowed recipients (BTC/EVM addresses)
  allowedHours: z.tuple([                  // [startHourUTC, endHourUTC] — 24h wraps handled server-side
    z.number().int().min(0).max(23),
    z.number().int().min(0).max(23),
  ]),
});
export type AgentPolicy = z.infer<typeof ZodAgentPolicy>;

// --- Verify request/response ---

export const ZodVerifyRequest = z.object({
  intent: ZodTransactionIntent,
  guardConfidence: z.number().min(0).max(1).optional(), // Guard ML signal, Optional: injected by caller.
});
export type VerifyRequest = z.infer<typeof ZodVerifyRequest>;

export const ZodVerifyResponse = z.object({
  decision: ZodDecision,
  reason: ZodReason.optional(),            // Only present for HOLD/BLOCK.
  verifiedAt: z.string().datetime(),
});
export type VerifyResponse = z.infer<typeof ZodVerifyResponse>;
