'use strict';

// createDbClient — lazy DB init for agentStorage + crawlRunsRepo.
// Falls back to no-op when DATABASE_URL is absent.
// Uses dynamic import() to bridge CJS server/ → ESM-compiled infra modules
// (postgres-storage.js, crawl-runs-repo.js). This is the canonical pattern
// for crossing the ESM/CJS boundary without raw `require()` on `app/` paths
// — see TD-27 / M-L8.4 (postgres-storage) for the original incarnation;
// crawlRunsRepo extends the same pattern (M-L1-launch T-3 fix).

const NOOP_POOL = Object.freeze({
  query: async () => ({ rows: [], fields: [] }),
  end: async () => {},
  on: () => {},
});

const NOOP_STORAGE = Object.freeze({
  upsert: async () => ({ ok: false, error: { code: 'db_unavailable', message: 'DB not configured' } }),
  resolve: async () => ({ ok: false, error: { code: 'db_unavailable', message: 'DB not configured' } }),
  find: async () => ({ ok: false, error: { code: 'db_unavailable', message: 'DB not configured' } }),
  count: async () => ({ ok: false, error: { code: 'db_unavailable', message: 'DB not configured' } }),
  countBySource: async () => ({ ok: false, error: { code: 'db_unavailable', message: 'DB not configured' } }),
  listRecent: async () => ({ ok: false, error: { code: 'db_unavailable', message: 'DB not configured' } }),
});

const createDbClient = async (opts = {}) => {
  const { databaseUrl = '', runMigrations = false } = opts;

  if (!databaseUrl) {
    return Object.freeze({
      _isNoop: true,
      pool: NOOP_POOL,
      agentStorage: NOOP_STORAGE,
      crawlRunsRepo: null,
      shutdown: async () => {},
    });
  }

  // Dynamic imports bridge CJS caller → ESM-compiled infra modules.
  // WebpackIgnore suppresses bundler from resolving the path statically.
  const { createPostgresStorage } = await import(
    /* webpackIgnore: true */
    '../../../../dist/products/01-registry/app/infra/postgres-storage.js'
  );
  const { createCrawlRunsRepo } = await import(
    /* webpackIgnore: true */
    '../../../../dist/products/01-registry/app/infra/crawl-runs-repo.js'
  );

  const pool = new (require('pg').Pool)({ connectionString: databaseUrl });
  pool.on('error', (err) => {
    console.warn({ err: err.message }, 'pg pool idle client error');
  });

  const agentStorage = await createPostgresStorage({ pool, runMigrations });
  const crawlRunsRepo = createCrawlRunsRepo({ pool });

  return Object.freeze({
    _isNoop: false,
    pool,
    agentStorage: Object.freeze(agentStorage),
    crawlRunsRepo: Object.freeze(crawlRunsRepo),
    shutdown: async () => { await pool.end(); },
  });
};

module.exports = { createDbClient };
