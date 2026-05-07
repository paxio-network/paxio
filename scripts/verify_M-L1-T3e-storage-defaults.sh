#!/usr/bin/env bash
# M-L1-T3e-storage-defaults acceptance — upsertParams emits CHECK-constrained
# defaults instead of undefined/NULL for fetch-ai crawl to actually persist.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

PG=products/01-registry/app/infra/postgres-storage.ts
TESTS=products/01-registry/tests/postgres-storage.test.ts

step "1. upsertParams uses SQL-DEFAULT strings for CHECK-constrained columns"
for kv in "framework.*'unknown'" "walletStatus.*'none'" "paymentFacilitator.*'unknown'" "secBadge.*'none'"; do
  if grep -E "$kv" "$PG" >/dev/null 2>&1; then
    ok "$PG has '$kv'"
  else
    bad "$PG missing default '$kv'"
  fi
done

step "2. No `?? undefined` in upsertParams"
if awk '/const upsertParams/,/^  \};/' "$PG" | grep -q "?? undefined"; then
  bad "$PG upsertParams still contains '?? undefined'"
else
  ok "$PG upsertParams free of '?? undefined'"
fi

step "3. T-3e test in postgres-storage.test.ts"
if grep -q "M-L1-T3e: upsertParams provides defaults" "$TESTS"; then
  ok "T-3e test present"
else
  bad "T-3e test missing"
fi

step "4. Vitest target file all GREEN (28+ tests)"
if pnpm exec vitest run "$TESTS" >/tmp/vitest-t3e.log 2>&1; then
  PASSED=$(grep -E "Tests +[0-9]+ passed" /tmp/vitest-t3e.log | grep -oE "[0-9]+ passed" | head -1)
  ok "vitest target file: $PASSED"
else
  bad "vitest target file FAIL"
  tail -15 /tmp/vitest-t3e.log
fi

echo
echo "M-L1-T3e-storage-defaults ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
