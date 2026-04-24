// Per-source Zod schemas + TypeScript types for Universal Registry crawlers.
//
// Each external ecosystem has its own raw shape; adapters validate each raw
// record against the relevant Zod schema before projecting onto the
// canonical `AgentCard`. See packages/interfaces/src/agent-source-adapter.ts
// for the `AgentSourceAdapter<S>` port these schemas are parameterised by.
//
// Adding a new source: drop a `<source>.ts` file in this directory, add the
// enum entry in `../agent-source.ts`, and re-export here.

export * from './erc8004.js';
export * from './a2a.js';
export * from './mcp.js';
export * from './fetch-ai.js';
export * from './virtuals.js';
