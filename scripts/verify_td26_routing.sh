#!/usr/bin/env bash
# TD-26 acceptance — service wiring layer in main.cjs.
#
# Scope: api handlers can reach CONSTRUCTED services through
# `domain['<product>'].<service>.method()`, not raw factory exports.
#
# Pre-fix state (verified 2026-04-25 against live api.paxio.network):
#   GET /api/landing/hero → 500
#   container log:
#     TypeError: Cannot read properties of undefined (reading 'getHero')
#       at evalmachine.<anonymous>:6:60
#
# Post-fix expectation: GET /api/landing/hero → 200 with HeroState shape.
#
# This script boots main.cjs locally with DATABASE_URL='' (no Postgres
# needed — landing-stats has zero-fallbacks for all upstream calls).
# Hits the endpoint; succeeds if 200 + body has `agents`/`txns`/`attacks24`.
#
# OUT OF SCOPE: TD-27 — checks.database='skipped' is acceptable for this
# milestone. M-L8.4 covers postgres-storage ESM bundling separately.

set -euo pipefail
cd "$(dirname "$0")/.."

LOG="/tmp/td26-server.log"
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

step "1. pnpm run build (compiles + bundles VM modules — TD-25)"
if pnpm run build >>"$LOG" 2>&1; then
  ok "build succeeded"
else
  bad "build FAILED — see $LOG"
  exit 1
fi

step "2. Boot main.cjs (DATABASE_URL='', port 3402)"
DATABASE_URL='' PORT=3402 HOST=127.0.0.1 LOG_LEVEL=warn \
  node apps/back/server/main.cjs >>"$LOG" 2>&1 &
SERVER_PID=$!
echo "  Started server pid=$SERVER_PID"

BOUND=false
for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:3402/health >/dev/null 2>&1; then
    BOUND=true
    ok "server listening (port 3402 responsive after ${i}s)"
    break
  fi
  sleep 1
done
[ "$BOUND" = true ] || { bad "server never bound port 3402 — see $LOG"; exit 1; }

step "3. /health is 200 (M-L8 baseline)"
HEALTH_CODE=$(curl -s -o /tmp/td26-health.json -w "%{http_code}" http://127.0.0.1:3402/health)
if [ "$HEALTH_CODE" = "200" ]; then
  ok "GET /health 200"
else
  bad "GET /health http=$HEALTH_CODE"
fi

step "4. /api/landing/hero is 200 (NOT 500 — this is the TD-26 fix)"
HERO_CODE=$(curl -s -o /tmp/td26-hero.json -w "%{http_code}" http://127.0.0.1:3402/api/landing/hero)
if [ "$HERO_CODE" = "200" ]; then
  ok "GET /api/landing/hero 200 (services wired)"
else
  bad "GET /api/landing/hero http=$HERO_CODE — wiring NOT applied"
  echo "  Body:"
  head -3 /tmp/td26-hero.json | sed 's/^/    /'
  echo "  Server log tail:"
  tail -20 "$LOG" | sed 's/^/    /'
fi

step "5. /api/landing/hero body has HeroState shape (agents + txns + attacks24)"
BODY=$(cat /tmp/td26-hero.json 2>/dev/null || echo "")
if echo "$BODY" | grep -q '"agents"' && \
   echo "$BODY" | grep -q '"txns"' && \
   echo "$BODY" | grep -q '"attacks24"'; then
  ok "shape: agents + txns + attacks24"
else
  bad "shape mismatch — body: $BODY"
fi

step "6. /api/landing/hero values can be 0 (real empty state, not faked)"
# Backend convention: zero is real data when upstream is absent.
# We're not asserting non-zero — just that the field is a number.
if echo "$BODY" | python3 -c '
import json, sys
b = json.load(sys.stdin)
assert isinstance(b.get("agents"), int), f"agents not int: {b.get(\"agents\")!r}"
assert isinstance(b.get("txns"), int), f"txns not int: {b.get(\"txns\")!r}"
assert isinstance(b.get("attacks24"), int), f"attacks24 not int: {b.get(\"attacks24\")!r}"
' 2>/dev/null; then
  ok "agents/txns/attacks24 are integers"
else
  bad "value types wrong — body: $BODY"
fi

step "7. /api/fap/rails is 200 (02-facilitator wired too)"
FAP_CODE=$(curl -s -o /tmp/td26-fap.json -w "%{http_code}" http://127.0.0.1:3402/api/fap/rails)
if [ "$FAP_CODE" = "200" ]; then
  ok "GET /api/fap/rails 200 (FAP service wired)"
else
  bad "GET /api/fap/rails http=$FAP_CODE — fap wiring NOT applied"
fi

echo
echo "─────────────────────────────────────────────"
echo "TD-26 ACCEPTANCE — PASS=$PASS  FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "TD-26: service wiring layer mounts constructed services into appSandbox.domain"
echo "/api/landing/hero and /api/fap/rails return 200; api handlers can reach"
echo "domain['<product>'].<service>.<method>() through the wired namespace."
