// POST /api/admin/crawl?source=<source> — trigger crawler + persist crawl_runs row.
//
// Auth: Bearer ADMIN_TOKEN (config.admin.token)
// Validation: source must be in domain['01-registry'].CRAWLER_SOURCES
// Rate-limit: 429 if last run for same source < 5 min ago
// Body (optional): { triggeredBy: 'cron' | 'manual' | 'startup' }

({
  httpMethod: 'POST',
  path: '/api/admin/crawl',
  method: async ({ query, headers, body }) => {
    // 1. Auth
    const auth =
      headers && typeof headers.authorization === 'string'
        ? headers.authorization
        : '';
    const expected = 'Bearer ' + config.admin.token;
    if (!config.admin.token || auth !== expected) {
      throw new errors.AuthError('admin token required');
    }

    // 2. Validate source
    const source =
      query && typeof query.source === 'string' ? query.source.trim() : '';
    if (!source || !domain['01-registry'].CRAWLER_SOURCES.includes(source)) {
      throw new errors.ValidationError(
        'source parameter required and must be one of: ' +
          domain['01-registry'].CRAWLER_SOURCES.join(', '),
      );
    }

    // 3. Rate-limit: last run for same source must be >= 5 min ago
    const last = await domain['01-registry'].crawlRuns.lastRunForSource(source);
    if (last.ok && last.value) {
      const ageMs =
        domain['01-registry'].clock() -
        new Date(last.value.startedAt).getTime();
      if (ageMs < 5 * 60 * 1000) {
        return {
          _statusCode: 429,
          data: {
            error: 'rate_limited',
            retry_after_ms: 5 * 60 * 1000 - ageMs,
          },
        };
      }
    }

    // 4. Pick adapter
    const srcAdapter = domain['01-registry'].crawlerAdapters[source];
    if (!srcAdapter) {
      throw new errors.InternalError('no adapter for source: ' + source);
    }

    // 5. Determine triggeredBy from body (default: manual)
    const triggeredBy =
      body &&
      typeof body === 'object' &&
      typeof body.triggeredBy === 'string' &&
      body.triggeredBy === 'cron'
        ? 'cron'
        : 'manual';

    // 6. Run + record
    const reg = domain['01-registry'];
    if (!reg.agentStorage) {
      throw new errors.InternalError('agent storage not available');
    }
    const clk = reg.clock;
    const startedAt = new Date(clk()).toISOString();
    const startTs = clk();
    const summary = await reg.crawler.runCrawler({
      adapter: srcAdapter,
      storage: reg.agentStorage,
      maxRecords: 50000,
      // M-L1-T3i: wrap sandbox console (Pino: ctx-first) to match
      // CrawlerLogger contract (msg-first, ctx-second).
      logger: {
        info: (msg, ctx) => console.info(ctx ?? {}, msg),
        warn: (msg, ctx) => console.warn(ctx ?? {}, msg),
      },
    });
    const finishedAt = new Date(clk()).toISOString();
    const durationMs = clk() - startTs;

    await reg.crawlRuns.recordRun({
      source,
      startedAt,
      finishedAt,
      durationMs,
      triggeredBy,
      summary,
    });

    return { data: { summary, durationMs } };
  },
});
