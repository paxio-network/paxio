#!/usr/bin/env bash
# M00c — canister-shared + dfx-setup + dev-env doc acceptance.
# Pass criteria: crate compiles, tests GREEN, no duplicate newtypes,
# dfx-setup.sh produces correct per-agent ports, dev-env doc complete.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. platform/canister-shared exists and compiles"
[ -f platform/canister-shared/Cargo.toml ] && ok "Cargo.toml" || bad "missing Cargo.toml"
[ -f platform/canister-shared/src/lib.rs ] && ok "lib.rs"     || bad "missing lib.rs"
[ -f platform/canister-shared/src/ids.rs ] && ok "ids.rs"     || bad "missing ids.rs"

if cargo build -p canister-shared --release >/tmp/m00c-build.log 2>&1; then
  ok "cargo build -p canister-shared"
else
  bad "cargo build FAILED — see /tmp/m00c-build.log"
fi

step "2. canister-shared registered in root Cargo workspace"
if grep -q '"platform/canister-shared"' Cargo.toml; then
  ok "workspace member"
else
  bad "not in root Cargo.toml members"
fi

step "3. Unit tests GREEN (canister-shared)"
if cargo test -p canister-shared >/tmp/m00c-test.log 2>&1; then
  # Sum всех 'test result: ok. N passed' строк (unit + integration + doc)
  TOTAL=$(grep -oE 'test result: ok\. [0-9]+ passed' /tmp/m00c-test.log \
          | grep -oE '[0-9]+' | awk '{s+=$1} END {print s+0}')
  ok "cargo test -p canister-shared (${TOTAL} passed)"
else
  bad "tests FAILED — see /tmp/m00c-test.log"
fi

step "4. No canister re-defines AgentId / TxHash locally"
DUPES=$(grep -rn 'struct AgentId\|struct TxHash' products/*/canister*/src/ 2>/dev/null | grep -v canister_shared || true)
if [ -z "$DUPES" ]; then
  ok "no duplicate newtype definitions in products/*/canister*/"
else
  bad "duplicate AgentId/TxHash found:"
  echo "$DUPES"
fi

step "5. scripts/dfx-setup.sh executable + port scheme intact"
if [ -x scripts/dfx-setup.sh ]; then
  ok "dfx-setup.sh is executable"
else
  bad "dfx-setup.sh is NOT executable"
fi

declare -A EXPECTED_PORTS=(
  [architect]=4943
  [registry-dev]=4950
  [icp-dev]=4951
  [backend-dev]=4952
  [frontend-dev]=4953
  [test-runner]=4954
  [reviewer]=4955
)

for agent in "${!EXPECTED_PORTS[@]}"; do
  expected="${EXPECTED_PORTS[$agent]}"
  actual=$(AGENT_NAME="$agent" bash -c 'source scripts/dfx-setup.sh >/dev/null 2>&1; echo $DFX_PORT')
  if [ "$actual" = "$expected" ]; then
    ok "AGENT_NAME=$agent → DFX_PORT=$actual"
  else
    bad "AGENT_NAME=$agent → DFX_PORT=$actual (expected $expected)"
  fi
done

step "6. docs/paxio-dev-environment.md present + complete"
if [ -f docs/paxio-dev-environment.md ]; then
  ok "doc exists"
  for section in "Prerequisites" "First-time setup" "Per-agent dfx" "Worktree pattern" "Running tests locally" "Troubleshooting"; do
    if grep -q "$section" docs/paxio-dev-environment.md; then
      ok "section: $section"
    else
      bad "missing section: $section"
    fi
  done
else
  bad "missing docs/paxio-dev-environment.md"
fi

echo
echo "====================================="
echo "M00c canister-shared: $PASS passed, $FAIL failed"
echo "====================================="
[ "$FAIL" -eq 0 ] || exit 1
