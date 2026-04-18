import { z } from 'zod';

// 5 core capabilities from CLAUDE.md + FA-01.
// Each agent in Registry has exactly one primary capability.
// Used for capability-based routing in FAP and agent discovery.

export const CAPABILITIES = [
  'REGISTRY', // Agent registry operations (P1)
  'FACILITATOR', // Payment routing (P2)
  'WALLET', // Non-custodial wallet (P3)
  'SECURITY', // Threat detection / Guard / Sidecar (P4)
  'INTELLIGENCE', // Market data, NLU, fraud (P7)
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const ZodCapability = z.enum(CAPABILITIES);
