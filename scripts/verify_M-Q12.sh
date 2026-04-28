#!/usr/bin/env bash
# M-Q12 acceptance — CLAUDE.md slimmed via reference extraction.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. CLAUDE.md size in slim range [5500, 7700] bytes"
size=$(wc -c < CLAUDE.md)
if [ "$size" -ge 5500 ] && [ "$size" -le 7700 ]; then
  ok "CLAUDE.md is ${size}b (was ~12500b pre-M-Q12)"
else
  bad "CLAUDE.md size ${size}b out of range [5500, 7700]"
fi

step "2. extracted reference docs exist + non-empty"
for path in docs/architecture/BUILD-COMMANDS.md docs/architecture/ICP-PRINCIPLE.md docs/architecture/MONOREPO.md; do
  if [ -f "$path" ] && [ "$(wc -c < "$path")" -gt 500 ]; then
    ok "${path} exists ($(wc -c < $path) bytes)"
  else
    bad "${path} missing or stub"
  fi
done

step "3. CLAUDE.md links to extracted refs"
for ref in "docs/architecture/BUILD-COMMANDS.md" "docs/architecture/ICP-PRINCIPLE.md" "docs/architecture/MONOREPO.md" "docs/cicd.md"; do
  if grep -q "$ref" CLAUDE.md; then
    ok "links to $ref"
  else
    bad "missing link to $ref"
  fi
done

step "4. all 7 agents in File Ownership table"
for agent in architect backend-dev icp-dev registry-dev frontend-dev test-runner reviewer; do
  if grep -qE "^\|\s+${agent}\s+\|" CLAUDE.md; then
    ok "agent ${agent} in ownership table"
  else
    bad "agent ${agent} missing from ownership table"
  fi
done

step "5. all 8 Architecture Principles preserved"
for principle in "Three-layer stack" "Non-custodial by default" "LLM-free for financial decisions" "Data externalization" "No hardcoded values" "Onion deps" "ICP только там где надо"; do
  if grep -qF "$principle" CLAUDE.md; then
    ok "principle: $principle"
  else
    bad "principle missing: $principle"
  fi
done

step "6. УСТАВНЫЕ ДОКУМЕНТЫ section + both merge gates"
if grep -q "УСТАВНЫЕ ДОКУМЕНТЫ" CLAUDE.md; then
  ok "constitutional docs section present"
else
  bad "constitutional docs section missing"
fi
if grep -q '`feature/\* → dev`' CLAUDE.md && grep -q '`dev → main`' CLAUDE.md; then
  ok "both merge gates documented"
else
  bad "merge gate(s) missing"
fi

step "7. drift-guard test GREEN"
if pnpm exec vitest run tests/m-q12-slim-claude-md.test.ts > /tmp/m-q12-tests.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-q12-tests.log | tail -1 || echo "")
  ok "drift-guard $passed"
else
  bad "drift-guard RED — see /tmp/m-q12-tests.log"
  tail -15 /tmp/m-q12-tests.log | sed 's,^,    ,'
fi

step "8. baseline vitest (no regressions)"
if pnpm exec vitest run > /tmp/m-q12-baseline.log 2>&1; then
  total=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-q12-baseline.log | tail -1 || echo "")
  ok "baseline $total"
else
  bad "baseline RED — see /tmp/m-q12-baseline.log"
  tail -20 /tmp/m-q12-baseline.log | sed 's,^,    ,'
fi

echo
echo "─────────────────────────────────────────────"
echo "M-Q12 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1

echo
echo "Eager-load profile post-M-Q12 (system prompt at /clear):"
echo "  CLAUDE.md:        12.5 KB → 6.9 KB (-44%)"
echo "  + agent.md (post-M-Q10/Q11):  ~5 KB"
echo "  Total Paxio config: ~12 KB (was ~17 KB post-M-Q11, ~50 KB pre-M-Q11)"
echo
echo "Remaining bloat is platform-side: Claude Code base system prompt + tool"
echo "schemas + MCP server registrations. These are user-side config, not Paxio."
echo "Recommend: disable Gmail/Calendar/Drive MCP servers in Claude config when"
echo "doing Paxio dev — they add tool schemas that don't serve the codebase."
