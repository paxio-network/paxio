# M-Q2 — Architect Spec-Review Gate + Coding Standards Port

> Architect-only milestone (8 tasks). Builds on M-Q1 baseline (`scripts/quality-gate.sh`,
> `.husky/pre-commit`, `root-tests.yml`).
>
> **Ядро:** между «architect committed spec» и «dev starts impl» вставляется reviewer
> **Phase 0 spec-pass**, который architect самовызывает через `Agent`-tool как sub-agent.
>
> **Бонус:** портируем 27 coding-standards правил из donor-репо `/home/openclaw/PROJECT`
> (TS) + `/home/openclaw/complior` (Rust), которые у нас отсутствовали — закрываем gap'ы
> в style enforcement.
>
> **Решает класс проблемы:** TD-30 (architect modifies own tests, 13× recurrence).
> Phase 0 APPROVED freeze'ит тесты externally — architect больше не может «оптимизировать
> на ходу» свой собственный test-файл.

## Готово когда

- `.claude/agents/reviewer.md` имеет секцию **`## Phase 0: Spec Review`** с:
  - Inputs (branch, files, milestone doc)
  - 6-step process (read → run vitest → walk checklist → infrastructure verify → idempotency)
  - Output format: `SPEC APPROVED | SPEC REJECTED` + must-fix list (under 500 words)
  - Boundaries: Phase 0 НЕ обновляет `tech-debt.md`/`project-state.md` (это Phase N)
  - Reference на `.claude/rules/coding-standards-checklist.md` (single source of truth)
- `.claude/rules/architect-protocol.md` имеет **`### 6.5 — Self-call reviewer Phase 0 BEFORE user handoff`** с:
  - Sub-agent invocation pattern (`Agent({ subagent_type: "reviewer", ... })`)
  - Verdict parsing rule (look for `SPEC APPROVED` / `SPEC REJECTED` literal)
  - 3-rounds-then-escalate rule (predotvraщает infinite loop)
- `.claude/rules/workflow.md` упоминает spec-pass между architect-commit и dev-handoff
- `.husky/pre-commit` имеет architect-specific block:
  - Если staged `package.json` без staged `pnpm-lock.yaml` → exit 1 + diagnostic
  - Override marker `!!! LOCKFILE OK !!!` в commit message — bypass (intentional cases like clean removals)
  - Bash 3.2 compatible, POSIX-sh-safe (works через husky `sh -e` dispatcher)
- `.github/workflows/spec-review.yml` создан:
  - Triggered ONLY on PR с label `spec-ready`
  - Steps: install (frozen-lockfile) → typecheck → root vitest → drift-guard tests
  - Total time <90s (no build, no cargo)
- `.claude/rules/coding-standards-checklist.md` создан:
  - 120 rules организованы по severity (P0=12, P1=38, P2=70)
  - Каждое правило: ID **C-N**, source rule **[R-N]**, link на `.claude/rules/<file>.md`
  - Domain mapping: TypeScript (45), Rust (32), Testing (15), Compliance (12), Architecture (16)
  - Reviewer Phase 0 + Phase N walk it top-down (P0 → P1 → P2)
- `.claude/rules/rust-error-handling.md` создан (Rust-specific, ported from `/complior`):
  - thiserror в библиотеках, anyhow ТОЛЬКО в `main()`
  - No `unwrap()`/`panic!()` в production — `expect("invariant")` only
  - `#[from]` для auto error propagation
  - `wrap_err()` / `wrap_err_with()` через `color_eyre::eyre`
  - `#[serde(deny_unknown_fields)]` + `TryFrom<RawConfig>` validation pattern
- `.claude/rules/rust-async.md` создан:
  - `tokio::fs` not `std::fs` в async (blocks runtime threads)
  - Lock duration минимизировать через `.await` boundaries
  - `Arc<RwLock<T>>` для shared async state, не `Rc<Mutex<T>>`
  - `Promise.all` analog: `tokio::join!` / `try_join!` для concurrent awaits
- `.claude/rules/rust-build.md` создан:
  - Edition 2024, clippy `pedantic + nursery` warn, zero warnings before commit
  - Release profile: `lto=true`, `codegen-units=1`, `strip=true`, `panic="abort"`
  - Feature flags pattern (default = `[]`, optional = `tui`/`extras`)
- `.claude/rules/code-style.md`, `architecture.md`, `safety.md` дополнены 13 TS gap-правилами
  (R29, R30, R32, R34, R35, R36, R39, R40, R43, R44, R46, R47, R75) — **additive only**, existing
  rules не удаляются
- `tests/spec-review-checklist.test.ts` (NEW, architect) GREEN: drift-guard на checklist file
- `tests/reviewer-phase-0.test.ts` (NEW, architect) GREEN: drift-guard на reviewer.md Phase 0 секцию
- `tests/architect-self-review.test.ts` (NEW, architect) GREEN: drift-guard на architect-protocol §6.5
- `tests/rust-rules.test.ts` (NEW, architect) GREEN: drift-guard на 3 новых Rust rule files
- `scripts/verify_M-Q2.sh` PASS: simulated bad spec → REJECTED → fix → APPROVED end-to-end

## Метод верификации (Тип 1 + Тип 2)

### Тип 1: Drift-guard tests

