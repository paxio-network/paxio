'use strict';

// HTTP primitives: CORS, security headers, request ID, error handler,
// sandbox route registration.
// Adapted from Olympus server/src/http.cjs (removed Cesium/drone specifics).

const crypto = require('node:crypto');
const { AppError } = require('../lib/errors.cjs');

const initHealth = (server) => {
  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    service: 'paxio-server',
  }));
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
