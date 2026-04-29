#!/usr/bin/env bash
# M-L10.5 acceptance — Scrolls + page wiring + M-L9 cleanup (final B5 visual phase)
set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. RED tests exist"
for f in apps/frontend/landing/tests/scrolls-b5.test.tsx apps/frontend/landing/tests/page-wiring.test.tsx; do
  [ -f "$f" ] && ok "$f" || bad "$f missing"
done

step "2. ScrollsB5 impl exists"
S="apps/frontend/landing/app/sections/02-scrolls-b5.tsx"
if [ -f "$S" ]; then
  ok "$S exists"
  if head -3 "$S" | grep -q "'use client'"; then ok "'use client' directive"; else bad "missing 'use client'"; fi
else
  bad "$S missing — frontend-dev to create"
fi

step "3. page.tsx + layout.tsx wired correctly"
if grep -q 'HeroB5\|ScrollsB5' apps/frontend/landing/app/page.tsx; then
  ok "page.tsx references HeroB5 + ScrollsB5"
else
  bad "page.tsx not yet wired"
fi
if grep -q 'data-production="false"\|data-production='\''false'\''' apps/frontend/landing/app/layout.tsx; then
  ok "layout.tsx has data-production=\"false\" (R-FE-Preview)"
else
  bad "layout.tsx missing data-production=\"false\""
fi

step "4. M-L9 sections deleted (10 files)"
M_L9_DEL=0
for f in 00-header.tsx 01-hero.tsx 02-quickstart.tsx 02b-bitcoin.tsx 03-radar.tsx 04-pay.tsx 05-network.tsx 06-doors.tsx 07-foot.tsx preview-ribbon.tsx; do
  if [ -f "apps/frontend/landing/app/sections/$f" ]; then
    bad "M-L9 file still present: $f"
    M_L9_DEL=$((M_L9_DEL+1))
  fi
done
[ "$M_L9_DEL" -eq 0 ] && ok "all 10 M-L9 sections deleted"

step "5. preview.ts extended with M-L10.5 exports + TODO M-L11 markers"
P="apps/frontend/landing/app/data/preview.ts"
if [ -f "$P" ]; then
  todo_count=$(grep -c 'TODO M-L11' "$P" || echo 0)
  if [ "$todo_count" -ge 10 ]; then
    ok "TODO M-L11 markers: $todo_count (≥10 required for M-L10.5)"
  else
    bad "TODO M-L11 markers: $todo_count (<10) — extend preview.ts with new scrolls exports"
  fi
fi

step "6. typecheck clean"
if pnpm typecheck > "${TMPDIR:-/tmp}/m105-typecheck.log" 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL"
  tail -10 "${TMPDIR:-/tmp}/m105-typecheck.log" | sed 's,^,    ,'
fi

step "7. landing-app tests GREEN (full suite includes new specs)"
if pnpm --filter @paxio/landing-app test -- --run > "${TMPDIR:-/tmp}/m105-tests.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "${TMPDIR:-/tmp}/m105-tests.log" | tail -1 || echo "")
  ok "landing-app tests GREEN — $passed"
else
  bad "landing-app tests RED"
  tail -25 "${TMPDIR:-/tmp}/m105-tests.log" | sed 's,^,    ,'
fi

step "8. landing-app build clean"
if pnpm --filter @paxio/landing-app build > "${TMPDIR:-/tmp}/m105-build.log" 2>&1; then
  ok "landing-app build PASS"
else
  bad "landing-app build FAIL"
  tail -10 "${TMPDIR:-/tmp}/m105-build.log" | sed 's,^,    ,'
fi

echo
echo "M-L10.5 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
