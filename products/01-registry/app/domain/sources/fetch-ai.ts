// Fetch.ai (Agentverse) crawler adapter — STUB (FA-01, M-L1-impl).
//
// Real implementation requires:
//   1. HTTP client to the Agentverse public API
//      (GET https://agentverse.ai/v1/search/agents?query=&offset=&limit=100)
//   2. Pagination loop over the search results.
//   3. Per-agent profile fetch for full metadata if the search response is
//      lean (so we don't smash their API with N+1 lookups — needs to be
//      throttled).
//
// This MVP iteration ships the contract surface only; toCanonical is fully
// functional so downstream tests can drive it with synthetic raw records.
// Fetch.ai is the largest target source (~2M agents) so the real impl will
// dominate Phase-0 ingest volume.

import {
  ZodFetchAiAgent,
  type FetchAiAgent,
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

const buildDid = (address: string): Did =>
  `did:paxio:fetch-ai:${address.toLowerCase()}` as Did;

export const createFetchAiAdapter = (): CrawlerSourceAdapter<FetchAiAgent> => {
  const sourceName: CrawlerSource = 'fetch-ai';

  // eslint-disable-next-line require-yield
  async function* fetchAgents(): AsyncIterable<FetchAiAgent> {
    return;
  }

  const toCanonical = (
    raw: FetchAiAgent,
  ): Result<AgentCard, SourceAdapterError> => {
    const parsed = ZodFetchAiAgent.safeParse(raw);
    if (!parsed.success) {
      return err({
        code: 'parse_error',
        message: parsed.error.issues[0]?.message ?? 'invalid agent',
        raw,
      });
    }
    const r = parsed.data;
    const card: AgentCard = {
      did: buildDid(r.address),
      name: r.name,
      ...(r.description !== undefined
        ? { description: r.description.slice(0, 1000) }
        : {}),
      capability: 'INTELLIGENCE',
      ...(r.endpoint !== undefined ? { endpoint: r.endpoint } : {}),
      version: '0.0.1',
      createdAt: new Date(r.registeredAt).toISOString(),
      source: sourceName,
      externalId: r.address,
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
