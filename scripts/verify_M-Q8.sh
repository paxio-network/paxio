#!/usr/bin/env bash
# M-Q8 acceptance — Dev startup protocol split (kill bloated reads for devs).
#
# Verifies: dev-startup.md narrow globs + content invariants + size limit;
# startup-protocol.md deprecated to globs:[] redirect stub.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

DEV=".claude/rules/dev-startup.md"
LEGACY=".claude/rules/startup-protocol.md"

step "1. dev-startup.md exists"
if [ -f "$DEV" ]; then
  ok "$DEV present"
else
  bad "$DEV missing"
  echo "M-Q8 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
  exit 1
fi

step "2. dev-startup.md frontmatter — narrow globs"
if head -5 "$DEV" | grep -qE 'globs:\s*\[.*apps/\*\*'; then
  ok "globs include apps/**"
else
  bad "globs missing apps/**"
fi
if head -5 "$DEV" | grep -qE 'globs:\s*\[.*products/\*\*'; then
  ok "globs include products/**"
else
  bad "globs missing products/**"
fi
if head -5 "$DEV" | grep -qE 'globs:\s*\[.*packages/\*\*'; then
  ok "globs include packages/**"
else
  bad "globs missing packages/**"
fi
if head -5 "$DEV" | grep -qE 'globs:\s*\[.*platform/\*\*'; then
  ok "globs include platform/**"
else
  bad "globs missing platform/**"
fi

step "3. dev-startup.md does NOT have docs/** in globs (so opening sprint does NOT auto-load)"
if head -5 "$DEV" | grep -qE 'globs:\s*\[.*docs/\*\*'; then
  bad "globs MUST NOT include docs/** — would re-trigger old bloat"
else
  ok "globs exclude docs/**"
fi

step "4. dev-startup.md size ≤ 1500 bytes"
size=$(wc -c < "$DEV")
if [ "$size" -le 1500 ]; then
  ok "size $size bytes ≤ 1500"
else
  bad "size $size bytes > 1500 (terse, no rationale dump)"
fi

step "5. dev-startup.md content invariants — forbids bloated reads"
if grep -q 'tech-debt\.md' "$DEV"; then
  ok "mentions tech-debt.md (in forbid context)"
else
  bad "missing reference to tech-debt.md (must explicitly forbid)"
fi
if grep -q 'project-state\.md' "$DEV"; then
  ok "mentions project-state.md (in forbid context)"
else
  bad "missing reference to project-state.md (must explicitly forbid)"
fi
if grep -q 'feature-areas' "$DEV"; then
  ok "mentions feature-areas (in forbid context)"
else
  bad "missing reference to docs/feature-areas/ (must explicitly forbid whole-read)"
fi

step "6. dev-startup.md describes 5-step workflow"
for term in worktree identit commit; do
  if grep -qiE "$term" "$DEV"; then
    ok "step keyword '$term' present"
  else
    bad "step keyword '$term' missing"
  fi
done

step "7. dev-startup.md reminds: no push / no gh pr"
if grep -qiE "no push|gh pr|architect handles" "$DEV"; then
  ok "push/PR boundary stated"
else
  bad "missing 'no push, architect handles push+PR' reminder"
fi

step "8. startup-protocol.md (legacy) has globs: []"
if head -5 "$LEGACY" | grep -qE 'globs:\s*\[\s*\]'; then
  ok "legacy startup-protocol.md is globs:[] (deprecated, no auto-load)"
else
  bad "legacy startup-protocol.md still has broad globs — will re-trigger old bloat"
fi

step "9. startup-protocol.md size ≤ 800 bytes (redirect stub only)"
legacy_size=$(wc -c < "$LEGACY")
if [ "$legacy_size" -le 800 ]; then
  ok "legacy size $legacy_size bytes ≤ 800"
else
  bad "legacy size $legacy_size bytes > 800 (should be short stub)"
fi

step "10. startup-protocol.md redirects to dev-startup.md"
if grep -q 'dev-startup\.md' "$LEGACY"; then
  ok "legacy redirects to dev-startup.md"
else
  bad "legacy missing reference to dev-startup.md"
fi

step "11. drift-guard test GREEN"
if pnpm exec vitest run tests/m-q8-role-aware-startup.test.ts > /tmp/m-q8-tests.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-q8-tests.log | tail -1 || echo "")
  ok "drift-guard $passed"
else
  bad "drift-guard RED — see /tmp/m-q8-tests.log"
  tail -15 /tmp/m-q8-tests.log | sed 's,^,    ,'
fi

step "12. architect/reviewer agent files unchanged (per user scope direction)"
# Architect Required reads should NOT include dev-startup.md or architect-startup.md
if grep -q 'Read \.claude/rules/dev-startup\.md' .claude/agents/architect.md; then
  bad "architect.md should NOT Read dev-startup.md (out of scope)"
else
  ok "architect.md does not Read dev-startup.md"
fi
if grep -q 'Read \.claude/rules/architect-startup\.md' .claude/agents/architect.md; then
  bad "architect-startup.md should not be referenced (M-Q8 limited to dev only per user)"
else
  ok "architect.md does not Read architect-startup.md (correct — out of scope)"
fi
if grep -q 'Read \.claude/rules/reviewer-startup\.md' .claude/agents/reviewer.md; then
  bad "reviewer-startup.md should not be referenced (out of scope per user direction)"
else
  ok "reviewer.md does not Read reviewer-startup.md (correct — reviewer untouched)"
fi

echo
echo "─────────────────────────────────────────────"
echo "M-Q8 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "Dev sessions now auto-load dev-startup.md (~1 KB) instead of startup-protocol.md."
echo "Devs no longer browse tech-debt.md / project-state.md (saves ~30K tokens per session)."
