#!/usr/bin/env bash
# M-L8 Backend Deploy — local stack acceptance.
#
# Pass criteria: docker-compose dev stack boots clean → backend container
# becomes healthy → curl /health returns 200 + ZodHealthResponse-valid body
# with checks.database='ok' (Postgres reachable from inside the container
# network).
#
# This script mirrors the runbook a Hetzner operator would run after a fresh
# `git pull` on the repo. It does NOT push images to ghcr.io — that's CI's
# job (`.github/workflows/deploy-backend.yml`). It builds locally to prove
# the Dockerfile.production is sane.
#
# Pattern ported from /home/openclaw/PROJECT verify acceptance scripts.
# Compose stack is the dev one (build: . — local), not docker-compose.production.yml
# (image: ghcr.io/... — used on Hetzner host).

set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p "$HOME/tmp"

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

cleanup() {
  echo
  echo "▶ Cleanup: docker compose down"
  docker compose down -v --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

step "1. Required files present (committed by backend-dev T-4/T-5)"
[ -f Dockerfile.production ] && ok "Dockerfile.production" || bad "missing Dockerfile.production"
[ -f docker-compose.yml ] && ok "docker-compose.yml" || bad "missing docker-compose.yml"
[ -f .dockerignore ] && ok ".dockerignore" || bad "missing .dockerignore"

step "2. Health unit test GREEN (T-3 done)"
if pnpm vitest run tests/health-endpoint.test.ts --reporter=dot >>"$HOME/tmp/m-l8-unit.log" 2>&1; then
  ok "tests/health-endpoint.test.ts (8 tests)"
else
  bad "health-endpoint tests FAILED — see $HOME/tmp/m-l8-unit.log"
fi

step "3. Docker build (Dockerfile.production)"
if docker build -f Dockerfile.production -t paxio-backend:m-l8-local . >>"$HOME/tmp/m-l8-build.log" 2>&1; then
  ok "image built — paxio-backend:m-l8-local"
else
  bad "docker build FAILED — see $HOME/tmp/m-l8-build.log"
  exit 1
fi

step "4. Compose up -d (backend + postgres + redis + qdrant)"
if docker compose up -d --build >>"$HOME/tmp/m-l8-compose.log" 2>&1; then
  ok "stack started"
else
  bad "docker compose up FAILED — see $HOME/tmp/m-l8-compose.log"
  exit 1
fi

step "5. Wait for backend container to become healthy (max 90s)"
HEALTHY=false
for i in $(seq 1 18); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' paxio-backend 2>/dev/null || echo "starting")
  if [ "$STATUS" = "healthy" ]; then
    HEALTHY=true
    ok "backend healthy after ${i}×5s"
    break
  fi
  sleep 5
done
if [ "$HEALTHY" = false ]; then
  bad "backend never reached healthy in 90s"
  echo "--- Container logs (last 50 lines) ---"
  docker logs paxio-backend --tail=50 2>&1 || true
  exit 1
fi

step "6. curl GET /health returns 200"
HEALTH_BODY=$(curl -sf http://127.0.0.1:3001/health || echo "")
if [ -n "$HEALTH_BODY" ]; then
  ok "GET /health 200 OK"
  echo "  body: $HEALTH_BODY"
else
  bad "curl /health failed (no 2xx response)"
fi

step "7. /health body has expected shape (status, timestamp, version, service, checks)"
if echo "$HEALTH_BODY" | grep -q '"status"' && \
   echo "$HEALTH_BODY" | grep -q '"timestamp"' && \
   echo "$HEALTH_BODY" | grep -q '"version"' && \
   echo "$HEALTH_BODY" | grep -q '"service"' && \
   echo "$HEALTH_BODY" | grep -q '"checks"'; then
  ok "shape: status + timestamp + version + service + checks"
else
  bad "shape mismatch — body: $HEALTH_BODY"
fi

step "8. checks.database='ok' (Postgres reachable from backend container)"
if echo "$HEALTH_BODY" | grep -q '"database":"ok"'; then
  ok "checks.database=ok"
else
  bad "checks.database != ok — body: $HEALTH_BODY"
fi

step "9. status='ok' (no degraded subsystems)"
if echo "$HEALTH_BODY" | grep -q '"status":"ok"'; then
  ok "status=ok"
else
  bad "status != ok — body: $HEALTH_BODY"
fi

echo
echo "─────────────────────────────────────────────"
echo "M-L8 LOCAL ACCEPTANCE — PASS=$PASS  FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "M-L8 local stack: READY for ghcr.io push + Hetzner deploy"
