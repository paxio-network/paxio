# Project State — Paxio

> Этот файл обновляется ревьюером ПОСЛЕ merge в main.
> Architect читает при scan, но НЕ редактирует.

## Версия
**Version:** 0.1.0
**Last Updated:** 2026-04-22
**Last Commit:** `037f991` (M03 Security Sidecar Intent Verifier cherry-picked into dev)

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
│       └── canisters/audit-log/               # ⚠ STUB (M02 prep) — real impl arrives on feature/m04-audit-log merge
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

---

## Notes

- M00 Foundation завершён. Все 6 тест-файлов GREEN (72/72), acceptance PASS, typecheck clean.
- M00c canister-shared merged (`3851150`): AgentId + TxHash primitives в `platform/canister-shared/`, 9 Rust unit tests GREEN, acceptance 22/22 PASS.
- M01 Registry TS merged (`a53d1a9`): `products/01-registry/app/` (domain + api handlers + in-memory store + semantic search). 20/20 vitest GREEN + acceptance PASS.
- M02 Wallet Canister merged (`cb8ae3b`): `products/03-wallet/canister/` — threshold ECDSA (behind `mock-ecdsa` feature), BTC address derivation, stable storage. 8/8 wallet tests + 9/9 canister-shared tests GREEN. Cargo.toml on dev now registers M02/M03/M04 members (M03/M04 are stubs from M02 prep commit — real impl arrives on their own branch merges).
- M03 Security Sidecar Intent Verifier landed (`037f991`): `products/04-security/canister/` — deterministic Rust intent verifier. 7/7 cargo tests GREEN, release build clean. Salvaged via cherry-pick (not full merge) because `feature/m03-security-sidecar` branch was 4+ commits stale and would have wiped M00c/M01/M02. Sibling stubs (M02/M04) on the M03 branch were obsolete — real M02 already on dev, M04 awaits its own cherry-pick. No tech debt recorded (code quality clean).
- 5 единиц tech debt зафиксированы: TD-01 errors sync (MED), TD-02/TD-03 governance ACK, TD-M01-1 AgentId adoption (LOW), TD-M01-2 in-memory → persistence (INFO). M03 added 0.
- Готово к merge M04 (Audit Log) — same cherry-pick pattern recommended.
