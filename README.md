# Paxio — Agent Financial OS

> Financial OS for the Agentic Economy. Identity · Payment · Trust · Compliance · Intelligence.

**Status:** Phase 0 (Foundation). See `docs/sprints/MILESTONES.md`.

## Vision

Paxio is the Agent Financial OS — 7 products, 5 layers, built on ICP canisters + Bitcoin L1 via threshold ECDSA.
See `docs/architecture.md` (Strategy) and `docs/roadmap.md`.

## Architecture at a glance

```
server/      Fastify infrastructure (CommonJS .cjs)
app/         Business logic in VM sandbox (TypeScript)
  ├─ types/       Shared types + Zod schemas
  ├─ interfaces/  Contracts / ports
  ├─ domain/      Per-FA business logic
  ├─ api/         HTTP handlers
  ├─ lib/         Utilities
  ├─ config/      Frozen configuration
  ├─ data/        Reference JSON (NOT hardcoded)
  └─ errors/      AppError hierarchy
canisters/   Rust ICP canisters (registry, wallet, audit_log, reputation, security_sidecar, bitcoin_agent)
packages/
  ├─ sdk/           @paxio/sdk (TypeScript)
  ├─ mcp-server/    MCP Server (mcp.paxio.network)
  └─ frontend/      Next.js 15 apps (landing, app, docs)
cli/         Rust CLI
```

## External services

- **Guard Agent** (ML classification): `guard.paxio.network` — lives in `/home/openclaw/guard/`, Python/FastAPI/vLLM

## Quickstart

```bash
npm install
npm run typecheck
npm run test -- --run
npm run lint
bash scripts/verify_foundation.sh
```

## Documents

- `CLAUDE.md` — master rules (agents read first)
- `docs/architecture.md` — Strategy (symlink to `NOUS_Strategy_v5.md`)
- `docs/roadmap.md` — Development Roadmap (symlink)
- `docs/feature-areas/FA-0X-*.md` — Feature Area specifications (FA-01..FA-07)
- `docs/sprints/MILESTONES.md` — master milestones plan (133 milestones)
- `docs/reuse-inventory.md` — what we reuse from Bitgent / Complior / Guard
- `.claude/rules/engineering-principles.md` — SE principles architect reference

## Branch Model

```
feature/* → dev → main
```

Merge decisions by user only. Agents create PRs.

## License

UNLICENSED (pre-release). Paxio is private infrastructure pending public launch.
