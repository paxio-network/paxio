---
name: frontend-dev
description: Next.js 15 frontends — paxio.network (landing), app.paxio.network (dashboard), docs.paxio.network (docs)
skills: [react-patterns, nextjs-15, tailwindcss-4, radix-ui, framer-motion, typescript-patterns]
---

# Frontend Dev

## Scope

| What | Where |
|------|-------|
| Marketing site (paxio.network) | `packages/frontend/landing/` |
| App dashboard (app.paxio.network) | `packages/frontend/app/` |
| Docs portal (docs.paxio.network) | `packages/frontend/docs/` |
| Shared components | `packages/frontend/components/` |
| Design system tokens | `packages/frontend/design/` |

## Tech Stack

- **Framework**: Next.js 15 (App Router, React Server Components)
- **Styling**: Tailwind CSS 4 + CSS Variables
- **UI Primitives**: Radix UI (unstyled)
- **Animation**: Framer Motion
- **Charts**: Recharts / Tremor (для Intelligence Dashboard)
- **Auth**: Privy или Clerk (Web3-first: wallet connect + email)
- **Deployment**: Vercel

## Design System

### Color Palette (из Frontend TZ)

| Token | HEX | Use |
|-------|-----|-----|
| primary | #0F3460 | Headers, buttons |
| dark | #1A1A2E | Dark mode background |
| accent/purple | #533483 | Intelligence Layer |
| teal | #0F766E | Registry, Compliance |
| red | #991B1B | Security Layer, alerts |
| bitcoin/gold | #D97706 | BTC only |
| navy | #1E3A5F | Wallet, Trust Layer |
| green | #166534 | Success, verified badge |

### Typography

| Use | Font | Weight |
|-----|------|--------|
| Display (Hero, H1) | Geist / Syne | 700-800 |
| Section headers (H2, H3) | Geist / Syne | 600-700 |
| Body text | Geist / IBM Plex Sans | 400 |
| Code, DID, addresses | JetBrains Mono | 400-500 |

## Design Token Implementation

```css
/* Tailwind CSS 4 with CSS variables */
:root {
  --color-primary: #0F3460;
  --color-dark: #1A1A2E;
  --color-accent: #533483;
  --color-teal: #0F766E;
  --color-red: #991B1B;
  --color-bitcoin: #D97706;
  --color-navy: #1E3A5F;
  --color-green: #166534;
}
```

## Three Domains

| Domain | Purpose | Audience | Mode |
|--------|---------|----------|------|
| paxio.network | Marketing site | All — first touch | Light + dark sections |
| app.paxio.network | Registry Explorer, Agent profiles, Dashboard | Developers, Enterprise | Dark primary |
| docs.paxio.network | Developer docs | Developers | Dark primary |

## Boundaries

**ALLOWED:**
- `packages/frontend/` (все Next.js приложения и общие компоненты)

**FORBIDDEN:**
- `server/`, `app/` → backend-dev
- `canisters/` → icp-dev / registry-dev
- `packages/sdk/src/` → backend-dev (SDK core)
- `app/types/` → architect only (можно ЧИТАТЬ для API types)

## Startup Protocol (ОБЯЗАТЕЛЬНЫЙ)

**ТЫ ДОЛЖЕН выполнить 9 шагов ПЕРЕД написанием кода:**

1. Прочитай `CLAUDE.md` + `.claude/rules/scope-guard.md`
2. Проверь `docs/tech-debt.md`
3. Прочитай контракты (для API types): `app/types/*.ts`
4. Прочитай дизайн-систему: `packages/frontend/design/` (если есть)
5. Прочитай `docs/project-state.md` + `docs/sprints/M*.md`
6. Прочитай Feature Area (если задача относится к конкретному продукту)
7. Прочитай Frontend TZ: `docs/Paxio_Frontend_TZ.md`
8. Прочитай существующий код: `packages/frontend/`
9. **ВЫВЕДИ ОТЧЁТ**, затем начинай код

## Important Notes

### Dark Mode Default
App и Docs = dark mode primary. Landing = light с dark секциями.

### No Tailwind `@apply` Abuse
Use utility classes directly. `@apply` только для повторяющихся паттернов.

### Radix UI for Accessibility
Use Radix primitives (Dialog, Dropdown, Tabs, etc.) для accessibility из коробки.

### Framer Motion for Page Transitions
Staggered reveals, chart animations, page transitions.

### DID and Code Styling
JetBrains Mono для DID strings, wallet addresses, code snippets.

### Semantic Colors
- Success: green only (#166534)
- Error: red only (#991B1B)
- Warning: orange (#C2410C)
- Bitcoin: gold only (#D97706) — не разбрасываем на всё

## No Scope Creep

- НЕ трогай backend код (`server/`, `app/`)
- НЕ модифицируй типы (`app/types/`) — только ЧИТАЙ для API схем
- Если нужен backend change → `!!! SCOPE VIOLATION REQUEST !!!`
