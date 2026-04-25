// MCP (Smithery + Anthropic registry) crawler adapter (FA-01, M-L1-impl).
//
// Smithery exposes a public REST API (no auth required for read operations)
// at https://registry.smithery.ai/servers — we paginate through it, normalise
// each entry to the `McpServerDescriptor` schema, and project to AgentCard.
//
// Why Smithery first:
//   - Public, no API key, well-documented JSON.
//   - ~7K servers — small enough to crawl in one pass, large enough to
//     populate landing.
//   - Rich metadata (tools, runtime, ratings) → high-quality reputation seed.
//
// The Anthropic directory (GitHub-indexed) is a separate fetcher under the
// same `mcp` source — out of scope for this MVP iteration.
//
// Pure / impure split:
//   - `fetchAgents()` — async generator, performs HTTP I/O via injected
//     httpClient (so tests inject a fake; no `fetch` global access here).
//   - `toCanonical(raw)` — pure: validates with ZodMcpServerDescriptor,
//     projects to AgentCard. No clock reads, no Math.random. Caller injects
//     `crawledAt` if it wants a timestamp.

import {
  ZodMcpServerDescriptor,
  type McpServerDescriptor,
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
// HTTP client port — injected, so the adapter has no hidden dep on `fetch`.
// ---------------------------------------------------------------------------

export interface HttpResponse {
  readonly status: number;
  readonly headers: ReadonlyMap<string, string>;
  /** Parsed JSON body (driver decodes). `null` if non-2xx or empty body. */
  readonly body: unknown;
}

export interface HttpClient {
  get(url: string): Promise<HttpResponse>;
}

// ---------------------------------------------------------------------------
// Smithery API shape (we only read what we need)
// ---------------------------------------------------------------------------

interface SmitheryListResponse {
  readonly servers?: ReadonlyArray<unknown>;
  readonly pagination?: {
    readonly currentPage?: number;
    readonly pageSize?: number;
    readonly totalPages?: number;
    readonly totalCount?: number;
  };
}

interface SmitheryServerRaw {
  readonly qualifiedName?: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly homepage?: string;
  readonly iconUrl?: string;
  readonly useCount?: number;
  readonly remote?: boolean;
  readonly createdAt?: string;
  readonly tools?: ReadonlyArray<{ name?: string; description?: string }>;
}

const DEFAULT_BASE_URL = 'https://registry.smithery.ai';
const DEFAULT_PAGE_SIZE = 100;
const SAFETY_MAX_PAGES = 200; // bounded to avoid infinite loops on bad upstream

// ---------------------------------------------------------------------------
// Capability projection — Smithery has no Paxio-style enum; default to
// INTELLIGENCE for general-purpose MCP servers. Future enrichment can map
// e.g. "payments" tools to FACILITATOR.
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

const inferCapability = (descriptor: McpServerDescriptor): Capability => {
  const haystack = `${descriptor.slug} ${descriptor.displayName} ${descriptor.description ?? ''}`;
  for (const rule of CAPABILITY_KEYWORDS) {
    if (rule.patterns.some((rx) => rx.test(haystack))) return rule.capability;
  }
  return 'INTELLIGENCE';
};

// ---------------------------------------------------------------------------
// DID derivation for MCP — `did:paxio:mcp:<slug>` (slugs are URL-safe by
// Smithery convention; we lowercase + restrict to safe chars to satisfy the
// ZodDid regex which expects [a-z0-9]+:[a-z0-9-_./]+ style suffixes).
// ---------------------------------------------------------------------------

const slugToDidId = (slug: string): string =>
  slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

const buildDid = (slug: string): Did => {
  const id = slugToDidId(slug);
  return `did:paxio:mcp:${id}`;
};

// ---------------------------------------------------------------------------
// Smithery → McpServerDescriptor normalisation (per-source raw → schema-
// validated). Keep narrow; throw nothing — return Result.
// ---------------------------------------------------------------------------

const normaliseSmitheryServer = (
  raw: SmitheryServerRaw,
): Result<McpServerDescriptor, SourceAdapterError> => {
  if (typeof raw.qualifiedName !== 'string' || raw.qualifiedName.length === 0) {
    return err({
      code: 'parse_error',
      message: 'Smithery server missing qualifiedName',
      raw,
    });
  }
  const candidate = {
    registrySource: 'smithery' as const,
    slug: raw.qualifiedName,
    displayName: raw.displayName ?? raw.qualifiedName,
    description: raw.description,
    repositoryUrl: raw.homepage,
    runtime:
      raw.remote === true ? ('http' as const) : ('stdio' as const),
    tools: Array.isArray(raw.tools)
      ? raw.tools
          .filter(
            (t): t is { name: string; description?: string } =>
              typeof t?.name === 'string' && t.name.length > 0,
          )
          .slice(0, 500)
          .map((t) => ({
            name: t.name,
            ...(t.description ? { description: t.description } : {}),
          }))
      : [],
    installCount:
      typeof raw.useCount === 'number' && raw.useCount >= 0
        ? raw.useCount
        : null,
    rating: null,
    lastPublishedAt:
      typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
  };
  const parsed = ZodMcpServerDescriptor.safeParse(candidate);
  if (!parsed.success) {
    return err({
      code: 'parse_error',
      message: parsed.error.issues[0]?.message ?? 'invalid descriptor',
      raw,
    });
  }
  return ok(parsed.data);
};

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export interface McpAdapterDeps {
  readonly httpClient: HttpClient;
  /** Override base URL for testing (e.g. local mock server). */
  readonly baseUrl?: string;
  /** Page size (default 100, cap 200). */
  readonly pageSize?: number;
}

export const createMcpSmitheryAdapter = (
  deps: McpAdapterDeps,
): CrawlerSourceAdapter<McpServerDescriptor> => {
  const baseUrl = (deps.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const pageSize = Math.min(Math.max(deps.pageSize ?? DEFAULT_PAGE_SIZE, 1), 200);
  const sourceName: CrawlerSource = 'mcp';

  async function* fetchAgents(): AsyncIterable<McpServerDescriptor> {
    let page = 1;
    let totalPages = 1;
    while (page <= Math.min(totalPages, SAFETY_MAX_PAGES)) {
      const url = `${baseUrl}/servers?page=${page}&pageSize=${pageSize}`;
      let response: HttpResponse;
      try {
        response = await deps.httpClient.get(url);
      } catch (cause) {
        // Network-level failure — abort iteration; consumer sees end of
        // stream. Caller can re-run later. We deliberately do not throw
        // because async generators surface throws as rejections, which
        // tend to be harder to handle in for-await loops.
        return;
      }
      if (response.status === 429) {
        // Rate limited — bail. Real impl would honour Retry-After. For MVP
        // we end the stream so the scheduler can retry on its own cadence.
        return;
      }
      if (response.status < 200 || response.status >= 300) {
        return;
      }
      const body = response.body as SmitheryListResponse | null;
      if (!body || !Array.isArray(body.servers)) {
        return;
      }
      for (const raw of body.servers) {
        if (typeof raw !== 'object' || raw === null) continue;
        const descriptor = normaliseSmitheryServer(raw as SmitheryServerRaw);
        if (descriptor.ok) yield descriptor.value;
      }
      const pag = body.pagination;
      if (pag && typeof pag.totalPages === 'number' && pag.totalPages > 0) {
        totalPages = pag.totalPages;
      } else {
        // No pagination metadata → assume single page and stop.
        return;
      }
      page += 1;
    }
  }

  const toCanonical = (
    raw: McpServerDescriptor,
  ): Result<AgentCard, SourceAdapterError> => {
    // Validate the input is a valid descriptor (defence-in-depth — input
    // may bypass fetchAgents in tests).
    const parsed = ZodMcpServerDescriptor.safeParse(raw);
    if (!parsed.success) {
      return err({
        code: 'parse_error',
        message: parsed.error.issues[0]?.message ?? 'invalid descriptor',
        raw,
      });
    }
    const desc = parsed.data;
    const did = buildDid(desc.slug);
    const card: AgentCard = {
      did,
      name: desc.displayName,
      ...(desc.description !== undefined
        ? { description: desc.description.slice(0, 1000) }
        : {}),
      capability: inferCapability(desc),
      ...(desc.repositoryUrl !== undefined
        ? { endpoint: desc.repositoryUrl }
        : {}),
      version: '0.0.1',
      // createdAt: prefer lastPublishedAt from Smithery, else epoch zero.
      // Note the contract says toCanonical is pure — no `new Date()` here.
      createdAt: desc.lastPublishedAt ?? '1970-01-01T00:00:00.000Z',
      source: sourceName,
      externalId: desc.slug,
      ...(desc.repositoryUrl !== undefined
        ? { sourceUrl: desc.repositoryUrl }
        : {}),
    };
    return ok(card);
  };

  return Object.freeze({
    sourceName,
    fetchAgents,
    toCanonical,
  });
};
