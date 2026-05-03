// Barrel re-exports for @paxio/types.
// Consumers import: `import { ok, ZodDid, ... } from '@paxio/types';`

export * from './result';
export * from './did';
export * from './capability'; // @deprecated — see agent-category.js
export * from './crawler-source'; // @deprecated — see agent-source.js
// M-L1-taxonomy — domain-based agent classification
export * from './agent-category';
export * from './agent-source';
export * from './agent-framework';
export * from './agent-card';
export * from './errors';
// Phase 0 domain contracts
export * from './registry';
export * from './wallet';
export * from './security';
export * from './audit-log';
// Landing (real-data API for paxio.network)
export * from './landing';
// Health (GET /health — Docker HEALTHCHECK + deploy smoke tests)
export * from './health';
// Crawl observability — records each runCrawler invocation (FA-01, M-L1-launch).
export * from './crawl-run';
// Cron auto-scheduler config + tick decisions (FA-01, M-L1-launch T-4).
export * from './cron-scheduler';
// Intelligence — PAEI snapshot, agents list, market movers (FA-07, M-L11).
export * from './intelligence';
// Per-source Zod schemas for Universal Registry crawler (FA-01, M-L1).
// Each external ecosystem (ERC-8004, A2A, MCP, Fetch.ai, Virtuals) has a
// dedicated schema describing its raw format; adapters validate and project
// onto the canonical AgentCard.
export * from './sources/index';
