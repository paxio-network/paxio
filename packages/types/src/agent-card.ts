import { z } from 'zod';
import { ZodDid } from './did.js';
import { ZodCapability } from './capability.js';
import { ZodCrawlerSource } from './crawler-source.js';

// Agent Card — canonical schema used everywhere in the Paxio platform.
//
// Originally shipped in M00 as a minimal MVP (did/name/description/capability/
// endpoint/version/createdAt). In M-L1-contracts we extend with crawler
// provenance fields — ALL optional so existing `native` registrations stay
// valid (source defaults to 'native').
//
// Full schema (payment, SLA, security_badge, reputation, compliance) lives
// in FA-01 section 4 and will be added when downstream features ship.

export const ZodAgentCard = z.object({
  // --- Identity (unchanged since M00) ---
  did: ZodDid,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  capability: ZodCapability,
  endpoint: z.string().url().optional(),
  version: z.string().default('0.0.1'),
  createdAt: z.string().datetime(),

  // --- Provenance (added in M-L1-contracts for crawler support) ---
  //
  // `source` identifies which ecosystem this card was ingested from. Defaults
  // to 'native' so direct POST /registry/register calls keep working without
  // the client having to supply the field.
  source: ZodCrawlerSource.default('native'),

  // `externalId` is the agent's identifier in its source system — e.g. the
  // on-chain contract address for ERC-8004, the Fetch.ai agent address, the
  // MCP server slug on Smithery. Combined with `source` it uniquely keys
  // an external record; the storage layer enforces a unique index on
  // (source, external_id) so re-crawls upsert instead of duplicating.
  externalId: z.string().min(1).max(500).optional(),

  // `sourceUrl` is where the card was fetched from (crawl URL). Useful for
  // audit and for users who want to click through to the original listing.
  sourceUrl: z.string().url().optional(),

  // `crawledAt` = ISO 8601 timestamp the crawler observed the source. Kept
  // distinct from `createdAt` (which is when Paxio created the canonical
  // record) — crawledAt can be earlier or later than createdAt, and will
  // be updated on every re-crawl upsert.
  crawledAt: z.string().datetime().optional(),
});

export type AgentCard = z.infer<typeof ZodAgentCard>;
