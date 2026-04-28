---
description: "[ARCHIVED M-Q13] Frontend rules — Next.js 15, TypeScript strict, Tailwind 4, Radix UI, Privy auth, 8 apps + 4 shared packages — moved to skill `paxio-frontend`. Kept for git history; no longer auto-loads."
globs: []
---

> **ARCHIVED in M-Q13** — content ported to skill `.claude/skills/paxio-frontend/SKILL.md`.
> Auto-load disabled (`globs: []`) to free dev context budget. File kept as historical
> reference; do NOT edit here, edit the skill instead.
>
> Why: claude-code auto-loaded ~22-31 KB of rule content per turn for dev agents,
> overflowing MiniMax-M2.7 context before first impl line. Moving content to skills
> (which are description-matched on-demand) keeps the same knowledge available without
> the per-turn budget tax.


# Frontend Rules — `apps/frontend/` + `packages/{ui,hooks,api-client,auth}/`

Frontend Paxio — это **8 Next.js 15 apps** в monorepo + **4 shared packages**. Каждый app деплоится в отдельный Vercel project.

## Стек

| Component | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components) |
| Language | TypeScript strict (`exactOptionalPropertyTypes: true`) |
| Styling | Tailwind CSS 4 + CSS Variables (per-app accent color) |
| UI Primitives | Radix UI (unstyled, fully accessible) |
| Animation | Framer Motion (page transitions, chart reveals) |
| Charts | Recharts + Tremor (dashboards), D3 (Network Graph) |
| Auth | Privy (wallet connect + email magic link) — per-app Privy project |
| Typography | Geist (display + sans) + JetBrains Mono (DID, addresses, code) |
| Build | Turborepo + pnpm workspace |
| Deploy | Vercel Monorepo Projects — one Vercel project per app |
| Data | **Real data only** через `@paxio/api-client` + React Query — НЕТ hardcoded mock |

## 8 apps × accent color

| App | Domain | Accent | Auth |
|---|---|---|---|
| `landing/` | paxio.network | `#0F3460` (primary) | None |
| `registry/` | registry.paxio.network | `#0F766E` (teal) | Privy partial |
| `pay/` | pay.paxio.network | `#533483` (accent) | Privy |
| `radar/` | radar.paxio.network | `#533483` | None |
| `intel/` | intel.paxio.network | `#533483` | Privy + subscription |
| `docs/` | docs.paxio.network | `#1A1A2E` (dark) | None |
| `wallet/` | wallet.paxio.network | `#1E3A5F` (navy) | Privy required |
| `fleet/` | fleet.paxio.network | `#1A1A2E` | SSO/SAML |

## 4 shared packages

| Package | Purpose |
|---|---|
| `@paxio/ui` (`packages/ui/`) | React components (22 planned: AgentCard, LiveTicker, NetworkGraph, HeatmapGrid, FAPDiagram, etc.) |
| `@paxio/hooks` (`packages/hooks/`) | React hooks (useAgent, useWallet, useGuard, useTicker, etc.) |
| `@paxio/api-client` (`packages/api-client/`) | Typed REST + WS client. Consumes Zod schemas from `@paxio/types` |
| `@paxio/auth` (`packages/auth/`) | Privy wrapper, DID helpers, SIWE sign-in, session persistence |

## App Router конвенции

```
apps/frontend/<app>/
├── app/
│   ├── (public)/         # Pages БЕЗ auth-gate
│   ├── (auth)/           # Auth-gated routes
│   ├── api/              # API rewrites → backend
│   ├── sections/         # Per-section components (для landing)
│   ├── layout.tsx        # Root layout с providers
│   ├── globals.css       # CSS vars + Tailwind base
│   └── page.tsx          # Root page (server component default)
├── components/           # App-specific UI (вне @paxio/ui)
├── lib/                  # App-specific utils
├── public/               # Static assets
├── tests/                # Vitest + Playwright smoke
├── package.json
└── next.config.mjs
```

### Правила App Router:

