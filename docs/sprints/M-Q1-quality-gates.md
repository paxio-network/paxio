# M-Q1 — Quality Gates (Turborepo-aware)

> Mixed milestone (architect + backend-dev). Замени agent-promise на детерминистический скрипт + механический pre-commit hook + CI gate update. Решает класс проблемы «test-runner на Haiku забыл запустить root vitest» который проявился на M-L9 (3 раунда rejection из-за same gap).

## Готово когда:

- `bash scripts/quality-gate.sh <milestone>` запускает ВСЕ 6 шагов в правильном порядке и фейлится при первом не-ok пункте (single command, exit code = overall status)
- `.husky/pre-commit` блокирует commit при:
  - diff в `apps/frontend/*/tests/`, `tests/`, `products/*/tests/` если `git config user.email` ≠ `architect@paxio.network`
  - diff в `docs/{sprints,feature-areas,fa-registry,NOUS_*}.md` если email ≠ architect
  - diff в `docs/{tech-debt,project-state}.md` если email ≠ reviewer
  - diff в `.claude/`, `CLAUDE.md` если email ∉ {architect, reviewer}
  - mismatch `git config user.name` ↔ `git config user.email` (mapping table в hook)
- `.github/workflows/ci-frontend-landing.yml` (и parallel ci-frontend-*.yml для остальных 7 apps) запускает root `pnpm exec vitest run` ДОПОЛНИТЕЛЬНО к per-app
- `tests/quality-gate.test.ts` GREEN: drift-guard на `scripts/quality-gate.sh` (все 6 mandatory шагов присутствуют + правильный порядок + exit codes propagated)
- Test-runner агент-файл (`.claude/agents/test-runner.md`) указывает «единственная команда: `bash scripts/quality-gate.sh <milestone>`» вместо checklist'а
- M-L9 chain re-verified — `bash scripts/quality-gate.sh M-L9` PASS=N FAIL=0

## Метод верификации (Тип 1 + Тип 2)

### Тип 1: Drift-guard tests
- `tests/quality-gate.test.ts` (NEW, architect) — runtime parse `scripts/quality-gate.sh` через `fs.readFileSync` + assertions:
  - содержит `pnpm typecheck` команду
  - содержит `pnpm exec vitest run` (root, не filter!) команду
  - содержит per-app filter loop через `git diff --name-only`
  - содержит `pnpm --filter @paxio/<app>-app test` pattern
  - содержит `pnpm --filter @paxio/<app>-app build` pattern
  - содержит `bash scripts/verify_<milestone>.sh` invocation
  - имеет `set -euo pipefail`
  - exit code propagation корректный (no `|| true` на критических командах)
