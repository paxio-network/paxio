#!/usr/bin/env bash
# M-L10.7.1.5 acceptance — Hero PAEI label parity
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${TMPDIR:-/tmp}"

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

H="apps/frontend/landing/app/sections/01-hero-b5.tsx"
T="apps/frontend/landing/tests/hero-paei-parity.test.tsx"

step "1. RED test exists"
[ -f "$T" ] && ok "$T" || bad "$T missing"

step "2. D-1 — Ticker labels use PAEI·* prefix"
for label in 'PAEI·BTC' 'PAEI·LEGAL' 'PAEI·FINANCE' 'PAEI·RESEARCH' 'PAEI·CX' 'PAEI·AGENTS'; do
  if grep -q "$label" "$H"; then
    ok "  $label present"
  else
    bad "  $label missing"
  fi
done
if grep -qE 'PXI\s+COMPOSITE' "$H"; then
  bad "  legacy 'PXI COMPOSITE' still present"
else
  ok "  no legacy 'PXI COMPOSITE' label"
fi

step "3. D-2 — State strip ends with 'PAEI', not 'PXI Composite'"
if grep -qE 'PAEI\s+<b' "$H"; then
  ok "state strip ends with 'PAEI <b>'"
else
  bad "state strip missing 'PAEI <b>' pattern"
fi
if grep -qE 'PXI\s+Composite' "$H"; then
  bad "  legacy 'PXI Composite' still present"
else
  ok "  no legacy 'PXI Composite'"
fi

step "4. D-3 — drift-justification comment removed"
if grep -q 'keep PAEI text unique in the DOM' "$H"; then
  bad "drift-justification comment still in PaeiTicker"
else
  ok "comment removed"
fi

step "5. typecheck clean"
if pnpm typecheck > "$LOGDIR/m-l10-7-1-5-typecheck.log" 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL"
  tail -10 "$LOGDIR/m-l10-7-1-5-typecheck.log" | sed 's,^,    ,'
fi

step "6. parity test GREEN"
if cd apps/frontend/landing && pnpm exec vitest run tests/hero-paei-parity.test.tsx > "$LOGDIR/m-l10-7-1-5-parity.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l10-7-1-5-parity.log" | tail -1 || echo "")
  ok "parity tests GREEN — $passed"
  cd "$OLDPWD"
else
  bad "parity tests RED"
  tail -25 "$LOGDIR/m-l10-7-1-5-parity.log" | sed 's,^,    ,'
  cd "$OLDPWD"
fi

step "7. landing-app full suite GREEN (regression check)"
if pnpm --filter @paxio/landing-app test -- --run > "$LOGDIR/m-l10-7-1-5-landing.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l10-7-1-5-landing.log" | tail -1 || echo "")
  ok "landing-app tests GREEN — $passed"
else
  bad "landing-app tests RED"
  tail -25 "$LOGDIR/m-l10-7-1-5-landing.log" | sed 's,^,    ,'
fi

step "8. landing-app build clean"
if pnpm --filter @paxio/landing-app build > "$LOGDIR/m-l10-7-1-5-build.log" 2>&1; then
  ok "landing-app build PASS"
else
  bad "landing-app build FAIL"
  tail -10 "$LOGDIR/m-l10-7-1-5-build.log" | sed 's,^,    ,'
fi

echo
echo "M-L10.7.1.5 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
