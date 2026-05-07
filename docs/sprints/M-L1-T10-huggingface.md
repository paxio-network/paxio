# M-L1-T10 — HuggingFace adapter (Sprint B.1)

**Status:** RED → GREEN
**Owner:** registry-dev
**Branch:** `feature/M-L1-T10-huggingface`

## Why

Largest single-source ROI in M-L1-expansion: huggingface.co exposes ~600K models via public API. With pagination via Link header rel="next" cursor, default sort by trendingScore desc.

After M-L1-T3a..T3i fetch-ai pipeline + Sprint A (cron matrix + logger) — adding huggingface = 60× current registry surface (~600K vs ~12K).

## Готово когда

1. `products/01-registry/tests/huggingface-adapter.test.ts` 9/9 GREEN (factory + 5 pagination + 2 projection + 1 misc)
2. typecheck clean, baseline GREEN
3. Acceptance script `scripts/verify_M-L1-T10-huggingface.sh` PASS

## Slim spec for registry-dev session

```
You are registry-dev. Task: implement real HuggingFace adapter (replace stub).

Setup:
  cd /home/nous/paxio
  mkdir -p /home/nous/paxio-worktrees
  git worktree add /home/nous/paxio-worktrees/rd-t10 -B feature/M-L1-T10-huggingface origin/feature/M-L1-T10-huggingface
  cd /home/nous/paxio-worktrees/rd-t10
  git config user.name registry-dev && git config user.email registry-dev@paxio.network
  pnpm install

Read ONLY (3 files):
  products/01-registry/tests/huggingface-adapter.test.ts   (RED spec — 9 tests, sacred)
  packages/types/src/sources/huggingface.ts                (Zod + 4 helpers)
  products/01-registry/app/domain/sources/huggingface.ts   (file to modify — currently STUB)

Reference pattern (DO NOT modify):
  products/01-registry/app/domain/sources/fetch-ai.ts      (similar REST adapter — pagination + projection)

Implement в huggingface.ts (~70 lines real impl):

1. fetchAgents async generator:
   - Initial URL: ${baseUrl}/api/models?limit=${pageSize} (default baseUrl=https://huggingface.co, pageSize=100, cap 1000)
   - SAFETY_MAX_PAGES = 200 (top 20K records via trending)
   - Per page:
     * `await deps.httpClient.fetch({ url, method: 'GET' })`
     * Non-2xx → return (graceful)
     * body is array of raw models
     * For each raw: ZodHuggingFaceModel.safeParse — yield only on success
   - Pagination: extract Link header, find `<URL>; rel="next"` token, set next URL, continue.
     If no Link header or no next link → done.
   - Stop after SAFETY_MAX_PAGES.

2. ALSO update postgres-storage.ts countBySource buckets to include 8 keys
   (architect's CRAWLER_SOURCES enum expansion makes typecheck fail without this):

     const buckets: Record<CrawlerSource, number> = {
       native: 0, erc8004: 0, a2a: 0, mcp: 0, 'fetch-ai': 0, virtuals: 0,
       'paxio-curated': 0,    // ← ADD
       huggingface: 0,         // ← ADD
     };

3. toCanonical(raw): Result<AgentCard, SourceAdapterError>:
   - Zod parse → if !success → err({code:'parse_error',...})
   - Use exported helpers from @paxio/types:
     huggingFaceModelUrl(id), huggingFaceExternalId(id), huggingFaceDisplayName(raw),
     huggingFaceLikesToReputation(likes)
   - card:
     did: `did:paxio:huggingface:${huggingFaceExternalId(parsed.data.id)}`
     name: huggingFaceDisplayName(parsed.data),
     description: undefined (HF doesn't provide one in models list endpoint),
     capability: 'INTELLIGENCE' (most HF models are inference; future: pipeline_tag mapping),
     version: '0.0.1',
     createdAt: parsed.data.createdAt,
     source: sourceName,
     externalId: huggingFaceExternalId(parsed.data.id),
     sourceUrl: huggingFaceModelUrl(parsed.data.id),

DO NOT touch:
  - tests/* (architect-owned)
  - packages/* (architect-owned)
  - other adapter files

Verify (3 commands):
  pnpm typecheck
  pnpm exec vitest run products/01-registry/tests/huggingface-adapter.test.ts   # 9/9 GREEN
  pnpm exec vitest run                                                            # full baseline (1477+ GREEN)

Commit message:
  feat(M-L1-T10): real HuggingFace adapter — Link-header pagination + raw→canonical projection

  Replaces stub. Adapter GETs /api/models?limit=N with default trendingScore
  sort, paginates via Link header `rel="next"` cursor token, terminates on
  SAFETY_MAX_PAGES=200 (top 20K trending). Projection uses helpers from
  @paxio/types (huggingFaceModelUrl/ExternalId/DisplayName/LikesToReputation).

  9/9 huggingface-adapter tests GREEN.

Push (TD-dev-push policy):
  git push origin feature/M-L1-T10-huggingface

Reply «готово» + worktree path + commit sha + remote head + verification.

Skills доступны on-demand: (none beyond registry-dev's always-on allowlist).
```

## Production rollout (post-merge)

After PR merges + deploy:
1. Add `huggingface` to scheduled-crawl.yml matrix (separate architect PR)
2. Trigger manual crawl `gh workflow run "Scheduled · Crawl Sources" -f source=huggingface`
3. Verify count rises by ~20K (top trending)
