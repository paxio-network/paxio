#!/usr/bin/env bash
# TD-worktree-path acceptance — session worktrees live under unified parent
# /home/nous/paxio-worktrees/<session>, not /tmp/paxio-* (old) or /home/nous/paxio-* (flat).
#
# Migration: existing /tmp/paxio-* worktrees stay until their PRs merge;
# new worktrees use new parent.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

# ---------------------------------------------------------------------------
step "1. Protocol docs reference /home/nous/paxio-worktrees/ as worktree parent"
# ---------------------------------------------------------------------------
for f in .claude/rules/architect-protocol.md \
         .claude/rules/scope-guard.md \
         .claude/rules/workflow.md \
         .claude/rules/safety.md \
         .claude/rules/dev-startup.md \
         .claude/agents/test-runner.md \
         .claude/agents/reviewer.md; do
  if grep -q "paxio-worktrees" "$f" 2>/dev/null; then
    ok "$f references paxio-worktrees parent"
  else
    bad "$f missing paxio-worktrees reference"
  fi
done

# ---------------------------------------------------------------------------
step "2. No /tmp/paxio-<session> refs in protocol docs (only /tmp/paxio-*.log allowed for diagnostic logs)"
# ---------------------------------------------------------------------------
for f in .claude/rules/architect-protocol.md \
         .claude/rules/scope-guard.md \
         .claude/rules/workflow.md \
         .claude/rules/safety.md \
         .claude/rules/dev-startup.md \
         .claude/agents/test-runner.md \
         .claude/agents/reviewer.md; do
  # /tmp/paxio-foo (worktree path) BAD; /tmp/paxio-foo.log (log path) OK
  if grep -E '/tmp/paxio-[a-zA-Z0-9_-]+(/| |$|"|'"'"')' "$f" 2>/dev/null | grep -v '\.log\|\.txt\|\.csv\|paxio-tmp' >/dev/null; then
    bad "$f still has /tmp/paxio-<session> worktree path ref"
  else
    ok "$f no stale /tmp/paxio-<session> worktree refs"
  fi
done

# ---------------------------------------------------------------------------
step "3. architect-protocol.md mentions mkdir -p /home/nous/paxio-worktrees"
# ---------------------------------------------------------------------------
if grep -q "mkdir -p /home/nous/paxio-worktrees" .claude/rules/architect-protocol.md; then
  ok "ФАЗА 0.2 includes mkdir -p"
else
  bad "ФАЗА 0.2 missing mkdir -p step"
fi

# ---------------------------------------------------------------------------
step "4. Path convention rationale documented"
# ---------------------------------------------------------------------------
if grep -q "TD-worktree-path" .claude/rules/architect-protocol.md; then
  ok "TD-worktree-path rationale present"
else
  bad "TD-worktree-path rationale missing"
fi

# ---------------------------------------------------------------------------

echo
echo "TD-worktree-path ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
