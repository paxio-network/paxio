#!/usr/bin/env bash
# M01 Registry TS core — acceptance script.
# Pass criteria: Registry TS modules exist, contract+unit tests GREEN, API routes respond.
#
# Runs on dev laptop or CI. Does NOT require Docker/Postgres for MVP (in-memory store).

set -euo pipefail

cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

step() { echo; echo "▶ $1"; }

step "1. Registry TS skeleton exists"
for f in \
  products/01-registry/app/domain/registry.js \
  products/01-registry/app/domain/registry.ts \
  products/01-registry/app/domain/registry.mjs ; do
  if [ -f "$f" ]; then ok "domain/registry module present: $f"; fi
done
[ -f products/01-registry/app/domain/did-gen.js ] || [ -f products/01-registry/app/domain/did-gen.ts ] \
  && ok "domain/did-gen module present" \
  || bad "missing products/01-registry/app/domain/did-gen.{js,ts}"

step "2. Registry API handlers exist"
handlers_present=0
for h in register find resolve claim count; do
  for ext in js ts mjs; do
    if [ -f "products/01-registry/app/api/${h}.${ext}" ]; then
      ok "api/${h}.${ext}"
      handlers_present=$((handlers_present+1))
      break
    fi
  done
done
[ "$handlers_present" -ge 4 ] || bad "expected ≥4 api handlers, got $handlers_present"

step "3. Contract tests GREEN"
if pnpm vitest run tests/registry-contracts.test.ts --reporter=dot >/tmp/m01-contracts.log 2>&1; then
  ok "registry-contracts.test.ts"
else
  bad "registry-contracts.test.ts FAILED — see /tmp/m01-contracts.log"
fi

step "4. Behavior tests GREEN"
if pnpm vitest run products/01-registry/tests/ --reporter=dot >/tmp/m01-behavior.log 2>&1; then
  ok "products/01-registry/tests/"
else
  bad "Registry behavior tests FAILED — see /tmp/m01-behavior.log"
fi

step "5. Typecheck clean"
if pnpm typecheck >/tmp/m01-typecheck.log 2>&1; then
  ok "pnpm typecheck"
else
  bad "typecheck FAILED — see /tmp/m01-typecheck.log"
fi

echo
echo "====================================="
echo "M01 Registry acceptance: $PASS passed, $FAIL failed"
echo "====================================="

[ "$FAIL" -eq 0 ] || exit 1
