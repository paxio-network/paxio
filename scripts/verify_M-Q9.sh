#!/usr/bin/env bash
# M-Q9 acceptance — safety/testing manual-load + dev agent targeted grep.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. safety.md frontmatter globs: []"
if head -5 .claude/rules/safety.md | grep -qE 'globs:\s*\[\s*\]'; then
  ok "safety.md is manual-load only"
else
  bad "safety.md still has broad globs — devs would auto-load it"
fi

step "2. testing.md frontmatter globs: []"
if head -5 .claude/rules/testing.md | grep -qE 'globs:\s*\[\s*\]'; then
  ok "testing.md is manual-load only"
else
  bad "testing.md still has broad globs"
fi

step "3. safety.md content preserved (≥ 5 KB)"
size=$(wc -c < .claude/rules/safety.md)
if [ "$size" -ge 5000 ]; then
  ok "safety.md content preserved ($size bytes)"
else
  bad "safety.md too small ($size bytes) — content lost?"
fi

step "4. testing.md content preserved (≥ 5 KB)"
size=$(wc -c < .claude/rules/testing.md)
if [ "$size" -ge 5000 ]; then
  ok "testing.md content preserved ($size bytes)"
else
  bad "testing.md too small ($size bytes) — content lost?"
fi

step "5. 4 dev agent files use targeted grep for tech-debt step"
for agent in backend-dev frontend-dev icp-dev registry-dev; do
  if grep -qE "grep[^']*'🔴 OPEN.*${agent}'[^\\n]*tech-debt" .claude/agents/${agent}.md; then
    ok "${agent}.md uses targeted grep for tech-debt"
  else
    bad "${agent}.md tech-debt step is not targeted grep"
  fi
done

step "6. dev agent files do NOT have 'Read tech-debt.md' as bare step (would pull paragraph rows)"
for agent in backend-dev frontend-dev icp-dev registry-dev; do
  if grep -qE '^[0-9]+\.\s+Read\s+`?(docs/)?tech-debt\.md`?\s+—' .claude/agents/${agent}.md; then
    bad "${agent}.md still has 'Read tech-debt.md —' bare step (without grep filter)"
  else
    ok "${agent}.md tech-debt step uses grep, not whole-file Read"
  fi
done

step "7. drift-guard test GREEN"
if pnpm exec vitest run tests/m-q9-dedup-rules.test.ts > /tmp/m-q9-tests.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-q9-tests.log | tail -1 || echo "")
  ok "drift-guard $passed"
else
  bad "drift-guard RED — see /tmp/m-q9-tests.log"
  tail -15 /tmp/m-q9-tests.log | sed 's,^,    ,'
fi

step "8. baseline vitest (no regressions)"
if pnpm exec vitest run > /tmp/m-q9-baseline.log 2>&1; then
  total=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-q9-baseline.log | tail -1 || echo "")
  ok "baseline $total"
else
  bad "baseline RED — see /tmp/m-q9-baseline.log"
  tail -20 /tmp/m-q9-baseline.log | sed 's,^,    ,'
fi

echo
echo "─────────────────────────────────────────────"
echo "M-Q9 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "Frontend-dev session auto-load: ~70 KB → ~58 KB (saves safety+testing)."
echo "Backend-dev session auto-load:  ~78 KB → ~65 KB."
echo "Plus dev startup-time targeted grep replaces whole-file reads (~10K tokens saved)."
