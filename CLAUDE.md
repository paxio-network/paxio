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

Layout detail: [`docs/architecture/MONOREPO.md`](docs/architecture/MONOREPO.md).
Full build commands: [`docs/architecture/BUILD-COMMANDS.md`](docs/architecture/BUILD-COMMANDS.md).
ICP boundary rule: [`docs/architecture/ICP-PRINCIPLE.md`](docs/architecture/ICP-PRINCIPLE.md).

## Build (Turborepo + pnpm)

```bash
pnpm install                                       # auto submodules
pnpm turbo:build && pnpm turbo:test                # parallel cached
pnpm typecheck && pnpm test -- --run               # quick TS
cargo test --workspace                             # canisters
pnpm turbo run test --filter=@paxio/registry       # FA-01 only
pnpm --filter @paxio/landing-app dev               # one of 8 Vercel Monorepo Projects
```

Per-FA filter pattern: `--filter=@paxio/<fa-name>` (backend) or `--filter=@paxio/<app>-app` (frontend).

## Per-OS-user setup — required (do once)

`/home/nous/paxio` is shared across OS users (`nous`, `minimax`, etc). Each must set their own per-user `TMPDIR` in `~/.claude/settings.json` to isolate gh-cli + node compile cache and avoid cross-user `EPERM` chmod collisions:

```json
{
  "env": {
    "TMPDIR": "/home/<your-user>/.cache/paxio-tmp"
  }
}
```

**Project-level `.claude/settings.json` does NOT set `TMPDIR`** — Claude Code passes env values literally without expanding `$HOME`, so a project-level `"TMPDIR": "$HOME/..."` would create a literal `./$HOME/` directory in the repo root (M-Q17 incident, fixed). Per-user setup with absolute path is mandatory.

## Workflow

```
STRATEGY → Roadmap → Feature Area → Milestone (тесты) → Code
```

**Test-first**: architect пишет RED-тесты ДО кода. Dev реализует пока тесты GREEN. Tests modifiable only by architect.

## Team

| Agent | Role |
|-------|------|
| architect | Контракты `packages/{types,interfaces,errors,contracts}/`, `tests/`, `scripts/verify_*.sh`, milestones, FA |
| backend-dev | Fastify `apps/back/server/`, TS `products/*/app/` (кроме FA-01), SDK/MCP, Guard client |
| icp-dev | Rust `products/*/canister*/` (кроме FA-01), `http-proxy/`, `cli/`, `platform/canister-shared/` |
| registry-dev | FA-01 целиком (`products/01-registry/`) |
| frontend-dev | 8 Next.js apps + 4 shared packages (`apps/frontend/`, `packages/{ui,hooks,api-client,auth}/`) |
| test-runner | Build + test verification |
| reviewer | Scope check, quality review, `docs/project-state.md` + `docs/tech-debt.md` (after APPROVED) |

**Guard Agent (Python ML)** — внешний `/home/openclaw/guard/` → `guard.paxio.network`. В Paxio codebase Python нет.

## Stack — short form

Backend: Node 22 + Fastify 5. `server/` = CJS infra (require/I/O OK), `app/` = VM Sandbox (NO require/import/I/O). Canisters: Rust + ic-cdk 0.13. Frontend: Next.js 15 + Tailwind 4 + Radix + Framer + Privy. DB: PostgreSQL + Qdrant + Redis. Blockchain: ICP + BTC L1 (threshold ECDSA). External ML: Guard HTTP API.

## Products (7 Layers — short)

| Product | Layer | What |
|---|---|---|
| P1 Registry | Identity | Universal cross-ecosystem agent index |
| P2 Facilitator | Payment | Meta-Facilitator + FAP — multi-protocol routing |
| P3 Wallet | Trust | Non-custodial BTC L1 (threshold ECDSA) |
| P4 Security | Trust | Guard (external) + Security Sidecar (ICP) |
| P5 Bitcoin Agent | Trust | DCA, Escrow, Streaming, Stake |
| P6 Compliance | Compliance | EU AI Act certification (Complior Agent) |
| P7 Intelligence | Intel | Bloomberg + Chainlink for agent economy |

## Architecture Principles

