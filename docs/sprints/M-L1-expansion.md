# M-L1-expansion — Universal Registry, max-coverage agent crawl

## Why

После M-L1-taxonomy domain schema готов (3261 MCP агентов в БД). Roadmap target — **2M+ агентов** через все доступные источники agentic ecosystem. Сейчас только MCP source crawler работает; остальные 4 source'а — заглушки, плюс целая категория framework/discovery источников отсутствует.

Цель: довести AGENT_SOURCES enum до **13 canonical** sources, реализовать real adapter для каждого, плюс x402 enrichment crawler + первый agentic-economy aggregator endpoint.

## What

### Source enum expansion (7 → 13)

```
Direct entry:    paxio-native, paxio-curated
On-chain:        erc8004, a2a, bittensor, virtuals
Framework hubs:  mcp, eliza, langchain-hub, fetch
Discovery:       huggingface, vercel-ai, github-discovered
```

`x402` НЕ source — это `payment.accepts` атрибут. Discovery: x402 facilitator на Base логирует все paying transactions → enrichment crawler помечает existing agents (НЕ создаёт новые source rows).

### Total addressable

```
fetch (Fetch.ai Agentverse)        ~2,000,000  ← dominant
erc8004 (Ethereum + Base)               ~75,000
bittensor (TAO subnets)                 ~50,000
huggingface (Spaces filtered)           ~30,000
github-discovered (frameworks)          ~10,000
virtuals (real impl)                    ~10,000
langchain-hub                           ~10,000
mcp umbrella expansion (full)            ~5,000
eliza                                    ~5,000
vercel-ai templates                        ~200
paxio-curated (foundation+SaaS)            ~150
a2a                                        ~500
                                    ──────────
                                    ~2,200,000+
```

## Готово когда

### Architect Phase A (T-1) — этот PR

1. ✅ `packages/types/src/agent-source.ts` — 13 canonical + 2 legacy aliases + AGENT_SOURCE_LABELS
2. ✅ `packages/contracts/sql/004_source_expansion.sql` — CHECK constraint update
3. ✅ `tests/agent-card-taxonomy.test.ts` — exhaustive coverage tests (37 → 37)
4. ✅ `tests/landing-contracts.test.ts` — updated enum
5. ✅ `docs/sprints/M-L1-expansion.md` — этот документ

### Per-source RED Zod schemas (T-1.5 architect, отдельные мини-PR при необходимости)

6. ⬜ `packages/types/src/sources/paxio-curated.ts` — manual seed JSON shape
7. ⬜ `packages/types/src/sources/bittensor.ts` — TAO miner descriptor
8. ⬜ `packages/types/src/sources/eliza.ts` — ElizaOS agent shape
9. ⬜ `packages/types/src/sources/langchain-hub.ts` — LangSmith hub item
10. ⬜ `packages/types/src/sources/huggingface.ts` — HF Spaces item
11. ⬜ `packages/types/src/sources/vercel-ai.ts` — Vercel template
12. ⬜ `packages/types/src/sources/github-discovered.ts` — generic GitHub repo

### Implementation tasks (registry-dev / icp-dev / backend-dev)

13. ⬜ T-1.5 inline migration 004 mirror в `postgres-storage.ts` (registry-dev)
14. ⬜ T-2 `paxio-curated` adapter + JSON seed (registry-dev)
15. ⬜ T-3 `fetch` real adapter — REST API (registry-dev) ⭐⭐⭐
16. ⬜ T-4 `bittensor` real adapter — substrate RPC (icp-dev)
17. ⬜ T-5 `erc8004` real adapter — viem + EVM logs (icp-dev) ⭐⭐
18. ⬜ T-6 `mcp` umbrella expansion (Anthropic + Glama + npm) (registry-dev)
19. ⬜ T-7 `eliza` real adapter (registry-dev)
20. ⬜ T-8 `langchain-hub` adapter (registry-dev)
21. ⬜ T-9 `virtuals` real adapter (registry-dev)
22. ⬜ T-10 `huggingface` adapter (registry-dev)
23. ⬜ T-11 `vercel-ai` adapter (registry-dev)
24. ⬜ T-12 `github-discovered` adapter (registry-dev)
25. ⬜ T-13 `a2a` real adapter (registry-dev)
26. ⬜ T-14 x402 enrichment crawler — Base on-chain (icp-dev) ⭐
27. ⬜ T-15 `/api/intelligence/economy` — agentic-economy aggregator (backend-dev)

## Decomposition table

