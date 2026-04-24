import { z } from 'zod';

// Fetch.ai Agentverse — https://agentverse.ai
// Public REST API returns agents as JSON; docs:
//   GET /v1/search/agents?query=...&offset=...&limit=...
// Full-text search + optional category filter. Largest crawl surface —
// per the Paxio Roadmap (Phase 0 week 1–4 target), Fetch.ai contributes
// ~2M agents of the 500K goal.
//
// Fetch.ai agents have a `bech32`-style address: `fetch1...`. Used as
// `externalId` in the canonical AgentCard.
//
// We only model the fields we need for ingestion; adapter preserves the
// raw payload alongside for audit.

const FETCH_AI_ADDRESS = /^fetch1[a-z0-9]{38,58}$/;

export const ZodFetchAiAgent = z.object({
  // Bech32 Fetch.ai address — e.g. "fetch1abcxxxxxxxxxx..."
  address: z.string().regex(FETCH_AI_ADDRESS, 'invalid fetch.ai address'),

  // Display name from Agentverse.
  name: z.string().min(1).max(200),

  // Agent description / about text.
  description: z.string().max(5000).optional(),

  // Primary category assigned by the publisher. Free-form string
  // ("finance", "assistant", "trading", ...).
  category: z.string().max(100).optional(),

  // Tags / labels attached to the agent. Capped at 100.
  tags: z.array(z.string().min(1).max(100)).max(100).default([]),

  // Public URL (endpoint) where the agent listens. Fetch.ai agents are
  // callable via JSON messages.
  endpoint: z.string().url().optional(),

  // Agentverse public profile page — useful for click-through.
  profileUrl: z.string().url(),

  // When the agent was first registered in Agentverse (Unix epoch ms).
  registeredAt: z.number().int().nonnegative(),

  // Fetch.ai reputation score (0..100 from Agentverse stats); used to
  // seed Paxio reputation. May be absent for new agents.
  reputationScore: z.number().min(0).max(100).nullable().default(null),

  // Whether the agent is currently marked "online" by Agentverse.
  isOnline: z.boolean().default(false),
});

export type FetchAiAgent = z.infer<typeof ZodFetchAiAgent>;
