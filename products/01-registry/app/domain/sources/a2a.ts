// A2A (Google Agent2Agent) crawler adapter — BFS discovery (FA-01, M-L1-exp T-3).
//
// Discovery model:
//   1. Seed hosts are queued first.
//   2. Each iteration dequeues one host, fetches GET <host>/.well-known/agent.json.
//   3. The raw JSON body is parsed to extract peers[] for BFS enqueueing.
//   4. cardUrl is INJECTED by the adapter (not present in raw A2A spec) before
//      Zod validation — this is the canonical provenance field.
//   5. On 2xx: yield validated A2aAgentCard; on 404/timeout: skip gracefully;
//      on sustained 5xx: abort iteration.
//
// Pure / impure split:
//   - `fetchAgents()` — async generator, performs HTTP I/O via injected
//     httpClient (so tests inject a fake; no `fetch` global access here).
//   - `toCanonical(raw)` — pure: validates with ZodA2aAgentCard, projects to
//     AgentCard. No clock reads, no Math.random. Caller injects `crawledAt`
//     if it wants a timestamp.

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

// ---------------------------------------------------------------------------
// HTTP client port — injected so the adapter has no hidden dep on `fetch`.
// ---------------------------------------------------------------------------

export interface HttpResponse {
  readonly status: number;
  readonly headers: ReadonlyMap<string, string>;
  /** Parsed JSON body (driver decodes). `null` if non-2xx or empty body. */
  readonly body: unknown;
}

export interface HttpClient {
  fetch(req: {
    url: string;
    method: 'GET' | 'POST';
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<HttpResponse>;
}

// ---------------------------------------------------------------------------
// A2A raw JSON shape (subset of well-known/agent.json we consume).
// ---------------------------------------------------------------------------

interface A2aRawCard {
  readonly name: string;
  readonly description?: string;
  readonly version: string;
  readonly url: string;
  readonly capabilities: ReadonlyArray<{ readonly name: string; readonly description?: string }>;
  readonly provider: { readonly organization: string; readonly url?: string };
  readonly authentication?: string;
  /** BFS expansion list — not in the Zod schema but present in raw payloads. */
  readonly peers?: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// DID derivation — `did:paxio:a2a:<host-id>`.
// ---------------------------------------------------------------------------

const buildDid = (cardUrl: string): Did => {
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

// ---------------------------------------------------------------------------
// Normalise raw A2A JSON → A2aAgentCard (cardUrl injected, peers[] consumed).
// Returns the validated card on success so fetchAgents can extract peers[].
// ---------------------------------------------------------------------------

const normaliseCard = (
  raw: A2aRawCard,
  cardUrl: string,
): Result<A2aAgentCard, SourceAdapterError> => {
  // Reconstruct object with injected cardUrl (not present in raw spec).
  const withCardUrl = {
    ...raw,
    cardUrl,
  };
  const parsed = ZodA2aAgentCard.safeParse(withCardUrl);
  if (!parsed.success) {
    return err({
      code: 'parse_error',
      message: parsed.error.issues[0]?.message ?? 'invalid card',
      raw: withCardUrl,
    });
  }
  return ok(parsed.data);
};

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export interface A2aAdapterDeps {
  readonly httpClient: HttpClient;
  /** Seed host URLs (just host + optional path prefix, no /.well-known). */
  readonly seeds: ReadonlyArray<string>;
  /**
   * BFS depth limit (default 3). Depth 0 = seeds only, no peers expansion.
   * Depth N = seeds (depth 0) + their direct peers (depth 1) + peers-of-peers.
   */
  readonly maxDepth?: number;
  /**
   * Upper bound on unique hosts to visit (default 500). Prevents unbounded BFS.
   */
  readonly maxHosts?: number;
}

const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_HOSTS = 500;
const CONSECUTIVE_5XX_THRESHOLD = 20;

const normaliseUrl = (raw: string): string => {
  const s = raw.trim();
  // Add https:// if no scheme present.
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
};

const wellKnownPath = (host: string): string => {
  const base = normaliseUrl(host);
  // Strip trailing slash then append /.well-known/agent.json.
  return `${base.replace(/\/+$/, '')}/.well-known/agent.json`;
};

export const createA2aAdapter = (
  deps: A2aAdapterDeps,
): CrawlerSourceAdapter<A2aAgentCard> => {
  const maxDepth = deps.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxHosts = deps.maxHosts ?? DEFAULT_MAX_HOSTS;
  const sourceName: CrawlerSource = 'a2a';

  async function* fetchAgents(): AsyncIterable<A2aAgentCard> {
    // BFS queue: each entry is { url, depth }.
    const queue: Array<{ url: string; depth: number }> = deps.seeds.map(
      (seed) => ({ url: wellKnownPath(seed), depth: 0 }),
    );
    const visited = new Set<string>();
    let consecutive5xx = 0;

    while (queue.length > 0) {
      // Stop if we've hit the consecutive 5xx storm threshold.
      if (consecutive5xx >= CONSECUTIVE_5XX_THRESHOLD) return;

      const current = queue.shift()!;
      const { url, depth } = current;

      // Skip already-visited hosts.
      if (visited.has(url)) continue;
      visited.add(url);

      // Skip if we've exceeded maxHosts.
      if (visited.size >= maxHosts) continue;

      // Skip if we've exceeded maxDepth.
      if (depth > maxDepth) continue;

      let response: HttpResponse;
      try {
        response = await deps.httpClient.fetch({ url, method: 'GET' });
      } catch {
        // Network-level failure — abort iteration silently.
        return;
      }

      if (response.status === 429) {
        // Rate limited — end the stream; scheduler retries later.
        return;
      }

      if (response.status >= 500) {
        consecutive5xx += 1;
        continue;
      }

      // Any non-5xx resets the 5xx counter (even 3xx redirects, 4xx are
      // normal "this host is not an A2A agent").
      consecutive5xx = 0;

      if (response.status < 200 || response.status >= 300) {
        // 404 and other 4xx — host is not an A2A agent, skip gracefully.
        continue;
      }

      const body = response.body;
      if (typeof body !== 'object' || body === null) continue;
      const raw = body as A2aRawCard;

      // Validate + normalise (injects cardUrl).
      const cardResult = normaliseCard(raw, url);
      if (!cardResult.ok) continue;

      // Enqueue peers if within depth budget.
      if (depth < maxDepth && Array.isArray(raw.peers)) {
        for (const peer of raw.peers) {
          if (typeof peer !== 'string' || peer.length === 0) continue;
          const peerUrl = wellKnownPath(peer);
          if (!visited.has(peerUrl)) {
            queue.push({ url: peerUrl, depth: depth + 1 });
          }
        }
      }

      yield cardResult.value;
    }
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
