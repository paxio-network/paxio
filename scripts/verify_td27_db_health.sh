#!/usr/bin/env bash
# TD-27 acceptance — postgres-storage.js works with @paxio/types bundled.
#
# Pre-fix state (verified 2026-04-25 against live api.paxio.network):
#   Container startup log:
#     "Cannot find package '@paxio/types' imported from
#      /app/dist/products/01-registry/app/infra/postgres-storage.js"
#     "createDbClient failed — using no-op"
#   /health → checks.database = 'skipped'
#
# Post-fix expectation:
#   - postgres-storage.js bundle has no top-level @paxio/* imports
#   - main.cjs successfully wires real PostgresStorage
#   - /health → checks.database = 'ok'
#
# This script boots a fresh Postgres container + main.cjs locally,
# hits /health, asserts checks.database='ok'.
#
# Cleanup: stops Postgres container (docker rm -f), kills server PID.
# All artifacts in /tmp/ to avoid TD-11.

set -euo pipefail
cd "$(dirname "$0")/.."

LOG="/tmp/td27-server.log"
: > "$LOG"

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

PG_CONTAINER="paxio-td27-pg"
PG_PORT="5439"   # Off-default to avoid stomping on local dev Postgres
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

step "1. pnpm run build (must include any new bundling step T-3 adds)"
if pnpm run build >>"$LOG" 2>&1; then
  ok "build succeeded"
else
  bad "build FAILED — see $LOG"
  exit 1
fi

step "2. Bundled postgres-storage.js has no top-level @paxio/* imports (TD-27 drift)"
DIST="dist/products/01-registry/app/infra/postgres-storage.js"
if [ ! -f "$DIST" ]; then
  bad "$DIST not built"
  exit 1
fi
if grep -qE "^[[:space:]]*import.*from[[:space:]]+['\"]@paxio/" "$DIST"; then
  bad "$DIST still has top-level @paxio/* imports (bundling not applied):"
  grep -nE "^[[:space:]]*import.*from[[:space:]]+['\"]@paxio/" "$DIST" | head -3 | sed 's/^/    /'
else
  ok "no top-level @paxio/* imports in $DIST"
fi

step "3. Boot Postgres 16-alpine on :$PG_PORT"
docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
if docker run -d --name "$PG_CONTAINER" \
  -e POSTGRES_DB=paxio \
  -e POSTGRES_USER=paxio \
  -e POSTGRES_PASSWORD=paxio \
  -p "127.0.0.1:$PG_PORT:5432" \
  postgres:16-alpine >/dev/null 2>>"$LOG"; then
  ok "Postgres container started"
else
  bad "Postgres container failed to start — see $LOG"
  exit 1
fi

# Wait up to 20s for Postgres to accept connections
PG_READY=false
for i in $(seq 1 20); do
  if docker exec "$PG_CONTAINER" pg_isready -U paxio -d paxio >/dev/null 2>&1; then
    PG_READY=true
    ok "Postgres accepts connections (after ${i}s)"
    break
  fi
  sleep 1
done
[ "$PG_READY" = true ] || { bad "Postgres never became ready"; exit 1; }

step "4. Boot main.cjs with valid DATABASE_URL on :3403"
DATABASE_URL="postgres://paxio:paxio@127.0.0.1:$PG_PORT/paxio" \
PORT=3403 HOST=127.0.0.1 LOG_LEVEL=warn \
RUN_MIGRATIONS=true \
  node apps/back/server/main.cjs >>"$LOG" 2>&1 &
SERVER_PID=$!
echo "  Started server pid=$SERVER_PID"

BOUND=false
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3403/health >/dev/null 2>&1; then
    BOUND=true
    ok "server listening (port 3403 responsive after ${i}s)"
    break
  fi
  sleep 1
done
[ "$BOUND" = true ] || { bad "server never bound port 3403 — see $LOG"; exit 1; }

step "5. /health body — checks.database='ok' (THE TD-27 fix)"
HEALTH_BODY=$(curl -sf http://127.0.0.1:3403/health)
echo "$HEALTH_BODY" | jq . 2>/dev/null | head -10 | sed 's/^/    /'

if echo "$HEALTH_BODY" | grep -q '"database":"ok"'; then
  ok "checks.database = 'ok' (postgres-storage successfully imported)"
elif echo "$HEALTH_BODY" | grep -q '"database":"skipped"'; then
  bad "checks.database = 'skipped' — bundling fix not applied"
  echo "  Server log tail:"
  tail -20 "$LOG" | sed 's/^/    /'
elif echo "$HEALTH_BODY" | grep -q '"database":"error"'; then
  bad "checks.database = 'error' — DB unreachable (Postgres connection issue, not TD-27)"
else
  bad "checks.database missing or unknown — body: $HEALTH_BODY"
fi

step "6. checks.database stays 'ok' after a few requests (storage stable)"
STILL_OK=true
for i in 1 2 3; do
  R=$(curl -sf http://127.0.0.1:3403/health)
  echo "$R" | grep -q '"database":"ok"' || STILL_OK=false
done
if [ "$STILL_OK" = true ]; then
  ok "checks.database stayed 'ok' across 3 polls"
else
  bad "checks.database flipped — storage unstable"
fi

step "7. Server log shows NO 'createDbClient failed' warning"
if grep -q "createDbClient failed" "$LOG"; then
  bad "server log contains 'createDbClient failed' — TD-27 regression"
  grep "createDbClient failed" "$LOG" | head -3 | sed 's/^/    /'
else
  ok "no 'createDbClient failed' in startup log"
fi

step "8. After M-L8.4 closes — flip verify_M-L8_smoke.sh step 6 back to strict"
echo "  [reminder] scripts/verify_M-L8_smoke.sh step 6 currently soft-accepts"
echo "  'skipped'. Once T-3 lands and TD-27 closes, replace the elif branch"
echo "  with strict-only 'ok' assertion."

echo
echo "─────────────────────────────────────────────"
echo "TD-27 ACCEPTANCE — PASS=$PASS  FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "TD-27: postgres-storage.js bundled with @paxio/types inlined."
echo "main.cjs successfully wires real PostgresStorage; /health reports checks.database='ok'."