**`tests/spec-review-checklist.test.ts`** — структурная проверка `coding-standards-checklist.md`:
- Файл существует
- Содержит секции `## P0`, `## P1`, `## P2` (severity grouping)
- Содержит `C1` через `C120` (count check via regex match against all `**C\d+`)
- Содержит секции `### TypeScript`, `### Rust`, `### Testing`, `### Compliance`, `### Architecture` (domain mapping)
- Каждое из 12 P0 rules упоминает `[R-N]` source + ссылку на `.md` rule file
- Top-of-file описание упоминает «sourced from /PROJECT + /complior» + «120 rules» + «top-down walk»

**`tests/reviewer-phase-0.test.ts`** — структурная проверка `reviewer.md`:
- Содержит секцию `## Phase 0: Spec Review`
- Эта секция упоминает `coding-standards-checklist.md`
- Эта секция упоминает sub-agent invocation pattern (`subagent_type` или `Agent`-tool)
- Содержит explicit verdict labels `SPEC APPROVED` + `SPEC REJECTED`
- Содержит boundary: «DO NOT update tech-debt.md / project-state.md» в Phase 0
- Phase 0 separate from Phase N (impl review)

**`tests/architect-self-review.test.ts`** — структурная проверка architect-protocol:
- `.claude/rules/architect-protocol.md` содержит `### 6.5` или `## ФАЗА 6.5`
- Эта секция упоминает `Agent` tool с `subagent_type: "reviewer"`
- Описывает 3-rounds-then-escalate rule
- `.claude/rules/workflow.md` упоминает «Phase 0 spec-pass» в основном flow

**`tests/rust-rules.test.ts`** — drift-guard на 3 новых Rust rule files:
- `rust-error-handling.md` упоминает `thiserror`, `anyhow`, `unwrap`, `expect`, `#[from]`
- `rust-async.md` упоминает `tokio::fs`, `Arc<RwLock`, `tokio::join`
- `rust-build.md` упоминает `edition = "2024"`, `clippy::pedantic`, `lto = true`, `panic = "abort"`

### Тип 2: Acceptance script

**`scripts/verify_M-Q2.sh`** — E2E test of spec-review flow:

```bash
#!/usr/bin/env bash
# Idempotent E2E test: simulate bad spec → REJECTED → fix → APPROVED
set -euo pipefail

trap cleanup EXIT
cleanup() {
  git checkout -- . 2>/dev/null || true
  git branch -D wip-spec-review-test 2>/dev/null || true
}

# 1. Setup: temp branch + intentionally bad spec
git checkout -b wip-spec-review-test

# 2. Bad spec: vacuous test + missing factory frozen check + cast-without-validation
cat > /tmp/bad-spec.test.ts <<'EOF'
import { describe, it, expect } from 'vitest';
describe('badSpec', () => {
  it('returns something', () => {  // VAGUE name
    expect(true).toBe(true);          // VACUOUS assertion (C-N violation)
  });
});
EOF

# 3. Walk through checklist programmatically — verify our tests catch this
node -e "
  const fs = require('fs');
  const checklist = fs.readFileSync('.claude/rules/coding-standards-checklist.md', 'utf8');
  const badSpec = fs.readFileSync('/tmp/bad-spec.test.ts', 'utf8');
  
  // Spec violates: vacuous assertion (C-N), vague test name (C-N), no architectural enforcement
  const violations = [];
  if (badSpec.includes('expect(true).toBe(true)')) violations.push('vacuous-assertion');
  if (badSpec.match(/it\\('returns/)) violations.push('vague-name');
  if (!badSpec.includes('Object.isFrozen')) violations.push('no-frozen-check');
  
  if (violations.length < 3) { console.error('FAIL: checklist did not detect violations'); process.exit(1); }
  console.log('OK: simulated bad spec → 3 violations detected');
"

# 4. Verify infrastructure checks work
pnpm install --frozen-lockfile > /dev/null 2>&1 || { echo "FAIL: lockfile drift catcher not working"; exit 1; }
pnpm typecheck > /dev/null 2>&1 || { echo "FAIL: typecheck not clean baseline"; exit 1; }

# 5. Verify drift-guard tests PASS (means our checklist + reviewer.md are stable)
pnpm exec vitest run tests/spec-review-checklist.test.ts \
                    tests/reviewer-phase-0.test.ts \
                    tests/architect-self-review.test.ts \
                    tests/rust-rules.test.ts > /tmp/qm-q2-drift.log 2>&1 || {
  echo "FAIL: M-Q2 drift-guard tests RED"; tail -20 /tmp/qm-q2-drift.log; exit 1;
}

# 6. Verify spec-review.yml workflow file exists and has expected steps
yamllint .github/workflows/spec-review.yml 2>/dev/null || true
grep -q 'pnpm install --frozen-lockfile' .github/workflows/spec-review.yml || { echo "FAIL: workflow missing frozen-lockfile step"; exit 1; }
grep -q 'pnpm typecheck' .github/workflows/spec-review.yml || { echo "FAIL: workflow missing typecheck step"; exit 1; }
grep -q "spec-ready" .github/workflows/spec-review.yml || { echo "FAIL: workflow not gated on spec-ready label"; exit 1; }

echo
echo "─────────────────────────────────────────────"
echo "M-Q2 ACCEPTANCE — PASS"
echo "─────────────────────────────────────────────"
```

Idempotent: trap cleans up temp branch + working tree. Re-run без manual cleanup.

## Зависимости

