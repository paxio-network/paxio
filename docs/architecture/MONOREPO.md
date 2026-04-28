# Paxio Monorepo Layout

> Verbose project layout extracted from CLAUDE.md (M-Q7). CLAUDE.md keeps just the
> top-level summary; this file is the reference for paths.

## Tree

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
│   │   ├── landing/                    # paxio.network           — main landing
│   │   ├── registry/                   # registry.paxio.network  — Universal Registry explorer
│   │   ├── pay/                        # pay.paxio.network       — FAP dashboard
│   │   ├── radar/                      # radar.paxio.network     — Intelligence free tier
│   │   ├── intel/                      # intel.paxio.network     — Intelligence Terminal (paid)
│   │   ├── docs/                       # docs.paxio.network      — platform + SDK docs
│   │   ├── wallet/                     # wallet.paxio.network    — Wallet + 9 Bitcoin Agents
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
│   ├── 04-security/                    # FA-04 Security Layer
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
│   │   ├── app/{api,domain}/           # TS: Complior Engine
│   │   ├── canisters/                  # Rust: audit-log, certification-manager
│   │   ├── cli/                        # Rust CLI
│   │   ├── github-action/              # paxio-network/compliance-check@v1
│   │   └── tests/
│   └── 07-intelligence/                # FA-07 Intelligence
│       ├── app/{api,domain}/           # TS: Data Pipeline, Intelligence API
│       ├── ml/                         # Python: LightGBM + Prophet + SHAP
│       ├── canister/                   # Rust: Oracle Network
│       └── tests/
│
├── packages/                           # Shared Kernel
│   ├── types/                          # @paxio/types       — Zod + TS (architect)
│   ├── interfaces/                     # @paxio/interfaces  — port contracts (architect)
│   ├── errors/                         # @paxio/errors      — AppError hierarchy (architect)
│   ├── utils/                          # @paxio/utils       — Clock, Logger (backend-dev)
│   ├── contracts/                      # OpenAPI per FA (architect)
│   ├── ui/                             # @paxio/ui          — React (frontend-dev)
│   ├── hooks/                          # @paxio/hooks       — useAgent/useWallet (frontend-dev)
│   ├── api-client/                     # @paxio/api-client  — typed REST/WS (frontend-dev)
│   └── auth/                           # @paxio/auth        — Privy wrapper (frontend-dev)
│
├── platform/canister-shared/           # Rust shared crate (threshold ECDSA helpers)
├── tests/                              # Cross-FA E2E integration tests — architect
├── scripts/                            # verify_*.sh acceptance — architect
├── docs/                               # fa-registry.md, feature-areas/, sprints/, architecture/
├── opensrc/                            # Pinned external references
├── .claude/                            # Agent config
├── .github/workflows/                  # CI/CD
├── Cargo.toml                          # ROOT Rust workspace
├── pnpm-workspace.yaml                 # TS workspaces
├── turbo.json                          # Turborepo pipelines
└── CLAUDE.md                           # Master rules
```

## Important Paths

- Backend infrastructure: `apps/back/server/`
- Backend shared app infra (VM sandbox): `apps/back/app/{config,data}/`
- Per-FA backend code: `products/<fa>/app/{api,domain}/`
- Shared types (architect): `packages/types/src/` — `@paxio/types`
- Contracts/ports: `packages/interfaces/src/` — `@paxio/interfaces`
- AppError hierarchy: `packages/errors/src/` — `@paxio/errors`
- Shared utility impls: `packages/utils/src/` — `@paxio/utils`
- OpenAPI specs: `packages/contracts/`
- Per-FA canisters: `products/<fa>/canister(s)/`
- Shared Rust crate: `platform/canister-shared/`
- FA → paths mapping: `docs/fa-registry.md` (★ source of truth)
- SDK (TS): `products/03-wallet/sdk-ts/` — `@paxio/sdk`
- SDK (Python): `products/03-wallet/sdk-python/` — `paxio-sdk`
- MCP Server: `products/03-wallet/mcp-server/`
- HTTP Proxy (Rust): `products/03-wallet/http-proxy/`
- Frontend: `apps/frontend/{landing,registry,pay,radar,intel,docs,wallet,fleet}/`
- Compliance CLI: `products/06-compliance/cli/`
- Intelligence ML (Python): `products/07-intelligence/ml/`
- Guard submodule: `products/04-security/guard/` → `github.com/a3ka/guard`
- External source references: `opensrc/repos/`
- Tests: `tests/**/*.test.ts` + `products/*/tests/**/*.test.ts` + `products/*/canister(s)/**/tests.rs`
- Acceptance scripts: `scripts/verify_*.sh`
