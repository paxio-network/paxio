# Paxio — Agent Financial OS

## Vision → Code Chain

```
docs/NOUS_Strategy_v5.md  (alias: docs/architecture.md)   → Product Vision (ЧТО, ЗАЧЕМ, приоритеты)
docs/NOUS_Development_Roadmap.md (alias: docs/roadmap.md) → Roadmap (КАКИЕ фичи, В КАКОМ порядке)
docs/feature-areas/FA-0X-*.md                             → Feature Areas (КАК УСТРОЕНА подсистема)
docs/sprints/M0X-*.md                                     → Milestones (ЧТО делаем, test specs, acceptance)
app/types/ + app/interfaces/                              → Контракты (source of truth, architect)
tests/**/*.test.ts                                        → Test specs (RED → GREEN, architect)
server/**/*.cjs + app/**/*.js + canisters/src/**/*.rs     → Реализация (dev-агенты)
packages/frontend/**                                      → Frontend (Next.js 15, frontend-dev)
```

## Workflow

```
STRATEGY → Roadmap → Feature Area → Milestone (тесты) → Code (реализация)
```

**Test-first**: architect пишет RED-тесты ДО кода. Dev реализует пока тесты не станут GREEN. Tests modifiable only by architect.

## Team

| Agent | Role |
|-------|------|
| architect | Contracts, milestones, test specs, Feature Areas |
| backend-dev | Fastify `server/`, business logic `app/`, `@paxio/sdk`, Guard HTTP client |
| icp-dev | ICP canisters (wallet, audit_log, security_sidecar, bitcoin_agent), Chain Fusion |
| registry-dev | FA-01 Registry: TS core в `app/domain/registry/` + `app/api/registry/` + Reputation canister `canisters/src/reputation/` |
| frontend-dev | Next.js 15 фронтенды: paxio.network, app.paxio.network, docs.paxio.network |
| test-runner | Build + test verification |
| reviewer | Scope check, quality review, project-state/tech-debt update |

**Guard Agent (Python ML-сервис) живёт в отдельном репо** `/home/openclaw/guard/` и деплоится на `guard.paxio.network`. Paxio общается с ним по HTTP. В Paxio codebase Python нет.

## Tech Stack

| Layer | Tech |
|-------|------|
| **Backend runtime** | Node.js 22, Fastify 5 |
| **Backend infrastructure (`server/`)** | CommonJS `.cjs`, `require()` разрешён, I/O разрешён |
| **Backend business logic (`app/`)** | ES modules в VM Sandbox (`vm.Script`), frozen context, НЕТ `require`/`import`/I/O |
| **Canisters** | Rust + `ic-cdk` 0.13+ + `ic-stable-structures` |
| **Frontend** | Next.js 15 (App Router) + Tailwind 4 + Radix UI + Framer Motion |
| **Distribution SDK** | `@paxio/sdk` (TypeScript) — одна строка интеграции |
| **MCP Server** | TypeScript MCP SDK (`@modelcontextprotocol/sdk`) |
| **DB** | PostgreSQL + Qdrant (vector) + Redis |
| **Blockchain** | ICP canisters + Bitcoin L1 через threshold ECDSA |
| **External ML** | Guard API (`guard.paxio.network`) — HTTP client, контракт в `app/types/guard-api.ts` |

## Products (7 Layers)

| Product | Layer | What it does |
|---------|-------|--------------|
| P1 | Identity Layer | Universal Registry — cross-ecosystem agent index |
| P2 | Payment Layer | Meta-Facilitator + FAP — multi-protocol routing |
| P3 | Trust Layer (1) | Wallet + Adapter — non-custodial BTC L1 |
| P4 | Trust Layer (2) | Security Layer — Guard Agent (внешний) + Security Sidecar (ICP) |
| P5 | Trust Layer (3) | Bitcoin Agent — DCA, Escrow, Streaming, Stake |
| P6 | Compliance Layer | EU AI Act certification через Complior Agent |
| P7 | Intelligence Layer | Bloomberg + Chainlink для агентной экономики |

## Architecture Principles

1. **Three-layer stack**: Interaction Layer (Fastify REST) → Routing Engine (stateless) → ICP Backbone (trust + settlement)
2. **Backend разделён на `server/` + `app/`** (eOlympus стиль): инфраструктура отдельно от бизнес-логики. `app/` выполняется в VM sandbox с frozen context — нет `require`, нет I/O.
3. **Non-custodial by default**: ключи никогда в одном месте. Threshold ECDSA на 13+ ICP узлах.
4. **LLM-free for financial decisions**: Rust детерминированный код принимает решения. ML классифицирует input, но не транзакции.
5. **Data externalization**: справочные данные (цены, пороги, маппинги) в `app/data/*.json`. Код чистый.
6. **No hardcoded values**: пути, порты, ключи — через `app/config/` или environment.
7. **Onion dependencies**: `server/` → `app/api/` → `app/domain/` → `app/lib/`. Строго внутрь. `domain/` ничего не знает про HTTP.
8. **SE principles**: см. `.claude/rules/engineering-principles.md` — полный reference по type systems, polymorphism, composition, DI/IoC, purity, ADT, lazy eval, concurrency, contract programming, SOLID, и ещё 15 темам. Architect enforces при review.

