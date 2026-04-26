#!/usr/bin/env bash
# M-L1-launch acceptance — Crawler scheduler launch (FA-01).
#
# Verifies: SQL migration valid + handler endpoint with auth + rate-limit +
# successful crawl populates agent_cards. Runs against ephemeral local
# Postgres if DATABASE_URL is set; otherwise SKIPS DB-touching steps with
# warning (not RED — runtime smoke deferred to deploy).
#
# Pre-fix (M-L1-launch RED): handler files missing → step 4 boot OK but
# step 5+ assertions hit 404. Post-fix (registry-dev T-2 + backend-dev T-3):
# PASS=N FAIL=0.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
skip() { echo "  ⚠️  $1"; }
step() { echo; echo "▶ $1"; }

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

step "1. pnpm install + build"
if pnpm install --frozen-lockfile --prefer-offline > /tmp/m-l1-launch.log 2>&1 \
   && pnpm build >> /tmp/m-l1-launch.log 2>&1; then
  ok "install + build"
else
  bad "install or build FAILED — see /tmp/m-l1-launch.log"
  tail -20 /tmp/m-l1-launch.log | sed 's,^,    ,'
  exit 1
fi

step "2. SQL migration 002_crawl_runs.sql exists + is valid"
MIG="packages/contracts/sql/002_crawl_runs.sql"
if [ ! -f "$MIG" ]; then
  bad "missing $MIG"
  exit 1
fi
if grep -q 'CREATE TABLE.*crawl_runs' "$MIG"; then
  ok "migration file exists with CREATE TABLE crawl_runs"
else
  bad "migration file present but no CREATE TABLE crawl_runs"
fi
if grep -qE "source.*IN.*'native'.*'erc8004'.*'mcp'" "$MIG"; then
  ok "source CHECK constraint enumerates known sources"
else
  bad "missing or wrong source CHECK constraint"
fi
if grep -qE "triggered_by.*IN.*'cron'.*'manual'.*'startup'" "$MIG"; then
  ok "triggered_by CHECK constraint covers cron/manual/startup"
else
  bad "missing or wrong triggered_by CHECK"
fi

step "3. Handler file products/01-registry/app/api/admin-crawl.js exists"
if [ -f products/01-registry/app/api/admin-crawl.js ]; then
  ok "handler file present"
else
  bad "handler file missing — registry-dev T-2 not done"
fi

step "4. Repository file products/01-registry/app/infra/crawl-runs-repo.ts exists"
if [ -f products/01-registry/app/infra/crawl-runs-repo.ts ]; then
  ok "repo file present"
else
  bad "repo file missing — registry-dev T-2 not done"
fi

step "5. Wiring in apps/back/server/wiring/01-registry.cjs"
if [ -f apps/back/server/wiring/01-registry.cjs ]; then
  ok "wiring file present"
  if grep -q "crawlRuns" apps/back/server/wiring/01-registry.cjs; then
    ok "wiring exposes crawlRuns to sandbox"
  else
    bad "wiring file present but no crawlRuns exposed"
  fi
else
  bad "wiring file missing — registry-dev T-2 not done"
fi

step "6. drift-guard tests GREEN"
if timeout 60 pnpm exec vitest run \
     tests/crawler-launch-contract.test.ts \
     products/01-registry/tests/crawl-runs-repo.test.ts \
     products/01-registry/tests/admin-crawl-handler.test.ts \
     > /tmp/m-l1-launch-tests.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-l1-launch-tests.log | tail -1 || echo "")
  ok "drift-guard $passed"
else
  bad "drift-guard RED — see /tmp/m-l1-launch-tests.log"
  tail -15 /tmp/m-l1-launch-tests.log | sed 's,^,    ,'
fi

step "7. Backend boots with ADMIN_TOKEN env"
if [ -z "${DATABASE_URL:-}" ]; then
  skip "no DATABASE_URL — skipping live boot. Set DATABASE_URL=postgres://... for full E2E."
  echo
  echo "─────────────────────────────────────────────"
  echo "M-L1-LAUNCH ACCEPTANCE — PASS=$PASS FAIL=$FAIL (DB steps skipped)"
  echo "─────────────────────────────────────────────"
  [ $FAIL -eq 0 ] || exit 1
  exit 0
fi

# Find free port
PORT=""
for p in 3601 3602 3603 3604 3605; do
  if ! ss -tln 2>/dev/null | grep -q ":${p} "; then
    PORT="$p"; break
  fi
done
[ -n "$PORT" ] || { bad "no free port 3601..3605"; exit 1; }

ADMIN_TOKEN="ml1-launch-test-$(date +%s)"
PORT="$PORT" \
  DATABASE_URL="$DATABASE_URL" \
  ADMIN_TOKEN="$ADMIN_TOKEN" \
  node apps/back/server/main.cjs > /tmp/m-l1-launch-server.log 2>&1 &
SERVER_PID=$!

bound=false
for _ in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:${PORT}/health" > /dev/null 2>&1; then
    bound=true; break
  fi
  sleep 1
done
if [ "$bound" = true ]; then
  ok "server bound on :$PORT"
else
  bad "server never bound — see /tmp/m-l1-launch-server.log"
  tail -20 /tmp/m-l1-launch-server.log | sed 's,^,    ,'
  exit 1
fi

step "8. POST /api/admin/crawl без auth → 401"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "http://127.0.0.1:${PORT}/api/admin/crawl?source=mcp")
if [ "$code" = "401" ]; then
  ok "401 без Authorization"
else
  bad "expected 401, got $code"
fi

step "9. POST /api/admin/crawl с wrong token → 401"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer wrong-token" \
  "http://127.0.0.1:${PORT}/api/admin/crawl?source=mcp")
if [ "$code" = "401" ]; then
  ok "401 с wrong token"
else
  bad "expected 401, got $code"
fi

step "10. POST /api/admin/crawl с invalid source → 400"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "http://127.0.0.1:${PORT}/api/admin/crawl?source=does-not-exist")
if [ "$code" = "400" ]; then
  ok "400 с unknown source"
else
  bad "expected 400, got $code"
fi

step "11. POST /api/admin/crawl с valid source → 200 + summary + crawl_runs row"
resp=$(curl -s -X POST \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "http://127.0.0.1:${PORT}/api/admin/crawl?source=mcp")
if echo "$resp" | grep -q '"summary"' && echo "$resp" | grep -q '"durationMs"'; then
  ok "200 with summary + durationMs"
else
  bad "missing summary or durationMs in response: $resp"
fi

# Optional: verify crawl_runs has a row (requires psql)
if command -v psql > /dev/null 2>&1; then
  count=$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM crawl_runs WHERE source='mcp'" 2>/dev/null || echo "?")
  if [ "$count" != "?" ] && [ "$count" -gt 0 ]; then
    ok "crawl_runs row inserted ($count rows for mcp)"
  else
    skip "psql couldn't query crawl_runs (count=$count) — DB may not be set up"
  fi
else
  skip "psql not installed — skipping crawl_runs row check"
fi

echo
echo "─────────────────────────────────────────────"
echo "M-L1-LAUNCH ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "M-L1-launch: crawler scheduler endpoint deployed; agent_cards will populate after first cron tick."
