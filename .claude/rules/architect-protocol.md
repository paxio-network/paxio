---
description: Architect scan protocol (7 phases), milestone creation rules, architecture enforcement via tests. Architect-only. Manual-load only.
globs: []
---

# Architect Protocol — ОБЯЗАТЕЛЬНЫЙ при каждом планировании

Этот файл существует чтобы критические знания architect'а не терялись
при компакции контекста. Rules перезагружаются по glob — agent.md нет.

---

## ФАЗА 0: SETUP (per-session worktree isolation)

### 0.1 — Создай личный worktree ПЕРЕД любой работой

`/home/nous/paxio` — общая репа, в которой одновременно могут работать
несколько агент-сессий (architect + dev в параллели, два architect'а в
параллельных feature ветках, etc). Работа в shared working tree приводит к
трём классам багов:

1. **Cross-user chmod EPERM** — `pnpm install`, `node scripts/copy-api-handlers.mjs`
   и `pnpm test:specs` модифицируют `node_modules/` через `chmod`. Если файлы
   принадлежат другому OS user'у (другая сессия запускала install), chmod
   падает с `EPERM: operation not permitted`. Group `devteam` НЕ помогает —
   chmod требует owner или root, group bit даёт только rw, не chmod.

2. **Branch race condition** — пока твой reviewer гонит проверку, другая
   сессия checkout'ит свою feature-ветку в `/home/nous/paxio` → твой
   следующий commit уходит в чужую ветку. Случалось у registry-dev session
   2026-04-27.

3. **Untracked WIP leakage** — untracked файлы прошлой сессии видны в твоём
   `git status`, и можно случайно их закоммитить (registry-dev attempt-1 →
   5 файлов scope violations).

