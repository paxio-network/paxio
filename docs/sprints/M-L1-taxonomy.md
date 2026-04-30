# M-L1-taxonomy — Universal Registry, taxonomy + attribute schema

## Why

После M-L1-launch + последующих infrastructure фиксов (PR #103-110) crawler работает end-to-end. В БД 3230 записей, все source=`mcp`. Однако:

1. **Taxonomy была неправильная.** `capability TEXT CHECK IN (REGISTRY,FACILITATOR,WALLET,SECURITY,INTELLIGENCE)` смешивала три разных принципа деления (industry/technical-function/asset). Bitcoin был «категорией» по логике asset, что не соответствует остальным enum-значениям. Пользовательский поиск «найти DevOps агента» не работает.

2. **Schema была плоской.** AgentCard содержал только identity + capability + endpoint. Реальный agentic universe требует 9 групп атрибутов (wallet, payment, sla, reputation, security, compliance, ecosystem, developer + capabilities). См. user spec в `docs/agent-card-spec-v2.md`.

3. **Registry охватывает только MCP servers.** Из 7 потенциальных источников (paxio-native, erc8004, a2a, mcp, fetch, virtuals, eliza) — реально работает 1. ElizaOS отсутствовал в enum полностью. fetch.ai дает ~2M записей через REST API но adapter — заглушка.

## What

Domain-based taxonomy + полная attribute schema + canonical source enum + ElizaOS source.

### Что меняется в схеме

```
ДО (M-L1-launch):                       ПОСЛЕ (M-L1-taxonomy):
─────────────────────                   ─────────────────────────────────
capability TEXT NOT NULL                category TEXT (11 domain values)
  CHECK IN (5 paxio-layers)             capabilities TEXT[] (free tags)
                                        framework TEXT (10 frameworks)
                                        + 30+ новых полей в 9 группах
source CHECK IN (6 values incl
  'native', 'fetch-ai')                 source CHECK IN (7 canonical values)
                                          paxio-native, erc8004, a2a, mcp,
                                          fetch, virtuals, eliza
                                        backfill: native→paxio-native,
                                                  fetch-ai→fetch
```

### 11 domain categories (single criterion)

```
Finance · Legal & Compliance · Security · Developer · Data & Research ·
Infrastructure · Productivity · AI & ML · Language · Entertainment ·
Customer Experience
```

Bitcoin / x402 / payment rails — **атрибуты в `wallet` / `payment` блоках**, НЕ категории.

### 7 sources

```
paxio-native  — direct POST /registry/register
erc8004       — Base/Mainnet on-chain registry
a2a           — Google Agent2Agent (.well-known/agent.json)
mcp           — Model Context Protocol servers (Smithery + Anthropic
                catalog + glama.ai + awesome-mcp + npm-mcp via
                external_id discrimination)
fetch         — Fetch.ai Agentverse REST API
virtuals      — Virtuals Protocol ACP registry
eliza         — ElizaOS framework agents (a16z)
```

### 9 attribute groups

См. полную спецификацию в `packages/types/src/agent-card.ts` + sub-schemas
в re-exports. Каждая группа имеет соответствующий ZodObject + TypeScript type.

## Готово когда

1. ✅ `packages/types/src/agent-category.ts` — 11-value enum
2. ✅ `packages/types/src/agent-source.ts` — 7-value canonical enum + 2 legacy aliases + `AGENT_SOURCE_LABELS` mapping
3. ✅ `packages/types/src/agent-framework.ts` — 10-value framework enum
4. ✅ `packages/types/src/agent-card.ts` — REWRITE: 9 attribute groups composed via `.merge()`. Backward-compat: `capability` (deprecated), `legacySource` (deprecated)
5. ✅ `packages/contracts/sql/003_taxonomy.sql` — migration source-of-truth
6. ✅ `tests/agent-card-taxonomy.test.ts` — 35 tests RED → GREEN
7. ⬜ `products/01-registry/app/infra/postgres-storage.ts` — inline migration mirror (registry-dev impl)
8. ⬜ Update `SQL.upsertByDid` from `ON CONFLICT (did) DO UPDATE SET ...` → `ON CONFLICT (did) DO NOTHING` (registry-dev impl). Closes "крaulер всегда перезатирает первые N записей" antipattern
9. ⬜ Lift `maxRecords: 5000` cap in admin-crawl handler (backend-dev impl)
10. ⬜ Adapter projection updates: each `products/01-registry/app/domain/sources/*.ts` populates `category`, `framework`, applicable groups
11. ⬜ ElizaOS adapter — new file `products/01-registry/app/domain/sources/eliza.ts`
12. ⬜ FA-01 doc updated with new taxonomy section
13. ⬜ Acceptance script verifies migration 003 applied + 3230 records have `category != NULL`

## Decomposition по агентам

| # | Task | Agent | Directory | Verification | Architecture |
|---|------|-------|-----------|-------------|--------------|
| T-1 | Contracts + types + SQL migration source-of-truth + RED tests | **architect** | `packages/types/src/`, `packages/contracts/sql/`, `tests/` | `pnpm typecheck` + new tests GREEN | Zod composition, optional fields with backward-compat |
| T-2 | Inline mirror migration 003 + change ON CONFLICT to DO NOTHING + new column upsert SQL | **registry-dev** | `products/01-registry/app/infra/postgres-storage.ts` | `pnpm test products/01-registry/tests/postgres-storage.test.ts` GREEN | Idempotent migration, inline mirror packages/contracts/sql |
| T-3 | Backfill existing 3230 records — set `category='AI & ML'`, framework='custom', other defaults | **registry-dev** (via T-2 migration UPDATE statements) | same as T-2 | live verify on Hetzner: `psql -c "SELECT COUNT(*) FROM agent_cards WHERE category IS NULL"` = 0 | — |
| T-4 | MCP adapter (Smithery) — populate category via inferCategory keyword rules, framework='custom', wallet=none | **registry-dev** | `products/01-registry/app/domain/sources/mcp.ts` | `pnpm test products/01-registry/tests/mcp-adapter.test.ts` GREEN | Pure projection, no I/O in toCanonical |
| T-5 | ElizaOS adapter — new source, scrape eliza.com agents OR ElizaOS GitHub examples | **registry-dev** | `products/01-registry/app/domain/sources/eliza.ts` (new) | new RED test `products/01-registry/tests/eliza-adapter.test.ts` GREEN | Real impl, not stub |
| T-6 | Lift maxRecords cap (5000 → unlimited / configurable) + per-source crawler-limits.json | **backend-dev** | `products/01-registry/app/api/admin-crawl.js`, `apps/back/app/data/crawler-limits.json` | `verify_M-L1-taxonomy.sh` PASS | parameterised limits, no hard-coded magic |
| T-7 | FA-01 doc rewrite — taxonomy section, source list, attribute schema diagram | **architect** | `docs/feature-areas/FA-01-registry-architecture.md` | manual review | mirrors final code |
| T-8 | Frontend AgentTable display — use AGENT_SOURCE_LABELS for label rendering | **frontend-dev** | `packages/ui/src/AgentTable.tsx` | `pnpm test --filter @paxio/ui` GREEN | no hard-coded display strings |
| T-9 | Acceptance script — full M-L1-taxonomy verification | **architect** | `scripts/verify_M-L1-taxonomy.sh` | runs end-to-end + DB checks | scripts/quality-gate.sh integration |

## Skills доступны on-demand (вызвать через Skill tool если нужны)

- `paxio-backend-architecture` (VM sandbox, multi-tenancy filter, wiring shape)
- `rust-error-handling` (если будут изменения в reputation canister — out of scope этого milestone)
- `sql-best-practices` (registry-dev для migration 003)

## Skip / out-of-scope

- Real impls для erc8004 / a2a / fetch / virtuals adapters — отдельные milestones (`M-L1-erc8004`, `M-L1-fetch`, etc.)
- ElizaOS adapter — IS in scope как T-5
- Reputation canister расширение — отдельный milestone
- Frontend filter UI updates — частично в T-8

## Phase 0 spec review

Architect инвокирует reviewer перед handoff:
- ZodAgentCard может ли parse'ить минимальный card (back-compat) ✓
- ZodAgentCard может ли parse'ить full 9-group payload ✓
- ZodAgentCategory не содержит Bitcoin / технических функций ✓
- AGENT_SOURCE_LABELS frozen + matches every canonical AgentSource ✓
- Migration 003 idempotent (CREATE/ALTER ... IF NOT EXISTS) ✓
- 35 RED tests GREEN ✓

После APPROVED → handoff registry-dev для T-2..T-5 (одна session per task для slim spec на MiniMax-M2.7 per architect-protocol).
