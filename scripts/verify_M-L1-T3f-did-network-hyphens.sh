#!/usr/bin/env bash
# M-L1-T3f-did-network-hyphens acceptance — DID regex accepts hyphens in network segment
set -euo pipefail
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

DID=packages/types/src/did.ts

step "1. DID_REGEX allows hyphens in network segment"
if grep -E '\[a-z0-9-\]\+:\[a-zA-Z0-9' "$DID" >/dev/null; then
  ok "$DID has [a-z0-9-]+ for network"
else
  bad "$DID still uses [a-z0-9]+ (no hyphens) for network"
fi

step "2. Vitest types.test.ts GREEN (incl. new T-3f cases)"
if pnpm exec vitest run tests/types.test.ts >/tmp/vitest-t3f.log 2>&1; then
  PASSED=$(grep -E "Tests +[0-9]+ passed" /tmp/vitest-t3f.log | grep -oE "[0-9]+ passed" | head -1)
  ok "vitest types: $PASSED"
else
  bad "vitest types FAIL"; tail -10 /tmp/vitest-t3f.log
fi

echo
echo "M-L1-T3f-did-network-hyphens ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