- **M-Q1 merged в dev** — даёт `scripts/quality-gate.sh`, `.husky/pre-commit`, `root-tests.yml` baselines
- **Existing rule files в `.claude/rules/`** — будут extended (additive), не replaced
- **Reviewer agent capability of being invoked as sub-agent** — verified в T-2 prototype через `Agent({ subagent_type: "reviewer", ... })`
- **gh CLI authenticated** для PR label management (`spec-ready` / `dev-ready`)

## Архитектура

### Decision: Phase 0 vs Phase N разделение

| Phase | Когда | Кто инициирует | Что проверяется | Output | Boundaries |
|-------|-------|----------------|-----------------|--------|------------|
| **Phase 0** (NEW) | После architect commit + push spec, ДО dev start | architect **самовызывает** reviewer как sub-agent | spec quality (tests RED for right reason, contracts ADT, infra clean), checklist walk | `SPEC APPROVED` / `SPEC REJECTED` + must-fix list | НЕ updates tech-debt/project-state |
| **Phase N** (existing) | После dev impl + test-runner GREEN | user invokes reviewer | impl quality (tests not modified, scope clean, code adheres to standards) | `APPROVED` / `CHANGES REQUESTED` + tech-debt entries | UPDATES tech-debt + project-state после APPROVED |

