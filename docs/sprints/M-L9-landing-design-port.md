# M-L9 — Landing Design Port (`paxio.network` → Paxio B5 visual)

> Frontend-dev milestone. Port the Claude artifact `tmp/Paxio-Financial OS for the agentic economy.html` (Paxio B5 design, 653 KB single-file HTML, 7 sections) into `apps/frontend/landing/` while preserving the M-L0 Real-Data Invariant.
>
> Background: M-L0 built a minimal Next.js skeleton with real-data wiring (`useQuery` → `api.paxio.network`). M-L9 brings it to design parity. The artifact lives at `tmp/Paxio-Financial OS for the agentic economy.html` and is the source of truth for visual + copy.

## Готово когда:

- `https://paxio.network` визуально совпадает с Paxio B5 на ≥95% (visual diff)
- Real-data invariant сохранён: все числа из `api.paxio.network` (ноль = реальный empty state)
- "SIMULATED PREVIEW · LAUNCHING Q2 2026 · METRICS ARE PROJECTED" preview-ribbon видим (явный disclaimer пока backend возвращает нули)
- Все 7 секций (Registry hero, Quickstart, Bitcoin-native, Radar, Pay, Network, Doors+footer) заполнены реальной копией из артефакта
- Mobile responsive: target 360px+ (artefact desktop-only — нужна mobile adaptation)
- Lighthouse Performance ≥85, Accessibility ≥95
- `bash scripts/verify_landing_design_port.sh` PASS=N
- `pnpm --filter @paxio/landing-app test` GREEN

## Метод верификации (Тип 1 + Тип 2)

### Тип 1: Component-presence tests (RED → GREEN)
- `apps/frontend/landing/tests/sections.test.tsx` — каждая из 7 секций render'ится без ошибок, содержит обязательные текстовые маркеры (eyebrow, title, кнопки)
- `apps/frontend/landing/tests/preview-ribbon.test.tsx` — preview-ribbon виден на странице
- `apps/frontend/landing/tests/data-wiring.test.tsx` — все секции с numbers используют `useQuery` (нет inline `Math.random` / hardcoded чисел)

### Тип 2: Acceptance script с Playwright
- `scripts/verify_landing_design_port.sh` — `pnpm --filter @paxio/landing-app build` + start prod server + Playwright screenshot vs target HTML rendered in headless Chromium → SSIM/pixelmatch diff
- Visual diff threshold: ≤5% pixel difference (mobile) / ≤3% (desktop)

## Зависимости

