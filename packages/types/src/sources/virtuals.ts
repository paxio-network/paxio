import { z } from 'zod';

// Virtuals Protocol — https://virtuals.io
// Agent Commerce Protocol (ACP) + on-chain agent marketplace on Base.
// Each agent is tokenised (ERC-20) and listed with name, ticker, mcap, etc.
//
// Crawl source: Virtuals public GraphQL endpoint (as of 2026-04-23):
//   POST https://api.virtuals.io/graphql
// Response shape is normalised into this schema — adapter's job is to
// handle GraphQL pagination + request shaping; validation happens here.
//
// Fields we need for routing + landing display:
// - `id` — Virtuals internal UUID; becomes `externalId`
// - `tokenContract` — ERC-20 address on Base; used for on-chain correlation
// - `mcap` — market cap in USD (used by Paxio Intelligence for top-agents)
// - `category` — the agent's vertical ("gaming", "defi", "productivity", ...)

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export const ZodVirtualsSocial = z.object({
  platform: z.enum(['twitter', 'telegram', 'discord', 'website', 'github']),
  url: z.string().url(),
});

export const ZodVirtualsAgent = z.object({
  // Virtuals' internal UUID (v4). Used as externalId.
  id: z.string().uuid(),

  // Display name of the agent.
  name: z.string().min(1).max(200),

  // Token ticker (e.g. "LUNA", "AIXBT").
  ticker: z.string().min(1).max(20),

  // ERC-20 token contract on Base.
  tokenContract: z.string().regex(HEX_ADDRESS, 'invalid EVM address'),

  // Deployer / creator wallet.
  creatorAddress: z.string().regex(HEX_ADDRESS, 'invalid EVM address'),

  // Free-form long description / bio.
  description: z.string().max(5000).optional(),

  // Category / vertical (free-form on Virtuals).
  category: z.string().max(100).optional(),

  // Public image / avatar URL.
  imageUrl: z.string().url().optional(),

  // Market cap in USD. Null for newly-launched agents.
  mcapUsd: z.number().nonnegative().nullable().default(null),

  // 24-hour trading volume in USD.
  volume24hUsd: z.number().nonnegative().nullable().default(null),

  // Associated social links.
  socials: z.array(ZodVirtualsSocial).max(20).default([]),

  // Virtuals page URL for click-through.
  profileUrl: z.string().url(),

  // Launch time on Virtuals (Unix epoch ms).
  launchedAt: z.number().int().nonnegative(),
});

export type VirtualsSocial = z.infer<typeof ZodVirtualsSocial>;
export type VirtualsAgent = z.infer<typeof ZodVirtualsAgent>;
