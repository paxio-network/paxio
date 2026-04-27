# M-L10 — Paxio B5 Landing Port

**Тип**: Frontend major redesign (зона frontend-dev для Phases 2-5; architect для Phase 1).
**Статус**: 🟢 ACTIVE — Phase 1 (foundation) в работе
**Branch (Phase 1)**: `feature/M-L10-b5-landing-foundation`
**Worktree**: `/tmp/paxio-ml10` (architect)
**FA**: FA-10 Frontend Architecture
**Зависимости**: M-Q3 (worktree convention), M-L9 (existing landing — будет deprecated)

---

## Цель

Заменить текущую M-L9 landing (paxio.network плейсхолдер с 9 секциями) на дизайн **Paxio B5**
из Claude Design handoff bundle (`api.anthropic.com/v1/design/h/8VPHiIOvC-dtoA-BN4Od7Q`).

B5 = Bloomberg-mode Directory hero + landing scrolls. Финальный визуал, на котором user
остановился после итеративной работы с Claude Design. Включает PAEI live ticker, agents
table с 16 строк, market movers, sparklines, dark/light theme toggle, sticky preview ribbon
с честным disclosure.

## Принципиальное отступление от Real Data Invariant

B5 дизайн использует:
- `useTicker` с `Math.random()` — индексы тикают каждые ~1.1 сек
- Хардкод `AGENTS` array (16 агентов с фиктивными числами)
- Seeded sparklines из `seed * 9301 + 49297`

Это **симулированный preview** для marketing pre-Q2-2026. Текущее правило `frontend-rules.md`
(M-L9-эра, real-data-only) это запрещает.

**M-L10 Phase 1 T-1** добавляет в `frontend-rules.md` exception **R-FE-Preview** с 4
обязательными условиями:
1. `<body data-production="false">` атрибут
2. `<PreviewRibbon>` visible (sticky, non-dismissable)
3. Все simulated данные изолированы в `app/data/preview.ts` с `// TODO M-LN: replace with real API`
4. Drift-guard test пинит обе вещи

Когда backend для секции готов — exports в `preview.ts` мигрируют на real `useQuery`.
Все TODO ушли → flip `data-production="true"` + удалить ribbon.

## Готово когда (Phase 1 — этот PR)

