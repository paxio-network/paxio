'use strict';

// Wiring for FA-01 (Registry) crawler domain.
//
// Combines:
//   - crawlRuns: pg-backed CrawlRunsRepo (recordRun, lastRunForSource)
//   - crawlerAdapters: { mcp: McpSmitheryAdapter, erc8004: ..., a2a: ..., ... }
//   - runCrawler: from domain.crawler (single-source orchestrator)
//   - agentStorage: from deps (PostgresStorage agentStorage from db.cjs)
//
// Handler (admin-crawl.js) needs: domain.crawlRuns.*, domain.crawler.runCrawler,
// domain.crawlerAdapters[source], domain.agentStorage, config.admin.token,
// CRAWLER_SOURCES, clock.
//
// The loader nests domain modules by file stem:
//   products/01-registry/app/domain/crawler.ts     → rawDomain.crawler
//   products/01-registry/app/domain/sources/mcp.ts → rawDomain.sources.mcp
//   (the per-product domain tree lives in rawDomain['01-registry']).

const { createCrawlRunsRepo } = require('../../../products/01-registry/app/infra/crawl-runs-repo.js');

const CRAWLER_SOURCES = ['native', 'erc8004', 'a2a', 'mcp', 'fetch-ai', 'virtuals'];

const wireRegistryDomain = (rawDomain, deps) => {
  const pgPool = deps.pgPool; // set by main.cjs when DB is configured
  const agentStorage = deps.agentStorage; // null when DB not configured

  // Build crawlerAdapters map from raw sources (mcp, erc8004, a2a, fetch-ai, virtuals)
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
    }
    if (createAdapter) {
      // Stubs use fetch (global), MCP uses injected httpClient.
      // Pass a minimal dep object; real adapters extend as needed.
      const adapterDeps = source === 'mcp'
        ? { httpClient: { get: (url) => fetch(url).then(r => r.json()) } }
        : {};
      crawlerAdapters[source] = createAdapter(adapterDeps);
    }
  }

  // crawlRuns repo — null when DB not configured (handler falls back gracefully)
  const crawlRuns = pgPool
    ? createCrawlRunsRepo({ pool: pgPool })
    : Object.freeze({
        recordRun: async () => ({ ok: false, error: { code: 'db_unavailable', message: 'DB not configured' } }),
        lastRunForSource: async () => ({ ok: true, value: null }),
      });

  // clock: delegate to injected clock or fall back to Date.now()
  const clock = deps.clock ?? (() => Date.now());

  return Object.freeze({
    crawlRuns,
    crawlerAdapters: Object.freeze(crawlerAdapters),
    agentStorage: Object.freeze(agentStorage ?? { upsert: async () => ({ ok: false, error: { code: 'db_unavailable', message: 'DB not configured' } }) }),
    CRAWLER_SOURCES: Object.freeze([...CRAWLER_SOURCES]),
    clock,
  });
};

module.exports = { wireRegistryDomain };