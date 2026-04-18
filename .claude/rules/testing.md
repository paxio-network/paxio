---
description: TEST-FIRST mandatory workflow — tests are specifications, not verification
globs: ["app/**/*.{js,ts}", "server/**/*.cjs", "packages/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "scripts/**"]
---

# Testing Rules

## Mandatory workflow: Scan → Plan → TEST → Implement → Review

```
1. Architect: scan project → write all failing tests for milestone (RED)
2. Dev: read tests as spec → implement → GREEN
3. Dev NEVER modifies tests — only implementation
4. Reviewer: check tests GREEN, tests not changed, project-state updated
```

## WHY: test as specification, not verification

The test is NOT a check after the fact. The test IS the specification.
It defines WHAT the code must do BEFORE the code exists.

## Правила хороших тестов-спецификаций

ХОРОШИЙ тест:
- ✅ Использует РЕАЛЬНЫЕ типы из `app/types/`
- ✅ Конкретные входные данные
- ✅ Конкретный ожидаемый результат с числами
- ✅ Одна проверяемая вещь на тест
- ✅ Понятное название: `describe(' функция ').it(' КОГДА_ЧТО '...`
- ✅ Не дублирует уже существующий тест

ПЛОХОЙ тест:
- ❌ Предполагаемые типы (не читал types)
- ❌ "returns something" без конкретного assert
- ❌ Тест который всегда зелёный
- ❌ Проверяет реализацию, а не поведение
- ❌ Много вещей в одном тесте

## Coverage Thresholds

| Module | Threshold |
|--------|-----------|
| Security-critical (guard, wallet) | 80-100% |
| Core (scanner, eval, FAP router) | 60-80% |
| Utility (data transforms) | 40-60% |

## Test Types

### Unit tests (Vitest)
- `tests/**/*.test.ts` — функции, services, handlers
- Run: `npm run test` or `npx vitest run`

### TypeScript typecheck
- `npm run typecheck` — tsc --noEmit
- MUST pass before any PR

### Integration tests
- `tests/**/*.integration.ts` — component tests
- Run: `npm run test:integration`

### Acceptance scripts
- `scripts/verify_*.sh` — end-to-end verification
- Run: `bash scripts/verify_*.sh`
- Must pass for milestone completion

### Rust canister tests
- `canisters/src/**/*.rs` — cargo test
- Run: `cd canisters && cargo test`

## TEST-FIRST workflow per task type

**Type 1 (logic):** unit test RED → GREEN
- Architect writes RED test in `tests/*.test.ts`
- Dev implements to make GREEN
- Dev NEVER changes the test

**Type 2 (integration):** acceptance script FAIL → PASS
- Architect writes FAIL script in `scripts/verify_*.sh`
- Dev implements to make PASS
- Must have E2E environment set up

## НЕТ СПЕЦИФИКАЦИИ = НЕТ РАБОТЫ

- Нет RED теста И нет FAIL script → НЕ РЕАЛИЗУЙ
- Есть RED тест → реализуй по тесту
- Есть FAIL script → реализуй по script
- Все тесты GREEN + all scripts PASS → "Жду milestone от architect"

## Rules

1. **TEST-FIRST**: write the failing test BEFORE writing implementation code
2. **RED → GREEN → REFACTOR**: write failing test, then implement, then refactor
3. **NEVER modify tests** to make implementation pass
4. **Run tests before commit**: `npm run typecheck && npm run test -- --run`
5. **All tests GREEN before PR**: typecheck + unit tests + integration tests
