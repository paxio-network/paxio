# Paxio — Agent Financial OS

## Vision → Code Chain

```
docs/NOUS_Strategy_v5.md  (alias: docs/architecture.md)   → Product Vision (ЧТО, ЗАЧЕМ, приоритеты)
docs/NOUS_Development_Roadmap.md (alias: docs/roadmap.md) → Roadmap (КАКИЕ фичи, В КАКОМ порядке)
docs/feature-areas/FA-0X-*.md                             → Feature Areas (КАК УСТРОЕНА подсистема)
docs/fa-registry.md                                       → FA → physical paths mapping (source of truth)
docs/sprints/M0X-*.md                                     → Milestones (ЧТО делаем, test specs, acceptance)
packages/types/ + packages/interfaces/                    → Контракты (Shared Kernel, architect)
tests/**/*.test.ts + products/*/tests/**/*.test.ts        → Test specs (RED → GREEN, architect)
apps/back/server/**/*.cjs + products/*/app/**/*.js        → Backend реализация
canisters/src/**/*.rs + products/*/canister(s)/**/*.rs    → ICP canisters
apps/frontend/**                                          → Frontend (Next.js 15, frontend-dev)
```

## Workflow

```
STRATEGY → Roadmap → Feature Area → Milestone (тесты) → Code (реализация)
```

**Test-first**: architect пишет RED-тесты ДО кода. Dev реализует пока тесты не станут GREEN. Tests modifiable only by architect.

## Team

| Agent | Role |
|-------|------|
| architect | Contracts (`packages/types`, `packages/interfaces`), milestones, test specs, Feature Areas, `docs/fa-registry.md` |
| backend-dev | Fastify `apps/back/server/`, TS-часть `products/*/app/` (кроме FA-01), `products/03-wallet/{sdk-ts,sdk-python,mcp-server,guard-client}/`, `products/06-compliance/github-action/` |
| icp-dev | Rust canisters `products/*/canister(s)/` (кроме FA-01), `products/06-compliance/cli/`, `products/03-wallet/http-proxy/`, `platform/canister-shared/` |
| registry-dev | FA-01 целиком: `products/01-registry/` (TS `app/` + `canister/` Rust Reputation) |
| frontend-dev | 8 Next.js 15 apps (`apps/frontend/{landing,registry,pay,radar,intel,docs,wallet,fleet}/`) + 4 shared frontend packages (`packages/{ui,hooks,api-client,auth}/`) |
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
| **Frontend auth** | Privy (wallet connect + email magic link) — per-app Privy project |
| **Frontend charts** | Recharts + Tremor (dashboards), D3 (Network Graph) |
| **Frontend deploy** | Vercel Monorepo Projects — one Vercel project per app, personal account |
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

## Project Layout — Product-first Monorepo (Turborepo + pnpm + uv)

