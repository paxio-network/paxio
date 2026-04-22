// Marketing / landing contracts — data surfaced on paxio.network landing page.
//
// All fields mirror the live-ticker design in the landing HTML
// (tmp/Paxio-Financial OS for the agentic economy.html). The backend exposes
// these through /api/marketing/* endpoints in products/07-intelligence/app/api/.
//
// Fields are populated from real stores (Registry counts, Intelligence indices,
// FAP throughput, Security threat log). Early in product life many values will
// legitimately be 0 or small — this is NOT mock data, it is the real current
// state. See docs/sprints/M01c-landing-implementation.md.

import { z } from 'zod';

// --- Hero state strip (14 live fields + indices) --------------------------------

export const ZodHeroState = z.object({
  // Total agents indexed across all sources (Registry count)
  agents: z.number().int().nonnegative(),

  // Live 24h transactions (Audit Log aggregate)
  txns: z.number().int().nonnegative(),

  // % of agents with a Paxio wallet + delta (percentage points, 7-day)
  wallet_adoption: z.number().min(0).max(100),
  wallet_adoption_d: z.number(),

  // % of FAP payment volume via x402 + delta (pp, 7d) — concentration metric
  x402_share: z.number().min(0).max(100),
  x402_share_d: z.number(),

  // % of agents configured for BTC L1 native + delta
  btc_share: z.number().min(0).max(100),
  btc_share_d: z.number(),

  // Herfindahl-Hirschman Index of rail concentration (higher = more concentrated)
  hhi: z.number().int().nonnegative(),

  // Agents with reputation/behavior drift in last 7 days (Registry + Anomaly)
  drift7: z.number().int().nonnegative(),

  // Prompt-injection / exfil / jailbreak attacks blocked in last 24h (Guard)
  attacks24: z.number().int().nonnegative(),

  // SLA metrics across all agents
  sla_p50: z.number().nonnegative(),     // median response latency (ms)
  uptime_avg: z.number().min(0).max(100), // %

  // FAP throughput daily (USD, rounded)
  fap_throughput: z.number().nonnegative(),

  // Paxio AI Economy Index (composite: adoption + volume + reputation + uptime)
  paei: z.number().nonnegative(),
  paei_d: z.number(),

  // Per-category sub-indices + deltas (6 categories)
  btc: z.number().nonnegative(),         // PAEI·BTC — Bitcoin-native sub-index
  btc_d: z.number(),
  legal: z.number().nonnegative(),
  legal_d: z.number(),
  finance: z.number().nonnegative(),
  finance_d: z.number(),
  research: z.number().nonnegative(),
  research_d: z.number(),
  cx: z.number().nonnegative(),
  cx_d: z.number(),
});
export type HeroState = z.infer<typeof ZodHeroState>;

// --- Ticker cells (generic shape used in 3-lane scrolling ticker) ----------------

export const ZodTickerCell = z.object({
  label: z.string().min(1).max(40),
  value: z.union([z.number(), z.string()]),
  delta_pct: z.number().nullable(),        // % change (null = no delta shown)
  unit: z.string().max(8).optional(),       // "%", "bps", etc.
  gold: z.boolean().optional(),             // Bitcoin-related highlight
  warn: z.boolean().optional(),             // concentration / drift warning
});
export type TickerCell = z.infer<typeof ZodTickerCell>;

export const TICKER_LANES = ['INDICES', 'RAILS', 'ADOPTION'] as const;
export const ZodTickerLane = z.object({
  lane: z.enum(TICKER_LANES),
  items: z.array(ZodTickerCell).min(1),
});
export type TickerLane = z.infer<typeof ZodTickerLane>;

// --- Agent rows (preview for landing table — NOT the full Agent Card) ------------

export const AGENT_SOURCES = [
  'paxio-native',
  'ERC-8004',
  'MCP',
  'Fetch.ai',
  'Virtuals',
  'ElizaOS',
  'A2A',
] as const;
export const ZodAgentSource = z.enum(AGENT_SOURCES);
export type AgentSource = z.infer<typeof ZodAgentSource>;

export const VERIFICATION_LEVELS = ['gold', 'silver', 'basic', 'none'] as const;
export const ZodVerificationLevel = z.enum(VERIFICATION_LEVELS);

export const ZodAgentWalletPreview = z.object({
  status: z.enum(['paxio-native', 'external', 'none']),
  type: z.enum(['btc+usdc', 'multi', 'evm', 'fetch', 'usdc']).nullable(),
});

// Single row in the landing agent table (subset of full AgentCard from agent-card.ts).
export const ZodAgentPreview = z.object({
  name: z.string().min(1).max(80),
  did: z.string().min(1),                               // shortened form "did:paxio:0x91…71e2"
  source: ZodAgentSource,
  category: z.string().min(1).max(64),                  // e.g. "Bitcoin · Escrow"
  wallet: ZodAgentWalletPreview,
  rails: z.array(z.string().min(1)).min(0),             // ["BTC L1", "USDC", "x402"]
  facilitator: z.string().min(1).max(40),               // "Paxio FAP", "Coinbase x402", etc.
  reputation: z.number().int().min(0).max(1000),
  reputation_delta: z.number().int(),
  vol_24h_usd: z.number().nonnegative(),
  success_pct: z.number().min(0).max(100),
  uptime_pct: z.number().min(0).max(100),
  latency_p50_ms: z.number().nonnegative(),
  guard_attacks_24h: z.number().int().nonnegative(),
  drift_hours: z.number().nonnegative().nullable(),      // null = no drift
  sparkline_seed: z.number().int().nonnegative(),       // deterministic PRNG seed for 24-point chart
  verification: ZodVerificationLevel,
});
export type AgentPreview = z.infer<typeof ZodAgentPreview>;

