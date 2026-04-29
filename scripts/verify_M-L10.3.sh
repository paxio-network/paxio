#!/usr/bin/env bash
# M-L10.3 acceptance — Shell components (Header, Footer, PreviewRibbon) for B5 landing
set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. RED tests exist (architect-authored spec)"
for f in packages/ui/tests/header.test.tsx packages/ui/tests/footer.test.tsx packages/ui/tests/preview-ribbon.test.tsx; do
  if [ -f "$f" ]; then ok "$f exists"; else bad "$f missing"; fi
done

step "2. Implementation files exist (frontend-dev's deliverable)"
for f in packages/ui/src/Header.tsx packages/ui/src/Footer.tsx packages/ui/src/PreviewRibbon.tsx; do
  if [ -f "$f" ]; then ok "$f exists"; else bad "$f missing — frontend-dev to implement"; fi
done

step "3. packages/ui/src/index.tsx re-exports all 3 shell components"
if grep -q "export { Header" packages/ui/src/index.tsx; then ok "Header re-exported"; else bad "Header not re-exported from index.tsx"; fi
if grep -q "export { Footer" packages/ui/src/index.tsx; then ok "Footer re-exported"; else bad "Footer not re-exported"; fi
if grep -q "export { PreviewRibbon" packages/ui/src/index.tsx; then ok "PreviewRibbon re-exported"; else bad "PreviewRibbon not re-exported"; fi

step "4. typecheck clean"
if pnpm typecheck > /tmp/m103-typecheck.log 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL — see /tmp/m103-typecheck.log"
  tail -10 /tmp/m103-typecheck.log | sed 's,^,    ,'
fi

step "5. @paxio/ui tests GREEN (including 3 new)"
if pnpm --filter @paxio/ui test -- --run > /tmp/m103-ui-tests.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m103-ui-tests.log | tail -1 || echo "")
  ok "@paxio/ui tests GREEN — $passed"
else
  bad "@paxio/ui tests RED — see /tmp/m103-ui-tests.log"
  tail -25 /tmp/m103-ui-tests.log | sed 's,^,    ,'
fi

step "6. landing-app build clean (consumer of refactored Footer)"
if pnpm --filter @paxio/landing-app build > /tmp/m103-landing-build.log 2>&1; then
  ok "landing-app build PASS"
else
  bad "landing-app build FAIL — Footer breaking change not absorbed"
  tail -10 /tmp/m103-landing-build.log | sed 's,^,    ,'
fi

echo
echo "M-L10.3 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