Worktree даёт **separate HEAD per session**, **isolated branch**, **own node_modules/**.

### 0.2 — Команда setup

```bash
cd /home/nous/paxio
git fetch origin
git worktree add /tmp/paxio-<milestone-name> -b feature/M-XX-name origin/dev
cd /tmp/paxio-<milestone-name>
git config user.name architect
git config user.email architect@paxio.network
pnpm install                     # fresh node_modules в worktree, no chmod conflicts
```

Worktree даёт **separate HEAD per session** — твоя ветка изолирована от
любых checkout'ов в `/home/nous/paxio`.

Где `<milestone-name>` — короткое уникальное имя сессии (например `mq3`,
`m-l1-launch`, `td35-fix`). НЕ переиспользуй существующие имена `/tmp/paxio-*`
от других сессий — `git worktree list` покажет занятые.

### 0.3 — Cleanup после merge

```bash
cd /home/nous/paxio                              # вернуться в main checkout
git worktree remove --force /tmp/paxio-<name>    # удалит каталог + запись
git worktree prune                               # если каталог удалён руками
```

`--force` обязателен потому что Paxio имеет initialized git submodule в
`products/04-security/guard/`. Без `--force` git отказывает с
`fatal: working trees containing submodules cannot be moved or removed`.
Это безопасно — `--force` удаляет только worktree directory, не
оригинальный submodule в main checkout.

### 0.4 — Когда worktree можно НЕ создавать

Только если user явно сказал «работай в /home/nous/paxio» и подтвердил, что
других активных сессий нет. По умолчанию — worktree.

---

## ФАЗА 1: SCAN (понять текущее состояние)

### 1.1 — Tech-debt ПЕРВЫМ ДЕЛОМ
```
1. cat docs/tech-debt.md
2. Найди OPEN где "Тест на fix" пустая или "architect напишет"
3. Для КАЖДОЙ — напиши падающий тест
4. Обнови tech-debt.md: колонку "Тест на fix" → имя теста
5. Коммитни тесты
6. ТОЛЬКО ПОСЛЕ ЭТОГО — milestone работа
```

### 1.2 — Стратегия и vision
```bash
cat docs/NOUS_Strategy_v5.md          # ЧТО строим, ЗАЧЕМ
cat docs/NOUS_Development_Roadmap.md  # КАКИЕ фичи, В КАКОМ порядке
```
Определи следующую задачу из текущей фазы Roadmap.

### 1.3 — Текущее состояние
```bash
git log --oneline -10
cat docs/project-state.md     # что реализовано, что stub
ls docs/sprints/
```

### 1.4 — Feature Area подсистемы
```bash
ls docs/feature-areas/
cat docs/feature-areas/FA-0X-[relevant]-architecture.md
cat docs/fa-registry.md       # FA → physical paths mapping
```
Feature Area = промежуточный слой между Roadmap и Milestone.
Прочитай зависимости и coverage ПЕРЕД планированием.
НЕ создавай milestone пока не поймёшь подсистему глубоко.

### 1.5 — Контракты (Shared Kernel)
```bash
ls packages/types/src/          # @paxio/types — Zod + TS
ls packages/interfaces/src/     # @paxio/interfaces — port contracts
ls packages/errors/src/         # @paxio/errors — AppError hierarchy
ls packages/contracts/          # OpenAPI per FA

# Если milestone касается Rust canister'ов:
ls platform/canister-shared/src/
cat products/<fa>/canister*/src/lib.rs 2>/dev/null
```
Контракты = source of truth. Изменение контракта = обновление кода на обеих сторонах.

### 1.6 — Feature Areas (продукты)
```bash
ls products/
ls products/01-registry/app/
ls products/02-facilitator/app/
# ... etc
```
Какие FA реализованы, какие schema-only, какие не начаты?

### 1.7 — Существующие тесты (НЕ дублировать!)
```bash
ls tests/*.test.ts products/*/tests/**/*.test.ts 2>/dev/null
grep -rn "describe\|it(" tests/ products/*/tests/ 2>/dev/null | head -30
grep -rn "#\[test\]" platform/canister-shared/ products/*/canister*/ 2>/dev/null | head -20
```

### 1.8 — Stubs и TODO
```bash
grep -rn "TODO\|FIXME\|STUB\|not implemented" apps/ products/ platform/ | head -20
```

---

## ФАЗА 2: PLAN (создать milestone)

### 2.1 — Определи задачу из Roadmap
Milestone должен соответствовать текущей фазе.
- Нет Roadmap → СТОП, спроси user'а
- Milestone не соответствует фазе → не создавай

### 2.2 — Создай milestone файл
```
docs/sprints/M0X-name.md
```

### 2.3 — Определи тип КАЖДОЙ задачи

**Тип 1 (логика):** unit test RED → GREEN
- vitest: `tests/*.test.ts`, `products/*/tests/**/*.test.ts`
- cargo test: `platform/canister-shared/tests/*.rs`, `products/*/canister*/tests/*.rs`
- Для: domain functions, classification, gap analysis, FAP routing, intent validation

**Тип 2 (интеграция/инфраструктура):** acceptance script FAIL → PASS
- Напиши скрипт в `scripts/verify_*.sh`
- Для: DB migrations, API health, Docker compose, ICP replica + canister deploy, frontend build

### 2.4 — Обязательная таблица в конце milestone

```markdown
| # | Task | Agent | Directory | Verification | Architecture Requirements |
|---|------|-------|-----------|-------------|--------------------------|
| 1 | Classification engine | backend-dev | products/06-compliance/app/domain/ | test GREEN | Pure domain, consistent return, factory fn |
| 2 | Wallet canister | icp-dev | products/03-wallet/canister/ | cargo test GREEN | No panic, thiserror, Storable Bounded |
| 3 | Registry search | registry-dev | products/01-registry/app/ | test GREEN | Zod at boundary, CQS |
| 4 | Dashboard view | frontend-dev | apps/frontend/pay/ | acceptance | Radix via @paxio/ui, no `any` |
```

Колонки обязательны:
- **Directory** — конкретный путь в monorepo
- **Architecture Requirements** — ожидания по стилю ДО кода

---

## ФАЗА 3: CONTRACTS (контрактный слой)

### 3.1 — Types + Zod schemas
- `packages/types/src/<fa>.ts` — TS типы + парный Zod schema (`Zod<TypeName>` суффикс)
- Изменение типа = обновление на потребителях
- Primary key convention: Registry kind → `"id"`, Entity kind → `"{camelCase}Id"`

### 3.2 — Interfaces (port contracts)
- `packages/interfaces/src/<fa>.ts` — pure interface (no I/O assumptions, only signature + Result<T,E>)
- Каждый port = ADT контракт (см. `engineering-principles.md` §7)

### 3.3 — Cross-language зеркало (Rust canisters)
Если тип нужен в Rust canister'е → зеркали в `products/<fa>/canister*/src/types.rs` ИЛИ
вынеси в `platform/canister-shared/src/` если нужно ≥2 canister'ам.
- `#[serde(rename_all = "camelCase")]` для совместимости с TS JSON
- `CandidType` derive для wire-совместимости с `.did` файлами

