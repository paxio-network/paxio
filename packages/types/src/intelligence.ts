// Intelligence types — for M-L11 real-data pipeline endpoints.
//
// These three shapes replace the simulated `preview.ts` exports in the
// landing app (M-L10 frontend) once backend lands:
//
//   PaeiSnapshot         ←  app/data/preview.ts::PREVIEW_TICKER_INITIAL
//   AgentListPage        ←  app/data/preview.ts::PREVIEW_AGENTS
//   MarketMoversWindow   ←  app/data/preview.ts::PREVIEW_MOVERS
//
// Endpoints:
//   GET /api/intelligence/paei/snapshot        → PaeiSnapshot
//   GET /api/registry/list?source=...&sort=...  → AgentListPage
//   GET /api/intelligence/movers?window=24h    → MarketMoversWindow

import { z } from 'zod';
import { ZodCrawlerSource } from './crawler-source.js';

// ---------------------------------------------------------------------------
// PaeiSnapshot — composite + 5 subindices + adoption + market structure
// ---------------------------------------------------------------------------
//
// Mirrors the `useTicker` initial state in v_hero_b5.jsx. Each numeric value
// is a point-in-time snapshot (not delta). `_d` suffixed fields = % change vs
// previous interval (24h window default).

export const ZodPaeiSnapshot = z.object({
  // Composite index — top-100 agents by volume × reputation
  paei: z.number(),
  paeiD: z.number(), // % change vs 24h ago

  // Subindices per category — top-20 in each
  btc: z.number(),
  btcD: z.number(),
  legal: z.number(),
  legalD: z.number(),
  finance: z.number(),
  financeD: z.number(),
  research: z.number(),
  researchD: z.number(),
  cx: z.number(),
  cxD: z.number(),

  // Adoption metrics
  walletAdoption: z.number().min(0).max(100), // %
  walletAdoptionD: z.number(),
  x402Share: z.number().min(0).max(100), // % of payment volume on x402 rail
  x402ShareD: z.number(),
  btcShare: z.number().min(0).max(100), // % BTC L1
  btcShareD: z.number(),

  // Market structure
  hhi: z.number().int().nonnegative(), // Herfindahl-Hirschman Index (concentration)
  drift7: z.number().int().nonnegative(), // # agents with rep drift > 5% in 7d
  attacks24: z.number().int().nonnegative(), // # Guard attacks blocked in 24h

  // Operational
  slaP50: z.number().min(0).max(100), // % requests under p50 latency target
  fapThroughput: z.number().int().nonnegative(), // total FAP volume usd, 24h
  uptimeAvg: z.number().min(0).max(100), // % avg agent uptime

  // Counters
  agents: z.number().int().nonnegative(),
  txns: z.number().int().nonnegative(),

  // Timestamp of snapshot generation (server time)
  generatedAt: z.string().datetime(),
});
export type PaeiSnapshot = z.infer<typeof ZodPaeiSnapshot>;

// ---------------------------------------------------------------------------
// AgentListPage — paginated agents table for B5 hero
// ---------------------------------------------------------------------------
//
// Each item augments AgentCard with operational + economic fields used by
// the B5 directory hero. These come from joining agent_cards с future
// `agent_metrics` table (M-L11 backend persists wallet/vol/success/uptime).

export const ZodAgentSparkPoint = z.object({
  t: z.number().int().nonnegative(), // unix epoch seconds
  v: z.number(), // metric value at that time
});
export type AgentSparkPoint = z.infer<typeof ZodAgentSparkPoint>;

export const ZodAgentVerificationTier = z.enum(['gold', 'silver', 'basic']);
export type AgentVerificationTier = z.infer<typeof ZodAgentVerificationTier>;

export const ZodAgentWalletStatus = z.enum([
  'paxio-native',
  'external',
  'none',
]);
export type AgentWalletStatus = z.infer<typeof ZodAgentWalletStatus>;

export const ZodAgentListItem = z.object({
  // Identity (from AgentCard)
  did: z.string(),
  name: z.string(),
  source: ZodCrawlerSource,

  // Display (from AgentCard)
  category: z.string(),

  // Wallet — joined from wallet attachment table (FA-03)
  wallet: z.object({
    status: ZodAgentWalletStatus,
    type: z.string().nullable(), // 'btc+usdc' | 'multi' | 'evm' | 'fetch' | null
  }),

  // Rails — list of payment protocols supported
  rails: z.array(z.string()).readonly(),

  // Facilitator — which FAP routes the agent
  facilitator: z.string(),

  // Reputation (from FA-09 reputation canister + cache)
  rep: z.number().int(), // current reputation score
  repD: z.number().int(), // 24h delta in points

  // Economic (from agent_metrics aggregate)
  vol24: z.number().int().nonnegative(), // USD volume 24h
  success: z.number().min(0).max(100), // % successful txns
  uptime: z.number().min(0).max(100), // % uptime
  p50: z.number().int().nonnegative(), // p50 latency ms

  // Security signals
  guard24: z.number().int().nonnegative(), // # Guard hits in 24h
  driftHoursAgo: z.number().int().nonnegative().nullable(), // last drift event

  // Verification tier
  verif: ZodAgentVerificationTier,

  // Trend sparkline (24 points = 1h granularity for 24h)
  trend24h: z.array(ZodAgentSparkPoint).readonly(),
});
export type AgentListItem = z.infer<typeof ZodAgentListItem>;

export const ZodAgentListSort = z.enum([
  'vol24',
  'rep',
  'repD',
  'name',
  'success',
  'uptime',
]);
export type AgentListSort = z.infer<typeof ZodAgentListSort>;

export const ZodAgentListQuery = z.object({
  source: ZodCrawlerSource.optional(),
  category: z.string().optional(),
  walletAttached: z.boolean().optional(),
  verifMin: ZodAgentVerificationTier.optional(),
  sort: ZodAgentListSort.default('vol24'),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.string().optional(), // for pagination
});
export type AgentListQuery = z.infer<typeof ZodAgentListQuery>;

export const ZodAgentListPage = z.object({
  items: z.array(ZodAgentListItem).readonly(),
  total: z.number().int().nonnegative(), // total matching across all pages
  cursor: z.string().nullable(), // next cursor or null if no more
  generatedAt: z.string().datetime(),
});
export type AgentListPage = z.infer<typeof ZodAgentListPage>;

// ---------------------------------------------------------------------------
// MarketMoversWindow — top gainers/losers by reputation delta
// ---------------------------------------------------------------------------

export const ZodMoverWindow = z.enum(['1h', '24h', '7d', '30d']);
export type MoverWindow = z.infer<typeof ZodMoverWindow>;

export const ZodMoverEntry = z.object({
  did: z.string(),
  name: z.string(),
  category: z.string(),
  rep: z.number().int(),
  repD: z.number().int(), // delta in points over the window
  vol24: z.number().int().nonnegative(),
});
export type MoverEntry = z.infer<typeof ZodMoverEntry>;

export const ZodMarketMoversWindow = z.object({
  window: ZodMoverWindow,
  topGainers: z.array(ZodMoverEntry).readonly(), // sorted desc by repD, top 5
  topLosers: z.array(ZodMoverEntry).readonly(), // sorted asc by repD, top 5
  paeiHistory: z.array(ZodAgentSparkPoint).readonly(), // 90-day chart for hero
  generatedAt: z.string().datetime(),
});
export type MarketMoversWindow = z.infer<typeof ZodMarketMoversWindow>;