```
paxio/
├── apps/                               # Top-level deployable targets
│   ├── back/                           # Backend monolith (Olympus-style)
│   │   ├── server/                     # Fastify infra (.cjs) — backend-dev
│   │   │   ├── main.cjs                # entry: loads products/*/app/**/*.js via vm.Script
│   │   │   ├── src/{http,ws,loader,logger}.cjs
│   │   │   ├── lib/errors.cjs          # CJS mirror of @paxio/errors
│   │   │   └── infrastructure/         # DB, Redis, Qdrant, ICP clients
│   │   └── app/                        # SHARED app infrastructure for VM sandbox
│   │       ├── config/                 # frozen config loader
│   │       └── data/                   # reference JSON (protocol fees, rules)
│   ├── frontend/                       # 8 Next.js 15 apps — frontend-dev. Each = separate Vercel project.
│   │   ├── landing/                    # paxio.network           — main landing (real data via API client)
│   │   ├── registry/                   # registry.paxio.network  — Universal Registry explorer
│   │   ├── pay/                        # pay.paxio.network       — FAP dashboard, routing rules, API console
│   │   ├── radar/                      # radar.paxio.network     — Intelligence free tier (press magnet, no auth)
│   │   ├── intel/                      # intel.paxio.network     — Intelligence Terminal (paid, Pro/Enterprise)
│   │   ├── docs/                       # docs.paxio.network      — platform + SDK docs
│   │   ├── wallet/                     # wallet.paxio.network    — Wallet + 9 Bitcoin Agents (brand-configurable → Bitgent if split)
│   │   └── fleet/                      # fleet.paxio.network     — Enterprise fleet dashboard (SSO/SAML)
│   └── intelligence-ml/                # ml.paxio.network entry → products/07/ml
│
├── products/                           # 7 Feature Areas — PRIMARY AXIS
│   ├── 01-registry/                    # FA-01 Universal Registry — registry-dev
│   │   ├── app/{api,domain}/           # TS: DID, Agent Card, crawlers, search
│   │   ├── canister/                   # Rust: Reputation (ONLY ICP piece)
│   │   └── tests/
│   ├── 02-facilitator/                 # FA-02 Meta-Facilitator — backend-dev + icp-dev
│   │   ├── app/{api,domain}/           # TS: FAP Router, Adapters, Translation
│   │   ├── canisters/                  # Rust: nonce-registry, sdjwt-verifier, evm-verifier
│   │   └── tests/
│   ├── 03-wallet/                      # FA-03 Wallet + Adapter — backend-dev + icp-dev
│   │   ├── app/{api,domain}/           # TS Wallet API
│   │   ├── canister/                   # Rust: Wallet Canister (threshold ECDSA)
│   │   ├── sdk-ts/                     # @paxio/sdk (npm)
│   │   ├── sdk-python/                 # paxio-sdk (PyPI)
│   │   ├── mcp-server/                 # mcp.paxio.network
│   │   ├── http-proxy/                 # localhost:8402 (Rust binary)
│   │   └── tests/
│   ├── 04-security/                    # FA-04 Security Layer — backend-dev + icp-dev + (a3ka)
│   │   ├── app/{api,domain}/           # TS: OWASP Scorer, MITRE, Secrets, Anomaly, AML
│   │   ├── canister/                   # Rust: Security Sidecar (Intent, Forensics, Multi-sig)
│   │   ├── guard/                      # ⚠ GIT SUBMODULE → github.com/a3ka/guard
│   │   ├── guard-client/               # @paxio/guard-client (TS ACL)
│   │   └── tests/
│   ├── 05-bitcoin-agent/               # FA-05 Bitcoin Agent — icp-dev
│   │   ├── canisters/                  # Rust: dca, escrow, streaming, stake, treasury,
│   │   │                               #       yield, payroll, price-trigger, inheritance
│   │   ├── app/                        # TS helpers
│   │   └── tests/
│   ├── 06-compliance/                  # FA-06 Compliance (Complior) — backend-dev + icp-dev
│   │   ├── app/{api,domain}/           # TS: Complior Engine (scanner, FRIA, passport)
│   │   ├── canisters/                  # Rust: audit-log, certification-manager
│   │   ├── cli/                        # Rust CLI (Complior-ported compliance commands)
│   │   ├── github-action/              # paxio-network/compliance-check@v1
│   │   └── tests/
│   └── 07-intelligence/                # FA-07 Intelligence — backend-dev + icp-dev + (ml team)
│       ├── app/{api,domain}/           # TS: Data Pipeline, Intelligence API
│       ├── ml/                         # Python: LightGBM + Prophet + SHAP
│       ├── canister/                   # Rust: Oracle Network (Chain Fusion)
│       └── tests/
│
├── packages/                           # Shared Kernel (stable, cross-cutting)
│   ├── types/                          # @paxio/types       — Zod + TS (architect)
│   ├── interfaces/                     # @paxio/interfaces  — port contracts (architect)
│   ├── errors/                         # @paxio/errors      — AppError hierarchy (architect)
│   ├── utils/                          # @paxio/utils       — Clock, Logger (backend-dev)
│   ├── contracts/                      # OpenAPI specs per FA — Published Language (architect)
│   ├── ui/                             # @paxio/ui          — React components (frontend-dev)
│   ├── hooks/                          # @paxio/hooks       — useAgent/useWallet/useGuard (frontend-dev)
│   ├── api-client/                     # @paxio/api-client  — typed REST/WS client (frontend-dev)
│   └── auth/                           # @paxio/auth        — Privy wrapper + DID helpers (frontend-dev)
│
├── platform/                           # Cross-cutting technical infrastructure
│   └── canister-shared/                # Rust shared crate (threshold ECDSA helpers)
│
├── canisters/                          # ⚠ DEPRECATED top-level — canisters живут в products/*/
│                                       # (оставлен для переходного периода, см. products/)
│
├── tests/                              # Cross-FA E2E integration tests — architect
├── scripts/                            # verify_*.sh acceptance — architect
├── docs/
│   ├── fa-registry.md                  # ★ FA → physical paths mapping
│   ├── feature-areas/                  # 7 FA architecture docs
│   └── sprints/                        # milestones
├── opensrc/                            # Pinned external references
├── .claude/                            # Agent config (CONSTITUTIONAL)
├── .github/workflows/                  # CI/CD
│
├── Cargo.toml                          # ROOT Rust workspace (products/*/canister(s), cli, http-proxy)
├── pnpm-workspace.yaml                 # TS workspaces (apps/*, products/*, packages/*)
├── turbo.json                          # Turborepo pipelines
├── .gitmodules                         # products/04-security/guard submodule
├── package.json                        # root
└── CLAUDE.md                           # Master rules
```

