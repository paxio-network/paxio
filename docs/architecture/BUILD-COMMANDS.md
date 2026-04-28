# Build Commands — Turborepo + pnpm + uv

> Reference for full command inventory. Devs run targeted commands per agent file
> `Verification` section. Architect/reviewer use this for milestone setup +
> pipeline overview.

## Install

```bash
# Auto-init submodules (products/04-security/guard/)
pnpm install
```

## Turborepo — cached + parallel (preferred for CI)

```bash
pnpm turbo:build       # turbo run build
pnpm turbo:test        # turbo run test
pnpm turbo:typecheck   # turbo run typecheck
```

## Quick TS (без turbo)

```bash
pnpm typecheck             # tsc --noEmit
pnpm test -- --run         # vitest unit
pnpm test:integration      # vitest integration
```

## Backend

```bash
pnpm dev:server   # Fastify --watch
pnpm server       # production
```

## Canisters (root Cargo workspace)

```bash
cargo build --workspace --release
cargo test --workspace
cargo clippy --workspace -- -D warnings
```

## Per-product Turborepo filter

```bash
pnpm turbo run test --filter=@paxio/registry      # FA-01
pnpm turbo run build --filter=@paxio/facilitator  # FA-02
pnpm turbo run test --filter='./products/*'       # все FA
```

## Frontend (Next.js)

Workspace names use `-app` suffix to avoid collision with `products/*`:
- `@paxio/registry` = `products/01-registry/` (backend)
- `@paxio/registry-app` = `apps/frontend/registry/` (Next.js app)

```bash
pnpm --filter @paxio/landing-app dev   # paxio.network
pnpm --filter @paxio/registry-app dev  # registry.paxio.network
pnpm --filter @paxio/pay-app dev       # pay.paxio.network
pnpm --filter @paxio/radar-app dev     # radar.paxio.network
pnpm --filter @paxio/intel-app dev     # intel.paxio.network
pnpm --filter @paxio/docs-app dev      # docs.paxio.network
pnpm --filter @paxio/wallet-app dev    # wallet.paxio.network
pnpm --filter @paxio/fleet-app dev     # fleet.paxio.network
```

## Python (Intelligence ML)

```bash
cd products/07-intelligence/ml && uv run fastapi dev
```

## Acceptance scripts

```bash
bash scripts/verify_*.sh
```

## Changesets — independent versioning

```bash
pnpm changeset           # describe
pnpm changeset version   # bump
pnpm changeset publish   # publish changed
```

## Quality gate (test-runner agent)

```bash
bash scripts/quality-gate.sh <milestone-id>   # 6 stages: typecheck → root vitest → per-app test/build → cargo (Rust) → acceptance
```

See `.claude/agents/test-runner.md` + `.claude/rules/workflow.md`.
