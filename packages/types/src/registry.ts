// Registry API contracts (FA-01).
// Request/response Zod schemas for POST /register, GET /find, GET /:did, POST /claim/:id.
// See docs/feature-areas/FA-01-registry-architecture.md §4.

import { z } from 'zod';
import { ZodDid } from './did';
import { ZodAgentCard } from './agent-card';

// --- POST /registry/register ---

// Request: raw Agent Card (DID may be omitted — server generates it from endpoint+developer).
// For MVP (M01) the client supplies a complete Agent Card. Full claim-flow DID generation
// from endpoint hash is added in M17 (PostgreSQL persistence milestone).
export const ZodRegisterRequest = ZodAgentCard;
export type RegisterRequest = z.infer<typeof ZodRegisterRequest>;

export const ZodRegisterResponse = z.object({
  did: ZodDid,
  registered: z.literal(true),
});
export type RegisterResponse = z.infer<typeof ZodRegisterResponse>;

// --- GET /registry/find?intent=... ---

export const ZodFindQuery = z.object({
  intent: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type FindQuery = z.infer<typeof ZodFindQuery>;

export const ZodFindResult = z.object({
  card: ZodAgentCard,
  score: z.number().min(0).max(1),
});
export type FindResult = z.infer<typeof ZodFindResult>;

export const ZodFindResponse = z.object({
  results: z.array(ZodFindResult),
  total: z.number().int().nonnegative(),
});
export type FindResponse = z.infer<typeof ZodFindResponse>;

// --- GET /registry/:did ---

export const ZodResolveResponse = z.object({
  card: ZodAgentCard,
});
export type ResolveResponse = z.infer<typeof ZodResolveResponse>;

// --- POST /registry/claim/:did ---
// Challenge-response: server returns a nonce; client signs; server verifies.

export const ZodClaimChallenge = z.object({
  did: ZodDid,
  nonce: z.string().min(16),
  expiresAt: z.string().datetime(),
});
export type ClaimChallenge = z.infer<typeof ZodClaimChallenge>;

export const ZodClaimProof = z.object({
  did: ZodDid,
  nonce: z.string(),
  signature: z.string().min(1),
  publicKey: z.string().min(1),
});
export type ClaimProof = z.infer<typeof ZodClaimProof>;

export const ZodClaimResponse = z.object({
  did: ZodDid,
  claimed: z.literal(true),
  claimedAt: z.string().datetime(),
});
export type ClaimResponse = z.infer<typeof ZodClaimResponse>;

// --- GET /registry/count ---

export const ZodCountResponse = z.object({
  count: z.number().int().nonnegative(),
});
export type CountResponse = z.infer<typeof ZodCountResponse>;
