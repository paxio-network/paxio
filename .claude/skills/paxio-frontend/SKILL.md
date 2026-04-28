---
name: paxio-frontend
description: Paxio frontend — 8 Next.js 15 apps + 4 shared packages (@paxio/ui, @paxio/hooks, @paxio/api-client, @paxio/auth). Use when implementing apps/frontend/* or packages/{ui,hooks,api-client,auth}/, designing App Router pages, Privy auth, Radix via @paxio/ui, Tailwind 4, or when the user mentions Real Data Invariant, R-FE-Preview ribbon, useDid, agent-app naming, Vercel Monorepo Project.
---

# Paxio Frontend

> See also: `nextjs-15`, `react-patterns`, `radix-ui`, `tailwindcss-4`, `framer-motion`, `zod-validation`.

## Stack

| Component | Tech |
|---|---|
| Framework | Next.js 15 App Router (RSC by default) |
| TS | strict + `exactOptionalPropertyTypes: true` |
| Styling | Tailwind 4 + per-app CSS variable accent |
| UI primitives | Radix (via `@paxio/ui` — never raw) |
| Animation | Framer Motion (`prefers-reduced-motion` honored) |
| Charts | Recharts + Tremor (dashboards), D3 (Network Graph) |
| Auth | Privy — per-app Privy project (`NEXT_PUBLIC_PRIVY_APP_ID_<APP>`) |
| Data | **Real data only** via `@paxio/api-client` + React Query |
| Deploy | Vercel Monorepo Projects, one project per app |

## 8 apps × accent

| App | Domain | Accent | Auth |
|---|---|---|---|
| `landing` | paxio.network | `#0F3460` | None |
| `registry` | registry.paxio.network | `#0F766E` teal | Privy partial |
| `pay` | pay.paxio.network | `#533483` | Privy |
| `radar` | radar.paxio.network | `#533483` | None |
| `intel` | intel.paxio.network | `#533483` | Privy + subscription |
| `docs` | docs.paxio.network | `#1A1A2E` dark | None |
| `wallet` | wallet.paxio.network | `#1E3A5F` navy | Privy required |
| `fleet` | fleet.paxio.network | `#1A1A2E` | SSO/SAML |

## 4 shared packages

| Package | Purpose |
|---|---|
| `@paxio/ui` | React components (AgentCard, LiveTicker, NetworkGraph, FAPDiagram, etc.) — Radix-backed |
| `@paxio/hooks` | useAgent, useWallet, useGuard, useTicker, ... |
| `@paxio/api-client` | Typed REST + WS client, consumes Zod schemas from `@paxio/types` |
| `@paxio/auth` | Privy wrapper, DID helpers, SIWE sign-in, session persistence |

## App Router rules

```
apps/frontend/<app>/app/
├── (public)/   ← no auth gate
├── (auth)/    ← auth-gated
├── api/       ← rewrites → backend
├── layout.tsx, page.tsx, globals.css
```

- `page.tsx` is **server component by default** — no `'use client'` unless you need `useState/useEffect/onClick/browser API/React Query`
- `loading.tsx`, `error.tsx`, `not-found.tsx` for Suspense / errors / 404
- Marking server components as client kills SSR + RSC streaming

## TypeScript — strict

- ❌ `any` — use `unknown` + type narrow OR Zod `safeParse`
- ❌ `as Type` without comment (✅ allowed: post-`safeParse().success`)
- ❌ `@ts-ignore` / `@ts-expect-error`
- All props via `interface`, API responses parsed via Zod from `@paxio/types`
- `readonly` for immutable, `as const` for fixed arrays

## Real Data Invariant — CRITICAL

```tsx
// ✅ via @paxio/api-client + useQuery
'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';

export function LiveTicker() {
  const { data, isPending } = useQuery({
    queryKey: ['landing-ticker'],
    queryFn: () => paxioClient.landing.getTicker(),
    refetchInterval: 1100,
  });
  if (isPending) return <TickerSkeleton />;
  return <TickerLanes lanes={data} />;
}

// ❌ Math.random() in render for fake live numbers
// ❌ setInterval simulating live data
// ❌ hardcoded `AGENTS = 2_483_989`
// ❌ mock imports in production components
```

Empty real state (0 agents) beats fake 2.4M.

## R-FE-Preview — Simulated Preview with ribbon disclosure

**P1 exception** for pre-launch marketing surfaces (e.g. paxio.network landing). All four conditions required:

1. `<body data-production="false">` on root layout
2. `<PreviewRibbon>` from `@paxio/ui` rendered non-collapsed, non-dismissable, sticky top
3. All simulated data isolated in `app/data/preview.ts` with `// TODO M-LN: replace with real API` per export
4. Drift-guard test pins ribbon presence + `data-production="false"`

```tsx
// ✅ allowed under exception
'use client';
import { PREVIEW_TICKER_INITIAL } from '@/app/data/preview';
const [v, setV] = useState(PREVIEW_TICKER_INITIAL);
useEffect(() => {
  const i = setInterval(() => setV(o => ({ ...o, paei: +(o.paei + (Math.random()-0.45)*0.7).toFixed(2) })), 1100);
  return () => clearInterval(i);
}, []);
```

**Still forbidden under exception:**
- Simulated auth flows (login/signup that "succeeds" without backend)
- Money operations without explicit DEMO MODE disclosure
- Form submissions with simulated success
- `data-production="true"` body — production mode bans `Math.random` in render entirely

**Migration to real:** replace `preview.ts` exports with `useQuery`, drop TODO marker. When all TODOs cleared → flip `data-production="true"` + remove ribbon.

## Components — Radix via `@paxio/ui`, never custom

```tsx
// ✅
import { Dialog, DialogContent, DialogTrigger } from '@paxio/ui';

// ❌ custom Dialog from scratch (manual ARIA, focus trap)
```

Tailwind tokens from `@paxio/ui/tokens`, no hardcoded hex.

## Accessibility

- Radix primitives keep native ARIA — don't strip
- Visible focus ring via `focus-visible:ring-2`
- Color never the sole signal — pair with icon + text
- `prefers-reduced-motion` for all Framer animations
- Keyboard nav works on all interactive elements

## API + auth pattern

```tsx
import { paxioClient } from '@paxio/api-client';
const wallet = await paxioClient.wallet.getBalance(agentDid);
//    ^? WalletBalance — typed

import { useUser, useDid } from '@paxio/auth';
const { user } = useUser();
const did = useDid();  // 'did:paxio:0x...' from signed session
```

- ❌ `localStorage` direct — use `@paxio/auth` session helpers
- DID display via `@paxio/ui::DIDDisplay` (truncated + tooltip)
- Per-app Privy project — separate `NEXT_PUBLIC_PRIVY_APP_ID_<APP>` env

## Workspace package naming — avoid collision with `products/*`

`apps/frontend/<name>/package.json` MUST be `@paxio/<name>-app`, NOT `@paxio/<name>`.

Why: `@paxio/<name>` is reserved by `products/<n>-<name>/package.json` (backend SDK/types). Same workspace name in two locations breaks pnpm + Turborepo.

| Frontend | ✅ | ❌ collision |
|---|---|---|
| `landing` | `@paxio/landing-app` | `@paxio/landing` |
| `registry` | `@paxio/registry-app` | `@paxio/registry` ← `products/01-registry` |
| `wallet` | `@paxio/wallet-app` | `@paxio/wallet` ← `products/03-wallet` |

Turborepo filter: `pnpm turbo run build --filter=@paxio/landing-app...`

## Vercel — per-app Monorepo Project

Each `apps/frontend/<app>/` is its own Vercel project:
- Root Directory: `apps/frontend/<app>`
- Build: `cd ../../.. && pnpm turbo run build --filter=<app>...`
- Install: `cd ../../.. && pnpm install --frozen-lockfile`
- "Include source files outside Root Directory" — enabled (for `packages/*`)

Detail: `docs/deployment-vercel.md`.

## Scope discipline

- ❌ `apps/back/`, `products/`, `platform/` — backend territory
- ❌ `packages/{types,interfaces,errors,contracts,utils}/` — architect / backend
- ❌ tests — architect's specs
- API type change needed → `!!! SCOPE VIOLATION REQUEST !!!` (architect adds to `@paxio/types`)
