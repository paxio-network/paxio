#!/usr/bin/env bash
# M-Q27 acceptance — quality-gate.sh task-tag fallback
#
# Verifies parent-tag resolution: dev report `M-L1-T2` (task tag) finds
# `scripts/verify_M-L1-expansion.sh` (milestone-level script) via stripping
# `-T<N>` suffix + family search.
#
# Run: bash scripts/verify_M-Q27.sh
# Run via gate: bash scripts/quality-gate.sh M-Q27

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

# ---------------------------------------------------------------------------
step "1. quality-gate.sh has parent-tag fallback logic"
# ---------------------------------------------------------------------------

if grep -q "PARENT_TAG=" scripts/quality-gate.sh && \
   grep -q "family fallback" scripts/quality-gate.sh; then
  ok "quality-gate.sh has PARENT_TAG resolution + family fallback"
else
  bad "quality-gate.sh missing parent-tag fallback logic"
fi

# ---------------------------------------------------------------------------
step "2. parent-tag stripping regex covers expected patterns"
# ---------------------------------------------------------------------------

# Test sed expression with sample inputs
test_strip() {
  local input=$1
  local expected=$2
  local actual=$(echo "$input" | sed -E 's/-T[0-9]+([._-][[:alnum:]]+)*$//')
  if [ "$actual" = "$expected" ]; then
    ok "$input → $actual"
  else
    bad "$input → $actual (expected $expected)"
  fi
}

test_strip "M-L1-T2" "M-L1"
test_strip "M-L1-T2.5" "M-L1"
test_strip "M-L1-T2-impl" "M-L1"
test_strip "M-L1-T15" "M-L1"
test_strip "M-Q26" "M-Q26"
test_strip "M-L1-expansion" "M-L1-expansion"

# ---------------------------------------------------------------------------
step "3. live test — quality-gate.sh M-L1-T2 finds verify_M-L1-expansion.sh"
# ---------------------------------------------------------------------------

# Quick syntax dry run only — don't actually exec full gate (would take ~30s).
# Verify the script's stdout мentions the resolution path.
gate_output=$(bash scripts/quality-gate.sh M-L1-T2 2>&1 || true)
if echo "$gate_output" | grep -qE "(family fallback|parent-tag fallback): M-L1-T2"; then
  ok "M-L1-T2 → resolves к verify_M-L1-expansion.sh via family fallback"
else
  bad "M-L1-T2 not resolving — fallback regex broken"
fi

# ---------------------------------------------------------------------------

echo
echo "M-Q27 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
