import { z } from 'zod';
import { ZodDid } from './did.js';
import { ZodCapability } from './capability.js';

// Agent Card — MVP schema for M00.
// Full schema (payment, SLA, security_badge, reputation, compliance)
// lives in FA-01 section 4 and will be added in M01 when Registry canister lands.

export const ZodAgentCard = z.object({
  did: ZodDid,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  capability: ZodCapability,
  endpoint: z.string().url().optional(),
  version: z.string().default('0.0.1'),
  createdAt: z.string().datetime(),
});

export type AgentCard = z.infer<typeof ZodAgentCard>;
