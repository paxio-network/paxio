import { z } from 'zod';
import { ZodCapability } from '../capability';

// `paxio-curated` source — manually maintained seed list of verified agents.
//
// Unlike external-ecosystem sources (ERC-8004, A2A, MCP, Fetch.ai), this
// source is NOT discovered via HTTP/blockchain crawl. Agents are
// hand-curated by the Paxio team and stored in
// `products/01-registry/app/data/curated-agents.json`.
//
// Use cases:
//   1. Seed data on first deploy (no live crawl needed для marketing).
//   2. Quality-tier fallback: curated agents are verified.
//   3. Foundation models + premier SaaS agents (Claude Code / Codex /
//      Gemini / Hermes / Pi / Devin / Cursor / Lindy etc.) which have no
//      public registry.
//
// DID is pre-committed in the JSON (team-assigned, not crawler-derived).
// `source: 'paxio-curated'` is the canonical AgentSource value (see
// `agent-source.ts` 13-canonical enum).
//
// Adapter в `products/01-registry/app/domain/sources/paxio-curated.ts`
// imports this schema, validates each entry, projects onto AgentCard
// (toCanonical pure projection).

export const ZodPaxioCuratedAgent = z.object({
  // Full DID URL — assigned by Paxio team manually
  did: z.string().min(1),

  // Human-readable display name
  name: z.string().min(1).max(200),

  // Optional one-line description
  description: z.string().max(1000).optional(),

  // Agent's primary capability (legacy paxio-layer enum — overlaps с
  // M-L1-taxonomy `category`. Curated entries supply both for back-compat
  // until M-L1-taxonomy fully migrates downstream consumers.)
  capability: ZodCapability,

  // Optional HTTPS endpoint (some curated entries are conceptual — e.g.
  // a foundation model API — others are real callable endpoints)
  endpoint: z.string().url().optional(),

  // Semantic version (default '0.0.1' if absent on toCanonical)
  version: z.string().min(1).optional(),

  // Attribution URL (GitHub repo / docs page / vendor site)
  sourceUrl: z.string().url().optional(),

  // ISO-8601 creation timestamp (when the agent was added to curated list)
  createdAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'invalid ISO-8601')
    .optional(),
});

export type PaxioCuratedAgent = z.infer<typeof ZodPaxioCuratedAgent>;

/**
 * Top-level shape of `curated-agents.json`. Adapter loads + validates entire
 * file once at startup; downstream `fetchAgents()` yields from in-memory
 * array.
 */
export const ZodPaxioCuratedFile = z.object({
  version: z.literal(1),
  agents: z.array(ZodPaxioCuratedAgent).min(0).max(10_000),
});

export type PaxioCuratedFile = z.infer<typeof ZodPaxioCuratedFile>;
