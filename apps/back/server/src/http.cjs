'use strict';

// HTTP primitives: CORS, security headers, request ID, error handler,
// sandbox route registration.
// Adapted from Olympus server/src/http.cjs (removed Cesium/drone specifics).

const crypto = require('node:crypto');
const { AppError } = require('../lib/errors.cjs');

// Read package.json once at module load — used as `version` field in /health.
// Pattern mirrors /home/openclaw/PROJECT/server/src/http.js:4 (`const pkg =
// require('../../package.json')`). If the file is unreadable in some exotic
// runtime, fall back to a non-empty placeholder so ZodHealthResponse.version
// (z.string().min(1)) stays valid.
let PKG_VERSION = '0.1.0';
try {
  // ../../package.json relative to this file is repo root package.json.
  // eslint-disable-next-line global-require
  PKG_VERSION = require('../../../../package.json').version || '0.1.0';
} catch {
  // keep fallback
}

// Probe a single dependency. Returns one of:
//   'ok'      — dependency reachable
//   'error'   — dependency configured but unreachable / threw
//   'skipped' — dependency not configured for this deployment
// Failure is intentionally swallowed into a status string (NOT thrown) — health
// endpoint must never 500 on a downed subsystem; degradation goes into
// body.status. We log via console.error so operators see the underlying cause.
const probeDb = async (db) => {
  if (!db || typeof db.ping !== 'function') {
    return 'skipped';
  }
  try {
    await db.ping();
    return 'ok';
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[health] db.ping failed:', err && err.message ? err.message : err);
    return 'error';
  }
};

// initHealth(server, deps) — exposes GET /health.
//
// `deps` is an optional object of injected probes:
//   - deps.db.ping(): Promise<unknown> — Postgres reachability check
//   - (future) deps.redis.ping, deps.qdrant.ping etc. — see ZodHealthChecks
//     `.catchall(ZodHealthCheckStatus)` extension point.
//
// Body shape conforms to ZodHealthResponse (packages/types/src/health.ts).
// HTTP status is ALWAYS 200, even when body.status='degraded' — Docker
// HEALTHCHECK uses `wget --spider` which only checks for 200; semantic state
// goes into body.status for Prometheus / k8s probes.
const initHealth = (server, deps = {}) => {
  server.get('/health', async () => {
    const checks = {
      database: await probeDb(deps && deps.db),
    };
    const anyError = Object.values(checks).some((v) => v === 'error');
    return {
      status: anyError ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      version: PKG_VERSION,
      service: 'paxio-server',
      checks,
    };
  });
};

const initCors = (server) => {
  const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    'http://localhost:3000,http://localhost:3001,https://paxio.network,https://app.paxio.network,https://docs.paxio.network'
  )
    .split(',')
    .map((o) => o.trim());

  server.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      );
      reply.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Request-Id, X-Paxio-Api-Key, X-Idempotency-Key',
      );
      reply.header('Access-Control-Allow-Credentials', 'true');
    }
    if (request.method === 'OPTIONS') {
      reply.status(204).send();
      return;
    }
    done();
  });
};

const initSecurityHeaders = (server) => {
  server.addHook('onRequest', (request, reply, done) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
      reply.header(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload',
      );
    }
    done();
  });
};

const initRequestId = (server) => {
  server.addHook('onRequest', (request, reply, done) => {
    const requestId = request.headers['x-request-id'] || crypto.randomUUID();
    request.requestId = requestId;
    reply.header('X-Request-Id', requestId);
    done();
  });
};

const initErrorHandler = (server) => {
  server.setErrorHandler((error, request, reply) => {
    const requestId = request.requestId || 'unknown';

    if (error instanceof AppError) {
      request.log.warn({ err: error, requestId }, error.message);
      return reply.status(error.statusCode).send(error.toJSON());
    }

    if (error.validation) {
      request.log.warn({ err: error, requestId }, 'Validation error');
      return reply.status(400).send({
        error: {
          code: 'validation_error',
          message: 'Invalid request',
          details: error.validation,
        },
      });
    }

    request.log.error({ err: error, requestId }, 'Unhandled error');
    return reply.status(500).send({
      error: {
        code: 'internal_error',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Internal server error',
      },
    });
  });
};

// Walk api tree (nested by FA) collecting all handler definitions
const walkApiTree = (node, handlers = []) => {
  if (node && typeof node === 'object' && node.httpMethod && node.method) {
    handlers.push(node);
    return handlers;
  }
  if (node && typeof node === 'object') {
    for (const val of Object.values(node)) {
      if (val && typeof val === 'object') {
        if (Array.isArray(val)) {
          for (const item of val) walkApiTree(item, handlers);
        } else {
          walkApiTree(val, handlers);
        }
      }
    }
  }
  return handlers;
};

const registerSandboxRoutes = (server, api) => {
  const handlers = walkApiTree(api);
  for (const def of handlers) {
    const httpMethod = def.httpMethod.toLowerCase();
    server[httpMethod](def.path, async (request, reply) => {
      const result = await def.method({
        body: request.body,
        query: request.query,
        headers: request.headers,
        params: request.params,
        requestId: request.requestId,
      });

      const statusCode = result?._statusCode || 200;

      if (result?._headers) {
        for (const [key, value] of Object.entries(result._headers)) {
          reply.header(key, value);
        }
      }

      if (result && result._statusCode !== undefined) {
        const rest = { ...result };
        delete rest._statusCode;
        delete rest._headers;
        return reply.code(statusCode).send(rest);
      }
      return reply.code(statusCode).send(result);
    });
  }
};

module.exports = {
  initHealth,
  initCors,
  initSecurityHeaders,
  initRequestId,
  initErrorHandler,
  registerSandboxRoutes,
  walkApiTree,
};
