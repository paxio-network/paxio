---
description: HARD scope boundaries — every agent may ONLY touch files in its ownership zone
globs: ["server/**/*.cjs", "app/**/*.{js,ts}", "canisters/**/*.rs", "packages/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "docs/**/*.md", "scripts/**"]
---

# Scope Guard — MANDATORY for every agent

## File Ownership

| Agent | ALLOWED files | FORBIDDEN |
|-------|---------------|-----------|
| **architect** | `app/types/`, `app/interfaces/`, `tests/`, `scripts/verify_*.sh`, `docs/feature-areas/`, `docs/sprints/`, `docs/e2e/`, `docs/NOUS_Development_Roadmap.md`, `CLAUDE.md`, `.claude/rules/`, `.claude/agents/` | `server/`, `app/api/`, `app/domain/`, `app/lib/`, `canisters/src/`, `packages/` |
| **backend-dev** | `server/`, `app/api/` (кроме `registry/`), `app/domain/` (кроме `registry/`), `app/lib/`, `app/config/`, `app/data/`, `app/errors/`, `packages/sdk/src/`, `packages/mcp-server/src/` | `canisters/src/`, `packages/frontend/`, `cli/`, `app/types/`, `app/interfaces/` (только читать), `app/{api,domain}/registry/` (registry-dev) |
| **icp-dev** | `canisters/src/{wallet,audit_log,security_sidecar,bitcoin_agent,shared}/`, `server/infrastructure/icp.cjs`, `cli/` | `canisters/src/reputation/` (registry-dev), `server/*` (кроме icp.cjs), `app/`, `packages/sdk/`, `packages/mcp-server/`, `packages/frontend/` |
| **registry-dev** | `app/api/registry/`, `app/domain/registry/`, `canisters/src/reputation/` | Everything else |
| **frontend-dev** | `packages/frontend/` | `server/`, `app/`, `canisters/`, `packages/sdk/src/` |
| **test-runner** | READS `tests/`, `scripts/` и запускает их | ANY implementation code — НЕ пишет код |
| **reviewer** | UPDATES ONLY: `docs/project-state.md`, `docs/tech-debt.md` (после APPROVED) | Everything else |

### Shared ownership rules
- `app/types/` — architect owns. Dev-агенты ТОЛЬКО читают, не пишут.
- `app/interfaces/` — architect owns. Dev-агенты реализуют по контрактам, не меняют сами контракты.
- `app/data/` — architect определяет структуру (через Zod в `app/types/`). backend-dev наполняет JSON.
- `packages/sdk/src/` — backend-dev owns (TypeScript SDK `@paxio/sdk`).
- `packages/frontend/` — frontend-dev owns полностью.

## УСТАВНЫЕ ДОКУМЕНТЫ — АБСОЛЮТНЫЙ ЗАПРЕТ для ВСЕХ dev-агентов

Следующие файлы НЕ МОЖЕТ модифицировать НИКАКОЙ dev-агент.
Только architect (частично) или user. Нарушение = автоматический REJECT + откат ВСЕХ изменений.

- `.claude/agents/*.md` — определения агентов (только user/architect)
- `.claude/rules/*.md` — правила проекта (только user/architect)
- `.claude/skills/**` — skills (только user)
- `.claude/settings.json` — hooks и настройки (только user)
- `CLAUDE.md` — master rules (только user/architect)
- `docs/project-state.md` — ТОЛЬКО reviewer после merge
- `docs/tech-debt.md` — ТОЛЬКО reviewer записывает новый долг, architect пишет тест на fix
- `docs/sprints/*.md` — ТОЛЬКО architect меняет статусы и содержимое
- `docs/feature-areas/*.md` — ТОЛЬКО architect
- `docs/NOUS_Strategy_v5.md` (alias `docs/architecture.md`) — ТОЛЬКО user
- `docs/NOUS_Development_Roadmap.md` (alias `docs/roadmap.md`) — ТОЛЬКО architect

**Почему**: LLM-агент может «оптимизировать» правила убрав ограничения которые ему мешают. Это не баг — это предсказуемое поведение. Поэтому запрет абсолютный.

## GIT & MERGE — АБСОЛЮТНЫЕ ПРАВИЛА

### Merge — ТОЛЬКО user
- **НИКАКОЙ агент НЕ мержит в `main` или `dev`.** Ни architect, ни dev, ни reviewer.
- Merge = решение user'а. Агенты ТОЛЬКО создают PR.
- `git push --force` к `main`/`dev` — ЗАПРЕЩЕНО для всех агентов.

### Branch model: feature/* → dev → main

```
feature/xxx  ──PR──►  dev  (рабочая интеграционная ветка)
                        │
                       PR
                        ▼
                      main  (релиз, tagged v*)
```

## THREE HARD RULES

### Rule 1: DO NOT touch other agents' code
Видишь баг в `canisters/` но ты frontend-dev? **STOP.** Не фиксишь — репортишь.

### Rule 2: DO NOT touch code outside your current task
Реализуешь текущий milestone. Замечаешь что код из предыдущего milestone можно «улучшить»?
**STOP.** Тот код работает и протестирован. Не трогай.
Изменяй ТОЛЬКО файлы которые напрямую требуются твоей текущей task description.

### Rule 3: If you MUST request a change outside your scope

Пиши EXACT формат в твоём ответе (маркеры `!!!` обязательны):

```
!!! SCOPE VIOLATION REQUEST !!!
Agent: [твой тип]
Current task: [описание задачи]
File I need to change: [полный путь]
Owner: [кто владеет файлом]
What change: [точное описание изменения]
Why I cannot proceed without it: [конкретная причина]
!!! END SCOPE VIOLATION REQUEST !!!
```

Затем STOP и ЖДИ. НЕ делай изменение. Architect + user рассмотрят:
одобрят (owner сделает), отклонят (workaround in scope), или перенаправят.

## НЕТ СПЕЦИФИКАЦИИ = НЕТ РАБОТЫ

Ты реализуешь ТОЛЬКО то, на что architect написал спецификацию.
Спецификация = ДВА источника (проверь ОБА):

- **Unit тесты** (`tests/*.test.ts`) — RED тесты = задачи Типа 1
- **Acceptance scripts** (`scripts/verify_*.sh`) — FAIL scripts = задачи Типа 2

Если нет НИ тестов НИ scripts — ты НЕ МОЖЕШЬ решить «я сам реализую это».

- Нет RED теста И нет FAIL script → НЕ РЕАЛИЗУЙ
- Есть RED тест, но нет script → реализуй по тесту (Тип 1)
- Есть И RED тест И FAIL script → реализуй ОБА
- Все тесты GREEN + all scripts PASS → ОСТАНОВИСЬ: «Жду milestone от architect»

## TESTS ARE SACRED

Test files written by the architect are SPECIFICATIONS, not suggestions.

- ❌ MUST NOT modify test files to make implementation pass
- ❌ MUST NOT add, remove, or weaken assertions in existing tests
- ❌ MUST NOT rename test functions
- ❌ MUST NOT skip или comment out тесты

Если тест кажется неправильным — report via `!!! SCOPE VIOLATION REQUEST !!!`. НЕ «фикси» его.
