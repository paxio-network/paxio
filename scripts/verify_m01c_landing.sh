#!/usr/bin/env bash
# M01c Landing Implementation — acceptance.
# Pass criteria: backend 7 endpoints return valid shape + frontend renders real data + NO mock code in production.

set -euo pipefail
cd "$(dirname "$0")/.."

# TD-11 fix: ensure log directory exists before any redirect. The script was
# written with paths under $HOME/tmp/ which is not guaranteed on fresh dev
# machines or CI runners. Without this mkdir, the very first redirect
# `>>"$HOME/tmp/m01c-contracts.log"` fails because the directory is missing,
# the `if` branch falls into `bad`, and the failure is indistinguishable
# from a real test failure. Result: 4/29 steps report ❌ FAILED while the
# underlying vitest runs never even started. `mkdir -p` is idempotent and
# creates nothing if the dir already exists.
mkdir -p "$HOME/tmp"

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. Contract tests GREEN"
if pnpm vitest run tests/landing-contracts.test.ts --reporter=dot >>"$HOME/tmp/m01c-contracts.log" 2>&1; then
  ok "landing-contracts.test.ts (41 tests)"
else
  bad "contracts FAILED — see $HOME/tmp/m01c-contracts.log"
fi

step "2. Backend LandingStats factory + 7 handlers exist"
[ -f products/07-intelligence/app/domain/landing-stats.ts ] && ok "domain/landing-stats.ts" || bad "missing domain/landing-stats.ts"
for handler in landing hero ticker agents-top rails network-snapshot heatmap; do
  f="products/07-intelligence/app/api/landing-${handler}.js"
  [ -f "$f" ] && ok "api/landing-${handler}.js" || bad "missing $f"
done

step "3. Backend domain tests GREEN"
if pnpm vitest run products/07-intelligence/tests/landing-stats.test.ts --reporter=dot >>"$HOME/tmp/m01c-backend.log" 2>&1; then
  ok "landing-stats.test.ts GREEN"
else
  bad "backend behavior tests FAILED — see $HOME/tmp/m01c-backend.log"
fi

step "4. Frontend sections exist"
for section in 01-hero 02-quickstart 02b-bitcoin 03-radar 04-pay 05-network 06-doors; do
  f="apps/frontend/landing/app/sections/${section}.tsx"
  [ -f "$f" ] && ok "sections/${section}.tsx" || bad "missing $f"
done

step "5. NO mock code in production"
if grep -rn 'Math\.random\|setInterval' apps/frontend/landing/app/ 2>/dev/null | grep -v '//' | grep -v '\.test\.'; then
  bad "Math.random or setInterval found in production (must use @paxio/api-client + useQuery)"
else
  ok "no fake live-data simulation in production code"
fi

if grep -rn 'const AGENTS\s*=\s*\[' apps/frontend/landing/app/ 2>/dev/null | grep -v '//' | grep -v '\.test\.'; then
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
if pnpm turbo run build --filter=@paxio/landing-app >>"$HOME/tmp/m01c-build.log" 2>&1; then
  ok "landing build"
else
  bad "landing build FAILED — see $HOME/tmp/m01c-build.log"
fi

step "8. Frontend smoke test"
if pnpm vitest run apps/frontend/landing/tests/ --reporter=dot >>"$HOME/tmp/m01c-frontend.log" 2>&1; then
  ok "landing smoke tests"
else
  bad "landing smoke tests FAILED — see $HOME/tmp/m01c-frontend.log"
fi

echo
echo "====================================="
echo "M01c Landing: $PASS passed, $FAIL failed"
echo "====================================="
[ "$FAIL" -eq 0 ] || exit 1
