# Build commands for Paxio

## Install (Turborepo + pnpm + uv)

```bash
pnpm install                                 # workspace root (auto-init submodules)
```

## Backend (apps/back/server/ + apps/back/app/ + products/*/app/)

Backend не компилируется — `server/` это `.cjs` (CommonJS), `app/` загружается через VM loader в runtime.

```bash
pnpm dev:server        # Fastify --watch (dev mode)
pnpm server            # production
pnpm typecheck         # tsc --noEmit (packages/types, packages/interfaces, products/*/app)
```

## Rust canisters (root workspace)

```bash
cargo build --workspace --release
cargo test --workspace
cargo clippy --workspace -- -D warnings
```

## Canister deploy через dfx

```bash
source scripts/dfx-setup.sh        # per-agent port scheme (M00c)
dfx_start
dfx canister create --all
dfx build --all
```

## Distribution SDK (`@paxio/sdk`, `paxio-sdk`)

```bash
pnpm --filter @paxio/sdk build           # products/03-wallet/sdk-ts/
cd products/03-wallet/sdk-python && uv build
```

## Frontends (8 Next.js 15 apps — per-app Vercel project)

```bash
pnpm turbo run build --filter=@paxio/landing-app    # paxio.network
pnpm turbo run build --filter=@paxio/registry-app   # registry.paxio.network
pnpm turbo run build --filter=@paxio/pay-app        # pay.paxio.network
pnpm turbo run build --filter=@paxio/radar-app      # radar.paxio.network
pnpm turbo run build --filter=@paxio/intel-app      # intel.paxio.network
pnpm turbo run build --filter=@paxio/docs-app       # docs.paxio.network
pnpm turbo run build --filter=@paxio/wallet-app     # wallet.paxio.network
pnpm turbo run build --filter=@paxio/fleet-app      # fleet.paxio.network

# All 8 at once (cached + parallel via Turborepo)
pnpm turbo run build --filter='./apps/frontend/*'
```

## Full monorepo

```bash
pnpm turbo:build                           # turbo run build (everything)
pnpm turbo:test                            # turbo run test
pnpm turbo:typecheck                       # turbo run typecheck
```

Report: success/failure, build time, WASM size (canisters), bundle size per frontend app.
