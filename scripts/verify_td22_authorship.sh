#!/usr/bin/env bash
# ================================================================
# TD-22 acceptance: docs/tech-debt.md authorship enforcement
# ================================================================
# Tests that `.claude/settings.json` contains a PreToolUse Bash hook
# which enforces the authorship rule:
#   - BLOCK git commit when docs/tech-debt.md is staged UNLESS
#       * commit message starts with `reviewer:`, OR
#       * commit message contains `[tech-debt: fill-test-column]` marker
#
# Currently FAIL (hook blocks unconditionally / no marker support).
# After user lands the richer hook in `.claude/settings.json`: PASS.
#
# Usage:
#   bash scripts/verify_td22_authorship.sh
#
# Exit codes:
#   0 — all checks PASS (hook is correctly configured)
#   1 — at least one check FAIL
# ================================================================

set -euo pipefail

# Ensure $HOME/tmp exists before any redirect (verify-script-robustness invariant)
mkdir -p "$HOME/tmp"

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

SETTINGS=".claude/settings.json"
PASS=0
FAIL=0

pass() { echo "✅ PASS — $1"; PASS=$((PASS + 1)); }
fail() { echo "❌ FAIL — $1"; FAIL=$((FAIL + 1)); }

# ----------------------------------------------------------------
# Check 1: settings.json exists + valid JSON
# ----------------------------------------------------------------
echo "[1/7] settings.json exists and is valid JSON"
if [ ! -f "$SETTINGS" ]; then
  fail "$SETTINGS not found"
  exit 1
fi
if ! python3 -c "import json,sys; json.load(open('$SETTINGS'))" 2>/dev/null; then
  fail "$SETTINGS is not valid JSON"
  exit 1
fi
pass "$SETTINGS parses as JSON"

# Extract all PreToolUse Bash commands into newline-separated buffer.
# Using python3 — available on every paxio dev machine, avoids jq dep.
HOOK_CMDS="$(python3 -c "
import json
s = json.load(open('$SETTINGS'))
pre = s.get('hooks', {}).get('PreToolUse', [])
cmds = []
for g in pre:
    if g.get('matcher') == 'Bash':
        for h in g.get('hooks', []):
            cmds.append(h.get('command', ''))
print('\\n===HOOK===\\n'.join(cmds))
" 2>/dev/null || echo "")"

if [ -z "$HOOK_CMDS" ]; then
  fail "no PreToolUse Bash hooks found in $SETTINGS"
  exit 1
fi

# Find the specific tech-debt hook command (first one mentioning tech-debt.md).
TD_HOOK="$(echo "$HOOK_CMDS" | awk '/tech-debt/' | head -1 || true)"

# ----------------------------------------------------------------
# Check 2: a PreToolUse hook references docs/tech-debt.md
# ----------------------------------------------------------------
echo "[2/7] PreToolUse hook references docs/tech-debt.md"
if [ -z "$TD_HOOK" ]; then
  fail "no PreToolUse hook mentions docs/tech-debt.md"
else
  pass "hook references docs/tech-debt.md"
fi

# ----------------------------------------------------------------
# Check 3: hook recognises bypass marker `[tech-debt: fill-test-column]`
# ----------------------------------------------------------------
echo "[3/7] hook recognises bypass marker [tech-debt: fill-test-column]"
if echo "$TD_HOOK" | grep -qE '\[tech-debt:[[:space:]]*fill-test-column\]'; then
  pass "bypass marker pattern found in hook"
else
  fail "hook missing bypass marker pattern [tech-debt: fill-test-column]"
fi

# ----------------------------------------------------------------
# Check 4: hook recognises reviewer commits
# ----------------------------------------------------------------
echo "[4/7] hook recognises reviewer-authored commits"
if echo "$TD_HOOK" | grep -qE 'reviewer:|Co-Authored-By.*reviewer'; then
  pass "reviewer allow-pattern found in hook"
else
  fail "hook missing reviewer allow-pattern (reviewer: prefix OR Co-Authored-By trailer)"
fi

# ----------------------------------------------------------------
# Check 5: hook exits 1 on violation
# ----------------------------------------------------------------
echo "[5/7] hook calls exit 1 on violation"
if echo "$TD_HOOK" | grep -qE 'exit[[:space:]]+1'; then
  pass "exit 1 found in hook"
