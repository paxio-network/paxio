# M-Q6 — Heavy rules manual-load only

**Тип**: Quality / Process milestone (architect-only).
**Branch**: `feature/M-Q6-heavy-rules-manual`.

## Симптом

После M-Q4 + M-Q5 backend-dev + frontend-dev сессии **ВСЁ ЕЩЁ** thrashing:

> Autocompact is thrashing: context refilled to limit within 3 turns of
> previous compact, 3 times in a row.

## Диагноз — narrow была theatre

M-Q4/M-Q5 narrow'нули 6 heavy rules до `["docs/sprints/**/*.md", "docs/feature-areas/**/*.md", ...]`.
Но **devs ВСЕГДА читают свой milestone doc** (`docs/sprints/M-XXX.md`)
на startup. Любой агент открывает sprint doc → 6 heavy rules инжектятся:

| Rule | Size |
|---|---|
| engineering-principles.md | 32 KB |
| coding-standards-checklist.md | 19 KB |
| architect-protocol.md | 26 KB |
| architecture.md | 14 KB |
| workflow.md | 12 KB |
| code-style.md | 11 KB |
| **Итого** | **114 KB** |

Plus broad-glob rules (~74 KB) + CLAUDE.md (25 KB) = **~213 KB на open
milestone doc'а**. Context busted ДО чтения тестов / source.

## Готово когда

1. **6 heavy rules имеют `globs: []`** — manual-load only:
   - engineering-principles.md
   - coding-standards-checklist.md
   - architect-protocol.md
   - architecture.md
   - workflow.md
   - code-style.md

2. **architect.md + reviewer.md** содержат явные `Read .claude/rules/<file>`
   инструкции в начале (короткий блок «Required reads at session start»)

3. **Drift-guard tests** проверяют:
   - Каждый из 6 heavy rules имеет `globs: []` (точное совпадение)
   - architect.md + reviewer.md имеют все 6 `Read` инструкций
   - Никакой dev-read path (docs/sprints/, docs/feature-areas/, apps/,
     products/, packages/, platform/, tests/, scripts/) не появляется в
     globs heavy rules — regression-guard

4. **Domain-specific dev rules остаются broad** (devs нужны при coding):
   - backend-architecture.md, backend-code-style.md, backend-api-patterns.md
   - frontend-rules.md
   - rust-{error-handling,async,build}.md
   - scope-guard.md, safety.md, testing.md, startup-protocol.md

5. **Acceptance script** `scripts/verify_M-Q6.sh` idempotent.

## Эффект

Backend-dev / frontend-dev open `docs/sprints/<their-milestone>.md`:

| | Before M-Q4 | After M-Q4 | After M-Q5 | **After M-Q6** |
|---|---|---|---|---|
| 6 heavy rules | 114 KB | 114 KB | 114 KB | **0** |
| Domain-specific rules | ~74 KB | ~74 KB | ~74 KB | ~74 KB |
| CLAUDE.md | 25 KB | 25 KB | 25 KB | 25 KB |
| **Total auto-load** | **213 KB** | **213 KB** | **213 KB** | **~99 KB** |

Архитектор / reviewer тратят ~114 KB разовое чтение в начале сессии (Read
инструкции в их agent definition), затем работают.

## Декомпозиция

| # | Task | Files |
|---|------|-------|
| T-1 | `globs: []` для 6 heavy rules + slim descriptions | `.claude/rules/{engineering-principles,coding-standards-checklist,architect-protocol,architecture,workflow,code-style}.md` (frontmatter only) |
| T-2 | Required reads block в architect.md + reviewer.md | `.claude/agents/{architect,reviewer}.md` |
| T-3 | Drift-guard tests + acceptance | `tests/context-budget-drift.test.ts`, `scripts/verify_M-Q6.sh` |
| T-4 | Commit + Phase 0 + autonomous merge | (architect process) |

## Анти-цели

- НЕ модифицировать тело 6 heavy rules (только frontmatter glob + description)
- НЕ narrow'ить domain-specific dev rules (devs нужны)
- НЕ trim CLAUDE.md (отдельный milestone если потребуется)
- НЕ добавлять specific milestone IDs в frontmatter rule files

## Acceptance criteria (для reviewer Phase 0)

- [ ] `pnpm exec vitest run tests/context-budget-drift.test.ts` GREEN
- [ ] `bash scripts/verify_M-Q6.sh` PASS=N FAIL=0 (idempotent 2× run)
- [ ] No `package.json` / `pnpm-lock.yaml` changes
- [ ] No specific milestone IDs в rule frontmatter
- [ ] Body 6 heavy rules не изменён (`git diff --stat` показывает только frontmatter)
