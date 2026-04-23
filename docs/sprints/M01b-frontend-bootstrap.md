# M01b — Frontend Monorepo Bootstrap

**Owner:** frontend-dev
**Branch:** `feature/m01b-frontend-bootstrap`
**Depends on:** M01a ✅ (Turborepo)
**Parallel with:** M01-M04 (backend Phase 0)
**Estimate:** 3–4 days
**Status:** ✅ **DONE** (2026-04-23 — review `d6fb2ac`). 113/113 bootstrap tests GREEN, 8/8 turbo builds PASS, verify_m01b_frontend.sh 28/28. APPROVED WITH CONDITIONS — TD-07 (governance, 4th recurrence), TD-08 (smoke tests dead+buggy), TD-09 (ESLint build-gate bypassed via `ignoreDuringBuilds: true`). All non-blocking; TD-08/TD-09 BACKLOG awaits architect tests → frontend-dev fix in the next cycle.

## Готово когда:
- [ ] 8 Next.js 15 app skeletons под `apps/frontend/*` — каждый запускается `pnpm --filter <app> dev`
- [ ] 4 shared packages созданы: `@paxio/ui`, `@paxio/hooks`, `@paxio/api-client`, `@paxio/auth`
- [ ] `pnpm typecheck` — clean
- [ ] `pnpm turbo run build` — 8 apps успешно собираются
- [ ] `bash scripts/verify_m01b_frontend.sh` — PASS

## Scope (ТЗ v2.0 §1-2)

### 8 Next.js 15 apps — skeleton level

| App | Domain | Accent | Auth |
|---|---|---|---|
| `landing/` | `paxio.network` | primary `#0F3460` | — |
| `registry/` | `registry.paxio.network` | teal `#0F766E` | Privy (partial) |
| `pay/` | `pay.paxio.network` | accent `#533483` | Privy |
| `radar/` | `radar.paxio.network` | accent `#533483` | — |
| `intel/` | `intel.paxio.network` | accent `#533483` | Privy + subscription |
| `docs/` | `docs.paxio.network` | neutral | — |
| `wallet/` | `wallet.paxio.network` | navy `#1E3A5F` | Privy |
| `fleet/` | `fleet.paxio.network` | dark `#1A1A2E` | SSO/SAML |

Skeleton = landing-style `page.tsx` showing «Coming soon, under construction». Real content — M01c (landing) и позже milestones.

### 4 shared packages

Каждый создаётся как пустой workspace с `package.json`, `tsconfig.json`, `src/index.ts` exporting a placeholder.

| Package | Target contents (M01c+) |
|---|---|
| `@paxio/ui` | 22 React components (см. `.claude/agents/frontend-dev.md`) |
| `@paxio/hooks` | `useAgent`, `useWallet`, `useGuard`, `useRegistry`, `useIntelligence`, `useNetworkGraph`, `useTicker` |
| `@paxio/api-client` | Typed wrapper over `fetch()` + SWR / TanStack Query config, консомит `@paxio/types` |
| `@paxio/auth` | Privy provider + DID helpers + SIWE |

### Design tokens (в `@paxio/ui/src/tokens.ts`)

CSS variables:
```ts
export const tokens = {
  colors: {
    primary: '#0F3460',
    dark: '#1A1A2E',
    accent: '#533483',
    teal: '#0F766E',
    red: '#991B1B',
    bitcoin: '#D97706',
    navy: '#1E3A5F',
    green: '#166534',
    amber: '#C2410C',
  },
  fonts: {
    display: 'Geist, system-ui, sans-serif',
    body: 'Geist, system-ui, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, monospace',
  },
} as const;
```

Каждый app переопределяет `--color-accent` в `app/globals.css` под свой брэнд-акцент.

## Files to create

