#!/usr/bin/env bash
# M-L1-T3i-crawler-logger acceptance — admin-crawl handler injects logger into runCrawler.
set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

H=products/01-registry/app/api/admin-crawl.js
T=products/01-registry/tests/admin-crawl-handler.test.ts

step "1. admin-crawl.js passes logger to runCrawler"
if grep -E "logger:" "$H" >/dev/null && grep -E "runCrawler\(" "$H" >/dev/null; then
  ok "$H references logger in runCrawler call"
else
  bad "$H does not pass logger to runCrawler"
fi

step "2. Logger wrapper swaps msg/ctx (Pino is ctx-first, CrawlerLogger is msg-first)"
if grep -E "console\.(info|warn)\(.*ctx" "$H" >/dev/null || grep -E "info:\s*\([^,)]*,[^)]*\)\s*=>" "$H" >/dev/null; then
  ok "wrapper present in $H"
else
  bad "no msg/ctx wrap pattern detected — Pino arg-order mismatch with CrawlerLogger contract"
fi

step "3. Test asserts logger injection (M-L1-T3i)"
if grep -q "M-L1-T3i.*passes a logger" "$T"; then
  ok "T-3i test present"
else
  bad "T-3i test missing"
fi

step "4. Vitest target file all GREEN (10+ tests)"
if pnpm exec vitest run "$T" >/tmp/vitest-t3i.log 2>&1; then
  PASSED=$(grep -E "Tests +[0-9]+ passed" /tmp/vitest-t3i.log | grep -oE "[0-9]+ passed" | head -1)
  ok "vitest target file: $PASSED"
else
  bad "vitest target file FAIL"
  tail -10 /tmp/vitest-t3i.log
fi

echo
echo "M-L1-T3i-crawler-logger ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