1. **Three-layer stack**: Interaction (Fastify REST) → Routing (stateless) → ICP Backbone (trust + settlement).
2. **Backend `server/` + `app/`**: инфра отдельно от логики. `app/` в VM sandbox с frozen context.
3. **Non-custodial by default**: ключи никогда в одном месте. Threshold ECDSA на 13+ ICP узлах.
4. **LLM-free for financial decisions**: Rust детерминированный код принимает решения. ML классифицирует input.
5. **Data externalization**: справочные данные в `app/data/*.json`, не в коде.
6. **No hardcoded values**: пути, порты, ключи через `app/config/` или env.
7. **Onion deps**: `server/ → app/api/ → app/domain/ → app/lib/`. Строго внутрь.
8. **ICP только там где надо**: см. [`docs/architecture/ICP-PRINCIPLE.md`](docs/architecture/ICP-PRINCIPLE.md).

## File Ownership

| Agent | ALLOWED | FORBIDDEN |
|-------|---------|-----------|
| architect | `packages/{types,interfaces,errors,contracts}/`, `tests/`, `scripts/verify_*.sh`, `docs/`, `CLAUDE.md`, `.claude/` | `apps/`, `products/*/{app,canister*,cli,sdk-*,mcp-server}/`, `packages/utils/` |
| backend-dev | `apps/back/server/`, `apps/back/app/{config,data}/`, TS `products/*/app/` (кроме FA-01), `products/03-wallet/{sdk-ts,sdk-python,mcp-server,guard-client}/`, `products/04-security/guard-client/`, `products/06-compliance/github-action/`, `packages/utils/` | canisters, frontend, guard submodule, `packages/{types,...}/` (read-only) |
| icp-dev | Rust `products/*/canister*/` (кроме FA-01), `products/03-wallet/http-proxy/`, `products/06-compliance/cli/`, `platform/canister-shared/`, `apps/back/server/infrastructure/icp.cjs` | FA-01 canister, TS, frontend |
| registry-dev | `products/01-registry/` весь | Everything else |
| frontend-dev | `apps/frontend/`, `packages/{ui,hooks,api-client,auth}/` | backend, products, canisters, `packages/{types,...,utils}/` (read-only) |
| test-runner | READS `tests/`, `scripts/`, runs commands | ANY implementation code |
| reviewer | `docs/project-state.md` + `docs/tech-debt.md` (after APPROVED) | Everything else |

## УСТАВНЫЕ ДОКУМЕНТЫ — АБСОЛЮТНЫЙ ЗАПРЕТ для dev-агентов

Dev-агенты НЕ модифицируют: `.claude/`, `CLAUDE.md`, `docs/project-state.md`, `docs/tech-debt.md`, `docs/sprints/`, `docs/feature-areas/`, `docs/NOUS_Strategy_v5.md`, `docs/NOUS_Development_Roadmap.md` (+ алиасы `docs/architecture.md`, `docs/roadmap.md`).

Нарушение = автоматический REJECT + откат ВСЕХ изменений.

## Branch Model

```
feature/* → dev → main
```

- **feature/\*** — одна фича/milestone, создаётся от `dev`.
- **dev** — рабочая интеграционная ветка.
- **main** — релиз (tagged `v*`).
- **Push policy** (TD-dev-push, mechanically enforced by `.husky/pre-push`):
  - **architect + user** push anywhere
  - **devs** (backend / frontend / icp / registry) push their own `feature/*` branches mid-PR after «готово» — CANNOT push `dev` or `main`
  - **reviewer** narrow push to `dev` for chore commits (project-state + tech-debt only)
  - **test-runner** read-only (no push)
  - **PR creation (`gh pr create`)** = architect + user only
- **Two merge gates** (см. `.claude/rules/scope-guard.md`):
  - **`feature/* → dev`**: architect мержит сам после reviewer APPROVED + must-fix закрыты + CI green.
  - **`dev → main`**: ТОЛЬКО после явного OK от user с PR номером.
  - dev / reviewer / test-runner не мержат. `git push --force` к main/dev запрещён.

CI/CD detail: [`docs/cicd.md`](docs/cicd.md). Secrets inventory: [`docs/secrets.md`](docs/secrets.md).
