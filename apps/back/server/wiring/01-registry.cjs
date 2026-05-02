'use strict';

// Wiring for FA-01 (Registry) crawler domain.
//
// Combines:
//   - crawlRuns: pg-backed CrawlRunsRepo (recordRun, lastRunForSource)
//                — built by infrastructure/db.cjs and passed via deps
//   - crawlerAdapters: { mcp, erc8004, a2a, fetch-ai, virtuals } from
//                rawDomain['01-registry'].sources.<name>
//   - agentStorage: from deps (PostgresStorage agentStorage from db.cjs)
//
// Handler (admin-crawl.js) needs: domain.crawlRuns.*, domain.crawlerAdapters[source],
// domain.agentStorage, domain.CRAWLER_SOURCES, domain.clock.
//
// The loader nests domain modules by file stem:
//   products/01-registry/app/domain/sources/mcp.ts → rawDomain['01-registry'].sources.mcp
//
// IMPORTANT: this file MUST NOT `require()` anything from `app/` or
// `products/*/app/` paths. Those compile to ESM in `dist/`, which
// `vm.Script` can load but `require()` cannot. All ESM-compiled infra
// (postgres-storage, crawl-runs-repo, …) is built once in
// `infrastructure/db.cjs` via dynamic `import()` and forwarded here as
// part of `deps`. See M-L1-launch T-3 fix for why (raw require on
// `crawl-runs-repo.js` resolved to a non-existent .js next to .ts source
// → server crash on boot).

const NOOP_CRAWL_RUNS = Object.freeze({
  recordRun: async () => ({
    ok: false,
    error: { code: 'db_unavailable', message: 'DB not configured' },
  }),
  lastRunForSource: async () => ({ ok: true, value: null }),
});

const NOOP_AGENT_STORAGE = Object.freeze({
  upsert: async () => ({
    ok: false,
    error: { code: 'db_unavailable', message: 'DB not configured' },
  }),
});

const CRAWLER_SOURCES = [
  'native', 'erc8004', 'a2a', 'mcp', 'fetch-ai', 'virtuals',
  'paxio-curated',  // M-L1-T2
];

const wireRegistryDomain = (rawDomain, deps) => {
  // Build crawlerAdapters map from raw sources (mcp, erc8004, a2a, fetch-ai, virtuals).
  // Each source module exports a `create<Source>Adapter` factory.
  const crawlerAdapters = {};
  const src = rawDomain['01-registry']?.sources ?? {};
  for (const source of CRAWLER_SOURCES) {
    let createAdapter = null;
    if (source === 'mcp' && src.mcp) {
      createAdapter = src.mcp.createMcpSmitheryAdapter;
    } else if (source === 'erc8004' && src.erc8004) {
      createAdapter = src.erc8004.createErc8004Adapter;
    } else if (source === 'a2a' && src.a2a) {
      createAdapter = src.a2a.createA2AAdapter;
    } else if (source === 'fetch-ai' && src['fetch-ai']) {
      createAdapter = src['fetch-ai'].createFetchAiAdapter;
    } else if (source === 'virtuals' && src.virtuals) {
      createAdapter = src.virtuals.createVirtualsAdapter;
    } else if (source === 'paxio-curated' && src['paxio-curated']) {
      createAdapter = src['paxio-curated'].createPaxioCuratedAdapter;
    }
    if (createAdapter) {
      // Stubs use fetch (global), MCP uses injected httpClient.
      // MCP adapter expects HttpResponse shape {status, headers, body};
      // raw fetch().then(r=>r.json()) loses status + headers and returns
      // only the parsed body, breaking pagination + 429 retry logic →
      // adapter sees response.body=undefined and yields 0 records.
      const adapterDeps = source === 'mcp'
        ? {
            httpClient: {
              get: async (url) => {
                const r = await fetch(url);
                let body = null;
                try { body = await r.json(); } catch { body = null; }
                const headers = new Map();
                r.headers.forEach((v, k) => { headers.set(k, v); });
                return { status: r.status, headers, body };
              },
            },
          }
        : source === 'fetch-ai'
        ? {
            httpClient: {
              fetch: async ({ url, method, body, headers }) => {
                const r = await fetch(url, { method, body, headers });
                const responseHeaders = new Map();
                r.headers.forEach((v, k) => { responseHeaders.set(k, v); });
                let parsedBody = null;
                try { parsedBody = await r.json(); } catch { parsedBody = null; }
                return { status: r.status, headers: responseHeaders, body: parsedBody };
              },
            },
          }
        : source === 'paxio-curated'
        ? {
            curatedAgentsPath: require('node:path').join(
              __dirname, '..', '..', '..',
              'products', '01-registry', 'app', 'data',
              'curated-agents.json',
            ),
            fs: require('node:fs/promises'),
          }
        : {};
      crawlerAdapters[source] = createAdapter(adapterDeps);
    }
  }

  // crawlRuns repo: comes from deps (built in infrastructure/db.cjs via
  // dynamic ESM import). null when DB not configured → fall back to noop
  // so handler still serves a deterministic response.
  const crawlRuns = deps.crawlRunsRepo ?? NOOP_CRAWL_RUNS;

  // agentStorage: forwarded from deps (PostgresStorage). null when DB
  // not configured → minimal noop preserves shape for handlers.
  const agentStorage = deps.agentStorage ?? NOOP_AGENT_STORAGE;

  // clock: delegate to injected clock or fall back to Date.now().
  const clock = deps.clock ?? (() => Date.now());

  return Object.freeze({
    crawlRuns,
    crawlerAdapters: Object.freeze(crawlerAdapters),
    agentStorage,
    CRAWLER_SOURCES: Object.freeze([...CRAWLER_SOURCES]),
    clock,
  });
};

module.exports = { wireRegistryDomain };
