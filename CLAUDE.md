# Paxio — Agent Financial OS

## Vision → Code Chain

```
docs/NOUS_Strategy_v5.md         (alias: docs/architecture.md) → Vision
docs/NOUS_Development_Roadmap.md (alias: docs/roadmap.md)      → Roadmap
docs/feature-areas/FA-0X-*.md                                  → Feature Areas
docs/fa-registry.md                                            → FA → physical paths
docs/sprints/M0X-*.md                                          → Milestones (тесты + acceptance)
packages/{types,interfaces,errors}/                            → Контракты (architect)
tests/**/*.test.ts + products/*/tests/                         → Test specs (RED → GREEN, architect)
apps/back/server/ + products/*/app/                            → Backend
products/*/canister(s)/                                        → Rust canisters
apps/frontend/                                                 → Frontend (Next.js 15)
```

Полный layout: [`docs/architecture/MONOREPO.md`](docs/architecture/MONOREPO.md).

## Workflow

```
STRATEGY → Roadmap → Feature Area → Milestone (тесты) → Code
```

**Test-first**: architect пишет RED-тесты ДО кода. Dev реализует пока тесты GREEN. Tests modifiable only by architect.

## Team

| Agent | Role |
|-------|------|
| architect | Контракты `packages/{types,interfaces,errors,contracts}/`, `tests/`, `scripts/verify_*.sh`, milestones, FA, `docs/fa-registry.md` |
| backend-dev | Fastify `apps/back/server/`, TS `products/*/app/` (кроме FA-01), `products/03-wallet/{sdk-ts,sdk-python,mcp-server,guard-client}/`, `products/06-compliance/github-action/` |
| icp-dev | Rust `products/*/canister(s)/` (кроме FA-01), `products/03-wallet/http-proxy/`, `products/06-compliance/cli/`, `platform/canister-shared/` |
| registry-dev | FA-01 целиком (`products/01-registry/`) |
| frontend-dev | 8 Next.js apps + 4 shared frontend packages (`apps/frontend/`, `packages/{ui,hooks,api-client,auth}/`) |
| test-runner | Build + test verification |
| reviewer | Scope check, quality review, `docs/project-state.md` + `docs/tech-debt.md` (only after APPROVED) |

**Guard Agent (Python ML)** — внешний репо `/home/openclaw/guard/` → `guard.paxio.network`. В Paxio codebase Python нет.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend runtime | Node.js 22, Fastify 5 |
| Backend infra (`server/`) | CommonJS `.cjs`, `require()` + I/O разрешены |
| Backend logic (`app/`) | ES modules в VM Sandbox (`vm.Script`), frozen context, NO `require`/`import`/I/O |
| Canisters | Rust + `ic-cdk` 0.13+ + `ic-stable-structures` |
| Frontend | Next.js 15 + Tailwind 4 + Radix UI + Framer Motion |
| Frontend auth | Privy (per-app project) |
| Frontend charts | Recharts + Tremor + D3 |
| Frontend deploy | Vercel Monorepo Projects (one project per app) |
| Distribution SDK | `@paxio/sdk` (TS), `paxio-sdk` (PyPI) |
| MCP Server | TypeScript MCP SDK |
| DB | PostgreSQL + Qdrant + Redis |
| Blockchain | ICP canisters + Bitcoin L1 (threshold ECDSA) |
| External ML | Guard API (`guard.paxio.network`) — HTTP client, contract в `app/types/guard-api.ts` |

## Products (7 Layers)

| Product | Layer | What |
|---------|-------|------|
| P1 | Identity | Universal Registry — cross-ecosystem agent index |
| P2 | Payment | Meta-Facilitator + FAP — multi-protocol routing |
| P3 | Trust | Wallet + Adapter — non-custodial BTC L1 |
| P4 | Trust | Security Layer — Guard (внешний) + Security Sidecar (ICP) |
| P5 | Trust | Bitcoin Agent — DCA, Escrow, Streaming, Stake |
| P6 | Compliance | EU AI Act certification (Complior Agent) |
| P7 | Intelligence | Bloomberg + Chainlink для агентной экономики |

