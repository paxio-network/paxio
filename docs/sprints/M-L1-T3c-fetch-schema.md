# M-L1-T3c — fetch-ai schema rewrite (real Agentverse API)

**Status:** RED → GREEN gate
**Owner:** registry-dev
**Branch:** `feature/M-L1-T3c-fetch-schema`
**Parent:** `M-L1-expansion::T-3` (real Agentverse REST adapter)

## Why

PR #120 (T-3) authored `ZodFetchAiAgent` against IMAGINED API. PR #124 (T-3-wiring) injected httpClient. PR #125 (T-3b) fixed HTTP method to POST + body. Production smoke 2026-05-03 11:16 UTC: adapter ran (`durationMs:109`) but `processed:0` AGAIN — Zod validation fails on every real record because schema doesn't match real API shape.

Live curl 2026-05-03 verified real response shape:

```json
{
  "address": "agent1q000e4kxnlv0rwcms3al3vfpaa2fy83x6jtrz79ghfq9d87n79cpwaj8695",
  "prefix": "test-agent",
  "name": "HF: silviasapora/ge",
  "description": "",
  "readme": "",
  "protocols": [],
  "rating": 0.0,
  "status": "inactive",
  "category": "community",
  "system_wide_tags": [],
  "last_updated": "2025-07-02T09:19:17Z",
  "created_at": "2025-07-02T09:19:17Z",
  "owner": "34ee31a80edb390dd0ccc1c12a17918cff09073b6d047932",
  ...
}
```

Mismatches:

| Field | Real API | Old Zod schema |
|---|---|---|
| `address` prefix | `agent1...` | `fetch1...` (regex rejects all real records) |
| Registration time | `created_at: ISO string` | `registeredAt: number (Unix ms)` — different name + type |
| Tags field | `system_wide_tags` | `tags` |
| Online flag | `status: "active"\|"inactive"` (string) | `isOnline: boolean` |
| Reputation | `rating: 0.0` (0..5 scale) | `reputationScore: 0..100` |
| `profileUrl` | NOT in response | required field |

Total ~10K agents in API (verified offset cap = 9999, 2026-05-03).

## Готово когда

1. `products/01-registry/tests/fetch-ai-adapter.test.ts` GREEN — 14/14 tests pass:
   - 1 factory + 7 pagination/error-handling + 5 toCanonical projection + 1 misc
   - Includes new T-3c projection tests: AgentCard from raw, name fallback chain, description truncation, parse_error on bad address regex
2. `pnpm typecheck` clean.
3. `pnpm exec vitest run` baseline GREEN (no regression).
4. Production smoke (post-merge): `gh workflow run "Scheduled · Crawl MCP" -f source=fetch-ai` returns `processed > 0` and agent count rises by ~10K.

## Architecture Requirements

- **Schema mirrors raw API.** `ZodFetchAiAgent` matches real Agentverse response: snake_case fields, ISO string timestamps, agent1-prefix address regex (`/^agent1[a-z0-9]{38,58}$/`), `.passthrough()` for forward-compat.
- **Adapter projection in `toCanonical`.** All canonical AgentCard fields derived from raw via the new helpers exported from `@paxio/types`:
  - `fetchAiProfileUrl(address)` → `https://agentverse.ai/agents/details/${address}`
  - `fetchAiRatingToReputation(rating)` → `0..100 | null` (rating × 20, null if rating === 0)
  - `fetchAiStatusToOnline(status)` → boolean (only "active" → true)
  - `fetchAiDisplayName(raw)` → name || prefix || `agent ${address[6:14]}`
- **`createdAt` ISO string preserved.** AgentCard.createdAt is ISO string already; just copy `raw.created_at`. No Unix ms conversion needed.
- **`inferCapability` updated** to use new field names: `raw.name + raw.category + raw.description + raw.system_wide_tags.join(' ') + raw.protocols.join(' ')`.
- **DID format unchanged:** `did:paxio:fetch-ai:${address}`.
- **Source enum value unchanged:** `'fetch-ai'` (for backward compat with M-L1-expansion source taxonomy; canonical alias is `fetch` per agent-source.ts).

## Tasks

