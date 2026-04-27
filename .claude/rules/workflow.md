---
description: Full development workflow — task types, verification, two merge gates, branch model, CI/CD pipeline. Architect / reviewer reference. Manual-load only.
globs: []
---

# Полный цикл разработки — от плана до завершения

Два типа задач, два метода верификации, один workflow.

## Тип 1: Логика (unit-testable)

Задачи где можно написать unit-тест: domain functions, application logic, validation, parsers,
Rust canister logic.
Метод верификации: **unit test RED → GREEN**

### Architect:
0. **Setup per-session worktree** (M-Q3): `git worktree add /tmp/paxio-<name> -b feature/M-XX-name origin/dev` → cd → `git config user.email architect@paxio.network` → `pnpm install`. См. `architect-protocol.md::ФАЗА 0`.
1. Выполнить scan протокол
2. Создать milestone в `docs/sprints/M0X-*.md`
3. Написать RED тесты в `tests/*.test.ts`, `products/*/tests/**/*.test.ts`, Rust tests
4. **КОММИТИТЬ milestone + контракты + тесты ДО запуска dev-агентов**
5. Указать в milestone: "Метод верификации: unit test"

### Dev-агент:
0. **Setup per-session worktree** (M-Q3): `git worktree add /tmp/paxio-<dev>-<milestone> origin/feature/M-XX-name` → cd → `git config user.email <agent>@paxio.network` → `pnpm install`. Если architect уже создал worktree и передал путь — checkout того же пути в свой подкаталог через `git worktree add`. См. `startup-protocol.md::Step 0`.
1. Выполнить startup protocol
2. Прочитать ТЕСТЫ — это спецификация
3. Реализовать код → тест GREEN
4. Коммитить после каждого GREEN теста
5. Сказать "готово"

### User → test-runner:
1. `bash scripts/quality-gate.sh <milestone-id>` — **единственная** команда (см. `.claude/agents/test-runner.md`)
2. Script сам запускает 6 gates: typecheck → root vitest → per-app test/build (для затронутых apps) → cargo (если Rust) → acceptance
3. Exit 0 = ALL GREEN, exit non-0 = RED → dev фиксит

### User → reviewer:
1. `git diff --name-only` — scope check
2. `git diff tests/ products/*/tests/` — тесты не изменены?
3. Quality check
4. APPROVED → обновляет `docs/project-state.md`

---

## Тип 2: Интеграция/инфраструктура (среда = тест)

Задачи где unit-тест невозможен: DB migrations, Docker setup, API health,
ICP canister deploy, Bitcoin testnet flow, Vercel deploy pipeline.
Метод верификации: **acceptance script FAIL → PASS**

### Architect:
1. Выполнить scan протокол
2. Создать milestone
3. **Подготовить среду:**
   - `pnpm install` + `cargo build --workspace`
   - Docker stack (PostgreSQL, Redis, Qdrant)
   - dfx replica (если canister)
   - Записать предусловия в milestone