- `tests/pre-commit-hook.test.ts` (NEW, architect) — parse `.husky/pre-commit`:
  - blocks tests/* writes для не-architect
  - blocks docs/sprints/* для не-architect
  - blocks docs/tech-debt.md для не-reviewer
  - identity name↔email mapping enforced

### Тип 2: Acceptance scripts
- `scripts/verify_quality_gates.sh` (NEW, architect) — E2E:
  - Запускает `bash scripts/quality-gate.sh M-L9` на текущей HEAD → exit 0 + PASS=N FAIL=0
  - Имитирует violation: `git config user.email frontend-dev@paxio.network`, `touch tests/fake.test.ts`, `git add` → `git commit` должен **fail** с message о scope violation
  - Восстанавливает identity, retry → должен success
  - Идемпотентный (cleanup в trap)

## Зависимости

- M-L9 GREEN (последний reviewer pass) — needs to land first для testing M-Q1 на чистой ветке
- pnpm + Husky уже установлены (`package.json::husky` есть)
- GitHub Actions workflows existing (паттерн ci-backend.yml `dorny/paths-filter`)

## Архитектура

### `scripts/quality-gate.sh` — single source of truth

```bash
#!/usr/bin/env bash
# Detrministic quality gate. test-runner runs ONLY this command.
# Replaces .claude/agents/test-runner.md mandatory-checklist (which Haiku
# can ignore). bash exit code IS the answer.
set -euo pipefail

MILESTONE="${1:?usage: quality-gate.sh <milestone>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0; FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

# 1. Typecheck — must pass
step "1/6 pnpm typecheck"
pnpm typecheck > /tmp/qg-typecheck.log 2>&1 \
  && ok "typecheck clean" \
  || { bad "typecheck failed (see /tmp/qg-typecheck.log)"; exit 1; }

# 2. Root vitest — must pass (catches workspace config drift)
step "2/6 pnpm exec vitest run (ROOT)"
pnpm exec vitest run > /tmp/qg-root-vitest.log 2>&1 \
  && ok "root vitest GREEN" \
  || { bad "root vitest RED (see /tmp/qg-root-vitest.log)"; exit 1; }

# 3-4. Per-app test + build for each touched frontend app
step "3-4/6 per-app test + build for changed frontend apps"
APPS=$(git diff --name-only "origin/dev..HEAD" 2>/dev/null \
       | grep -oE '^apps/frontend/[^/]+' \
       | sort -u | sed 's,apps/frontend/,,')
if [ -z "$APPS" ]; then
  ok "no frontend apps touched — skipping per-app gates"
else
  for app in $APPS; do
    pnpm --filter "@paxio/${app}-app" test > "/tmp/qg-${app}-test.log" 2>&1 \
      && ok "${app} test GREEN" \
      || { bad "${app} test RED (see /tmp/qg-${app}-test.log)"; exit 1; }
    pnpm --filter "@paxio/${app}-app" build > "/tmp/qg-${app}-build.log" 2>&1 \
      && ok "${app} build OK" \
      || { bad "${app} build FAILED (see /tmp/qg-${app}-build.log)"; exit 1; }
  done
fi

# 5. cargo test if Rust touched
step "5/6 cargo test --workspace (if Rust touched)"
if git diff --name-only "origin/dev..HEAD" 2>/dev/null \
   | grep -qE '^(products/.*/canister|platform/canister-shared|Cargo)'; then
  cargo test --workspace > /tmp/qg-cargo.log 2>&1 \
    && ok "cargo test GREEN" \
    || { bad "cargo test RED (see /tmp/qg-cargo.log)"; exit 1; }
else
  ok "no Rust changes — skipping cargo"
fi

# 6. Acceptance script for milestone
step "6/6 bash scripts/verify_${MILESTONE}.sh"
ACC="scripts/verify_${MILESTONE}.sh"
if [ ! -x "$ACC" ]; then
  bad "no acceptance script at $ACC"; exit 1
fi
bash "$ACC" > /tmp/qg-acceptance.log 2>&1 \
  && ok "acceptance PASS (full log: /tmp/qg-acceptance.log)" \
  || { bad "acceptance FAIL — tail:"; tail -20 /tmp/qg-acceptance.log; exit 1; }

echo
echo "─────────────────────────────────────────────"
echo "QUALITY GATE — $MILESTONE — PASS=$PASS FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ]
```

### `.husky/pre-commit` — identity + scope hook

```bash
#!/usr/bin/env bash
# Mechanical scope/identity enforcement. Cannot be bypassed by LLM forgetting.
set -euo pipefail

NAME=$(git config user.name)
EMAIL=$(git config user.email)
DIFF=$(git diff --cached --name-only)

# Identity mapping table — name MUST match email
declare -A NAME_EMAIL=(
  [architect]="architect@paxio.network"
  [reviewer]="reviewer@paxio.network"
  [backend-dev]="backend-dev@paxio.network"
  [frontend-dev]="frontend-dev@paxio.network"
  [icp-dev]="icp-dev@paxio.network"
  [registry-dev]="registry-dev@paxio.network"
  [test-runner]="test-runner@paxio.network"
)
expected_email="${NAME_EMAIL[$NAME]:-}"
if [ -n "$expected_email" ] && [ "$EMAIL" != "$expected_email" ]; then
  echo "❌ identity mismatch: name=$NAME but email=$EMAIL (expected $expected_email)"
  exit 1
fi

# Scope rules — file pattern → allowed identities
check_scope() {
  local pattern="$1"; shift
  local allowed_emails="$*"
  local matches
  matches=$(echo "$DIFF" | grep -E "$pattern" || true)
  if [ -n "$matches" ]; then
    if ! echo " $allowed_emails " | grep -q " $EMAIL "; then
      echo "❌ scope violation: $EMAIL cannot modify files matching $pattern"
      echo "   Files:"; echo "$matches" | sed 's,^,     ,'
      echo "   Allowed: $allowed_emails"
      exit 1
    fi
  fi
}

