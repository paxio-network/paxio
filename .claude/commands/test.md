# Test commands for Paxio

## TypeScript unit tests (Vitest)

```bash
npm run test -- --run
```

Запускает vitest для всего репо: `tests/**/*.test.ts` + `packages/**/*.test.ts`.

## TypeScript typecheck only

```bash
npm run typecheck
```

## Integration tests

```bash
npm run test:integration
```

## Rust canister tests

```bash
cd canisters && cargo test
cd canisters && cargo test -p registry    # только registry canister
cd canisters && cargo test -p wallet      # только wallet canister
```

## Acceptance scripts (environment tests)

```bash
bash scripts/verify_wallet.sh
bash scripts/verify_registry.sh
bash scripts/verify_all.sh   # все сразу
```

## Frontend tests

```bash
cd packages/frontend/app && npm run test
```

## With coverage

```bash
npm run test -- --run --coverage
```

Report: total tests, passed, failed, coverage %.
If any fail, show failure details.

## Note — Guard Agent tests

Guard Agent — **внешний Python/FastAPI сервис** в `/home/openclaw/guard/`.
Его тесты запускаются в его собственном репо (`cd /home/openclaw/guard && pytest`).
В Paxio codebase тестируется только HTTP-клиент к Guard (`server/infrastructure/guard-client.cjs`)
и domain wrapper (`app/domain/guard/`) — через vitest.
