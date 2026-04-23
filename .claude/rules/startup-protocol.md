---
description: Mandatory startup protocol — agent must announce what it found BEFORE writing code
globs: ["apps/**/*.{ts,tsx,cjs,js}", "products/**/*.{ts,js,rs}", "packages/**/*.{ts,tsx}", "platform/**/*.rs", "tests/**/*.{ts,tsx}", "docs/**/*.md", "scripts/**"]
---

# Startup Protocol — ОБЯЗАТЕЛЬНЫЙ для каждого агента

## ПЕРЕД тем как написать хоть одну строчку кода, выполни ВСЕ шаги ПО ПОРЯДКУ:

### Step 1: Прочитай правила проекта
- CLAUDE.md — master rules
- .claude/rules/scope-guard.md — твои границы (какие файлы МОЖЕШЬ трогать)

### Step 2: Прочитай tech debt — ДО milestone задач
- docs/tech-debt.md — есть ли OPEN долг на тебя?
- Если есть 🔴 OPEN с твоим owner → проверь колонку "Тест на fix":
  - Тест/script ЕСТЬ (architect написал) → СНАЧАЛА закрой долг по этому тесту, ПОТОМ milestone
  - Тест/script НЕТ → НЕ БЕРИ задачу. Сообщи: "TD-N ждёт тест от architect'а."
- После fix долга → прогони ВСЕ тесты
- Если fix ломает чужие тесты → СТОП, !!! SCOPE VIOLATION REQUEST !!!
- Отметь долг как ✅ CLOSED в tech-debt.md

### Step 3: Прочитай КОНТРАКТЫ — типы и интерфейсы
- `app/types/` — shared типы + Zod схемы (source of truth)
- `app/interfaces/` — контракты компонентов (ports)
- Контракт определяет ЧТО модуль делает. Ты реализуешь ПО КОНТРАКТУ.
- Если контракт неясен или кажется ошибочным → !!! SCOPE VIOLATION REQUEST !!!

### Step 4: Прочитай тест-спецификации и acceptance scripts
- `tests/*.test.ts` — unit-тесты твоего модуля
- `scripts/verify_*.sh` — acceptance scripts (Type 2 tasks)
- Тесты написаны НА ОСНОВЕ контрактов. Контракт + тесты = полное ТЗ.

### Step 5: Прочитай текущее состояние проекта
- docs/project-state.md — какие модули DONE, какие STUB
- docs/sprints/M*.md — найди milestone с твоей секцией
- docs/feature-areas/*.md — пойми контекст подсистемы

### Step 6: Прочитай текущий код своего модуля
- Все файлы в твоём scope — что уже реализовано, что stub
- Проверь: `grep -rn "TODO\|FIXME\|not implemented" [твой scope]`

### Step 7: Запусти тесты
```bash
npm run typecheck && npm run test -- --run
```
Посмотри какие тесты RED (твои задачи), какие GREEN (уже сделано).

### Step 8: ВЫВЕДИ ОТЧЁТ пользователю

**ОБЯЗАТЕЛЬНЫЙ формат — НЕ ПРОПУСКАЙ:**

```
═══════════════════════════════════════════════════
AGENT: [твоё имя]
TASK FOUND: [milestone] — [название задачи]
═══════════════════════════════════════════════════

Tech debt: [OPEN на меня: N / нет]
Milestone: M0X
Feature Area: [файл]
Contract: [интерфейсный файл]
Test spec: [файл с тестами]
Tests RED: N of total (мои задачи)
Tests GREEN: N of total (уже сделано)

Файлы которые буду реализовывать:
  - [path]/[file] — [что именно]

Читаю данные из: app/data/ (reference JSON)
Зависимости от других модулей: [какие]

Приступаю к реализации.
═══════════════════════════════════════════════════
```

### Step 9: ТОЛЬКО ПОСЛЕ ОТЧЁТА начинай писать код

Если ты начал писать код до Step 8 — ты нарушил протокол.
Если пользователь не видел твой отчёт — он не знает что ты делаешь.