- `page.tsx` — **server component по умолчанию** (no `'use client'`)
- `'use client'` — **ТОЛЬКО** когда нужен `useState`, `useEffect`, `onClick`, browser APIs, or React Query
- НЕ помечай server components как client — это убивает SSR + RSC streaming
- `loading.tsx` для Suspense boundaries
- `error.tsx` для error boundaries
- `not-found.tsx` для 404

## TypeScript — strict

```typescript
// ПРАВИЛЬНО
interface Agent {
  id: string;
  did: string;
  reputation: number;
  source: 'erc8004' | 'a2a' | 'mcp' | 'fetch_ai' | 'virtuals' | 'native';
}

// НЕПРАВИЛЬНО
const agent: any = await fetchAgent(id);  // NO any!
```

- **`any` ЗАПРЕЩЕНО** — используй `unknown` + type narrowing OR Zod `safeParse`
- **`as` type assertion** — только с комментарием почему (исключение: после `safeParse()` success)
- **`@ts-ignore` / `@ts-expect-error` ЗАПРЕЩЕНО**
- Все props типизированы через `interface`
- API responses валидируются через Zod из `@paxio/types` ПЕРЕД использованием
- `readonly` для immutable data, `as const` для arrays

## Real Data Invariant — CRITICAL

```tsx
// ✅ CORRECT — real data via @paxio/api-client + useQuery
'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';

export function LiveTicker() {
  const { data, isPending } = useQuery({
    queryKey: ['landing-ticker'],
    queryFn: () => paxioClient.landing.getTicker(),
    refetchInterval: 1100,  // poll
  });
  if (isPending) return <TickerSkeleton />;
  return <TickerLanes lanes={data} />;
}

// ❌ FORBIDDEN — fake live data
const [value, setValue] = useState(1284.7);
useEffect(() => {
  setInterval(() => setValue(v => v + (Math.random() - 0.5)), 1100);
}, []);

// ❌ FORBIDDEN — hardcoded "looks like real" numbers
const AGENTS = 2_483_989;  // Backend endpoint должен вернуть реальное число (даже если 0)
```

**NEVER:**
- `Math.random()` в render для fake live numbers
- `setInterval` для simulating live data
- Hardcoded `agents: 2_483_989`-style values
- Mock data импорты в production components

**ALWAYS:**
- Fetch через `@paxio/api-client`
- Skeleton/empty state на `isPending`
- Backend endpoint решает «что текущее» — frontend dumb renderer
- Empty real state (0 agents) лучше fake 2.4M

## R-FE-Preview — Simulated Preview with Ribbon Disclosure (M-L10)

**Severity: P1** — exception к Real Data Invariant выше для pre-launch marketing surfaces.

### Контекст

До Q2 2026 launch'а (когда полный backend pipeline готов) у нас есть marketing-сайт
paxio.network который должен **визуально работать как Bloomberg of Agents** прямо сейчас:
PAEI ticker, agents table с 16+ строками, sparklines, market movers — то есть демонстрировать
будущий продукт. Empty-state (0 agents, $0 volume) для пресс-релизов и инвесторов = провал
маркетинговый. Но **скрытая симуляция** = обман.

Решение: разрешить simulated preview с **обязательной visual disclosure** через
sticky ribbon. Принцип честности — пользователь видит «SIMULATED PREVIEW · LAUNCHING Q2 2026
· METRICS ARE PROJECTED» с первой секунды загрузки.

### Когда exception применима

ТОЛЬКО если ВСЕ четыре условия выполнены:

1. **`<body data-production="false">`** — атрибут на `<body>` явно говорит «не production»
2. **`<PreviewRibbon>` visible** — компонент `@paxio/ui::PreviewRibbon` рендерится non-collapsed,
   non-dismissable, sticky сверху страницы
3. **Все simulated данные изолированы** в `app/data/preview.ts` (или
   `apps/frontend/<app>/app/data/preview.ts`) с `// TODO M-LN: replace with real API`
   маркером per export
4. **Drift-guard test** в `tests/` пинит обе вещи: ribbon presence + `data-production="false"`

### Что РАЗРЕШЕНО под exception

