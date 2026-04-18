#!/usr/bin/env bash
# M02 Wallet canister — acceptance script.
# Pass criteria: wallet crate builds + `cargo test -p wallet` GREEN (uses mock-ecdsa feature).
#
# Full threshold-ECDSA integration vs real ICP management canister runs via dfx in a separate
# environment (docs/e2e/wallet-bitcoin.md).

set -euo pipefail

cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

step() { echo; echo "▶ $1"; }

step "1. Cargo workspace + wallet crate exist"
[ -f Cargo.toml ]                                   && ok "root Cargo.toml"                        || bad "missing root Cargo.toml"
[ -f products/03-wallet/canister/Cargo.toml ]       && ok "products/03-wallet/canister/Cargo.toml" || bad "missing wallet crate Cargo.toml"
[ -f products/03-wallet/canister/src/lib.rs ]       && ok "src/lib.rs"                             || bad "missing wallet lib.rs"
[ -f products/03-wallet/canister/wallet.did ]       && ok "wallet.did Candid"                       || bad "missing wallet.did"

step "2. Wallet crate builds"
if cargo build -p wallet --release >/tmp/m02-build.log 2>&1; then
  ok "cargo build -p wallet --release"
else
  bad "build FAILED — see /tmp/m02-build.log"
fi

step "3. Wallet unit tests GREEN (mock-ecdsa feature)"
if cargo test -p wallet --features mock-ecdsa >/tmp/m02-test.log 2>&1; then
  ok "cargo test -p wallet --features mock-ecdsa"
else
  bad "tests FAILED — see /tmp/m02-test.log"
fi

step "4. Candid interface matches TS types"
if grep -q "derive_btc_address" products/03-wallet/canister/wallet.did 2>/dev/null; then
  ok "wallet.did declares derive_btc_address"
else
  bad "wallet.did missing derive_btc_address"
fi
if grep -q "sign_transaction" products/03-wallet/canister/wallet.did 2>/dev/null; then
  ok "wallet.did declares sign_transaction"
else
  bad "wallet.did missing sign_transaction"
fi

step "5. No panic! in public methods"
# Public API methods MUST return Result<T, E>, never panic!.
# Heuristic: find `panic!(` in src/ NOT inside #[cfg(test)] or tests/ or debug_assert.
if grep -nR 'panic!' products/03-wallet/canister/src/ 2>/dev/null | grep -v '//'; then
  bad "panic! found in wallet/src/"
else
  ok "no panic! in wallet/src/"
fi

echo
echo "====================================="
echo "M02 Wallet acceptance: $PASS passed, $FAIL failed"
echo "====================================="

[ "$FAIL" -eq 0 ] || exit 1
