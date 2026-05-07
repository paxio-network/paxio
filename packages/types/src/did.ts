import { z } from 'zod';

// W3C DID Core 1.0 — Paxio method: did:paxio:<network>:<id>
//
// Examples:
//   did:paxio:base:0x1a2b3c...
//   did:paxio:icp:rdmx6-jaaaa-aaaaa-aaadq-cai
//   did:paxio:bitcoin:bc1q8dn72...
//   did:paxio:fetch-ai:agent1q000...     ← multi-word source slug
//   did:paxio:paxio-curated:slug-id      ← multi-word source slug
//
// See FA-01 Registry spec for full details.

export type Did = string;

// Network segment: lowercase alphanumerics + hyphens. Multi-word source
// slugs (fetch-ai, paxio-curated, langchain-hub, vercel-ai, github-discovered)
// are valid networks per AgentSource canonical enum.
const DID_REGEX = /^did:paxio:[a-z0-9-]+:[a-zA-Z0-9._-]+$/;

export const ZodDid = z
  .string()
  .regex(DID_REGEX, 'invalid DID format: expected did:paxio:<network>:<id>');

export const isDid = (s: string): s is Did => DID_REGEX.test(s);

// Parse DID into parts. Returns null if invalid.
export const parseDid = (
  s: string,
): { method: string; network: string; id: string } | null => {
  if (!isDid(s)) return null;
  const [, method, network, id] = s.split(':');
  if (!method || !network || !id) return null;
  return { method, network, id };
};
