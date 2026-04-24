---
description: HARD scope boundaries — every agent may ONLY touch files in its ownership zone
globs: ["apps/**/*.{ts,tsx,cjs,js}", "products/**/*.{ts,js,rs}", "packages/**/*.{ts,tsx}", "platform/**/*.rs", "tests/**/*.{ts,tsx}", "docs/**/*.md", "scripts/**"]
---

# Scope Guard — MANDATORY for every agent

## File ownership

| Agent | ALLOWED files | FORBIDDEN (everything else) |
|---|---|---|
| **architect** | `packages/{types,interfaces,errors,contracts}/`, `tests/`, `products/*/tests/`, `scripts/verify_*.sh`, `docs/sprints/`, `docs/feature-areas/`, `docs/e2e/`, `docs/fa-registry.md`, `docs/NOUS_Development_Roadmap.md`, `CLAUDE.md`, `.claude/rules/`, `.claude/agents/` | ALL implementation code (`apps/`, `products/*/app/`, `products/*/canister*/`, `packages/utils/`, `packages/{ui,hooks,api-client,auth}/`) |
| **backend-dev** | `apps/back/server/`, `apps/back/app/{config,data}/`, TS в `products/*/app/` (кроме FA-01), `products/03-wallet/{sdk-ts,sdk-python,mcp-server,guard-client}/`, `products/04-security/guard-client/`, `products/06-compliance/github-action/`, `packages/utils/` | `products/*/canister*/`, `products/*/{cli,http-proxy}/`, `apps/frontend/`, `products/04-security/guard/` (submodule), `products/01-registry/`, `packages/{types,interfaces,errors,contracts,ui,hooks,api-client,auth}/` (read-only) |
| **icp-dev** | Rust `products/*/canister*/` (кроме FA-01), `products/03-wallet/http-proxy/`, `products/06-compliance/cli/`, `platform/canister-shared/`, `apps/back/server/infrastructure/icp.cjs` | `products/01-registry/canister/` (registry-dev), TS в `products/*/app/`, `apps/frontend/`, `packages/` (read-only) |
| **registry-dev** | `products/01-registry/` целиком (`app/` + `canister/` Rust Reputation + `tests/`) | Everything else |
| **frontend-dev** | `apps/frontend/` (8 apps: landing, registry, pay, radar, intel, docs, wallet, fleet), `packages/{ui,hooks,api-client,auth}/` | `apps/back/`, `products/`, `platform/`, `packages/{types,interfaces,errors,contracts,utils}/` (read-only) |
| **test-runner** | READS `tests/`, `products/*/tests/`, `scripts/` — запускает команды | ANY implementation code — НЕ пишет код |
| **reviewer** | UPDATES ONLY: `docs/project-state.md`, `docs/tech-debt.md` (после APPROVED) | Everything else |

### Shared ownership rules

- `packages/types/` — architect owns. Dev-агенты ТОЛЬКО читают, не пишут.
- `packages/interfaces/` — architect owns. Dev реализует по контрактам, не меняет контракты.
- `packages/errors/` — architect owns (shared across FAs).
- `packages/contracts/` — architect owns (OpenAPI = Published Language).
- `packages/utils/` — backend-dev owns (Clock, Logger implementations).
- `packages/{ui,hooks,api-client,auth}/` — frontend-dev owns.
- `apps/back/app/data/` — architect определяет схему (Zod в `packages/types/`), backend-dev наполняет JSON.
- `products/04-security/guard/` (submodule) — **external team a3ka**. Paxio агенты **только читают**. Contributions → PR в upstream `github.com/a3ka/guard`.
- `products/07-intelligence/ml/` — external ML team. Paxio агенты не трогают.

## УСТАВНЫЕ ДОКУМЕНТЫ — АБСОЛЮТНЫЙ ЗАПРЕТ для ВСЕХ dev-агентов

Следующие файлы НЕ МОЖЕТ модифицировать НИКАКОЙ dev-агент.
Только architect (частично) или user. Нарушение = автоматический REJECT + откат ВСЕХ изменений.

- `.claude/agents/*.md` — определения агентов (только user/architect)
- `.claude/rules/*.md` — правила проекта (только user/architect)
- `.claude/skills/**` — skills (только user)
- `.claude/settings.json` — hooks и настройки (только user)
- `CLAUDE.md` — master rules (только user/architect)
- `docs/project-state.md` — **ТОЛЬКО reviewer** после APPROVED
- `docs/tech-debt.md` — **ТОЛЬКО reviewer** записывает новый долг; architect пишет тесты на fix и заполняет колонку «Тест на fix»
- `docs/sprints/*.md` — **ТОЛЬКО architect** меняет статусы и содержимое
- `docs/feature-areas/*.md` — **ТОЛЬКО architect**
- `docs/NOUS_Strategy_v5.md` (alias `docs/architecture.md`) — **ТОЛЬКО user**
- `docs/NOUS_Development_Roadmap.md` (alias `docs/roadmap.md`) — **ТОЛЬКО architect**

**Почему:** LLM-агент может «оптимизировать» правила убрав ограничения которые ему мешают. Это не баг — это предсказуемое поведение. Поэтому запрет **абсолютный**.