else
  fail "hook does not call exit 1 (violation must halt tool)"
fi

# ----------------------------------------------------------------
# Check 6: hook prints BLOCKED message
# ----------------------------------------------------------------
echo "[6/7] hook prints BLOCKED + tech-debt clue"
if echo "$TD_HOOK" | grep -q 'BLOCKED' && echo "$TD_HOOK" | grep -q 'tech-debt'; then
  pass "BLOCKED message mentions tech-debt"
else
  fail "hook does not emit BLOCKED message mentioning tech-debt.md"
fi

# ----------------------------------------------------------------
# Check 7: integration — simulate hook behaviour in scratch dir
# Simulates three scenarios and runs the extracted hook command:
#   (a) architect commit (no marker)       → expect exit 1 BLOCKED
#   (b) architect with bypass marker       → expect exit 0 (allowed)
#   (c) reviewer-authored commit           → expect exit 0 (allowed)
#
# Uses a temp git repo with tech-debt.md staged, runs the hook as bash
# with TOOL_INPUT env var (mirrors Claude Code hook execution model).
# ----------------------------------------------------------------
echo "[7/7] integration — simulate hook on 3 scenarios"

SCRATCH="$(mktemp -d -p "$HOME/tmp" td22-XXXXXX)"
trap 'rm -rf "$SCRATCH"' EXIT

(
  cd "$SCRATCH"
  git init -q
  git config user.email td22@paxio.local
  git config user.name td22
  mkdir -p docs
  echo "mock tech-debt row" > docs/tech-debt.md
  git add docs/tech-debt.md
) >/dev/null 2>&1

run_hook() {
  # Runs the extracted hook command with given TOOL_INPUT in scratch dir.
  # Returns 0 if hook allowed tool (silent or non-1 exit), 1 if blocked.
  local tool_input="$1"
  (
    cd "$SCRATCH"
    TOOL_INPUT="$tool_input" bash -c "$TD_HOOK" 2>/dev/null
  )
}

SCENARIO_PASS=0
SCENARIO_FAIL=0

# Scenario (a): architect without marker → must block
if run_hook "git commit -m 'docs: update TD-X description'"; then
  fail "(7a) architect commit without marker should be BLOCKED but hook allowed it"
  SCENARIO_FAIL=$((SCENARIO_FAIL + 1))
else
  pass "(7a) architect commit without marker correctly BLOCKED"
  SCENARIO_PASS=$((SCENARIO_PASS + 1))
fi

# Scenario (b): architect with bypass marker → must allow
if run_hook "git commit -m 'test(TD-99): RED spec [tech-debt: fill-test-column]'"; then
  pass "(7b) architect with [tech-debt: fill-test-column] marker correctly ALLOWED"
  SCENARIO_PASS=$((SCENARIO_PASS + 1))
else
  fail "(7b) architect with bypass marker should be ALLOWED but hook blocked"
  SCENARIO_FAIL=$((SCENARIO_FAIL + 1))
fi

# Scenario (c): reviewer-authored commit → must allow
if run_hook "git commit -m 'reviewer: TD-99 closed — APPROVED'"; then
  pass "(7c) reviewer-prefixed commit correctly ALLOWED"
  SCENARIO_PASS=$((SCENARIO_PASS + 1))
else
  fail "(7c) reviewer-prefixed commit should be ALLOWED but hook blocked"
  SCENARIO_FAIL=$((SCENARIO_FAIL + 1))
fi

# ----------------------------------------------------------------
# Summary
# ----------------------------------------------------------------
echo ""
echo "================================================================"
echo "TD-22 authorship enforcement acceptance"
echo "  Static checks:     $PASS passed,        $FAIL failed"
echo "  Scenario sim:      $SCENARIO_PASS passed, $SCENARIO_FAIL failed"
echo "================================================================"

if [ $FAIL -eq 0 ] && [ $SCENARIO_FAIL -eq 0 ]; then
  echo "✅ TD-22 hook PASS — authorship enforcement active"
  exit 0
else
  echo "❌ TD-22 hook FAIL — see above; user must implement enriched hook"
  echo "   (see docs/sprints/M-TD22-authorship-hook.md Шаг 2)"
  exit 1
fi
