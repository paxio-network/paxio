# Project State — Paxio

> Этот файл обновляется ревьюером ПОСЛЕ merge в main.
> Architect читает при scan, но НЕ редактирует.

## Версия
**Version:** 0.1.0
**Last Updated:** 2026-04-23
**Last Commit:** `23c4d57` (M01b Frontend Bootstrap + M01c TD-05/TD-06 closure reviewed — architect-authored across board, 4 new tech debts)

---

## Product Overview

Paxio Agent Financial OS — некастодиальный финансовый OS на базе ICP.
7 продуктов (P1-P7), 10 Feature Areas (FA-01 — FA-10).

---

## Модули

### Phase 0 (Foundation) — ✅ DONE

| Модуль | Status | Заметки |
|--------|--------|---------|
| M00: Monorepo bootstrap | ✅ DONE | git init, npm workspaces, tsconfig, vitest, eslint, prettier, CI stub |
| M00: Types + interfaces | ✅ DONE | Result<T,E>, Did, Capability, AgentCard, ErrorCode, Logger, Clock |
| M00: AppError hierarchy | ✅ DONE | `app/errors/index.ts` — 9 classes, toJSON() RFC 7807-lite |
| M00: Logger + Clock impl | ✅ DONE | `app/lib/logger.ts` (pino), `app/lib/clock.ts` (system + fixed) |
| M00: Server scaffolding | ✅ DONE | `server/main.cjs` + `src/{http,loader,logger,ws}.cjs`, ported from Olympus |
| M00: Acceptance + E2E | ✅ DONE | `scripts/verify_foundation.sh` 11/11 PASS; `docs/e2e/M00-foundation-canary.md` |
| M00c: canister-shared primitives | ✅ DONE | `platform/canister-shared/` — AgentId, TxHash. `cargo test -p canister-shared` 9 GREEN; `scripts/verify_m00c_canister_shared.sh` 22/22 PASS |
| M00c: dfx-setup + dev-env doc | ✅ DONE | `scripts/dfx-setup.sh` + `docs/paxio-dev-environment.md` (architect-authored one-shot, TD-03 ACK) |
| P0: DKI Canister | ⬜ НЕ НАЧАТО | threshold ECDSA foundation (M01+) |
| P0: Guard Agent | ⬜ НЕ НАЧАТО | External Python service (отдельный репо) |

### Phase 1 (P1 — Universal Registry)

| Модуль | Status | Заметки |
|--------|--------|---------|
| M01: Registry TS (FA-01 core) | ✅ DONE | `products/01-registry/app/` — DID gen, register/resolve/find/claim/count handlers, in-memory store, semantic search. 20/20 vitest GREEN + acceptance PASS (merge `a53d1a9` `7d7951f`). TD-M01-1/M01-2 ACK. |
| M01b: Frontend Bootstrap (FA-10) | 🟡 PARTIAL (architect-authored) | 8 Next.js 15 app skeletons (`apps/frontend/{landing,registry,pay,radar,intel,docs,wallet,fleet}/`) + 4 shared packages (`packages/{ui,hooks,api-client,auth}/`). 113/113 `frontend-bootstrap.test.ts` GREEN, `pnpm typecheck` clean, 8/8 `turbo build` clean, `verify_m01b_frontend.sh` 28/28 PASS. Written by architect (commit `bf417fe` + 5 fixes). TD-07 governance ACK (Level 3 scope — frontend-dev was available). TD-08 smoke tests dead/buggy (`existsSync` wrong import + wrong relative path + vitest exclude) BACKLOG. TD-09 ESLint `ignoreDuringBuilds: true` band-aid BACKLOG. Skeletons = «coming soon» placeholders; real sections arrive in M01c. |
| FA-01: Capability system | ✅ DONE (v0) | 5 capabilities shipped in M01 registry types/search |
| FA-01: Reputation canister | ⬜ НЕ НАЧАТО | Rust canister (FA-09 milestone) |
| FA-01: Frontend UI | ⬜ НЕ НАЧАТО | Agent explorer (M11+) |