```tsx
// ✅ ПОД EXCEPTION — useTicker с Math.random() + начальные numbers из preview.ts
'use client';
import { useState, useEffect } from 'react';
import { PREVIEW_TICKER_INITIAL } from '@/app/data/preview';

export function PaeiTicker() {
  const [v, setV] = useState(PREVIEW_TICKER_INITIAL);
  useEffect(() => {
    const i = setInterval(() => {
      setV(o => ({ ...o, paei: +(o.paei + (Math.random()-0.45)*0.7).toFixed(2) }));
    }, 1100);
    return () => clearInterval(i);
  }, []);
  return <Ticker value={v} />;
}

// ✅ ПОД EXCEPTION — agents array из preview.ts
import { PREVIEW_AGENTS } from '@/app/data/preview';
return <AgentTable rows={PREVIEW_AGENTS} />;
```

### Что ВСЁ ЕЩЁ ЗАПРЕЩЕНО даже под exception

- **Auth flows simulated** — login/signup кнопки которые «успешно» завершают без backend.
  Этот класс UX обманывает на действие, не только на данные.
- **Money operations simulated** без явного «DEMO MODE» disclosure на конкретный flow.
  Кнопка «Send 0.01 BTC» не должна работать как success без предупреждения.
- **Form submissions simulated** — посылка форм с simulated success.
- **`data-production="true"` body** — флаг production-режима исключает exception полностью,
  любой `Math.random()` в render = violation.

### Migration path к real data

Когда backend для конкретной секции готов (M-L11+):
1. В `app/data/preview.ts` заменить export const на `useQuery` hook re-exported из
   `@paxio/api-client`
2. Удалить `// TODO` маркер для этого export
3. Когда ВСЕ TODO маркеры в `preview.ts` ушли → flip `<body data-production="true">`
   + удалить `<PreviewRibbon>` (или downgrade до «BETA» disclosure)
4. Drift-guard test обновляется: ребрендится в production-mode invariant

### Drift-guard pattern

```typescript
// tests/landing-preview-disclosure.test.ts (architect-only)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('R-FE-Preview — landing simulated-preview disclosure', () => {
  it('apps/frontend/landing/app/layout.tsx has data-production="false" on body', () => {
    const layout = readFileSync(
      resolve(__dirname, '..', 'apps', 'frontend', 'landing', 'app', 'layout.tsx'),
      'utf8',
    );
    expect(layout).toMatch(/data-production="false"/);
  });

  it('app/page.tsx renders <PreviewRibbon>', () => {
    const page = readFileSync(
      resolve(__dirname, '..', 'apps', 'frontend', 'landing', 'app', 'page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/PreviewRibbon/);
  });

  it('preview.ts has TODO markers per export', () => {
    const data = readFileSync(
      resolve(__dirname, '..', 'apps', 'frontend', 'landing', 'app', 'data', 'preview.ts'),
      'utf8',
    );
    const todoCount = (data.match(/TODO M-L\d+/g) ?? []).length;
    expect(todoCount).toBeGreaterThan(0);
  });
});
```

## Radix UI + Tailwind 4 — компоненты

- Базовые primitives в `@paxio/ui` через Radix (Dialog, Popover, Tooltip, Tabs, Accordion, Select, ...)
- НЕ создавай свои Button/Dialog/Table — используй Radix через `@paxio/ui`
- App-specific compositions в `apps/frontend/<app>/components/`
- Tailwind tokens из `@paxio/ui/tokens` — никаких hardcoded цветов
- Per-app accent через CSS vars в `app/globals.css`

```tsx
// ✅ CORRECT — Radix через @paxio/ui
import { Dialog, DialogContent, DialogTrigger } from '@paxio/ui';

// ❌ FORBIDDEN — custom Dialog from scratch
function MyDialog() { /* manual ARIA, focus trap, etc */ }
```

## Accessibility

- Все Radix primitives keep their native ARIA
- Каждый interactive element имеет visible focus ring (Tailwind `focus-visible:ring-2`)
- Color **никогда** не conveys meaning alone — pair с icon + text
- `prefers-reduced-motion` honored в всех Framer animations
- Keyboard navigation работает на всех интерактивных элементах

