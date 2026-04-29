#!/usr/bin/env bash
# M-L10.6 acceptance — B5 CSS port hotfix (4 missing files)
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${TMPDIR:-/tmp}"

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. RED test exists"
T="apps/frontend/landing/tests/css-class-coverage.test.tsx"
[ -f "$T" ] && ok "$T" || bad "$T missing"

step "2. Source design CSS files present (5 expected)"
for f in paxio.css hero_variants.css landing_scrolls.css paxio_b3_page.css paxio_b5_fixes.css; do
  P="docs/design/paxio-b5/styles/$f"
  [ -f "$P" ] && ok "$P" || bad "$P missing"
done

step "3. Effective landing stylesheet ≥ 2500 lines"
G="apps/frontend/landing/app/globals.css"
S="apps/frontend/landing/app/styles"
total=0
if [ -f "$G" ]; then total=$(wc -l < "$G"); fi
if [ -d "$S" ]; then
  for f in "$S"/*.css; do [ -f "$f" ] && total=$((total + $(wc -l < "$f"))); done
fi
if [ "$total" -ge 2500 ]; then
  ok "effective stylesheet line count = $total (≥ 2500 required)"
else
  bad "effective stylesheet line count = $total (< 2500) — port hero_variants + landing_scrolls + paxio_b3_page + paxio_b5_fixes"
fi

step "4. Critical Hero classes defined"
HERO_MISSING=0
for c in v-frame v-stage state-strip state-text; do
  if grep -hE "(^|[^a-zA-Z0-9_-])\.${c}([[:space:]]|[,{:.]|$)" "$G" "$S"/*.css >/dev/null 2>&1; then
    ok "  .${c} defined"
  else
    bad "  .${c} missing"
    HERO_MISSING=$((HERO_MISSING+1))
  fi
done

step "5. Critical Scrolls classes defined"
SCROLL_MISSING=0
for c in b3-grid btcv2-hero btcv2-addr-card; do
  if grep -hE "(^|[^a-zA-Z0-9_-])\.${c}([[:space:]]|[,{:.]|$)" "$G" "$S"/*.css >/dev/null 2>&1; then
    ok "  .${c} defined"
  else
    bad "  .${c} missing"
    SCROLL_MISSING=$((SCROLL_MISSING+1))
  fi
done

step "6. typecheck clean"
if pnpm typecheck > "$LOGDIR/m-l10-6-typecheck.log" 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL"
  tail -10 "$LOGDIR/m-l10-6-typecheck.log" | sed 's,^,    ,'
fi

step "7. drift-guard test GREEN"
if pnpm --filter @paxio/landing-app exec vitest run tests/css-class-coverage.test.tsx > "$LOGDIR/m-l10-6-drift.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l10-6-drift.log" | tail -1 || echo "")
  ok "drift-guard tests GREEN — $passed"
else
  bad "drift-guard tests RED"
  tail -25 "$LOGDIR/m-l10-6-drift.log" | sed 's,^,    ,'
fi

step "8. landing-app full suite GREEN (regression check)"
if pnpm --filter @paxio/landing-app test -- --run > "$LOGDIR/m-l10-6-landing.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l10-6-landing.log" | tail -1 || echo "")
  ok "landing-app tests GREEN — $passed"
else
  bad "landing-app tests RED"
  tail -25 "$LOGDIR/m-l10-6-landing.log" | sed 's,^,    ,'
fi

step "9. landing-app build clean"
if pnpm --filter @paxio/landing-app build > "$LOGDIR/m-l10-6-build.log" 2>&1; then
  ok "landing-app build PASS"
else
  bad "landing-app build FAIL"
  tail -10 "$LOGDIR/m-l10-6-build.log" | sed 's,^,    ,'
fi

echo
echo "M-L10.6 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
