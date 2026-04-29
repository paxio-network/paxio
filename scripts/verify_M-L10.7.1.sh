#!/usr/bin/env bash
# M-L10.7.1 acceptance — Hero fidelity + disable dark + revert btc- prefix
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${TMPDIR:-/tmp}"

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. RED test exists"
T="apps/frontend/landing/tests/hero-fidelity.test.tsx"
[ -f "$T" ] && ok "$T" || bad "$T missing"

step "2. D-1 — preview.ts has btc- prefix on agent names"
P="apps/frontend/landing/app/data/preview.ts"
if grep -q "btc-escrow.paxio" "$P" && grep -q "btc-dca.paxio" "$P"; then
  ok "preview.ts contains btc-escrow.paxio + btc-dca.paxio"
else
  bad "preview.ts missing btc- prefix on escrow/dca agent names"
fi
# Negative: bare names should NOT exist
if grep -E "(^|[^a-zA-Z0-9_-])escrow\.paxio" "$P" >/dev/null 2>&1; then
  bad "  bare 'escrow.paxio' (no btc- prefix) still present in preview.ts"
else
  ok "  no bare 'escrow.paxio' (only btc- prefixed form)"
fi
if grep -E "(^|[^a-zA-Z0-9_-])dca\.paxio" "$P" >/dev/null 2>&1; then
  bad "  bare 'dca.paxio' (no btc- prefix) still present in preview.ts"
else
  ok "  no bare 'dca.paxio'"
fi

step "3. D-2 — dark theme disabled"
G="apps/frontend/landing/app/globals.css"
if grep -qE 'html\[data-theme=["'"'"']dark["'"'"']\]\s*\{' "$G"; then
  bad "globals.css still has html[data-theme=\"dark\"] block — must remove"
else
  ok "globals.css has no dark-theme override block"
fi
# Also check imported style files
if [ -d apps/frontend/landing/app/styles ]; then
  dark_count=0
  for f in apps/frontend/landing/app/styles/*.css; do
    if grep -qE 'html\[data-theme=["'"'"']dark["'"'"']\]\s*\{' "$f"; then
      dark_count=$((dark_count+1))
      bad "  $f still has dark theme block"
    fi
  done
  [ "$dark_count" -eq 0 ] && ok "  all imported styles dark-block-free"
fi

step "4. typecheck clean"
if pnpm typecheck > "$LOGDIR/m-l10-7-1-typecheck.log" 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL"
  tail -10 "$LOGDIR/m-l10-7-1-typecheck.log" | sed 's,^,    ,'
fi

step "5. landing-app fidelity test GREEN"
if cd apps/frontend/landing && pnpm exec vitest run tests/hero-fidelity.test.tsx > "$LOGDIR/m-l10-7-1-fidelity.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l10-7-1-fidelity.log" | tail -1 || echo "")
  ok "fidelity tests GREEN — $passed"
  cd "$OLDPWD"
else
  bad "fidelity tests RED"
  tail -25 "$LOGDIR/m-l10-7-1-fidelity.log" | sed 's,^,    ,'
  cd "$OLDPWD"
fi

step "6. landing-app full suite GREEN (regression check)"
if pnpm --filter @paxio/landing-app test -- --run > "$LOGDIR/m-l10-7-1-landing.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l10-7-1-landing.log" | tail -1 || echo "")
  ok "landing-app tests GREEN — $passed"
else
  bad "landing-app tests RED"
  tail -25 "$LOGDIR/m-l10-7-1-landing.log" | sed 's,^,    ,'
fi

step "7. landing-app build clean"
if pnpm --filter @paxio/landing-app build > "$LOGDIR/m-l10-7-1-build.log" 2>&1; then
  ok "landing-app build PASS"
else
  bad "landing-app build FAIL"
  tail -10 "$LOGDIR/m-l10-7-1-build.log" | sed 's,^,    ,'
fi

step "8. CSS coverage drift-guard (M-Q20)"
if bash scripts/css-coverage-check.sh landing > "$LOGDIR/m-l10-7-1-css.log" 2>&1; then
  ok "CSS coverage clean"
else
  bad "CSS coverage drift detected"
  tail -10 "$LOGDIR/m-l10-7-1-css.log" | sed 's,^,    ,'
fi

echo
echo "M-L10.7.1 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