### 3.4 — AppError hierarchy
- `packages/errors/src/index.ts` — base `AppError` + subclasses
- Backend CJS mirror: `apps/back/server/lib/errors.cjs`
- Никаких `throw new Error(...)` — только `AppError` подклассы

### 3.5 — Sandbox context (backend app layer)
- Зависимости инжектируются через Object.freeze в VM
- Порядок загрузки: `lib/` → `domain/` → `application/` → `api/`

---

## ФАЗА 4: SPECS (спецификации — ТЗ для dev'ов)

### 4.1 — RED unit тесты (Тип 1)

TypeScript:
```typescript
import { describe, it, expect } from 'vitest';

describe('classifyRisk', () => {
  it('should return high for biometric systems', () => {
    const result = classifyRisk({ domain: 'biometric' });
    expect(result.riskLevel).toBe('high');
  });
});
```

Rust:
```rust
#[test]
fn test_classify_biometric_high_risk() {
    let result = classify_risk(&Tool { domain: Domain::Biometric });
    assert_eq!(result.risk_level, RiskLevel::High);
}
```

### 4.2 — Acceptance scripts (Тип 2)

**Naming convention** (M-Q1):
- Canonical: `scripts/verify_<MILESTONE-ID>.sh` (e.g. `verify_M-L9.sh`, `verify_M-Q1.sh`, `verify_TD-29.sh`)
- Header line 2: `# <MILESTONE-ID> acceptance — <descriptive name>` — это позволяет `quality-gate.sh` найти script через fallback header-tag matching
- `set -euo pipefail` обязательно
- PASS=N FAIL=M counter + `[ $FAIL -eq 0 ] || exit 1` в конце

Пример skeleton:
```bash
#!/usr/bin/env bash
# M-XX acceptance — descriptive name
set -euo pipefail
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

step "1. Что-то проверяется"
if [ ... ]; then ok "..."; else bad "..."; fi

# ... остальные шаги ...

echo "M-XX ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
```

Этот script запускается:
- direct: `bash scripts/verify_M-XX.sh` (для local dev verification)
- через quality-gate: `bash scripts/quality-gate.sh M-XX` step 6/6 (test-runner использует только это)

Scripts должны запускаться и FAIL (без реализации) — это часть RED спеки для milestone типа 2.

### 4.3 — Архитектурные проверки в тестах (ОБЯЗАТЕЛЬНО)

Тесты — единственная гарантия что dev напишет код по стандартам.
Dev-агенты теряют context при compaction. Тесты не теряются.

**В КАЖДОМ тесте для domain function добавляй:**

```typescript
// Детерминированность — pure function
it('is deterministic (same input → same output)', () => {
  const input = { domain: 'healthcare' };
  expect(classifyRisk(input)).toStrictEqual(classifyRisk(input));
});

// Consistent return shape — monomorphic objects
it('returns consistent shape for all paths', () => {
  const high = classifyRisk({ domain: 'biometric' });
  const low = classifyRisk({ domain: 'other' });
  expect(Object.keys(high).sort()).toStrictEqual(Object.keys(low).sort());
});
```

**Если factory function:**
```typescript
import { createService } from './service.js';
it('factory returns frozen plain object', () => {
  const svc = createService(deps);
  expect(Object.isFrozen(svc)).toBe(true);
  expect(Object.getPrototypeOf(svc)).toBe(Object.prototype);
});
```