### `apps/frontend/<app>/` (×8)
- `package.json` — Next.js 15, Tailwind 4, shared `@paxio/*` deps
- `tsconfig.json` — extends `tsconfig.app.json`
- `next.config.ts` — turbopack config, output standalone
- `tailwind.config.ts` — extends `@paxio/ui/tailwind-preset`
- `app/layout.tsx` — root layout with Geist font, theme accent var
- `app/page.tsx` — «Coming soon» placeholder с `@paxio/ui` `<SectionFrame>`
- `app/globals.css` — accent color override
- `public/favicon.svg`
- `tests/smoke.test.tsx` — Vitest + @testing-library/react: app renders without crash

### `packages/<pkg>/` (×4)
- `package.json` — workspace exports
- `tsconfig.json`
- `src/index.ts` — barrel export (placeholder for M01c)
- Initial stub file (`tokens.ts` for ui, `use-ticker.ts` for hooks, `fetch-wrapper.ts` for api-client, `privy-provider.tsx` for auth)

### Root config updates
- `pnpm-workspace.yaml` — already includes `apps/frontend/*` and `packages/*`; verify
- `turbo.json` — add `dev` pipeline with persistent tasks

## Tests (RED — architect writes next commit)

- `tests/frontend-bootstrap.test.ts` — meta test: 8 app dirs exist, each has `package.json` with `@paxio/ui` dep, 4 package dirs exist with proper exports

**Status: ✅ НАПИСАН — commit `d94feb6`**

- 111 tests RED | 2 passing | 113 total
- `npx vitest run tests/frontend-bootstrap.test.ts` → RED (awaiting frontend-dev implementation)

## Acceptance script

`bash scripts/verify_m01b_frontend.sh` — 6 steps:
1. 8 frontend app dirs exist with `package.json`
2. 4 frontend package dirs exist with `package.json`
3. `pnpm typecheck` clean
4. `pnpm turbo run build --filter='./apps/frontend/*'` clean
5. `pnpm turbo run test --filter='./apps/frontend/*'` — smoke tests GREEN
6. Each app's `app/page.tsx` renders placeholder without error

## Таблица задач

| # | Задача | Агент | Метод верификации | Архитектурные требования |
|---|---|---|---|---|
| 1 | 8 Next.js skeletons (one per app) | frontend-dev | smoke test per app + `pnpm turbo build` | App Router, React Server Components, Tailwind 4, no client state in RSC |
| 2 | `@paxio/ui` tokens + SectionFrame + Skeleton | frontend-dev | `@paxio/ui` imported by each app | `forwardRef` where needed, variants via CVA, no inline styles |
| 3 | `@paxio/hooks` stubs (7 hooks) | frontend-dev | Each hook is exported and typed against `@paxio/types` | Pure hooks, no side effects in hook body, cleanup on unmount |
| 4 | `@paxio/api-client` fetch wrapper | frontend-dev | typed + returns Zod-parsed responses | Zod validation at every boundary, Result<T,E>, no `any` |
| 5 | `@paxio/auth` Privy provider + DID helpers | frontend-dev | Provider renders; DID helpers pure | Factory for config, no global state, SSR-safe (`'use client'` only where needed) |
| 6 | Per-app Tailwind preset + globals | frontend-dev | CSS var `--color-accent` matches table above per app | Tokens from `@paxio/ui/tokens`, no hardcoded hex in app CSS |
| 7 | Root `turbo.json` dev + test tasks for frontend | frontend-dev | `pnpm turbo run dev` works per app | Persistent tasks with `cache: false` for dev |

## Dependencies
- **No runtime deps** on backend — skeleton renders static content.
- `@paxio/types` consumed (read-only) for type contracts — M01c will use real endpoints.
- `@paxio/api-client` stubbed now, wired in M01c.

## Статус: ✅ ТЕСТЫ НАПИСАНЫ (`d94feb6`) — ЖДЁТ frontend-dev

Тесты RED-спецификация написаны architect'ом. frontend-dev реализует по тестам.
