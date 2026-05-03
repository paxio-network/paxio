# M-L1-T3d — wiring httpClient.fetch must JSON.stringify object body

**Status:** RED → GREEN gate
**Owner:** backend-dev
**Branch:** `feature/M-L1-T3d-body-stringify`

## Why

Production bug 2026-05-03 16:39 UTC after PR #126 (T-3c schema rewrite) merged:

```
gh workflow run "Scheduled · Crawl MCP" -f source=fetch-ai
→ {processed:0, upserted:0, durationMs:90, stoppedReason:'completed'}
```

Adapter passes body as JS object `{search_text:'', filters:{}, sort, direction, offset, limit}` to httpClient. Wiring's httpClient wrapper for fetch-ai:

```js
fetch: async ({ url, method, body, headers }) => {
  const r = await fetch(url, { method, body, headers });  // ← body is JS object
  ...
}
```

Node's native `fetch` coerces non-string body via `String(body)` → `"[object Object]"`. Agentverse rejects this with 400 (or returns empty agents because JSON parser fails). Adapter's defensive try/catch swallows the result silently → `processed:0`.

This is the 4th iteration on fetch-ai (#120 adapter, #124 wiring inject, #125 POST method, #126 schema rewrite). Each fixed one layer of the pipeline; this is the final wire-format layer.

## Готово когда

1. `tests/wiring-rest-adapter-httpclient.test.ts` GREEN — 5/5 tests:
   - 4 existing (factory, fetch shape, mcp regression, paxio-curated regression)
   - 1 new T-3d: `fetch-ai httpClient.fetch JSON.stringifies object body before native fetch`
2. `pnpm typecheck` clean.
3. `pnpm exec vitest run` baseline GREEN.
4. Production smoke (post-merge): `gh workflow run "Scheduled · Crawl MCP" -f source=fetch-ai` returns `processed > 0` with ~10K agents.

## Architecture Requirements

- 1-line change in `apps/back/server/wiring/01-registry.cjs` fetch-ai branch.
- Serialize body **only when it's a non-string non-undefined object** — leave string/Buffer bodies as-is.
- Pure CJS, no class, frozen output preserved.

## Tasks

| # | Task | Agent | Directory | Verification | Architecture Requirements |
|---|------|-------|-----------|-------------|--------------------------|
| T-1 | Wrap body with `JSON.stringify` in fetch-ai httpClient when body is object | backend-dev | `apps/back/server/wiring/01-registry.cjs` | 5/5 wiring tests GREEN, baseline 1442+ GREEN, typecheck clean | Pure CJS, no class, conditional serialization |

## Slim spec for backend-dev session

```
You are backend-dev. Task: fix wire-format bug — wiring's httpClient.fetch
for fetch-ai must JSON.stringify object body before native fetch call.

Setup:
  cd /home/nous/paxio
  git worktree add /tmp/paxio-bd-t3d -B feature/M-L1-T3d-body-stringify origin/feature/M-L1-T3d-body-stringify
  cd /tmp/paxio-bd-t3d
  git config user.name backend-dev
  git config user.email backend-dev@paxio.network
  pnpm install

Read ONLY (2 файла):
  tests/wiring-rest-adapter-httpclient.test.ts   (RED spec, 5 tests, sacred)
  apps/back/server/wiring/01-registry.cjs        (file to modify)

Implement в fetch-ai branch (~lines 86-97):
  - Find the line: `const r = await fetch(url, { method, body, headers });`
  - Replace with conditional JSON.stringify:
      const serializedBody =
        body !== undefined && body !== null && typeof body === 'object'
          ? JSON.stringify(body)
          : body;
      const r = await fetch(url, { method, body: serializedBody, headers });
  - Keep everything else unchanged (header conversion, JSON parse, return shape).

DO NOT touch:
  - tests/* (architect-owned)
  - other wiring branches (mcp/paxio-curated unchanged)

Verify (3 commands):
  pnpm typecheck
  pnpm exec vitest run tests/wiring-rest-adapter-httpclient.test.ts   # 5/5 GREEN
  pnpm exec vitest run                                                  # full baseline

Commit message:
  fix(M-L1-T3d): JSON.stringify object body before native fetch call

  Production bug after PR #126: adapter passes object body to wiring's
  httpClient.fetch; wrapper passed it as-is to native fetch; Node coerces
  object via String() → "[object Object]" → Agentverse rejects → adapter
  silent processed:0.

  Fix: serialize body to JSON string when it's an object before native fetch.
  String/Buffer bodies pass through unchanged.

  5/5 wiring tests GREEN.

Push:
  git push origin feature/M-L1-T3d-body-stringify

Reply «готово» + worktree path + commit sha + remote head + verification.

Skills доступны on-demand: (none beyond backend-dev's always-on allowlist —
paxio-backend-architecture covers wiring + DI patterns).
```