## File Ownership

| Agent | ALLOWED | FORBIDDEN |
|-------|---------|-----------|
| architect | `packages/{types,interfaces,errors,contracts}/`, `tests/`, `scripts/verify_*.sh`, `docs/feature-areas/`, `docs/sprints/`, `docs/e2e/`, `docs/fa-registry.md`, `docs/NOUS_Development_Roadmap.md`, `CLAUDE.md`, `.claude/rules/`, `.claude/agents/` | `apps/`, `products/*/app/` (кроме `01-registry`), `products/*/canister(s)/`, `products/*/cli/`, `products/*/sdk-*`, `products/*/mcp-server/`, `packages/utils/` |
| backend-dev | `apps/back/server/`, `apps/back/app/{config,data}/`, TS-часть `products/*/app/` (кроме FA-01), `products/03-wallet/{sdk-ts,sdk-python,mcp-server,guard-client}/`, `products/04-security/guard-client/`, `products/06-compliance/github-action/`, `packages/utils/` | `products/*/canister(s)/`, `products/*/cli/`, `products/*/http-proxy/`, `apps/frontend/`, `products/04-security/guard/` (submodule), `packages/{types,interfaces,errors,contracts}/` (только читает) |
| icp-dev | Rust `products/*/canister(s)/` (кроме `products/01-registry/canister/`), `products/03-wallet/http-proxy/`, `products/06-compliance/cli/`, `platform/canister-shared/`, `apps/back/server/infrastructure/icp.cjs` | `products/01-registry/canister/` (registry-dev), TS в `products/*/app/`, `apps/`, `packages/` (только читает) |
| registry-dev | `products/01-registry/` (весь: `app/`, `canister/`, `tests/`) | Everything else |
| frontend-dev | `apps/frontend/` (8 apps), `packages/{ui,hooks,api-client,auth}/` | `apps/back/`, `products/`, `canisters/`, `packages/{types,interfaces,errors,contracts,utils}/` (только читает) |
| test-runner | READS `tests/`, `products/*/tests/`, `scripts/` — запускает. НЕ пишет код. | ANY implementation code |
| reviewer | ONLY `docs/project-state.md` + `docs/tech-debt.md` (update after APPROVED) | Everything else |

## УСТАВНЫЕ ДОКУМЕНТЫ — АБСОЛЮТНЫЙ ЗАПРЕТ для dev-агентов

Dev-агенты НЕ МОГУТ модифицировать: `.claude/`, `CLAUDE.md`, `docs/project-state.md`, `docs/tech-debt.md`, `docs/sprints/`, `docs/feature-areas/`, `docs/NOUS_Strategy_v5.md`, `docs/NOUS_Development_Roadmap.md` (и их алиасы `docs/architecture.md`, `docs/roadmap.md`).

Нарушение = автоматический REJECT + откат ВСЕХ изменений.

**Почему**: LLM-агент может «оптимизировать» правила убрав ограничения которые ему мешают. Это предсказуемое поведение, поэтому запрет абсолютный.

