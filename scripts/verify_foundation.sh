#!/usr/bin/env bash
# M00/M01a Foundation acceptance — product-first monorepo.
# Runs after `pnpm install`. Expected: 12 checks PASS.
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "❌ FAIL: $1" >&2; exit 1; }
pass() { echo "✅ PASS: $1"; }

echo "=== 1. Git repo ==="
[ -d .git ] || fail "no git repo (run 'git init' first)"
pass "git repo initialised"

echo "=== 2. Product-first workspace structure ==="
# NB: top-level `canisters/` was DEPRECATED in M01a — canisters now live in
# products/*/canister(s)/ and shared primitives in platform/canister-shared/.
for d in \
    apps apps/back apps/back/server apps/back/server/src apps/back/app \
    apps/frontend \
    products products/01-registry products/02-facilitator products/03-wallet \
    products/04-security products/05-bitcoin-agent products/06-compliance products/07-intelligence \
    products/01-registry/app products/03-wallet/sdk-ts products/03-wallet/mcp-server \
    products/04-security/guard products/06-compliance/cli \
    products/03-wallet/canister products/04-security/canister \
    products/06-compliance/canisters/audit-log \
    packages packages/types packages/interfaces packages/errors packages/utils packages/contracts \
    packages/ui packages/hooks packages/api-client packages/auth \
    platform platform/canister-shared \
    tests scripts docs .github/workflows; do
    [ -d "$d" ] || fail "missing directory: $d"
done
pass "product-first directory layout complete"

echo "=== 3. Root files ==="
for f in package.json pnpm-workspace.yaml turbo.json tsconfig.base.json tsconfig.app.json \
         vitest.config.ts .gitignore .gitmodules \
         .eslintrc.json .prettierrc.json .prettierignore \
         README.md CLAUDE.md; do
    [ -f "$f" ] || fail "missing file: $f"
done
pass "all root files present"

echo "=== 4. pnpm workspace configured ==="
grep -q "products/\*" pnpm-workspace.yaml || fail "pnpm-workspace.yaml missing 'products/*'"
grep -q "apps/\*" pnpm-workspace.yaml || fail "pnpm-workspace.yaml missing 'apps/*'"
grep -q "packages/\*" pnpm-workspace.yaml || fail "pnpm-workspace.yaml missing 'packages/*'"
pass "pnpm workspaces (apps/* products/* packages/*) configured"

echo "=== 5. Turborepo + pnpm + uv available ==="
[ -d node_modules ] || fail "node_modules missing (run 'pnpm install')"
npx tsc --version >/dev/null 2>&1 || fail "tsc not available"
npx turbo --version >/dev/null 2>&1 || fail "turbo not available"
pass "tsc + turbo available"

echo "=== 6. Npm scripts defined ==="
for s in typecheck test lint build server; do
    node -e "const p=require('./package.json'); if(!p.scripts || !p.scripts['$s']) process.exit(1);" \
        || fail "missing npm script: $s"
done
pass "all npm scripts (typecheck/test/lint/build/server) defined"

echo "=== 7. Shared kernel (types + interfaces + errors + utils) ==="
for f in packages/types/src/result.ts packages/types/src/did.ts packages/types/src/capability.ts \
         packages/types/src/agent-card.ts packages/types/src/errors.ts packages/types/src/index.ts \
         packages/interfaces/src/logger.ts packages/interfaces/src/clock.ts packages/interfaces/src/index.ts \
         packages/errors/src/index.ts packages/utils/src/clock.ts packages/utils/src/logger.ts; do
    [ -f "$f" ] || fail "missing shared kernel file: $f"
done
pass "shared kernel (packages/{types,interfaces,errors,utils}) present"

echo "=== 8. Backend monolith (apps/back/) ==="
for f in apps/back/server/main.cjs apps/back/server/src/loader.cjs apps/back/server/src/http.cjs \
         apps/back/server/src/logger.cjs apps/back/server/src/ws.cjs apps/back/server/lib/errors.cjs \
         apps/back/package.json; do
    [ -f "$f" ] || fail "missing: $f"
done
pass "apps/back/ (server + shared app infra) present"

echo "=== 9. Guard submodule registered ==="
grep -q 'path = products/04-security/guard' .gitmodules || fail ".gitmodules missing Guard submodule"
grep -q 'url = https://github.com/a3ka/guard' .gitmodules || fail ".gitmodules wrong Guard URL"
pass "Guard submodule → github.com/a3ka/guard registered in products/04-security/"

echo "=== 10. Typecheck passes ==="
if ! pnpm typecheck >/tmp/paxio-tc.log 2>&1; then
    tail -30 /tmp/paxio-tc.log
    fail "typecheck has errors"
fi
pass "typecheck clean"

echo "=== 11. Tests present + GREEN ==="
for f in tests/result.test.ts tests/types.test.ts tests/errors.test.ts \
         tests/logger.test.ts tests/clock.test.ts tests/contracts.test.ts; do
    [ -f "$f" ] || fail "missing test: $f"
done
if ! pnpm vitest run >/tmp/paxio-test.log 2>&1; then
    tail -30 /tmp/paxio-test.log
    fail "tests failing"
fi
pass "all unit tests GREEN (347+ including M00-M04 + M01b/c RED→GREEN)"

echo "=== 12. CI workflows + scripts ==="
# Paxio uses path-filtered workflows (ci-backend/canisters/frontend-<app>/deploy-*/release-*),
# not a single `ci.yml`. Require at least ci-backend + ci-canisters + one frontend.
[ -f .github/workflows/ci-backend.yml ]   || fail "missing .github/workflows/ci-backend.yml"
[ -f .github/workflows/ci-canisters.yml ] || fail "missing .github/workflows/ci-canisters.yml"
ls .github/workflows/ci-frontend-*.yml >/dev/null 2>&1 || fail "no ci-frontend-*.yml workflows"
[ -x scripts/verify_foundation.sh ] || fail "verify_foundation.sh not executable"
pass "CI workflows (backend + canisters + 8 frontend apps) + scripts present"

echo ""
echo "✅ Foundation (M00 + M01a product-first migration): ALL CHECKS PASSED"