**Если query с multi-tenancy:**
```typescript
it('filters by agentDid', async () => {
  const agents = await listAgents('did:paxio:alice');
  expect(agents.every(a => a.agentDid === 'did:paxio:alice')).toBe(true);
});
```

**Если command (CQS):**
```typescript
it('create returns only id', async () => {
  const result = await createAgent(data, agentDid);
  expect(result.id ?? result.agentId).toBeDefined();
  expect(result.name).toBeUndefined();
});
```

**Если error handling:**
```typescript
it('throws NotFoundError for missing resource', async () => {
  await expect(getAgent('nonexistent', agentDid))
    .rejects.toBeInstanceOf(errors.NotFoundError);
});
```

**Для Rust canister тестов:**
```rust
#[test]
fn test_empty_input_no_panic() {
    assert!(process_intent(&[]).is_ok());
}

#[test]
fn test_serde_roundtrip() {
    let state = State::default();
    let bytes = candid::Encode!(&state).unwrap();
    let back: State = candid::Decode!(&bytes, State).unwrap();
    assert_eq!(state, back);
}

#[test]
fn test_storable_bound_is_bounded() {
    match MyType::BOUND {
        Bound::Bounded { max_size, .. } => assert!(max_size > 0),
        _ => panic!("must be Bounded for stable memory"),
    }
}
```

**Чеклист перед коммитом каждого test file:**
- [ ] Детерминированность (pure function) для domain/?
- [ ] Consistent return shape (monomorphic)?
- [ ] Multi-tenancy (agentDid/organizationId) если query?
- [ ] CQS (void/id for commands) если command?
- [ ] AppError subclass для error cases?
- [ ] Конкретные числа в assertions
- [ ] Factory `create` prefix + `Object.isFrozen()` check на import
- [ ] Название: `should VERB when CONDITION`

---

## ФАЗА 5: ENVIRONMENT (подготовка среды для dev'ов)

### 5.1 — Базовая среда (ВСЕГДА проверить)
```bash
pnpm install
pnpm typecheck 2>&1 | tail -5
pnpm exec vitest run 2>&1 | tail -5     # ROOT (M-Q1: catches workspace drift)
pnpm lint 2>&1 | tail -3
cargo build --workspace 2>&1 | tail -5
cargo test --workspace 2>&1 | tail -5
```

### 5.1b — Quality gate dry-run (ПЕРЕД коммитом RED)
```bash
# Проверь что quality-gate.sh сможет найти твой acceptance script:
bash scripts/quality-gate.sh <milestone-id>
# Должен дойти до step 6 и сказать «no acceptance script» — это OK
# для RED state. После создания verify_<milestone>.sh — должен fail
# на step 6 (acceptance script ожидаемо красный).
```

### 5.2 — ICP среда (если milestone касается canister'ов)
```bash
source scripts/dfx-setup.sh
AGENT_NAME=icp-dev dfx_start              # local replica
```

### 5.3 — Database/Docker (если milestone требует PostgreSQL/Redis/Qdrant)
```bash
docker compose up -d                       # PostgreSQL 16, Redis, Qdrant
docker compose ps                          # all healthy?
```

### 5.4 — Frontend (если milestone включает frontend)
```bash
pnpm --filter @paxio/<app>-app build
pnpm --filter @paxio/<app>-app typecheck
```

### 5.5 — Фиксируй предусловия в milestone
```markdown
## Предусловия среды (architect обеспечивает):
- [ ] pnpm install
- [ ] pnpm typecheck clean
- [ ] cargo build --workspace clean
- [ ] [если canister] dfx replica started
- [ ] [если DB] docker compose up → PostgreSQL/Redis/Qdrant healthy
- [ ] [если Guard ML] OPENROUTER_API_KEY в .env
- [ ] [если frontend] NEXT_PUBLIC_API_URL set
```

---

## ФАЗА 6: COMMIT + HANDOFF

### 6.1 — Создай feature branch от dev
```bash
git checkout dev && git pull origin dev
git checkout -b feature/M0X-name
```

