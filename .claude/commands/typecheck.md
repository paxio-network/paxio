# TypeScript typecheck for Paxio

## Full typecheck (workspace root)

```bash
npm run typecheck
```

Это проверяет:
- `app/types/*.ts` и `app/interfaces/*.ts` (architect's контракты)
- `packages/sdk/src/*.ts` (TypeScript `@paxio/sdk`)
- `packages/frontend/**/*.{ts,tsx}` (Next.js apps)

Под капотом — `tsc --noEmit` в каждом workspace через `npm run typecheck --workspaces --if-present`.

## Single workspace

```bash
cd packages/sdk && npx tsc --noEmit
cd packages/frontend/app && npm run typecheck
```

## Backend (app/) — типы проверяются через `tsc`

`server/` использует CommonJS `.cjs` без типов.
`app/` может быть .js или .ts. Если .ts — компилируется в .js loader'ом.

```bash
# если есть tsconfig для app/:
npx tsc --project app/tsconfig.json --noEmit
```

Report: success/failure, error count, error locations.
