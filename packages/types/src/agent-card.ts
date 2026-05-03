import { z } from 'zod';
import { ZodDid } from './did';
import { ZodCapability } from './capability'; // @deprecated — kept for backward compat
import { ZodCrawlerSource } from './crawler-source'; // @deprecated — superseded by ZodAgentSource
import { ZodAgentCategory } from './agent-category';
import { ZodAgentSource } from './agent-source';
import { ZodAgentFramework } from './agent-framework';

// AgentCard — canonical schema (M-L1-taxonomy v3).
//
// 9 attribute groups covering full agentic ecosystem (foundation models,
// MCP tool servers, framework agents, SaaS agents, on-chain agents).
// See FA-01 §4 + docs/sprints/M-L1-taxonomy.md for design rationale.
//
// Key principles:
//   1. `category` (single, 11 domains) = что делает агент в реальном мире
//   2. `capabilities` (array of free-form tags) = детализация возможностей
//   3. `source` (7-value enum) = где зарегистрирован / откуда обнаружен
//   4. `framework` (10-value enum) = технология под капотом
//   5. Bitcoin / x402 / payment rails = атрибуты в `wallet`/`payment` блоках,
//      НЕ категории
//
// Backward compatibility: `capability` (paxio-layer enum) kept as optional
// deprecated field. Storage layer projects existing rows during 003
// migration (capability='INTELLIGENCE' → category='AI & ML', etc.).

// ─────────────────────────────────────────────────────────────────────────
// Group 1 — Identification
// ─────────────────────────────────────────────────────────────────────────

const ZodIdentification = z.object({
  did: ZodDid,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  version: z.string().default('0.0.1'),
  endpoint: z.string().url().optional(),
  source: ZodAgentSource.default('paxio-native'),
  externalId: z.string().min(1).max(500).optional(),
  sourceUrl: z.string().url().optional(),
  // `createdAt` = canonical registration timestamp (когда Paxio записал в свой
  // registry). Old name kept for backward-compat with existing adapters that
  // populate it; semantically equivalent to user-spec `registered_at`.
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  // `crawledAt` — когда crawler observe'нул источник
  crawledAt: z.string().datetime().optional(),
  claimed: z.boolean().optional(),
  owner: z.string().max(500).optional(), // 0x... or DID owner
});

// ─────────────────────────────────────────────────────────────────────────
// Group 2 — Capabilities
// ─────────────────────────────────────────────────────────────────────────

const ZodIoType = z.enum([
  'text',
  'file/pdf',
  'file/docx',
  'file/xlsx',
  'image',
  'audio',
  'video',
  'code',
  'json',
]);

const ZodCapabilities = z.object({
  // `category` REQUIRED для новых агентов; optional during M-L1-taxonomy
  // migration window (existing 3230 records backfilled to 'AI & ML' в
  // storage migration 003). Adapters MUST infer + populate в своих
  // M-L1-taxonomy implementation tasks.
  category: ZodAgentCategory.optional(),
  capabilities: z.array(z.string().min(1).max(100)).optional(),
  inputTypes: z.array(ZodIoType).optional(),
  outputTypes: z.array(ZodIoType).optional(),
  languages: z.array(z.string().length(2)).optional(), // ISO 639-1 codes
  framework: ZodAgentFramework.optional(),
});

// ─────────────────────────────────────────────────────────────────────────
// Group 3 — Wallet
// ─────────────────────────────────────────────────────────────────────────

const ZodWalletStatus = z.enum(['paxio-native', 'external', 'none']);

const ZodWallet = z.object({
  status: ZodWalletStatus.default('none'),
  addresses: z
    .object({
      btc: z.string().optional(),
      usdc: z.string().optional(),
      eth: z.string().optional(),
      sol: z.string().optional(),
    })
    .default({}),
  verified: z.boolean().default(false), // challenge-response signature ok
});

// ─────────────────────────────────────────────────────────────────────────
// Group 4 — Payment
// ─────────────────────────────────────────────────────────────────────────

const ZodPaymentRail = z.enum([
  'x402',
  'usdc-base',
  'btc-l1',
  'btc-lightning',
  'stripe-mpp',
  'icp',
  'tap',
]);

const ZodPaymentFacilitator = z.enum([
  'paxio',
  'coinbase',
  'skyfire',
  'stripe',
  'self',
  'unknown',
]);

const ZodPricingModel = z.enum([
  'per_call',
  'per_token',
  'subscription',
  'free',
]);

const ZodPayment = z.object({
  accepts: z.array(ZodPaymentRail).default([]),
  preferred: ZodPaymentRail.optional(),
  facilitator: ZodPaymentFacilitator.default('unknown'),
  facilitatorVerified: z.boolean().default(false), // verified through real txn
  pricing: z
    .object({
      perCall: z.number().nonnegative().optional(),
      perToken: z.number().nonnegative().optional(),
      currency: z.string().min(2).max(10).optional(), // 'usdc' / 'btc' / 'usd'
      model: ZodPricingModel.default('per_call'),
    })
    .default({}),
});

// ─────────────────────────────────────────────────────────────────────────
// Group 5 — Performance (verified by us via Endpoint Prober, not agent)
// ─────────────────────────────────────────────────────────────────────────