// --- Payment rails (FAP diagram + state row) ------------------------------------

export const ZodRailInfo = z.object({
  name: z.string().min(1).max(40),               // "Coinbase x402", "Paxio FAP", "Skyfire", "Stripe MPP", "BTC L1", "USDC-Solana"
  share_pct: z.number().min(0).max(100),         // % of total FAP throughput
  latency_ms: z.number().nonnegative(),
  fee_description: z.string().min(1).max(40),    // "0.18%", "0.10%", "2.9%+$0.30", "flat sat fee"
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  concentration_risk: z.boolean(),               // true for rails > 50% share
  growing: z.boolean().optional(),
});
export type RailInfo = z.infer<typeof ZodRailInfo>;

// --- Network snapshot (50-agent graph) ------------------------------------------

export const ZodNetworkNode = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  x_pct: z.number().min(0).max(100),             // canvas coord 0..100
  y_pct: z.number().min(0).max(100),
  volume_usd_5m: z.number().nonnegative(),       // used for node radius scaling
  bitcoin_native: z.boolean(),
});
export type NetworkNode = z.infer<typeof ZodNetworkNode>;

export const NETWORK_RAILS = ['BTC L1', 'x402', 'USDC', 'MPP', 'Skyfire'] as const;
export const ZodNetworkRail = z.enum(NETWORK_RAILS);

export const ZodNetworkPair = z.object({
  from_id: z.string().min(1),
  to_id: z.string().min(1),
  txn_count: z.number().int().nonnegative(),
  vol_usd_5m: z.number().nonnegative(),
  rail: ZodNetworkRail,
  last_timestamp: z.number().int().nonnegative(),  // ms since epoch
});
export type NetworkPair = z.infer<typeof ZodNetworkPair>;

export const ZodNetworkSnapshot = z.object({
  nodes: z.array(ZodNetworkNode).min(0),
  pairs: z.array(ZodNetworkPair).min(0),
  generated_at: z.string().datetime(),           // ISO server timestamp
});
export type NetworkSnapshot = z.infer<typeof ZodNetworkSnapshot>;

// --- Threat heatmap (Radar section 6×6 grid) ------------------------------------

export const HEAT_ROWS = [
  'Legal·translate',
  'DeFi·routing',
  'CX·tier-1',
  'Finance·invoice',
  'Research·synth',
  'Security·guard',
] as const;
export const HEAT_COLS = [
  'Prompt-inj',
  'Doc-inj',
  'Price-manip',
  'Jailbreak',
  'Exfil',
  'DDoS',
] as const;

// Each cell = count of attacks of that pattern against agents of that category in last 24h.
// Guard API is the source. Empty grid (all zeros) is a real, valid state.
export const ZodHeatGrid = z.object({
  rows: z.tuple([
    z.literal('Legal·translate'),
    z.literal('DeFi·routing'),
    z.literal('CX·tier-1'),
    z.literal('Finance·invoice'),
    z.literal('Research·synth'),
    z.literal('Security·guard'),
  ]),
  cols: z.tuple([
    z.literal('Prompt-inj'),
    z.literal('Doc-inj'),
    z.literal('Price-manip'),
    z.literal('Jailbreak'),
    z.literal('Exfil'),
    z.literal('DDoS'),
  ]),
  cells: z.array(z.array(z.number().int().nonnegative()).length(6)).length(6),
  window_hours: z.literal(24),
});
export type HeatGrid = z.infer<typeof ZodHeatGrid>;

// --- Compound response — /api/marketing/landing (one-shot for initial SSR) -----

export const ZodMarketingLanding = z.object({
  hero: ZodHeroState,
  ticker_lanes: z.array(ZodTickerLane).length(3),
  agents: z.array(ZodAgentPreview).max(20),
  rails: z.array(ZodRailInfo).min(1).max(10),
  network: ZodNetworkSnapshot,
  heatmap: ZodHeatGrid,
  generated_at: z.string().datetime(),
});
export type MarketingLanding = z.infer<typeof ZodMarketingLanding>;

// --- Incremental polling responses ---------------------------------------------

// GET /api/marketing/hero              → ZodHeroState                (1100ms poll)
// GET /api/marketing/ticker            → ZodTickerLane[]             (1100ms poll)
// GET /api/marketing/network/snapshot  → ZodNetworkSnapshot          (3000ms poll)
// GET /api/marketing/heatmap           → ZodHeatGrid                 (60000ms poll)
// GET /api/marketing/agents/top        → ZodAgentPreview[]           (on-load, paginated)
// GET /api/marketing/landing           → ZodMarketingLanding         (SSR one-shot)