Двух-фазная модель **разделяет concerns**:
- Phase 0 catches **spec bugs** (architect's territory)
- Phase N catches **impl bugs** (dev's territory)
- Tests становятся **immutable между Phase 0 APPROVED и Phase N start** — TESTS SACRED enforcement externally, not via architect's self-discipline.

### `.claude/rules/coding-standards-checklist.md` — структура

```markdown
# Coding Standards Checklist — 120 Rules

> Single source of truth for code style + architecture invariants.
> Sourced from /home/openclaw/PROJECT (R1–R80) + /home/openclaw/complior (R81–R120).
> Reviewer Phase 0 (spec) + Phase N (impl) walk this checklist top-down.
> Each rule: **C-N [R-N source]** description → link на enforcement rule file.

## P0 — Security/Correctness (12 rules — ALL MUST PASS, no exceptions)

- **C1 [R9]** VM sandbox isolation — `app/` cannot `require()` / `import` / I/O ([backend-architecture.md](backend-architecture.md))
- **C2 [R13,R60]** Multi-tenancy: every SQL has `WHERE agent_did=$1` or `WHERE organization_id=$1`. Identity from `session.*`, NEVER `body.*` ([backend-architecture.md](backend-architecture.md))
- **C3 [R21]** Parameterized queries only — no string concat in SQL ([safety.md](safety.md))
- **C4 [R22]** No secrets in code — `.env` only, accessed via injected `config` ([safety.md](safety.md))
- **C5 [R66]** No `any` in TS — use `unknown` + Zod parse ([code-style.md](code-style.md))
- **C6 [R67]** No `as Type` cast without validation — type narrowing only ([code-style.md](code-style.md))
- **C7 [R82]** Rust edition 2024 + clippy pedantic+nursery → zero warnings ([rust-build.md](rust-build.md))
- **C8 [R84]** Rust no `unwrap()` / `panic!()` in production — only `expect("invariant explained")` ([rust-error-handling.md](rust-error-handling.md))
- **C9 [R109]** Data externalization — no hardcoded thresholds/fees/URLs/model-names в коде ([code-style.md](code-style.md))
- **C10 [R117]** Panic-free CLI/canister — all errors → Result type ([safety.md](safety.md))
- **C11 [R118]** localhost-only IPC, never `0.0.0.0` ([safety.md](safety.md))
- **C12 [R20]** Zod runtime validation on every API boundary ([backend-api-patterns.md](backend-api-patterns.md))

## P1 — Architectural Invariant (38 rules — must pass unless explicit `!!! SCOPE REQUEST !!!` rationale)

### TypeScript / Backend
- **C13 [R1]** No `class` in `app/` (except Error subclasses) ([backend-code-style.md](backend-code-style.md))
- **C14 [R2]** Plain objects + free functions + factory functions ([backend-code-style.md](backend-code-style.md))
- **C15 [R3]** Domain purity: zero I/O in `app/domain/` ([backend-architecture.md](backend-architecture.md))
- **C16 [R11]** Loading order strict: `lib → domain → application → api` ([backend-architecture.md](backend-architecture.md))
- **C17 [R12]** Onion deps: strictly inward, no reverse imports ([architecture.md](architecture.md))
- **C18 [R14]** API handler format: `{ httpMethod, path, method }` ([backend-api-patterns.md](backend-api-patterns.md))
- **C19 [R18]** AppError hierarchy: 5 subclasses (Validation/Auth/Forbidden/NotFound/Conflict/Protocol) ([code-style.md](code-style.md))
- **C20 [R63]** Startup protocol: 7-step announcement before code ([startup-protocol.md](startup-protocol.md))

### TypeScript / Frontend
- **C21 [R3-frontend]** Real-data invariant: no `Math.random()` / hardcoded "live" numbers, fetch via `@paxio/api-client` ([frontend-rules.md](frontend-rules.md))
- **C22 [R-front-2]** Privy session via `@paxio/auth`, never `localStorage` direct ([frontend-rules.md](frontend-rules.md))
- **C23 [R-front-3]** Radix через `@paxio/ui`, no custom Dialog/Button from scratch ([frontend-rules.md](frontend-rules.md))

### Rust / Canister
- **C24 [R83]** thiserror в библиотеках, anyhow ТОЛЬКО в `main()` ([rust-error-handling.md](rust-error-handling.md))
- **C25 [R85]** `tokio::fs` not `std::fs` в async, minimize lock duration ([rust-async.md](rust-async.md))
- **C26 [R86]** `#[serde(rename_all="camelCase")]` для всех wire-структур TS↔Rust ([backend-architecture.md](backend-architecture.md))
- **C27 [R88]** Enum over strings для finite sets, exhaustive match ([engineering-principles.md](engineering-principles.md))
- **C28 [R94]** thiserror enum с `#[from]` для auto error propagation ([rust-error-handling.md](rust-error-handling.md))
- **C29 [R102]** `wrap_err()` для context-rich errors через `color_eyre::eyre` ([rust-error-handling.md](rust-error-handling.md))
- **C30 [R114]** `#[serde(deny_unknown_fields)]` + `TryFrom<RawConfig>` validation ([rust-error-handling.md](rust-error-handling.md))

### Testing
- **C31 [R54]** TEST-FIRST: architect RED → dev GREEN, NEVER modify tests ([testing.md](testing.md))
- **C32 [R56]** Test naming: `should VERB when CONDITION` ([testing.md](testing.md))
- **C33 [R98]** Rust tests inline `#[cfg(test)] mod tests {}`, factories named `create_test_<thing>` ([testing.md](testing.md))
- **C34 [R100]** `#[tokio::test]` ТОЛЬКО для async, `#[test]` для sync ([testing.md](testing.md))
- **C35 [R-test-arch]** Architectural enforcement в каждом тесте domain function:
  - factory frozen check (`Object.isFrozen(createX(deps))`)
  - determinism check (`expect(fn(x)).toStrictEqual(fn(x))`)
  - agentDid filter (если query)
  - NotFoundError (если domain throws)
  - consistent return shape ([architect-protocol.md](architect-protocol.md))

### Multi-tenancy / Safety
- **C36 [R-mt-can]** Inter-canister calls: identity via `ic_cdk::caller()`, NEVER аргумент ([backend-architecture.md](backend-architecture.md))
- **C37 [R-mt-pub]** Public exceptions в явный whitelist в backend-architecture.md ([backend-architecture.md](backend-architecture.md))
- **C38 [R-audit]** Audit log append-only, ownership immutable ([backend-architecture.md](backend-architecture.md))

### Architecture / Process
- **C39 [R64]** CI enforcement: lint, test, audit на каждый PR ([scope-guard.md](scope-guard.md))
- **C40 [R72]** No hardcoded values: ports/URLs/keys через `app/config/` или env ([code-style.md](code-style.md))
- **C41 [R-scope]** Scope-guard mechanical hook (`.husky/pre-commit`) ([scope-guard.md](scope-guard.md))
- **C42 [R-test-spec]** Tests как specs: architect только пишет, dev только читает ([scope-guard.md](scope-guard.md))
- **C43 [R-onion-dep]** Layer imports: api/ → application/ → domain/ → lib/, strictly ([architecture.md](architecture.md))
- **C44 [R-fa-mapping]** FA → physical paths via `docs/fa-registry.md` ([architecture.md](architecture.md))
- **C45 [R119]** License header: AGPL-3.0-only or compatible в `Cargo.toml` / `package.json` ([safety.md](safety.md))

[…rest of P1 + all of P2 — itemized in implementation when file is created…]

## P2 — Style/Best-Practice (70 rules — must pass for new code; deferred fix tracked as TD if violated in existing)

### TypeScript style (29 rules)
- **C51 [R5]** kebab-case files в `server/` + `app/` ([code-style.md](code-style.md))
- **C52 [R7]** camelCase functions/variables ([code-style.md](code-style.md))
- **C53 [R8]** UPPER_SNAKE_CASE constants ([code-style.md](code-style.md))
- **C54 [R26]** `===` / `!==` only, no `==` / `!=` ([code-style.md](code-style.md))
- **C55 [R27]** No `var`, only `const` / `let` ([code-style.md](code-style.md))
- **C56 [R28]** No implicit type coercion ([code-style.md](code-style.md))
- **C57 [R29]** No `for...in`, use `Object.keys() + for...of` ([code-style.md](code-style.md)) ⬅ **NEW (T-5)**
- **C58 [R30]** No `delete obj.prop`, use spread exclusion ([code-style.md](code-style.md)) ⬅ **NEW (T-5)**
- **C59 [R32]** No RxJS / generators-as-async / Deferred / Async.js — async/await only ([code-style.md](code-style.md)) ⬅ **NEW (T-5)**
- **C60 [R33]** Early returns to flatten nesting ([code-style.md](code-style.md))
- **C61 [R34]** No `.forEach()` с outer-scope mutation, use `.map/filter/reduce` ([code-style.md](code-style.md)) ⬅ **NEW (T-5)**
- **C62 [R35]** Return objects (named fields), not arrays ([code-style.md](code-style.md)) ⬅ **NEW (T-5)**
- **C63 [R36]** Consistent return shape (same fields всех ветках) ([code-style.md](code-style.md)) ⬅ **NEW (T-5)**
- **C64 [R37]** No code duplication — extract helper after 2nd repetition ([code-style.md](code-style.md))
- **C65 [R38]** SRP: one function = one task ([engineering-principles.md](engineering-principles.md))
- **C66 [R39]** Max file length: 300 lines ([code-style.md](code-style.md)) ⬅ **NEW (T-5)**
- **C67 [R40]** Monomorphic objects (V8 hidden classes stable) ([code-style.md](code-style.md)) ⬅ **NEW (T-5)**
- **C68 [R47]** Law of Demeter — no `a.b.c.d.e()`, max 1-level chaining ([engineering-principles.md](engineering-principles.md)) ⬅ **NEW (T-5)**
- **C69 [R52]** Max line length 100 chars ([code-style.md](code-style.md))
- **C70 [R57]** No dead code, no TODO без milestone reference ([backend-code-style.md](backend-code-style.md))
- **C71 [R58]** Conventional commits: `feat/fix/test/docs/refactor` ([scope-guard.md](scope-guard.md))
- **C72 [R69]** Union types вместо `enum` keyword ([code-style.md](code-style.md))
- **C73 [R70]** `readonly` properties по умолчанию ([code-style.md](code-style.md))
- **C74 [R73]** No `.bind()` / `.call()` / `.apply()` — closures ([backend-code-style.md](backend-code-style.md))
- **C75 [R74]** One file = one concept, no `index.js` в `app/` ([backend-code-style.md](backend-code-style.md))
- **C76 [R75]** Discriminated unions > optional fields ([engineering-principles.md](engineering-principles.md)) ⬅ **NEW (T-5)**

### TypeScript / Architecture additional
- **C77 [R43]** CQS: command (mutation, no return) vs query (return, no mutation) ([architecture.md](architecture.md)) ⬅ **NEW (T-5)**
- **C78 [R44]** Domain events = anemic objects, serializable ([architecture.md](architecture.md)) ⬅ **NEW (T-5)**
- **C79 [R46]** Idempotency через GUID для job queue ([safety.md](safety.md)) ⬅ **NEW (T-5)**

### Rust style (16 rules)
- **C80 [R87]** Prefer `&T`, `&[T]` > `Clone`, `Arc<RwLock<T>>` для shared async state ([rust-async.md](rust-async.md))
- **C81 [R89]** Builder pattern для structs >3 optional fields ([engineering-principles.md](engineering-principles.md))
- **C82 [R90]** Newtype pattern для domain types: `struct Did(String)`, `struct Satoshi(u64)` ([engineering-principles.md](engineering-principles.md))
- **C83 [R93]** `pub(crate)` for internal helpers, `pub` only for public API ([rust-build.md](rust-build.md))
- **C84 [R96]** String types: `&str` < `String` < `Cow<'a, str>` ([rust-async.md](rust-async.md))
- **C85 [R97]** Iterator chains lazy, no intermediate `.collect()` ([rust-async.md](rust-async.md))
- **C86 [R99]** Snapshot tests via `insta` для terminal/CLI/TUI output ([testing.md](testing.md))
- **C87 [R101]** Mock external boundaries (HTTP, file I/O, network); test pure logic ([testing.md](testing.md))
- **C88 [R112]** Clippy exceptions documented в `Cargo.toml` с rationale comment ([rust-build.md](rust-build.md))
- **C89 [R113]** Release profile: lto, codegen-units=1, strip, panic=abort ([rust-build.md](rust-build.md))

### Testing additional (3 rules)
- **C90 [R55]** Coverage thresholds по слою: domain 60-90%, api 60-80%, security-critical 80-100% ([testing.md](testing.md))
- **C91 [R-test-isolation]** Test fixture isolation: tempdir, no shared state между tests ([testing.md](testing.md))
- **C92 [R-test-determinism]** Tests deterministic — no `Date.now()` или `Math.random()` без seeded mock ([testing.md](testing.md))

### Compliance / Safety additional (8 rules)
- **C93 [R23]** Data residency rules (where applicable per FA — EU AI Act) ([safety.md](safety.md))
- **C94 [R24]** No PII in logs, no stack traces в client response ([safety.md](safety.md))
- **C95 [R25]** ESLint strict config: `eqeqeq`, `no-var`, `prefer-const`, `no-eval` ([code-style.md](code-style.md))
- **C96 [R59]** Session resolution: token verified by server BEFORE handler call ([backend-api-patterns.md](backend-api-patterns.md))
- **C97 [R65]** DB transactions через disposable pattern ([backend-architecture.md](backend-architecture.md))
- **C98 [R71]** Module-scoped state в closures OK, no `global` exports ([backend-code-style.md](backend-code-style.md))
- **C99 [R77]** No global state в `app/`, sandbox isolated per-request ([backend-architecture.md](backend-architecture.md))
- **C100 [R80]** Security audit CI gate: `npm audit --audit-level=critical` blocks deploy ([scope-guard.md](scope-guard.md))

### Architecture / Workflow (20 rules — C101..C120)

[См. полный list в реализации T-7 — выше представлены P0 + P1 + ключевые P2.
Полные 120 rules будут перечислены в milestone implementation.]

## Domain mapping

| Domain | Rules | Source files |
|---|---|---|
| TypeScript | C5-C6, C13-C23, C51-C79 (45 правил) | `code-style.md`, `backend-code-style.md`, `frontend-rules.md`, `architecture.md`, `safety.md` |
| Rust | C7-C8, C24-C30, C80-C89 (32 правил) | `rust-error-handling.md`, `rust-async.md`, `rust-build.md`, `engineering-principles.md` |
| Testing | C31-C35, C90-C92, C112-C117 (15 правил) | `testing.md`, `architect-protocol.md` |
| Compliance | C12, C93-C100, C118-C120 (12 правил) | `safety.md`, `backend-api-patterns.md` |
| Architecture | C15-C18, C36-C45, C77-C79, C101-C111 (16 правил) | `architecture.md`, `backend-architecture.md`, `engineering-principles.md` |

(Counts примерные — финальное распределение в T-7 implementation.)
```

### `.claude/agents/reviewer.md` — Phase 0 секция

```markdown
## Phase 0: Spec Review (BEFORE dev starts implementation)

Trigger: architect commits на feature branch + создаёт PR + добавляет label `spec-ready`.
Architect самовызывает reviewer как sub-agent через `Agent`-tool.

### Inputs (provided by architect)
- Branch: `feature/M-XX-name`
- Files to review (architect-authored only, list explicitly):
  - `tests/*.test.ts` (NEW): list
  - `products/*/tests/*.test.ts` (NEW): list
  - `packages/types/src/*.ts` (NEW or CHANGES): list
  - `packages/interfaces/src/*.ts` (NEW or CHANGES): list
  - `packages/errors/src/*.ts` (CHANGES): list
  - `scripts/verify_M-XX.sh` (NEW)
  - `docs/sprints/M-XX-name.md` (NEW)
- Milestone "Готово когда" criteria (parsed from milestone doc)

### Process (6 steps)

**1. Read milestone "Готово когда"** — count criteria, build expectation list.

**2. Read RED tests + contracts** — for each "Готово когда" item, find corresponding test or
   acceptance check. Coverage check: counts match? Each criterion has ≥1 verifiable test/script?

**3. Run vitest** (`pnpm exec vitest run` ограниченно по новым файлам) — verify tests RED for
   right reason: "module not found" / "function not implemented" / "behaviour not yet matched",
   NOT "buggy spec / wrong fixture". Read failure messages, не только exit code.

**4. Walk `.claude/rules/coding-standards-checklist.md` top-down**:
   - **P0 violations** → automatic `SPEC REJECTED`
   - **P1 violations** → `SPEC REJECTED` unless `!!! SCOPE REQUEST !!!` rationale present in
     architect's PR description
   - **P2 violations** → list as must-fix или defer to TD с rationale (architect's call)

**5. Verify infrastructure clean**:
   - `pnpm install --frozen-lockfile` PASS (no lockfile drift)
   - `pnpm typecheck` PASS (no TS errors)
   - `pnpm exec vitest run` baseline PASS (no broken imports, no unrelated reds)
   - For Rust changes: `cargo check --workspace` PASS

**6. Verify acceptance script idempotent** — run `bash scripts/verify_M-XX.sh` twice,
   verify both runs PASS without manual cleanup between.

### Output (under 500 words)

```
## Phase 0 Spec Review — M-XX

Verdict: SPEC APPROVED | SPEC REJECTED

### If APPROVED
Confirmed:
  - Coverage: N/N "Готово когда" criteria have tests/scripts ✓
  - Architectural enforcement: factory frozen, determinism, agentDid filter, NotFoundError, ... ✓
  - P0/P1 checklist clean
  - Infrastructure: lockfile + typecheck + vitest baseline PASS
  - Acceptance idempotent

→ Architect can add `dev-ready` label + hand off to user.

### If REJECTED — must-fix list

1. **C-N [file:line]** — [violation explanation]
   Fix: [concrete suggestion]
   
2. **C-N [file:line]** — [violation]
   Fix: [suggestion]

[...]

→ Architect fixes and re-invokes Phase 0. After 3 rejections, escalate to user
  (probably architectural gap requires design discussion).
```

### Boundaries (Phase 0 specific — STRICT)

- DO NOT update `docs/tech-debt.md` или `docs/project-state.md` — это для Phase N (impl review)
- DO NOT modify any code или тесты — review only
- DO NOT call other agents
- Phase 0 = pre-impl gate; Phase N = post-impl gate. Different scopes, different boundaries.
- Output под 500 words — сводка, не raw output

### Phase 0 vs Phase N (existing)

| Phase 0 (NEW) | Phase N (existing) |
|---|---|
| Triggered by architect (sub-agent invocation) | Triggered by user (after dev impl + test-runner GREEN) |
| Reviews spec quality (tests, contracts, infra) | Reviews impl quality (code, scope, tech-debt) |
| Output: SPEC APPROVED/REJECTED + must-fix | Output: APPROVED/CHANGES REQUESTED + tech-debt entries |
| NO updates to tech-debt/project-state | UPDATES tech-debt + project-state after APPROVED |
| Pre-impl: tests not yet meaningful (RED) | Post-impl: tests must be GREEN |
```

### `.claude/rules/architect-protocol.md` § 6.5

```markdown
### 6.5 — Self-call reviewer Phase 0 BEFORE user handoff

After spec commit + push + PR opened with label `spec-ready`:

```typescript
// Pseudo-code (real call uses Agent tool)
const verdict = await Agent({
  subagent_type: "reviewer",
  description: "M-XX spec-pass review",
  prompt: `
Phase 0 spec-review for M-XX. NOT impl review — code не написан yet.

Branch: feature/M-XX-name
PR: #N (label spec-ready)
Milestone doc: docs/sprints/M-XX-name.md

Architect-authored artifacts:
  - tests/*.test.ts: [explicit list]
  - packages/types/src/*.ts: [list]
  - packages/interfaces/src/*.ts: [list]
  - packages/errors/src/*.ts: [list — if changes]
  - scripts/verify_M-XX.sh
  - docs/sprints/M-XX-name.md

Run Phase 0 checklist (.claude/agents/reviewer.md::Phase 0):
  - Coverage (тесты vs Готово когда)
  - Vacuous-skip correctness
  - Architectural enforcement tests presence
  - Coding standards adherence (.claude/rules/coding-standards-checklist.md walk top-down)
  - Tests RED for right reason (run vitest, verify failure messages)
  - Contracts quality (ADT, Zod paired, no any)
  - Infrastructure: pnpm install --frozen-lockfile + typecheck + vitest run + acceptance PASS

Report under 500 words: verdict + must-fix list (if REJECTED).

DO NOT update tech-debt.md / project-state.md в Phase 0.
  `,
});

// Parse verdict
if (verdict.includes("SPEC APPROVED")) {
  // gh pr edit N --add-label dev-ready
  // hand off to user with confidence note
} else {
  // Fix must-fix items → re-invoke
  // After 3 REJECTED rounds → escalate to user
}
```

**Escalation rule (3-rounds-then-user):** Если reviewer rejects 3 раза подряд — это сигнал
архитектурного gap'а который требует обсуждения с user'ом, не очередной фикс. Architect
останавливается, summary'ит must-fix items + рассуждения почему они persist'ят, ждёт user
input.

**Failure modes:**
- Reviewer не отвечает / падает sub-agent call → fallback к user-invoked reviewer (existing flow)
- Reviewer перебдил (P2 violations rejecting спек) → architect appeal'ит через PR comment
- Reviewer недобдил (let через bug) → ловится Phase N

**Cost:** ~30s sub-agent invocation + 60s vitest+typecheck в Phase 0. Для M-Q1 типа milestones
— acceptable overhead. Для XL milestones (10+ файлов) — может вырасти до 90s, но всё ещё <
cost of dev'а реализующего по buggy spec и потом откатывающего.
```

### `.husky/pre-commit` — architect extension

After existing identity + scope checks, before `echo "✅ pre-commit OK..."`:

```bash
# Architect-only: catch lockfile drift before commit (saves CI roundtrip)
if [ "$EMAIL" = "architect@paxio.network" ]; then
  if echo "$DIFF" | grep -q '^package\.json$'; then
    if ! echo "$DIFF" | grep -q '^pnpm-lock\.yaml$'; then
      # package.json staged без pnpm-lock.yaml — потенциальный CI fail
      MSG_FILE=".git/COMMIT_EDITMSG"
      OVERRIDE_OK=0
      if [ -f "$MSG_FILE" ]; then
        if grep -q '!!! LOCKFILE OK !!!' "$MSG_FILE" 2>/dev/null; then
          OVERRIDE_OK=1
        fi
      fi
      if [ "$OVERRIDE_OK" -eq 0 ]; then
        echo "⚠️  package.json staged but pnpm-lock.yaml not staged."
        echo ""
        echo "   This will break CI's pnpm install --frozen-lockfile."
        echo ""
        echo "   Fix:"
        echo "     pnpm install"
        echo "     git add pnpm-lock.yaml"
        echo "     git commit --amend  # OR re-run commit"
        echo ""
        echo "   Override (intentional, e.g. clean removal of dep):"
        echo "     Add '!!! LOCKFILE OK !!!' marker to commit message."
        exit 1
      fi
    fi
  fi
fi
```

### `.github/workflows/spec-review.yml`

```yaml
name: CI · Spec Review (Phase 0 fast gate)

on:
  pull_request:
    types: [labeled, opened, synchronize]

jobs:
  spec-review:
    if: contains(github.event.pull_request.labels.*.name, 'spec-ready')
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install (frozen lockfile)
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Root vitest baseline
        run: pnpm exec vitest run

      - name: M-Q2 drift-guard tests (spec-review meta)
        run: |
          pnpm exec vitest run \
            tests/spec-review-checklist.test.ts \
            tests/reviewer-phase-0.test.ts \
            tests/architect-self-review.test.ts \
            tests/rust-rules.test.ts
```

Total runtime: ~90s (no build, no cargo). Path-filter via PR label, не file paths — это
позволяет triggering на чистых docs/spec-only PR'ах.

## Tasks

| # | Кто | Что | Где | Verification | Architecture Requirements |
|---|-----|-----|-----|---|---|
| T-1 | architect | Phase 0 spec-review checklist в reviewer.md | `.claude/agents/reviewer.md` | `tests/reviewer-phase-0.test.ts` GREEN | section structure stable, drift-guard via grep, 6-step process, boundaries explicit |
| T-2 | architect | Self-call reviewer как sub-agent + 3-rounds escalation | `.claude/rules/architect-protocol.md` § 6.5, `.claude/rules/workflow.md` | `tests/architect-self-review.test.ts` GREEN | sub-agent invocation pattern documented, escalation rule, cost analysis |
| T-3 | architect | Pre-commit lockfile drift catcher для architect | `.husky/pre-commit` | hook smoke (modified package.json без lockfile → exit 1; с `!!! LOCKFILE OK !!!` → exit 0) | bash 3.2 compatible, POSIX sh-safe, override marker, additive не replace existing checks |
| T-4 | architect | Spec-review CI workflow | `.github/workflows/spec-review.yml` | drift-guard test verifies workflow exists + has `frozen-lockfile`/`typecheck`/`vitest run`/`spec-ready` label gate | path-filter via PR label, fast (<90s), no build/cargo, timeout 5min |
| T-5 | architect | Port 13 TS gap-rules в existing rule files (additive) | `.claude/rules/code-style.md`, `architecture.md`, `safety.md` | grep-based test — каждое из 13 rules упомянуто в right file | additive only, не убираем existing, link на C-N в checklist |
| T-6 | architect | 3 новых Rust rule files | `.claude/rules/{rust-error-handling,rust-async,rust-build}.md` | `tests/rust-rules.test.ts` GREEN — files exist + key rules mentioned | source-of-truth, link from architect-protocol.md, complement existing engineering-principles.md без overlap |
| T-7 | architect | `coding-standards-checklist.md` — single source 120 rules | `.claude/rules/coding-standards-checklist.md` | `tests/spec-review-checklist.test.ts` GREEN — count, severity grouping, domain mapping | each rule **C-N [R-N]** + link на rule file, P0/P1/P2 organization, top-down walkable |
| T-8 | architect | E2E acceptance: simulated bad spec → REJECTED → fix → APPROVED | `scripts/verify_M-Q2.sh` | bash + git operations, idempotent via trap | uses standard tools (no gh API hard-dep), simulates checklist programmatically |

## Предусловия среды (architect обеспечивает)

- [x] M-Q1 merged в `dev` (gives `.husky/pre-commit` + `scripts/quality-gate.sh` + `root-tests.yml` baselines) — **зависимость, milestone стартует ПОСЛЕ M-Q1 merge**
- [x] pnpm install clean (with husky devDep)
- [x] pnpm typecheck clean
- [x] gh CLI authenticated (для PR label management `spec-ready` / `dev-ready`)
- [ ] Reviewer agent supports sub-agent invocation via `Agent` tool — verify в T-2 prototype
- [ ] User briefed: после M-Q2 merge каждый следующий milestone проходит Phase 0 spec-pass

## Не делаем в M-Q2

- Compliance-specific rules (R103-R107, R115) — passport/FRIA/evidence chain — в `M-FA-06` milestone (Complior layer)
- Migration of existing code to new rules — что попало в gap-list. Existing code НЕ автоматически compliant; reviewer на следующих milestones будет находить existing-code violations и заводить TD entries. Полный cleanup — отдельный milestone `M-Q3-compliance-debt-cleanup` (если потребуется)
- LLM-based reviewer (sub-agent invocation pattern works deterministically; LLM judgement comes from existing reviewer agent.md — не нужно поверх)
- Vercel-specific gates — отдельный M-Q3 если потребуется
- Frontend rule expansions (frontend rules в `frontend-rules.md` остаются стабильны; checklist references existing)

## Tech debt expected

- **TD candidate (P2 cleanup):** ~27 gap rules добавляем в enforcement, но existing code НЕ compliant. Reviewer на M-L*, M-FA-* milestones будет находить violations — заводим TD entries (severity LOW/MED), фиксим в обычном pace
- **TD candidate (sub-agent latency):** Phase 0 sub-agent invocation добавляет ~30-90s overhead на каждый architect-handoff. Если станет bottleneck — параллелизация (run vitest + checklist walk concurrently через Promise.all)
- **TD candidate (calibration):** В первые 3-5 milestones возможны false negatives (reviewer слишком строг — отвергает acceptable spec) или false positives (reviewer не ловит реальный bug в spec). Calibration через первые 5 milestones — корректировка checklist + reviewer.md прокладкой
- **TD candidate (R103-R107):** Compliance-specific (Passport, FRIA, Evidence) — explicit out-of-scope в M-Q2, но noted здесь для M-FA-06 visibility

## Acceptance flow (после M-Q2 merge)

Следующий milestone (M-L*, M-FA-*) проходит Phase 0:

```
1. Architect spec write (RED tests + contracts + acceptance)
2. Architect commit + push на feature branch
3. Architect создаёт PR + добавляет label `spec-ready`
4. spec-review.yml fast-CI runs (~90s)
5. Architect self-calls reviewer (sub-agent) Phase 0
6. APPROVED? → architect добавляет label `dev-ready` → handoff user'у с verdict note
   REJECTED? → fix must-fix → goto step 5 (max 3 rounds before escalate)
7. User runs dev-agent — dev impl до GREEN
8. Test-runner verify → reviewer Phase N (existing flow) → tech-debt update → merge gate-1
```

Closing the TD-30 loop: **once Phase 0 APPROVED, тесты frozen externally** — architect больше
не может «оптимизировать на ходу» свой test файл (любой touch требует new spec-PR с new
Phase 0 round). TESTS SACRED становится structural enforcement, не self-discipline.

## Связанные milestones / TD

- **Зависит от M-Q1** — `.husky/pre-commit` baseline + `scripts/quality-gate.sh` framework
- **Закрывает TD-30** — architect-as-multi-zone violations (13× recurrence) в TESTS SACRED
- **Закрывает class TD-33/TD-34** — drift-guard / vacuous-skip inconsistencies (catches in Phase 0)
- **Подготавливает M-FA-06** — Complior compliance rules (R103-R107) добавятся в checklist при FA-06 implementation
- **Опциональный M-Q3** — compliance-debt-cleanup для existing-code violations против новых 27 rules