| # | Task | Agent | Directory | Verification | Architecture |
|---|------|-------|-----------|-------------|--------------|
| **T-1** | Source enum + tests + migration 004 SQL + milestone doc | architect | `packages/types/`, `packages/contracts/sql/`, `tests/`, `docs/sprints/` | `pnpm typecheck` + 78 enum tests GREEN | Zod enum, exhaustive label coverage |
| T-1.5 | Inline migration 004 mirror | registry-dev | `products/01-registry/app/infra/postgres-storage.ts` | postgres-storage tests GREEN | Mirror SQL line-by-line, idempotent |
| T-2 | `paxio-curated` JSON + adapter | registry-dev | `apps/back/app/data/curated-agents.json`, `products/01-registry/app/domain/sources/paxio-curated.ts` | acceptance: ≥50 records после crawl | Pure data + simple yield, no I/O |
| **T-3** | `fetch` real adapter (Fetch.ai) | registry-dev | `products/01-registry/app/domain/sources/fetch.ts` | acceptance: processed > 100K | REST pagination, rate limit, async generator |
| T-4 | `bittensor` real adapter | icp-dev | `products/01-registry/app/domain/sources/bittensor.ts` | acceptance: ≥50 subnets discovered | substrate RPC (https://archive.chain.opentensor.ai) |
| T-5 | `erc8004` real adapter | icp-dev | `products/01-registry/app/domain/sources/erc8004.ts` | acceptance: ≥1000 records от Base+Mainnet | viem, event log batching, capability JSON resolution |
| T-6 | `mcp` umbrella expansion | registry-dev | `products/01-registry/app/domain/sources/mcp.ts` | acceptance: total mcp records >5K | Multi-fetcher (Smithery+Anthropic+Glama+npm), external_id prefix disambiguates |
| T-7 | `eliza` adapter | registry-dev | `products/01-registry/app/domain/sources/eliza.ts` | acceptance: ≥100 records | GitHub topic + npm + on-chain enrichment |
| T-8 | `langchain-hub` adapter | registry-dev | `products/01-registry/app/domain/sources/langchain-hub.ts` | acceptance: ≥1K records | LangSmith REST API (smith.langchain.com/hub) |
| T-9 | `virtuals` real adapter | registry-dev | `products/01-registry/app/domain/sources/virtuals.ts` | acceptance: ≥100 records | Replace stub, REST API |
| T-10 | `huggingface` adapter | registry-dev | `products/01-registry/app/domain/sources/huggingface.ts` | acceptance: ≥1K Spaces with agents tag | HF API with filter |
| T-11 | `vercel-ai` adapter | registry-dev | `products/01-registry/app/domain/sources/vercel-ai.ts` | acceptance: ≥50 templates | Scrape vercel.com/templates/ai |
| T-12 | `github-discovered` adapter | registry-dev | `products/01-registry/app/domain/sources/github-discovered.ts` | acceptance: ≥100 records | GitHub Search API per framework signature |
| T-13 | `a2a` real adapter | registry-dev | `products/01-registry/app/domain/sources/a2a.ts` | acceptance: ≥10 records | Replace stub, .well-known/agent.json HTTP crawl |
| **T-14** | x402 enrichment crawler | icp-dev | `products/01-registry/app/domain/x402-enrichment.ts` | acceptance: ≥10 agents marked `payment.accepts.x402=true` | Base RPC, x402 facilitator events, batch enrichment |
| **T-15** | `/api/intelligence/economy` endpoint | backend-dev | `products/07-intelligence/app/api/intelligence-economy.js` | acceptance: live endpoint returns counts | Read-only SQL aggregate, on-chain agent counts |

## Skills доступны on-demand

- `bitcoin-icp` (T-5/T-14 для on-chain RPC)
- `chain-fusion` (T-5/T-14 EVM RPC от ICP context — может быть relevant)
- `icp-rust` (T-4/T-5/T-14 если Rust portion involved)
- `sql-best-practices` (T-1.5 migration)
- `zod-validation` (per-source schema authoring)
- `registry-patterns` (overall — uniform crawler architecture)

## Execution phases

```
Phase A (этот PR — architect, ~1 day):
  T-1 contracts + tests + migration 004 + milestone doc

Phase B (parallel, ~1 неделя):
  T-1.5 inline migration mirror
  T-2 paxio-curated         ← marketing quality
  T-3 fetch ⭐⭐⭐            ← +2M biggest win
  T-6 mcp umbrella           ← extends existing
  T-7 eliza                  ← quick win
  T-13 a2a                   ← finish stub
  T-11 vercel-ai             ← quick win

Phase C (sequential, ~1.5 недели):
  T-4 bittensor
  T-9 virtuals real
  T-8 langchain-hub
  T-10 huggingface
  T-12 github-discovered

Phase D (heaviest, ~2 недели):
  T-5 erc8004 ⭐⭐             ← foundation for on-chain identity
  T-14 x402 enrichment       ← agentic-economy lever (зависит от T-5)

Phase E (1 day):
  T-15 economy aggregator endpoint
```

## Out of scope

- AGI House (~500), Agent Protocol (~1K), Toolhouse (~200), LlamaHub (~500) — мелочь
- Olas Network (~5K — niche)
- Solana / NEAR / Story / SingularityNET — niche per-chain, отдельный milestone если станет приоритетом
- Replit Agents marketplace (small, scrape effort > value)

## Phase 0 spec review

Architect инвокирует reviewer перед handoff (per architect-protocol §6.5):
- 13 canonical AGENT_SOURCES present in enum ✓
- AGENT_SOURCE_LABELS exhaustive coverage (every enum has label) ✓
- Migration 004 SQL syntactically valid + idempotent (DROP IF EXISTS / ADD CHECK) ✓
- 37 taxonomy tests + 41 landing-contracts tests GREEN ✓
- Per-source Zod schemas placeholder structure (T-1.5+ tasks add real shapes) ✓
- No `x402` in source enum (atomic violation if present) ✓

После APPROVED → handoff registry-dev для T-1.5+T-2 (paxio-curated quick win), затем по слоту parallel sessions.