### Phase 2 (P2 — Meta-Facilitator)

| Модуль | Status | Заметки |
|--------|--------|---------|
| FA-02: Escrow canister | ⬜ НЕ НАЧАТО | Hold/release |
| FA-02: Routing engine | ⬜ НЕ НАЧАТО | Multi-hop |
| FA-02: Settlement engine | ⬜ НЕ НАЧАТО | Fiat on/off |

### Phase 3 (P3 — Wallet + Reputation)

| Модуль | Status | Заметки |
|--------|--------|---------|
| M02: Wallet Canister MVP (FA-03) | ✅ DONE | `products/03-wallet/canister/` — threshold ECDSA (mock-feature), BTC address derivation, stable storage. `cargo test -p wallet --features mock-ecdsa` 8/8 GREEN; `cargo test -p canister-shared` 9/9 GREEN (merge `cb8ae3b`). |
| FA-03: Wallet SDK + MCP | ⬜ НЕ НАЧАТО | `products/03-wallet/{sdk-ts,sdk-python,mcp-server}/` |
| FA-09: Reputation canister | ⬜ НЕ НАЧАТО | On-chain scoring |

### Phase 4 (P4 — Security + Guard)

| Модуль | Status | Заметки |
|--------|--------|---------|
| M03: Security Sidecar Intent Verifier (FA-04) | ✅ DONE | `products/04-security/canister/` — Rust canister, deterministic intent verification. `cargo test -p security_sidecar` 7/7 GREEN, `cargo build -p security_sidecar --release` clean. Landed via cherry-pick of `7f54c84` (now `037f991`) — full merge avoided because branch was 4+ commits stale (M00c/M01/M02 already on dev). Conflicts resolved: crate Cargo.toml + src/lib.rs took theirs (real impl over M02 stub); root Cargo.toml comment updated stub→real. |
| FA-08: Guard Agent | ⬜ НЕ НАЧАТО | 11 ML classifiers |

### Phase 5 (P5 — Bitcoin Agent)

| Модуль | Status | Заметки |
|--------|--------|---------|
| FA-05: BTC ↔ ckBTC bridge | ⬜ НЕ НАЧАТО | Chain Fusion |
| FA-05: Multi-sig | ⬜ НЕ НАЧАТО | 2-of-3 workflows |

### Phase 6 (P6 — Compliance)

| Модуль | Status | Заметки |
|--------|--------|---------|
| M04: Audit Log Canister MVP (FA-06) | ✅ DONE | `products/06-compliance/canisters/audit-log/` — SHA-256 hash chain, append-only, stable storage. `cargo test -p audit_log` 7/7 GREEN; `bash scripts/verify_m04_audit_log.sh` 7/7 PASS. Landed via cherry-pick of `de90b10` (now `7ca66b5`) — same salvage pattern as M03 (branch 4+ commits stale; skipped sibling-stubs prep commit). Conflicts resolved: kept theirs for crate Cargo.toml + src/lib.rs (real impl over stub); Cargo.lock kept theirs; root Cargo.toml comment updated stub→real. |
| FA-06: KYC/AML | ⬜ НЕ НАЧАТО | Travel Rule |

### Phase 7 (P7 — Intelligence)

| Модуль | Status | Заметки |
|--------|--------|---------|
| M01c: Landing backend (FA-07 partial) | 🟡 PARTIAL (architect-authored) | `products/07-intelligence/app/{domain/landing-stats.ts, api/landing-*.js×7}` — `createLandingStats(deps)` factory + 7 REST endpoints. 9/9 landing-stats + 8/8 landing-td-fixes vitest GREEN. Written by architect (commits `54ac343` + `57d4cc1`). **TD-05 (Clock DI) + TD-06 (Zod bounds validation) ✅ CLOSED 2026-04-23** — `clock: () => number` inject'ится в `LandingStatsDeps`, integer bounds 1..100 check в `landing-agents-top.js`. TD-04 governance ACK покрывает scope violation (architect писал backend-dev код); TD-07 ACK рецидива (M01c TD-fix по commit `57d4cc1` продолжил паттерн). Redis 1s cache wrapper + остальные 8 frontend sections остаются для backend-dev/frontend-dev. |
| FA-07: NLU routing | ⬜ НЕ НАЧАТО | Intent parsing |
| FA-07: Context engine | ⬜ НЕ НАЧАТО | Memory |

