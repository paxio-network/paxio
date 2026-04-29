#!/usr/bin/env bash
# M-Q22 acceptance — reviewer push mandate + chore-coverage drift-guard
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${TMPDIR:-/tmp}"

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. Drift-guard test exists"
T="tests/m-q22-reviewer-chore-coverage.test.ts"
[ -f "$T" ] && ok "$T" || bad "$T missing"

step "2. reviewer.md Phase 13 L4/L5 mandates"
RV=".claude/agents/reviewer.md"
for marker in 'L4.*Push chore' 'L5.*Supersede.*CHANGES'; do
  if grep -qE "$marker" "$RV"; then
    ok "  $marker present"
  else
    bad "  $marker missing"
  fi
done

step "3. reviewer.md Phase 1.8 push procedure"
if grep -qE 'Phase 1\.8.*Push reviewer chore' "$RV" \
   && grep -qE 'git pull --rebase origin dev' "$RV" \
   && grep -qE 'project-state\.md.*tech-debt\.md|narrow' "$RV"; then
  ok "Phase 1.8 procedure present (rebase + narrow scope)"
else
  bad "Phase 1.8 missing required elements"
fi

step "4. scope-guard.md push permissions table"
SG=".claude/rules/scope-guard.md"
if grep -qE 'Push permissions' "$SG" \
   && grep -qE 'reviewer.*narrow|narrow.*reviewer' "$SG"; then
  ok "Push permissions table with reviewer narrow exception"
else
  bad "scope-guard.md missing push permissions table"
fi

step "5. typecheck clean"
if pnpm typecheck > "$LOGDIR/m-q22-typecheck.log" 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL"
  tail -10 "$LOGDIR/m-q22-typecheck.log" | sed 's,^,    ,'
fi

step "6. governance test GREEN"
if pnpm exec vitest run tests/m-q22-reviewer-chore-coverage.test.ts > "$LOGDIR/m-q22-test.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-q22-test.log" | tail -1 || echo "")
  ok "governance tests GREEN — $passed"
else
  bad "governance tests RED"
  tail -25 "$LOGDIR/m-q22-test.log" | sed 's,^,    ,'
fi

step "7. root vitest baseline preserved"
if pnpm exec vitest run > "$LOGDIR/m-q22-root.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-q22-root.log" | tail -1 || echo "")
  ok "root vitest GREEN — $passed"
else
  bad "root vitest RED"
  tail -25 "$LOGDIR/m-q22-root.log" | sed 's,^,    ,'
fi

echo
echo "M-Q22 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
