# Project State — Paxio

> Этот файл обновляется ревьюером ПОСЛЕ merge в main.
> Architect читает при scan, но НЕ редактирует.

## Версия
**Version:** 0.1.0
**Last Updated:** 2026-04-22
**Last Commit:** `a53d1a9` (M01 Registry TS merged into dev)

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
| FA-03: Wallet canister | ⬜ НЕ НАЧАТО | Non-custodial BTC |
| FA-09: Reputation canister | ⬜ НЕ НАЧАТО | On-chain scoring |

### Phase 4 (P4 — Security + Guard)

| Модуль | Status | Заметки |
|--------|--------|---------|
| FA-04: Security Sidecar | ⬜ НЕ НАЧАТО | Intent verifier |
| FA-08: Guard Agent | ⬜ НЕ НАЧАТО | 11 ML classifiers |

### Phase 5 (P5 — Bitcoin Agent)

| Модуль | Status | Заметки |
|--------|--------|---------|
| FA-05: BTC ↔ ckBTC bridge | ⬜ НЕ НАЧАТО | Chain Fusion |
| FA-05: Multi-sig | ⬜ НЕ НАЧАТО | 2-of-3 workflows |

### Phase 6 (P6 — Compliance)

| Модуль | Status | Заметки |
|--------|--------|---------|
| FA-06: Audit log | ⬜ НЕ НАЧАТО | Immutable records |
| FA-06: KYC/AML | ⬜ НЕ НАЧАТО | Travel Rule |

### Phase 7 (P7 — Intelligence)

| Модуль | Status | Заметки |
|--------|--------|---------|
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
│   └── 01-registry/
│       └── app/                               # ✅ DONE (M01) — TS registry core
│           ├── api/                           # register, resolve, find, claim, count handlers
│           └── domain/                        # did-gen, registry, search, claim (in-memory)
├── platform/
│   └── canister-shared/                       # ✅ DONE (M00c) — AgentId, TxHash primitives
├── canisters/
│   ├── Cargo.toml                             # workspace root
│   └── src/shared/                            # placeholder crate
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

---

## Notes

- M00 Foundation завершён. Все 6 тест-файлов GREEN (72/72), acceptance PASS, typecheck clean.
- M00c canister-shared merged (`3851150`): AgentId + TxHash primitives в `platform/canister-shared/`, 9 Rust unit tests GREEN, acceptance 22/22 PASS.
- M01 Registry TS merged (`a53d1a9`): `products/01-registry/app/` (domain + api handlers + in-memory store + semantic search). 20/20 vitest GREEN + acceptance PASS.
- 5 единиц tech debt зафиксированы: TD-01 errors sync (MED), TD-02/TD-03 governance ACK, TD-M01-1 AgentId adoption (LOW), TD-M01-2 in-memory → persistence (INFO).
- Готово к старту M02 (Wallet canister, FA-03, threshold ECDSA).
