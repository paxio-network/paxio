# M-Q7 — Slim CLAUDE.md + startup-protocol to PROJECT baseline

**Branch**: `feature/M-Q7-slim-to-baseline`.

## Симптом

После M-Q6 (`globs: []` для 6 heavy rules) backend-dev и frontend-dev сессии
ВСЁ ЕЩЁ thrashing на compaction loop. Backend-dev доходил до Step 9 отчёта,
далее compact. Frontend-dev — на Read 2 файлов compact.

## Сравнение с PROJECT (working baseline без compaction loop)

| | PROJECT | Paxio до M-Q7 | После M-Q7 |
|---|---|---|---|
| `CLAUDE.md` | 14.8 KB | **25.7 KB** | **12.5 KB** |
| `startup-protocol.md` | 1.7 KB | **5.8 KB** (+ worktree boilerplate) | **1.9 KB** |

PROJECT в startup-protocol имеет 8 шагов без worktree boilerplate (тот вынесен
куда нужно). Paxio добавлял worktree-per-session content (~3 KB) в каждое
auto-load для всех агентов — лишний context на каждом open file.

PROJECT CLAUDE.md не имеет verbose Project Layout monorepo tree (~6 KB) и
Important Paths (~2 KB) — это inventory, нужен по запросу, не всегда в context.

## Готово когда

1. **CLAUDE.md slim** ≤ 16 KB, при этом сохраняет ВСЕ Turborepo-specific:
   - `Turborepo`, `pnpm turbo`, `--filter=@paxio/*`, `Vercel Monorepo Projects`
   - Why monorepo секция (Turborepo rationale)
   - Build Commands с per-app filter командами
   - Branch Model + CI/CD overview
   Verbose Project Layout monorepo tree + Important Paths вынесены в
   `docs/architecture/MONOREPO.md`.

2. **startup-protocol slim** ≤ 3 KB:
   - Per-session worktree boilerplate вынесен в `docs/dev/worktree-isolation.md`
   - Step 1 в protocol просто ссылается на этот файл
   - Compact 9-step sequence без verbose explanations
   - Role-conditional tech-debt grep + project-state head **сохранены**

3. **Drift-guard tests** для size limits + extracted docs presence.

4. **Acceptance script** `scripts/verify_M-Q7.sh` idempotent.

5. **NOT touched** (per user direction):
   - Agent definitions (`.claude/agents/*.md`) — work rules, не context bloat.
     Они загружаются раз per agent invocation, не accumulate.
   - Broad-glob rules (`scope-guard.md`, `safety.md`, `testing.md`,
     `backend-architecture.md`, `backend-code-style.md`, `frontend-rules.md`,
     `backend-api-patterns.md`) — devs реально используют их при coding.

## Эффект

Auto-load для backend-dev на open `docs/sprints/<milestone>.md` после M-Q4+M-Q5+M-Q6+M-Q7:

| Source | Before M-Q7 | After M-Q7 |
|---|---|---|
| CLAUDE.md | 25.7 KB | **12.5 KB** |
| startup-protocol.md (auto-load на md) | 5.8 KB | **1.9 KB** |
| 6 heavy rules (globs: [] после M-Q6) | 0 | 0 |
| Other broad-glob rules | ~58 KB | ~58 KB (не trimmed) |
| **Total static** | **~89 KB** | **~72 KB** |

Saved: **~17 KB на каждой сессии**.

PROJECT static auto-load: ~68 KB. После M-Q7 paxio: ~72 KB. Approximately matched.

## Декомпозиция

| # | Task | Files |
|---|------|-------|
| T-1 | Slim startup-protocol, extract worktree to docs/dev/ | `.claude/rules/startup-protocol.md`, `docs/dev/worktree-isolation.md` (new) |
| T-2 | Slim CLAUDE.md, extract Project Layout to docs/architecture/ | `CLAUDE.md`, `docs/architecture/MONOREPO.md` (new) |
| T-3 | Drift-guard size limits + acceptance + commit/merge | `tests/context-budget-drift.test.ts`, `scripts/verify_M-Q7.sh`, milestone doc |

## Анти-цели

- НЕ trim agent definitions (work rules)
- НЕ trim broad-glob rules (devs нужны при coding)
- НЕ удалить Turborepo-specific content из CLAUDE.md
- НЕ изменить Step 2 / Step 5 role-conditional поведение

## Acceptance criteria (для reviewer Phase 0)

- [ ] CLAUDE.md ≤ 16 KB; preserves Turborepo content; links to MONOREPO.md
- [ ] startup-protocol.md ≤ 3 KB; no worktree boilerplate; links to worktree-isolation.md
- [ ] `pnpm exec vitest run tests/context-budget-drift.test.ts` — 62+ tests GREEN
- [ ] `bash scripts/verify_M-Q7.sh` PASS=N FAIL=0 (idempotent 2× run)
- [ ] No `package.json` / `pnpm-lock.yaml` changes
- [ ] No specific milestone IDs в rule frontmatter