---

## Source Structure (фактическое)

```
paxio/
├── server/                                    # Fastify infrastructure (CommonJS)
│   ├── main.cjs                               # entry point
│   ├── src/{http,loader,logger,ws}.cjs
│   ├── lib/errors.cjs                         # ⚠ mirrors app/errors/ (TD-01)
│   └── infrastructure/                        # empty, populated M01+
├── app/                                       # Business logic (VM sandbox)
│   ├── types/                                 # architect — Result, Did, Capability, AgentCard, ErrorCode
│   ├── interfaces/                            # architect — Logger, Clock
│   ├── errors/                                # ✅ DONE (M00) — AppError hierarchy
│   ├── lib/                                   # ✅ DONE (M00) — logger.ts, clock.ts
│   ├── config/                                # empty placeholder
│   ├── data/                                  # empty placeholder
│   ├── domain/                                # empty placeholder
│   └── api/                                   # empty placeholder
├── products/
│   ├── 01-registry/
│   │   └── app/                               # ✅ DONE (M01) — TS registry core
│   │       ├── api/                           # register, resolve, find, claim, count handlers
│   │       └── domain/                        # did-gen, registry, search, claim (in-memory)
│   ├── 03-wallet/
│   │   └── canister/                          # ✅ DONE (M02) — Wallet Rust canister
│   │       ├── src/{lib,ecdsa,addresses,storage,types,errors}.rs
│   │       └── wallet.did                     # Candid interface
│   ├── 04-security/
│   │   └── canister/                          # ✅ DONE (M03) — Security Sidecar Intent Verifier
│   │       └── src/{lib,verifier,storage,types,errors}.rs
│   └── 06-compliance/
│       └── canisters/audit-log/               # ✅ DONE (M04) — Audit Log (SHA-256 hash chain)
│           ├── src/{lib,chain,storage,types,errors}.rs
│           └── audit_log.did                    # Candid interface
├── platform/
│   └── canister-shared/                       # ✅ DONE (M00c) — AgentId, TxHash primitives
├── Cargo.toml                                 # ROOT Rust workspace (platform/canister-shared, products/*/canister(s))
├── packages/
│   ├── sdk/                                   # @paxio/sdk skeleton
│   ├── mcp-server/                            # skeleton
│   └── frontend/                              # placeholder (M11+)
├── cli/                                       # placeholder (M14)
├── tests/                                     # 6 test files, 72 GREEN
├── scripts/                                   # verify_foundation.sh
├── docs/                                      # strategy, roadmap, FA, sprints, e2e, product-metrics
├── opensrc/                                   # pinned external refs
└── .github/workflows/ci.yml                   # stub
```

---

## CI/CD

| Pipeline | Status | Notes |
|----------|--------|-------|
| TypeScript typecheck | ✅ STUB READY | `npm run typecheck` GREEN locally, CI job defined |
| Unit tests | ✅ STUB READY | `npm run test -- --run` 72/72 GREEN, CI job defined |
| Canister build | ✅ STUB READY | CI job defined, canisters/src/shared only |
| Integration tests | ⬜ НЕ НАСТРОЕНО | M01+ |
| Deploy to testnet | ⬜ НЕ НАСТРОЕНО | M10+ |

---

## Metrics (измеренные, M00)

| Метрика | Значение |
|---|---|
| Test files | 6 |
| Tests GREEN | 72/72 (100%) |
| Typecheck errors | 0 |
| Acceptance checks | 11/11 PASS |
| Server cold start | < 2s |
| `/health` latency | < 5ms (localhost) |

Полная таблица: `docs/product-metrics.md`.

---

## Roadmap

Документ: `docs/NOUS_Development_Roadmap.md` (architect обновляет).
M00 Foundation отмечен ✅ DONE.

---

## Review History

