// Per-source Zod schemas + TypeScript types for Universal Registry crawlers.
//
// Each external ecosystem has its own raw shape; adapters validate each raw
// record against the relevant Zod schema before projecting onto the
// canonical `AgentCard`. See packages/interfaces/src/agent-source-adapter.ts
// for the `AgentSourceAdapter<S>` port these schemas are parameterised by.
//
// Adding a new source: drop a `<source>.ts` file in this directory, add the
// enum entry in `../agent-source.ts`, and re-export here.

export * from './erc8004';
export * from './a2a';
export * from './mcp';
export * from './fetch-ai';
export * from './virtuals';
// M-L1-expansion T-2: paxio-curated source — manual seed JSON (foundation
// models, premier SaaS agents). Pre-committed DIDs (no crawler discovery).
export * from './paxio-curated';
// M-L1-T10: huggingface — public API, top-N by trending score (~600K surface).
export * from './huggingface';