check_scope '^(tests/|products/.*/tests/|apps/frontend/.*/tests/)' "architect@paxio.network"
check_scope '^docs/(sprints|feature-areas|fa-registry|NOUS_)' "architect@paxio.network"
check_scope '^docs/(tech-debt|project-state)\.md' "reviewer@paxio.network"
check_scope '^\.claude/' "architect@paxio.network reviewer@paxio.network"
check_scope '^CLAUDE\.md' "architect@paxio.network reviewer@paxio.network"

echo "✅ pre-commit checks passed (identity=$NAME, scope clean)"
```

### CI gate update

`.github/workflows/ci-frontend-*.yml` (8 файлов — landing, registry, pay, radar, intel, docs, wallet, fleet) добавить шаг ДО per-app test:

```yaml
      - name: Root vitest (catches workspace config drift)
        run: pnpm exec vitest run
```

Это гарантирует что Gate 2 проверяется на CI каждый раз — независимо от test-runner агента.

### `.claude/agents/test-runner.md` — упростить

Заменить mandatory checklist на единственную команду:

```markdown
## Workflow

Single command:
    bash scripts/quality-gate.sh <milestone>

Exit code = overall status. Output = breakdown по 6 шагам с PASS/FAIL counts.
Stdout уже structured — копируй в report как есть, не интерпретируй.

## Boundaries

- Запускает ТОЛЬКО `quality-gate.sh`. Не выбираешь команды сам.
- Если script отсутствует → REPORT: «no quality-gate.sh для milestone X», STOP.
- НЕ модифицируешь scripts/quality-gate.sh — это architect's зона.
```

## Tasks

| # | Кто | Что | Где | Verification | Architecture Requirements |
|---|-----|-----|-----|---|---|
| T-1 | architect | Milestone doc + scripts/quality-gate.sh + RED drift-guard тест | этот файл, `scripts/quality-gate.sh`, `tests/quality-gate.test.ts`, `scripts/verify_quality_gates.sh` | this PR | bash strict mode, exit propagation, single source of truth |
| T-2 | architect | `.husky/pre-commit` + `package.json::{scripts.prepare,devDependencies.husky}` + drift-guard test | `.husky/pre-commit`, `package.json`, `tests/pre-commit-hook.test.ts` | `tests/pre-commit-hook.test.ts` GREEN + manual violation smoke (identity mismatch + scope violation + happy path) | mechanical, no LLM dependency, fail-closed, Bash 3.2 compatible (no associative arrays — uses `case`) |
| T-3 | architect | Update 8× ci-frontend-*.yml + ci-backend.yml + .claude/agents/test-runner.md | `.github/workflows/`, `.claude/agents/test-runner.md` | acceptance включает CI lint pass | path-filter preserved, root vitest before per-app |
| T-4 | architect | Update `.claude/rules/scope-guard.md` — добавить ссылку на mechanical hook | `.claude/rules/scope-guard.md` | manual review | docs reflect new enforcement layer |

> **T-2 reassignment note (2026-04-26):** Originally assigned to `backend-dev`. backend-dev correctly identified that `.husky/` is outside their file-ownership table (CLAUDE.md::File Ownership) — `.husky/` is meta-tooling enforcing scope-guard rules, not backend feature code. backend-dev stopped after `package.json` edit and emitted a `!!! SCOPE VIOLATION REQUEST !!!` for the hook itself. Architect (this commit) takes ownership: hook is conceptually adjacent to `scripts/verify_*.sh` + `.claude/rules/` which architect already owns.

## Предусловия среды

- [x] Husky установлен (есть в `package.json::devDependencies`)
- [x] GitHub Actions workflows существуют
- [x] M-L9 PR #37 merged в dev (для clean baseline) — **зависимость**, поэтому M-Q1 стартует ПОСЛЕ M-L9 mergeд

## Не делаем в M-Q1

- Полная миграция test-runner на другой LLM provider (Sonnet/Opus). Mechanical hook + script делает уровень модели менее критичным.
- Vercel deploy gates — отдельный milestone M-Q2 если потребуется
- E2E playwright fixtures — out of scope (M-L11 обещался отдельно)

## Tech debt expected

- TD candidate: pre-commit hook отнимает 1-2s на каждый commit (sync bash). Если станет hot — перенести в lefthook (parallel runner)
- TD candidate: identity mapping table дублируется между hook и `.claude/rules/scope-guard.md`. После landing — синхронизировать через generated file (single source = JSON в `.claude/identities.json`)
