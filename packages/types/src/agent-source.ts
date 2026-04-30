import { z } from 'zod';

// AgentSource — где зарегистрирован/обнаружен агент (M-L1-taxonomy).
//
// Renamed + extended from CrawlerSource. Each value identifies the registry
// or origin ecosystem of record:
//
//   - paxio-native — direct POST /registry/register, DID issued by Paxio
//   - erc8004      — on-chain agent registry (Ethereum / Base / L2s)
//   - a2a          — Google Agent2Agent — agent.json at well-known URL
//   - mcp          — Model Context Protocol servers (Smithery, Anthropic
//                    catalog, glama.ai, awesome-mcp, npm-mcp). The actual
//                    origin within MCP universe is captured in
//                    `external_id` prefix and `source_url`.
//   - fetch        — Fetch.ai Agentverse (renamed from `fetch-ai` for
//                    consistency with `virtuals` / `eliza` single-token
//                    naming)
//   - virtuals     — Virtuals Protocol ACP registry (virtuals.io)
//   - eliza        — ElizaOS agents (a16z framework — virtual characters,
//                    NPCs, social media bots)
//
// Adding a new source = (1) add enum entry here, (2) add per-source Zod
// schema in packages/types/src/sources/<name>.ts, (3) add an adapter
// in products/01-registry/app/domain/sources/<name>.ts. Compiler enforces
// exhaustive coverage in non-exhaustive checks.
//
// Migration note (M-L1-taxonomy): legacy `CrawlerSource` (kebab-case)
// remains exported for one milestone with `@deprecated` flag; storage
// layer projects `native` → `paxio-native`, `fetch-ai` → `fetch` in
// migration 003_taxonomy.

export const AGENT_SOURCES = [
  'paxio-native',
  'erc8004',
  'a2a',
  'mcp',
  'fetch',
  'virtuals',
  'eliza',
  // ── Legacy aliases retained until storage migration 003 lands ──
  // After migration backfills `native` → `paxio-native` and `fetch-ai` →
  // `fetch`, these two entries get removed in a follow-up PR.
  'native', // @deprecated — use 'paxio-native'
  'fetch-ai', // @deprecated — use 'fetch'
] as const;

export type AgentSource = (typeof AGENT_SOURCES)[number];

export const ZodAgentSource = z.enum(AGENT_SOURCES);

/**
 * Display labels for AgentSource (frontend rendering).
 * Internal storage uses the kebab-case enum values; UI gets these labels
 * via this mapping (keeps storage schema clean while preserving "ERC-8004"
 * / "Fetch.ai" / "ElizaOS" capitalisation users expect).
 */
export const AGENT_SOURCE_LABELS: Readonly<Record<AgentSource, string>> =
  Object.freeze({
    'paxio-native': 'paxio-native',
    erc8004: 'ERC-8004',
    a2a: 'A2A',
    mcp: 'MCP',
    fetch: 'Fetch.ai',
    virtuals: 'Virtuals',
    eliza: 'ElizaOS',
    // Legacy aliases — same label as their canonical form
    native: 'paxio-native',
    'fetch-ai': 'Fetch.ai',
  });