## Project Layout

```
paxio/
├── server/                       # Fastify infrastructure (CommonJS .cjs) — backend-dev
│   ├── main.cjs                  # entrypoint: bootstraps Fastify, loads app/ через vm.Script
│   └── src/
│       ├── http.cjs              # Fastify app + route mounter
│       ├── ws.cjs                # WebSocket broadcaster
│       ├── loader.cjs            # VM sandbox loader (frozen context)
│       ├── telemetry.cjs
│       └── infrastructure/
│           ├── db.cjs            # PostgreSQL client
│           ├── redis.cjs         # Redis client
│           ├── qdrant.cjs        # Qdrant vector DB client
│           ├── icp.cjs           # @dfinity/agent HTTP bindings
│           └── guard-client.cjs  # Guard API HTTP client (retry/circuit-breaker)
│
├── app/                          # Business logic (VM sandbox .js) — backend-dev
│   ├── types/                    # Shared domain types + Zod schemas (ARCHITECT ONLY)
│   ├── interfaces/               # Contracts/ports (ARCHITECT ONLY)
│   ├── errors/                   # AppError hierarchy
│   ├── lib/                      # Permissions, validation, utilities
│   ├── config/                   # Configuration (читает env, возвращает frozen obj)
│   ├── data/                     # Reference JSON (protocol fees, routing rules, agent sources)
│   ├── domain/                   # Pure business logic (no I/O)
│   │   ├── registry/             # FA-01 agent resolution, DID logic
│   │   ├── fap/                  # FA-02 routing, protocol translation
│   │   ├── wallet/               # FA-03 balance, tx orchestration
│   │   ├── guard/                # FA-04 when/how to call Guard API
│   │   ├── bitcoin-agent/        # FA-05 DCA/Escrow orchestration
│   │   ├── compliance/           # FA-06 Complior integration
│   │   └── intelligence/         # FA-07 aggregation
│   └── api/                      # HTTP handlers (thin, validation → domain)
│       ├── registry/
│       ├── fap/
│       ├── wallet/
│       ├── guard/                # Paxio-side Guard integration endpoints
│       └── ...
│
├── canisters/                    # Rust ICP canisters — icp-dev / registry-dev
│   └── src/
│       ├── reputation/           # registry-dev (FA-01) — immutable score ONLY (не весь Registry)
│       ├── wallet/               # icp-dev (FA-03)
│       ├── audit_log/            # icp-dev (FA-06)
│       ├── security_sidecar/     # icp-dev (FA-04)
│       └── bitcoin_agent/        # icp-dev (FA-05)
│
│   # NB: Agent Card storage + semantic search = PostgreSQL/Qdrant/Redis (не canister).
│   # См. FA-01 §3 Data Layer. На ICP только Reputation Engine.
│
├── packages/                     # npm workspaces
│   ├── sdk/                      # @paxio/sdk (TypeScript) — backend-dev
│   ├── mcp-server/               # @paxio/mcp-server (from complior) — backend-dev
│   └── frontend/                 # Next.js 15 apps — frontend-dev
│       ├── landing/              # paxio.network
│       ├── app/                  # app.paxio.network
│       └── docs/                 # docs.paxio.network
│
├── cli/                          # Rust CLI (from complior, commands only) — icp-dev (Rust)
├── tests/                        # Unit + integration — ARCHITECT ONLY
├── scripts/                      # verify_*.sh acceptance scripts — ARCHITECT ONLY
├── docs/                         # Strategy, Roadmap, FA, sprints, e2e — ARCHITECT
├── opensrc/                      # Pinned external references (dfinity, x402, a2a, etc.)
├── .claude/                      # Agent config (CONSTITUTIONAL — architect/user only)
├── .github/workflows/            # CI/CD
├── CLAUDE.md                     # Master rules
└── package.json                  # Workspace root
```

## File Ownership