1. Design package vendor'ен в `docs/design/paxio-b5/` (read-only reference) с
   собственным README (правила использования) + `SOURCE_README.md` (оригинал handoff'а).
2. `_design/` исключён из ESLint (`.eslintignore`) и не пикапится TypeScript (вне `app/`).
3. `.claude/rules/frontend-rules.md` имеет секцию `## R-FE-Preview` с:
   - Severity P1
   - 4 mandatory conditions
   - Forbidden list (auth/money/forms)
   - Migration path
   - Drift-guard pattern example
4. `tests/landing-b5-foundation-drift.test.ts` — 13 architect-zone drift-guards (vendoring +
   rule presence) + 5 `it.todo` маркеров для Phase 2-5.
5. `scripts/verify_M-L10.sh` — idempotent acceptance: vendoring + rule + tests GREEN.
6. `docs/sprints/M-L10-paxio-b5-landing.md` — этот файл.

## Декомпозиция (15 задач — 6 phases)

### Phase 1 — Foundation (architect-only, этот PR)

| # | Task | Verification | Files |
|---|------|--------------|-------|
| T-0 | Vendor B5 design package | drift-guard 7 tests | `docs/design/paxio-b5/{README,SOURCE_README,Paxio-B5.html}` + `_design/{styles,components}/*` |
| T-1 | R-FE-Preview rule | drift-guard 6 tests | `.claude/rules/frontend-rules.md` |
| T-2 | RED smoke + drift tests | 13 GREEN + 5 TODO | `tests/landing-b5-foundation-drift.test.ts` |
| T-3 | Acceptance script | `bash scripts/verify_M-L10.sh` PASS | `scripts/verify_M-L10.sh` |
| T-4 | Commit + Phase 0 + merge | reviewer SPEC APPROVED + autonomous merge | (architect process) |

### Phase 2 — CSS tokens + theme (frontend-dev, follow-up PR)

| # | Task | Architect verification spec |
|---|------|---|
| T-5 | Port `_design/styles/paxio.css` → `app/globals.css` (paper/ink/gold tokens) | RED test: `globals.css` has `--paper-0`, `--ink-0`, `--gold` CSS vars |
| T-6 | Port theme system (light/dark) + `data-theme` attr toggle | RED test: layout.tsx has theme provider + persist localStorage |
| T-7 | Port Spectral + IBM Plex Mono + Source Sans via Next.js `next/font/google` | RED test: layout.tsx imports next/font |

### Phase 3 — Shell components (frontend-dev)

| # | Task | Architect spec |
|---|------|---|
| T-8 | `<Header>` (svg mark, nav, theme toggle, mobile drawer) → `@paxio/ui::Header` | RED: 22-component check + Radix Drawer + a11y |
| T-9 | Refactor `<Footer>` к B5 design → `@paxio/ui::Footer` обновляется | RED: foot-cols layout + foot-legal + paxio_mark svg |
| T-10 | `<PreviewRibbon>` → `@paxio/ui::PreviewRibbon` (sticky, non-dismissable, marquee) | RED: ribbon visible + role=alert + non-dismissable |

### Phase 4 — Hero (frontend-dev, biggest)

| # | Task | Architect spec |
|---|------|---|
| T-11 | `app/data/preview.ts` — frozen exports `PREVIEW_AGENTS`, `PREVIEW_TICKER_INITIAL`, `PREVIEW_MOVERS` с TODO маркерами | RED: 16 agents, 8+ ticker fields, TODO count ≥ 16 |
| T-12 | `app/sections/01-hero-b5.tsx` — `HeroVariantB5` port (PAEI ticker + filter bar + agents table + market movers) | RED: 14+ subcomponents, jsdom render check, real data invariant respected (preview.ts only) |

### Phase 5 — Scrolls + page wiring (frontend-dev)

| # | Task | Architect spec |
|---|------|---|
| T-13 | `app/sections/02-scrolls-b5.tsx` — `PaxioLandingScrollsB5` port (~1035 lines source) | RED: presence of bitcoin/wallet-attached/radar/pricing scroll sections |
| T-14 | `app/page.tsx` wires `<Hero> <Scrolls> <Footer>` + `app/layout.tsx` устанавливает `data-production="false"` + `<PreviewRibbon>` | RED: full page snapshot, drift guard for production attr + ribbon |

### Phase 6 — E2E acceptance (architect spec, frontend-dev impl GREEN)

| # | Task | Verification |
|---|------|---|
| T-15 | `pnpm --filter @paxio/landing-app build` clean + visual-fidelity acceptance (`scripts/verify_M-L10-port.sh`) | Next build PASS, all sections rendered, ribbon visible, both themes work |

## Метод верификации

**Phase 1 (этот PR):**
- Тип 1 (логика) — `pnpm exec vitest run tests/landing-b5-foundation-drift.test.ts` 13 GREEN
- Тип 2 (acceptance) — `bash scripts/verify_M-L10.sh` PASS=N FAIL=0

**Phase 2-5 (frontend-dev follow-up PRs):**
- Каждая Phase = свой milestone-под (M-L10.2, M-L10.3, …) с собственным RED specs от architect'а
- Когда Phase 5 закрыта → frontend-dev запускает `pnpm --filter @paxio/landing-app build`
  + `pnpm --filter @paxio/landing-app test` GREEN, architect верифицирует через
  `verify_M-L10-port.sh` (Phase 6 acceptance)

## Архитектурные требования (Phase 1)

- Все 7 файлов diff'а — architect zone (`.claude/rules/`, `tests/`, `scripts/`,
  `docs/sprints/`, `docs/design/paxio-b5/` — `_design/` это **доковый reference**,
  не код, и не имеет TS/JS, не нарушает frontend-dev ownership; явно whitelisted в
  `scope-guard.md` будущим update'ом если нужно).
- НЕТ изменений в `apps/frontend/landing/app/` (это будет Phase 2-5 frontend-dev'ом).
- НЕТ изменений в `packages/{ui,hooks,api-client,auth}/`.
- НЕТ зависимостей: ни `package.json`, ни `pnpm-lock.yaml`.

## Phase 1 → Phase 2 hand-off

После merge Phase 1 в `dev`:
1. Architect открывает следующий milestone `M-L10.2-b5-css-tokens` с RED tests
2. Передаёт user'у промт для `frontend-dev`:
   ```
   Запусти frontend-dev на milestone M-L10.2.
   Branch: feature/M-L10.2-b5-css-tokens
   Worktree (tip — но not enforced): /tmp/paxio-ml10.2-frontend
   Reference: docs/design/paxio-b5/styles/paxio.css → port to globals.css
   ```

## Анти-цели (Phase 1)

- НЕ копировать React 18 UMD CDN scripts из B5 в Next.js bundle (B5 prototype style ≠ Next.js)
- НЕ копировать Babel-in-browser
- НЕ копировать hardcoded `AGENTS` array verbatim в production code (пойдёт в `preview.ts`
  как frozen export — это Phase 4 frontend-dev'ом)
- НЕ удалять M-L9 секции в Phase 1 (это Phase 5 — clean swap)
- НЕ начинать port в Phase 1. Только foundation.

## Predusловия среды

- pnpm install clean
- pnpm typecheck clean
- vitest baseline GREEN
- existing M-L9 landing работает на `dev` (placeholder, который user видит сейчас)

## Рисков и митигации

| Риск | Митигация |
|------|-----------|
| `_design/` 8MB design package раздуёт repo | Vendoring только critical files (~120KB суммарно: 5 CSS + 2 JSX + HTML + README + SVG); полный handoff bundle (chats/) НЕ vendor'ится |
| TypeScript ругается на JSX в `_design/components/*.jsx` | tsconfig.json `include` ограничен `app/`, `components/`, `lib/`, `tests/` — `_design/` вне scope |
| ESLint warnings из `_design/` ломают CI | `.eslintignore` исключает `_design/` |
| Phase 2-5 frontend-dev неправильно portирует визуал | Каждая Phase = свой milestone с RED specs от architect'а, frontend-dev test-first работает |
| User хочет работающий лендинг СЕЙЧАС, а Path A через 5 phases | Phase 1 — 1 час архитектора. Phase 2-3 — 2-4 часа frontend-dev'а (CSS + shell). Phase 4 — основной (4-6 часов hero). После Phase 4 деплоится промежуточная version с Hero готовым + остальное в M-L9 fallback |

## Acceptance criteria (для reviewer Phase 0)

- [ ] Все 6 «Готово когда» имеют конкретный test или acceptance check
- [ ] T-2 drift-guard test 13 GREEN + 5 TODO markers (не failing skip)
- [ ] T-3 acceptance script idempotent (2× прогон без manual cleanup)
- [ ] All Phase 1 файлы в architect zone (нет touches в `apps/frontend/landing/app/`)
- [ ] Vendored `_design/` объём разумный (≤200KB)

## Связанные TD

- TD-30 (architect-as-frontend-dev hook) — Phase 1 строго architect-only, не recurr
- M-L9 deprecation — будет в Phase 5 (clean swap старых sections)

## Следующее после merge Phase 1

Architect открывает M-L10.2 milestone (CSS tokens) с RED specs для frontend-dev. User
запускает frontend-dev на нём. Phases идут последовательно (CSS → shell → hero → scrolls →
acceptance).

После Phase 5 — paxio.network показывает Paxio B5 дизайн с simulated-preview ribbon, и
M-L9 секции deprecated. После Phase 6 — `pnpm --filter @paxio/landing-app build` clean,
оба theme'а работают, Vercel deploy зелёный.
