#!/usr/bin/env bash
# M03 Security Sidecar — acceptance script.
# Pass criteria: security_sidecar crate builds + cargo test GREEN.

set -euo pipefail

cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

step() { echo; echo "▶ $1"; }

step "1. Cargo crate + Candid"
[ -f products/04-security/canister/Cargo.toml ]                 && ok "Cargo.toml"              || bad "missing Cargo.toml"
[ -f products/04-security/canister/src/lib.rs ]                 && ok "src/lib.rs"              || bad "missing lib.rs"
[ -f products/04-security/canister/security_sidecar.did ]       && ok "Candid .did file"        || bad "missing .did file"

step "2. Build"
if cargo build -p security_sidecar --release >/tmp/m03-build.log 2>&1; then
  ok "cargo build"
else
  bad "build FAILED — see /tmp/m03-build.log"
fi

step "3. Tests"
if cargo test -p security_sidecar >/tmp/m03-test.log 2>&1; then
  ok "cargo test -p security_sidecar"
else
  bad "tests FAILED — see /tmp/m03-test.log"
fi

step "4. Intent Verifier determinism check"
# Same input must produce same decision — run test twice.
cargo test -p security_sidecar verify_is_idempotent_for_same_intent --release \
  >/tmp/m03-determinism.log 2>&1 \
  && ok "determinism test GREEN" \
  || bad "determinism test FAILED"

step "5. Scope: no ML dependencies"
# Intent Verifier must remain deterministic Rust. No tch, ort, candle, burn, etc.
if grep -E 'tch|ort|candle|burn|onnx|tensorflow' products/04-security/canister/Cargo.toml 2>/dev/null; then
  bad "ML dependency detected in Cargo.toml — Intent Verifier must be deterministic"
else
  ok "no ML deps in Cargo.toml"
fi

echo
echo "====================================="
echo "M03 Security Sidecar acceptance: $PASS passed, $FAIL failed"
echo "====================================="

[ "$FAIL" -eq 0 ] || exit 1
