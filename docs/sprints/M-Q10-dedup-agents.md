# M-Q10 — Slim 4 dev agent files via topic dedup; scope-guard.md → manual-load

**Тип**: Quality / context-budget (architect scope only).
**Зависимости**: M-Q9 merged (safety/testing → manual-load + targeted grep).
**Worktree**: `/tmp/paxio-mq10`.
**Branch**: `feature/M-Q10-dedup-agents`.
**Estimated**: 45 min.

## Проблема

После M-Q9 dev auto-load profile (M-Q8/Q9 measurement):
- backend-dev: ~65 KB (target: ~50 KB — match PROJECT donor который работает на MiniMax)
- frontend-dev: ~58 KB
- icp-dev / registry-dev: similar

Сравнение с `/home/openclaw/PROJECT/.claude/agents/` (которые работают normally на том же MiniMax-M2.7 CLI):

| File | Paxio (pre-M-Q10) | PROJECT donor | Ratio |
|---|---|---|---|
| `agents/backend-dev.md` | 12 KB | 3.6 KB | **3.3×** |
| `agents/frontend-dev.md` | 12 KB | 3.7 KB | **3.2×** |
| `agents/icp-dev.md` | 9.3 KB | (нет) | — |
| `agents/registry-dev.md` | 10.8 KB | (нет) | — |
| `rules/scope-guard.md` | 16.6 KB | (нет) | — |

Real cause: **TOPIC REPLICATION**. Each agent file inlines:
- VM Sandbox section — long form (already in `backend-architecture.md`)
- Multi-Tenancy P0 BLOCKER — full B1-B7 enumeration with Phase B reference (already in `backend-architecture.md`)
- Three Hard Rules — full enumeration (in `scope-guard.md`)
- Scope violation Level 1/2/3 — enumeration (in `workflow.md`)
- 10-step Startup Protocol — enumeration (in `dev-startup.md` after M-Q8)
- Full SCOPE VIOLATION REQUEST template — 7-line block (in `scope-guard.md`)
- Long Git Policy "Почему" rationale (in `scope-guard.md::GIT & MERGE`)
- Per-FA responsibilities, Tech Stack — (in `CLAUDE.md`)

PROJECT does not have these duplicates because PROJECT codebase has only one stack (TS).
Paxio has 4 stacks (TS app, Rust canisters, Frontend, MCP/SDK), so we wrote longer agent
files thinking specificity helps — but it doesn't help, it just bloats context.

`scope-guard.md` (16.6 KB) is auto-loaded on every impl path read on Paxio — PROJECT
doesn't have a similar file at all. That's a single Paxio-specific source of bloat.

## Решение

### Part 1: `scope-guard.md` → `globs: []` (manual-load)

`scope-guard.md` is **architect/reviewer reference** — devs need it 1-2 times per
session at most (when escalating SCOPE VIOLATION REQUEST). Auto-loading 16.6 KB on
every impl read is anti-economical.

Devs need ONLY:
- Three Hard Rules (which file to never touch)
- SCOPE VIOLATION REQUEST template (when escalating)

These two snippets fit in 500 bytes. They go into `dev-startup.md` (which already
auto-loads on impl paths).

`scope-guard.md` content fully preserved (file ownership table, GIT & MERGE rules,
worktree isolation, pre-commit hook description) — architect/reviewer Read it manually
when needed.

### Part 2: `dev-startup.md` absorbs Three Hard Rules + escalation template

Surgical add to `dev-startup.md` (was 1500 chars → 2030 chars):

```
## Three Hard Rules
1. NEVER touch other agents' files (file ownership table in `CLAUDE.md`).
2. NEVER modify tests / acceptance scripts (architect-owned spec).
3. NEVER `git push` or `gh pr` (architect handles publication).

## No specification = no work
[3 lines]

## Escalation — SCOPE VIOLATION REQUEST
[7-line template block]
```

M-Q8 size assertion bumped from 1500 → 2500 chars (still tight, no rationale dump).

### Part 3: 4 dev agent files slimmed via dedup

Each agent file kept exactly 5 sections (matching PROJECT donor pattern):

1. **Scope** — file ownership table + FORBIDDEN one-line (with paths to owners)
2. **Architecture Reminders** — 4-7 brief code patterns (cheat sheet, not lecture)
3. **Verification** — `pnpm typecheck && pnpm test -- --run` + acceptance
4. **Workflow** — link to `dev-startup.md` + 2-3 targeted commands specific to role
5. **Git Policy** — table of Allowed/Forbidden + 2 lines of rationale

