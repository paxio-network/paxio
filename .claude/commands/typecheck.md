# TypeScript typecheck for Paxio

## Full typecheck (workspace root)

```bash
pnpm typecheck              # tsc --noEmit во всех packages
pnpm turbo:typecheck        # cached + parallel через Turborepo
```

Это проверяет:
- `packages/types/src/*.ts` — Zod схемы + shared TS types (architect)
- `packages/interfaces/src/*.ts` — port-контракты (architect)
- `packages/errors/src/*.ts` — AppError hierarchy (architect)
- `packages/utils/src/*.ts` — Clock, Logger (backend-dev)
- `packages/ui/src/*.{ts,tsx}` — React components (frontend-dev)
- `packages/hooks/src/*.ts` — React hooks (frontend-dev)
- `packages/api-client/src/*.ts` — typed REST/WS client (frontend-dev)
- `packages/auth/src/*.ts` — Privy wrapper (frontend-dev)
- `products/*/app/**/*.ts` — per-FA backend TS
- `products/03-wallet/sdk-ts/src/*.ts` — `@paxio/sdk`
- `apps/frontend/*/**/*.{ts,tsx}` — 8 Next.js apps

## Single package / app

```bash
pnpm --filter @paxio/types typecheck
pnpm --filter @paxio/ui typecheck
pnpm --filter @paxio/landing-app typecheck   # apps/frontend/landing
pnpm --filter @paxio/facilitator typecheck   # products/02-facilitator
```

## Backend VM-sandbox (`apps/back/app/*.js`)

`apps/back/server/` использует CommonJS `.cjs` — проверяется eslint, не tsc.
`apps/back/app/*.js` загружается через VM loader, типы приходят из `packages/types/` (читаем .d.ts-хэдеры в JSDoc).

```bash
# Если есть tsconfig для JS-with-JSDoc:
npx tsc --project apps/back/app/tsconfig.json --noEmit --allowJs --checkJs
```

## Rust (отдельно, не `pnpm typecheck`)

```bash
cargo check --workspace           # быстрый typecheck без codegen
cargo clippy --workspace -- -D warnings
```

Report: success/failure, error count, error locations.
