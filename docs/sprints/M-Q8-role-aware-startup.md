# M-Q8 — Dev startup protocol (kill bloated reads for dev sessions)

**Тип**: Quality / context-budget (architect scope only).
**Зависимости**: M-Q7 merged (CLAUDE.md slim baseline).
**Worktree**: `/tmp/paxio-mq8`.
**Branch**: `feature/M-Q8-role-aware-startup`.
**Estimated**: 30 minutes.

## Проблема

`.claude/rules/startup-protocol.md` (1.9 KB, M-Q7) одинаков для всех ролей. Step 3 говорит дев'ам
`grep tech-debt.md`, Step 6 — `head -60 project-state.md`. В реалии каждая «строка» этих файлов =
абзац 1000-3000 символов:

- `grep '🔴 OPEN' tech-debt.md | head -10` → ~8K tokens (10 параграфов)
- `head -60 project-state.md` → ~12K tokens
- `head -100 tech-debt.md` → ~15K tokens

Дев на minimax-m2.7 хватает компакта **до того как прочитает свою спеку** — мы это видели в нескольких
сессиях. Корень: дев'у эти файлы **в принципе не нужны**. `tech-debt.md` использует reviewer для записи
+ architect для назначения task'ов. `project-state.md` — reviewer обновляет, architect читает при
scan'е следующего milestone. Дев impl'ит конкретный task с конкретными файлами от architect. История
merge'ей и список долгов на impl не влияют.

## Решение — role-aware split (только dev)

```
.claude/rules/startup-protocol.md  →  globs: []  (deprecated stub, redirect)
.claude/rules/dev-startup.md       →  globs: ["apps/**/*.{ts,tsx,cjs,js}",
                                              "products/**/*.{ts,js,rs}",
                                              "packages/**/*.{ts,tsx}",
                                              "platform/**/*.rs"]
                                      (auto-loads на dev paths, ≤1.5 KB)
```

**dev-startup.md** содержит ровно 5 шагов: worktree → identity → read только-что-задал-architect →
impl → commit. Явно ЗАПРЕЩАЕТ читать `tech-debt.md`, `project-state.md`, `docs/feature-areas/`,
`docs/sprints/M-XX.md` whole.

**Architect** уже имеет 7-шаговый scan в `.claude/rules/architect-protocol.md::ФАЗА 1` (через
`architect.md::Required reads`). Менять нечего.

**Reviewer** имеет Phase 0 + Phase N gates inline в `.claude/agents/reviewer.md`. Менять нечего
(per user direction — out of M-Q8 scope).

## Готово когда

1. `.claude/rules/dev-startup.md` существует, frontmatter `globs:` matches dev paths only
   (apps/**, products/**, packages/**, platform/**), НЕ matches `docs/**`. Файл ≤ 1500 байт.
   Содержит явные строки:
   - запрет `tech-debt.md`
   - запрет `project-state.md`
   - запрет `docs/feature-areas/`
   - workflow 5 шагов: worktree, identity, read-only-assigned, impl-to-GREEN, commit-local
   - напоминание «no push, no gh pr» (architect handles)

2. `.claude/rules/startup-protocol.md` имеет `globs: []` (deprecated, не auto-load'ится).
   Содержимое — короткий redirect stub (≤ 800 байт) на `dev-startup.md` + ссылки на architect /
   reviewer protocols.

3. `tests/m-q8-role-aware-startup.test.ts` drift-guard GREEN — проверяет all of the above.

4. `scripts/verify_M-Q8.sh` PASS=N FAIL=0 + idempotent ×2.

## Метод верификации

### Тип 1: Unit / drift-guard

`tests/m-q8-role-aware-startup.test.ts` — RED → GREEN после impl:
- dev-startup.md exists + frontmatter narrow + size limit + content invariants
- startup-protocol.md has `globs: []` + redirect stub size limit + redirects to dev-startup.md

### Тип 2: Acceptance (`scripts/verify_M-Q8.sh`)

- 2 файла существуют (dev-startup.md, startup-protocol.md updated)
- Frontmatter parsing checks
- Size constraints
- Content greps (forbidden strings absent in dev-startup or present where required)
- Drift-guard test GREEN
- Idempotent ×2

## Анти-цели

- НЕ переписываем `tech-debt.md` / `project-state.md` (reviewer scope; будет M-Q9 если нужен)
- НЕ создаём `architect-startup.md` или `reviewer-startup.md` (out of scope per user direction
  2026-04-28: «реевьювера оставь как он был. меняем только работу девов»)
- НЕ трогаем `.claude/agents/{architect,reviewer,backend-dev,frontend-dev,icp-dev,registry-dev}.md`
- НЕ удаляем `startup-protocol.md` — переводим в deprecated stub чтобы legacy ссылки не ломались

## После merge

Backend/frontend/icp/registry dev сессии auto-load'ят dev-startup.md (~1 KB) вместо
startup-protocol.md (~1.9 KB) с инструкциями читать bloated docs. Дев не открывает tech-debt.md /
project-state.md, экономит **~30K tokens на каждой сессии**.

Architect/reviewer workflows unchanged.

## Architecture Requirements

| # | Task | Agent | Files | Verification |
|---|------|-------|-------|-------------|
| 1 | Create dev-startup.md, deprecate startup-protocol.md | architect | `.claude/rules/dev-startup.md`, `.claude/rules/startup-protocol.md` | RED test GREEN, frontmatter matches |
| 2 | Drift-guard test | architect | `tests/m-q8-role-aware-startup.test.ts` | vitest run GREEN |
| 3 | Acceptance script | architect | `scripts/verify_M-Q8.sh` | PASS=N FAIL=0 |