## Architecture Principles

1. **Three-layer stack**: Interaction Layer (Fastify REST) → Routing Engine (stateless) → ICP Backbone (trust + settlement).
2. **Backend `server/` + `app/`** (Olympus стиль): инфраструктура отдельно от бизнес-логики. `app/` в VM sandbox с frozen context.
3. **Non-custodial by default**: ключи никогда в одном месте. Threshold ECDSA на 13+ ICP узлах.
4. **LLM-free for financial decisions**: Rust детерминированный код принимает решения. ML классифицирует input.
5. **Data externalization**: справочные данные в `app/data/*.json`, не в коде.
6. **No hardcoded values**: пути, порты, ключи через `app/config/` или env.
7. **Onion deps**: `server/ → app/api/ → app/domain/ → app/lib/`. Строго внутрь.
8. **ICP только там где надо**: threshold ECDSA, immutable proof, decentralized consensus, deterministic enforcement, Chain Fusion. Всё остальное — TS/Rust off-chain.

## File Ownership

| Agent | ALLOWED | FORBIDDEN |
|-------|---------|-----------|
| architect | `packages/{types,interfaces,errors,contracts}/`, `tests/`, `scripts/verify_*.sh`, `docs/`, `CLAUDE.md`, `.claude/` | `apps/`, `products/*/{app,canister*,cli,sdk-*,mcp-server}/`, `packages/utils/` |
| backend-dev | `apps/back/server/`, `apps/back/app/{config,data}/`, TS `products/*/app/` (кроме FA-01), `products/03-wallet/{sdk-ts,sdk-python,mcp-server,guard-client}/`, `products/04-security/guard-client/`, `products/06-compliance/github-action/`, `packages/utils/` | canisters, frontend, guard submodule, `packages/{types,...}/` (read-only) |
| icp-dev | Rust `products/*/canister(s)/` (кроме FA-01), `products/03-wallet/http-proxy/`, `products/06-compliance/cli/`, `platform/canister-shared/`, `apps/back/server/infrastructure/icp.cjs` | FA-01 canister, TS, frontend |
| registry-dev | `products/01-registry/` весь | Everything else |
| frontend-dev | `apps/frontend/`, `packages/{ui,hooks,api-client,auth}/` | backend, products, canisters, `packages/{types,...,utils}/` (read-only) |
| test-runner | READS `tests/`, `scripts/`, runs commands | ANY implementation code |
| reviewer | `docs/project-state.md` + `docs/tech-debt.md` (after APPROVED) | Everything else |

## УСТАВНЫЕ ДОКУМЕНТЫ — АБСОЛЮТНЫЙ ЗАПРЕТ для dev-агентов

Dev-агенты НЕ модифицируют: `.claude/`, `CLAUDE.md`, `docs/project-state.md`, `docs/tech-debt.md`, `docs/sprints/`, `docs/feature-areas/`, `docs/NOUS_Strategy_v5.md`, `docs/NOUS_Development_Roadmap.md` (+ алиасы `docs/architecture.md`, `docs/roadmap.md`).

Нарушение = автоматический REJECT + откат ВСЕХ изменений.

## Build Commands (Turborepo + pnpm + uv)

```bash
# Install (auto submodules init)
pnpm install

# Turborepo — cached + parallel
pnpm turbo:build                                  # turbo run build
pnpm turbo:test                                   # turbo run test
pnpm turbo:typecheck                              # turbo run typecheck

# Quick TS (без turbo)
pnpm typecheck                                    # tsc --noEmit
pnpm test -- --run                                # vitest unit
pnpm test:integration                             # vitest integration

# Backend
pnpm dev:server                                   # Fastify --watch
pnpm server                                       # production

# Canisters (root Cargo workspace)
cargo build --workspace --release
cargo test --workspace
cargo clippy --workspace -- -D warnings

# Per-product Turborepo filter
pnpm turbo run test --filter=@paxio/registry      # FA-01
pnpm turbo run build --filter=@paxio/facilitator  # FA-02
pnpm turbo run test --filter='./products/*'       # все FA

# Frontend (Next.js) — workspace names use `-app` suffix to avoid collision
# with products/* (e.g. @paxio/registry = products/01-registry, @paxio/registry-app = apps/frontend/registry).
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

# Changesets — independent versioning
pnpm changeset                                    # describe
pnpm changeset version                            # bump
pnpm changeset publish                            # publish changed
```

