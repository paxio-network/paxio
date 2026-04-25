import { z } from 'zod';

// CrawlerSource — internal kebab-case identifier for where an AgentCard
// originated. Used as the storage / routing key in agent_cards table and
// in AgentSourceAdapter ports.
//
// Distinct from `AgentSource` in landing.ts which uses display-style tags
// ('ERC-8004', 'Fetch.ai', 'paxio-native') for UI rendering. Mapping
// happens at the landing-stats projection layer:
//   CrawlerSource.'erc8004'   → AgentSource.'ERC-8004'
//   CrawlerSource.'fetch-ai'  → AgentSource.'Fetch.ai'
//   CrawlerSource.'native'    → AgentSource.'paxio-native'
//
// 'native' = registered directly via POST /registry/register (DID issued by
// Paxio). The other five are external ecosystems indexed by Universal
// Registry crawlers (FA-01 / M-L1).
//
// Adding a new source = (1) add enum entry here, (2) add per-source Zod
// schema in packages/types/src/sources/<name>.ts, (3) add an adapter
// implementation in products/01-registry/app/domain/sources/<name>.ts.
// The enum is the contract; downstream non-exhaustive checks become
// compile errors if an adapter is missing.

export const CRAWLER_SOURCES = [
  'native', // Registered directly via POST /registry/register
  'erc8004', // ERC-8004 on-chain agent registry (Ethereum / L2s)
  'a2a', // Google Agent2Agent — agent.json at well-known URL
  'mcp', // MCP server registry (Anthropic directory + Smithery.ai)
  'fetch-ai', // Fetch.ai Agentverse — https://agentverse.ai
  'virtuals', // Virtuals Protocol ACP registry — https://virtuals.io
] as const;

export type CrawlerSource = (typeof CRAWLER_SOURCES)[number];

export const ZodCrawlerSource = z.enum(CRAWLER_SOURCES);