## Build Commands

```bash
# Install (pnpm + Turborepo)
pnpm install                                      # workspace root (auto инициализирует git submodules)

# Turborepo — cached + parallel
pnpm turbo:build                                  # turbo run build (все пакеты)
pnpm turbo:test                                   # turbo run test
pnpm turbo:typecheck                              # turbo run typecheck

# Quick TS (без turbo)
pnpm typecheck                                    # tsc --noEmit
pnpm test -- --run                                # vitest unit
pnpm test:integration                             # vitest integration

# Backend monolith
pnpm dev:server                                   # Fastify --watch
pnpm server                                       # production

# Canisters (Rust — root workspace)
cargo build --workspace --release
cargo test --workspace
cargo clippy --workspace -- -D warnings

# Per-product commands via Turborepo filter
pnpm turbo run test --filter=@paxio/registry      # только FA-01
pnpm turbo run build --filter=@paxio/facilitator  # только FA-02
pnpm turbo run test --filter='./products/*'       # все FA

# Frontend (Next.js) — 8 apps, one pnpm filter each.
# Workspace names use `-app` suffix to avoid collision with products/* (e.g.
# @paxio/registry = products/01-registry, @paxio/registry-app = apps/frontend/registry).
pnpm --filter @paxio/landing-app dev              # paxio.network
pnpm --filter @paxio/registry-app dev             # registry.paxio.network
pnpm --filter @paxio/pay-app dev                  # pay.paxio.network
pnpm --filter @paxio/radar-app dev                # radar.paxio.network
pnpm --filter @paxio/intel-app dev                # intel.paxio.network
pnpm --filter @paxio/docs-app dev                 # docs.paxio.network
pnpm --filter @paxio/wallet-app dev               # wallet.paxio.network
pnpm --filter @paxio/fleet-app dev                # fleet.paxio.network

# Python (Intelligence ML)
cd products/07-intelligence/ml && uv run fastapi dev

# Acceptance scripts
bash scripts/verify_*.sh

# Changesets — independent versioning per product
pnpm changeset                                    # describe change
pnpm changeset version                            # bump versions
pnpm changeset publish                            # publish only changed packages
```

## Branch Model

```
feature/* → dev → main
```

- **feature/\*** — одна фича или milestone, создаётся от `dev`
- **dev** — рабочая интеграционная ветка
- **main** — релиз (tagged `v*`)
- **Merge = ТОЛЬКО user**. Агенты только создают PR. `git push --force` к main/dev — запрещён для всех агентов.
- **Orchestration = ТОЛЬКО user** by default. Architect — planner, не orchestrator. После hand-off отчёта architect ОСТАНАВЛИВАЕТСЯ и ждёт команду user'а. Исключение: user может делегировать orchestration через wake-up / `/loop` / `<<autonomous-loop>>` sentinel — тогда architect входит в **Mode B** (см. `.claude/agents/architect.md::Boundaries` + `.claude/rules/architect-protocol.md` ФАЗА 6.5/6.6) и может запускать dev-агентов + reviewer + test-runner, НО merge всё равно остаётся за user'ом.

## CI/CD (monorepo with path-filter workflows)

**Single `paxio-network/paxio` repo, 9 workflow files, each path-filtered.**
Only the workflow matching the changed paths runs — full tree never rebuilds on a single-file change. Pattern copied from `complior/.github/workflows/ci.yml` (dorny/paths-filter).

| Workflow | Triggers on paths | Pattern | Deploys to |
|---|---|---|---|
| `ci-frontend-<app>.yml` (×8) | `apps/frontend/<app>/**` | Lint + typecheck + build + audit | Vercel (via git webhook) |
| `ci-backend.yml` | `apps/back/**`, `products/*/app/**`, `packages/**` | Lint + vitest + pg service + audit | — |
| `deploy-backend.yml` | push `main` + above paths | Docker build → ghcr.io → SSH Hetzner → healthcheck → rollback | `api.paxio.network` (Hetzner) |
| `ci-canisters.yml` | `products/*/canister(s)/**`, `Cargo.toml` | cargo fmt + clippy + test + wasm build + audit | — |
| `release-tools.yml` | tag `v*` + SDK paths | Build binaries (5 platforms) → GitHub Release → npm + JSR + PyPI + crates.io | Public registries |

