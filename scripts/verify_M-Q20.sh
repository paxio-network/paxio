#!/usr/bin/env bash
# M-Q20 acceptance — frontend visual workflow governance
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${TMPDIR:-/tmp}"

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. Drift-guard test exists"
T="tests/m-q20-frontend-visual-governance.test.ts"
[ -f "$T" ] && ok "$T" || bad "$T missing"

step "2. dev-startup.md Step 4.1 mandate present"
DS=".claude/rules/dev-startup.md"
if grep -qE '4\.1' "$DS" && grep -qE 'css-coverage-check\.sh' "$DS"; then
  ok "Step 4.1 + script reference present"
else
  bad "dev-startup.md missing Step 4.1 / css-coverage-check.sh reference"
fi

step "3. reviewer.md J9/J10/J11 visual checks present"
RV=".claude/agents/reviewer.md"
RV_MISS=0
for j in 'J9.*CSS coverage' 'J10.*Visual diff' 'J11.*parity'; do
  if grep -qE "$j" "$RV"; then
    ok "  $j present"
  else
    bad "  $j missing in reviewer.md"
    RV_MISS=$((RV_MISS+1))
  fi
done

step "4. scripts/css-coverage-check.sh exists + executable"
S="scripts/css-coverage-check.sh"
if [ -f "$S" ] && [ -x "$S" ]; then
  ok "$S exists and executable"
else
  bad "$S missing or not executable"
fi

step "5. css-coverage-check.sh smoke — empty-sections app exits 0"
# wallet has no sections/ → must exit 0 with informational message
if bash scripts/css-coverage-check.sh wallet > "$LOGDIR/m-q20-wallet.log" 2>&1; then
  ok "  wallet (no sections) exit 0"
else
  bad "  wallet exit non-zero unexpectedly"
  tail -5 "$LOGDIR/m-q20-wallet.log" | sed 's,^,    ,'
fi

step "6. typecheck clean"
if pnpm typecheck > "$LOGDIR/m-q20-typecheck.log" 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL"
  tail -10 "$LOGDIR/m-q20-typecheck.log" | sed 's,^,    ,'
fi

step "7. governance test GREEN"
if pnpm exec vitest run tests/m-q20-frontend-visual-governance.test.ts > "$LOGDIR/m-q20-test.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-q20-test.log" | tail -1 || echo "")
  ok "governance tests GREEN — $passed"
else
  bad "governance tests RED"
  tail -25 "$LOGDIR/m-q20-test.log" | sed 's,^,    ,'
fi

step "8. root vitest baseline preserved"
if pnpm exec vitest run > "$LOGDIR/m-q20-root.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-q20-root.log" | tail -1 || echo "")
  ok "root vitest GREEN — $passed"
else
  bad "root vitest RED"
  tail -25 "$LOGDIR/m-q20-root.log" | sed 's,^,    ,'
fi

echo
echo "M-Q20 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
