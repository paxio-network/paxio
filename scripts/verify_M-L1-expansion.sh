#!/usr/bin/env bash
# M-L1-expansion acceptance — Real crawler adapters (FA-01).
#
# Smoke verification for 4 adapter impls (erc8004, a2a, fetch-ai, virtuals).
# All HTTP is mocked at unit-test layer; this script validates RED/GREEN
# state of the test suites + presence of reference data files.
#
# Pre-fix (M-L1-expansion RED): adapters are stubs → tests asserting
# yields/pagination fail. Post-fix (registry-dev T-2..T-5): GREEN.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
skip() { echo "  ⚠️  $1"; }
step() { echo; echo "▶ $1"; }

step "1. pnpm install + build"
if pnpm install --frozen-lockfile --prefer-offline > /tmp/m-l1-expansion.log 2>&1 \
   && pnpm build >> /tmp/m-l1-expansion.log 2>&1; then
  ok "install + build"
else
  bad "install/build FAILED — see /tmp/m-l1-expansion.log"
  exit 1
fi

step "2. Reference data files exist + are valid JSON"
for f in \
  products/01-registry/app/data/erc8004-registries.json \
  products/01-registry/app/data/a2a-seeds.json
do
  if [ -f "$f" ]; then
    if jq empty "$f" 2>/dev/null; then
      ok "$f valid JSON"
    else
      bad "$f exists but invalid JSON"
    fi
  else
    skip "$f not yet created (registry-dev T-2/T-3)"
  fi
done

step "3. Per-adapter test files exist"
for adapter in erc8004 a2a fetch-ai virtuals; do
  if [ -f "products/01-registry/tests/${adapter}-adapter.test.ts" ]; then
    ok "${adapter}-adapter.test.ts present"
  else
    bad "${adapter}-adapter.test.ts MISSING (architect T-1 incomplete)"
  fi
done

step "4. Per-adapter source files exist (real impl, not stubs)"
for adapter in erc8004 a2a fetch-ai virtuals; do
  src="products/01-registry/app/domain/sources/${adapter}.ts"
  if [ -f "$src" ]; then
    # Stub characteristic: empty `async function* fetchAgents()` with `return;`
    if grep -qE "function\* fetchAgents\(.*\).*\{\s*return;\s*\}" "$src" \
       || grep -qE "async function\* fetchAgents\(.*\)\s*:\s*AsyncIterable.*\{\s*return;\s*\}" "$src"; then
      bad "${adapter}.ts is still STUB (empty fetchAgents) — registry-dev not done"
    else
      ok "${adapter}.ts has non-stub fetchAgents impl"
    fi
  else
    bad "${adapter}.ts missing"
  fi
done

step "5. Drift-guard tests run + report state"
if timeout 120 pnpm exec vitest run \
     products/01-registry/tests/erc8004-adapter.test.ts \
     products/01-registry/tests/a2a-adapter.test.ts \
     products/01-registry/tests/fetch-ai-adapter.test.ts \
     products/01-registry/tests/virtuals-adapter.test.ts \
     > /tmp/m-l1-expansion-tests.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-l1-expansion-tests.log | tail -1 || echo "")
  ok "all 4 adapter test files GREEN — $passed"
else
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-l1-expansion-tests.log | tail -1 || echo "")
  failed=$(grep -oE '[0-9]+ failed' /tmp/m-l1-expansion-tests.log | tail -1 || echo "")
  bad "test suite RED: $passed | $failed (expected RED until registry-dev T-2..T-5 land)"
  tail -10 /tmp/m-l1-expansion-tests.log | sed 's,^,    ,'
fi

step "6. baseline regression — root vitest still GREEN"
if timeout 90 pnpm exec vitest run > /tmp/m-l1-expansion-baseline.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-l1-expansion-baseline.log | tail -1 || echo "")
  ok "baseline preserved — $passed (no other suites broken by M-L1-expansion)"
else
  bad "BASELINE REGRESSION — see /tmp/m-l1-expansion-baseline.log"
  tail -10 /tmp/m-l1-expansion-baseline.log | sed 's,^,    ,'
fi

echo
echo "─────────────────────────────────────────────"
echo "M-L1-EXPANSION ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "M-L1-expansion: 4 real adapters wired; cron matrix can now serve all 5 sources."