## GIT & MERGE — АБСОЛЮТНЫЕ ПРАВИЛА

### Merge decision — ТОЛЬКО user. Merge execution — разрешено architect после explicit OK.

**Decision vs execution.** Решение мержить — только user. Выполнение команды — может делать architect ПОСЛЕ явного «OK / мержи / go» от user.

- architect / dev / reviewer / test-runner **никогда** не мержат без явного OK от user
- architect **может** выполнить `gh pr merge N --merge` после фразы user'а содержащей «мержи» / «merge» / «OK мержить» / «go ahead merge» на конкретный PR номер
- Фраза user'а должна быть **SPECIFIC** — содержать номер PR или однозначный контекст. «Да» без привязки к номеру = уточнить. «Мержи всё» = отказаться, просить по одному
- `git push --force` к `main` / `dev` — **ЗАПРЕЩЕНО для всех агентов всегда, без исключений**, даже с user OK

### Branch model: feature/* → dev → main

```
feature/xxx  ──PR──►  dev  (рабочая интеграционная ветка)
                        │
                       PR
                        ▼
                      main  (релиз, tagged v*)
```

- **dev** — рабочая ветка. Сюда мержатся завершённые feature-ветки.
- **main** — релизная ветка. Merge в main = новая версия (tag + release).
- **feature/\*** — одна фича или milestone. Живёт до merge в dev.

### Branch workflow

1. **architect** создаёт `feature/*` branch от `dev`, коммитит milestones + контракты + RED тесты
2. **dev-агенты** коммитят реализацию на тот же feature branch
3. **test-runner** запускает тесты, даёт отчёт (НЕ коммитит)
4. **reviewer** проверяет, обновляет `project-state.md` + `tech-debt.md`
5. **architect** создаёт PR: `feature/*` → `dev`
6. **user** мержит PR в `dev` когда фича APPROVED
7. Когда `dev` стабильна → **user** мержит `dev` → `main` + tag

### CI/CD pipeline (.github/workflows/)

- `ci-frontend-<app>.yml` (×8) — path-filtered на `apps/frontend/<app>/**`: lint + typecheck + build + audit
- `ci-backend.yml` — path-filtered на `apps/back/**` + `products/*/app/**` + `packages/**`: lint + vitest + postgres service + audit
- `ci-canisters.yml` — path-filtered на `products/*/canister*/**` + `platform/canister-shared/**` + `Cargo.toml`: cargo fmt + clippy + test + wasm build + audit
- `deploy-backend.yml` — push `main` + backend paths: Docker → ghcr.io → SSH Hetzner → healthcheck → rollback
- `release-tools.yml` — tag `v*`: build 5 targets → GitHub Release → npm + JSR + PyPI + crates.io

Все агенты ОБЯЗАНЫ убедиться что `pnpm test`, `pnpm typecheck`, `cargo test --workspace` проходят **ПЕРЕД** коммитом.

## THREE HARD RULES

### Rule 1: DO NOT touch other agents' code

Видишь баг в `products/03-wallet/canister/src/ecdsa.rs` но ты frontend-dev? **STOP.** Не фиксишь — репортишь.

### Rule 2: DO NOT touch code outside your current task

Реализуешь текущий milestone. Замечаешь что код из предыдущего можно «улучшить»? **STOP.** Тот код работает и протестирован. Изменяй ТОЛЬКО файлы которые напрямую требуются твоей текущей task description.

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

Затем **STOP и ЖДИ**. НЕ делай изменение. Architect + user рассмотрят:
одобрят (owner сделает), отклонят (workaround in scope), или перенаправят.

## НЕТ СПЕЦИФИКАЦИИ = НЕТ РАБОТЫ

Ты реализуешь ТОЛЬКО то, на что architect написал спецификацию.
Спецификация = ДВА источника (проверь ОБА):

- **Unit тесты** (`tests/*.test.ts` + `products/*/tests/**/*.test.ts` + `platform/canister-shared/tests/*.rs` + `products/*/canister*/tests/*.rs`) — RED тесты = задачи Типа 1
- **Acceptance scripts** (`scripts/verify_*.sh`) — FAIL scripts = задачи Типа 2

Если нет НИ тестов НИ scripts — ты НЕ МОЖЕШЬ решить «я сам реализую это».

- Нет RED теста И нет FAIL script → НЕ РЕАЛИЗУЙ
- Есть RED тест, но нет script → реализуй по тесту (Тип 1)
- Есть И RED тест И FAIL script → реализуй ОБА
- Все тесты GREEN + all scripts PASS → ОСТАНОВИСЬ: «Жду milestone от architect»

## TESTS ARE SACRED

Test files written by the architect are **SPECIFICATIONS, not suggestions.**

- ❌ MUST NOT modify test files to make implementation pass
- ❌ MUST NOT add, remove, or weaken assertions in existing tests
- ❌ MUST NOT rename test functions
- ❌ MUST NOT skip или comment out тесты

Если тест кажется неправильным — report via `!!! SCOPE VIOLATION REQUEST !!!`. НЕ «фикси» его.
