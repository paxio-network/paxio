# Tech Debt — Paxio

> Этот файл ведётся ревьюером после APPROVED. Dev-агенты НЕ модифицируют.
> Architect пишет тесты для долга. Dev фиксит только если тест уже написан.

| ID | Описание | Owner | Приоритет | Тест на fix | Статус |
|----|---------|-------|-----------|-------------|--------|
| TD-01 | [описание] | [agent] | 🔴 HIGH | [тест name] | 🔴 OPEN |
| TD-02 | [описание] | [agent] | 🟡 MED | — | 🟡 BACKLOG |

---

## Канбан

```
🔴 OPEN (requires architect test before dev can fix)
🟡 BACKLOG (no test yet, architect writes test)
🟢 IN PROGRESS (dev actively fixing)
✅ CLOSED (fixed and verified)
```

---

## Статус по модулям

| Модуль | Open TD | Заметки |
|--------|---------|---------|
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
