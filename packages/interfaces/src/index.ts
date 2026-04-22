// Barrel re-exports for @paxio/interfaces.

export type { Logger, LogContext } from './logger.js';
export type { Clock } from './clock.js';

// Phase 0 domain ports
export type { Registry, RegistryError } from './registry.js';
export type { Wallet, WalletError } from './wallet.js';
export type { SecuritySidecar, SecurityError } from './security.js';
export type { AuditLog, AuditLogError } from './audit-log.js';
// Marketing / landing composite port
export type { MarketingStats, MarketingError } from './marketing.js';
