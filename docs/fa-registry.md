# FA Registry — Feature Area → Physical Paths

**Source of truth** для mapping Feature Areas → физические пути в product-first monorepo.
Обновляется architect'ом при каждом structural change. Все остальные документы (FA-XX-*.md, MILESTONES.md, scope-guard.md) ссылаются на эту таблицу.

---

## 7 Feature Areas — Backend + Frontend mapping

| FA | Product | Backend owner | Backend paths | Frontend app (Paxio platform) | Independent brand site |
|---|---|---|---|---|---|
| **FA-01** | P1 Universal Registry | registry-dev | `products/01-registry/` | `apps/frontend/registry/` → `registry.paxio.network` | — |
| **FA-02** | P2 Meta-Facilitator + FAP | backend-dev + icp-dev | `products/02-facilitator/` | `apps/frontend/pay/` → `pay.paxio.network` | — |
| **FA-03** | P3 Wallet + Adapter | backend-dev + icp-dev | `products/03-wallet/` | `apps/frontend/wallet/` → `wallet.paxio.network` (brand-configurable) | optional spin-off: `bitgent.*` |
| **FA-04** | P4 Security Layer | backend-dev + icp-dev + (a3ka external) | `products/04-security/` (incl. submodule `guard/`) | — (no Paxio subdomain — it's a registered agent) | `guard.complior.ai` (Complior team) |
| **FA-05** | P5 Bitcoin Agent | icp-dev | `products/05-bitcoin-agent/` | inside `apps/frontend/wallet/bitcoin/*` tabs | — |
| **FA-06** | P6 Compliance Layer (Complior) | backend-dev + icp-dev | `products/06-compliance/` | — (no Paxio subdomain) | `comply.complior.ai` (Complior team) |
| **FA-07** | P7 Intelligence Layer | backend-dev + icp-dev + (ml team external) | `products/07-intelligence/` | `apps/frontend/{radar,intel}/` → `radar.paxio.network` (free), `intel.paxio.network` (paid) | — |

**Cross-cutting platform frontends** (not owned by any single FA):
- `apps/frontend/marketing/` → `paxio.network` — main landing, showcases all FAs
- `apps/frontend/docs/` → `docs.paxio.network` — unified docs for all FAs + SDKs
- `apps/frontend/fleet/` → `fleet.paxio.network` — enterprise cross-FA dashboard (vendor agents, compliance, incidents)

**Ownership:** all 8 `apps/frontend/*` + 4 frontend-shared packages (`packages/{ui,hooks,api-client,auth}/`) = **frontend-dev**. Backend FA code = respective backend owner.

**ВАЖНО:** таблица CLAUDE.md ранее упоминала FA-08/09/10. Они **растворены** в первые 7:
- «FA-08 SDK» = `products/03-wallet/sdk-ts/` + `products/03-wallet/sdk-python/` — часть FA-03
- «FA-09 ICP Canister Architecture» = cross-cutting, распределена по `products/*/canister(s)/` — не отдельный FA
- «FA-10 Guard Agent» = `products/04-security/guard/` — часть FA-04 (external submodule)

---

## FA-01 — Universal Registry (registry-dev)

| Component | Path | Language |
|---|---|---|
| HTTP API handlers | `products/01-registry/app/api/` | TypeScript (VM sandbox) |
| Domain logic (DID gen, Agent Card, crawlers, search orchestration) | `products/01-registry/app/domain/` | TypeScript |
| Reputation canister (единственный ICP piece в FA-01) | `products/01-registry/canister/` | Rust |
| Unit tests | `products/01-registry/tests/` | TypeScript + Rust |

**Reuse from bitgent:** `canisters/registry/` port-to-ts для Agent Card storage/search/DID → `products/01-registry/app/`. Reputation subset → `products/01-registry/canister/`.
**Data stores:** PostgreSQL (agent metadata), Qdrant (vectors), Redis (cache).
**FA-01 §3:** «на ICP только Reputation, сам Registry = TS».

---

## FA-02 — Meta-Facilitator + FAP (backend-dev + icp-dev)

| Component | Path | Language |
|---|---|---|
| FAP Router, Protocol Selector, Uptime Monitor | `products/02-facilitator/app/domain/` | TypeScript |
| x402 / MPP / PayAI / MoonPay / Visa TAP adapters | `products/02-facilitator/app/domain/adapters/` | TypeScript |
| Protocol Translation Engine | `products/02-facilitator/app/domain/translation/` | TypeScript |
| HTTP API handlers | `products/02-facilitator/app/api/` | TypeScript |
| Nonce Registry canister (replay protection) | `products/02-facilitator/canisters/nonce-registry/` | Rust |
| SD-JWT Verifier canister (Visa TAP + Mastercard VI) | `products/02-facilitator/canisters/sdjwt-verifier/` | Rust |
| EVM Verifier canister (Chain Fusion on-chain check) | `products/02-facilitator/canisters/evm-verifier/` | Rust |

**Reuse from bitgent:** `canisters/facilitator/` только как reference — переписываем в TypeScript.

---

## FA-03 — Wallet + Adapter (backend-dev + icp-dev)

| Component | Path | Language |
|---|---|---|
| Wallet API handlers | `products/03-wallet/app/api/` | TypeScript |
| Wallet domain (balance, tx policies, orchestration) | `products/03-wallet/app/domain/` | TypeScript |
| Wallet Canister (threshold ECDSA, Key Manager, Balance, Signing) | `products/03-wallet/canister/` | Rust |
| TypeScript SDK (`@paxio/sdk`, npm) | `products/03-wallet/sdk-ts/` | TypeScript |
| Python SDK (`paxio-sdk`, PyPI) | `products/03-wallet/sdk-python/` | Python |
| MCP Server (mcp.paxio.network) | `products/03-wallet/mcp-server/` | TypeScript |
| HTTP Proxy (localhost:8402) | `products/03-wallet/http-proxy/` | Rust binary |

**Reuse from bitgent:** `canisters/wallet/` port-as-is + finish BTC L1 threshold ECDSA.
**Reuse from complior:** SDK hooks → `products/03-wallet/sdk-ts/`; MCP server → `products/03-wallet/mcp-server/`.

---

## FA-04 — Security Layer (backend-dev + icp-dev + external a3ka)

| Component | Path | Language |
|---|---|---|
| Security Scanner Agent (OWASP Scorer, MITRE Modeler, Secrets Scanner, Behavioral Anomaly orchestration, AML coordination) | `products/04-security/app/{api,domain}/` | TypeScript |
| Security Sidecar canister (Intent Verifier, Forensics Trail, Multi-sig Gate) | `products/04-security/canister/` | Rust |
| Guard ML service | `products/04-security/guard/` | Python (**git submodule** → `github.com/a3ka/guard`) |
| Guard HTTP client (ACL) | `products/04-security/guard-client/` | TypeScript |

**Reuse from bitgent:** `canisters/security/` split — Rust pieces (Intent Verifier) → `canister/`, TS pieces (OWASP, MITRE) → `app/domain/` (port-to-ts).
**Reuse from complior:** `scanner/` → `products/04-security/app/domain/scanner/`.
**External team (a3ka):** Guard submodule управляется upstream. Paxio devs видят код, могут contribute через PR в upstream repo. Guard deploys **independently** to guard.paxio.network (Hetzner GX11).

---

## FA-05 — Bitcoin Agent (icp-dev)

Все 9 агентов = Rust ICP canisters в одном sub-workspace `products/05-bitcoin-agent/canisters/`:

| Agent | Path |
|---|---|
| Bitcoin DCA Agent | `products/05-bitcoin-agent/canisters/dca/` |
| Bitcoin Escrow Agent | `products/05-bitcoin-agent/canisters/escrow/` |
| Bitcoin Streaming Payments | `products/05-bitcoin-agent/canisters/streaming/` |
| Reputation Stake (cross-FA: uses FA-01 canister) | `products/05-bitcoin-agent/canisters/stake/` |
| Bitcoin Treasury Agent | `products/05-bitcoin-agent/canisters/treasury/` |
| Bitcoin Yield Agent | `products/05-bitcoin-agent/canisters/yield/` |
| Agent Payroll | `products/05-bitcoin-agent/canisters/payroll/` |
| Price-Triggered Actions | `products/05-bitcoin-agent/canisters/price-trigger/` |
| Trustless Inheritance | `products/05-bitcoin-agent/canisters/inheritance/` |

**Reuse:** полностью новое (no existing code in bitgent/complior для FA-05).

---

## FA-06 — Compliance Layer / Complior (backend-dev + icp-dev)

| Component | Path | Language |
|---|---|---|
| Complior Engine (scanner, FRIA, passport, tech-docs, regulation-db, monitoring) | `products/06-compliance/app/{api,domain}/` | TypeScript |
| Audit Log canister (Compliance Records, upgrade `audit-trail.ts` → ICP) | `products/06-compliance/canisters/audit-log/` | Rust |
| Certification Manager canister (on-chain certificates + QR attestation) | `products/06-compliance/canisters/certification-manager/` | Rust |
| Compliance CLI (Complior-ported commands) | `products/06-compliance/cli/` | Rust binary |
| GitHub Action (`paxio-network/compliance-check@v1`) | `products/06-compliance/github-action/` | YAML + JS |

**Reuse from complior:** `engine/core/` (10K+ lines TS) port-as-is → `app/`. `audit-trail.ts` port-to-rust → `canisters/audit-log/`. CLI → `cli/`. GitHub Action → `github-action/`.

---

## FA-07 — Intelligence Layer (backend-dev + icp-dev + external ml team)

| Component | Path | Language |
|---|---|---|
| Data Pipeline (BullMQ, TimescaleDB wiring), Intelligence API (Fastify) | `products/07-intelligence/app/{api,domain}/` | TypeScript |
| ML Pipeline (Fraud scoring, predictions, SHAP explainability) | `products/07-intelligence/ml/` | Python (LightGBM + Prophet + SHAP) |
| Oracle Network canister (Chain Fusion to EVM/Solana) | `products/07-intelligence/canister/` | Rust |

**Deploy:** ML service → `ml.paxio.network` (Hetzner). TS backend integrated in `apps/back/`.
**Reuse:** полностью новое.

---

## Shared Kernel

### Backend-side (architect + backend-dev owned)

| Component | Path | Package | Owner |
|---|---|---|---|
| Shared domain types + Zod schemas | `packages/types/src/` | `@paxio/types` | architect |
| Port contracts (interfaces) | `packages/interfaces/src/` | `@paxio/interfaces` | architect |
| AppError hierarchy | `packages/errors/src/` | `@paxio/errors` | architect |
| OpenAPI specs per FA (Published Language) | `packages/contracts/` | (file-based) | architect |
| Shared utility implementations (Clock, Logger) | `packages/utils/src/` | `@paxio/utils` | backend-dev |

### Frontend-side (frontend-dev owned)

| Component | Path | Package | Owner |
|---|---|---|---|
| Shared React components (AgentCard, SourceBadge, LiveTicker, Sparkline, …) | `packages/ui/src/` | `@paxio/ui` | frontend-dev |
| React hooks (useAgent, useWallet, useGuard, useRegistry, useIntelligence) | `packages/hooks/src/` | `@paxio/hooks` | frontend-dev |
| Typed REST + WS client for all Paxio APIs | `packages/api-client/src/` | `@paxio/api-client` | frontend-dev |
| Privy wrapper + DID helpers | `packages/auth/src/` | `@paxio/auth` | frontend-dev |

---

## Platform / Technical Infrastructure

| Component | Path | Language | Domain |
|---|---|---|---|
| Fastify server + VM sandbox loader | `apps/back/server/` | CommonJS (.cjs) | `api.paxio.network` (Hetzner) |
| Shared VM sandbox infrastructure (config, data) | `apps/back/app/` | ES modules (.js) | — |
| Shared Rust crate (threshold ECDSA helpers) | `platform/canister-shared/` | Rust | — |
| Frontend marketing | `apps/frontend/marketing/` | TS + React | `paxio.network` |
| Frontend registry | `apps/frontend/registry/` | TS + React | `registry.paxio.network` |
| Frontend pay (FAP) | `apps/frontend/pay/` | TS + React | `pay.paxio.network` |
| Frontend radar (free Intel) | `apps/frontend/radar/` | TS + React | `radar.paxio.network` |
| Frontend intel (paid Terminal) | `apps/frontend/intel/` | TS + React | `intel.paxio.network` |
| Frontend docs | `apps/frontend/docs/` | TS + React + MDX | `docs.paxio.network` |
| Frontend wallet | `apps/frontend/wallet/` | TS + React | `wallet.paxio.network` |
| Frontend fleet (enterprise) | `apps/frontend/fleet/` | TS + React | `fleet.paxio.network` |
| Intelligence ML entrypoint | `apps/intelligence-ml/` (→ `products/07-intelligence/ml/`) | Python | `ml.paxio.network` (Hetzner) |

---

## Cross-FA Dependencies (Bounded Context interactions)

Все inter-FA коммуникации должны идти через **Published Language** (`packages/contracts/`) или **port interfaces** (`packages/interfaces/`). Прямой import домена из другой FA — запрещён (enforced через ESLint rule + scope-guard review).

Примеры cross-FA (задокументировать при возникновении):

| Consumer | Provider | Механизм |
|---|---|---|
| `products/05-bitcoin-agent/canisters/stake/` | `products/01-registry/canister/` (reputation) | Inter-canister call через Candid |
| `products/02-facilitator/` | `products/01-registry/` (Agent Card lookup) | HTTP API через `@paxio/contracts/registry-api.yaml` |
| `products/02-facilitator/` | `products/03-wallet/canister/` (threshold ECDSA sign) | Inter-canister call |
| `products/06-compliance/` | `products/04-security/` (Forensics Trail) | Inter-canister call |
| Any FA | `products/04-security/guard/` (external) | HTTP через `products/04-security/guard-client/` |

---

## Spin-off Readiness

Каждая FA = атомарная single-directory единица.

Extraction любого FA:
```bash
# Example: sell FA-02 Meta-Facilitator to external buyer
scripts/extract-product.sh 02-facilitator ~/new-repo-path/
# Копирует products/02-facilitator/ + нужный Shared Kernel (packages/types, packages/interfaces, packages/errors, packages/contracts/facilitator-api.yaml) в новый git репо.
# History preserved через git filter-repo.
```

Это позволяет:
- Продать FA-02 как standalone product
- Open-source FA-02 (AAIF standard reference implementation)
- Fork-and-deploy любого FA independently

**Contract stability:** `packages/contracts/*-api.yaml` = формальные contracts между FA. После spin-off, Paxio и extracted FA продолжают talk через эти contracts (без changes).

---

## Maintenance

При добавлении нового компонента в FA:
1. Обновить соответствующую секцию в этой таблице
2. Обновить `products/<fa>/README.md` с новой структурой
3. Обновить `docs/feature-areas/FA-XX-*.md` если добавляется новая архитектурная сущность
4. Обновить scope-guard paths если меняется ownership
5. Проверить что extraction scripts (`products/<fa>/extract.sh` когда появятся) покрывают новые пути
