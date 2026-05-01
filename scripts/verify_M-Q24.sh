#!/usr/bin/env bash
# M-Q24 acceptance — governance gate split + batch-chore + protocol hardening
#
# Verifies:
#   - m-q22 test scans chore commit bodies (batch chore support)
#   - quality-gate.sh has GOVERNANCE_TESTS array + step 7/7 governance audit
#   - test-runner.md documents GREEN-with-governance-fail status
#   - architect-protocol.md §6.5 has cost-of-catchup semantics
#   - scope-guard.md AGENT INVOCATION table includes retroactive reviewer row

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

# ---------------------------------------------------------------------------
step "1. m-q22 test scans chore body for batch coverage"
# ---------------------------------------------------------------------------

if grep -q "choreBod" tests/m-q22-reviewer-chore-coverage.test.ts && \
   grep -q "matchedBatch" tests/m-q22-reviewer-chore-coverage.test.ts; then
  ok "m-q22 test has body-scan logic for batch chore"
else
  bad "m-q22 test missing body-scan logic"
fi

# ---------------------------------------------------------------------------
step "2. quality-gate.sh splits code-correctness vs governance"
# ---------------------------------------------------------------------------

if grep -q "GOVERNANCE_TESTS=" scripts/quality-gate.sh; then
  ok "quality-gate.sh has GOVERNANCE_TESTS array (single source of truth)"
else
  bad "quality-gate.sh missing GOVERNANCE_TESTS array"
fi

if grep -q "step \"7/7 governance audit" scripts/quality-gate.sh; then
  ok "quality-gate.sh step 7/7 governance audit exists"
else
  bad "quality-gate.sh step 7 missing"
fi

if grep -q "non-blocking" scripts/quality-gate.sh; then
  ok "quality-gate.sh governance step marked non-blocking"
else
  bad "quality-gate.sh governance step semantics unclear"
fi

# ---------------------------------------------------------------------------
step "3. m-q22 test in step 2 EXCLUDE list"
# ---------------------------------------------------------------------------

if grep -A6 "GOVERNANCE_TESTS=" scripts/quality-gate.sh | grep -q "m-q22"; then
  ok "GOVERNANCE_TESTS includes m-q22-reviewer-chore-coverage.test.ts"
else
  bad "GOVERNANCE_TESTS does not list m-q22 test"
fi

# ---------------------------------------------------------------------------
step "4. test-runner.md documents 🟡 GREEN-with-governance-fail status"
# ---------------------------------------------------------------------------

if grep -q "governance-audit-fail" .claude/agents/test-runner.md; then
  ok "test-runner.md documents non-blocking governance failure"
else
  bad "test-runner.md missing governance-fail interpretation"
fi

# ---------------------------------------------------------------------------
step "5. architect-protocol.md §6.5 has cost-of-catchup semantics"
# ---------------------------------------------------------------------------

if grep -q "cost-of-catchup\|Cost-of-catchup" .claude/rules/architect-protocol.md; then
  ok "architect-protocol §6.5 explicit cost-of-catchup"
else
  bad "architect-protocol §6.5 missing cost-of-catchup section"
fi

# ---------------------------------------------------------------------------
step "6. scope-guard.md AGENT INVOCATION table extended"
# ---------------------------------------------------------------------------

if grep -q "reviewer retroactive" .claude/rules/scope-guard.md; then
  ok "scope-guard.md AGENT INVOCATION table has retroactive row"
else
  bad "scope-guard.md missing retroactive reviewer row"
fi

# ---------------------------------------------------------------------------

echo
echo "M-Q24 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
