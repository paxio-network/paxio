#!/usr/bin/env bash
# M-L11-P6 acceptance — Intelligence composition root wiring (W-1)
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${TMPDIR:-/tmp}"

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. RED test exists"
T="products/07-intelligence/tests/intelligence-wiring.test.ts"
[ -f "$T" ] && ok "$T" || bad "$T missing"

step "2. Wiring file extended (backend-dev)"
W="apps/back/server/wiring/07-intelligence.cjs"
if [ -f "$W" ]; then
  if grep -q 'intelligenceSnapshot' "$W"; then
    ok "wiring exposes intelligenceSnapshot"
  else
    bad "wiring missing intelligenceSnapshot — backend-dev to extend wireIntelligenceDomain"
  fi
  if grep -q 'movers' "$W"; then
    ok "wiring exposes movers"
  else
    bad "wiring missing movers — backend-dev to extend wireIntelligenceDomain"
  fi
else
  bad "$W missing"
fi

step "3. Stub adapters scaffolded in infrastructure/"
for f in agent-metrics-repo-stub.cjs movers-repo-stub.cjs cache-memory.cjs; do
  P="apps/back/server/infrastructure/$f"
  if [ -f "$P" ]; then
    ok "$P"
    if grep -qE "TODO M-L1-impl|TODO.*Redis" "$P"; then
      ok "  TODO marker present in $f"
    else
      bad "  TODO M-L1-impl marker missing in $f (drift-guard for replacement walker)"
    fi
  else
    bad "$P missing — backend-dev to create"
  fi
done

step "4. typecheck clean"
if pnpm typecheck > "$LOGDIR/m-l11-p6-typecheck.log" 2>&1; then
  ok "pnpm typecheck PASS"
else
  bad "pnpm typecheck FAIL"
  tail -10 "$LOGDIR/m-l11-p6-typecheck.log" | sed 's,^,    ,'
fi

step "5. wiring test GREEN"
if pnpm exec vitest run products/07-intelligence/tests/intelligence-wiring.test.ts > "$LOGDIR/m-l11-p6-wiring.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l11-p6-wiring.log" | tail -1 || echo "")
  ok "wiring tests GREEN — $passed"
else
  bad "wiring tests RED"
  tail -25 "$LOGDIR/m-l11-p6-wiring.log" | sed 's,^,    ,'
fi

step "6. root vitest baseline preserved"
if pnpm exec vitest run > "$LOGDIR/m-l11-p6-root.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l11-p6-root.log" | tail -1 || echo "")
  ok "root vitest GREEN — $passed"
else
  bad "root vitest RED"
  tail -25 "$LOGDIR/m-l11-p6-root.log" | sed 's,^,    ,'
fi

step "7. landing-app baseline preserved (preview.ts compatibility check)"
if pnpm --filter @paxio/landing-app test -- --run > "$LOGDIR/m-l11-p6-landing.log" 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' "$LOGDIR/m-l11-p6-landing.log" | tail -1 || echo "")
  ok "landing-app tests GREEN — $passed"
else
  bad "landing-app tests RED"
  tail -25 "$LOGDIR/m-l11-p6-landing.log" | sed 's,^,    ,'
fi

echo
echo "M-L11-P6 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
