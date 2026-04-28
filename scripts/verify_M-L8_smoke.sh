#!/usr/bin/env bash
# M-L8 Backend Deploy — production smoke test.
#
# Run AFTER GitHub Actions deploy-backend.yml completes successfully.
# Verifies the production endpoint is reachable, returns 200, and that
# the body matches ZodHealthResponse contract.
#
# Same script is invoked by deploy-backend.yml::Smoke test step
# (`curl -sf https://api.paxio.network/health`) — keeping logic in a
# script means we can run the exact same check locally before merging.
#
# Pattern ported from /home/openclaw/PROJECT/.github/workflows/deploy.yml:84
# "Smoke test" step.

set -euo pipefail
cd "$(dirname "$0")/.."

API_URL="${PAXIO_API_URL:-https://api.paxio.network}"
PASS=0
FAIL=0

ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

step "1. DNS resolves ${API_URL}"
HOST=$(echo "$API_URL" | sed -E 's|https?://([^/]+).*|\1|')
if getent hosts "$HOST" >/dev/null 2>&1 || host "$HOST" >/dev/null 2>&1 || nslookup "$HOST" >/dev/null 2>&1; then
  ok "DNS: $HOST resolves"
else
  bad "DNS: $HOST does NOT resolve — DNS A-record not configured"
  exit 1
fi

step "2. TLS handshake succeeds (api.paxio.network has valid cert)"
if curl -sf -I "$API_URL" --max-time 10 >/dev/null 2>&1 || curl -sf -I "$API_URL/health" --max-time 10 >/dev/null 2>&1; then
  ok "HTTPS reachable"
else
  bad "TLS handshake or routing failed"
fi

step "3. GET /health returns 200"
HTTP_CODE=$(curl -s -o /tmp/m-l8-smoke-body.json -w "%{http_code}" "$API_URL/health" --max-time 10 || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  ok "HTTP 200"
else
  bad "HTTP $HTTP_CODE (expected 200)"
fi

BODY=$(cat /tmp/m-l8-smoke-body.json 2>/dev/null || echo "")

step "4. Body has ZodHealthResponse shape"
if echo "$BODY" | grep -q '"status"' && \
   echo "$BODY" | grep -q '"timestamp"' && \
   echo "$BODY" | grep -q '"version"' && \
   echo "$BODY" | grep -q '"service"' && \
   echo "$BODY" | grep -q '"checks"'; then
  ok "shape: status + timestamp + version + service + checks"
else
  bad "shape mismatch — body: $BODY"
fi

step "5. status='ok' (production stack healthy)"
if echo "$BODY" | grep -q '"status":"ok"'; then
  ok "status=ok"
elif echo "$BODY" | grep -q '"status":"degraded"'; then
  bad "status=degraded — body: $BODY (Caddy reachable, but DB or downstream is unhealthy)"
else
  bad "missing/unknown status — body: $BODY"
fi

step "6. checks.database='ok' (TD-27 closed — strict)"
# TD-27 was: postgres-storage.js had top-level `import { ... } from
# '@paxio/types'` and the production Docker image couldn't resolve the
# workspace symlink → db.cjs caught and returned 'skipped'. Closed by
# 91c27ad's esbuild Pass 2 (inlines @paxio/* into postgres-storage.js).
#
# Now strict: must be 'ok'. Anything else (skipped / error / missing)
# is a regression and should fail the smoke.
if echo "$BODY" | grep -q '"database":"ok"'; then
  ok "checks.database=ok"
else
  bad "checks.database != 'ok' — body: $BODY"
fi

echo
echo "─────────────────────────────────────────────"
echo "M-L8 PROD SMOKE — PASS=$PASS  FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "${API_URL}/health: PRODUCTION OK"
