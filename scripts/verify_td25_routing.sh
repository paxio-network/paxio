#!/usr/bin/env bash
# TD-25 acceptance — VM-sandbox routes actually mount in production.
#
# Continuation of TD-24 (path correctness). After T-24 fix `loadApplication`
# reaches the right `dist/products/` directory. This acceptance verifies
# that the loader can ALSO evaluate the compiled `.js` files inside —
# meaning the ESM-vs-VM gap (`import`/`export` top-level statements
# unparseable by `vm.Script`) is resolved.
#
# Pre-fix (current state on dev): /api/landing/hero returns 404 because
# `vm.Script` throws SyntaxError on landing-stats.js's `import { ... }
# from '@paxio/types'` — caught by main.cjs:118-126 → empty sandbox →
# zero routes mounted.
#
# Post-fix: /api/landing/hero returns either 200 (handler ran with real
# data) or 500 (handler ran but errored without DB) or some other 4xx/5xx
# that's NOT 404. The point is the route is REGISTERED with Fastify;
# whether the handler succeeds is downstream of routing and depends on
# DATABASE_URL presence.
#
# Server log scan: no `Cannot use import statement` SyntaxError, no
# `Application path ... not found or empty` warning.

set -euo pipefail
cd "$(dirname "$0")/.."

LOG="/tmp/td25-server.log"
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

step "1. pnpm run build (compiles + copies handlers + applies any TD-25 transform)"
if pnpm run build >>"$LOG" 2>&1; then
  ok "build succeeded"
else
  bad "build FAILED — see $LOG"
  exit 1
fi

step "2. dist/products contains expected domain + api files"
DIST_FILES=(
  "dist/products/07-intelligence/app/domain/landing-stats.js"
  "dist/products/07-intelligence/app/api/landing-hero.js"
)
for f in "${DIST_FILES[@]}"; do
  if [ -f "$f" ]; then
    ok "$f present"
  else
    bad "$f MISSING (TD-17 would catch this earlier)"
  fi
done

step "3. Domain .js files have NO top-level import/export (vm.Script-compatible)"
for f in dist/products/*/app/domain/*.js; do
  [ -f "$f" ] || continue
  IMPORTS=$(grep -cE '^[[:space:]]*import[[:space:]]+(\{|\*|[A-Za-z_$])' "$f" || true)
  EXPORTS=$(grep -cE '^[[:space:]]*export[[:space:]]+(default|\{|const|let|var|function|class|async)' "$f" || true)
  if [ "$IMPORTS" = "0" ] && [ "$EXPORTS" = "0" ]; then
    ok "$f — no top-level import/export"
  else
    bad "$f — import=$IMPORTS export=$EXPORTS (vm.Script will fail)"
  fi
done

step "4. Boot apps/back/server/main.cjs (DATABASE_URL='', port 3402)"
DATABASE_URL='' PORT=3402 HOST=127.0.0.1 LOG_LEVEL=warn \
  node apps/back/server/main.cjs >>"$LOG" 2>&1 &
SERVER_PID=$!
echo "  Started server pid=$SERVER_PID"

BOUND=false
for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:3402/health >/dev/null 2>&1; then
    BOUND=true
    ok "server bound (http://127.0.0.1:3402/health 200 after ${i}s)"
    break
  fi
  sleep 1
done
if [ "$BOUND" = false ]; then
  bad "server never bound port 3402 in 20s — see $LOG"
  exit 1
fi

step "5. /health returns 200 (M-L8 + TD-24 baseline preserved)"
if curl -sf http://127.0.0.1:3402/health >/dev/null 2>&1; then
  ok "GET /health 200"
else
  bad "GET /health failed"
fi

step "6. /api/landing/hero is REGISTERED (route mounted, not 404)"
HTTP_CODE=$(curl -s -o /tmp/td25-hero.json -w "%{http_code}" \
  http://127.0.0.1:3402/api/landing/hero --max-time 10 || echo "000")
case "$HTTP_CODE" in
  200)
    ok "GET /api/landing/hero → 200 (route mounted + handler succeeded)"
    ;;
  500)
    # Route IS mounted; handler errors expected without DB.
    ok "GET /api/landing/hero → 500 (route mounted; handler errors expected without DB)"
    ;;
  404)
    bad "GET /api/landing/hero → 404 — route NOT mounted (TD-25 NOT fixed)"
    ;;
  *)
    bad "GET /api/landing/hero → $HTTP_CODE (unexpected)"
    ;;
esac

step "7. Server log does NOT contain ESM SyntaxError"
if grep -i 'Cannot use import statement\|SyntaxError' "$LOG" >/dev/null 2>&1; then
  bad "log contains ESM SyntaxError — vm.Script still rejecting domain files"
  echo "  Log excerpt:"
  grep -i 'SyntaxError\|Cannot use' "$LOG" | head -3 | sed 's/^/    /'
else
  ok "no ESM SyntaxError in logs"
fi

step "8. Server log does NOT contain 'Application path not found or empty'"
if grep -i 'Application path .* not found or empty' "$LOG" >/dev/null 2>&1; then
  bad "loadApplication failed — fallback to empty sandbox"
  grep -i 'Application path' "$LOG" | head -3 | sed 's/^/    /'
else
  ok "loadApplication succeeded (no fallback warning)"
fi

echo
echo "─────────────────────────────────────────────"
echo "TD-25 ACCEPTANCE — PASS=$PASS  FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "TD-25: VM sandbox loader evaluates compiled domain files; routes mount."
