---
description: Full development workflow — two task types, verification methods, complete cycle
globs: ["apps/**/*.{ts,tsx,cjs,js}", "products/**/*.{ts,js,rs}", "packages/**/*.{ts,tsx}", "platform/**/*.rs", "tests/**/*.{ts,tsx}", "docs/**/*.md", "scripts/**"]
---

# Полный цикл разработки — от плана до завершения

Два типа задач, два метода верификации, один workflow.

## Тип 1: Логика (unit-testable)

Задачи где можно написать unit-тест: domain functions, application logic, validation, parsers,
Rust canister logic.
Метод верификации: **unit test RED → GREEN**

### Architect:
1. Выполнить scan протокол
2. Создать milestone в `docs/sprints/M0X-*.md`
3. Написать RED тесты в `tests/*.test.ts`, `products/*/tests/**/*.test.ts`, Rust tests
4. **КОММИТИТЬ milestone + контракты + тесты ДО запуска dev-агентов**
5. Указать в milestone: "Метод верификации: unit test"

### Dev-агент:
1. Выполнить startup protocol
2. Прочитать ТЕСТЫ — это спецификация
3. Реализовать код → тест GREEN
4. Коммитить после каждого GREEN теста
5. Сказать "готово"

### User → test-runner:
1. `pnpm test -- --run` + `cargo test --workspace`
2. Все тесты GREEN? → продолжаем
3. Есть RED? → dev фиксит

### User → reviewer:
1. `git diff --name-only` — scope check
2. `git diff tests/ products/*/tests/` — тесты не изменены?
3. Quality check
4. APPROVED → обновляет `docs/project-state.md`

---

## Тип 2: Интеграция/инфраструктура (среда = тест)

Задачи где unit-тест невозможен: DB migrations, Docker setup, API health,
ICP canister deploy, Bitcoin testnet flow, Vercel deploy pipeline.
Метод верификации: **acceptance script FAIL → PASS**

### Architect:
1. Выполнить scan протокол
2. Создать milestone
3. **Подготовить среду:**
   - `pnpm install` + `cargo build --workspace`
   - Docker stack (PostgreSQL, Redis, Qdrant)
   - dfx replica (если canister)
   - Записать предусловия в milestone
4. Написать **acceptance script** в `scripts/`:
   ```bash
   # scripts/verify_M01_api_health.sh
   pnpm test -- --run 2>&1
   echo "TESTS: $?"
   curl -s http://localhost:3001/health | jq .status
   echo "HEALTH: $?"
   ```
5. **КОММИТИТЬ milestone + script ДО запуска dev-агентов**

### Dev-агент:
1. Выполнить startup protocol
2. Прочитать milestone + acceptance script
3. Реализовать
4. Запустить script: `bash scripts/verify_xxx.sh`
5. Если PASS → коммитить
6. Сказать "готово"

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
7. Architect (если APPROVED, all must-fix done, CI green): `gh pr merge N --merge` → feature/* мержится в dev САМОСТОЯТЕЛЬНО, без явного OK от user
8. User: решает когда `dev → main` (релиз). После явного OK от user (с PR номером) → architect выполняет `gh pr merge M --merge` для PR `dev → main`
```

## E2E Verification (для интеграционных milestones)

После unit GREEN + acceptance PASS:
- E2E verification в тестовой среде (Docker, ICP testnet, Bitcoin regtest)
- E2E сценарии: `docs/e2e/*.md`
- E2E пройден → milestone ВЫПОЛНЕН

## Если что-то пошло не так

### test-runner нашёл RED (unit):
→ Dev фиксит → test-runner снова → цикл пока GREEN

### test-runner: acceptance FAIL:
→ Dev проверяет свой код
→ Если проблема в чужом модуле → `!!! SCOPE VIOLATION REQUEST !!!`

### reviewer нашёл scope violation:
→ Уровень 1 (уставные docs): REJECT, откат
→ Уровень 2 (чужой код + `!!! REQUEST !!!`): tech-debt
→ Уровень 3 (молча): оценка + tech-debt

### reviewer нашёл quality issue:
→ Записывает в `tech-debt.md` (owner + описание)
→ Architect пишет тест для этого долга
→ Dev при следующем startup видит OPEN + тест → фиксит

### E2E FAIL:
→ Architect создаёт hotfix milestone

### Всё GREEN + PASS + APPROVED:
→ Architect: `gh pr merge N --merge` → `feature/* → dev` (автоматически, без OK от user)
→ Architect: milestone ВЫПОЛНЕН (на уровне dev)
→ Следующий milestone
→ Когда user решит релизить (на любом этапе) → user OK → architect `gh pr merge M --merge` для `dev → main`

## Branch Model

```
feature/* → dev → main
```

- **feature/\*** — одна фича, создаётся от dev
- **dev** — рабочая интеграционная ветка
- **main** — релизная (tagged v*)
- **Push + PR creation = architect + user.** Dev-агенты (`backend-dev`, `frontend-dev`, `icp-dev`, `registry-dev`) работают только локально: commit → «готово». Они НЕ делают `git push`, НЕ создают PR, НЕ вызывают `gh *`. Architect после hand-off делает `git push` + `gh pr create` от своего имени (cм. «Git Policy» в `.claude/agents/<dev>.md`). Это убирает credential leak surface + единый audit trail + architect ревьюит diff до публикации.
- **Two merge gates** (см. `scope-guard.md::GIT & MERGE`):
  - **`feature/* → dev`**: architect мержит **сам автоматически** после reviewer APPROVED + must-fix закрыты + CI green. Не нужен OK от user. Снимает round-trip bottleneck для параллельных milestones.
  - **`dev → main`**: ТОЛЬКО после явного OK от user с PR номером. Релиз = продуктовое решение.
  - `git push --force` dev/main — ЗАПРЕЩЕНО всегда, без исключений.
