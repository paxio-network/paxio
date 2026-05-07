#!/usr/bin/env bash
# M-L10.7.3 acceptance — Header + Footer refactor to design class names
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${TMPDIR:-/tmp}"

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

T="apps/frontend/landing/tests/header-footer-classes.test.tsx"
H="packages/ui/src/Header.tsx"
F="packages/ui/src/Footer.tsx"
L="apps/frontend/landing/app/layout.tsx"

step "1. RED test exists"
[ -f "$T" ] && ok "$T" || bad "$T missing"

step "2. D-1 — Header uses id=\"paxio-header\" + hdr-* classes"
if grep -q 'id="paxio-header"' "$H"; then
  ok "id=\"paxio-header\" present"
else
  bad "id=\"paxio-header\" missing — design source uses #paxio-header selector"
fi
H_MISS=0
for cls in hdr-inner hdr-brand hdr-mark hdr-wordmark hdr-links hdr-actions; do
  if grep -qE "className=\"[^\"]*\b${cls}\b" "$H"; then
    ok "  .${cls} applied"
  else
    bad "  .${cls} not applied"
    H_MISS=$((H_MISS+1))
  fi
done

step "3. D-1 — Header inline style blocks ≤4"
H_STYLES=$(grep -cE 'style=\{\{' "$H" || echo 0)
if [ "$H_STYLES" -le 4 ]; then
  ok "Header.tsx style={{}} count = $H_STYLES (≤4 — only SVG-internal)"
else
  bad "Header.tsx has $H_STYLES style={{}} blocks (>4 — refactor to CSS classes)"
fi

step "4. D-2 — Footer uses id=\"page-foot\" + foot-* classes"
if grep -q 'id="page-foot"' "$F"; then
  ok "id=\"page-foot\" present"
else
  bad "id=\"page-foot\" missing"
fi
for cls in foot-inner foot-brand foot-mark foot-tagline foot-cols foot-h foot-legal; do
  if grep -qE "className=\"[^\"]*\b${cls}\b" "$F"; then
    ok "  .${cls} applied"
  else
    bad "  .${cls} not applied"
  fi
done

step "5. D-2 — Footer inline style blocks ≤4"
F_STYLES=$(grep -cE 'style=\{\{' "$F" || echo 0)
if [ "$F_STYLES" -le 4 ]; then
  ok "Footer.tsx style={{}} count = $F_STYLES (≤4 — only SVG-internal)"
else
  bad "Footer.tsx has $F_STYLES style={{}} blocks (>4 — refactor to CSS classes)"
fi

step "6. D-3 — layout.tsx body data-attrs"
for attr in 'data-density="regular"' 'data-accent="classic"' 'data-production="false"' 'data-motion='; do
  if grep -qE "$attr" "$L"; then
    ok "  $attr present"
  else
    bad "  $attr missing"
  fi
done

step "7. typecheck clean"
if pnpm typecheck > "$LOGDIR/m-l10-7-3-typecheck.log" 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL"
  tail -10 "$LOGDIR/m-l10-7-3-typecheck.log" | sed 's,^,    ,'
fi

step "8. landing-app fidelity test GREEN"
if cd apps/frontend/landing && pnpm exec vitest run tests/header-footer-classes.test.tsx > "$LOGDIR/m-l10-7-3-classes.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l10-7-3-classes.log" | tail -1 || echo "")
  ok "header-footer-classes tests GREEN — $passed"
  cd "$OLDPWD"
else
  bad "header-footer-classes tests RED"
  tail -25 "$LOGDIR/m-l10-7-3-classes.log" | sed 's,^,    ,'
  cd "$OLDPWD"
fi

step "9. landing-app full suite GREEN"
if pnpm --filter @paxio/landing-app test -- --run > "$LOGDIR/m-l10-7-3-landing.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l10-7-3-landing.log" | tail -1 || echo "")
  ok "landing-app tests GREEN — $passed"
else
  bad "landing-app tests RED"
  tail -25 "$LOGDIR/m-l10-7-3-landing.log" | sed 's,^,    ,'
fi

step "10. landing-app build clean (per-app — catches Next ESLint)"
if pnpm --filter @paxio/landing-app build > "$LOGDIR/m-l10-7-3-build.log" 2>&1; then
  ok "landing-app build PASS"
else
  bad "landing-app build FAIL"
  tail -10 "$LOGDIR/m-l10-7-3-build.log" | sed 's,^,    ,'
fi

step "11. CSS coverage drift-guard (M-Q20)"
if bash scripts/css-coverage-check.sh landing > "$LOGDIR/m-l10-7-3-css.log" 2>&1; then
  ok "CSS coverage clean"
else
  bad "CSS coverage drift"
  tail -10 "$LOGDIR/m-l10-7-3-css.log" | sed 's,^,    ,'
fi

echo
echo "M-L10.7.3 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
