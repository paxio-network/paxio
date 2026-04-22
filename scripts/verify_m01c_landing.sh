#!/usr/bin/env bash
# M01c Landing Implementation — acceptance.
# Pass criteria: backend 7 endpoints return valid shape + frontend renders real data + NO mock code in production.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. Contract tests GREEN"
if pnpm vitest run tests/marketing-contracts.test.ts --reporter=dot >/tmp/m01c-contracts.log 2>&1; then
  ok "marketing-contracts.test.ts (41 tests)"
else
  bad "contracts FAILED — see /tmp/m01c-contracts.log"
fi

step "2. Backend MarketingStats factory + 7 handlers exist"
[ -f products/07-intelligence/app/domain/marketing-stats.ts ] && ok "domain/marketing-stats.ts" || bad "missing domain/marketing-stats.ts"
for handler in landing hero ticker agents-top rails network-snapshot heatmap; do
  f="products/07-intelligence/app/api/marketing-${handler}.js"
  [ -f "$f" ] && ok "api/marketing-${handler}.js" || bad "missing $f"
done

step "3. Backend domain tests GREEN"
if pnpm vitest run products/07-intelligence/tests/marketing-stats.test.ts --reporter=dot >/tmp/m01c-backend.log 2>&1; then
  ok "marketing-stats.test.ts GREEN"
else
  bad "backend behavior tests FAILED — see /tmp/m01c-backend.log"
fi

step "4. Frontend sections exist"
for section in 01-hero 02-quickstart 02b-bitcoin 03-radar 04-pay 05-network 06-doors; do
  f="apps/frontend/marketing/app/sections/${section}.tsx"
  [ -f "$f" ] && ok "sections/${section}.tsx" || bad "missing $f"
done

step "5. NO mock code in production"
if grep -rn 'Math\.random\|setInterval' apps/frontend/marketing/app/ 2>/dev/null | grep -v '//' | grep -v '\.test\.'; then
  bad "Math.random or setInterval found in production (must use @paxio/api-client + useQuery)"
else
  ok "no fake live-data simulation in production code"
fi

if grep -rn 'const AGENTS\s*=\s*\[' apps/frontend/marketing/app/ 2>/dev/null | grep -v '//' | grep -v '\.test\.'; then
  bad "hardcoded AGENTS array found in production"
else
  ok "no hardcoded AGENTS array in production code"
fi

step "6. @paxio/ui key landing components"
for comp in LiveTicker AgentTable Sparkline FAPDiagram NetworkGraph TerminalWidget HeatmapGrid SectionFrame; do
  if grep -rl "export.*${comp}" packages/ui/src/ >/dev/null 2>&1; then
    ok "@paxio/ui exports ${comp}"
  else
    bad "@paxio/ui missing ${comp}"
  fi
done

step "7. Frontend build clean"
if pnpm turbo run build --filter=marketing >/tmp/m01c-build.log 2>&1; then
  ok "marketing build"
else
  bad "marketing build FAILED — see /tmp/m01c-build.log"
fi

step "8. Frontend smoke test"
if pnpm vitest run apps/frontend/marketing/tests/ --reporter=dot >/tmp/m01c-frontend.log 2>&1; then
  ok "marketing smoke tests"
else
  bad "marketing smoke tests FAILED — see /tmp/m01c-frontend.log"
fi

echo
echo "====================================="
echo "M01c Landing: $PASS passed, $FAIL failed"
echo "====================================="
[ "$FAIL" -eq 0 ] || exit 1
