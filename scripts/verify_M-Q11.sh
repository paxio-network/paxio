#!/usr/bin/env bash
# M-Q11 acceptance — dev agent frontmatters no longer eagerly preload skills.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. 4 dev agent frontmatters do NOT declare skills field"
for agent in backend-dev frontend-dev icp-dev registry-dev; do
  if awk '/^---$/{flag++;next} flag==1 && /^skills:/{found=1; exit} END{exit !found}' \
       ".claude/agents/${agent}.md" 2>/dev/null; then
    bad "${agent}.md still declares skills: field — would eager-load SKILL.md"
  else
    ok "${agent}.md no eager skill preload"
  fi
done

step "2. each agent still has core fields (name, description, isolation)"
for agent in backend-dev frontend-dev icp-dev registry-dev; do
  missing=""
  for field in name description isolation; do
    if ! awk -v f="^${field}:" '/^---$/{flag++;next} flag==1 && $0 ~ f{found=1; exit} END{exit !found}' \
         ".claude/agents/${agent}.md" 2>/dev/null; then
      missing="${missing} ${field}"
    fi
  done
  if [ -z "$missing" ]; then
    ok "${agent}.md core fields intact"
  else
    bad "${agent}.md missing fields:${missing}"
  fi
done

step "3. eager-load size per agent now matches PROJECT donor pattern (~3-7 KB only, no SKILL.md preload)"
for agent in backend-dev frontend-dev icp-dev registry-dev; do
  agent_sz=$(wc -c < ".claude/agents/${agent}.md")
  # PROJECT donor: backend-dev=3582b, frontend-dev=3739b. Paxio agent files
  # have unique content (Rust+DFX for icp/registry), so up to ~7 KB.
  if [ "$agent_sz" -le 7000 ]; then
    ok "${agent}.md is ${agent_sz}b — fits eager-load budget (PROJECT donor: 3.5-3.7 KB)"
  else
    bad "${agent}.md is ${agent_sz}b — over 7 KB budget"
  fi
done

step "4. drift-guard test GREEN"
if pnpm exec vitest run tests/m-q11-no-eager-skills.test.ts > /tmp/m-q11-tests.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-q11-tests.log | tail -1 || echo "")
  ok "drift-guard $passed"
else
  bad "drift-guard RED — see /tmp/m-q11-tests.log"
  tail -15 /tmp/m-q11-tests.log | sed 's,^,    ,'
fi

step "5. baseline vitest (no regressions)"
if pnpm exec vitest run > /tmp/m-q11-baseline.log 2>&1; then
  total=$(grep -oE 'Tests +[0-9]+ passed' /tmp/m-q11-baseline.log | tail -1 || echo "")
  ok "baseline $total"
else
  bad "baseline RED — see /tmp/m-q11-baseline.log"
  tail -20 /tmp/m-q11-baseline.log | sed 's,^,    ,'
fi

echo
echo "─────────────────────────────────────────────"
echo "M-Q11 ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1

echo
echo "Per-agent eager-load reduction (system prompt at /clear):"
echo "  backend-dev:  ~41 KB → ~5 KB (8 SKILL.md no longer preloaded)"
echo "  frontend-dev: ~36 KB → ~5 KB (7 SKILL.md no longer preloaded)"
echo "  icp-dev:      ~35 KB → ~6 KB"
echo "  registry-dev: ~40 KB → ~7 KB"
echo
echo "Skills are still invokable on-demand via the Skill tool when the model"
echo "explicitly needs the pattern — they just don't preload at session start."
echo
echo "PROJECT donor pattern: NO skills frontmatter, works fine on MiniMax-M2.7."
