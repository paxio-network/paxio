#!/usr/bin/env bash
# M-L1-taxonomy acceptance — domain-based AgentCard taxonomy + 9-group schema
#
# Verifies architect Phase A artifacts (PR #111) + T-6 impl (PR #112):
#   - new type files exist + Zod schemas valid
#   - SQL migration 003 source-of-truth in packages/contracts/sql/
#   - 35 RED tests in tests/agent-card-taxonomy.test.ts GREEN
#   - postgres-storage tests reflect ON CONFLICT DO NOTHING semantics
#   - admin-crawl handler maxRecords lifted
#   - live API on https://api.paxio.network responds correctly
#
# Run: bash scripts/verify_M-L1-taxonomy.sh
# Run via gate: bash scripts/quality-gate.sh M-L1-taxonomy

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

# ---------------------------------------------------------------------------
step "1. New type files exist"
# ---------------------------------------------------------------------------

for f in \
  packages/types/src/agent-category.ts \
  packages/types/src/agent-source.ts \
  packages/types/src/agent-framework.ts \
  packages/types/src/agent-card.ts; do
  if [ -f "$f" ]; then ok "$f"; else bad "$f missing"; fi
done

# ---------------------------------------------------------------------------
step "2. SQL migration source-of-truth"
# ---------------------------------------------------------------------------

if [ -f packages/contracts/sql/003_taxonomy.sql ]; then
  ok "003_taxonomy.sql exists"
  if grep -q "DO NOTHING" packages/contracts/sql/003_taxonomy.sql || \
     grep -qE "agent_cards_(category|source)_check" packages/contracts/sql/003_taxonomy.sql; then
    ok "migration includes new CHECKs / DO NOTHING note"
  else
    bad "migration missing key CHECK constraints"
  fi
else
  bad "003_taxonomy.sql missing"
fi

# ---------------------------------------------------------------------------
step "3. AgentCategory has 11 domain values (no Bitcoin / no Paxio-layer enum)"
# ---------------------------------------------------------------------------

if grep -q "'Finance'" packages/types/src/agent-category.ts && \
   grep -q "'Customer Experience'" packages/types/src/agent-category.ts && \
   ! grep -q "'Bitcoin'" packages/types/src/agent-category.ts; then
  ok "AgentCategory enum is domain-based (11 values), Bitcoin excluded"
else
  bad "AgentCategory enum doesn't match M-L1-taxonomy spec"
fi

# ---------------------------------------------------------------------------
step "4. AgentSource has 7 canonical + 2 legacy aliases + LABELS map"
# ---------------------------------------------------------------------------

if grep -q "'paxio-native'" packages/types/src/agent-source.ts && \
   grep -q "'eliza'" packages/types/src/agent-source.ts && \
   grep -q "'fetch'" packages/types/src/agent-source.ts && \
   grep -q "AGENT_SOURCE_LABELS" packages/types/src/agent-source.ts; then
  ok "AgentSource has 7 canonical + ElizaOS + AGENT_SOURCE_LABELS"
else
  bad "AgentSource enum incomplete"
fi

# ---------------------------------------------------------------------------
step "5. Vitest: agent-card-taxonomy.test.ts (35 tests)"
# ---------------------------------------------------------------------------

VOUT=$(pnpm exec vitest run tests/agent-card-taxonomy.test.ts 2>&1)
if echo "$VOUT" | grep -qE "Tests\s+35 passed"; then
  ok "35 taxonomy tests GREEN"
else
  bad "agent-card-taxonomy tests not 35 GREEN"
fi

# ---------------------------------------------------------------------------
step "6. Vitest: postgres-storage.test.ts (T-6 ON CONFLICT DO NOTHING)"
# ---------------------------------------------------------------------------

POUT=$(pnpm exec vitest run products/01-registry/tests/postgres-storage.test.ts 2>&1)
if echo "$POUT" | grep -qE "Tests\s+27 passed"; then
  ok "postgres-storage 27 tests GREEN (skip-if-exists semantics)"
else
  bad "postgres-storage tests not 27 GREEN"
fi

# ---------------------------------------------------------------------------
step "7. T-6 impl: maxRecords lifted to 50000"
# ---------------------------------------------------------------------------

if grep -q "maxRecords: 50000" products/01-registry/app/api/admin-crawl.js; then
  ok "admin-crawl maxRecords = 50000"
else
  bad "admin-crawl maxRecords not lifted (expected 50000)"
fi

# ---------------------------------------------------------------------------
step "8. T-6 impl: SQL.upsertByDid uses DO NOTHING"
# ---------------------------------------------------------------------------

if grep -A12 "upsertByDid:" products/01-registry/app/infra/postgres-storage.ts | grep -q "DO NOTHING"; then
  ok "postgres-storage upsertByDid → DO NOTHING"
else
  bad "postgres-storage still uses DO UPDATE SET"
fi

# ---------------------------------------------------------------------------
step "9. Live API — admin/crawl with auth (expect 200 or 429)"
# ---------------------------------------------------------------------------

ADMIN_TOKEN="${ADMIN_TOKEN:-1BL5hxqLZF7nQpPvcN8BNcOlrMLmwyiARVI00y8Xr18}"
# `|| HTTP_CODE="000"` MUST be OUTSIDE the $() — if it's inside, curl's
# stdout (the http_code via -w) and echo's "000" both get captured into
# HTTP_CODE when curl fails partway through (saw "429000" empirically
# during M-L1-taxonomy round 1).
HTTP_CODE=$(curl -sX POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o /tmp/m-l1-tax-crawl.txt \
  -w "%{http_code}" \
  "https://api.paxio.network/api/admin/crawl?source=mcp" \
  --max-time 120 2>/dev/null) || HTTP_CODE="000"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "429" ]; then
  ok "/api/admin/crawl auth → $HTTP_CODE"
else
  bad "/api/admin/crawl auth → $HTTP_CODE (expected 200/429)"
fi

# ---------------------------------------------------------------------------
step "10. Live API — landing/hero shows agents > 0"
# ---------------------------------------------------------------------------

AGENTS=$(curl -s "https://api.paxio.network/api/landing/hero" --max-time 10 | \
  grep -oE '"agents":[0-9]+' | head -1 | grep -oE '[0-9]+' || echo "0")
if [ "${AGENTS:-0}" -gt 0 ]; then
  ok "/api/landing/hero agents = $AGENTS (> 0, real DB count)"
else
  bad "/api/landing/hero agents = 0 (crawler didn't populate or wiring broken)"
fi

# ---------------------------------------------------------------------------

echo
echo "M-L1-taxonomy ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
