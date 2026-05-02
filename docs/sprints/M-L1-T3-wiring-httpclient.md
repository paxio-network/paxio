# M-L1-T3-wiring — Inject httpClient into fetch-ai (and future REST) adapters

**Status:** RED → GREEN gate
**Owner:** backend-dev
**Branch:** `feature/M-L1-T3-wiring-httpclient`
**Parent:** `M-L1-expansion::T-3` (fetch.ai real adapter, PR #120 merged)

## Why

PR #120 merged real fetch-ai REST adapter into `products/01-registry/app/domain/sources/fetch-ai.ts`. Adapter expects `httpClient.fetch({url, method, body?, headers?})` injected. Wiring (`apps/back/server/wiring/01-registry.cjs`) was NOT updated — fetch-ai falls into `else: {}` branch, gets empty deps, `deps.httpClient` is `undefined`, adapter's `try{deps.httpClient.fetch(...)} catch { return; }` silently yields zero agents.

Production manifest:
- 2026-05-02 20:56 UTC: triggered scheduled-crawl source=fetch-ai
- API responded `processed:0, upserted:0, sourceErrors:0, stoppedReason:'completed'` — silent failure
- Agent count remained 3266 (paxio-curated baseline only)

This milestone fixes wiring + locks the contract via RED tests so future REST adapters can't regress.

## Готово когда

1. `tests/wiring-rest-adapter-httpclient.test.ts` GREEN — 4/4 tests pass:
   - `injects httpClient with fetch({url,method}) shape into fetch-ai adapter`
   - `fetch-ai httpClient.fetch returns HttpResponse shape {status,headers,body}`
   - `paxio-curated still receives curatedAgentsPath + fs (regression guard)`
   - `mcp still receives httpClient.get(url) (regression guard)`
2. `pnpm typecheck` clean.
3. `pnpm exec vitest run` baseline GREEN (no regression).
4. Production smoke: after deploy, `gh workflow run "Scheduled · Crawl MCP" -f source=fetch-ai` returns `processed > 0` (architect verifies post-merge).

## Architecture Requirements

Wiring file format `'use strict'` CJS — no class. Functional style:
- Pure factory function `wireRegistryDomain(rawDomain, deps) → frozen object`
- `httpClient` for fetch-ai must be a fresh inline object literal (not shared mutable singleton across sources) so MCP's `get(url)` and fetch-ai's `fetch({url,method})` shapes don't collide.
- Reuse the same `fetch → HttpResponse` projection logic as MCP (status + headers Map + body).
- DRY: extract a shared helper `createFetchHttpClient(shape: 'get' | 'fetch')` if the LOC count starts repeating.
- Frozen output: `Object.freeze(crawlerAdapters)` already in place — preserve.
- No `Math.random()`, no `Date.now()` outside injected `clock`.

## Tasks

| # | Task | Agent | Directory | Verification | Architecture Requirements |
|---|------|-------|-----------|-------------|--------------------------|
| T-1 | Add fetch-ai branch in `apps/back/server/wiring/01-registry.cjs` that injects `{ httpClient: { fetch(req): HttpResponse } }` proxying global `fetch`. Optional: factor MCP+fetch-ai httpClient into shared helper if duplication > 10 LOC. | backend-dev | `apps/back/server/wiring/01-registry.cjs` | `pnpm exec vitest run tests/wiring-rest-adapter-httpclient.test.ts` GREEN, `pnpm typecheck` clean | Pure CJS, frozen result, no class. Each adapter gets its own httpClient literal (shape varies per source). |

## Skills доступны on-demand (only if NOT in backend-dev's always-on allowlist)

(none — `paxio-backend-architecture` always-on covers this scope: wiring, VM sandbox, frozen objects, DI patterns)

## Slim spec for backend-dev session

```
You are backend-dev. Task: wire httpClient with fetch({url,method,...})
shape into fetch-ai adapter in apps/back/server/wiring/01-registry.cjs.

Setup:
  cd /home/nous/paxio
  git worktree add /tmp/paxio-bd-wiring -B feature/M-L1-T3-wiring-httpclient origin/feature/M-L1-T3-wiring-httpclient
  cd /tmp/paxio-bd-wiring
  git config user.name backend-dev
  git config user.email backend-dev@paxio.network
  pnpm install

Read ONLY:
  tests/wiring-rest-adapter-httpclient.test.ts  (the RED spec, sacred)
  apps/back/server/wiring/01-registry.cjs       (file to modify)

Implement:
  - Add `fetch-ai` branch in adapterDeps ternary (after MCP, before
    paxio-curated) that injects:
        { httpClient: {
            fetch: async ({url, method, body, headers}) => {
              const r = await fetch(url, { method, body, headers });
              const responseHeaders = new Map();
              r.headers.forEach((v, k) => { responseHeaders.set(k, v); });
              let parsedBody = null;
              try { parsedBody = await r.json(); } catch { parsedBody = null; }
              return { status: r.status, headers: responseHeaders, body: parsedBody };
            },
          } }
  - Keep MCP's existing `httpClient.get(url)` shape unchanged (regression guard).
  - Keep paxio-curated's `curatedAgentsPath + fs` injection unchanged.
  - DRY only if duplication exceeds ~10 LOC; otherwise inline is fine.

Verify (3 commands):
  pnpm typecheck
  pnpm exec vitest run tests/wiring-rest-adapter-httpclient.test.ts
  pnpm exec vitest run                # full baseline

Commit message: feat(M-L1-T3-wiring): inject httpClient.fetch for fetch-ai adapter

Skills доступны on-demand (none beyond agent's always-on allowlist).
```
