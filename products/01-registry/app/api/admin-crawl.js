// POST /api/admin/crawl?source=<source> — trigger crawler + persist crawl_runs row.
//
// Auth: Bearer ADMIN_TOKEN (config.admin.token)
// Validation: source must be in CRAWLER_SOURCES
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
    if (!source || !CRAWLER_SOURCES.includes(source)) {
      throw new errors.ValidationError(
        'source parameter required and must be one of: ' +
          CRAWLER_SOURCES.join(', '),
      );
    }

    // 3. Rate-limit: last run for same source must be >= 5 min ago
    const last = await domain.crawlRuns.lastRunForSource(source);
    if (last.ok && last.value) {
      const ageMs =
        clock() -
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
    const srcAdapter = domain.crawlerAdapters[source];
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
    if (!domain.agentStorage) {
      throw new errors.InternalError('agent storage not available');
    }
    const startedAt = new Date(clock()).toISOString();
    const startTs = clock();
    const summary = await domain.crawler.runCrawler({
      adapter: srcAdapter,
      storage: domain.agentStorage,
      maxRecords: 5000,
    });
    const finishedAt = new Date(clock()).toISOString();
    const durationMs = clock() - startTs;

    await domain.crawlRuns.recordRun({
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
