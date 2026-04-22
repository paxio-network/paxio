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
| TD-05 | `landing-stats.ts::nowIso` вызывает `new Date().toISOString()` внутри domain — impure (engineering-principles §6). Для testability и детерминизма вынести в `Clock` dep: `LandingStatsDeps.clock: Clock`, использовать `deps.clock.now()`. | backend-dev | 🟢 LOW | architect напишет (тест: mock clock → deterministic `generated_at` в `getLanding`/`getNetworkSnapshot`) | 🟡 BACKLOG |
| TD-06 | M01c API handlers (7 штук) не валидируют query через Zod — `landing-agents-top.js` использует `typeof query?.limit === 'number'` без bounds-check. Должно быть `ZodLimit.parse(query.limit)` с явным диапазоном (1..100). | backend-dev | 🟢 LOW | architect напишет (тест: `limit=-1` и `limit=999999` → ValidationError) | 🟡 BACKLOG |

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
| Foundation (M00) | 1 | TD-01 errors sync; TD-02/TD-03/TD-04 ACK |
| Registry (FA-01) | 0 | TD-M01-1 (AgentId adoption) + TD-M01-2 (in-memory → PG/Qdrant/Redis) ACK |
| Payment Facilitator (FA-02) | 0 | |
| Wallet (FA-03) | 0 | |
| Security Sidecar (FA-04) | 0 | M03 review (037f991): code quality clean, no debt recorded. |
| Bitcoin Agent (FA-05) | 0 | |
| Compliance (FA-06) | 0 | M04 Audit Log review (7ca66b5): code quality clean, no debt recorded. |
| Intelligence (FA-07) | 2 | TD-05 impure `nowIso` (Clock DI), TD-06 Zod limit validation — обе BACKLOG ждут архитекторских тестов |
| Guard Agent (FA-08) | 0 | |
| Reputation (FA-09) | 0 | |
| Frontend (FA-10) | 0 | TD-04 покрывает architect-bootstrap pattern |

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