### 6.2 — Identity check ПЕРЕД commit'ом (M-Q1)
```bash
# .husky/pre-commit hook сам проверит, но architect должен убедиться заранее:
git config user.name      # должно быть: architect
git config user.email     # должно быть: architect@paxio.network
# Mismatch = hook откажет commit. Если нужно поменять для конкретной ветки:
# git config user.email architect@paxio.network
```

### 6.3 — Коммить ВСЁ
```bash
git add packages/types/ packages/interfaces/ packages/errors/  # контракты
git add tests/*.test.ts products/*/tests/**/*.test.ts          # RED тесты
git add platform/canister-shared/                               # если менялся
git add scripts/verify_<milestone-id>.sh                        # acceptance (canonical name!)
git add docs/sprints/M*.md                                      # milestone
git add docs/feature-areas/FA-*.md                              # FA если обновлялись
git commit -m "feat(M0X): contracts, RED tests, acceptance script, milestone"
# ↳ pre-commit hook проверит identity + scope. Pass или reject.
```

### 6.4 — Проверь после коммита
```bash
pnpm typecheck 2>&1 | tail -5             # build errors — НЕТ
pnpm exec vitest run 2>&1 | tail -5       # ROOT — RED тесты ожидаемо fail
cargo build --workspace 2>&1 | tail -5
pnpm lint 2>&1 | tail -3
bash scripts/quality-gate.sh <milestone>  # dry-run — должен fail на конкретном
                                          # step (RED expected before dev impl)
```

### 6.5 — Self-call reviewer Phase 0 BEFORE user handoff (M-Q2)

После commit + push spec, ДО handoff'а user'у — самовызови reviewer как sub-agent
для Phase 0 spec review. Это catches spec bugs ДО того как dev burned time на bad
spec.

**Сначала push + create PR + add label:**
```bash
git push -u origin feature/M0X-name
gh pr create --title "M0X: <description>" --body "<spec details>"
gh pr edit <N> --add-label spec-ready  # триггерит spec-review.yml fast-CI
```

**Затем sub-agent invocation:**
```typescript
// Pseudo-code (real call uses Agent tool с subagent_type: "reviewer")
const verdict = await Agent({
  subagent_type: "reviewer",
  description: "M0X spec-pass review",
  prompt: `
Phase 0 spec-review for M0X. NOT impl review — code не написан yet.

Branch: feature/M0X-name
PR: #N (label: spec-ready)
Milestone doc: docs/sprints/M0X-name.md

