# Build commands for Paxio

## Backend (server/ + app/)

Backend не компилируется — `server/` это `.cjs` (CommonJS), `app/` загружается через VM loader в runtime.

```bash
npm install            # workspace dependencies
npm run dev:server     # Fastify с --watch (dev mode)
npm run server         # production
npm run typecheck      # tsc --noEmit для app/types/
```

## Rust canisters

```bash
cd canisters && cargo build --release
```

## Canister build + deploy через dfx

```bash
dfx canister create --all
dfx build --all
```

## Distribution SDK (`@paxio/sdk`)

```bash
cd packages/sdk && npm run build
```

## Frontends (Next.js 15)

```bash
cd packages/frontend/landing && npm run build   # paxio.network
cd packages/frontend/app && npm run build       # app.paxio.network
cd packages/frontend/docs && npm run build      # docs.paxio.network
```

## Full monorepo (когда настроен)

```bash
npm run build --workspaces --if-present
```

Report: success/failure, build time, WASM size (canisters), bundle size (frontend).
