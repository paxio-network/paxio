// Virtuals Protocol crawler adapter — STUB (FA-01, M-L1-impl).
//
// Real implementation requires:
//   1. GraphQL client (POST to https://api.virtuals.io/graphql)
//   2. Cursor-based pagination over agents query
//   3. On-chain ERC-20 metadata enrichment (optional, M17)
//
// This MVP iteration ships the contract surface only; toCanonical is fully
// functional so downstream tests can drive it with synthetic raw records.

import {
  ZodVirtualsAgent,
  type VirtualsAgent,
  type AgentCard,
  type CrawlerSource,
  type Did,
  type Result,
  ok,
  err,
} from '@paxio/types';
import type {
  CrawlerSourceAdapter,
  SourceAdapterError,
} from '@paxio/interfaces';

const buildDid = (id: string): Did => `did:paxio:virtuals:${id}` as Did;

export const createVirtualsAdapter = (): CrawlerSourceAdapter<VirtualsAgent> => {
  const sourceName: CrawlerSource = 'virtuals';

  // eslint-disable-next-line require-yield
  async function* fetchAgents(): AsyncIterable<VirtualsAgent> {
    return;
  }

  const toCanonical = (
    raw: VirtualsAgent,
  ): Result<AgentCard, SourceAdapterError> => {
    const parsed = ZodVirtualsAgent.safeParse(raw);
    if (!parsed.success) {
      return err({
        code: 'parse_error',
        message: parsed.error.issues[0]?.message ?? 'invalid agent',
        raw,
      });
    }
    const r = parsed.data;
    const card: AgentCard = {
      did: buildDid(r.id),
      name: r.name,
      ...(r.description !== undefined
        ? { description: r.description.slice(0, 1000) }
        : {}),
      capability: 'INTELLIGENCE',
      version: '0.0.1',
      createdAt: new Date(r.launchedAt).toISOString(),
      source: sourceName,
      externalId: r.id,
      sourceUrl: r.profileUrl,
    };
    return ok(card);
  };

  return Object.freeze({
    sourceName,
    fetchAgents,
    toCanonical,
  });
};
