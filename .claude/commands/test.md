# Test commands for Paxio

## TypeScript unit tests (Vitest)

```bash
pnpm test -- --run                      # workspace root: tests/**/*.test.ts + packages/**/*.test.ts + products/*/tests/**/*.test.ts
pnpm turbo:test                         # cached + parallel через Turborepo
```

## TypeScript typecheck only

```bash
pnpm typecheck
```

## Integration tests

```bash
pnpm test:integration
```

## Rust canister tests (root workspace)

```bash
cargo test --workspace
cargo test -p wallet                    # products/03-wallet/canister/
cargo test -p security                  # products/04-security/canister/
cargo test -p audit-log                 # products/06-compliance/canisters/audit-log/
cargo test -p canister-shared           # platform/canister-shared/ (M00c)
```

## Acceptance scripts (environment tests)

```bash
bash scripts/verify_foundation.sh       # M00
bash scripts/verify_m01b_frontend.sh    # M01b (8 apps + 4 packages)
bash scripts/verify_m01c_landing.sh     # M01c (backend + landing impl)
bash scripts/verify_m01d_cicd.sh        # M01d (12 workflows + secrets)
bash scripts/verify_m02_wallet.sh       # M02 (threshold ECDSA)
bash scripts/verify_m03_security.sh     # M03
bash scripts/verify_m04_audit.sh        # M04
```

## Frontend tests (per-app)

```bash
pnpm --filter @paxio/landing-app test     # apps/frontend/landing
pnpm --filter @paxio/registry-app test
pnpm --filter @paxio/pay-app test
pnpm --filter @paxio/radar-app test
pnpm --filter @paxio/intel-app test
pnpm --filter @paxio/docs-app test
pnpm --filter @paxio/wallet-app test
pnpm --filter @paxio/fleet-app test

# All 8 at once
pnpm turbo run test --filter='./apps/frontend/*'
```

## Per-FA tests

```bash
pnpm turbo run test --filter=@paxio/registry       # FA-01
pnpm turbo run test --filter=@paxio/facilitator    # FA-02
pnpm turbo run test --filter='./products/*'        # все 7 FA
```

## With coverage

```bash
pnpm test -- --run --coverage
```

Report: total tests, passed, failed, coverage %.
If any fail, show failure details.

## Note — Guard Agent tests

Guard Agent — **внешний Python/FastAPI сервис** в `/home/openclaw/guard/` (submodule at `products/04-security/guard/`).
Его тесты запускаются в его собственном репо (`cd products/04-security/guard && pytest`).
В Paxio codebase тестируется только HTTP-клиент к Guard (`apps/back/server/infrastructure/guard-client.cjs`)
и domain wrapper (`products/04-security/app/domain/guard/`) — через vitest.
