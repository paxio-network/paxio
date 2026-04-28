#!/usr/bin/env bash
# M-Q10 acceptance — dev agent files slimmed via topic dedup; scope-guard.md manual-load.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. scope-guard.md frontmatter globs: []"
if head -5 .claude/rules/scope-guard.md | grep -qE 'globs:\s*\[\s*\]'; then
  ok "scope-guard.md is manual-load only (architect/reviewer reference)"
else
  bad "scope-guard.md still has broad globs — devs would auto-load it"
fi

step "2. scope-guard.md content preserved (≥ 14 KB — full ownership table + GIT/MERGE + violation template)"
size=$(wc -c < .claude/rules/scope-guard.md)
if [ "$size" -ge 14000 ]; then
  ok "scope-guard.md content preserved ($size bytes)"
else
  bad "scope-guard.md too small ($size bytes) — content lost?"
fi

step "3. scope-guard.md description does NOT carry milestone IDs (timeless rule, not sprint-tagged)"
desc=$(head -3 .claude/rules/scope-guard.md | grep '^description:' || echo "")
if echo "$desc" | grep -qE 'M-Q[0-9]+|M-L[0-9]+|\bdedup\b'; then
  bad "description carries milestone ID or 'dedup' — antipattern: '$desc'"
else
  ok "scope-guard.md description timeless (no milestone tag)"
fi

step "4. dev-startup.md auto-loads on impl paths"
globs=$(head -5 .claude/rules/dev-startup.md | grep '^globs:' || echo "")
if echo "$globs" | grep -q 'apps/\*\*' \
   && echo "$globs" | grep -q 'products/\*\*' \
   && echo "$globs" | grep -q 'packages/\*\*' \
   && echo "$globs" | grep -q 'platform/\*\*'; then
  ok "dev-startup.md auto-loads on apps/products/packages/platform impl paths"
else
  bad "dev-startup.md globs incomplete: '$globs'"
fi

step "5. dev-startup.md absorbs Three Hard Rules (devs need them at impl time, scope-guard.md no longer auto-loads)"
if grep -q "Three Hard Rules" .claude/rules/dev-startup.md \
   && grep -qE "NEVER touch other agents'" .claude/rules/dev-startup.md \
   && grep -qE "NEVER modify tests" .claude/rules/dev-startup.md \
   && grep -qE "NEVER\s+\`?git push" .claude/rules/dev-startup.md; then
  ok "dev-startup.md contains Three Hard Rules block"
else
  bad "dev-startup.md missing one or more Three Hard Rules"
fi

step "6. dev-startup.md absorbs SCOPE VIOLATION REQUEST escalation template"
if grep -q '!!! SCOPE VIOLATION REQUEST !!!' .claude/rules/dev-startup.md \
   && grep -q '!!! END SCOPE VIOLATION REQUEST !!!' .claude/rules/dev-startup.md; then
  ok "dev-startup.md contains escalation template (start + end markers)"
else
  bad "dev-startup.md missing escalation template"
fi

step "7. 4 dev agent files slimmed (size in target range)"
declare -A min_max
min_max[backend-dev]="3500 5500"
min_max[frontend-dev]="3500 5500"
min_max[icp-dev]="4500 6800"
min_max[registry-dev]="5000 7500"
for agent in backend-dev frontend-dev icp-dev registry-dev; do
  read -r min max <<< "${min_max[$agent]}"
  size=$(wc -c < ".claude/agents/${agent}.md")
  if [ "$size" -ge "$min" ] && [ "$size" -le "$max" ]; then
    ok "${agent}.md slim ($size bytes, target [$min..$max])"
  else
    bad "${agent}.md size out of range ($size bytes, expected [$min..$max])"
  fi
done

step "8. each agent file has all 5 required sections (Scope, Architecture Reminders, Verification, Workflow, Git Policy)"
for agent in backend-dev frontend-dev icp-dev registry-dev; do
  missing=""
  for section in "Scope" "Architecture Reminders" "Verification" "Workflow" "Git Policy"; do
    if ! grep -qE "^##\s+${section}" ".claude/agents/${agent}.md"; then
      missing="${missing} '${section}'"
    fi
  done
  if [ -z "$missing" ]; then
    ok "${agent}.md has all 5 required sections"
  else
    bad "${agent}.md missing sections:${missing}"
  fi
done

step "9. each agent file links to dev-startup.md for Workflow"
for agent in backend-dev frontend-dev icp-dev registry-dev; do
  if grep -q "dev-startup.md" ".claude/agents/${agent}.md"; then
    ok "${agent}.md links to dev-startup.md"
  else
    bad "${agent}.md does NOT link to dev-startup.md (Workflow section orphan)"
  fi
done

step "10. agent files do NOT inline duplicate sections (Three Hard Rules, B1-B7 Phase B, Level 1/2/3, Startup Protocol)"
for agent in backend-dev frontend-dev icp-dev registry-dev; do
  problems=""
  if grep -qE '^##\s+Three Hard Rules' ".claude/agents/${agent}.md"; then
    problems="${problems} 'Three Hard Rules header'"
  fi
  if grep -qE 'B1-B7|reviewer Phase B' ".claude/agents/${agent}.md"; then
    problems="${problems} 'Multi-Tenancy P0 long form'"
  fi
  if grep -qE 'Scope violation levels' ".claude/agents/${agent}.md"; then
    problems="${problems} 'Level 1/2/3 enumeration'"
  fi
  if grep -qE '^##\s+Startup Protocol' ".claude/agents/${agent}.md"; then
    problems="${problems} 'Startup Protocol header'"
  fi
  if [ -z "$problems" ]; then
    ok "${agent}.md no duplicate sections (deduped)"
  else
    bad "${agent}.md still inlines:${problems}"
  fi
done

step "11. agent files do NOT have full SCOPE VIOLATION REQUEST template (devs read it from dev-startup.md)"
for agent in backend-dev frontend-dev icp-dev registry-dev; do
  if grep -q '!!! END SCOPE VIOLATION REQUEST !!!' ".claude/agents/${agent}.md"; then
    bad "${agent}.md inlines full template — should reference dev-startup.md instead"
  else
    ok "${agent}.md does not inline full escalation template"
  fi
done

step "12. drift-guard test GREEN"
if pnpm exec vitest run tests/m-q10-dedup-agents.test.ts > /tmp/m-q10-tests.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-q10-tests.log | tail -1 || echo "")
  ok "drift-guard $passed"
else
  bad "drift-guard RED — see /tmp/m-q10-tests.log"
  tail -20 /tmp/m-q10-tests.log | sed 's,^,    ,'
fi

step "13. baseline vitest (no regressions)"
if pnpm exec vitest run > /tmp/m-q10-baseline.log 2>&1; then
  total=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-q10-baseline.log | tail -1 || echo "")
  ok "baseline $total"
else
  bad "baseline RED — see /tmp/m-q10-baseline.log"
  tail -20 /tmp/m-q10-baseline.log | sed 's,^,    ,'
fi

echo
echo "─────────────────────────────────────────────"
echo "M-Q10 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1

echo
echo "Dev session auto-load before/after M-Q10:"
echo "  backend-dev.md:  ~12 KB → ~4.7 KB"
echo "  frontend-dev.md: ~12 KB → ~4.8 KB"
echo "  icp-dev.md:      ~9.3 KB → ~5.9 KB"
echo "  registry-dev.md: ~10.8 KB → ~6.7 KB"
echo "  scope-guard.md:  ~16.6 KB auto-load → manual-load (devs no longer pull at every impl read)"
echo
echo "Each topic now lives in ONE auto-loaded source — no replication across files."