const ZodSla = z.object({
  p50Ms: z.number().nonnegative().optional(),
  p95Ms: z.number().nonnegative().optional(),
  p99Ms: z.number().nonnegative().optional(),
  uptime30d: z.number().min(0).max(1).optional(),
  lastChecked: z.string().datetime().optional(),
});

// ─────────────────────────────────────────────────────────────────────────
// Group 6 — Reputation (DKI canister, unforgeable) + Security
// ─────────────────────────────────────────────────────────────────────────

const ZodSecurityBadge = z.enum(['gold', 'silver', 'bronze', 'none']);

const ZodReputation = z.object({
  score: z.number().min(0).max(1000).optional(),
  txCount: z.number().nonnegative().int().default(0),
  deliveryRate: z.number().min(0).max(1).optional(),
  disputeRate: z.number().min(0).max(1).optional(),
});

const ZodSecurity = z.object({
  owaspScore: z.number().min(0).max(1).optional(), // 0=perfect, 1=worst
  badgeLevel: ZodSecurityBadge.default('none'),
  lastScanned: z.string().datetime().optional(),
  guardConnected: z.boolean().default(false),
  guardIncidents30d: z.number().nonnegative().int().default(0),
});

// ─────────────────────────────────────────────────────────────────────────
// Group 7 — Compliance
// ─────────────────────────────────────────────────────────────────────────

const ZodComplianceState = z.enum(['certified', 'in_progress', 'none']);

const ZodDataHandling = z.enum(['no-storage', 'ephemeral', 'logged']);

const ZodCompliance = z.object({
  euAiAct: ZodComplianceState.default('none'),
  euAiActExpires: z.string().datetime().optional(),
  owaspCert: z.boolean().default(false),
  iso42001: z.number().min(0).max(1).optional(), // % coverage
  kyaCert: z.boolean().default(false),
  dataHandling: ZodDataHandling.default('ephemeral'),
});

// ─────────────────────────────────────────────────────────────────────────
// Group 8 — Ecosystem metadata
// ─────────────────────────────────────────────────────────────────────────

const ZodChainNetwork = z.enum([
  'ethereum',
  'base',
  'solana',
  'icp',
  'fetch',
  'none',
]);

const ZodEcosystem = z.object({
  network: ZodChainNetwork.default('none'),
  chainId: z.number().int().nonnegative().optional(), // EVM chain id (8453, 1, ...)
  erc8004TokenId: z.string().optional(), // ERC-8004 token id
  openSource: z.string().url().nullable().default(null), // GitHub URL or null
  compatibleClients: z.array(z.string()).default([]), // ['claude', 'cursor', ...]
});

// ─────────────────────────────────────────────────────────────────────────
// Group 9 — Developer (verified via challenge)
// ─────────────────────────────────────────────────────────────────────────

const ZodDeveloper = z.object({
  name: z.string().min(1).max(200).optional(),
  verified: z.boolean().default(false),
  url: z.string().url().optional(),
});

// ─────────────────────────────────────────────────────────────────────────
// Full AgentCard
// ─────────────────────────────────────────────────────────────────────────

export const ZodAgentCard = z
  .object({
    // @deprecated — old paxio-layer field. Storage projects to category
    // during M-L1-taxonomy migration. Remove after 1 milestone window.
    capability: ZodCapability.optional(),

    // @deprecated — kept until storage layer renames `mcp`/`fetch-ai`
    // to new AgentSource enum values.
    legacySource: ZodCrawlerSource.optional(),

    // Modern fields — ALL optional during M-L1-taxonomy rollout. Adapters
    // populate progressively; storage applies group defaults on upsert.
    wallet: ZodWallet.optional(),
    payment: ZodPayment.optional(),
    sla: ZodSla.optional(),
    reputation: ZodReputation.optional(),
    security: ZodSecurity.optional(),
    compliance: ZodCompliance.optional(),
    ecosystem: ZodEcosystem.optional(),
    developer: ZodDeveloper.optional(),
  })
  .merge(ZodIdentification)
  .merge(ZodCapabilities);

export type AgentCard = z.infer<typeof ZodAgentCard>;

// Re-export sub-schemas for fine-grained typing on consumer side
export {
  ZodWallet,
  ZodPayment,
  ZodSla,
  ZodReputation,
  ZodSecurity,
  ZodCompliance,
  ZodEcosystem,
  ZodDeveloper,
  ZodIoType,
  ZodPaymentRail,
  ZodPaymentFacilitator,
  ZodPricingModel,
  ZodWalletStatus,
  ZodSecurityBadge,
  ZodComplianceState,
  ZodDataHandling,
  ZodChainNetwork,
};

export type Wallet = z.infer<typeof ZodWallet>;
export type Payment = z.infer<typeof ZodPayment>;
export type Sla = z.infer<typeof ZodSla>;
export type Reputation = z.infer<typeof ZodReputation>;
export type Security = z.infer<typeof ZodSecurity>;
export type Compliance = z.infer<typeof ZodCompliance>;
export type Ecosystem = z.infer<typeof ZodEcosystem>;
export type Developer = z.infer<typeof ZodDeveloper>;
export type IoType = z.infer<typeof ZodIoType>;
export type PaymentRail = z.infer<typeof ZodPaymentRail>;
export type WalletStatus = z.infer<typeof ZodWalletStatus>;
export type SecurityBadge = z.infer<typeof ZodSecurityBadge>;
