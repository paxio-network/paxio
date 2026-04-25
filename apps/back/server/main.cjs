'use strict';

// Paxio server entry point.
// Adapted from Olympus server/main.cjs (stripped Cesium/drone specifics).
// Loads application code from dist/app/ (compiled from app/*.ts via `npm run build`).

const fastify = require('fastify');
const pino = require('pino');
const path = require('node:path');

const { Logger } = require('./src/logger.cjs');
const { loadApplication } = require('./src/loader.cjs');
const {
  initHealth,
  initCors,
  initRequestId,
  initErrorHandler,
  initSecurityHeaders,
  registerSandboxRoutes,
} = require('./src/http.cjs');
const { initWs, createBroadcaster } = require('./src/ws.cjs');

const errors = require('./lib/errors.cjs');

const PORT = parseInt(process.env.PORT, 10) || 8000;
const HOST = process.env.HOST || '0.0.0.0';
const APPLICATION_PATH = path.join(__dirname, '..', '..', 'dist', 'products');
const DATABASE_URL = process.env.DATABASE_URL || '';

const loggerConfig = { level: process.env.LOG_LEVEL || 'info' };

if (process.env.NODE_ENV !== 'production') {
  try {
    require.resolve('pino-pretty');
    loggerConfig.transport = {
      target: 'pino-pretty',
      options: { colorize: true },
    };
  } catch {
    // pino-pretty not installed — fall back to JSON
  }
}

const pinoLogger = pino(loggerConfig);

(async () => {
  const server = fastify({ logger: loggerConfig });
  const logger = new Logger(server.log);

  const broadcaster = createBroadcaster();

  // Frozen configuration — injected into VM sandbox
  const config = {
    server: {
      port: PORT,
      host: HOST,
      env: process.env.NODE_ENV || 'development',
    },
    websocket: {
      maxClients: 500,
      heartbeatInterval: 30_000,
      staleTimeout: 60_000,
    },
  };

  // Load application code (app/lib, app/domain, app/api) into VM sandbox
  let appSandbox;
  try {
    appSandbox = await loadApplication(APPLICATION_PATH, {
      console: logger,
      config,
      errors,
      telemetry: broadcaster,
    });
  } catch (err) {
    pinoLogger.warn(
      { err: err.message },
      `Application path ${APPLICATION_PATH} not found or empty. ` +
        `Run 'npm run build' first. Server will start with no app routes.`,
    );
    appSandbox = { lib: {}, domain: {}, api: {}, config };
  }

  initSecurityHeaders(server);
  initRequestId(server);
  initCors(server);
  initErrorHandler(server);

  // Lazy pg Pool — created only when DATABASE_URL is configured. Without it the
  // /health endpoint reports checks.database='skipped' (acceptable: no DB →
  // not degraded). With it, /health probes via SELECT 1 inside Pool.query.
  let pgPool = null;
  if (DATABASE_URL) {
    try {
      // eslint-disable-next-line global-require
      const { Pool } = require('pg');
      pgPool = new Pool({ connectionString: DATABASE_URL });
      pgPool.on('error', (err) => {
        // pg emits 'error' on idle clients losing connection — log but don't
        // crash the process; next query reconnects.
        pinoLogger.warn({ err: err.message }, 'pg pool idle client error');
      });
      pinoLogger.info(`Postgres pool initialized for ${DATABASE_URL.replace(/:[^:@/]*@/, ':***@')}`);
    } catch (err) {
      pinoLogger.warn(
        { err: err.message },
        'DATABASE_URL is set but `pg` module is not installed — health probe will be skipped',
      );
    }
  }

  const healthDeps = pgPool
    ? { db: { ping: () => pgPool.query('SELECT 1') } }
    : {};

  initHealth(server, healthDeps);
  initWs(server, broadcaster);
  registerSandboxRoutes(server, appSandbox.api);

  await server.listen({ port: PORT, host: HOST });
  pinoLogger.info('Paxio Server v0.1.0');
  pinoLogger.info(`Listening on ${HOST}:${PORT}`);
  pinoLogger.info(`WebSocket: ws://${HOST}:${PORT}/ws`);

  const shutdown = async (signal) => {
    pinoLogger.info(`${signal} received, shutting down...`);
    try {
      await server.close();
      if (pgPool) {
        await pgPool.end();
        pinoLogger.info('Postgres pool closed');
      }
      pinoLogger.info('Server closed');
      process.exit(0);
    } catch (err) {
      pinoLogger.error(err, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
})().catch((err) => {
  pinoLogger.fatal(err, 'Failed to start server');
  process.exit(1);
});