- M-L0 GREEN (real-data wiring) — done
- M-L1 partial (Postgres storage backing /api/landing/*) — done
- TD-26 + TD-27 closed — done; `/api/landing/hero` 200, `/api/fap/rails` 200 на проде
- 8× Vercel projects подключены, env `NEXT_PUBLIC_API_URL=https://api.paxio.network` (твоя рука, в процессе)

## Архитектура

### Реэкспорт design tokens из HTML → `packages/ui/src/tokens.ts`

Извлечь из inline CSS артефакта:
```ts
// packages/ui/src/tokens.ts (extend existing)
export const tokens = {
  colors: {
    bg0: '#0E0B07',         // var(--bg-0) — page background (warm dark)
    bg1: '#171107',         // var(--bg-1) — section background
    ink0: '#F4ECDA',        // var(--ink-0) — primary text
    ink1: 'rgba(244, 236, 218, 0.62)',  // secondary text
    gold: '#D4A658',        // var(--gold) — Bitcoin / accent
    up: '#7DBE74',          // var(--up) — positive delta
    down: '#E07A6E',        // var(--down) — negative delta
    rule: 'rgba(244, 236, 218, 0.18)', // dashed dividers
  },
  fonts: {
    serif: 'var(--f-serif, "Geist", system-ui)',  // hero copy
    sans:  'var(--f-sans,  "Geist", system-ui)',  // body
    mono:  'var(--f-mono,  "JetBrains Mono", monospace)', // numbers
  },
  // ... etc
};
```

Существующие `@paxio/ui` компоненты (LiveTicker, HeatmapGrid, NetworkGraph) уже используют tokens — нужно их подкорректировать на новую палитру.

### Декомпозиция HTML на 7 React-компонентов

| # | Раздел артефакта | Текущий tsx | Действие frontend-dev |
|---|---|---|---|
| 1 | `#paxio-header` | `app/sections/00-header.tsx` (NEW) | Sticky header, brand mark, nav links, mobile drawer |
| 2 | `#preview-ribbon` (top of `<body>`) | `app/sections/preview-ribbon.tsx` (NEW) | Marquee strip "SIMULATED PREVIEW · ..." |
| 3 | `#registry` (Registry Hero) | `app/sections/01-hero.tsx` | Reuse existing skeleton, replace styles + copy + StateStrip + Ticker lanes |
| 4 | `#quickstart` | `app/sections/02-quickstart.tsx` | Code block + install steps, dark variant |
| 5 | `#bitcoin-native` | `app/sections/02b-bitcoin.tsx` | TerminalWidget already used — restyle to match gold accent |
| 6 | `#radar` | `app/sections/03-radar.tsx` | HeatmapGrid + heatmap legend; Threat indices ticker |
| 7 | `#pay` | `app/sections/04-pay.tsx` | FAPDiagram + RailsSkeleton + concentration-risk callout |
| 8 | `#network` | `app/sections/05-network.tsx` | NetworkGraph + drift7 metric callout |
| 9 | `#root > .doors` + `#page-foot` | `app/sections/06-doors.tsx` + `app/sections/07-foot.tsx` (split) | 4-door CTA grid + footer credits |

### Real-Data Invariant — реальные числа в красивой обёртке

Backend `/api/landing/hero` возвращает HeroState с реальными значениями (сейчас все нули). Frontend рендерит их в design-tokens без `Math.random` / hardcode:

```tsx
// ✅ ПРАВИЛЬНО — real data wrapped in design copy
const { data, isPending } = useQuery({
  queryKey: ['landing-hero'],
  queryFn: () => paxioClient.landing.getHero(),
});

return (
  <p className="state-text">
    <b>{data?.agents.toLocaleString() ?? '—'}</b> agents indexed across 6 registries · <b>{(data?.wallet_adoption * 100).toFixed(1)}%</b> with wallets ...
  </p>
);

// ❌ ЗАПРЕЩЕНО — hardcoded дизайн-числа
<b>2,483,989</b> agents indexed
```

Когда backend возвращает 0 → UI показывает 0 (или em-dash), preview-ribbon снизу объясняет «metrics are projected · launching Q2 2026». Это **честный** rendering, не fake.

### Mobile responsive (новая работа vs артефакт)

Артефакт desktop-only (≥1280px). Frontend-dev адаптирует:
- 360-768px (mobile): 1-column stack, ticker → horizontal scroll
- 768-1280px (tablet): 2-column где есть smyslу
- 1280px+ (desktop): pixel-match артефакта

### Animations + reduced-motion

Из артефакта переносим:
- Ticker scroll (continuous left-to-right)
- HeatmapGrid hover transitions
- NetworkGraph node animations

Все обёрнуты в `@media (prefers-reduced-motion: reduce) { animation: none }` — accessibility invariant.

## Tasks

| # | Кто | Что | Где | Verification | Architecture Requirements |
|---|---|---|---|---|---|
| T-1 | architect | Milestone doc + RED tests + acceptance script | `docs/sprints/M-L9-*.md`, `apps/frontend/landing/tests/sections.test.tsx`, `scripts/verify_landing_design_port.sh` | this PR | этот файл + tests RED initially |
| T-2 | frontend-dev | Tokens extraction → `packages/ui/src/tokens.ts` | `packages/ui/src/tokens.ts` (extend), `packages/ui/src/index.ts` (re-export) | tokens.test.ts GREEN | typed object, no `any`, frozen, Tailwind config consumes it |
| T-3 | frontend-dev | New shared components → `packages/ui` | `packages/ui/src/{StateStrip,TickerLane,PreviewRibbon,BrandMark,DoorCard}.tsx` | each has unit test, Storybook entry optional | Radix unstyled where applicable, accessibility (focus rings, ARIA), tokens-only colors |
| T-4 | frontend-dev | Header section (NEW) | `apps/frontend/landing/app/sections/00-header.tsx` + `app/layout.tsx` integration | sections.test.tsx::header GREEN | sticky positioning, mobile drawer via Radix Sheet, all nav links → respective subdomains |
| T-5 | frontend-dev | Preview ribbon (NEW) | `apps/frontend/landing/app/sections/preview-ribbon.tsx` | preview-ribbon.test.tsx GREEN | aria-hidden, marquee animation respects reduced-motion |
| T-6 | frontend-dev | Hero section port | `apps/frontend/landing/app/sections/01-hero.tsx` | sections.test.tsx::hero GREEN, useQuery wired | StateStrip + 4 ticker lanes, real numbers from /api/landing/hero |
| T-7 | frontend-dev | Quickstart port | `apps/frontend/landing/app/sections/02-quickstart.tsx` | sections.test.tsx::quickstart GREEN | code block syntax-highlighted via Shiki (lazy-imported), copy-to-clipboard button accessible |
| T-8 | frontend-dev | Bitcoin-native section | `apps/frontend/landing/app/sections/02b-bitcoin.tsx` | sections.test.tsx::bitcoin GREEN | TerminalWidget reuse with gold-accent variant |
| T-9 | frontend-dev | Radar section | `apps/frontend/landing/app/sections/03-radar.tsx` | sections.test.tsx::radar GREEN | HeatmapGrid + threats-ticker, real data from /api/landing/heatmap |
| T-10 | frontend-dev | Pay section | `apps/frontend/landing/app/sections/04-pay.tsx` | sections.test.tsx::pay GREEN | FAPDiagram + RailsSkeleton, real data from /api/fap/rails |
| T-11 | frontend-dev | Network section | `apps/frontend/landing/app/sections/05-network.tsx` | sections.test.tsx::network GREEN | NetworkGraph + drift7 metric, real data from /api/landing/network-snapshot |
| T-12 | frontend-dev | Doors + Footer split | `apps/frontend/landing/app/sections/06-doors.tsx` + `07-foot.tsx` | sections.test.tsx::doors + footer GREEN | 4 DoorCard, links to wallet/intel/registry/contact; footer with legal links |
| T-13 | frontend-dev | Mobile responsive pass | all sections | manual breakpoint test at 360 / 768 / 1280px | no horizontal overflow, ticker scrolls, all CTAs reachable |
| T-14 | frontend-dev | Acceptance script + Playwright | runs T-1's `verify_landing_design_port.sh` to PASS | visual diff ≤5% mobile, ≤3% desktop |

## Предусловия среды (architect обеспечивает ДО запуска frontend-dev)

- [x] `pnpm install` clean
- [x] `pnpm --filter @paxio/landing-app dev` boots
- [x] backend `/api/landing/*` endpoints serve 200 (verified post-M-L8.3)
- [x] HTML artefact at `tmp/Paxio-Financial OS for the agentic economy.html` accessible
- [ ] Playwright + pixelmatch installed in `apps/frontend/landing/` (`pnpm add -D @playwright/test pixelmatch pngjs`)
- [ ] Geist + JetBrains Mono fonts via `next/font/google`

## Не делаем в M-L9 (out of scope)

- Frontend для остальных 7 apps (registry/pay/radar/intel/docs/wallet/fleet) — отдельные milestones M-L10..M-L16
- Real-time WebSocket subscriptions для ticker (используется polling 1100ms через useQuery refetchInterval)
- Storybook setup (полезно но deferred)
- E2E user-journey tests (Playwright fixtures, not scope here)
- Конкретные numbers как в артефакте (2.4M agents) — только когда backend реально это вернёт

## Tech debt expected from this milestone

- **TD candidate**: артефакт-HTML 653 KB inline — после порта артефакт остаётся в `tmp/` как референс. Decision: либо удалить, либо коммитить в `docs/design/`. Frontend-dev fills.
- **TD candidate**: tokens разбросаны по нескольким файлам если frontend-dev не аккуратно. Track if 2 разных tokens.ts появятся.
- **TD candidate**: visual diff threshold (5% mobile, 3% desktop) может быть слишком loose или слишком strict — calibrate after first pass.
