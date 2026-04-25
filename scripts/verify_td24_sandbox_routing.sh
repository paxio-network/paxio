#!/usr/bin/env bash
# TD-24 acceptance — APPLICATION_PATH resolves to the correct dist/products.
#
# Scope: ONLY path correctness (the literal in main.cjs:40). Boots
# main.cjs and verifies the runtime log proves loadApplication received
# the right directory path — not the buggy <repo>/apps/dist/products.
#
# OUT OF SCOPE: actual route mounting at /api/landing/hero. After T-5,
# `loadApplication` reaches the correct directory but the compiled `.js`
# files have top-level ESM `import` statements (tsconfig emits ESNext).
# `vm.Script` is sync CJS-only and throws SyntaxError → fallback to empty
# sandbox → routes still 404. This is the ESM-vs-VM gap = TD-25 (separate
# milestone). M-L8.1 confirms the path; M-L8.2 / TD-25 fix unlocks
# routing.
#
# TD-17 (verify_build_handlers.sh) covers handler-files-in-dist; this
# script extends one level up — files are correctly copied AND main.cjs
# now points at them. TD-25's script will assert routes mount.
#
# Boot uses DATABASE_URL='' so the pg-pool path stays inert (no Postgres
# required for this acceptance). Server logs go to /tmp; trap kills PID.

set -euo pipefail
cd "$(dirname "$0")/.."

LOG="/tmp/td24-server.log"
# Truncate log so prior runs don't pollute step-5/step-6 grep results.
: > "$LOG"

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "  Stopping server (pid=$SERVER_PID)"
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

step "1. pnpm run build (compiles app handlers + copies them to dist/products/)"
if pnpm run build >>"$LOG" 2>&1; then
  ok "build succeeded"
else
  bad "build FAILED — see $LOG"
  exit 1
fi

step "2. dist/products contains at least one expected handler"
if [ -f dist/products/07-intelligence/app/api/landing-hero.js ]; then
  ok "dist/products/07-intelligence/app/api/landing-hero.js present"
else
  bad "dist/products/07-intelligence/app/api/landing-hero.js MISSING — TD-17 would catch this earlier"
  exit 1
fi

step "3. Boot apps/back/server/main.cjs (DATABASE_URL='', port 3401 to avoid clashes)"
DATABASE_URL='' PORT=3401 HOST=127.0.0.1 LOG_LEVEL=warn \
  node apps/back/server/main.cjs >>"$LOG" 2>&1 &
SERVER_PID=$!
echo "  Started server pid=$SERVER_PID"

# Wait up to 20s for server to bind port
BOUND=false
for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:3401/health >/dev/null 2>&1; then
    BOUND=true
    ok "server is listening (http://127.0.0.1:3401/health 200 after ${i}s)"
    break
  fi
  sleep 1
done
if [ "$BOUND" = false ]; then
  bad "server never bound port 3401 in 20s — see $LOG"
  exit 1
fi

step "4. /health returns 200 (M-L8 baseline still works)"
if curl -sf http://127.0.0.1:3401/health >/dev/null 2>&1; then
  ok "GET /health 200"
else
  bad "GET /health failed"
fi

step "5. Server logs do NOT mention the buggy path /apps/dist/products"
# Pre-fix: APPLICATION_PATH resolves to /<repo>/apps/dist/products and
# main.cjs:122 logs «Application path /<repo>/apps/dist/products not found
# or empty». This is the canonical signature of the path bug. After T-5 the
# log must NOT contain this exact substring (path resolution is now correct).
if grep -F '/apps/dist/products' "$LOG" >/dev/null 2>&1; then
  bad "log still references buggy path /apps/dist/products — fix not applied"
  echo "  Log excerpt:"
  grep -F '/apps/dist/products' "$LOG" | head -3 | sed 's/^/    /'
else
  ok "log does not reference buggy /apps/dist/products"
fi

step "6. Server logs reference the correct dist/products at repo root"
# Either: warn «Application path <repo>/dist/products not found or empty»
# (path is correct but ESM-vs-VM gap = TD-25 still blocks file parsing),
# OR: no warn at all (TD-25 fixed downstream → routes mount successfully).
# Both signal that THIS milestone (TD-24 path fix) succeeded — the path is
# what main.cjs is using.
REPO_DIST=$(node -e "const p=require('node:path');console.log(p.resolve('${PWD}','dist','products'))")
if grep -F "$REPO_DIST" "$LOG" >/dev/null 2>&1; then
  ok "log references correct path: $REPO_DIST"
elif ! grep -i 'not found or empty' "$LOG" >/dev/null 2>&1; then
  ok "no 'not found or empty' warning at all (TD-25 also resolved — bonus)"
else
  bad "log warns 'not found or empty' but path is neither buggy nor correct — anomaly"
  grep -i 'not found or empty\|application path' "$LOG" | head -5 | sed 's/^/    /'
fi

# Note on /api/landing/hero routing:
# Once T-5 lands, APPLICATION_PATH points at the right dir. However
# `loadApplication` then tries to vm.Script-parse compiled .js files
# that contain top-level `import` statements (tsconfig emits ESNext).
# vm.Script is sync CJS-only and throws SyntaxError → catch in main.cjs
# falls back to empty sandbox → /api/landing/hero still 404.
# This is TD-25 (ESM-vs-VM gap), not TD-24. Routing assertion lives in
# scripts/verify_td25_routing.sh (created when TD-25 milestone opens).
# M-L8.1 scope is path-correctness only.

echo
echo "─────────────────────────────────────────────"
echo "TD-24 ACCEPTANCE — PASS=$PASS  FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "TD-24: APPLICATION_PATH resolves to repo-root dist/products."
echo "Note: Routes still 404 due to TD-25 (ESM-vs-VM gap — landing-stats.js"
echo "compiles to ESM, vm.Script can't parse top-level imports). TD-25 is"
echo "out of M-L8.1 scope; tracked as a separate milestone."
