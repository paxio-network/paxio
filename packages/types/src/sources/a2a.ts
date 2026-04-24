import { z } from 'zod';

// Google Agent2Agent (A2A) — protocol for inter-agent discovery + calls.
// https://github.com/google/a2a (referenced as "A2A" throughout Paxio docs).
//
// Discovery model: an agent publishes a JSON descriptor at
// `https://<agent-host>/.well-known/agent.json`. The adapter fetches that
// URL, validates the JSON against this schema, and projects to AgentCard.
//
// The spec is still evolving — only the fields we use are modelled here;
// unknown fields pass through untouched via Zod's default `.strip()`
// behaviour (documented in the adapter contract: `toCanonical` must not
// lose data — full raw payload is also persisted in agent_cards.raw_payload
// for audit).
//
// Fields mirror the A2A Agent Card spec subset we depend on for routing:
//   - name, description, version — identity + versioning
//   - url — the agent's RPC endpoint (used in Paxio's FAP routing)
//   - capabilities[] — free-form skill tags; the adapter projects the first
//     one onto Paxio's coarse Capability enum + stores the full list.
//   - provider — metadata about who runs this agent.

export const ZodA2aProvider = z.object({
  organization: z.string().min(1).max(200),
  url: z.string().url().optional(),
});

export const ZodA2aCapabilityTag = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const ZodA2aAgentCard = z.object({
  // Full canonical URL the card was fetched from (well-known path).
  // NOT part of the original A2A spec — injected by the adapter for
  // provenance. Using `.url()` enforces a real absolute URL.
  cardUrl: z.string().url(),

  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  version: z.string().min(1).max(50),

  // Agent's service URL (the JSON-RPC endpoint clients call).
  url: z.string().url(),

  // List of declared skills. Spec says "non-empty"; we enforce at least 1.
  capabilities: z.array(ZodA2aCapabilityTag).min(1),

  // Provider / organisation metadata.
  provider: ZodA2aProvider,

  // Optional authentication hint (bearer / mTLS / paxio-wallet ...).
  // Free-form; we don't parse it, just propagate into raw_payload.
  authentication: z.string().max(200).optional(),
});

export type A2aProvider = z.infer<typeof ZodA2aProvider>;
export type A2aCapabilityTag = z.infer<typeof ZodA2aCapabilityTag>;
export type A2aAgentCard = z.infer<typeof ZodA2aAgentCard>;