Removed (because lives elsewhere — single source of truth):
- VM Sandbox long form → `backend-architecture.md` (already auto-loaded for backend-dev)
- Multi-Tenancy P0 BLOCKER B1-B7 long form → `backend-architecture.md`
- Three Hard Rules enumeration → `dev-startup.md`
- SCOPE VIOLATION REQUEST template → `dev-startup.md` + `scope-guard.md`
- 10-step Startup Protocol enumeration → `dev-startup.md` 5-step (post M-Q8)
- Scope violation Level 1/2/3 → `scope-guard.md`
- Per-FA responsibilities → `CLAUDE.md`
- Tech Stack table → `CLAUDE.md`
- Long "Почему" rationale in Git Policy → `scope-guard.md`

### Part 4: anti-pattern guard — descriptions are timeless

Drift-guard test verifies rule file `description:` fields do **NOT** carry milestone
IDs (`M-Q10`, `M-L9`, `dedup` keyword). Rules are timeless invariants, not sprint-tagged
artifacts. (User caught this antipattern in M-Q9 review.)

## Готово когда

1. `.claude/rules/scope-guard.md` has `globs: []`. Content (≥ 14 KB) fully preserved.
2. `.claude/rules/scope-guard.md` description does NOT carry milestone IDs.
3. `.claude/rules/dev-startup.md` contains Three Hard Rules block + SCOPE VIOLATION REQUEST template (start + end markers).
4. Each of `{backend,frontend,icp,registry}-dev.md` has all 5 required sections (Scope, Architecture Reminders, Verification, Workflow, Git Policy).
5. Each agent file is in slim size range (backend/frontend ≤ 5.5 KB, icp ≤ 6.8 KB, registry ≤ 7.5 KB).
6. Each agent file links to `dev-startup.md` for Workflow.
7. No agent file inlines duplicates (Three Hard Rules header, B1-B7, Level 1/2/3, full SCOPE VIOLATION REQUEST template, 10-step Startup Protocol).
8. `tests/m-q10-dedup-agents.test.ts` drift-guard GREEN (48 tests).
9. `scripts/verify_M-Q10.sh` PASS=28 FAIL=0, idempotent ×2.
10. `tests/m-q8-role-aware-startup.test.ts` size threshold updated (1500 → 2500 chars).

## Метод верификации

### Тип 1: Unit (drift-guard)

- scope-guard.md frontmatter + content + description antipattern
- dev-startup.md frontmatter + Three Hard Rules + escalation template
- 4 agent files: size + 5 sections + dev-startup.md link + dedup invariants
- Each topic source-of-truth invariant (Three Hard Rules only in dev-startup.md/scope-guard.md)

### Тип 2: Acceptance (verify_M-Q10.sh)

- 13 steps × ~28 sub-checks
- Drift-guard runs as step 12
- Baseline vitest as step 13 (no regressions)

## Анти-цели

- НЕ удаляем content из scope-guard.md (architect/reviewer ещё опираются на полную таблицу + GIT/MERGE rules + worktree-isolation описание)
- НЕ удаляем content из engineering-principles.md, backend-architecture.md, rust-error-handling.md и т.д. — это полные references для architect/reviewer; они остаются auto-loaded для своих ролей через role-aware design (см. M-Q8)
- НЕ упрощаем agent файлы до stub'ов — оставляем 5 секций per PROJECT donor pattern
- НЕ добавляем milestone IDs в `description:` rule файлов (timeless invariants)

## После merge

Dev session auto-load:
- backend-dev: 65 → ~50 KB (−15 KB) — close to PROJECT donor 49 KB
- frontend-dev: 58 → ~48 KB (−10 KB)
- icp-dev: similar reduction
- registry-dev: similar reduction
- scope-guard.md: 16.6 KB no longer in dev auto-load (manual reference for architect/reviewer)

PROJECT works fine on MiniMax-M2.7 because each topic lives in ONE auto-loaded source.
After M-Q10, Paxio matches that pattern.

## Worktree commands

```bash
# Initial setup
git -C /home/nous/paxio worktree add /tmp/paxio-mq10 -b feature/M-Q10-dedup-agents origin/dev
cd /tmp/paxio-mq10
git config user.email architect@paxio.network
git config user.name architect
pnpm install

# Verify
pnpm exec vitest run tests/m-q10-dedup-agents.test.ts
bash scripts/verify_M-Q10.sh

# Commit
git add .claude/rules/{scope-guard,dev-startup}.md \
        .claude/agents/{backend,frontend,icp,registry}-dev.md \
        tests/m-q10-dedup-agents.test.ts \
        tests/m-q8-role-aware-startup.test.ts \
        scripts/verify_M-Q10.sh \
        docs/sprints/M-Q10-dedup-agents.md

git commit -m "feat(M-Q10): slim 4 dev agent files via topic dedup; scope-guard.md → manual-load"

# Cleanup after merge
cd /home/nous/paxio
git worktree remove --force /tmp/paxio-mq10
```
