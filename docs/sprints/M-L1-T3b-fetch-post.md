# M-L1-T3b — fetch-ai adapter: GET → POST + JSON body

**Status:** RED → GREEN gate
**Owner:** registry-dev
**Branch:** `feature/M-L1-T3b-fetch-post`
**Parent:** `M-L1-expansion::T-3` (real Agentverse REST adapter)

## Why

PR #120 merged real fetch-ai adapter using `GET /v1/search/agents?offset=&limit=`. PR #124 fixed wiring so adapter actually receives a working httpClient. Production smoke 2026-05-02 22:36 UTC:

```
gh workflow run "Scheduled · Crawl MCP" -f source=fetch-ai
→ {processed:0, upserted:0, sourceErrors:0, durationMs:101, stoppedReason:'completed'}
```

**Adapter ran (durationMs:101 vs 0 before wiring fix), but produced zero agents.** Direct curl reveals real API contract:

```bash
curl -X GET "https://agentverse.ai/v1/search/agents?offset=0&limit=10"
→ HTTP 405 {"detail":"Method Not Allowed"}

curl -X POST "https://agentverse.ai/v1/search/agents" \
  -H "Content-Type: application/json" \
  -d '{"search_text":"","filters":{},"sort":"relevancy","direction":"asc","offset":0,"limit":10}'
→ HTTP 200 {"agents":[{"address":"agent1...","name":"...",...},...]}
```

Adapter's defensive `try{...} catch { return; }` swallows the 405 silently. T-3 spec used a stale/incorrect API contract. T-3b corrects.

## Готово когда

1. `products/01-registry/tests/fetch-ai-adapter.test.ts` GREEN — un-skipped block now in `describe('M-L1-T3b FetchAi fetchAgents — Agentverse REST pagination')`. All previously skipped tests must pass with the new POST+body adapter.
2. `pnpm typecheck` clean.
3. `pnpm exec vitest run` baseline GREEN (no regression).
4. Production smoke (post-merge): `gh workflow run "Scheduled · Crawl MCP" -f source=fetch-ai` returns `processed > 0` and `agents` count rises.

## Architecture Requirements

- **Pure adapter, factory pattern.** `createFetchAiAdapter({ httpClient }) → frozen { sourceName, fetchAgents, toCanonical }` — preserved.
- **No raw `fetch()` call.** All HTTP via injected `deps.httpClient.fetch({url, method, body, headers})`.
- **Body shape (architect contract, locked by tests):**
  ```json
  {
    "search_text": "",
    "filters": {},
    "sort": "relevancy",
    "direction": "asc",
    "offset": <number>,
    "limit": <number>
  }
  ```
- **Headers:** `{ 'Content-Type': 'application/json' }` (architect spec — body field can stay any of `unknown`, `object`, `Record<string, unknown>` per existing HttpClient port).
- **URL:** `https://agentverse.ai/v1/search/agents` (no query params for offset/limit — those go in body).
- **Pagination:** still offset+limit, but increments via body, not URL.
- **Termination:** unchanged — empty `agents` array → return.
- **Error handling:** preserve existing `429 → Retry-After` and `5xx → 1 retry → abort` paths.

## Tasks

| # | Task | Agent | Directory | Verification | Architecture Requirements |
|---|------|-------|-----------|-------------|--------------------------|
| T-1 | Update `createFetchAiAdapter.fetchAgents()` to send `POST` with JSON body containing `{search_text, filters, sort, direction, offset, limit}` and `Content-Type: application/json` header | registry-dev | `products/01-registry/app/domain/sources/fetch-ai.ts` | `pnpm exec vitest run products/01-registry/tests/fetch-ai-adapter.test.ts` GREEN, `pnpm typecheck` clean | Pure factory, no raw fetch, body structure as specified, retry-on-5xx + 429 paths preserved |

## Skills доступны on-demand

(none beyond agent's always-on allowlist — `paxio-backend-architecture`, `zod-validation` already cover scope)

## Slim spec for registry-dev session

```
You are registry-dev. Task: change fetch-ai adapter HTTP method GET → POST
with JSON body. Real Agentverse API requires POST + body, returns 405 on GET.

Setup:
  cd /home/nous/paxio
  git worktree add /tmp/paxio-rd-t3b -B feature/M-L1-T3b-fetch-post origin/feature/M-L1-T3b-fetch-post
  cd /tmp/paxio-rd-t3b
  git config user.name registry-dev
  git config user.email registry-dev@paxio.network
  pnpm install

Read ONLY (2 файла):
  products/01-registry/tests/fetch-ai-adapter.test.ts  (RED spec, sacred)
  products/01-registry/app/domain/sources/fetch-ai.ts  (file to modify)

Implement в `fetchAgents` async generator:
  - Replace URL ${baseUrl}/v1/search/agents?offset=${offset}&limit=${pageSize}
    with bare ${baseUrl}/v1/search/agents
  - Replace `deps.httpClient.fetch({ url, method: 'GET' })` with:
      deps.httpClient.fetch({
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          search_text: '',
          filters: {},
          sort: 'relevancy',
          direction: 'asc',
          offset,
          limit: pageSize,
        },
      })
  - Pagination logic (offset += pageSize, terminate on empty agents) unchanged.
  - 429 Retry-After + 5xx single retry — preserve.
  - Capability inference, toCanonical projection — unchanged.
  - HttpClient port already supports body+headers (see types/HttpClient at top of file).

Wiring update (apps/back/server/wiring/01-registry.cjs) — NOT in this PR.
Wiring's `httpClient.fetch` proxy already forwards method+body+headers to global fetch.
Verify by quick re-read of 01-registry.cjs fetch-ai branch (lines 86-97).

Verify (3 commands):
  pnpm typecheck
  pnpm exec vitest run products/01-registry/tests/fetch-ai-adapter.test.ts   # 9/9 GREEN
  pnpm exec vitest run                                                         # full baseline

Commit message:
  feat(M-L1-T3b): fetch-ai adapter POST + JSON body

  Real Agentverse API requires POST /v1/search/agents with JSON body
  {search_text, filters, sort, direction, offset, limit}; previous GET
  with query params returned 405. Adapter's defensive catch swallowed
  the 405 → silent processed:0 in production despite wiring fix (PR #124).

  un-skipped 8 behavior tests previously deferred per TD-34, now GREEN
  with correct contract.

Reply «готово» + worktree path + commit sha + full baseline result.
NO git push, NO gh pr — architect handles.

Skills доступны on-demand: (none beyond agent's always-on allowlist).
```
