#!/usr/bin/env bash
# M01b Frontend Bootstrap — acceptance.
# Pass criteria: 8 apps + 4 packages scaffolded, all typecheck+build clean.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. 8 frontend apps exist"
for app in landing registry pay radar intel docs wallet fleet; do
  [ -f "apps/frontend/${app}/package.json" ]  && ok "apps/frontend/${app}/package.json" || bad "missing apps/frontend/${app}/package.json"
  [ -f "apps/frontend/${app}/app/page.tsx" ]   && ok "apps/frontend/${app}/app/page.tsx"  || bad "missing apps/frontend/${app}/app/page.tsx"
done

step "2. 4 frontend packages exist"
for pkg in ui hooks api-client auth; do
  [ -f "packages/${pkg}/package.json" ]      && ok "packages/${pkg}/package.json" || bad "missing packages/${pkg}/package.json"
  [ -f "packages/${pkg}/src/index.ts" ]      && ok "packages/${pkg}/src/index.ts" || bad "missing packages/${pkg}/src/index.ts"
done

step "3. pnpm workspace resolves all new packages"
if pnpm --filter @paxio/ui exec true >/tmp/m01b-filter.log 2>&1; then
  ok "pnpm --filter @paxio/ui"
else
  bad "pnpm --filter @paxio/ui FAILED — see /tmp/m01b-filter.log"
fi

step "4. Typecheck clean"
if pnpm typecheck >/tmp/m01b-typecheck.log 2>&1; then
  ok "pnpm typecheck"
else
  bad "typecheck FAILED — see /tmp/m01b-typecheck.log"
fi

step "5. Build all frontend apps"
if pnpm turbo run build --filter='./apps/frontend/*' >/tmp/m01b-build.log 2>&1; then
  ok "pnpm turbo run build (8 apps)"
else
  bad "turbo build FAILED — see /tmp/m01b-build.log"
fi

step "6. Smoke tests GREEN"
if pnpm turbo run test --filter='./apps/frontend/*' >/tmp/m01b-test.log 2>&1; then
  ok "pnpm turbo run test (smoke)"
else
  bad "smoke tests FAILED — see /tmp/m01b-test.log"
fi

echo
echo "====================================="
echo "M01b Frontend Bootstrap: $PASS passed, $FAIL failed"
echo "====================================="
[ "$FAIL" -eq 0 ] || exit 1
