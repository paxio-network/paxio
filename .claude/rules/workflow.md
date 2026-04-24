---
description: Full development lifecycle — from plan to completion
globs: ["apps/**/*.{ts,tsx,cjs,js}", "products/**/*.{ts,js,rs}", "packages/**/*.{ts,tsx}", "platform/**/*.rs", "tests/**/*.{ts,tsx}", "docs/**/*.md", "scripts/**"]
---

# Full Development Lifecycle

## Контрактный слой — ПЕРЕД тестами

Тесты пишутся НА ОСНОВЕ контракта.
Контракт определяет ЧТО модуль делает, тесты проверяют КАК именно.

### Цепочка:
```
Architect: scan → КОНТРАКТ (types + interfaces) → ТЕСТЫ (на основе контракта) → milestone
Dev: читает КОНТРАКТ + ТЕСТЫ → реализует
```

Architect СНАЧАЛА пишет/обновляет контракты, ПОТОМ пишет тесты по нему.

---

## Тип 1: Логика (unit-testable)

Метод верификации: **unit test RED → GREEN**

### Architect:
1. Выполнить scan протокол
2. Обновить types/interfaces если нужны новые типы
3. Написать RED тесты в `tests/*.test.ts`
4. Создать milestone в `docs/sprints/`
5. **КОММИТИТЬ контракт + milestone + тесты ДО запуска dev-агентов**

### Dev-агент:
1. Выполнить startup protocol (10 шагов)
2. Прочитать КОНТРАКТ + ТЕСТЫ
3. Реализовать → тест GREEN
4. Коммитить после каждого GREEN теста
5. Сказать "готово"

---

## Тип 2: Интеграция/инфраструктура

Метод верификации: **среда FAIL → код → среда PASS**

### Architect:
1. Выполнить scan протокол
2. **Подготовить среду исполнения** (Docker, API keys, testnet)
3. Записать предусловия в milestone:
   ```
   ## Предусловия среды (architect обеспечивает):
   - [ ] Docker installed and running
   - [ ] ICP testnet deployed
   - [ ] Database populated
   ```
4. Написать **acceptance script** в `scripts/verify_*.sh`
5. **КОММИТИТЬ milestone + script + сценарий**

### Dev-агент:
1. Выполнить startup protocol
2. Реализовать wiring/config
3. Запустить acceptance script сам: `bash scripts/verify_xxx.sh`
4. Если PASS → коммитить

---

## Full Cycle

```
1. Dev: реализует код → тест GREEN → КОММИТИТ в feature-ветку
2. Dev: все задачи done → говорит "готово"
3. User: запускает test-runner → "Проверь"
4. test-runner: build + ALL tests → репортирует GREEN/RED
5. User: запускает reviewer → "Review от [agent]"
6. Reviewer: scope, тесты не изменены, quality →
   APPROVED: коммитит обновлённый project-state.md + tech-debt.md
7. User: git merge в main (только после APPROVED)
```

## E2E Verification (для интеграционных milestones)

После unit GREEN + acceptance PASS:
- E2E verification в тестовой среде (Docker, testnet)
- E2E сценарии: `docs/e2e/*.md`
- E2E пройден → milestone ВЫПОЛНЕН

## Если что-то пошло не так

### test-runner нашёл RED (unit):
→ Dev фиксит → test-runner снова → цикл пока GREEN

### test-runner: acceptance FAIL:
→ Dev проверяет свой код
→ Если проблема в чужом модуле → `!!! SCOPE VIOLATION REQUEST !!!`

### reviewer нашёл scope violation — ТРИ УРОВНЯ:

| Уровень | Что произошло | Реакция reviewer'а |
|---|---|---|
| **Level 1** — уставные docs | Dev изменил `.claude/`, `CLAUDE.md`, `docs/project-state.md`, `docs/tech-debt.md`, `docs/sprints/`, `docs/feature-areas/`, `docs/NOUS_Strategy_v5.md`, `docs/NOUS_Development_Roadmap.md` (или их алиасы) | **АВТОМАТИЧЕСКИЙ REJECT.** Полный откат всех изменений в этих файлах. Запись в `tech-debt.md` с severity=CRITICAL. Без переговоров — это конституционный запрет. |
| **Level 2** — чужой код + `!!! REQUEST !!!` | Dev честно остановился, написал `!!! SCOPE VIOLATION REQUEST !!!` блок и НЕ сделал изменение. Запросил у architect/owner | **APPROVED WITH CONDITION.** Reviewer записывает запрос в `tech-debt.md` (owner = правильный агент). Architect добавит в следующий milestone. Текущий PR можно мержить если работает workaround. |
| **Level 3** — чужой код молча | Dev изменил файлы вне scope БЕЗ `!!! REQUEST !!!` блока (попытался "просто заодно поправить") | **CHANGES REQUESTED.** Reviewer оценивает: (a) если изменение корректное и в духе owner'а — записывает в `tech-debt.md` с пометкой "self-resolved by [agent]" и оставляет; (b) если изменение неверное или ломает чужой контракт — REJECT + откат + tech-debt запись с severity=HIGH. |

### reviewer нашёл quality issue (но scope OK):
→ Записывает в `tech-debt.md` (owner + описание + severity)
→ Architect пишет тест на fix в следующем milestone
→ Dev при следующем startup видит OPEN + тест → фиксит

### E2E FAIL:
→ Architect создаёт hotfix milestone

### Всё GREEN + PASS + APPROVED:
→ User: `git merge` (только user мержит)
→ Architect: milestone ВЫПОЛНЕН → следующий milestone

## Branch Model

```
feature/* → dev → main
```

- **feature/\*** — одна фича, создаётся от dev
- **dev** — рабочая интеграционная ветка
- **main** — релизная (tagged v*)
- **Merge decision = ONLY user.** Agents ask «мержить PR #N?» and wait OK. After explicit OK referencing PR number — architect executes `gh pr merge N --merge` himself (saves a round-trip). Без OK — merge запрещён. `git push --force` dev/main forbidden always.
