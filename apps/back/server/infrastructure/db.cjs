'use strict';

// createDbClient — lazy DB init for agentStorage.
// Falls back to no-op when DATABASE_URL is absent.
// Uses dynamic import() to bridge CJS server/ → ESM-compiled postgres-storage.js.

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
      shutdown: async () => {},
    });
  }

  // Dynamic import bridges CJS caller → ESM-compiled postgres-storage.js.
  // WebpackIgnore suppresses bundler from resolving the path statically.
  const { createPostgresStorage } = await import(
    /* webpackIgnore: true */
    '../../../../dist/products/01-registry/app/infra/postgres-storage.js'
  );

  const pool = new (require('pg').Pool)({ connectionString: databaseUrl });
  pool.on('error', (err) => {
    console.warn({ err: err.message }, 'pg pool idle client error');
  });

  const agentStorage = await createPostgresStorage({ pool, runMigrations });

  return Object.freeze({
    _isNoop: false,
    pool,
    agentStorage: Object.freeze(agentStorage),
    shutdown: async () => { await pool.end(); },
  });
};

module.exports = { createDbClient };
