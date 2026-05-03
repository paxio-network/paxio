#!/usr/bin/env bash
# TD-FE-transpile acceptance — Next.js apps must transpile @paxio/* shared
# workspace packages.
#
# Pre-existing breakage: `packages/types/src/index.ts` uses `.js` extension
# imports (TS NodeNext convention). 8 frontend apps' `next.config.ts` lack
# `transpilePackages: ['@paxio/types', ...]` — webpack fails to resolve.
# Broke at commit 120988e (M-L1-taxonomy merge, ~April 30); landing CI
# path-filtered and didn't trigger without landing diff, so it stayed
# silent until PR #99 (M-L10.7.3) touched landing.
#
# Run: bash scripts/verify_TD-FE-transpile.sh
# Run via gate: bash scripts/quality-gate.sh TD-FE-transpile

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

# ---------------------------------------------------------------------------
step "1. All 8 frontend apps' next.config.ts include transpilePackages"
# ---------------------------------------------------------------------------
for app in landing registry pay radar intel docs wallet fleet; do
  config="apps/frontend/$app/next.config.ts"
  if [ ! -f "$config" ]; then
    bad "missing $config"
    continue
  fi
  if grep -q "transpilePackages" "$config"; then
    ok "$app — transpilePackages present"
  else
    bad "$app — transpilePackages MISSING in $config"
  fi
done

# ---------------------------------------------------------------------------
step "2. transpilePackages includes @paxio/types (the trigger)"
# ---------------------------------------------------------------------------
for app in landing registry pay radar intel docs wallet fleet; do
  config="apps/frontend/$app/next.config.ts"
  if grep -q "transpilePackages" "$config" 2>/dev/null && \
     grep -A 3 "transpilePackages" "$config" | grep -q "@paxio/types"; then
    ok "$app — @paxio/types in transpilePackages"
  else
    bad "$app — @paxio/types NOT in transpilePackages"
  fi
done

# ---------------------------------------------------------------------------
step "3. landing-app build passes (smoke — was failing before fix)"
# ---------------------------------------------------------------------------
if pnpm --filter @paxio/landing-app build >/tmp/landing-build.log 2>&1; then
  ok "pnpm --filter @paxio/landing-app build succeeded"
else
  bad "pnpm --filter @paxio/landing-app build FAILED"
  tail -15 /tmp/landing-build.log
fi

# ---------------------------------------------------------------------------

echo
echo "TD-FE-transpile ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
