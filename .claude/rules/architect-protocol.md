---
description: Architect scan protocol, milestone creation rules, knowledge that MUST survive context compaction
globs: ["docs/**/*.md", "server/**/*.cjs", "app/**/*.{js,ts}", "canisters/**/*.rs", "packages/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "scripts/**"]
---

# Architect Protocol — ОБЯЗАТЕЛЬНЫЙ при каждом планировании

## ПЕРВЫМ ДЕЛОМ: tech-debt тесты

```
1. cat docs/tech-debt.md
2. Найди 🔴 OPEN где "Тест на fix" пустая или "architect напишет"
3. Для КАЖДОЙ — напиши падающий тест
4. Обнови tech-debt.md: колонку "Тест на fix" → имя теста
5. Коммитни тесты
6. ТОЛЬКО ПОСЛЕ ЭТОГО — milestone работа
```

Без тестов dev-агенты НЕ МОГУТ фиксить долг. Ты — бутылочное горлышко.

## Scan протокол — ОБЯЗАТЕЛЬНЫЕ 6 шагов ПЕРЕД milestone

### ШАГ 1 — Статус проекта
```bash
git log --oneline -10
cat docs/project-state.md
ls docs/sprints/
grep -l "ВЫПОЛНЕН\|DONE" docs/sprints/*.md
```

### ШАГ 2 — Читай ВСЕ типы и интерфейсы
```bash
ls app/types/ && cat app/types/*.ts
ls app/interfaces/ && cat app/interfaces/*.ts
```
Тесты ДОЛЖНЫ использовать РЕАЛЬНЫЕ типы. Предполагаемые типы → тест не скомпилируется → спринт сломан.

### ШАГ 3 — Что реализовано vs заглушки
```bash
grep -rn "TODO\|FIXME\|stub\|STUB" server/ app/ canisters/ packages/
```

### ШАГ 4 — Существующие тесты (НЕ дублировать!)
```bash
grep -rn "describe\|it(" tests/*.test.ts
```

### ШАГ 5 — Прочитай Feature Area подсистемы
```bash
ls docs/feature-areas/
cat docs/feature-areas/FA-0X-[relevant].md
```
Feature Area = промежуточный слой между Roadmap и Milestone.

### ШАГ 6 — Начинай работу
Теперь знаешь реальное состояние. Пиши milestone и тесты.
НЕ обновляй project-state.md — это сделает reviewer после merge.

## Откуда берутся milestones — цепочка

```
docs/NOUS_Strategy_v5.md          → ЧТО строим, ЗАЧЕМ (product vision)
docs/NOUS_Development_Roadmap.md  → КАКИЕ фичи, В КАКОМ порядке (phases)
docs/feature-areas/FA-0X-*.md     → КАК УСТРОЕНА подсистема (промежуточный слой)
docs/sprints/M0X-*.md             → КАК реализуем (тесты + задачи)
```

Алиасы: `docs/architecture.md` → Strategy, `docs/roadmap.md` → Roadmap.

**НЕ ПРИДУМЫВАТЬ MILESTONES С ПОТОЛКА.**
- Нет Roadmap → СТОП, сначала создай Roadmap
- Нет Strategy → СТОП, спроси user'а

## Два типа задач — определяй для КАЖДОЙ задачи

**Тип 1 (логика):** unit test RED → GREEN
- Напиши падающий тест в `tests/*.test.ts`

**Тип 2 (интеграция):** acceptance script FAIL → PASS
- Напиши скрипт в `scripts/verify_*.sh`
- Подготовь среду (Docker, dfx, testnet)
- Запиши предусловия среды в milestone

Если задача требует ОБА типа — напиши ОБА.

## КОММИТЬ ВСЁ ДО ЗАПУСКА DEV-АГЕНТОВ

Перед "запускай dev" ОБЯЗАТЕЛЬНО закоммить:
- types + interfaces (контракты) в `app/types/` + `app/interfaces/`
- tests/*.test.ts (RED тесты)
- scripts/verify_*.sh
- docs/sprints/M*.md

**Почему:** dev в worktree не видит незакоммиченные файлы.

## Файлы architect'а

### ✅ ТВОИ файлы:
- `docs/sprints/*.md` — milestones
- `docs/feature-areas/*.md` — Feature Areas (пишешь/правишь)
- `docs/NOUS_Development_Roadmap.md` — отмечаешь ✅ DONE
- `docs/e2e/*.md` — E2E сценарии
- `tests/*.test.ts` — RED тесты-спецификации
- `app/types/` — shared типы + Zod схемы
- `app/interfaces/` — контракты (ports)
- `scripts/verify_*.sh` — acceptance scripts
- `CLAUDE.md` — master rules
- `.claude/rules/*.md` и `.claude/agents/*.md` — правила проекта (совместно с user)

### ❌ НЕ ТВОИ:
- `docs/project-state.md` — ТОЛЬКО reviewer
- `docs/tech-debt.md` — ТОЛЬКО reviewer записывает
- `docs/NOUS_Strategy_v5.md` (alias `docs/architecture.md`) — ТОЛЬКО user
- `server/` — backend-dev
- `app/{api,domain,lib,config,data,errors}/` — backend-dev (кроме `registry/` → registry-dev)
- `app/{api,domain}/registry/` + `canisters/src/reputation/` — registry-dev (FA-01, TS core + single canister)
- `canisters/src/{wallet,audit_log,security_sidecar,bitcoin_agent}/` — icp-dev
- `packages/frontend/` — frontend-dev
- `packages/sdk/src/` — backend-dev

## Обязательная таблица в конце milestone

```markdown
| # | Задача | Агент | Метод верификации | Файлы |
|---|---|---|---|---|
| 1 | ... | registry-dev | unit test: `tests/registry.test.ts::TestX` GREEN | `app/domain/registry/` |
| 2 | ... | icp-dev | `cargo test` GREEN + `bash scripts/verify_wallet.sh` PASS | `canisters/src/wallet/` |
```

Без таблицы user не знает кого запускать и что проверять.

## После завершения milestone (dev сказал "готово")

1. Все тесты GREEN? Acceptance PASS?
2. Dev НЕ изменил тесты? (`git diff tests/ scripts/ docs/e2e/`)
3. Обнови `docs/NOUS_Development_Roadmap.md` — фичи ✅ DONE
4. Обнови milestone статус в `docs/sprints/M0X-*.md`
5. Попроси user запустить reviewer
6. НЕ трогай `project-state.md` и `tech-debt.md` (это reviewer)
