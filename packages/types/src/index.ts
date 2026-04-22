// Barrel re-exports for @paxio/types.
// Consumers import: `import { ok, ZodDid, ... } from '@paxio/types';`

export * from './result.js';
export * from './did.js';
export * from './capability.js';
export * from './agent-card.js';
export * from './errors.js';
// Phase 0 domain contracts
export * from './registry.js';
export * from './wallet.js';
export * from './security.js';
export * from './audit-log.js';
// Landing (real-data API for paxio.network)
export * from './landing.js';
