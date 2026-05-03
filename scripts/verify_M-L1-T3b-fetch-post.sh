#!/usr/bin/env bash
# M-L1-T3b-fetch-post acceptance — fetch-ai adapter POST + JSON body contract
#
# Тип 1 (logic) milestone: unit tests cover everything. This acceptance
# script is a thin wrapper around grep checks + targeted vitest run so
# scripts/quality-gate.sh step 6/6 doesn't hard-fail on missing acceptance.
#
# Run: bash scripts/verify_M-L1-T3b-fetch-post.sh
# Run via gate: bash scripts/quality-gate.sh M-L1-T3b-fetch-post
#
# NB: M-Q27 parent-tag fallback regex `-T[0-9]+([._-][[:alnum:]]+)*$` does
# not match `T3b` (digit + letter without separator). Until that regex
# is extended (TD-XX, separate PR), each task with `T<num><letter>` style
# names ships its own verify script. Minimal overhead per task.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

# ---------------------------------------------------------------------------
step "1. Adapter uses POST method (not GET — Agentverse returns 405 on GET)"
# ---------------------------------------------------------------------------
ADAPTER=products/01-registry/app/domain/sources/fetch-ai.ts
if grep -q "method: 'POST'" "$ADAPTER"; then
  ok "$ADAPTER sends method: 'POST'"
else
  bad "$ADAPTER missing method: 'POST'"
fi
# Look for actual method-usage pattern (preceded by `,` or whitespace + key,
# not part of TS union type `'GET' | 'POST'`). The httpClient port type
# definition `method: 'GET' | 'POST'` is allowed — that's the contract.
if grep -qE "method:\s*'GET'\s*[,}]" "$ADAPTER"; then
  bad "$ADAPTER still calls fetch with method: 'GET' — should be POST"
else
  ok "$ADAPTER no leftover GET fetch call (TS union type unchanged is OK)"
fi

# ---------------------------------------------------------------------------
step "2. Adapter sends Content-Type: application/json header"
# ---------------------------------------------------------------------------
if grep -qE "Content-Type.*application/json" "$ADAPTER"; then
  ok "$ADAPTER includes Content-Type: application/json"
else
  bad "$ADAPTER missing Content-Type: application/json header"
fi

# ---------------------------------------------------------------------------
step "3. Adapter body has all 6 Agentverse-required fields"
# ---------------------------------------------------------------------------
for field in "search_text:" "filters:" "sort:" "direction:" "offset" "limit"; do
  if grep -q "$field" "$ADAPTER"; then
    ok "body has $field"
  else
    bad "body missing $field"
  fi
done

# ---------------------------------------------------------------------------
step "4. URL is bare /v1/search/agents (no offset/limit query params)"
# ---------------------------------------------------------------------------
if grep -qE "/v1/search/agents['\"\`]" "$ADAPTER"; then
  ok "URL ends at /v1/search/agents (no query string)"
else
  bad "URL not bare /v1/search/agents — check for query params"
fi

# ---------------------------------------------------------------------------
step "5. ZodFetchAiAgent.registeredAt is z.number().int().nonnegative()"
# ---------------------------------------------------------------------------
SCHEMA=packages/types/src/sources/fetch-ai.ts
if grep -A 1 "registeredAt:" "$SCHEMA" | grep -q "z.number().int().nonnegative()"; then
  ok "$SCHEMA registeredAt is z.number().int().nonnegative() (Unix ms)"
else
  bad "$SCHEMA registeredAt schema unexpected"
fi

# ---------------------------------------------------------------------------
step "6. Test fixture validAgent.registeredAt is Unix epoch ms (number)"
# ---------------------------------------------------------------------------
TEST=products/01-registry/tests/fetch-ai-adapter.test.ts
if grep -E "registeredAt:\s*[0-9]+" "$TEST" >/dev/null; then
  ok "$TEST validAgent.registeredAt is number"
else
  bad "$TEST validAgent.registeredAt not a number — Zod would reject"
fi

# ---------------------------------------------------------------------------
step "7. Test fixture has all required ZodFetchAiAgent fields"
# ---------------------------------------------------------------------------
for field in "profileUrl:" "tags:" "isOnline:" "reputationScore:"; do
  if grep -q "$field" "$TEST"; then
    ok "fixture has $field"
  else
    bad "fixture missing $field — Zod would reject"
  fi
done

# ---------------------------------------------------------------------------
step "8. Pagination test passes pageSize: 1 (default 100 short-circuits)"
# ---------------------------------------------------------------------------
if grep -E "pageSize:\s*1" "$TEST" >/dev/null; then
  ok "pagination test overrides pageSize: 1"
else
  bad "pagination test missing pageSize: 1 override — would terminate after page 1"
fi

# ---------------------------------------------------------------------------
step "9. Vitest target file 9/9 GREEN (factory + 8 behaviour tests)"
# ---------------------------------------------------------------------------
if pnpm exec vitest run "$TEST" >/tmp/vitest-t3b.log 2>&1; then
  PASSED=$(grep -E "Tests\s+[0-9]+ passed" /tmp/vitest-t3b.log | grep -oE "[0-9]+ passed" | head -1)
  ok "vitest target file: $PASSED"
else
  bad "vitest target file FAIL — see /tmp/vitest-t3b.log"
  tail -20 /tmp/vitest-t3b.log
fi

# ---------------------------------------------------------------------------

echo
echo "M-L1-T3b-fetch-post ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
