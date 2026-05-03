// Fetch.ai (Agentverse) crawler adapter — REAL impl (FA-01, M-L1).
//
// Agentverse REST API (no auth required):
//   POST https://agentverse.ai/v1/search/agents
//   Content-Type: application/json
//   Body: { search_text, filters, sort, direction, offset, limit }
// Pagination via offset/limit in JSON body; terminates on empty `agents` array.
// SAFETY_MAX_PAGES=200 prevents runaway on bad upstream.
// 429 → Retry-After delay, then continue or abort.
// 5xx → single retry, then abort gracefully.

import {
  ZodFetchAiAgent,
  type FetchAiAgent,
  type AgentCard,
  type CrawlerSource,
  type Capability,
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
// HttpClient port — same shape as mcp.ts / erc8004-adapter.test.ts
// ---------------------------------------------------------------------------

export interface HttpResponse {
  readonly status: number;
  readonly headers: ReadonlyMap<string, string>;
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
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://agentverse.ai';
const DEFAULT_PAGE_SIZE = 100;
const SAFETY_MAX_PAGES = 200;
const RETRY_AFTER_SECONDS = 2;

/** Sentinel noop HTTP client — used only when caller passes no deps at all. */
const noopHttpClient: HttpClient = {
  async fetch() {
    return { status: 200, headers: new Map(), body: { agents: [] } };
  },
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Capability inference — default INTELLIGENCE, keyword overrides
// ---------------------------------------------------------------------------

const CAPABILITY_KEYWORDS: ReadonlyArray<{
  readonly capability: Capability;
  readonly patterns: ReadonlyArray<RegExp>;
}> = Object.freeze([
  {
    capability: 'WALLET',
    patterns: [/wallet/i, /\bbtc\b/i, /\beth\b/i, /\bbitcoin\b/i],
  },
  {
    capability: 'FACILITATOR',
    patterns: [/payment/i, /\bpay\b/i, /facilitator/i, /\bx402\b/i],
  },
  {
    capability: 'SECURITY',
    patterns: [/security/i, /audit/i, /threat/i, /scanner/i, /firewall/i],
  },
  {
    capability: 'REGISTRY',
    patterns: [/registry/i, /directory/i, /\bindex\b/i],
  },
]);

const inferCapability = (raw: FetchAiAgent): Capability => {
  const haystack = `${raw.name} ${raw.category ?? ''} ${raw.description ?? ''} ${raw.tags.join(' ')}`;
  for (const rule of CAPABILITY_KEYWORDS) {
    if (rule.patterns.some((rx) => rx.test(haystack))) return rule.capability;
  }
  return 'INTELLIGENCE';
};

// ---------------------------------------------------------------------------
// DID derivation — did:paxio:fetch-ai:<lowercase-address>
// ---------------------------------------------------------------------------

const buildDid = (address: string): Did =>
  `did:paxio:fetch-ai:${address.toLowerCase()}` as Did;

// ---------------------------------------------------------------------------
// Agentverse API response shapes
// ---------------------------------------------------------------------------

interface AgentverseSearchResponse {
  readonly agents?: ReadonlyArray<unknown>;
  readonly total?: number;
  readonly offset?: number;
  readonly limit?: number;
}

const isAgentRecord = (v: unknown): v is FetchAiAgent => {
  if (typeof v !== 'object' || v === null) return false;
  return typeof (v as Record<string, unknown>).address === 'string';
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface FetchAiAdapterDeps {
  readonly httpClient: HttpClient;
  /** Override base URL for testing (e.g. local mock server). */
  readonly baseUrl?: string;
  /** Page size (default 100, cap 200). */
  readonly pageSize?: number;
}

export const createFetchAiAdapter = (
  deps: FetchAiAdapterDeps = { httpClient: noopHttpClient },
): CrawlerSourceAdapter<FetchAiAgent> => {
  const baseUrl = (deps.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const pageSize = Math.min(Math.max(deps.pageSize ?? DEFAULT_PAGE_SIZE, 1), 200);
  const sourceName: CrawlerSource = 'fetch-ai';

  async function* fetchAgents(): AsyncIterable<FetchAiAgent> {
    let offset = 0;
    let pageCount = 0;

    while (pageCount < SAFETY_MAX_PAGES) {
      pageCount += 1;
      const url = `${baseUrl}/v1/search/agents`;

      let response: HttpResponse | undefined;

      // Retry-on-5xx loop: attempt once, retry once on 5xx.
      outer: for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await deps.httpClient.fetch({
            url,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
              search_text: '',
              filters: {},
              sort: 'relevancy',
              direction: 'asc',
              offset,
              limit: pageSize,
            },
          });
        } catch {
          // Network error — abort gracefully; caller can re-run later.
          return;
        }

        if (response!.status === 429) {
          const retryAfter = response!.headers.get('retry-after');
          const waitMs =
            retryAfter != null
              ? parseInt(retryAfter, 10) * 1000
              : RETRY_AFTER_SECONDS * 1000;
          await sleep(waitMs);
          // Re-fetch same page.
          response = undefined;
          continue;
        }

        if (response!.status >= 500) {
          if (attempt === 0) {
            response = undefined;
            continue; // will re-fetch on next iteration
          }
          return; // second failure → abort
        }

        break; // 2xx → process
      }

      // Network error (e.g. ECONNRESET) or no response after retries — abort.
      if (response === undefined) {
        // Threw or exhausted — nothing to report; caller can re-run later.
        return;
      }

      if (response.status < 200 || response.status >= 300) return;

      const body = response.body as AgentverseSearchResponse | null;
      if (!body || !Array.isArray(body.agents) || body.agents.length === 0) {
        return; // empty page → pagination done
      }

      for (const raw of body.agents) {
        if (!isAgentRecord(raw)) continue;
        const parsed = ZodFetchAiAgent.safeParse(raw);
        if (parsed.success) yield parsed.data;
      }

      const yielded = body.agents.length;
      if (yielded === 0 || yielded < pageSize) return; // last page

      offset += pageSize;
    }
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
      capability: inferCapability(r),
      ...(r.endpoint !== undefined ? { endpoint: r.endpoint } : {}),
      version: '0.0.1',
      createdAt: new Date(r.registeredAt).toISOString(),
      source: sourceName,
      externalId: r.address,
      sourceUrl: r.profileUrl,
    };
    return ok(card);
  };

  return Object.freeze({ sourceName, fetchAgents, toCanonical });
};