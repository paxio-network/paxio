#!/usr/bin/env bash
# M04 Audit Log canister — acceptance script.
# Pass criteria: audit_log crate builds + cargo test GREEN + chain integrity verified.

set -euo pipefail

cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

step() { echo; echo "▶ $1"; }

step "1. Cargo crate + Candid"
[ -f products/06-compliance/canisters/audit-log/Cargo.toml ]    && ok "Cargo.toml"          || bad "missing Cargo.toml"
[ -f products/06-compliance/canisters/audit-log/src/lib.rs ]    && ok "src/lib.rs"          || bad "missing lib.rs"
[ -f products/06-compliance/canisters/audit-log/audit_log.did ] && ok "audit_log.did"       || bad "missing .did file"

step "2. Build"
if cargo build -p audit_log --release >/tmp/m04-build.log 2>&1; then
  ok "cargo build"
else
  bad "build FAILED — see /tmp/m04-build.log"
fi

step "3. Unit + chain tests"
if cargo test -p audit_log >/tmp/m04-test.log 2>&1; then
  ok "cargo test -p audit_log"
else
  bad "tests FAILED — see /tmp/m04-test.log"
fi

step "4. Chain integrity test specifically"
if cargo test -p audit_log verify_chain_returns_true_on_fresh_log >/tmp/m04-chain.log 2>&1; then
  ok "chain integrity test GREEN"
else
  bad "chain integrity test FAILED"
fi

step "5. No admin-key / delete endpoint (immutability guarantee)"
if grep -E '(delete_entry|admin_reset|remove_entry)' products/06-compliance/canisters/audit-log/src/*.rs 2>/dev/null \
  | grep -v '#\[cfg(test)\]' | grep -v 'reset_for_test'; then
  bad "audit log must be append-only — no delete/reset in production code"
else
  ok "append-only: no delete endpoint in production code"
fi

echo
echo "====================================="
echo "M04 Audit Log acceptance: $PASS passed, $FAIL failed"
echo "====================================="

[ "$FAIL" -eq 0 ] || exit 1
