---
description: Full development lifecycle — from plan to completion
globs: ["server/**/*.cjs", "app/**/*.{js,ts}", "canisters/**/*.rs", "packages/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "docs/**/*.md", "scripts/**"]
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

| Проблема | Решение |
|----------|---------|
| test-runner нашёл RED | Dev фиксит → test-runner проверяет снова |
| Acceptance FAIL | Dev проверяет свой код, если в чужом → !!! REQUEST |
| Reviewer scope violation | REJECT + откат изменений |
| E2E FAIL | Architect создаёт hotfix milestone |

## Branch Model

```
feature/* → dev → main
```

- **feature/\*** — одна фича, создаётся от dev
- **dev** — рабочая интеграционная ветка
- **main** — релизная (tagged v*)
- **Merge = ONLY user**. Агенты только создают PR.