**Reference workflows (copied/adapted from):**
- Frontend: `/home/openclaw/complior-saas-front/.github/workflows/ci.yml`
- Backend: `/home/openclaw/PROJECT/.github/workflows/{ci.yml,deploy.yml}`
- Tools: `/home/openclaw/complior/.github/workflows/{ci.yml,release.yml}`

See [`docs/secrets.md`](./docs/secrets.md) for the full secrets inventory (GitHub, Vercel, Hetzner).

## Why monorepo (Turborepo)

Each deployable is **its own independent Vercel project / Docker image / npm package** — but all live in **one repo** for these concrete wins:

1. **Spin-off readiness.** `git filter-repo --path products/02-facilitator/ --path packages/types/` extracts a FA with full commit history. With polyrepo the history is split across repos and cannot be cleanly merged back for a buyer.
2. **Per-part CI.** Workflows use `dorny/paths-filter` — change to `apps/frontend/wallet/` only triggers `ci-frontend-wallet.yml`, not a full rebuild. Reduces CI time by ~80% vs full-repo pipelines.
3. **Shared code without publish roundtrip.** `@paxio/ui` used by 8 frontend apps — one commit propagates to all consumers via workspace protocol, no npm bump needed.
4. **Vercel Monorepo Projects.** Each `apps/frontend/<app>/` points to a separate Vercel project with its own domain — independent deploys, independent rollbacks, shared build cache via Turborepo Remote Cache.
5. **Atomic cross-FA refactors.** FA-01 API + FA-02 consumer change in one PR. In polyrepo that's two coordinated PRs with a race window.

## Important Paths

- Backend infrastructure: `apps/back/server/`
- Backend shared app infra (VM sandbox): `apps/back/app/{config,data}/`
- Per-FA backend code: `products/<fa>/app/{api,domain}/`
- Shared types (architect): `packages/types/src/` — `@paxio/types`
- Contracts/ports (architect): `packages/interfaces/src/` — `@paxio/interfaces`
- AppError hierarchy: `packages/errors/src/` — `@paxio/errors`
- Shared utility impls: `packages/utils/src/` — `@paxio/utils` (Clock, Logger)
- OpenAPI specs (Published Language): `packages/contracts/`
- Per-FA canisters: `products/<fa>/canister(s)/`
- Shared Rust crate: `platform/canister-shared/`
- FA→paths mapping: `docs/fa-registry.md` (★ source of truth)
- SDK (TS): `products/03-wallet/sdk-ts/` — `@paxio/sdk`
- SDK (Python): `products/03-wallet/sdk-python/` — `paxio-sdk` (PyPI)
- MCP Server: `products/03-wallet/mcp-server/`
- HTTP Proxy (Rust): `products/03-wallet/http-proxy/`
- Frontend: `apps/frontend/{landing,dashboard,docs}/`
- Compliance CLI: `products/06-compliance/cli/`
- Intelligence ML (Python): `products/07-intelligence/ml/`
- Guard submodule: `products/04-security/guard/` → `github.com/a3ka/guard` (deploys to guard.paxio.network)
- External source references: `opensrc/repos/`
- Tests: `tests/**/*.test.ts` + `products/*/tests/**/*.test.ts` + `products/*/canister(s)/**/tests.rs`
- Acceptance scripts: `scripts/verify_*.sh`

## Принцип «ICP только там где надо»

Canister = ТОЛЬКО если требуется одно из:
- **Threshold ECDSA** (Wallet keys, BTC signing — физически невозможно иначе)
- **Immutable cryptographic proof** (Audit Log, Evidence Chain, Forensics Trail)
- **Decentralized consensus** (Reputation Engine — нельзя подделать)
- **Deterministic enforcement** (Security Sidecar Intent Verifier)
- **Chain Fusion** (Bitcoin Agent: threshold ECDSA + BTC L1)

Всё остальное (Registry search/discovery, FAP routing, Guard HTTP integration, Compliance logic, MCP Server, CLI) — TypeScript в `server/` + `app/` или Rust в `cli/`. Никаких canister'ов по умолчанию.
