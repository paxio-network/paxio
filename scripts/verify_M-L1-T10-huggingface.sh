#!/usr/bin/env bash
# M-L1-T10-huggingface acceptance — HF adapter real impl + projection.
set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

A=products/01-registry/app/domain/sources/huggingface.ts
T=products/01-registry/tests/huggingface-adapter.test.ts
S=packages/types/src/sources/huggingface.ts

step "1. Source files exist"
for f in "$A" "$T" "$S"; do
  [ -f "$f" ] && ok "$f present" || bad "$f missing"
done

step "2. Adapter no longer stub (does real GET to huggingface.co)"
if grep -q "STUB" "$A" || grep -q "fetchAgents.*async function\\*[^{]*{[[:space:]]*return;[[:space:]]*}" "$A"; then
  bad "$A still has STUB pattern (stub generator returns immediately)"
else
  ok "$A is real impl (no STUB markers)"
fi

step "3. Adapter calls GET on /api/models"
if grep -E "method:\s*'GET'" "$A" >/dev/null && grep -q "/api/models" "$A"; then
  ok "$A GETs /api/models"
else
  bad "$A missing GET /api/models call"
fi

step "4. Adapter handles Link header for pagination"
if grep -E "rel=.next.|link.*next|headers\.get\(.link" "$A" >/dev/null; then
  ok "$A parses Link header rel=next"
else
  bad "$A doesn't parse pagination Link header"
fi

step "5. CrawlerSource enum includes huggingface"
if grep -q "'huggingface'" packages/types/src/crawler-source.ts; then
  ok "huggingface in CRAWLER_SOURCES"
else
  bad "huggingface NOT in CRAWLER_SOURCES enum"
fi

step "6. Vitest target file all GREEN"
if pnpm exec vitest run "$T" >/tmp/vitest-t10.log 2>&1; then
  PASSED=$(grep -E "Tests +[0-9]+ passed" /tmp/vitest-t10.log | grep -oE "[0-9]+ passed" | head -1)
  ok "vitest huggingface-adapter: $PASSED"
else
  bad "vitest target file FAIL"; tail -10 /tmp/vitest-t10.log
fi

echo
echo "M-L1-T10-huggingface ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
