#!/usr/bin/env bash
# M-L10.7.2 acceptance — Scrolls fidelity (4 copy/styling discrepancies)
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${TMPDIR:-/tmp}"

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. RED test exists"
T="apps/frontend/landing/tests/scrolls-fidelity.test.tsx"
[ -f "$T" ] && ok "$T" || bad "$T missing"

S="apps/frontend/landing/app/sections/02-scrolls-b5.tsx"

step "2. D-1 — ScrollSDK kicker matches design source"
if grep -qE 'kicker=["'"'"'][^"'"'"']*[Ss][Dd][Kk][^"'"'"']*[Bb]uilders["'"'"']' "$S"; then
  ok "ScrollSDK kicker contains 'SDK' + 'builders'"
else
  bad "ScrollSDK kicker doesn't match (target: 'SDK · builders')"
fi
if grep -qE 'kicker=["'"'"']NPM package · developers["'"'"']' "$S"; then
  bad "  legacy 'NPM package · developers' kicker still present"
else
  ok "  no legacy 'NPM package · developers' kicker"
fi

step "3. D-2 — ScrollBitcoin headline says 'Bitcoin address'"
if grep -q "A real Bitcoin address" "$S"; then
  ok "headline contains 'A real Bitcoin address'"
else
  bad "headline missing 'A real Bitcoin address' (target: italic phrase)"
fi
if grep -q "A real on-chain address" "$S"; then
  bad "  legacy 'A real on-chain address' still present"
else
  ok "  no legacy 'on-chain address' headline"
fi

step "4. D-3 — ScrollRadar headline 'We don't host agents.'"
if grep -qE "We don['’]t host agents\." "$S"; then
  ok "headline matches short 'We don't host agents.'"
else
  bad "headline doesn't match target short form"
fi
if grep -q "We do not host agents" "$S"; then
  bad "  legacy 'We do not host agents' still present"
else
  ok "  no legacy long form"
fi
# Check measure them is absent from ScrollRadar specifically
if awk '/function ScrollRadar/,/^function /' "$S" | grep -q "We measure them"; then
  bad "  'We measure them.' still in ScrollRadar block — remove per D-3"
else
  ok "  no 'We measure them.' in ScrollRadar"
fi

step "5. D-4 — ScrollNetwork CTA banner ALL CAPS + dark style"
if grep -q "REGISTER YOUR AGENT" "$S" && grep -q "JOIN THE NETWORK" "$S"; then
  ok "CTA contains ALL CAPS 'REGISTER YOUR AGENT' + 'JOIN THE NETWORK'"
else
  bad "CTA missing ALL CAPS form"
fi
if grep -q "Register your agent — join the network" "$S"; then
  bad "  legacy mixed-case 'Register your agent — join the network' still present"
else
  ok "  no legacy mixed-case CTA"
fi

step "6. typecheck clean"
if pnpm typecheck > "$LOGDIR/m-l10-7-2-typecheck.log" 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL"
  tail -10 "$LOGDIR/m-l10-7-2-typecheck.log" | sed 's,^,    ,'
fi

step "7. landing-app fidelity test GREEN"
if cd apps/frontend/landing && pnpm exec vitest run tests/scrolls-fidelity.test.tsx > "$LOGDIR/m-l10-7-2-fidelity.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l10-7-2-fidelity.log" | tail -1 || echo "")
  ok "fidelity tests GREEN — $passed"
  cd "$OLDPWD"
else
  bad "fidelity tests RED"
  tail -25 "$LOGDIR/m-l10-7-2-fidelity.log" | sed 's,^,    ,'
  cd "$OLDPWD"
fi

step "8. landing-app full suite GREEN (regression check)"
if pnpm --filter @paxio/landing-app test -- --run > "$LOGDIR/m-l10-7-2-landing.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l10-7-2-landing.log" | tail -1 || echo "")
  ok "landing-app tests GREEN — $passed"
else
  bad "landing-app tests RED"
  tail -25 "$LOGDIR/m-l10-7-2-landing.log" | sed 's,^,    ,'
fi

step "9. landing-app build clean"
if pnpm --filter @paxio/landing-app build > "$LOGDIR/m-l10-7-2-build.log" 2>&1; then
  ok "landing-app build PASS"
else
  bad "landing-app build FAIL"
  tail -10 "$LOGDIR/m-l10-7-2-build.log" | sed 's,^,    ,'
fi

step "10. CSS coverage drift-guard (M-Q20)"
if bash scripts/css-coverage-check.sh landing > "$LOGDIR/m-l10-7-2-css.log" 2>&1; then
  ok "CSS coverage clean"
else
  bad "CSS coverage drift detected"
  tail -10 "$LOGDIR/m-l10-7-2-css.log" | sed 's,^,    ,'
fi

echo
echo "M-L10.7.2 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
