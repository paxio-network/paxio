#!/usr/bin/env bash
# M-L1-T3h-cron-matrix acceptance — scheduled-crawl.yml runs all 3 working
# sources in parallel matrix every 6 hours.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

WF=.github/workflows/scheduled-crawl.yml

step "1. Workflow file exists + uses YAML"
if [ -f "$WF" ]; then ok "$WF present"; else bad "$WF missing"; fi

step "2. Cron schedule every 6 hours"
if grep -E "cron: '0 \\*/6" "$WF" >/dev/null; then ok "cron 0 */6 * * *"; else bad "cron pattern wrong/missing"; fi

step "3. Matrix includes all 3 working sources"
for src in mcp fetch-ai paxio-curated; do
  if grep -E "source:.*\[.*$src" "$WF" >/dev/null || grep -A 4 "matrix:" "$WF" | grep -q "$src"; then
    ok "matrix has $src"
  else
    bad "matrix missing $src"
  fi
done

step "4. fail-fast: false (one source failure doesn't abort others)"
if grep -E "fail-fast:\s*false" "$WF" >/dev/null; then ok "fail-fast: false set"; else bad "fail-fast missing — one source error would abort others"; fi

step "5. Per-source concurrency group (parallel sources allowed)"
if grep -E "scheduled-crawl-\\\$\\{\\{\s*matrix\.source" "$WF" >/dev/null; then
  ok "concurrency group per source"
else
  bad "concurrency group not per-source — parallel sources would block each other"
fi

step "6. workflow_dispatch options include all 6 sources (3 working + 3 stubs)"
for opt in mcp fetch-ai paxio-curated erc8004 a2a virtuals; do
  if grep -E "^\s*-\s*$opt\s*$" "$WF" >/dev/null; then
    ok "workflow_dispatch options has $opt"
  else
    bad "workflow_dispatch options missing $opt"
  fi
done

step "7. Scheduled job separated from manual job (different if conditions)"
if grep -q "if: github.event_name == 'schedule'" "$WF" && grep -q "if: github.event_name == 'workflow_dispatch'" "$WF"; then
  ok "schedule + dispatch jobs separated by event_name"
else
  bad "scheduled and manual paths not split"
fi

echo
echo "M-L1-T3h-cron-matrix ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
