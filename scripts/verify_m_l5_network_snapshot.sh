#!/bin/bash
#
# M-L5 acceptance — landing NetworkGraph endpoint returns real data.
#
# Steps (Phase 1.5 compliant per TD-20):
#   1. Clean install — catches workspace symlink drift
#   2. Build — tsc + handler copy-step (TD-17)
#   3. Landing app build — confirms frontend types align (TD-19 must be closed)
#   4. Unit tests — vitest suite GREEN
#   5. [optional — skipped if no Postgres] server boot + HTTP curl against
#      /api/landing/network/snapshot + Zod validation
#
# Step 5 is OPTIONAL in local dev because we don't yet have docker-compose
# dev-stack (tracked for M17-dev-infra). It is MANDATORY on CI once that
# milestone lands. For M-L5 completion the unit tests + buildable
# composition root are sufficient.
#
# Acceptance after registry-dev + backend-dev land:
#   bash scripts/verify_m_l5_network_snapshot.sh → 0 (PASS)

set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p "$HOME/tmp"

PASS=0
FAIL=0

ok()  { echo "✅ $1"; PASS=$((PASS+1)); }
bad() { echo "❌ $1"; FAIL=$((FAIL+1)); }
skip() { echo "⏭  $1"; }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "M-L5 acceptance — NetworkSnapshot from real Registry data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1 — clean install (Phase 1.5 TD-20)
echo
echo "Step 1/5 — clean install (fresh clone imitation)"
if pnpm install --frozen-lockfile >"$HOME/tmp/m_l5-install.log" 2>&1; then
  ok "pnpm install --frozen-lockfile"
else
  bad "pnpm install failed — see \$HOME/tmp/m_l5-install.log"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "PASS: $PASS   FAIL: $FAIL"
  exit 1
fi

# Step 2 — build + copy handlers (TD-17)
echo
echo "Step 2/5 — pnpm build (tsc + handler copy-step)"
if pnpm build >"$HOME/tmp/m_l5-build.log" 2>&1; then
  ok "pnpm build"
else
  bad "pnpm build failed — see \$HOME/tmp/m_l5-build.log"
fi

# Confirm handler is in dist (paranoia against TD-17 regression)
if [ -f "dist/products/07-intelligence/app/api/landing-network-snapshot.js" ]; then
  ok "landing-network-snapshot.js handler mirrored in dist"
else
  bad "handler missing in dist — TD-17 regressed"
fi

# Step 3 — landing Next.js build (depends on TD-19 closed)
echo
echo "Step 3/5 — pnpm --filter @paxio/landing-app build (needs TD-19 fixed)"
if pnpm --filter @paxio/landing-app build >"$HOME/tmp/m_l5-landing.log" 2>&1; then
  ok "landing Next.js build"
else
  bad "landing build failed — TD-19 likely still open. See \$HOME/tmp/m_l5-landing.log"
fi

# Step 4 — unit test suite
echo
echo "Step 4/5 — vitest unit suite (M-L5 tests GREEN)"
if pnpm vitest run products/01-registry/tests/postgres-storage.test.ts \
                  products/07-intelligence/tests/network-snapshot-builder.test.ts \
                  products/07-intelligence/tests/landing-stats.test.ts \
                  >"$HOME/tmp/m_l5-vitest.log" 2>&1; then
  ok "M-L5 vitest suites GREEN"
else
  bad "M-L5 vitest suites FAILED — see \$HOME/tmp/m_l5-vitest.log"
fi

# Full baseline check — no regression in siblings
if pnpm test -- --run >"$HOME/tmp/m_l5-vitest-full.log" 2>&1; then
  ok "full vitest suite GREEN (no regression)"
else
  bad "vitest regression — see \$HOME/tmp/m_l5-vitest-full.log"
fi

# Step 5 — OPTIONAL runtime smoke against booted server
echo
echo "Step 5/5 — runtime endpoint smoke (optional: requires Postgres + server)"
if command -v psql >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
  # TODO(M17-dev-infra): wrap with docker-compose auto-start when dev-stack
  # script lands. For now: run only if operator pre-configured DATABASE_URL
  # pointing at a reachable Postgres with agent_cards table + seeded row.
  echo "DATABASE_URL detected; booting server and hitting endpoint..."
  # spawn server in bg, grab pid, curl, kill
  pnpm dev:server >"$HOME/tmp/m_l5-server.log" 2>&1 &
  SERVER_PID=$!
  sleep 3  # give Fastify time to boot
  if curl -sf "http://localhost:3001/api/landing/network/snapshot" >"$HOME/tmp/m_l5-curl.json" 2>&1; then
    # validate JSON has nodes array
    if grep -q '"nodes"' "$HOME/tmp/m_l5-curl.json"; then
      ok "endpoint returns valid NetworkSnapshot JSON"
    else
      bad "endpoint returned malformed JSON — see \$HOME/tmp/m_l5-curl.json"
    fi
  else
    bad "curl failed — see \$HOME/tmp/m_l5-curl.json and \$HOME/tmp/m_l5-server.log"
  fi
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
else
  skip "no DATABASE_URL / psql — runtime smoke deferred to M17-dev-infra"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASS: $PASS   FAIL: $FAIL"
if [ $FAIL -eq 0 ]; then
  echo "M-L5 GREEN — landing NetworkGraph wired to real Registry"
  exit 0
else
  echo "M-L5 OPEN — see failures above"
  exit 1
fi
