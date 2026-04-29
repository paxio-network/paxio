#!/usr/bin/env bash
# M-Q21 acceptance — backend server CJS syntax gate
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${TMPDIR:-/tmp}"

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. Drift-guard test exists"
T="tests/m-q21-backend-syntax-gate.test.ts"
[ -f "$T" ] && ok "$T" || bad "$T missing"

step "2. quality-gate.sh has step 1.5/6"
QG="scripts/quality-gate.sh"
if grep -qE '1\.5/6' "$QG" && grep -qE 'node --check.*apps/back/server' "$QG"; then
  ok "step 1.5/6 + node --check on apps/back/server present"
else
  bad "quality-gate.sh missing step 1.5/6 (server CJS syntax check)"
fi

step "3. dev-startup.md drift-guards section"
DS=".claude/rules/dev-startup.md"
if grep -qE '4\.1|Drift-guards' "$DS" && grep -qE 'server-syntax-check\.sh' "$DS"; then
  ok "dev-startup.md references server-syntax-check.sh"
else
  bad "dev-startup.md missing server-syntax-check.sh reference"
fi

step "4. reviewer.md J12 present"
RV=".claude/agents/reviewer.md"
if grep -qE 'J12.*Backend server syntax|J12.*server-syntax' "$RV"; then
  ok "J12 entry in reviewer.md"
else
  bad "J12 entry missing in reviewer.md"
fi

step "5. scripts/server-syntax-check.sh exists + executable"
S="scripts/server-syntax-check.sh"
if [ -f "$S" ] && [ -x "$S" ]; then
  ok "$S exists and executable"
else
  bad "$S missing or not executable"
fi

step "6. server-syntax-check.sh smoke — current main.cjs clean"
if bash scripts/server-syntax-check.sh > "$LOGDIR/m-q21-syntax.log" 2>&1; then
  ok "all apps/back/server/*.cjs pass node --check"
else
  bad "server-syntax-check.sh reports syntax error in current dev tip"
  tail -10 "$LOGDIR/m-q21-syntax.log" | sed 's,^,    ,'
fi

step "7. typecheck clean"
if pnpm typecheck > "$LOGDIR/m-q21-typecheck.log" 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL"
  tail -10 "$LOGDIR/m-q21-typecheck.log" | sed 's,^,    ,'
fi

step "8. governance test GREEN"
if pnpm exec vitest run tests/m-q21-backend-syntax-gate.test.ts > "$LOGDIR/m-q21-test.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-q21-test.log" | tail -1 || echo "")
  ok "governance tests GREEN — $passed"
else
  bad "governance tests RED"
  tail -25 "$LOGDIR/m-q21-test.log" | sed 's,^,    ,'
fi

step "9. root vitest baseline preserved"
if pnpm exec vitest run > "$LOGDIR/m-q21-root.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-q21-root.log" | tail -1 || echo "")
  ok "root vitest GREEN — $passed"
else
  bad "root vitest RED"
  tail -25 "$LOGDIR/m-q21-root.log" | sed 's,^,    ,'
fi

echo
echo "M-Q21 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
