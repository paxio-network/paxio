// Health contract — surfaced at GET /health on apps/back/server.
//
// Contract mirrors the proven `/PROJECT/server/src/http.js::initHealth` pattern:
// - top-level `status` is binary (ok | degraded) — Docker HEALTHCHECK only cares
//   about HTTP 200, but downstream Prometheus/k8s probes branch on body.status
// - `checks` is an open record so we can append redis, qdrant, etc. without
//   schema migration. Each check is one of: 'ok' | 'error' | 'skipped'.
//   ('skipped' = dependency not configured in this deployment, not an error.)
// - `timestamp` is ISO 8601 (server clock — used to detect stale containers)
// - `version` is the running build's semver (read from package.json at boot)
//
// Keep schema permissive on extra check keys (.passthrough) so backend-dev can
// add new dependency probes (T-3+) without touching @paxio/types contract.

import { z } from 'zod';

export const ZodHealthCheckStatus = z.enum(['ok', 'error', 'skipped']);
export type HealthCheckStatus = z.infer<typeof ZodHealthCheckStatus>;

export const ZodHealthChecks = z
  .object({
    database: ZodHealthCheckStatus,
  })
  .catchall(ZodHealthCheckStatus); // allow redis, qdrant, gotenberg, etc.

export type HealthChecks = z.infer<typeof ZodHealthChecks>;

export const ZodHealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.string().datetime(),
  version: z.string().min(1),
  service: z.string().min(1),
  checks: ZodHealthChecks,
});

export type HealthResponse = z.infer<typeof ZodHealthResponse>;