## API Calls — через `@paxio/api-client`

```typescript
// ✅ Typed client
import { paxioClient } from '@paxio/api-client';

const wallet = await paxioClient.wallet.getBalance(agentDid);
//    ^? WalletBalance — типизированный response
```

Frontend dev rewrites `/api/*` → `http://localhost:3001/api/*` (dev) и `/api/*` → `https://api.paxio.network/api/*` (prod через `NEXT_PUBLIC_API_URL`).

## Privy Auth (`@paxio/auth`)

```tsx
// app/layout.tsx — provider setup
import { PaxioPrivyProvider } from '@paxio/auth';

export default function Layout({ children }) {
  return (
    <PaxioPrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID_WALLET!}>
      {children}
    </PaxioPrivyProvider>
  );
}

// Component — use auth hooks
import { useUser, useDid } from '@paxio/auth';
const { user } = useUser();
const did = useDid();  // 'did:paxio:0x...'
```

- **NO `localStorage` direct** — use `@paxio/auth` session helpers
- DID display через `@paxio/ui::DIDDisplay` (truncated с tooltip полного DID)
- Per-app Privy project (отдельный `NEXT_PUBLIC_PRIVY_APP_ID_<APP>` env var)

## Workspace package naming — NO collisions with `products/*`

Каждый `apps/frontend/<name>/package.json` **ОБЯЗАН** иметь имя `@paxio/<name>-app`, не `@paxio/<name>`.

**Почему:** `@paxio/<name>` зарезервировано за продуктами в `products/*/package.json` (backend API/SDK/types). Одно workspace name не может существовать в двух местах — Turborepo + pnpm workspace падают при конфликте.

| apps/frontend/<name>/ | ✅ Правильно | ❌ НЕ ТАК (конфликт с products/) |
|---|---|---|
| `landing/` | `@paxio/landing-app` | `@paxio/landing` |
| `registry/` | `@paxio/registry-app` | `@paxio/registry` (← products/01-registry) |
| `pay/` | `@paxio/pay-app` | `@paxio/pay` |
| `radar/` | `@paxio/radar-app` | `@paxio/radar` |
| `intel/` | `@paxio/intel-app` | `@paxio/intel` |
| `docs/` | `@paxio/docs-app` | `@paxio/docs` |
| `wallet/` | `@paxio/wallet-app` | `@paxio/wallet` (← products/03-wallet) |
| `fleet/` | `@paxio/fleet-app` | `@paxio/fleet` |

Тот же принцип для `apps/back/` → `@paxio/back-app` (но сейчас `@paxio/back` — legacy, не конфликтует, можно оставить либо переименовать в отдельном M0X).

Turborepo фильтры соответственно: `pnpm turbo run build --filter=@paxio/landing-app...`

## Per-app Vercel project

Каждый `apps/frontend/<app>/` — отдельный Vercel project (Monorepo Projects pattern):
- Root Directory: `apps/frontend/<app>`
- Build: `cd ../../.. && pnpm turbo run build --filter=<app>...`
- Install: `cd ../../.. && pnpm install --frozen-lockfile`
- Include source files outside Root Directory: ✅ **enabled** (для packages/*)

Detail flow — в `docs/deployment-vercel.md`.

## CI/CD

- Push в `main` → `.github/workflows/ci-frontend-<app>.yml` (path-filtered) → Vercel git-webhook autodeploy
- Pre-commit: `pnpm --filter <app> typecheck && pnpm --filter <app> test && pnpm --filter <app> build`

## No Scope Creep

- НЕ трогай `apps/back/`, `products/`, `platform/` — backend territory
- НЕ модифицируй `packages/{types,interfaces,errors,contracts,utils}/` — architect/backend
- НЕ модифицируй тесты — спецификации от architect
- Если нужна смена API типа → `!!! SCOPE VIOLATION REQUEST !!!` (architect добавит в `@paxio/types`)