Architect-authored artifacts:
  - tests/*.test.ts: [explicit list]
  - products/*/tests/*.test.ts: [list]
  - packages/types/src/*.ts: [list]
  - packages/interfaces/src/*.ts: [list]
  - packages/errors/src/*.ts: [list — if changes]
  - scripts/verify_M0X.sh
  - docs/sprints/M0X-name.md

Run Phase 0 checklist (.claude/agents/reviewer.md::Phase 0):
  - Coverage (тесты vs Готово когда) — counts match?
  - Vacuous-skip correctness
  - Architectural enforcement tests presence (factory frozen, determinism, agentDid filter, ...)
  - Coding standards adherence (.claude/rules/coding-standards-checklist.md walk top-down)
  - Tests RED for right reason (run vitest, verify failure messages)
  - Contracts quality (ADT, Zod paired, no any)
  - Infrastructure: pnpm install --frozen-lockfile + typecheck + vitest run + acceptance PASS

Report under 500 words: SPEC APPROVED | SPEC REJECTED + must-fix list (if REJECTED).

DO NOT update tech-debt.md / project-state.md в Phase 0.
This is pre-impl gate; impl review (Phase N) happens later после dev impl.
  `,
});
```

**Parse verdict + branch:**

```
verdict.includes("SPEC APPROVED")
  → gh pr edit <N> --add-label dev-ready
  → handoff user'у с verdict note
  → переходи к 6.6 (handoff)

verdict.includes("SPEC REJECTED")
  → fix must-fix items (items упорядочены по C-N priority)
  → re-commit + push
  → re-invoke Agent({ subagent_type: "reviewer", ... }) с обновлённым spec
  → loop max 3 rounds
```

**Escalation rule (3-rounds-then-user):** Если reviewer rejects 3 раза подряд — это
сигнал архитектурного gap'а который требует обсуждения с user'ом, не очередной фикс.
Architect останавливается, summary'ит must-fix items + рассуждения почему они persist'ят,
ждёт user input.

**Failure modes:**
- Reviewer не отвечает / падает sub-agent call → fallback к user-invoked reviewer (existing flow). Не блокировать handoff если sub-agent infrastructure unavailable.
- Reviewer перебдил (P2 violations rejecting спек) → architect appeal'ит через PR comment с rationale, либо просит user override
- Reviewer недобдил (let через bug) → ловится Phase N (impl review)

**Cost:** ~30s sub-agent invocation + 60s vitest+typecheck = ~90s per Phase 0 round.
Acceptable overhead для catching spec bugs ДО dev'ом potentially burning 2-4 hours
implementing buggy spec.

### 6.6 — Скажи user'у кого запускать (после Phase 0 APPROVED)

"Phase 0 APPROVED reviewer'ом. Запускай [agent-name]. Milestone: M0X.
 Branch: feature/M0X-name. PR #N (label: dev-ready).
 Тесты закоммичены. Quality gate: `bash scripts/quality-gate.sh M0X`
 (test-runner запускает после impl)."

**Если Phase 0 был skipped** (sub-agent infrastructure unavailable, or first run before
M-Q2 fully landed): включи в handoff message warning — «Phase 0 skipped, manual review
needed».

---

## ФАЗА 7: POST-MILESTONE

1. Все тесты GREEN? Acceptance PASS?
2. Dev НЕ изменил тесты?
3. Обнови Feature Area если архитектура изменилась
4. Обнови `docs/NOUS_Development_Roadmap.md` — фичи DONE
5. Обнови milestone статус → ВЫПОЛНЕН
6. Попроси user запустить reviewer
7. **Создай PR: feature/* → dev**
8. После reviewer APPROVED:
   - Если reviewer указал must-fix → закрой их в этом же PR (commit + push), затем re-verify локально (typecheck + vitest baseline + acceptance script если применимо)
   - Если CI green (false positives типа Vercel author-email игнорируй с явным комментом)
   - **Merge сам**: `gh pr merge N --merge` — это feature/* → dev gate, автономный (см. `scope-guard.md::GIT & MERGE`)
   - НЕ спрашивай у user'а «можно мержить?» — gate автономный
9. После merge в dev → доложи user'у: «PR #N merged → dev. Следующее: [next milestone OR ждём dev → main релиз]»
10. dev → main: жди явного OK от user с PR номером — это user-gate

---

## Файлы architect'а

### ТВОИ файлы:
- `docs/sprints/*.md` — milestones
- `docs/feature-areas/*.md` — Feature Area
- `docs/fa-registry.md` — FA → paths mapping
- `docs/NOUS_Development_Roadmap.md` — фичи DONE
- `tests/**/*.test.ts` — RED тесты
- `products/*/tests/**/*.test.ts` — per-FA RED тесты
- `platform/canister-shared/tests/*.rs`, `products/*/canister*/tests/*.rs` — Rust RED тесты
- `packages/types/src/` — Zod + TS contracts
- `packages/interfaces/src/` — port contracts
- `packages/errors/src/` — AppError hierarchy
- `packages/contracts/` — OpenAPI per FA
- `scripts/verify_*.sh` — acceptance scripts
- `.claude/` — правила проекта
- `CLAUDE.md` — master rules

### НЕ ТВОИ:
- `docs/project-state.md` — ТОЛЬКО reviewer
- `docs/tech-debt.md` — ТОЛЬКО reviewer записывает
- `apps/back/server/`, TS в `products/*/app/` — backend-dev (FA-02..07) / registry-dev (FA-01)
- `products/*/canister*/` — icp-dev / registry-dev (FA-01)
- `products/*/{cli,sdk-*,mcp-server,guard-client,http-proxy}/` — backend-dev / icp-dev
- `apps/frontend/` — frontend-dev
- `packages/{ui,hooks,api-client,auth,utils}/` — frontend-dev / backend-dev
- `platform/canister-shared/src/` — icp-dev
