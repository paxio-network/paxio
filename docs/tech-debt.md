# Tech Debt — Paxio

> Этот файл ведётся ревьюером после APPROVED. Dev-агенты НЕ модифицируют.
> Architect пишет тесты для долга. Dev фиксит только если тест уже написан.

| ID | Описание | Owner | Приоритет | Тест на fix | Статус |
|----|---------|-------|-----------|-------------|--------|
| TD-01 | `server/lib/errors.cjs` дублирует коды/статусы из `app/types/errors.ts` + `app/errors/index.ts`. Drift risk: изменение одного файла без второго → рассинхронизация HTTP ответов. | backend-dev | 🟡 MED | architect напишет (сравнить `ERROR_CODES` + `ERROR_STATUS_CODES` между TS и CJS) | 🟡 BACKLOG |
| TD-02 | Server scaffolding (`server/main.cjs`, `server/src/*.cjs`, `server/lib/errors.cjs`) был написан architect'ом в рамках M00 bootstrap — формально вне scope architect'а. Будущие изменения `server/` ДОЛЖНЫ идти через backend-dev. | governance | 🟢 LOW | — (process note, не код) | 🟢 ACK |
| TD-03 | `platform/canister-shared/` + `scripts/dfx-setup.sh` + `docs/paxio-dev-environment.md` написаны architect'ом в M00c — формально вне scope. Будущие изменения ДОЛЖНЫ идти через icp-dev. Повтор паттерна TD-02. | governance | 🟢 LOW | — (authorization record, не код) | 🟢 ACK |
| TD-M01-1 | M01 Registry TS использует локальный string-based `Did` + агент id. Когда Reputation canister (FA-09) приземлится, адаптировать `canister-shared::AgentId` как общий primitive между TS registry и Rust reputation. | registry-dev | 🟢 LOW | — (tracked in future FA-09 milestone) | 🟢 ACK |
| TD-M01-2 | M01 Registry TS хранит агентов in-memory (`Map`) — временная реализация для MVP. Swap на Postgres (персистентность) + Qdrant (vector search для intent) + Redis (hot cache) запланирован в M17 (persistence milestone). | backend-dev | 🟢 INFO | — (tracked in M17) | 🟢 ACK |
| TD-04 | M01c backend-partial (commit `54ac343`): architect написал backend-dev код — `apps/back/server/{main,src/loader}.cjs`, `products/07-intelligence/app/{domain,api}/**` — без `!!! SCOPE VIOLATION REQUEST !!!`. Level 3 scope violation. Код качественный (9/9 tests GREEN, Result/Factory/DI OK), но процесс нарушен — backend-dev был доступен, milestone явно ассигнован на backend-dev. Будущие изменения `apps/back/server/` + `products/07-intelligence/app/` ДОЛЖНЫ идти через backend-dev. | governance | 🟢 LOW | — (process note, не код) | 🟢 ACK |
| TD-05 | `landing-stats.ts::nowIso` вызывает `new Date().toISOString()` внутри domain — impure (engineering-principles §6). Для testability и детерминизма вынести в `Clock` dep: `LandingStatsDeps.clock: () => number`, использовать `deps.clock()` в `nowIso`. | backend-dev | 🟢 LOW | `products/07-intelligence/tests/landing-td-fixes.test.ts` — 4 теста в `describe('TD-05: …')`. 3 RED + 1 случайно GREEN. После fix: 4/4 GREEN. | ✅ CLOSED (2026-04-23, backend-dev: `clock` field added to deps + `landing-stats.test.ts` mockDeps updated) |
| TD-06 | M01c API handlers (7 штук) не валидируют query через Zod — `landing-agents-top.js` использует `typeof query?.limit === 'number'` без bounds-check. Должно быть Zod-схема с диапазоном (например `z.coerce.number().int().min(1).max(100)`) и явный `throw new errors.ValidationError(...)`. | backend-dev | 🟢 LOW | `products/07-intelligence/tests/landing-td-fixes.test.ts` — 4 теста в `describe('TD-06: …')`. 3 RED (limit=-1, 999999, "20" string) + 1 GREEN (valid limit=20). После fix: 4/4 GREEN. | ✅ CLOSED (2026-04-23, backend-dev: bounds-check 1..100 integer + ValidationError throw) |
| TD-07 | Рецидивирующее scope violation: architect вновь пишет dev-код. M01b Frontend Bootstrap (`bf417fe`, 8 Next.js apps + 4 packages) — frontend-dev scope; M01b smoke/ESLint fixes (`6b9ed91`) — frontend-dev scope; M01c TD-05/TD-06 fix (`57d4cc1`, `landing-stats.ts` + `landing-agents-top.js`) — backend-dev scope; app renames + filter refs (`49ea698`, `d20eddb`) — frontend-dev/infra scope. Четвёртый случай паттерна (TD-02 M00, TD-03 M00c, TD-04 M01c backend-partial, TD-07 M01b+M01c TD). Dev-агенты были доступны. Код качественный и рабочий (347 TS GREEN + 34 Rust GREEN + 8/8 builds), но процесс нарушен. Level 3 по новой таксономии scope-guard. **Escalation**: следующий M05+ milestone ДОЛЖЕН идти через frontend-dev/backend-dev, а не через architect. | governance | 🟡 MED | — (process note, не код) | 🟢 ACK |
| TD-08 | Frontend smoke tests (`apps/frontend/*/tests/smoke.test.tsx`, 8 файлов) — dead code с двумя багами: (1) `existsSync` импортится из `node:path` вместо `node:fs` (в `node:path` такого экспорта нет), (2) relative path `'../../app/page'` ведёт в `apps/frontend/app/page` (несуществующий) вместо `'../app/page'` → `apps/frontend/<app>/app/page`. Баги не выявляются потому что root `vitest.config.ts` excludes `apps/frontend` + include pattern `**/*.test.ts` не matches `.test.tsx`. Per-app `pnpm test` возвращает "No test files found, exit 1", architect «расслабил» `verify_m01b_frontend.sh` шаг 6 treat this как PASS. Тесты никогда не запускаются. Fix: либо per-app `vitest.config.ts` + корректный include `.test.tsx` + исправить импорты/пути, либо удалить placeholder smoke и вернуть реальные при M01c. | frontend-dev | 🟡 MED | architect напишет (тест: каждый `apps/frontend/<app>/tests/smoke.test.tsx` выполняется без ошибок при `pnpm --filter @paxio/<name>-app test`) | 🟡 BACKLOG |
| TD-09 | ESLint отключён на build-time во всех 8 `apps/frontend/*/next.config.ts` через `eslint: { ignoreDuringBuilds: true }` (commit `6b9ed91`) — band-aid для parse errors в TSX, а не proper fix. Должен быть per-app `.eslintrc.json` (extends `next/core-web-vitals`) + ESLint build gate включён обратно. | frontend-dev | 🟢 LOW | architect напишет (тест: каждый `apps/frontend/<app>/next.config.ts` НЕ содержит `ignoreDuringBuilds: true`; `.eslintrc.json` присутствует) | 🟡 BACKLOG |
| TD-10 | Architect модифицировал `docs/tech-debt.md` в commit `57d4cc1`, отметив TD-05/TD-06 как ✅ CLOSED. Per scope-guard: «tech-debt.md — ТОЛЬКО reviewer записывает новый долг; architect пишет тесты на fix и заполняет колонку Тест на fix». CLOSED маркер должен ставить dev-агент после fix, ИЛИ reviewer при APPROVED. Architect не в scope для CLOSED mark. Код фикса при этом корректный — вопрос только процесс. | governance | 🟢 LOW | — (process note, не код) | 🟢 ACK |

