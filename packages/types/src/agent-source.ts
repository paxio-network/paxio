import { z } from 'zod';

// AgentSource — registry/ecosystem of record для агента (M-L1-expansion).
//
// 13 canonical values + 2 legacy aliases. Each value = independent crawler
// adapter в `products/01-registry/app/domain/sources/<name>.ts`, parsing
// per-source raw shape против Zod schema в `packages/types/src/sources/<name>.ts`,
// projecting onto canonical `AgentCard`.
//
// Adding a new source = (1) add enum entry here + label, (2) add per-source
// Zod schema в `packages/types/src/sources/<name>.ts`, (3) add adapter в
// `products/01-registry/app/domain/sources/<name>.ts`. Compiler enforces
// exhaustive coverage в non-exhaustive checks.
//
// Note: `x402` is NOT a source — it's a payment attribute (`payment.accepts`
// includes `'x402'`). Discovery: x402 facilitator on Base logs all paying
// agents → enrichment crawler updates existing agent rows, NOT creates new
// source.

export const AGENT_SOURCES = [
  // ── Direct entry — Paxio operator owns ───────────────────────────────
  'paxio-native', // POST /registry/register — DID issued by Paxio
  'paxio-curated', // app/data/curated-agents.json — manual seed
                  // (foundation models: Claude/Codex/Gemini/Hermes/Pi/Mistral/Llama,
                  //  SaaS agents: Devin/Cursor/Lindy/Adept, OpenClaw)

  // ── On-chain (wallet-backed → primary signal для agentic-economy) ────
  'erc8004', // Ethereum + Base — EVM event logs (`AgentRegistered`)
  'a2a', // Google Agent2Agent — `.well-known/agent.json` HTTP crawl
  'bittensor', // TAO subnets/miners — substrate RPC + subnet enumeration
  'virtuals', // Virtuals Protocol ACP registry (virtuals.io)

  // ── Framework / hub registries ────────────────────────────────────────
  'mcp', // umbrella: Smithery + Anthropic catalog + Glama + npm-mcp
         // (origin disambiguated via external_id prefix + source_url)
  'eliza', // ElizaOS (a16z) — GitHub topic + npm @elizaos/* + on-chain
  'langchain-hub', // smith.langchain.com/hub REST API
  'fetch', // Fetch.ai Agentverse REST API (~2M agents — dominant volume)

  // ── Discovery sources ─────────────────────────────────────────────────
  'huggingface', // huggingface.co Spaces filtered by `agents` tag
  'vercel-ai', // vercel.com/templates/ai — scrape templates marketplace
  'github-discovered', // catch-all для CrewAI/AutoGPT/AutoGen/Pydantic-AI
                       // GitHub code search by signature import

  // ── Legacy aliases (retained until storage migration 005 cleanup) ─────
  // Migration 003_taxonomy backfilled `native` → `paxio-native` and
  // `fetch-ai` → `fetch`. These entries kept Zod-acceptable for
  // backward-compat with any cached data outside Paxio control. Will be
  // dropped in M-L1-expansion follow-up cleanup migration.
  'native', // @deprecated — use 'paxio-native'
  'fetch-ai', // @deprecated — use 'fetch'
] as const;

export type AgentSource = (typeof AGENT_SOURCES)[number];

export const ZodAgentSource = z.enum(AGENT_SOURCES);

/**
 * Display labels for AgentSource (frontend rendering).
 * Internal storage uses the kebab-case enum values; UI gets these labels
 * via this mapping (keeps storage schema clean while preserving canonical
 * brand capitalisation users expect: "ERC-8004", "Fetch.ai", "ElizaOS").
 */
export const AGENT_SOURCE_LABELS: Readonly<Record<AgentSource, string>> =
  Object.freeze({
    // Direct entry
    'paxio-native': 'paxio-native',
    'paxio-curated': 'paxio-curated',

    // On-chain
    erc8004: 'ERC-8004',
    a2a: 'A2A',
    bittensor: 'Bittensor',
    virtuals: 'Virtuals',

    // Framework hubs
    mcp: 'MCP',
    eliza: 'ElizaOS',
    'langchain-hub': 'LangChain Hub',
    fetch: 'Fetch.ai',

    // Discovery
    huggingface: 'Hugging Face',
    'vercel-ai': 'Vercel AI',
    'github-discovered': 'GitHub',

    // Legacy aliases — same label as their canonical form
    native: 'paxio-native',
    'fetch-ai': 'Fetch.ai',
  });
