---
description: TEST-FIRST workflow reference — vitest for TS, cargo test for Rust, coverage thresholds, naming conventions. Architect/reviewer reference. Manual-load only.
globs: []
---

# Testing Rules

## Mandatory workflow: Scan → Plan → TEST → Implement → Review

1. **Architect** scans project → writes all failing tests for milestone (RED)
2. **Programmer** reads tests as spec → implements → GREEN
3. **Programmer НИКОГДА не модифицирует тесты** — only implementation
4. **Reviewer** checks: tests GREEN, tests not changed, project-state updated

## WHY: тест как спецификация, не верификация

Тест — это НЕ проверка после факта. Тест — это СПЕЦИФИКАЦИЯ.
Он определяет ЧТО код должен делать ДО того как код существует.

## Test Frameworks

### TypeScript — vitest

```bash
# Run ALL tests
pnpm test -- --run
# = vitest run

# Run specific file
pnpm test -- --run tests/classification.test.ts

# Watch mode
pnpm test
```

### Rust — cargo test

```bash
# All workspace crates
cargo test --workspace

# Specific crate
cargo test -p wallet --features mock-ecdsa
```

### Формат теста (TS):

```typescript
import { describe, it, expect } from 'vitest';

describe('classifyTool', () => {
  it('should return high risk for prohibited system', () => {
    const result = classifyTool({ name: 'social-scoring', type: 'scoring' });
    expect(result.riskLevel).toBe('unacceptable');
    expect(result.score).toBeGreaterThan(90);
  });
});
```

### Формат теста (Rust):

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_prohibited_system() {
        let result = classify_tool(&Tool { name: "social-scoring", r#type: ToolType::Scoring });
        assert_eq!(result.risk_level, RiskLevel::Unacceptable);
        assert!(result.score > 90);
    }
}
```

## Правила хороших тестов-спецификаций

ХОРОШИЙ тест:
- ✅ Использует РЕАЛЬНЫЕ типы из `packages/types/`
- ✅ Конкретные входные данные
- ✅ Конкретный ожидаемый результат с числами
- ✅ Одна проверяемая вещь на тест
- ✅ Понятное название: `should VERB when CONDITION`
- ✅ Не дублирует уже существующий тест
- ✅ Тестирует поведение, не реализацию

ПЛОХОЙ тест:
- ❌ "returns something" без конкретного assert
- ❌ Тест который всегда зелёный
- ❌ Проверяет реализацию, а не поведение
- ❌ Много вещей в одном тесте
- ❌ Зависит от порядка выполнения

## Coverage Thresholds

| Module | Threshold |
|--------|-----------|
| Security-critical (guard, wallet, security sidecar) | 80-100% |
| Core (scanner, FAP router, registry search, Bitcoin agent) | 60-80% |
| API handlers | 60-80% |
| Utility (data transforms) | 40-60% |

## Test Types

### Тип 1: Unit tests

**TypeScript:**
- `tests/**/*.test.ts` — cross-FA тесты
- `products/*/tests/**/*.test.ts` — per-FA тесты
- Run: `pnpm test -- --run`
- Для: domain functions, classification, risk engine, gap analysis, FAP routing

**Rust canisters:**
- `platform/canister-shared/tests/*.rs`
- `products/*/canister*/tests/*.rs` + inline `#[cfg(test)] mod tests`
- Run: `cargo test --workspace`
- Для: canister logic, threshold ECDSA (mock), intent verification, audit log

### Тип 2: Acceptance scripts

**Naming convention** (M-Q1):
- `scripts/verify_<MILESTONE-ID>.sh` — canonical (e.g. `verify_M-L9.sh`, `verify_M-Q1.sh`, `verify_TD-29.sh`)
- Header line 2: `# <MILESTONE-ID> acceptance — <descriptive name>` — для quality-gate.sh fallback discovery
- Legacy descriptive names (`verify_landing_design_port.sh`) работают через fallback пока header содержит milestone tag
- Run direct: `bash scripts/verify_<milestone>.sh`
- Run via gate: `bash scripts/quality-gate.sh <milestone-id>` (auto-discovery + 5 предыдущих gates)
- Для: DB migrations, API health check, Docker compose, ICP replica + canister deploy, frontend build, E2E flows

### Кто что проверяет

| Роль | Unit (Тип 1) | Acceptance (Тип 2) |
|---|---|---|
| **architect** | Пишет RED тесты | Пишет FAIL scripts |
| **dev** | Реализует → GREEN | Реализует → PASS |
| **test-runner** | `bash scripts/quality-gate.sh <milestone>` (одна команда покрывает оба) | (как Тип 1 — quality-gate.sh step 6) |
| **reviewer** | Тесты не изменены? | Script не изменён? |

## TEST-FIRST workflow per task type

**Type 1 (logic):** unit test RED → GREEN
- Architect writes RED test in `tests/*.test.ts` / `products/*/tests/` / Rust tests
- Dev implements to make GREEN
- Dev NEVER changes the test

**Type 2 (integration):** acceptance script FAIL → PASS
- Architect writes FAIL script in `scripts/verify_<milestone-id>.sh` (canonical) с header `# <ID> acceptance — ...`
- Dev implements to make PASS
- Must have E2E environment set up
- Test-runner gate: `bash scripts/quality-gate.sh <milestone-id>` — runs ALL 6 quality gates including this acceptance script

## НЕТ СПЕЦИФИКАЦИИ = НЕТ РАБОТЫ

- Нет RED теста И нет FAIL script → НЕ РЕАЛИЗУЙ
- Есть RED тест → реализуй по тесту
- Есть FAIL script → реализуй по script
- Все тесты GREEN + all scripts PASS → "Жду milestone от architect"

## Rules

1. **TEST-FIRST**: write the failing test BEFORE writing implementation code
2. **RED → GREEN → REFACTOR**: write failing test, then implement, then refactor
3. **NEVER modify tests** to make implementation pass
4. **Run tests before commit**: `pnpm typecheck && pnpm test -- --run` + `cargo test --workspace`
5. **All tests GREEN before PR**: typecheck + unit tests + acceptance scripts
