# Project State — Paxio

> Этот файл обновляется ревьюером ПОСЛЕ merge в main.
> Architect читает при scan, но НЕ редактирует.

## Версия
**Version:** 0.1.0
**Last Updated:** 2026-04-17
**Last Commit:** (commits after first milestone)

---

## Product Overview

Paxio Agent Financial OS — некастодиальный финансовый OS на базе ICP.
7 продуктов (P1-P7), 10 Feature Areas (FA-01 — FA-10).

---

## Модули

### Phase 0 (Foundation) — В РАБОТЕ

| Модуль | Status | Заметки |
|--------|--------|---------|
| P0: Project setup | 🔄 В РАБОТЕ | .claude structure, CI/CD |
| P0: npm packages | ⬜ НЕ НАЧАТО | @paxio/sdk, validators, ui |
| P0: Frontend scaffolding | ⬜ НЕ НАЧАТО | Next.js 15 + design system |
| P0: DKI Canister | ⬜ НЕ НАЧАТО | threshold ECDSA foundation |
| P0: Guard Agent | ⬜ НЕ НАЧАТО | ML classification foundation |

### Phase 1 (P1 — Universal Registry)

| Модуль | Status | Заметки |
|--------|--------|---------|
| FA-01: Registry canister | ⬜ НЕ НАЧАТО | DID registry |
| FA-01: Capability system | ⬜ НЕ НАЧАТО | 5 capabilities |
| FA-01: Frontend UI | ⬜ НЕ НАЧАТО | Agent explorer |

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

## Source Structure

```
paxio/
├── engine/                      # TypeScript (Fastify)
│   └── core/
│       └── src/
│           ├── types/           # Shared types (architect owns .h)
│           ├── http/            # Fastify routes
│           ├── services/        # Business logic
│           ├── blockchain/      # ICP bindings
│           ├── llm/            # Guard Agent integration
│           └── data/           # Reference JSON (not hardcoded)
├── canisters/                   # Rust (ICP SDK)
│   └── src/
│       ├── wallet/
│       ├── registry/
│       ├── audit_log/
│       ├── reputation/
│       ├── security_sidecar/
│       └── bitcoin_agent/
├── packages/                    # npm packages
│   └── frontend/              # Next.js 15
├── services/                   # Python
│   └── guard/                 # Guard Agent ML
└── cli/                        # Rust CLI
```

---

## CI/CD

| Pipeline | Status | Notes |
|----------|--------|-------|
| TypeScript typecheck | ⬜ НЕ НАСТРОЕНО | |
| Unit tests | ⬜ НЕ НАСТРОЕНО | |
| Canister build | ⬜ НЕ НАСТРОЕНО | dfx |
| Integration tests | ⬜ НЕ НАСТРОЕНО | |
| Deploy to testnet | ⬜ НЕ НАСТРОЕНО | |

---

## Roadmap

Документ: `docs/NOUS_Development_Roadmap.md` (architect обновляет)

---

## Notes

- Initial project setup in progress
- Waiting for first milestone specification from architect
