# M-Q5 — Context Budget round 2 (3 more rules narrowed)

**Тип**: Quality / Process milestone (architect-only).
**Branch**: `feature/M-Q5-narrow-more-rules`.
**Worktree**: `/tmp/paxio-mq5`.

## Симптом

После M-Q4 merge user сообщил, что backend-dev session **ВСЁ ЕЩЁ** уходит в
compaction loop:

> Autocompact is thrashing: the context refilled to the limit within 3 turns
> of the previous compact, 3 times in a row.

## Диагноз

M-Q4 narrowed 3 worst offenders (engineering-principles + checklist +
architect-protocol = ~76 KB), но 5 других heavy rules с broad globs всё ещё
auto-инжектируются для backend-dev:

| Rule | Size | Glob | Auto-loads для backend-dev? |
|---|---|---|---|
| scope-guard.md | 17 KB | `apps/**, products/**, packages/**, ...` | ✅ нужен (security) |
| **architecture.md** | **14 KB** | `apps/**, products/**, packages/**, docs/**` | ✅ broad — НО backend-architecture.md уже покрывает |
| **workflow.md** | **12 KB** | `apps/**, products/**, packages/**, ...` | ✅ broad — devs видят достаточно через CLAUDE.md |
| **code-style.md** | **11 KB** | `apps/**, products/**, packages/**, ...` | ✅ broad — backend-code-style уже покрывает TS/V8 |
| backend-architecture.md | 10 KB | `apps/back/**, products/**/app/**` | ✅ нужен (VM sandbox, multi-tenancy) |
| backend-code-style.md | 8 KB | `apps/back/**, products/**/app/**` | ✅ нужен (factory, V8) |
| safety.md | 7 KB | `apps/**, products/**, packages/**, ...` | ✅ нужен (P0) |
| testing.md | 6 KB | `apps/**, products/**, packages/**, ...` | ✅ нужен |
| startup-protocol.md | 6 KB | `apps/**, products/**, packages/**, ...` | ✅ нужен |
| backend-api-patterns.md | 4 KB | `apps/back/**, products/**/app/**` | ✅ нужен |

**Итого 95 KB rules + 26 KB CLAUDE.md = ~121 KB на open одного файла**, до
прочтения spec'а / tests / source. Context window 200K → ~80K free → плюс
M-L1-expansion milestone (12 KB) + 4 RED tests (28 KB) + reference tests
(50 KB) + actual source (50 KB) = **busted**.

## Готово когда

1. **3 rules narrowed** до architect-zone:
   - `architecture.md` (14 KB) — было broad, стало
     `["packages/{types,interfaces,errors,contracts}/**/*.ts", "docs/sprints/**/*.md", "docs/feature-areas/**/*.md"]`
   - `workflow.md` (12 KB) — стало
     `["docs/sprints/**/*.md", "docs/feature-areas/**/*.md", "scripts/verify_*.sh"]`
   - `code-style.md` (11 KB) — стало то же что architecture.md

2. **Domain-specific replacements** для devs остаются broad:
   - `backend-architecture.md` — `apps/back/**/*.{cjs,js,ts}`, `products/**/app/**/*.{js,ts}`
   - `backend-code-style.md` — то же
   - `frontend-rules.md` — `apps/frontend/**/*.{ts,tsx}`, `packages/{ui,hooks,api-client,auth}/**/*.{ts,tsx}`
   - `safety.md`, `testing.md`, `startup-protocol.md`, `scope-guard.md` — ОСТАЮТСЯ broad (P0 + process)

3. **Drift-guard tests дополнены** в `tests/context-budget-drift.test.ts`:
   - 3 новых globs-narrow тестов (architecture / workflow / code-style)
   - 3 новых rules добавлены в timeless principle iteration
   - Total: 31 M-Q4 + 6 M-Q5 = 37 tests

4. **Acceptance script** `scripts/verify_M-Q5.sh`:
   - Step 5 явно проверяет что domain-specific replacements **остались broad**
     (regression-guard: если кто-то по ошибке narrow'нёт backend-architecture
     или scope-guard — тест поймает)

## Декомпозиция (5 задач, все architect zone)

| # | Task | Files |
|---|------|-------|
| T-1 | Narrow architecture.md frontmatter | `.claude/rules/architecture.md` |
| T-2 | Narrow workflow.md frontmatter | `.claude/rules/workflow.md` |
| T-3 | Narrow code-style.md frontmatter | `.claude/rules/code-style.md` |
| T-4 | Drift-guard tests + acceptance | `tests/context-budget-drift.test.ts`, `scripts/verify_M-Q5.sh` |
| T-5 | Commit + Phase 0 + autonomous merge | (architect process) |

## Анти-цели

- НЕ narrow'ить scope-guard.md (devs нужен — security)
- НЕ narrow'ить safety.md (P0 — нужен каждому)
- НЕ narrow'ить testing.md (devs нужен)
- НЕ narrow'ить startup-protocol.md (это сам startup gate, нужен каждому)
- НЕ narrow'ить backend-architecture / backend-code-style / frontend-rules /
  backend-api-patterns (domain-specific dev rules — нужны)
- НЕ переписывать содержимое 3 narrow'нутых файлов (только frontmatter glob)

## Эффект

После M-Q5 merge backend-dev auto-load на open `apps/back/server/main.cjs` или
`products/01-registry/app/domain/sources/erc8004.ts`:

| Rule | Before M-Q4 | After M-Q4 | After M-Q5 |
|---|---|---|---|
| engineering-principles | 32 KB | 0 (narrow) | 0 |
| coding-standards-checklist | 19 KB | 0 (narrow) | 0 |
| architect-protocol | 26 KB | 0 (narrow) | 0 |
| **architecture** | 14 KB | 14 KB | **0 (narrow)** |
| **workflow** | 12 KB | 12 KB | **0 (narrow)** |
| **code-style** | 11 KB | 11 KB | **0 (narrow)** |
| scope-guard | 17 KB | 17 KB | 17 KB |
| backend-architecture | 10 KB | 10 KB | 10 KB |
| backend-code-style | 8 KB | 8 KB | 8 KB |
| safety | 7 KB | 7 KB | 7 KB |
| testing | 6 KB | 6 KB | 6 KB |
| startup-protocol | 6 KB | 6 KB | 6 KB |
| backend-api-patterns | 4 KB | 4 KB | 4 KB |
| **Итого rules** | **172 KB** | **95 KB** | **58 KB** |
| + CLAUDE.md | +26 KB | +26 KB | +26 KB |
| **Total auto-load** | **198 KB** | **121 KB** | **84 KB** |

После M-Q5: backend-dev имеет ~116 KB free context для milestone + RED tests +
source code. Compaction loop closed.

## Acceptance criteria (для reviewer Phase 0)

- [ ] `pnpm exec vitest run tests/context-budget-drift.test.ts` GREEN (37 tests)
- [ ] `bash scripts/verify_M-Q5.sh` PASS=N FAIL=0 (idempotent 2× run)
- [ ] 3 narrow'нутых rule frontmatter — никаких apps/** или products/**
- [ ] Domain-specific replacements (backend-architecture, scope-guard, etc.)
      ОСТАЛИСЬ broad — drift-guard это явно проверяет
- [ ] No `package.json` / `pnpm-lock.yaml` changes
- [ ] No specific milestone IDs в rule frontmatter

## После merge

User повторно запускает backend-dev на M-L1-expansion (тем же промтом). Должен
работать без compaction loop. Если ВСЁ ЕЩЁ thrashing — идём в M-Q6 (вероятно
slim CLAUDE.md, который 26 KB и всегда в context).
