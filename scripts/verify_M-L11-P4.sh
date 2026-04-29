#!/usr/bin/env bash
# M-L11 Phase 4 (I-1 + I-2) acceptance — Intelligence domain ports
set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. RED tests exist (architect-authored spec)"
for f in products/07-intelligence/tests/intelligence-snapshot-domain.test.ts products/07-intelligence/tests/movers-domain.test.ts; do
  [ -f "$f" ] && ok "$f exists" || bad "$f missing"
done

step "2. Implementation files exist (backend-dev's deliverable)"
for f in products/07-intelligence/app/domain/intelligence-snapshot.ts products/07-intelligence/app/domain/movers.ts; do
  [ -f "$f" ] && ok "$f exists" || bad "$f missing — backend-dev to implement"
done

step "3. Factories named with 'create' prefix per backend-code-style"
if [ -f products/07-intelligence/app/domain/intelligence-snapshot.ts ]; then
  if grep -q 'createIntelligenceSnapshot' products/07-intelligence/app/domain/intelligence-snapshot.ts; then
    ok "createIntelligenceSnapshot factory present"
  else
    bad "createIntelligenceSnapshot factory missing"
  fi
fi
if [ -f products/07-intelligence/app/domain/movers.ts ]; then
  if grep -q 'createMovers' products/07-intelligence/app/domain/movers.ts; then
    ok "createMovers factory present"
  else
    bad "createMovers factory missing"
  fi
fi

step "4. typecheck clean"
if pnpm typecheck > /tmp/m11p4-typecheck.log 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL — see /tmp/m11p4-typecheck.log"
  tail -10 /tmp/m11p4-typecheck.log | sed 's,^,    ,'
fi

step "5. Domain tests GREEN (i-1 + i-2)"
if pnpm exec vitest run products/07-intelligence/tests/intelligence-snapshot-domain.test.ts products/07-intelligence/tests/movers-domain.test.ts > /tmp/m11p4-tests.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m11p4-tests.log | tail -1 || echo "")
  ok "M-L11 P4 domain tests GREEN — $passed"
else
  bad "M-L11 P4 domain tests RED — see /tmp/m11p4-tests.log"
  tail -25 /tmp/m11p4-tests.log | sed 's,^,    ,'
fi

step "6. Full vitest baseline GREEN (regression check per Hard Rule 5)"
if pnpm exec vitest run > /tmp/m11p4-baseline.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m11p4-baseline.log | tail -1 || echo "")
  ok "Full baseline GREEN — $passed"
else
  bad "Full baseline RED — regression introduced"
  tail -30 /tmp/m11p4-baseline.log | sed 's,^,    ,'
fi

echo
echo "M-L11-P4 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
