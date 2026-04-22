# Tech Debt — Paxio

> Этот файл ведётся ревьюером после APPROVED. Dev-агенты НЕ модифицируют.
> Architect пишет тесты для долга. Dev фиксит только если тест уже написан.

| ID | Описание | Owner | Приоритет | Тест на fix | Статус |
|----|---------|-------|-----------|-------------|--------|
| TD-01 | `server/lib/errors.cjs` дублирует коды/статусы из `app/types/errors.ts` + `app/errors/index.ts`. Drift risk: изменение одного файла без второго → рассинхронизация HTTP ответов. | backend-dev | 🟡 MED | architect напишет (сравнить `ERROR_CODES` + `ERROR_STATUS_CODES` между TS и CJS) | 🟡 BACKLOG |
| TD-02 | Server scaffolding (`server/main.cjs`, `server/src/*.cjs`, `server/lib/errors.cjs`) был написан architect'ом в рамках M00 bootstrap — формально вне scope architect'а. Будущие изменения `server/` ДОЛЖНЫ идти через backend-dev. | governance | 🟢 LOW | — (process note, не код) | 🟢 ACK |
| TD-03 | `platform/canister-shared/` + `scripts/dfx-setup.sh` + `docs/paxio-dev-environment.md` написаны architect'ом в M00c — формально вне scope. Будущие изменения ДОЛЖНЫ идти через icp-dev. Повтор паттерна TD-02. | governance | 🟢 LOW | — (authorization record, не код) | 🟢 ACK |

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
| Foundation (M00) | 1 | TD-01 errors sync; TD-02/TD-03 ACK |
| Registry (FA-01) | 0 | |
| Payment Facilitator (FA-02) | 0 | |
| Wallet (FA-03) | 0 | |
| Security Sidecar (FA-04) | 0 | |
| Bitcoin Agent (FA-05) | 0 | |
| Compliance (FA-06) | 0 | |
| Intelligence (FA-07) | 0 | |
| Guard Agent (FA-08) | 0 | |
| Reputation (FA-09) | 0 | |
| Frontend (FA-10) | 0 | |

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