---

## Канбан

```
🔴 OPEN (requires architect test before dev can fix)
🟡 BACKLOG (no test yet, architect writes test)
🟢 IN PROGRESS (dev actively fixing)
🟢 ACK (governance note, не код)
✅ CLOSED (fixed and verified)
```

---

## Статус по модулям

| Модуль | Open TD | Заметки |
|--------|---------|---------|
| Foundation (M00) | 1 | TD-01 errors sync; TD-02/TD-03/TD-04/TD-07/TD-10 ACK |
| Registry (FA-01) | 0 | TD-M01-1 (AgentId adoption) + TD-M01-2 (in-memory → PG/Qdrant/Redis) ACK |
| Payment Facilitator (FA-02) | 0 | |
| Wallet (FA-03) | 0 | |
| Security Sidecar (FA-04) | 0 | M03 review (037f991): code quality clean, no debt recorded. |
| Bitcoin Agent (FA-05) | 0 | |
| Compliance (FA-06) | 0 | M04 Audit Log review (7ca66b5): code quality clean, no debt recorded. |
| Intelligence (FA-07) | 0 | TD-05 + TD-06 ✅ CLOSED (Clock DI + Zod bounds, 8/8 td-fixes GREEN) |
| Guard Agent (FA-08) | 0 | |
| Reputation (FA-09) | 0 | |
| Frontend (FA-10) | 2 | M01b bootstrap landed; TD-08 smoke tests dead+buggy BACKLOG, TD-09 ESLint build-gate bypassed BACKLOG. TD-07 governance ACK покрывает architect-bootstrap pattern |

---

## Правила ведения

