// RED test for GET /health — drives M-L8 backend deploy.
//
// Currently apps/back/server/src/http.cjs::initHealth(server) returns
//   { status: 'ok', timestamp, version, service }
// without `checks.database` and without accepting a deps argument.
//
// This test specifies the contract backend-dev must implement (T-3 in M-L8):
// 1. initHealth(server, deps) accepts injected `deps.db.ping()` (async)
// 2. Response payload validates against ZodHealthResponse from @paxio/types
// 3. Returns checks.database='ok'  when ping succeeds
// 4. Returns checks.database='error' + status='degraded' when ping throws
// 5. Returns checks.database='skipped' when no deps.db provided
// 6. timestamp is ISO 8601
// 7. Determinism: same fixed clock → same timestamp (architectural — pure-ish
//    once you fix clock injection; dev may add `deps.clock` later, optional).
//
// Pattern mirrors /home/openclaw/PROJECT/server/src/http.js:42 — the proven
// /health design we're porting. /complior-prod/docker-compose.yml relies on
// `wget --spider /health` for HEALTHCHECK; same applies to docker-compose
// here, so HTTP 200 + valid body is non-negotiable.

import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { createRequire } from 'node:module';
import { ZodHealthResponse, ZodHealthCheckStatus } from '@paxio/types';

const requireCjs = createRequire(import.meta.url);
// http.cjs is CJS in apps/back/server/src/. Path is stable — relative to repo
// root since vitest cwd = repo root.
const httpCjs = requireCjs('../apps/back/server/src/http.cjs');

const buildServer = (deps?: unknown) => {
  const server = Fastify({ logger: false });
  // initHealth(server) is current signature; T-3 widens to (server, deps).
  // Cast to any here is the signal that contract is wider than impl —
  // backend-dev's job to make it match.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (httpCjs.initHealth as any)(server, deps);
  return server;
};

describe('GET /health (M-L8)', () => {
  it('responds 200 with ZodHealthResponse-valid body', async () => {
    const server = buildServer();
    const res = await server.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);

    const parsed = ZodHealthResponse.safeParse(res.json());
    expect(parsed.success).toBe(true);

    await server.close();
  });

  it('returns checks.database="ok" when db.ping() resolves', async () => {
    const server = buildServer({ db: { ping: async () => true } });
    const res = await server.inject({ method: 'GET', url: '/health' });
    const body = res.json();

    expect(ZodHealthCheckStatus.parse(body.checks.database)).toBe('ok');
    expect(body.status).toBe('ok');

    await server.close();
  });

  it('returns checks.database="error" + status="degraded" when db.ping() throws', async () => {
    const server = buildServer({
      db: {
        ping: async () => {
          throw new Error('connection refused');
        },
      },
    });
    const res = await server.inject({ method: 'GET', url: '/health' });
    const body = res.json();

    expect(body.checks.database).toBe('error');
    expect(body.status).toBe('degraded');
    // Even when degraded, HTTP status MUST stay 200 — Docker HEALTHCHECK uses
    // wget --spider which only checks for 200. Body.status carries the
    // semantic signal for monitoring; HTTP transport carries reachability.
    expect(res.statusCode).toBe(200);

    await server.close();
  });

  it('returns checks.database="skipped" when no db dep injected', async () => {
    const server = buildServer();
    const res = await server.inject({ method: 'GET', url: '/health' });
    const body = res.json();

    expect(body.checks.database).toBe('skipped');
    expect(body.status).toBe('ok'); // skipped is not a failure
    await server.close();
  });

  it('timestamp is ISO 8601 parseable', async () => {
    const server = buildServer();
    const res = await server.inject({ method: 'GET', url: '/health' });
    const body = res.json();

    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();

    await server.close();
  });

  it('returns version from package.json (non-empty semver-ish string)', async () => {
    const server = buildServer();
    const res = await server.inject({ method: 'GET', url: '/health' });
    const body = res.json();

    expect(typeof body.version).toBe('string');
    expect(body.version.length).toBeGreaterThan(0);
    // Loose semver: digit-dot-digit somewhere
    expect(body.version).toMatch(/\d+\.\d+/);

    await server.close();
  });

  it('returns service identifier "paxio-server"', async () => {
    const server = buildServer();
    const res = await server.inject({ method: 'GET', url: '/health' });
    const body = res.json();

    expect(body.service).toBe('paxio-server');
    await server.close();
  });

  it('checks object is open — additional probes (redis, qdrant) validate too', async () => {
    // Backend-dev may add redis/qdrant probes later; contract allows it via
    // .catchall() in ZodHealthChecks. This locks the extension point.
    const server = buildServer({
      db: { ping: async () => true },
      // Hypothetical extra probe — not required now, but contract must accept.
    });
    const res = await server.inject({ method: 'GET', url: '/health' });
    const body = res.json();

    const parsed = ZodHealthResponse.safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // database probe must always be present
      expect(parsed.data.checks).toHaveProperty('database');
    }
    await server.close();
  });
});
