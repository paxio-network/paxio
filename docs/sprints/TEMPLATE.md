# M0X — Название

## Готово когда:
[конкретный acceptance criteria]

## Метод верификации:
- [ ] **unit test** — `npm run test -- --run` → тесты GREEN
- [ ] **acceptance script** — `bash scripts/verify_xxx.sh` → PASS (для интеграционных задач)
- [ ] **E2E** — docs/e2e/xxx.md → сценарий пройден (для интеграционных milestones)

## Зависимости:
- [ ] M0Y — что должно быть DONE до этого

---

## Шаг 1: Architect пишет спецификации (ПЕРВЫМ — до кода)

### architect:
- [ ] Выполнить scan протокол (6 шагов из architect-protocol.md)
- [ ] Спроектировать интерфейсы (.ts types в engine/core/src/types/)

**Для задач Типа 1 (логика):**
- [ ] Написать падающий тест: test_xxx.ts — testИмяФункции
  (вход: конкретные данные → выход: конкретный результат)
- Приёмка: тесты компилируются и ПАДАЮТ (RED)

**Для задач Типа 2 (интеграция/инфраструктура):**
- [ ] Написать acceptance script в scripts/verify_xxx.sh
  (команды + ожидаемый результат)
- [ ] Написать E2E сценарий в docs/e2e/ (если интеграционный milestone)
- Приёмка: script готов, среда определена

## Шаг 2: Программисты реализуют

### agent-name (lead):
- [ ] Выполнить startup protocol (9 шагов из startup-protocol.md)
- [ ] Прочитать тесты/scripts architect'а — это твоё ТЗ
- [ ] Реализовать → тест GREEN / acceptance PASS
- [ ] Рефакторинг, сохраняя всё зелёным
- Приёмка: ВСЕ тесты GREEN + acceptance PASS

## Шаг 3: Проверка

### User → test-runner:
- [ ] `npm run typecheck` — TypeScript checks pass
- [ ] `npm run test -- --run` — unit регрессия
- [ ] `bash scripts/verify_xxx.sh` — acceptance (если есть)
- [ ] Если RED/FAIL → dev фиксит, возврат к Шагу 2

### User → reviewer:
- [ ] Scope check: `git diff --name-only` сверить с scope-guard
- [ ] Тесты не изменены: `git diff tests/`
- [ ] Quality: нет hardcode, нет global state, стиль ок
- [ ] APPROVED → коммитить project-state.md + tech-debt.md
- [ ] CHANGES REQUESTED → dev фиксит

## Шаг 4: Закрытие

### Architect (после reviewer APPROVED):
- [ ] Обновить docs/NOUS_Development_Roadmap.md — фичи ✅ DONE
- [ ] Обновить этот milestone — статус ВЫПОЛНЕН

### User (если интеграционный milestone):
- [ ] Запустить E2E сценарий (testnet или hardware)
- [ ] E2E PASS → milestone ВЫПОЛНЕН
- [ ] E2E FAIL → architect создаёт hotfix milestone

## Оценка: X дней
## Статус: НЕ НАЧАТО / ТЕСТЫ НАПИСАНЫ / В РАБОТЕ / E2E ПРОВЕРКА / ВЫПОЛНЕН

## Таблица задач

| # | Задача | Агент | Метод верификации | Файлы |
|---|---|---|---|---|
| 1 | ... | backend-dev | unit test: TestX GREEN | products/<fa>/app/... |
| 2 | ... | frontend-dev | acceptance: scripts/verify_Y.sh | apps/frontend/<app>/... |
