# M-Q12 — Slim CLAUDE.md by extracting reference sections to `docs/architecture/`

**Тип**: Quality / context-budget (architect scope only).
**Зависимости**: M-Q11 merged.
**Worktree**: `/tmp/paxio-mq12`.
**Branch**: `feature/M-Q12-slim-claude-md`.
**Estimated**: 30 min.

## Проблема

User report 2026-04-28: после `/clear` + paste prompt'а backend-dev session
показал «15% контекста» (post-M-Q11; was 12% pre-M-Q11). MiniMax-M2.7 CLI
по-прежнему близко к compact-threshold ещё до начала работы.

User insight: «у нас наступили проблемы, кога мы учили агентов работать с
турборипо» — bloat related to teaching agents about Turborepo / monorepo
structure.

## Корневая причина

CLAUDE.md = 12.5 KB project instructions, auto-loads на каждой агент-сессии
вне зависимости от роли. Половина файла — reference content который
архитекторы / реви читают вручную при необходимости:

| Section | Pre-M-Q12 | Кто использует | Action |
|---|---|---|---|
| Vision → Code Chain | 13 lines | All (orientation) | KEEP |
| Workflow | 7 lines | All | KEEP |
| Team | 14 lines | All (scope) | KEEP |
| Tech Stack (table) | 17 lines | All (orientation) | COMPACT (1 line) |
| Products (7 Layers) | 11 lines | All (orientation) | KEEP (compact) |
| Architecture Principles | 10 lines | All | KEEP |
| File Ownership | 10 lines | All | KEEP |
| УСТАВНЫЕ ДОКУМЕНТЫ | 4 lines | All | KEEP |
| **Build Commands (full inventory)** | **52 lines** | Architect setup | EXTRACT → docs/ |
| Branch Model | 10 lines | All | KEEP |
| **CI/CD (full table)** | **13 lines** | Architect/reviewer | EXTRACT → docs/cicd.md |
| **Why monorepo (rationale)** | **10 lines** | Architect | EXTRACT → MONOREPO.md |
| **Принцип ICP (rationale)** | **15 lines** | Architect | EXTRACT → ICP-PRINCIPLE.md |

Pre-M-Q12 total: ~12500 chars
Post-M-Q12 target: ≤ 7700 chars

## Решение

### Part 1: extract reference sections к docs/architecture/

- `docs/architecture/BUILD-COMMANDS.md` (NEW, ~2 KB) — full pnpm/cargo/turbo command inventory
- `docs/architecture/ICP-PRINCIPLE.md` (NEW, ~1 KB) — «ICP только там где надо» rationale + 5-question checklist
- `docs/architecture/MONOREPO.md` (already exists) — full monorepo layout

### Part 2: surgical CLAUDE.md cuts

- Tech Stack table → 1-line «Stack — short form» summary
- Products (7 Layers) → compact 7-row table (one line per product)
- Architecture Principles → 8 numbered lines с keyword + brief
- Build Commands → 1 «Build (Turborepo + pnpm)» 6-line code block keeping ALL Turborepo keywords (per M-Q5 invariant: `Turborepo`, `pnpm turbo`, `--filter=@paxio`, `Vercel Monorepo Projects`)
- CI/CD section → 1 line + link to `docs/cicd.md`
- Why monorepo + ICP rationale → removed (extracted)

### Part 3: invariants preserved (drift-guard verifies)

- All 7 agents in File Ownership table (architect, backend-dev, icp-dev, registry-dev, frontend-dev, test-runner, reviewer)
- All 8 Architecture Principles (Three-layer, Backend server/+app/, Non-custodial, LLM-free, Data externalization, No hardcoded values, Onion deps, ICP only where needed)
- УСТАВНЫЕ ДОКУМЕНТЫ list complete
- Both merge gates documented (`feature/* → dev` autonomous + `dev → main` user-only)
- M-Q5 Turborepo keywords inline (Turborepo, pnpm turbo, --filter=@paxio, Vercel Monorepo Projects)

## Готово когда

1. `CLAUDE.md` в slim range [5500, 7700] chars (was ~12500).
2. `docs/architecture/BUILD-COMMANDS.md` exists, ≥ 500 bytes content.
3. `docs/architecture/ICP-PRINCIPLE.md` exists, ≥ 500 bytes content.
4. CLAUDE.md links to BUILD-COMMANDS.md, ICP-PRINCIPLE.md, MONOREPO.md, docs/cicd.md.
5. All 7 agents present in File Ownership table.
6. All 8 Architecture Principles preserved.
7. Both merge gates documented.
8. M-Q5 invariant: Turborepo keywords inline (existing test `context-budget-drift.test.ts` GREEN).
9. `tests/m-q12-slim-claude-md.test.ts` drift-guard GREEN (33 tests).
10. `scripts/verify_M-Q12.sh` PASS=26 FAIL=0.
11. Baseline vitest GREEN (1093 passed, no regressions).

## Метод верификации

### Тип 1: Unit (drift-guard)

- CLAUDE.md size in range
- Required sections preserved
- Extracted docs exist
- Links correct
- All 7 agents + 8 principles + both merge gates

### Тип 2: Acceptance

- 8 шагов × 26 sub-checks
- Drift-guard runs as step 7
- Baseline as step 8

## Анти-цели

- НЕ удаляем content который другие тесты ожидают (M-Q5 Turborepo invariant
  preserved — `pnpm turbo`, `--filter=@paxio`, `Vercel Monorepo Projects` остаются inline)
- НЕ убираем УСТАВНЫЕ ДОКУМЕНТЫ section — security boundary
- НЕ модифицируем `docs/architecture/MONOREPO.md` (pre-existing, not in scope)

## После merge

System prompt at /clear:

| Component | Pre-M-Q12 | Post-M-Q12 | Saving |
|---|---|---|---|
| CLAUDE.md | 12.5 KB | 7.0 KB | **−44%** |
| Agent file (post-M-Q10/Q11) | 4.7 KB | 4.7 KB | — |
| **Paxio config total** | **~17 KB** | **~12 KB** | **−30%** |

Cumulative reduction since M-Q4:
- Pre-M-Q4: ~85 KB Paxio config eager-load
- Post-M-Q12: ~12 KB Paxio config eager-load
- **−86%** total reduction

Remaining bloat is platform-side: Claude Code system prompt baseline + tool
schemas + MCP server registrations (Gmail/Calendar/Drive eagerly loaded by
MiniMax-M2.7). User-side config recommendation: disable unused MCP servers
when doing Paxio dev sessions.

## Worktree commands

```bash
git worktree add /tmp/paxio-mq12 -b feature/M-Q12-slim-claude-md origin/dev
cd /tmp/paxio-mq12
git config user.email architect@paxio.network
pnpm install --frozen-lockfile

# Verify
pnpm exec vitest run tests/m-q12-slim-claude-md.test.ts tests/context-budget-drift.test.ts
bash scripts/verify_M-Q12.sh

# Commit + push + PR (architect-only)
git add CLAUDE.md \
        docs/architecture/BUILD-COMMANDS.md \
        docs/architecture/ICP-PRINCIPLE.md \
        tests/m-q12-slim-claude-md.test.ts \
        scripts/verify_M-Q12.sh \
        docs/sprints/M-Q12-slim-claude-md.md
git commit -m "feat(M-Q12): slim CLAUDE.md by extracting reference sections"
git push -u origin feature/M-Q12-slim-claude-md
gh pr create ...
```
