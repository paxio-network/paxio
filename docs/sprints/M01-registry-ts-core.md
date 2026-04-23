# M01 — Registry TS Core MVP

**Owner:** registry-dev
**Branch:** `feature/m01-registry-ts`
**Depends on:** M00 ✅, M01a ✅ (Turborepo)
**Parallel with:** M02 (icp-dev), M03 (icp-dev), M04 (icp-dev)
**Estimate:** 3–4 days

## Готово когда:
- [ ] `pnpm vitest run tests/registry-contracts.test.ts` — 24/24 GREEN
- [ ] `pnpm vitest run products/01-registry/tests/` — all GREEN (32+ tests)
- [ ] `pnpm typecheck` — clean
- [ ] `bash scripts/verify_m01_registry.sh` — PASS

## Scope (FA-01 §4 API surface)

| Endpoint | Handler | Domain fn | Status |
|---|---|---|---|
| `POST /registry/register` | `app/api/register.js` | `registry.register(card)` | M01 |
| `GET /registry/find?intent=X&limit=N` | `app/api/find.js` | `registry.find(query)` | M01 |
| `GET /registry/:did` | `app/api/resolve.js` | `registry.resolve(did)` | M01 |
| `POST /registry/claim/:did` | `app/api/claim.js` | `registry.issueClaimChallenge / verifyClaim` | M01 |
| `GET /registry/count` | `app/api/count.js` | `registry.count()` | M01 |

**Not in M01** (later):
- PostgreSQL persistence → M17
- Qdrant vector search → M31
- Crawlers (ERC-8004, A2A, MCP, Fetch.ai) → M18–M21
- Reputation score integration → M31b (canister)

## Storage model (MVP)
- **In-memory** `Map<Did, AgentCard>` + secondary index for search.
- Search uses simple BM25-over-name+description (no Qdrant yet).
- Persistence intentionally deferred — `pnpm vitest run` must remain green offline.

## Files to implement

### `products/01-registry/app/domain/`
- `did-gen.ts` — `generateDid({endpoint, developer, network})` → `Did` (SHA-256 hash, deterministic)
- `registry.ts` — `createInMemoryRegistry(deps): Registry` (implements the port from `@paxio/interfaces`)
- `search.ts` — `bm25Search(docs, query)` returning `FindResult[]`
- `claim.ts` — nonce issuance + signature verification (use `@noble/secp256k1` for ECDSA verify)

### `products/01-registry/app/api/`
Each handler is a thin VM-sandbox module returning `{ httpMethod, path, method }`. See `.claude/rules/backend-api-patterns.md`.
- `register.js` — validates `ZodRegisterRequest`, calls `domain.registry.register`
- `find.js` — validates `ZodFindQuery`, calls `domain.registry.find`
- `resolve.js` — calls `domain.registry.resolve` by `params.did`
- `claim.js` — POST: issueClaimChallenge + verifyClaim branch
- `count.js` — `domain.registry.count()`

### `products/01-registry/canister/` — SKIP for M01
Reputation canister is M31b. Leave Rust skeleton untouched.

## Tests (RED — written by architect)

- `tests/registry-contracts.test.ts` — Zod schema lock-down (24 tests)
- `products/01-registry/tests/registry.test.ts` — behavior spec (14 tests)
- `products/01-registry/tests/did-gen.test.ts` — DID generation (6 tests)

## Acceptance script

`bash scripts/verify_m01_registry.sh` — 5 steps (skeleton exists, contract tests, behavior tests, typecheck, quality).

## Таблица задач

| # | Задача | Агент | Метод верификации | Файлы |
|---|---|---|---|---|
| 1 | DID generation (deterministic SHA-256) | registry-dev | `pnpm vitest run products/01-registry/tests/did-gen.test.ts` | `products/01-registry/app/domain/did-gen.ts` |
| 2 | In-memory Registry domain | registry-dev | `pnpm vitest run products/01-registry/tests/registry.test.ts` | `products/01-registry/app/domain/registry.ts` |
| 3 | BM25 search stub | registry-dev | included in registry.test.ts (find cases) | `products/01-registry/app/domain/search.ts` |
| 4 | Claim challenge/verify (ECDSA) | registry-dev | claim cases in registry.test.ts | `products/01-registry/app/domain/claim.ts` |
| 5 | API handlers (5 endpoints) | registry-dev | integration test + typecheck | `products/01-registry/app/api/*.js` |
| 6 | Wire into apps/back/server loader | registry-dev | `pnpm dev:server` loads Registry routes | `products/01-registry/app/api/*.js` auto-discovered |

## Dependencies on other Phase 0 milestones
- **No runtime deps** on M02/M03/M04 for M01 MVP.
- Signal: M01 can merge to `dev` before or after M02/M03/M04 — order is irrelevant.

## Статус: ТЕСТЫ НАПИСАНЫ — ЖДЁТ registry-dev
