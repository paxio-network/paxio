#!/usr/bin/env bash
# M-L1-T3d-body-stringify acceptance — wiring httpClient.fetch JSON-serializes object body
#
# Type 1 (logic) milestone — unit tests cover full contract. This thin
# wrapper checks the impl is in place + vitest GREEN so quality-gate.sh
# step 6/6 doesn't fail.
#
# Run: bash scripts/verify_M-L1-T3d-body-stringify.sh
# Run via gate: bash scripts/quality-gate.sh M-L1-T3d-body-stringify

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

WIRING=apps/back/server/wiring/01-registry.cjs
TESTS=tests/wiring-rest-adapter-httpclient.test.ts

# ---------------------------------------------------------------------------
step "1. Wiring fetch-ai branch JSON.stringifies object body"
# ---------------------------------------------------------------------------
if grep -q "JSON.stringify(body)" "$WIRING"; then
  ok "$WIRING calls JSON.stringify(body)"
else
  bad "$WIRING missing JSON.stringify(body) — body would be coerced to '[object Object]'"
fi

# ---------------------------------------------------------------------------
step "2. Wiring uses conditional serialization (preserves string/Buffer pass-through)"
# ---------------------------------------------------------------------------
if grep -qE "typeof body === 'object'" "$WIRING"; then
  ok "conditional typeof body === 'object' check present"
else
  bad "missing conditional check — would break string/Buffer body adapters in future"
fi

# ---------------------------------------------------------------------------
step "3. Wiring still passes serialized body to native fetch"
# ---------------------------------------------------------------------------
if grep -qE "fetch\(url,\s*\{[^}]*body:\s*serializedBody" "$WIRING"; then
  ok "native fetch receives serializedBody (not raw object)"
else
  bad "native fetch receives unserialized body — fix incomplete"
fi

# ---------------------------------------------------------------------------
step "4. RED test still asserts JSON string body shape"
# ---------------------------------------------------------------------------
if grep -q "M-L1-T3d.*JSON.stringifies object body" "$TESTS"; then
  ok "T-3d test present in wiring-rest-adapter-httpclient.test.ts"
else
  bad "T-3d test missing — RED spec was reverted?"
fi

# ---------------------------------------------------------------------------
step "5. Vitest target file 5/5 GREEN (factory + httpclient + 2 regression + T-3d)"
# ---------------------------------------------------------------------------
if pnpm exec vitest run "$TESTS" >/tmp/vitest-t3d.log 2>&1; then
  PASSED=$(grep -E "Tests +[0-9]+ passed" /tmp/vitest-t3d.log | grep -oE "[0-9]+ passed" | head -1)
  ok "vitest target file: $PASSED"
else
  bad "vitest target file FAIL — see /tmp/vitest-t3d.log"
  tail -20 /tmp/vitest-t3d.log
fi

# ---------------------------------------------------------------------------

echo
echo "M-L1-T3d-body-stringify ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
