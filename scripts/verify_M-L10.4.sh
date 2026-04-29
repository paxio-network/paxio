#!/usr/bin/env bash
# M-L10.4 acceptance — Hero (B5 port) + preview.ts data
# Idempotent. PASS=N FAIL=M, fail-fast off — full breakdown for diagnosis.
set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. RED test exists"
F="apps/frontend/landing/tests/hero-b5.test.tsx"
[ -f "$F" ] && ok "$F exists" || bad "$F missing"

step "2. preview.ts impl exists with required exports"
P="apps/frontend/landing/app/data/preview.ts"
if [ -f "$P" ]; then
  ok "$P exists"
  for sym in PREVIEW_AGENTS PREVIEW_TICKER_INITIAL PREVIEW_MOVERS; do
    if grep -q "export const $sym" "$P"; then ok "$sym exported"; else bad "$sym not exported"; fi
  done
  # TODO M-L11 markers — at least 3
  todo_count=$(grep -c 'TODO M-L11' "$P" || echo 0)
  if [ "$todo_count" -ge 3 ]; then
    ok "TODO M-L11 markers: $todo_count (≥3 required per R-FE-Preview)"
  else
    bad "TODO M-L11 markers: $todo_count (<3) — violates R-FE-Preview migration path"
  fi
  # Object.freeze — at least 3 calls
  freeze_count=$(grep -c 'Object\.freeze' "$P" || echo 0)
  if [ "$freeze_count" -ge 3 ]; then
    ok "Object.freeze calls: $freeze_count"
  else
    bad "Object.freeze calls: $freeze_count (<3)"
  fi
else
  bad "$P missing — frontend-dev to create"
fi

step "3. Hero component impl exists"
H="apps/frontend/landing/app/sections/01-hero-b5.tsx"
if [ -f "$H" ]; then
  ok "$H exists"
  if head -5 "$H" | grep -q "'use client'"; then ok "'use client' directive"; else bad "missing 'use client' directive"; fi
  if grep -q 'PREVIEW_AGENTS\|PREVIEW_TICKER_INITIAL\|PREVIEW_MOVERS' "$H"; then
    ok "imports preview data"
  else
    bad "Hero must import from app/data/preview"
  fi
else
  bad "$H missing — frontend-dev to create"
fi

step "4. typecheck clean"
if pnpm typecheck > /tmp/m104-typecheck.log 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL — see /tmp/m104-typecheck.log"
  tail -10 /tmp/m104-typecheck.log | sed 's,^,    ,'
fi

step "5. landing-app tests GREEN (full suite includes new hero-b5 spec)"
if pnpm --filter @paxio/landing-app test -- --run > /tmp/m104-landing-tests.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m104-landing-tests.log | tail -1 || echo "")
  ok "landing-app tests GREEN — $passed"
else
  bad "landing-app tests RED — see /tmp/m104-landing-tests.log"
  tail -25 /tmp/m104-landing-tests.log | sed 's,^,    ,'
fi

step "6. landing-app build clean"
if pnpm --filter @paxio/landing-app build > /tmp/m104-landing-build.log 2>&1; then
  ok "landing-app build PASS"
else
  bad "landing-app build FAIL"
  tail -10 /tmp/m104-landing-build.log | sed 's,^,    ,'
fi

echo
echo "M-L10.4 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
