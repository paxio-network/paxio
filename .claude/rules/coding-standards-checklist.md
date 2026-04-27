---
description: Single-source 120-rule coding standards checklist for reviewer Phase 0 + Phase N walks. Reviewer/architect reference. Dev-agents read individual rule files (frontend-rules.md / backend-architecture.md / rust-*.md) via their narrow globs.
globs: ["docs/sprints/**/*.md", "docs/feature-areas/**/*.md", "packages/{types,interfaces,errors,contracts}/**/*.ts", "tests/**/*.test.ts"]
---

# Coding Standards Checklist — 120 Rules

> **Single source of truth for code style + architecture invariants.**
>
> Sourced from `/home/openclaw/PROJECT` (R1–R80, TypeScript/backend) + `/home/openclaw/complior`
> (R81–R120, Rust/canister/compliance).
>
> **Reviewer Phase 0** (spec review — pre-impl) AND **Phase N** (impl review — post-impl)
> walk this checklist top-down: **P0 → P1 → P2**. P0 violations = automatic REJECT. P1
> violations = REJECT unless `!!! SCOPE REQUEST !!!` rationale present. P2 violations = list
> as must-fix or defer to TD with rationale (architect's call).
>
> Each rule format: **C-N [R-N source]** description → link to enforcement rule file
> (`./rule-file.md`) where the full pattern lives.
>
> **Counts:** P0 = 12, P1 = 38, P2 = 70. Total = 120.

---

## P0 — Security/Correctness (12 rules — ALL MUST PASS, no exceptions)

- **C1 [R9]** VM sandbox isolation — `app/` cannot `require()` / `import` / I/O ([backend-architecture.md](backend-architecture.md))
- **C2 [R13,R60]** Multi-tenancy: every SQL has `WHERE agent_did=$1` or `WHERE organization_id=$1`. Identity from `session.*`, NEVER `body.*` ([backend-architecture.md](backend-architecture.md))
- **C3 [R21]** Parameterized queries only — no string concat in SQL ([safety.md](safety.md))
- **C4 [R22]** No secrets in code — `.env` only, accessed via injected `config` ([safety.md](safety.md))
- **C5 [R66]** No `any` in TS — use `unknown` + Zod parse ([code-style.md](code-style.md))
- **C6 [R67]** No `as Type` cast without runtime validation — use type narrowing or Zod ([code-style.md](code-style.md))
- **C7 [R82]** Rust edition 2024 + clippy `pedantic + nursery` warn → zero warnings ([rust-build.md](rust-build.md))
- **C8 [R84]** Rust no `unwrap()` / `panic!()` in production — only `expect("invariant explained")` ([rust-error-handling.md](rust-error-handling.md))
- **C9 [R109]** Data externalization — no hardcoded thresholds/fees/URLs/model-names в коде ([code-style.md](code-style.md))
- **C10 [R117]** Panic-free CLI/canister — all errors → Result type ([rust-error-handling.md](rust-error-handling.md))
- **C11 [R118]** localhost-only IPC, never `0.0.0.0` ([safety.md](safety.md))
- **C12 [R20]** Zod runtime validation on every API boundary ([backend-api-patterns.md](backend-api-patterns.md))

---

## P1 — Architectural Invariant (38 rules — must pass unless explicit `!!! SCOPE REQUEST !!!` rationale)

### TypeScript / Backend (8 rules)

- **C13 [R1]** No `class` in `app/` (except Error subclasses) ([backend-code-style.md](backend-code-style.md))
- **C14 [R2]** Plain objects + free functions + factory functions с `create` prefix ([backend-code-style.md](backend-code-style.md))
- **C15 [R3]** Domain purity — zero I/O / side-effects в `app/domain/` ([backend-code-style.md](backend-code-style.md))
- **C16 [R11]** Loading order strict: `lib → domain → application → api` ([backend-architecture.md](backend-architecture.md))
- **C17 [R12]** Onion deps: strictly inward, no reverse imports ([architecture.md](architecture.md))
- **C18 [R14]** API handler format: `{ httpMethod, path, method }` ([backend-api-patterns.md](backend-api-patterns.md))
- **C19 [R18]** AppError hierarchy: 5 subclasses (Validation/Auth/Forbidden/NotFound/Conflict/Protocol) ([backend-api-patterns.md](backend-api-patterns.md))
- **C20 [R63]** Startup protocol: 7-step announcement before code ([startup-protocol.md](startup-protocol.md))

### TypeScript / Frontend (3 rules)

- **C21 [R-front-1]** Real-data invariant: no `Math.random()` / hardcoded "live" numbers, fetch via `@paxio/api-client` ([frontend-rules.md](frontend-rules.md))
- **C22 [R-front-2]** Privy session via `@paxio/auth`, never `localStorage` direct ([frontend-rules.md](frontend-rules.md))
- **C23 [R-front-3]** Radix через `@paxio/ui`, no custom Dialog/Button from scratch ([frontend-rules.md](frontend-rules.md))

### Rust / Canister (7 rules)

- **C24 [R83]** thiserror в библиотеках, anyhow ТОЛЬКО в `main()` ([rust-error-handling.md](rust-error-handling.md))
- **C25 [R85]** `tokio::fs` not `std::fs` в async, минимизировать lock duration ([rust-async.md](rust-async.md))
- **C26 [R86]** `#[serde(rename_all="camelCase")]` для всех wire-структур TS↔Rust ([backend-architecture.md](backend-architecture.md))
- **C27 [R88]** Enum over strings для finite sets, exhaustive match ([engineering-principles.md](engineering-principles.md))
- **C28 [R94]** thiserror enum с `#[from]` для auto error propagation ([rust-error-handling.md](rust-error-handling.md))
- **C29 [R102]** `wrap_err()` для context-rich errors через `color_eyre::eyre` ([rust-error-handling.md](rust-error-handling.md))
- **C30 [R114]** `#[serde(deny_unknown_fields)]` + `TryFrom<RawConfig>` validation ([rust-error-handling.md](rust-error-handling.md))

### Testing (5 rules)

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

### Multi-tenancy / Safety (3 rules)

- **C36 [R-mt-can]** Inter-canister calls: identity via `ic_cdk::caller()`, NEVER аргумент ([backend-architecture.md](backend-architecture.md))
- **C37 [R-mt-pub]** Public exceptions в явный whitelist в backend-architecture.md ([backend-architecture.md](backend-architecture.md))
- **C38 [R-audit]** Audit log append-only, ownership immutable ([backend-architecture.md](backend-architecture.md))

### Architecture / Process (12 rules)

- **C39 [R64]** CI enforcement: lint, test, audit на каждый PR ([scope-guard.md](scope-guard.md))
- **C40 [R72]** No hardcoded values: ports/URLs/keys через `app/config/` или env ([code-style.md](code-style.md))
- **C41 [R-scope]** Scope-guard mechanical hook (`.husky/pre-commit`) ([scope-guard.md](scope-guard.md))
- **C42 [R-test-spec]** Tests как specs: architect только пишет, dev только читает ([scope-guard.md](scope-guard.md))
- **C43 [R-onion-dep]** Layer imports: api/ → application/ → domain/ → lib/, strictly ([architecture.md](architecture.md))
- **C44 [R-fa-mapping]** FA → physical paths via `docs/fa-registry.md` ([architecture.md](architecture.md))
- **C45 [R119]** License header: AGPL-3.0-only or compatible в `Cargo.toml` / `package.json` ([rust-build.md](rust-build.md))
- **C46 [R45]** Distinguish system vs business errors в jobs (retry vs no-retry) ([architecture.md](architecture.md))
- **C47 [R48]** Layer Import Rules — strictly enforce onion ([architecture.md](architecture.md))
- **C48 [R62]** External service patterns — per-layer usage ([backend-api-patterns.md](backend-api-patterns.md))
- **C49 [R-mq1-quality-gate]** quality-gate.sh — single command для test-runner agent ([workflow.md](workflow.md))
- **C50 [R-mq1-pre-commit]** .husky/pre-commit — mechanical scope+identity enforcement ([scope-guard.md](scope-guard.md))

---

## P2 — Style/Best-Practice (70 rules — must pass for new code; deferred fix tracked as TD if violated в existing)

### TypeScript style — Naming + format (10 rules)

- **C51 [R5]** kebab-case files в `server/` + `app/` ([code-style.md](code-style.md))
- **C52 [R7]** camelCase functions/variables ([code-style.md](code-style.md))
- **C53 [R8]** UPPER_SNAKE_CASE constants ([code-style.md](code-style.md))
- **C54 [R26]** `===` / `!==` only, no `==` / `!=` ([code-style.md](code-style.md))
- **C55 [R27]** No `var`, only `const` / `let` ([code-style.md](code-style.md))
- **C56 [R28]** No implicit type coercion ([code-style.md](code-style.md))
- **C57 [R29]** No `for...in`, use `Object.keys() + for...of` ([code-style.md](code-style.md))
- **C58 [R30]** No `delete obj.prop`, use spread exclusion ([code-style.md](code-style.md))
- **C59 [R32]** No RxJS / generators-as-async / Deferred / Async.js — async/await only ([code-style.md](code-style.md))
- **C60 [R33]** Early returns to flatten nesting ([code-style.md](code-style.md))

### TypeScript style — FP discipline (10 rules)

- **C61 [R34]** No `.forEach()` с outer-scope mutation, use `.map/filter/reduce` ([code-style.md](code-style.md))
- **C62 [R35]** Return objects (named fields), not arrays ([code-style.md](code-style.md))
- **C63 [R36]** Consistent return shape (same fields всех ветках) ([code-style.md](code-style.md))
- **C64 [R37]** No code duplication — extract helper after 2nd repetition ([code-style.md](code-style.md))
- **C65 [R38]** SRP: one function = one task ([engineering-principles.md](engineering-principles.md))
- **C66 [R39]** Max file length: 300 lines ([code-style.md](code-style.md))
- **C67 [R40]** Monomorphic objects (V8 hidden classes stable) ([code-style.md](code-style.md))
- **C68 [R47]** Law of Demeter — no `a.b.c.d.e()`, max 1-level chaining ([code-style.md](code-style.md))
- **C69 [R52]** Max line length 100 chars ([code-style.md](code-style.md))
- **C70 [R57]** No dead code, no TODO без milestone reference ([backend-code-style.md](backend-code-style.md))

### TypeScript / Type system (10 rules)

- **C71 [R58]** Conventional commits: `feat/fix/test/docs/refactor` ([scope-guard.md](scope-guard.md))
- **C72 [R69]** Union types вместо `enum` keyword ([code-style.md](code-style.md))
- **C73 [R70]** `readonly` properties по умолчанию ([code-style.md](code-style.md))
- **C74 [R73]** No `.bind()` / `.call()` / `.apply()` — closures ([backend-code-style.md](backend-code-style.md))
- **C75 [R74]** One file = one concept, no `index.js` в `app/` ([backend-code-style.md](backend-code-style.md))
- **C76 [R75]** Discriminated unions > optional fields ([code-style.md](code-style.md))
- **C77 [R43]** CQS: command (mutation, no return) vs query (return, no mutation) ([architecture.md](architecture.md))
- **C78 [R44]** Domain events = anemic objects, serializable ([architecture.md](architecture.md))
- **C79 [R46]** Idempotency через GUID для job queue ([architecture.md](architecture.md))
- **C80 [R87]** Prefer `&T`, `&[T]` > `Clone`, `Arc<RwLock<T>>` для shared async state ([rust-async.md](rust-async.md))

### Rust / Style (10 rules)

- **C81 [R89]** Builder pattern для structs >3 optional fields ([engineering-principles.md](engineering-principles.md))
- **C82 [R90]** Newtype pattern для domain types: `struct Did(String)`, `struct Satoshi(u64)` ([rust-async.md](rust-async.md))
- **C83 [R93]** `pub(crate)` for internal helpers, `pub` only for public API ([rust-build.md](rust-build.md))
- **C84 [R96]** String types: `&str` < `String` < `Cow<'a, str>` ([rust-async.md](rust-async.md))
- **C85 [R97]** Iterator chains lazy, no intermediate `.collect()` ([rust-async.md](rust-async.md))
- **C86 [R99]** Snapshot tests via `insta` для terminal/CLI/TUI output ([testing.md](testing.md))
- **C87 [R101]** Mock external boundaries (HTTP, file I/O, network); test pure logic ([testing.md](testing.md))
- **C88 [R112]** Clippy exceptions documented в `Cargo.toml` с rationale comment ([rust-build.md](rust-build.md))
- **C89 [R113]** Release profile: lto, codegen-units=1, strip, panic=abort ([rust-build.md](rust-build.md))
- **C90 [R55]** Coverage thresholds по слою: domain 60-90%, api 60-80%, security-critical 80-100% ([testing.md](testing.md))

### Testing additional (5 rules)

- **C91 [R-test-isolation]** Test fixture isolation: tempdir, no shared state между tests ([testing.md](testing.md))
- **C92 [R-test-determinism]** Tests deterministic — no `Date.now()` или `Math.random()` без seeded mock ([testing.md](testing.md))
- **C93 [R23]** Data residency rules (where applicable per FA — EU AI Act) ([safety.md](safety.md))
- **C94 [R24]** No PII in logs, no stack traces в client response ([safety.md](safety.md))
- **C95 [R25]** ESLint strict config: `eqeqeq`, `no-var`, `prefer-const`, `no-eval` ([code-style.md](code-style.md))

### Compliance / Safety additional (5 rules)

- **C96 [R59]** Session resolution: token verified by server BEFORE handler call ([backend-api-patterns.md](backend-api-patterns.md))
- **C97 [R65]** DB transactions через disposable pattern ([backend-architecture.md](backend-architecture.md))
- **C98 [R71]** Module-scoped state в closures OK, no `global` exports ([backend-code-style.md](backend-code-style.md))
- **C99 [R77]** No global state в `app/`, sandbox isolated per-request ([backend-architecture.md](backend-architecture.md))
- **C100 [R80]** Security audit CI gate: `npm audit --audit-level=critical` blocks deploy ([scope-guard.md](scope-guard.md))

### Architecture / Workflow (10 rules)

- **C101 [R6]** PascalCase для schema files (Zod schemas в packages/types/) ([code-style.md](code-style.md))
- **C102 [R15]** No middleware pattern — explicit calls в handler ([backend-api-patterns.md](backend-api-patterns.md))
- **C103 [R16]** Access levels: public, authenticated, admin ([backend-api-patterns.md](backend-api-patterns.md))
- **C104 [R17]** No try/catch в handlers — errors bubble to global handler ([backend-api-patterns.md](backend-api-patterns.md))
- **C105 [R31]** No middleware enforcement в CI ([scope-guard.md](scope-guard.md))
- **C106 [R41]** Promise.all() для parallel operations ([engineering-principles.md](engineering-principles.md))
- **C107 [R42]** AbortSignal для cancellation + timeout ([engineering-principles.md](engineering-principles.md))
- **C108 [R61]** Background jobs via pg-boss / equivalent ([backend-api-patterns.md](backend-api-patterns.md))
- **C109 [R76-style]** No chained comparisons (`x < y < z`) — explicit bounds ([code-style.md](code-style.md))
- **C110 [R78]** Service boundary — request lifecycle isolation ([backend-architecture.md](backend-architecture.md))

### Rust additional (10 rules)

- **C111 [R79]** Logging via injected `console`/`tracing`, never `process.env` ([backend-code-style.md](backend-code-style.md))
- **C112 [R81]** Workspace architecture: single Cargo.toml root ([rust-build.md](rust-build.md))
- **C113 [R91]** Elm Architecture (MVU) для TUI/CLI state machines ([engineering-principles.md](engineering-principles.md))
- **C114 [R92]** Render functions pure, immutable `&App`, no side effects ([engineering-principles.md](engineering-principles.md))
- **C115 [R95]** Trait-based DI for testability (port traits + mock impls) ([engineering-principles.md](engineering-principles.md))
- **C116 [R110]** Headless + TUI architecture: shared engine + thin client ([engineering-principles.md](engineering-principles.md))
- **C117 [R111]** Feature flags для build variants — default `[]` ([rust-build.md](rust-build.md))
- **C118 [R120]** deny.toml: audit dependency graph, block unmaintained ([rust-build.md](rust-build.md))
- **C119 [R-mq1-root-tests]** Root vitest CI workflow catches workspace config drift ([scope-guard.md](scope-guard.md))
- **C120 [R-mq1-husky-reexec]** Husky v9 hooks invoked via sh -e — bash reexec guard required ([scope-guard.md](scope-guard.md))

---

## Domain mapping

| Domain | Rules count | Source files (where enforcement lives) |
|---|---|---|
| **TypeScript** | 45 | `code-style.md`, `backend-code-style.md`, `frontend-rules.md`, `architecture.md`, `safety.md` |
| **Rust** | 32 | `rust-error-handling.md`, `rust-async.md`, `rust-build.md`, `engineering-principles.md` |
| **Testing** | 15 | `testing.md`, `architect-protocol.md` |
| **Compliance** | 12 | `safety.md`, `backend-api-patterns.md`, `engineering-principles.md` |
| **Architecture** | 16 | `architecture.md`, `backend-architecture.md`, `engineering-principles.md`, `scope-guard.md` |

**Total: 120 rules.** Distribution may sum slightly differently due to multi-domain rules
(some rules touch testing AND architecture, etc.) — domain mapping above shows primary
classification.

---

## Phase 0 reviewer walk procedure

1. **Read milestone "Готово когда"** — count criteria, build expectation list
2. **Read RED tests + contracts** — for each criterion, find corresponding test or
   acceptance check. Coverage check.
3. **Run vitest** на новых файлах — verify tests RED for right reason ("module not found",
   not "buggy spec / wrong fixture")
4. **Walk this checklist top-down** (P0 → P1 → P2):
   - **P0 violations** → automatic `SPEC REJECTED`
   - **P1 violations** → `SPEC REJECTED` unless `!!! SCOPE REQUEST !!!` rationale present in
     architect's PR description
   - **P2 violations** → list as must-fix или defer to TD с rationale
5. **Verify infrastructure clean**:
   - `pnpm install --frozen-lockfile` PASS (no lockfile drift)
   - `pnpm typecheck` PASS
   - `pnpm exec vitest run` baseline PASS
   - For Rust changes: `cargo check --workspace` PASS
6. **Verify acceptance script idempotent** — run `bash scripts/verify_M-XX.sh` twice,
   verify both runs PASS without manual cleanup

## Output format (Phase 0 reviewer, under 500 words)

```
## Phase 0 Spec Review — M-XX

Verdict: SPEC APPROVED | SPEC REJECTED

### If APPROVED
Confirmed:
  - Coverage: N/N "Готово когда" criteria have tests/scripts ✓
  - Architectural enforcement (factory frozen, determinism, agentDid filter, ...) ✓
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

→ Architect fixes and re-invokes Phase 0. After 3 rejections, escalate to user.
```

---

## See also

- [.claude/agents/reviewer.md](../agents/reviewer.md) — Phase 0 + Phase N review processes
- [.claude/rules/architect-protocol.md](architect-protocol.md) — § 6.5 sub-agent invocation
- [.claude/rules/workflow.md](workflow.md) — full pipeline (architect → Phase 0 → dev → Phase N → merge)
- Donor research: `/home/openclaw/PROJECT/.claude/rules/` + `/home/openclaw/complior/CODING-STANDARDS-RUST.md`