| Agent | ALLOWED | FORBIDDEN |
|-------|---------|-----------|
| architect | `app/types/`, `app/interfaces/`, `tests/`, `scripts/verify_*.sh`, `docs/feature-areas/`, `docs/sprints/`, `docs/e2e/`, `docs/NOUS_Development_Roadmap.md`, `CLAUDE.md`, `.claude/rules/`, `.claude/agents/` | `server/`, `app/api/`, `app/domain/`, `app/lib/`, `canisters/src/`, `packages/` |
| backend-dev | `server/`, `app/api/` (кроме `registry/`), `app/domain/` (кроме `registry/`), `app/lib/`, `app/config/`, `app/data/`, `app/errors/`, `packages/sdk/src/`, `packages/mcp-server/src/` | `canisters/src/`, `packages/frontend/`, `cli/`, `app/types/`, `app/interfaces/` (только читает), `app/{api,domain}/registry/` (registry-dev) |
| icp-dev | `canisters/src/{wallet,audit_log,security_sidecar,bitcoin_agent,shared}/`, `server/infrastructure/icp.cjs`, `cli/` | `canisters/src/reputation/` (registry-dev), `server/*.cjs` (кроме infrastructure/icp.cjs), `app/`, `packages/sdk/`, `packages/mcp-server/`, `packages/frontend/` |
| registry-dev | `app/api/registry/`, `app/domain/registry/`, `canisters/src/reputation/` | Everything else |
| frontend-dev | `packages/frontend/` | `server/`, `app/`, `canisters/`, `packages/sdk/src/` |
| test-runner | READS `tests/`, `scripts/` — запускает. НЕ пишет код. | ANY implementation code |
| reviewer | ONLY `docs/project-state.md` + `docs/tech-debt.md` (update after APPROVED) | Everything else |

## УСТАВНЫЕ ДОКУМЕНТЫ — АБСОЛЮТНЫЙ ЗАПРЕТ для dev-агентов

Dev-агенты НЕ МОГУТ модифицировать: `.claude/`, `CLAUDE.md`, `docs/project-state.md`, `docs/tech-debt.md`, `docs/sprints/`, `docs/feature-areas/`, `docs/NOUS_Strategy_v5.md`, `docs/NOUS_Development_Roadmap.md` (и их алиасы `docs/architecture.md`, `docs/roadmap.md`).

Нарушение = автоматический REJECT + откат ВСЕХ изменений.

**Почему**: LLM-агент может «оптимизировать» правила убрав ограничения которые ему мешают. Это предсказуемое поведение, поэтому запрет абсолютный.

## Build Commands

```bash
# Install
npm install                                       # workspace root

# Backend (server + app)
npm run dev:server                                # Fastify с --watch
npm run server                                    # production
npm run typecheck                                 # tsc --noEmit для app/types/
npm run test -- --run                             # vitest unit
npm run test:integration                          # vitest integration

# Canisters (Rust)
cd canisters && cargo build --release
cd canisters && cargo test
cd canisters && cargo clippy -- -D warnings

# Frontend (Next.js)
cd packages/frontend/landing && npm run dev       # paxio.network
cd packages/frontend/app && npm run dev           # app.paxio.network
cd packages/frontend/docs && npm run dev          # docs.paxio.network

# Acceptance scripts
bash scripts/verify_*.sh
```

## Branch Model

```
feature/* → dev → main
```

- **feature/\*** — одна фича или milestone, создаётся от `dev`
- **dev** — рабочая интеграционная ветка
- **main** — релиз (tagged `v*`)
- **Merge = ТОЛЬКО user**. Агенты только создают PR. `git push --force` к main/dev — запрещён для всех агентов.

## CI/CD

- `.github/workflows/ci.yml`: fmt → typecheck → test → cargo test → audit
- `.github/workflows/release.yml`: on tag `v*` — build + publish `@paxio/sdk`

## Important Paths

- Backend infrastructure: `server/`
- Backend business logic: `app/`
- Shared types (architect): `app/types/`
- Contracts (architect): `app/interfaces/`
- Reference data (NOT hardcoded): `app/data/`
- ICP canisters: `canisters/src/`
- SDK: `packages/sdk/src/`
- MCP Server: `packages/mcp-server/src/`
- Frontend: `packages/frontend/{landing,app,docs}/`
- CLI: `cli/`
- External source references: `opensrc/repos/`
- Tests: `tests/**/*.test.ts` + `canisters/src/**/tests.rs`
- Acceptance scripts: `scripts/verify_*.sh`
- Guard Agent (external): `/home/openclaw/guard/` → deployed to `guard.paxio.network`

## Принцип «ICP только там где надо»

Canister = ТОЛЬКО если требуется одно из:
- **Threshold ECDSA** (Wallet keys, BTC signing — физически невозможно иначе)
- **Immutable cryptographic proof** (Audit Log, Evidence Chain, Forensics Trail)
- **Decentralized consensus** (Reputation Engine — нельзя подделать)
- **Deterministic enforcement** (Security Sidecar Intent Verifier)
- **Chain Fusion** (Bitcoin Agent: threshold ECDSA + BTC L1)

Всё остальное (Registry search/discovery, FAP routing, Guard HTTP integration, Compliance logic, MCP Server, CLI) — TypeScript в `server/` + `app/` или Rust в `cli/`. Никаких canister'ов по умолчанию.