4. Написать **acceptance script** в `scripts/verify_<milestone-id>.sh`:
   ```bash
   #!/usr/bin/env bash
   # M01 acceptance — descriptive name (header tag for fallback discovery)
   set -euo pipefail
   PASS=0; FAIL=0
   ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
   bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
   # ... steps ...
   echo "M01 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
   [ $FAIL -eq 0 ] || exit 1
   ```

   Naming convention: `scripts/verify_<MILESTONE-ID>.sh` (e.g.
   `verify_M-L9.sh`, `verify_M-Q1.sh`). Header `# M-XX acceptance — ...`
   делает script discoverable через `quality-gate.sh` fallback даже если
   имя descriptive (`verify_landing_design_port.sh` для M-L9 — header
   `# M-L9 acceptance — Landing Design Port` ловит fallback'ом).

5. **КОММИТИТЬ milestone + script ДО запуска dev-агентов**

### Dev-агент:
1. Выполнить startup protocol
2. Прочитать milestone + acceptance script
3. Реализовать
4. Запустить script: `bash scripts/verify_xxx.sh`
5. Если PASS → коммитить
6. Сказать "готово"

---

## Full Cycle (M-Q2 expanded — adds Phase 0 spec-pass)

```
0. Architect: написал spec (RED tests + contracts + acceptance) → COMMIT + push
   → создал PR с label `spec-ready`
   → spec-review.yml fast-CI runs (~90s: frozen-lockfile + typecheck + root vitest)
   ↓
1. Architect: SELF-CALL reviewer Phase 0 (sub-agent через Agent({ subagent_type: "reviewer" }))
   → reviewer walks coding-standards-checklist.md (P0 → P1 → P2)
   → output: SPEC APPROVED / SPEC REJECTED + must-fix list
   → REJECTED: architect фикшит → re-invoke (max 3 rounds → escalate to user)
   → APPROVED: gh pr edit --add-label dev-ready → handoff user'у
   ↓
2. Dev: реализует код → тест GREEN → КОММИТИТ в feature-ветку
   ↳ pre-commit hook (.husky/pre-commit) проверяет identity + scope
     перед каждым commit'ом. mismatch / scope violation → commit blocked
   ↳ Architect-only: pre-commit catches lockfile drift (M-Q2 T-3)
3. Dev: все задачи done → говорит "готово"
4. User: запускает test-runner → "Проверь"
5. test-runner: `bash scripts/quality-gate.sh <milestone>` (одна команда)
   → копирует stdout в report → STATUS = exit code
6. User: запускает reviewer Phase N → "Review от [agent]"
7. Reviewer Phase N: scope, тесты не изменены, quality →
   APPROVED: коммитит обновлённый project-state.md + tech-debt.md
8. Architect (если APPROVED, all must-fix done, CI green):
   `gh pr merge N --merge` → feature/* мержится в dev САМОСТОЯТЕЛЬНО, без явного OK от user
9. User: решает когда `dev → main` (релиз). После явного OK от user
   (с PR номером) → architect выполняет `gh pr merge M --merge` для PR `dev → main`
```

**Phase 0 = NEW gate (M-Q2)** между «architect committed» и «dev starts». Catches spec
bugs ДО того как dev burned 2-4 hours. Closes class of TD-30 (architect modifies own
tests under pressure) — once Phase 0 APPROVED, тесты frozen externally.

**Phase N = existing gate** (after dev impl) — preserved without changes.

## Quality Gate (M-Q1) — одна команда для test-runner

```bash
bash scripts/quality-gate.sh <milestone-id>
```

Детерминистический bash скрипт который:
1. `pnpm typecheck`
2. `pnpm exec vitest run` (ROOT — не per-app filter!)
3. `pnpm --filter @paxio/<app>-app test` для каждого затронутого app
4. `pnpm --filter @paxio/<app>-app build` для каждого затронутого app
5. `cargo test --workspace` если Rust touched (`products/*/canister*`, `platform/canister-shared`, `Cargo.{toml,lock}`)
6. `bash scripts/verify_<milestone>.sh` — acceptance с PASS=N FAIL=M breakdown

Apps определяются через `git diff --name-only origin/dev..HEAD | grep ^apps/frontend/`. Turborepo-aware, не hardcoded list.

Exit code 0 = ALL GREEN. Non-0 = RED. fail-fast (первый ❌ останавливает).

**Test-runner агент НЕ выбирает что запускать.** Только этот script. Если script отсутствует — STATUS «🔴 INFRASTRUCTURE — quality-gate.sh missing». См. `.claude/agents/test-runner.md`.

## Pre-commit hook (M-Q1 T-2) — mechanical scope enforcement

`.husky/pre-commit` блокирует commit на этапе git если:
- diff в `tests/`, `products/*/tests/`, `apps/frontend/*/tests/` — только architect identity
- diff в `docs/{sprints,feature-areas,fa-registry,NOUS_*}.md` — только architect
- diff в `docs/{tech-debt,project-state}.md` — только reviewer
- diff в `.claude/`, `CLAUDE.md` — architect или reviewer
- mismatch между `git config user.name` ↔ `git config user.email` (mapping table в hook)

Hook не зависит от LLM-памяти. Не нужно «помнить» scope-guard.md — git сам отказывается принимать commit. Это страховка от 8+ рецидивов TD-22/28/30 которые были на M-L9.

## E2E Verification (для интеграционных milestones)

После unit GREEN + acceptance PASS:
- E2E verification в тестовой среде (Docker, ICP testnet, Bitcoin regtest)
- E2E сценарии: `docs/e2e/*.md`
- E2E пройден → milestone ВЫПОЛНЕН

## Если что-то пошло не так

### test-runner нашёл RED (unit):
→ Dev фиксит → test-runner снова → цикл пока GREEN

### test-runner: acceptance FAIL:
→ Dev проверяет свой код
→ Если проблема в чужом модуле → `!!! SCOPE VIOLATION REQUEST !!!`

### reviewer нашёл scope violation:
→ Уровень 1 (уставные docs): REJECT, откат
→ Уровень 2 (чужой код + `!!! REQUEST !!!`): tech-debt
→ Уровень 3 (молча): оценка + tech-debt

### reviewer нашёл quality issue:
→ Записывает в `tech-debt.md` (owner + описание)
→ Architect пишет тест для этого долга
→ Dev при следующем startup видит OPEN + тест → фиксит

### E2E FAIL:
→ Architect создаёт hotfix milestone

### Всё GREEN + PASS + APPROVED:
→ Architect: `gh pr merge N --merge` → `feature/* → dev` (автоматически, без OK от user)
→ Architect: milestone ВЫПОЛНЕН (на уровне dev)
→ Следующий milestone
→ Когда user решит релизить (на любом этапе) → user OK → architect `gh pr merge M --merge` для `dev → main`

## Branch Model

```
feature/* → dev → main
```

- **feature/\*** — одна фича, создаётся от dev
- **dev** — рабочая интеграционная ветка
- **main** — релизная (tagged v*)
- **Push + PR creation = architect + user.** Dev-агенты (`backend-dev`, `frontend-dev`, `icp-dev`, `registry-dev`) работают только локально: commit → «готово». Они НЕ делают `git push`, НЕ создают PR, НЕ вызывают `gh *`. Architect после hand-off делает `git push` + `gh pr create` от своего имени (cм. «Git Policy» в `.claude/agents/<dev>.md`). Это убирает credential leak surface + единый audit trail + architect ревьюит diff до публикации.
- **Two merge gates** (см. `scope-guard.md::GIT & MERGE`):
  - **`feature/* → dev`**: architect мержит **сам автоматически** после reviewer APPROVED + must-fix закрыты + CI green. Не нужен OK от user. Снимает round-trip bottleneck для параллельных milestones.
  - **`dev → main`**: ТОЛЬКО после явного OK от user с PR номером. Релиз = продуктовое решение.
  - `git push --force` dev/main — ЗАПРЕЩЕНО всегда, без исключений.