| Date | Reviewer | Milestone | Result | Commits |
|------|----------|-----------|--------|---------|
| 2026-04-18 | reviewer | M00 Foundation | ✅ APPROVED | `93d984d`, `dcc769e`, `2b8878e` |
| 2026-04-22 | reviewer | M00c canister-shared | ✅ APPROVED (conditional, TD-03 recorded) | `aa3dfbe` → merged as `3851150` |
| 2026-04-22 | reviewer | M01 Registry TS (FA-01) | ✅ APPROVED | `7d7951f` → merged as `a53d1a9` (20/20 vitest + acceptance; TD-M01-1/M01-2 ACK) |
| 2026-04-22 | reviewer | M02 Wallet Canister (FA-03) | ✅ APPROVED | merged as `cb8ae3b` (cargo test -p wallet --features mock-ecdsa 8/8 GREEN; -p canister-shared 9/9 GREEN) |
| 2026-04-22 | reviewer | M03 Security Sidecar Intent Verifier (FA-04) | ✅ APPROVED (cherry-pick) | landed as `037f991` (cargo test -p security_sidecar 7/7 GREEN; release build clean). Single-commit salvage from stale `feature/m03-security-sidecar` (`7f54c84`). Conflicts auto-resolved: kept theirs for crate Cargo.toml + src/lib.rs (real impl over M02 stub); root Cargo.toml member comment updated. |
| 2026-04-22 | reviewer | M04 Audit Log Canister (FA-06) | ✅ APPROVED (cherry-pick) | landed as `7ca66b5` (`cargo test -p audit_log` 7/7 GREEN; `verify_m04_audit_log.sh` 7/7 PASS). Single-commit salvage from stale `feature/m04-audit-log` (`de90b10`) — same pattern as M03. Conflicts resolved: kept theirs for crate Cargo.toml + src/lib.rs + Cargo.lock; root Cargo.toml comment updated stub→real. No tech debt recorded. |
| 2026-04-22 | reviewer | M01b Frontend Bootstrap RED spec (`d94feb6`) + milestone docs (`6741f48`) | ✅ APPROVED | architect-scope: `tests/frontend-bootstrap.test.ts` 111 RED (ожидаемые, await frontend-dev) + milestone update. No new tech debt. |
| 2026-04-22 | reviewer | M01c Landing backend-partial (FA-07) | ✅ APPROVED (conditional) | `54ac343` — architect-authored backend-dev code. Scope: Level 3 violation — TD-04 recorded (governance ACK, same pattern as TD-02/TD-03). Quality: 9/9 vitest GREEN, Result/Factory/DI clean, но TD-05 (impure `nowIso` — Clock DI нужен) и TD-06 (Zod bounds validation) BACKLOG ждут architect-тестов. Frontend (M01c §§4-10), Redis 1s cache wrapper и Zod validation остаются на backend-dev + frontend-dev. |
| 2026-04-23 | reviewer | M01c TD-05/TD-06 closure (FA-07) | ✅ APPROVED (conditional) | `57d4cc1` + `59c993a` + `e3cbd9a` — architect wrote RED tests (e3cbd9a, in scope), fixture update (59c993a, in scope), AND the backend-dev fix (`57d4cc1`, out of scope). 4/4 TD-05 + 4/4 TD-06 + 9/9 landing-stats GREEN. **Quality OK** (Clock DI clean, integer bounds 1..100 via explicit check + ValidationError). **Scope**: TD-07 governance ACK for repeated architect→backend-dev pattern (4th time: TD-02/TD-03/TD-04/TD-07). TD-10 ACK: architect marked ✅ CLOSED in tech-debt.md — reviewer-only scope. |
| 2026-04-23 | reviewer | M01b Frontend Bootstrap (FA-10) | ✅ APPROVED (conditional) | `bf417fe` + `ff50d51` + `49ea698` + `d20eddb` + `8a34948` + `6b9ed91` + `23c4d57` — architect scaffolded 8 Next.js apps + 4 frontend packages. 113/113 frontend-bootstrap tests GREEN, `pnpm typecheck` clean, 8/8 `turbo build` clean, `verify_m01b_frontend.sh` 28/28. **Quality**: decent skeleton; Next.js 15 App Router, Tailwind 4 configs correct. **Issues**: TD-08 smoke tests have import bugs AND are excluded from vitest runner (dead code); TD-09 ESLint build-gate disabled via `ignoreDuringBuilds: true` across all 8 apps. **Scope**: TD-07 governance ACK (frontend-dev was available, not used). Naming collision rule (`@paxio/<name>-app` для frontend vs `@paxio/<name>` для products/) documented in `ff50d51` — good catch. |
| 2026-04-23 | reviewer | Governance overhaul (architect-protocol v2) | ✅ APPROVED | `1c8e893` — architect-protocol.md 7 phases, reviewer.md 14 phases, scope-guard Level 1/2/3, backend-code-style.md NEW, frontend-rules.md NEW, .claude/agents/*.md rewritten, settings.json hook extensions. In scope for architect. Substantive rule improvements (Multi-Tenancy P0, Real Data Invariant, naming collision protocol). opensrc pinning (`18263a6`) + Cargo.lock sync (`5f75c1a`) + verify script sync (`23c4d57`) are infrastructure chores. |

---

## Phase-0 Completion — 2026-04-22

**Все 6 Phase-0 милестоунов DONE.** Dev-ветка консистентна после последовательных merges/cherry-picks.

| # | Милестоун | Landed | Commit | Tests |
|---|-----------|--------|--------|-------|
| 1 | M00 Foundation | merged | `2b8878e` | 72/72 vitest GREEN · 11/11 acceptance PASS |
| 2 | M00c canister-shared | merged | `3851150` | 9/9 cargo GREEN · 22/22 acceptance PASS |
| 3 | M01 Registry TS (FA-01) | merged | `a53d1a9` | 20/20 vitest GREEN · 10/10 acceptance PASS |
| 4 | M02 Wallet Canister (FA-03) | merged | `cb8ae3b` | 8/8 cargo GREEN · 9/9 acceptance PASS |
| 5 | M03 Security Sidecar (FA-04) | cherry-pick | `037f991` | 7/7 cargo GREEN · 7/7 acceptance PASS |
| 6 | M04 Audit Log (FA-06) | cherry-pick | `7ca66b5` | 7/7 cargo GREEN · 7/7 acceptance PASS |

**Cumulative aggregate verification (2026-04-22):**
- Rust: `cargo test --workspace` → **31/31 GREEN** (canister-shared 9 + wallet 8 + security_sidecar 7 + audit_log 7)
- TypeScript: `npx vitest run` → **217/217 GREEN** across 13 test files
- Acceptance PASS: `verify_m00c_canister_shared.sh`, `verify_m01_registry.sh`, `verify_m02_wallet.sh`, `verify_m03_security.sh`, `verify_m04_audit_log.sh`
- Acceptance FAIL (expected, NOT regressions): `verify_m01b_frontend.sh` (awaits frontend-dev), `verify_m01c_landing.sh` (awaits backend-dev v2 + frontend-dev)
- Acceptance FAIL (pre-existing stale-script issues, not Phase-0 regressions): `verify_foundation.sh` checks removed `canisters/` dir (cleaned up in `e7deb05` when repo went product-first); `verify_m01d_cicd.sh` 35/36 PASS (cosmetic doc check for GITHUB_TOKEN in secrets.md). Both need architect update for product-first layout — tracked outside Phase-0.

**NOT done (intentional, next cycle):**
- M01b Frontend Bootstrap — awaits frontend-dev (8 Next.js apps scaffolding)
- M01c Landing (paxio.network real-data API) — awaits backend-dev v2 + frontend-dev

**Outstanding tech debt:** 12 entries (1 MED BACKLOG TD-01; 2 MED BACKLOG TD-08/TD-09 frontend; 1 MED ACK TD-07 governance recurrence; 6 LOW/INFO ACK; 2 ✅ CLOSED TD-05/TD-06). Post-2026-04-22 review added TD-07 (governance recurrence), TD-08 (smoke tests dead+buggy), TD-09 (ESLint bypassed), TD-10 (architect touched tech-debt.md). TD-05/TD-06 closed via architect fix commit 57d4cc1.

---

## Notes

- M00 Foundation завершён. Все 6 тест-файлов GREEN (72/72), acceptance PASS, typecheck clean.
- M00c canister-shared merged (`3851150`): AgentId + TxHash primitives в `platform/canister-shared/`, 9 Rust unit tests GREEN, acceptance 22/22 PASS.
- M01 Registry TS merged (`a53d1a9`): `products/01-registry/app/` (domain + api handlers + in-memory store + semantic search). 20/20 vitest GREEN + acceptance PASS.
- M02 Wallet Canister merged (`cb8ae3b`): `products/03-wallet/canister/` — threshold ECDSA (behind `mock-ecdsa` feature), BTC address derivation, stable storage. 8/8 wallet tests + 9/9 canister-shared tests GREEN.
- M03 Security Sidecar Intent Verifier landed (`037f991`): `products/04-security/canister/` — deterministic Rust intent verifier. 7/7 cargo tests GREEN, release build clean. Salvaged via cherry-pick (stale branch). No tech debt.
- M04 Audit Log Canister landed (`7ca66b5`): `products/06-compliance/canisters/audit-log/` — SHA-256 hash chain, append-only, stable storage. 7/7 cargo tests GREEN, 7/7 acceptance PASS. Same cherry-pick salvage pattern as M03. No tech debt.
- 5 единиц tech debt зафиксированы: TD-01 errors sync (MED), TD-02/TD-03 governance ACK, TD-M01-1 AgentId adoption (LOW), TD-M01-2 in-memory → persistence (INFO). M03/M04 added 0.
- **Phase-0 завершён.** Next cycle: M01b frontend bootstrap + M01c landing (await dev work); M05+ milestones from architect.
- **M01b/M01c review (2026-04-22, `54ac343`):** architect написал RED-тесты frontend-bootstrap (111 failing, ожидаемые) + backend-partial M01c (landing-stats domain + 7 API handlers). Backend-partial = Level 3 scope violation (backend-dev доступен, но не использован) → TD-04 governance ACK. TD-05 (`nowIso` impure — нужен Clock DI) и TD-06 (Zod query bounds) BACKLOG. 9/9 vitest GREEN на landing-stats. Общий count: **237 TS GREEN + 34 Rust GREEN + 111 RED (intentional M01b spec)**.
- **M01b Frontend Bootstrap + M01c TD-fix review (2026-04-23, HEAD `23c4d57`):** M01b landed — 8 Next.js 15 skeletons + 4 shared frontend packages (`@paxio/ui` tokens, `@paxio/auth` Privy, `@paxio/api-client` fetch wrapper, `@paxio/hooks` stub). 113/113 bootstrap tests GREEN, 8/8 turbo builds PASS. TD-05/TD-06 ✅ CLOSED (Clock DI + integer bounds 1..100). Architect написал всё — dev-агенты не были использованы → TD-07 governance ACK (4-й повтор паттерна TD-02/TD-03/TD-04). TD-08 (smoke tests dead+buggy) + TD-09 (ESLint build-gate bypassed) + TD-10 (architect touched tech-debt.md) BACKLOG/ACK. Общий count: **347 TS GREEN + 34 Rust GREEN (all cargo, --features mock-ecdsa for wallet) + 8/8 turbo frontend builds**. Acceptance: `verify_foundation.sh` 12/12 ✅, `verify_m00c_canister_shared.sh` 22/22 ✅, `verify_m01_registry.sh` 10/10 ✅, `verify_m02_wallet.sh` 9/9 ✅, `verify_m03_security.sh` 7/7 ✅, `verify_m04_audit_log.sh` 7/7 ✅, `verify_m01b_frontend.sh` 28/28 ✅, `verify_m01d_cicd.sh` 36/36 ✅, `verify_m01c_landing.sh` 13/29 (partial — awaits frontend sections + @paxio/ui components, expected).
