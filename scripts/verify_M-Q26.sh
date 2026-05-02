#!/usr/bin/env bash
# M-Q26 acceptance — migration 003 idempotency hotfix
#
# PROD regression closing: ensures both source-of-truth SQL и inline mirror
# в postgres-storage.ts drop ALL 12 CHECK constraints up-front, allowing
# migration 003 to re-run safely on every container startup.
#
# Run: bash scripts/verify_M-Q26.sh
# Run via gate: bash scripts/quality-gate.sh M-Q26

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

# All 12 constraints that migration 003 ADDs — все должны DROP IF EXISTS first.
EXPECTED_DROPS=(
  agent_cards_capability_check
  agent_cards_source_check
  agent_cards_category_check
  agent_cards_framework_check
  agent_cards_wallet_status_check
  agent_cards_payment_facilitator_check
  agent_cards_sla_uptime_check
  agent_cards_reputation_score_check
  agent_cards_security_badge_check
  agent_cards_compliance_eu_ai_act_check
  agent_cards_compliance_data_handling_check
  agent_cards_ecosystem_network_check
)

# ---------------------------------------------------------------------------
step "1. Source-of-truth SQL has DROP IF EXISTS for all 12 constraints"
# ---------------------------------------------------------------------------

SQL_FILE=packages/contracts/sql/003_taxonomy.sql
if [ ! -f "$SQL_FILE" ]; then
  bad "$SQL_FILE not found"
else
  for c in "${EXPECTED_DROPS[@]}"; do
    if grep -q "DROP CONSTRAINT IF EXISTS $c" "$SQL_FILE"; then
      ok "SQL drops $c"
    else
      bad "SQL missing DROP IF EXISTS $c"
    fi
  done
fi

# ---------------------------------------------------------------------------
step "2. Inline mirror MIGRATION_003_TAXONOMY has DROP IF EXISTS for all 12"
# ---------------------------------------------------------------------------

MIRROR_FILE=products/01-registry/app/infra/postgres-storage.ts
if [ ! -f "$MIRROR_FILE" ]; then
  bad "$MIRROR_FILE not found"
else
  # Extract MIGRATION_003 template literal block via awk
  block=$(awk '
    /const MIGRATION_003_TAXONOMY = `/ { flag=1 }
    flag { print }
    flag && /^`;/ { exit }
  ' "$MIRROR_FILE")
  for c in "${EXPECTED_DROPS[@]}"; do
    if echo "$block" | grep -q "DROP CONSTRAINT IF EXISTS $c"; then
      ok "inline mirror drops $c"
    else
      bad "inline mirror missing DROP IF EXISTS $c"
    fi
  done
fi

# ---------------------------------------------------------------------------
step "3. Idempotency markers — DROP block before ADD CONSTRAINTs"
# ---------------------------------------------------------------------------

# Verify ADD CONSTRAINT for each appears AFTER its corresponding DROP.
# Quick sanity: DROP block should be в Step 1 (line index < ADD constraint locations).
DROP_LINE=$(grep -n "DROP CONSTRAINT IF EXISTS agent_cards_category_check" $SQL_FILE | head -1 | cut -d: -f1)
ADD_LINE=$(grep -n "ADD CONSTRAINT agent_cards_category_check" $SQL_FILE | head -1 | cut -d: -f1)

if [ -n "$DROP_LINE" ] && [ -n "$ADD_LINE" ] && [ "$DROP_LINE" -lt "$ADD_LINE" ]; then
  ok "SQL: DROP block precedes ADD CONSTRAINT (idempotent ordering)"
else
  bad "SQL: DROP/ADD ordering broken"
fi

# ---------------------------------------------------------------------------
step "4. postgres-storage tests still GREEN (regression check)"
# ---------------------------------------------------------------------------

if pnpm exec vitest run products/01-registry/tests/postgres-storage.test.ts 2>&1 | grep -qE "Tests\s+27 passed"; then
  ok "27 postgres-storage tests GREEN"
else
  bad "postgres-storage tests not 27 GREEN — regression?"
fi

# ---------------------------------------------------------------------------

echo
echo "M-Q26 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