1. **Ревьюер записывает** новый долг после APPROVED
2. **Architect пишет тест** для каждого OPEN долга
3. **Dev фиксит** только если тест уже написан
4. Dev не берёт долг без теста — сообщает "ждёт тест от architect'а"
5. После фикса: dev отмечает ✅ CLOSED в своей строке

---

## История

| Дата | ID | Кто | Описание |
|------|----|-----|----------|
| 2026-04-18 | TD-01 | reviewer | Обнаружено при M00 review: дублирование error codes между server/ (CJS) и app/ (TS). |
| 2026-04-18 | TD-02 | reviewer | Обнаружено при M00 review: architect написал server/ файлы — будущие изменения только через backend-dev. |
| 2026-04-22 | TD-03 | reviewer | Обнаружено при M00c review: architect написал `platform/canister-shared/` + dfx-setup + dev-env doc — будущие изменения только через icp-dev. Повтор паттерна TD-02. |
| 2026-04-22 | TD-M01-1 | reviewer | Зафиксировано при M01 Registry TS post-APPROVED: AgentId primitive из canister-shared будет адоптирован когда FA-09 Reputation canister приземлится. |
| 2026-04-22 | TD-M01-2 | reviewer | Зафиксировано при M01 Registry TS post-APPROVED: in-memory store (MVP) → Postgres/Qdrant/Redis swap в M17 persistence milestone. |
| 2026-04-22 | — | reviewer | M03 Security Sidecar Intent Verifier (`037f991`) review: code quality clean, no tech debt recorded. Cherry-pick salvage process noted in project-state.md (not a debt; salvage was correct response to 4+ commit stale branch). |
| 2026-04-22 | — | reviewer | M04 Audit Log Canister (`7ca66b5`) review: code quality clean, no tech debt recorded. Same cherry-pick salvage pattern as M03. Phase-0 closed with zero new debt from M03/M04. |
| 2026-04-22 | TD-04 | reviewer | M01c backend-partial (`54ac343`) review: architect-authored backend-dev code (server loader + main + 7 API handlers + landing-stats domain). Level 3 scope violation — same governance pattern as TD-02/TD-03 но здесь backend-dev был доступен. Code quality OK, process нарушен. |
| 2026-04-22 | TD-05 | reviewer | M01c backend-partial review: `landing-stats.ts::nowIso` вызывает `Date.now` inside domain — impure. Clock DI рекомендуется (engineering-principles §6). |
| 2026-04-22 | TD-06 | reviewer | M01c backend-partial review: API handlers не валидируют query через Zod — bounds-check отсутствует. |
| 2026-04-23 | TD-05 | architect | Fix (commit `57d4cc1`): `clock: () => number` field added to `LandingStatsDeps`, `nowIso(clockMs)` takes epoch ms; test fixture updated (`59c993a`). 4/4 TD-05 tests + 9/9 landing-stats tests GREEN. **Status → ✅ CLOSED** (но marker поставлен architect'ом вместо reviewer'a — см. TD-10). |
| 2026-04-23 | TD-06 | architect | Fix (commit `57d4cc1`): explicit integer bounds check 1..100 in `landing-agents-top.js`, `throw new errors.ValidationError(...)` on out-of-range/non-numeric. 4/4 TD-06 tests GREEN. **Status → ✅ CLOSED** (см. TD-10). |
| 2026-04-23 | TD-07 | reviewer | Post-M01b + M01c TD-fix review: architect продолжает писать dev-код. M01b Frontend Bootstrap (`bf417fe`) — frontend-dev scope. M01c TD-05/TD-06 fix (`57d4cc1`) — backend-dev scope. Plus `6b9ed91`, `49ea698`, `d20eddb`, `8a34948`. Dev-агенты доступны. Level 3 по новой таксономии. Escalation к user для M05+. |
| 2026-04-23 | TD-08 | reviewer | M01b smoke tests: `existsSync` импорт из `node:path` (должен быть `node:fs`), relative path `'../../app/page'` wrong (должен быть `'../app/page'`), vitest include не матчит `.test.tsx` + excludes `apps/frontend`. Тесты никогда не выполняются — dead code с багами. |
| 2026-04-23 | TD-09 | reviewer | M01b: `eslint: { ignoreDuringBuilds: true }` во всех 8 `next.config.ts` (commit `6b9ed91`) — band-aid вместо proper `.eslintrc.json`. |
| 2026-04-23 | TD-10 | reviewer | M01c TD-fix review: architect поставил ✅ CLOSED в `docs/tech-debt.md` (commit `57d4cc1`) — reviewer-only scope. Per scope-guard, architect заполняет «Тест на fix» column, но не CLOSED. Minor procedural violation. |
