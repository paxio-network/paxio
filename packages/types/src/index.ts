// Barrel re-exports for @paxio/types.
// Consumers import: `import { ok, ZodDid, ... } from '@paxio/types';`

export * from './result.js';
export * from './did.js';
export * from './capability.js'; // @deprecated — see agent-category.js
export * from './crawler-source.js'; // @deprecated — see agent-source.js
// M-L1-taxonomy — domain-based agent classification
export * from './agent-category.js';
export * from './agent-source.js';
export * from './agent-framework.js';
export * from './agent-card.js';
export * from './errors.js';
// Phase 0 domain contracts
export * from './registry.js';
export * from './wallet.js';
export * from './security.js';
export * from './audit-log.js';
// Landing (real-data API for paxio.network)
export * from './landing.js';
// Health (GET /health — Docker HEALTHCHECK + deploy smoke tests)
export * from './health.js';
// Crawl observability — records each runCrawler invocation (FA-01, M-L1-launch).
export * from './crawl-run.js';
// Cron auto-scheduler config + tick decisions (FA-01, M-L1-launch T-4).
export * from './cron-scheduler.js';
// Intelligence — PAEI snapshot, agents list, market movers (FA-07, M-L11).
export * from './intelligence.js';
// Per-source Zod schemas for Universal Registry crawler (FA-01, M-L1).
// Each external ecosystem (ERC-8004, A2A, MCP, Fetch.ai, Virtuals) has a
// dedicated schema describing its raw format; adapters validate and project
// onto the canonical AgentCard.
export * from './sources/index.js';