| # | Task | Agent | Directory | Verification | Architecture Requirements |
|---|------|-------|-----------|-------------|--------------------------|
| T-1 | Update `inferCapability` to read raw fields (`system_wide_tags`, `protocols` instead of removed `tags`/`endpoint`) | registry-dev | `products/01-registry/app/domain/sources/fetch-ai.ts` | `pnpm typecheck` clean | Pure function, no I/O |
| T-2 | Rewrite `toCanonical` projection — use new helpers from `@paxio/types`, project ISO `created_at`, derive sourceUrl from address | registry-dev | same file | 14/14 fetch-ai-adapter tests GREEN | Result<AgentCard,_> contract preserved, no class |

## Skills доступны on-demand

(none beyond agent's always-on allowlist — `paxio-backend-architecture` + `zod-validation` cover scope)

## Slim spec for registry-dev session

```
You are registry-dev. Task: update fetch-ai adapter to project new raw schema
shape (real Agentverse API) → canonical AgentCard. Schema rewrite landed
in @paxio/types; adapter must adapt.

Setup:
  cd /home/nous/paxio
  git worktree add /tmp/paxio-rd-t3c -B feature/M-L1-T3c-fetch-schema origin/feature/M-L1-T3c-fetch-schema
  cd /tmp/paxio-rd-t3c
  git config user.name registry-dev
  git config user.email registry-dev@paxio.network
  pnpm install

Read ONLY (3 файла):
  products/01-registry/tests/fetch-ai-adapter.test.ts        (RED spec — 14 tests, sacred)
  packages/types/src/sources/fetch-ai.ts                     (new schema + 4 projection helpers)
  products/01-registry/app/domain/sources/fetch-ai.ts        (file to modify)

Implement (2 functions to update):

1. inferCapability(raw: FetchAiAgent) — uses raw fields:
   const haystack = [
     raw.name,
     raw.category ?? '',
     raw.description ?? '',
     (raw.system_wide_tags ?? []).join(' '),
     (raw.protocols ?? []).join(' '),
   ].join(' ').toLowerCase();
   // Keep existing CAPABILITY_KEYWORDS rules + INTELLIGENCE default.

2. toCanonical(raw: FetchAiAgent) — projects raw → canonical AgentCard:
   import {
     fetchAiProfileUrl,
     fetchAiRatingToReputation,    // (currently unused in card; reserve for future reputation field)
     fetchAiStatusToOnline,        // (currently unused in card; reserve for future)
     fetchAiDisplayName,
   } from '@paxio/types';

   const card: AgentCard = {
     did: buildDid(parsed.data.address),       // unchanged: did:paxio:fetch-ai:<address>
     name: fetchAiDisplayName(parsed.data),    // fallback chain
     ...(parsed.data.description.length > 0
       ? { description: parsed.data.description.slice(0, 1000) }
       : {}),
     capability: inferCapability(parsed.data),
     version: '0.0.1',
     createdAt: parsed.data.created_at,        // ISO string preserved
     source: sourceName,                        // 'fetch-ai'
     externalId: parsed.data.address,
     sourceUrl: fetchAiProfileUrl(parsed.data.address),  // constructed
   };

3. Pagination logic in fetchAgents() — UNCHANGED. Still parses each raw with
   ZodFetchAiAgent.safeParse, yields parsed.data. Schema's `.passthrough()`
   tolerates unknown fields.

DO NOT modify:
   - tests/* (architect-owned spec)
   - packages/types/* (architect-owned schema)
   - apps/back/server/wiring/* (backend-dev zone, already correct)

Verify (3 commands):
  pnpm typecheck
  pnpm exec vitest run products/01-registry/tests/fetch-ai-adapter.test.ts   # 14/14 GREEN
  pnpm exec vitest run                                                         # full baseline

Commit message:
  feat(M-L1-T3c): adapter projection — raw Agentverse → canonical AgentCard

  Schema rewrite landed in @paxio/types (architect commit on this branch)
  changed ZodFetchAiAgent to mirror real Agentverse response shape.
  Adapter updated to project new raw fields:
    - system_wide_tags / protocols → capability inference
    - created_at ISO string → card.createdAt (no conversion)
    - fetchAiProfileUrl(address) → card.sourceUrl
    - fetchAiDisplayName(raw) → card.name with fallback chain

  14/14 fetch-ai-adapter tests GREEN.

Reply «готово» + worktree path + commit sha + full baseline result.
NO git push, NO gh pr — architect handles publication.

Skills доступны on-demand: (none beyond registry-dev's always-on allowlist).
```
