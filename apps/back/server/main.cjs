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

  initHealth(server);
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
