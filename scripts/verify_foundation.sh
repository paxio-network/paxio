#!/usr/bin/env bash
# M00 Foundation acceptance — проверяет что весь скелет корректный.
# Runs after `npm install`. Expected: 11 checks PASS.
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "❌ FAIL: $1" >&2; exit 1; }
pass() { echo "✅ PASS: $1"; }

echo "=== 1. Git repo ==="
[ -d .git ] || fail "no git repo (run 'git init' first)"
pass "git repo initialised"

echo "=== 2. Workspace structure ==="
for d in \
    server server/src server/lib server/infrastructure \
    app app/types app/interfaces app/errors app/lib \
    app/config app/data app/domain app/api \
    canisters canisters/src canisters/src/shared \
    packages packages/sdk packages/mcp-server packages/frontend \
    cli tests scripts docs opensrc .github/workflows; do
    [ -d "$d" ] || fail "missing directory: $d"
done
pass "all skeleton directories present"

echo "=== 3. Root files ==="
for f in package.json tsconfig.base.json tsconfig.app.json vitest.config.ts \
         .gitignore .eslintrc.json .prettierrc.json .prettierignore \
         README.md CLAUDE.md; do
    [ -f "$f" ] || fail "missing file: $f"
done
pass "all root files present"

echo "=== 4. Package.json workspaces ==="
node -e "const p=require('./package.json'); if(!Array.isArray(p.workspaces)) process.exit(1); if(!p.workspaces.includes('packages/*')) process.exit(1);" \
    || fail "package.json workspaces misconfigured"
pass "npm workspaces configured"

echo "=== 5. TypeScript available ==="
[ -d node_modules ] || fail "node_modules missing (run 'npm install')"
npx tsc --version >/dev/null 2>&1 || fail "tsc not available"
pass "tsc available"

echo "=== 6. Npm scripts defined ==="
for s in typecheck test lint build server; do
    node -e "const p=require('./package.json'); if(!p.scripts || !p.scripts['$s']) process.exit(1);" \
        || fail "missing npm script: $s"
done
pass "all npm scripts (typecheck/test/lint/build/server) defined"

echo "=== 7. Types + interfaces exist ==="
for f in app/types/result.ts app/types/did.ts app/types/capability.ts \
         app/types/agent-card.ts app/types/errors.ts app/types/index.ts \
         app/interfaces/logger.ts app/interfaces/clock.ts app/interfaces/index.ts; do
    [ -f "$f" ] || fail "missing: $f"
done
pass "types and interfaces present"

echo "=== 8. Server ported from Olympus (adapted) ==="
for f in server/main.cjs server/src/loader.cjs server/src/http.cjs \
         server/src/logger.cjs server/src/ws.cjs server/lib/errors.cjs; do
    [ -f "$f" ] || fail "missing: $f"
done
pass "server/ files present"

echo "=== 9. Typecheck passes ==="
if ! npm run typecheck >/tmp/paxio-tc.log 2>&1; then
    cat /tmp/paxio-tc.log | tail -20
    fail "typecheck has errors"
fi
pass "typecheck clean"

echo "=== 10. Tests present + GREEN ==="
for f in tests/result.test.ts tests/types.test.ts tests/errors.test.ts \
         tests/logger.test.ts tests/clock.test.ts tests/contracts.test.ts; do
    [ -f "$f" ] || fail "missing test: $f"
done
if ! npm run test -- --run >/tmp/paxio-test.log 2>&1; then
    tail -30 /tmp/paxio-test.log
    fail "tests failing"
fi
pass "all foundation tests GREEN"

echo "=== 11. CI workflow + scripts ==="
[ -f .github/workflows/ci.yml ] || fail "no CI workflow"
[ -x scripts/verify_foundation.sh ] || fail "verify_foundation.sh not executable"
pass "CI workflow + scripts present"

echo ""
echo "✅ M00 Foundation: ALL 11 CHECKS PASSED"