## Branch Model

```
feature/* → dev → main
```

- **feature/\*** — одна фича/milestone, создаётся от `dev`.
- **dev** — рабочая интеграционная ветка.
- **main** — релиз (tagged `v*`).
- **Git push / PR creation = только architect + user.** Dev-агенты работают **только локально**: `git commit` → «готово». `git push`, `gh pr create`, `gh api` запрещены для devs.
- **Two merge gates** (см. `.claude/rules/scope-guard.md`):
  - **`feature/* → dev`**: architect мержит сам после reviewer APPROVED + must-fix закрыты + CI green. Без OK от user.
  - **`dev → main`**: ТОЛЬКО после явного OK от user с PR номером.
  - dev / reviewer / test-runner не мержат. `git push --force` к main/dev запрещён всегда.
- **Orchestration = только user.** Architect — planner, не orchestrator.

## CI/CD (path-filtered workflows)

Single repo, 9 workflow files, each path-filtered (`dorny/paths-filter`). Только matching workflow запускается на изменение.

| Workflow | Triggers | Pattern | Deploys |
|---|---|---|---|
| `ci-frontend-<app>.yml` (×8) | `apps/frontend/<app>/**` | Lint + typecheck + build + audit | Vercel (git webhook) |
| `ci-backend.yml` | `apps/back/**`, `products/*/app/**`, `packages/**` | Lint + vitest + pg + audit | — |
| `deploy-backend.yml` | push `main` + above paths | Docker → ghcr.io → SSH Hetzner → healthcheck | `api.paxio.network` |
| `ci-canisters.yml` | `products/*/canister(s)/**`, `Cargo.toml` | cargo fmt + clippy + test + wasm | — |
| `release-tools.yml` | tag `v*` + SDK paths | Build × 5 platforms → GitHub Release → npm + JSR + PyPI + crates.io | Public registries |

См. [`docs/secrets.md`](docs/secrets.md) — secrets inventory.

## Why monorepo (Turborepo)

Каждый deployable = независимый Vercel project / Docker image / npm package, но всё в одном репо ради:

1. **Spin-off readiness**: `git filter-repo --path products/02-facilitator/ --path packages/types/` извлекает FA с full history. Polyrepo = split history.
2. **Per-part CI**: `dorny/paths-filter` — change в `apps/frontend/wallet/` запускает только `ci-frontend-wallet.yml`, не full rebuild. ~80% CI time reduction vs full-repo.
3. **Shared code без publish roundtrip**: `@paxio/ui` используется 8 frontend apps — один commit propagates через workspace protocol, без npm bump.
4. **Vercel Monorepo Projects**: каждое `apps/frontend/<app>/` — отдельный Vercel project с своим domain. Independent deploys + rollbacks. Shared build cache через Turborepo Remote Cache.
5. **Atomic cross-FA refactors**: FA-01 API + FA-02 consumer change в одном PR. В polyrepo = 2 coordinated PRs с race window.

## Принцип «ICP только там где надо»

Canister = ТОЛЬКО если требуется одно из:
- **Threshold ECDSA** (Wallet keys, BTC signing — физически невозможно иначе).
- **Immutable cryptographic proof** (Audit Log, Evidence Chain, Forensics Trail).
- **Decentralized consensus** (Reputation Engine — нельзя подделать).
- **Deterministic enforcement** (Security Sidecar Intent Verifier).
- **Chain Fusion** (Bitcoin Agent: threshold ECDSA + BTC L1).

Всё остальное (Registry search/discovery, FAP routing, Guard HTTP, Compliance, MCP Server, CLI) — TS в `server/`+`app/` или Rust в `cli/`. Никаких canister'ов по умолчанию.
