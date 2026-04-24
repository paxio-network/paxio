// A2A (Google Agent2Agent) crawler adapter — STUB (FA-01, M-L1-impl).
//
// Real implementation requires:
//   1. A discovery seed list (well-known agent.json URLs we know about) OR
//      a federation gossip protocol to discover new agents.
//   2. HTTP fetch for each `https://<host>/.well-known/agent.json`.
//   3. Parse + validate against ZodA2aAgentCard.
//
// The MVP iteration ships the contract surface only; toCanonical is fully
// functional so downstream tests can drive it with synthetic raw records.

import {
  ZodA2aAgentCard,
  type A2aAgentCard,
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

const buildDid = (cardUrl: string): Did => {
  // Hash-free, URL-derived identifier. Take host + path, strip
  // .well-known/agent.json, lowercase, sanitise.
  const u = new URL(cardUrl);
  const host = u.host.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
  const pathPart = u.pathname
    .toLowerCase()
    .replace(/\/\.well-known\/agent\.json$/, '')
    .replace(/[^a-z0-9./-]/g, '-')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\//g, '-');
  const id = pathPart.length > 0 ? `${host}-${pathPart}` : host;
  return `did:paxio:a2a:${id}` as Did;
};

export const createA2aAdapter = (): CrawlerSourceAdapter<A2aAgentCard> => {
  const sourceName: CrawlerSource = 'a2a';

  // eslint-disable-next-line require-yield
  async function* fetchAgents(): AsyncIterable<A2aAgentCard> {
    return;
  }

  const toCanonical = (
    raw: A2aAgentCard,
  ): Result<AgentCard, SourceAdapterError> => {
    const parsed = ZodA2aAgentCard.safeParse(raw);
    if (!parsed.success) {
      return err({
        code: 'parse_error',
        message: parsed.error.issues[0]?.message ?? 'invalid card',
        raw,
      });
    }
    const r = parsed.data;
    const card: AgentCard = {
      did: buildDid(r.cardUrl),
      name: r.name,
      ...(r.description !== undefined
        ? { description: r.description.slice(0, 1000) }
        : {}),
      capability: 'INTELLIGENCE',
      endpoint: r.url,
      version: r.version,
      createdAt: '1970-01-01T00:00:00.000Z', // A2A spec has no timestamps
      source: sourceName,
      externalId: r.cardUrl,
      sourceUrl: r.cardUrl,
    };
    return ok(card);
  };

  return Object.freeze({
    sourceName,
    fetchAgents,
    toCanonical,
  });
};
