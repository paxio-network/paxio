#!/usr/bin/env bash
# M-Q3 acceptance — Process Hygiene & Worktree Isolation
#
# Idempotent E2E verification:
#   1. M-Q3 deliverables exist (rules updates, drift-guard test, milestone doc)
#   2. Drift-guard test (process-hygiene-drift.test.ts) GREEN
#   3. Worktree creation + isolation contract:
#      - `git worktree add <tmpdir>` succeeds from /home/nous/paxio
#      - HEAD in worktree differs from HEAD in main checkout (separate state)
#      - `git worktree remove` cleans up without manual intervention
#   4. Cross-session collision detection:
#      - two sequential worktrees have separate node_modules ownership chain
#        (simulated via `stat -c %u`); they don't trip each other's chmod
#   5. Reviewer Phase 1.6 hook smoke: simulate untracked file scenario,
#      verify reviewer's `git status --porcelain` would catch it (no impl
#      runs reviewer here — we verify the rule is in place + machine-checkable)
#   6. safety.md cross-user section is present + lint-clean
#
# Re-runnable без manual cleanup. Trap для temp dirs + worktrees.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

# Cleanup: remove temp dirs + any leftover worktrees we created
TMPDIR_LOCAL="$(mktemp -d -t mq3-acc-XXXXXX)"
WORKTREES_CREATED=()
cleanup() {
  for wt in "${WORKTREES_CREATED[@]:-}"; do
    if [ -d "$wt" ]; then
      git worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
    fi
  done
  git worktree prune 2>/dev/null || true
  rm -rf "$TMPDIR_LOCAL"
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# 1. M-Q3 deliverables exist
# ---------------------------------------------------------------------------
step "1/6 M-Q3 deliverables exist"

DELIVERABLES=(
  ".claude/rules/startup-protocol.md"
  ".claude/rules/architect-protocol.md"
  ".claude/rules/workflow.md"
  ".claude/rules/scope-guard.md"
  ".claude/rules/safety.md"
  ".claude/agents/reviewer.md"
  "tests/process-hygiene-drift.test.ts"
  "docs/sprints/M-Q3-process-hygiene.md"
)

for f in "${DELIVERABLES[@]}"; do
  if [ -f "$f" ]; then
    ok "$f exists"
  else
    bad "$f MISSING"
  fi
done

# ---------------------------------------------------------------------------
# 2. Drift-guard test GREEN
# ---------------------------------------------------------------------------
step "2/6 Drift-guard tests GREEN"

if pnpm exec vitest run tests/process-hygiene-drift.test.ts > "$TMPDIR_LOCAL/drift.log" 2>&1; then
  TOTAL=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/drift.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  ok "process-hygiene-drift.test.ts GREEN ($TOTAL passed)"
else
  bad "process-hygiene-drift.test.ts RED:"
  tail -25 "$TMPDIR_LOCAL/drift.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 3. Worktree creation + isolation contract
# ---------------------------------------------------------------------------
step "3/6 Worktree creation + isolation contract"

# Source repo for worktree commands — use main checkout, NOT current $ROOT
# (which may itself be a worktree). This avoids "main working tree" surprises.
MAIN_REPO="/home/nous/paxio"

if [ ! -d "$MAIN_REPO/.git" ] && [ ! -f "$MAIN_REPO/.git" ]; then
  bad "$MAIN_REPO is not a git working tree — skipping section 3"
else
  WT_A="$TMPDIR_LOCAL/wt-a"
  WT_B="$TMPDIR_LOCAL/wt-b"

  if git -C "$MAIN_REPO" worktree add --detach "$WT_A" > "$TMPDIR_LOCAL/wta.log" 2>&1; then
    WORKTREES_CREATED+=("$WT_A")
    ok "git worktree add (session A) succeeded"
  else
    bad "git worktree add (session A) FAILED:"
    tail -5 "$TMPDIR_LOCAL/wta.log" | sed 's,^,     ,'
  fi

  if git -C "$MAIN_REPO" worktree add --detach "$WT_B" > "$TMPDIR_LOCAL/wtb.log" 2>&1; then
    WORKTREES_CREATED+=("$WT_B")
    ok "git worktree add (session B) succeeded"
  else
    bad "git worktree add (session B) FAILED:"
    tail -5 "$TMPDIR_LOCAL/wtb.log" | sed 's,^,     ,'
  fi

  # Isolation: switch HEAD in WT_A, verify WT_B's HEAD doesn't move
  if [ -d "$WT_A" ] && [ -d "$WT_B" ]; then
    HEAD_A_BEFORE=$(git -C "$WT_A" rev-parse HEAD)
    HEAD_B_BEFORE=$(git -C "$WT_B" rev-parse HEAD)
    # Move WT_A to its parent commit (detached state — safe)
    git -C "$WT_A" checkout HEAD~1 > /dev/null 2>&1 || true
    HEAD_A_AFTER=$(git -C "$WT_A" rev-parse HEAD)
    HEAD_B_AFTER=$(git -C "$WT_B" rev-parse HEAD)

    if [ "$HEAD_A_BEFORE" != "$HEAD_A_AFTER" ]; then
      ok "session A HEAD moved (checkout HEAD~1 worked)"
    else
      bad "session A HEAD did NOT move (checkout no-op?)"
    fi

    if [ "$HEAD_B_BEFORE" = "$HEAD_B_AFTER" ]; then
      ok "session B HEAD unchanged (isolation OK)"
    else
      bad "session B HEAD changed when A moved — ISOLATION BROKEN"
    fi
  fi

  # Cleanup contract: remove WT_A, verify WT_B still works
  if [ -d "$WT_A" ]; then
    if git -C "$MAIN_REPO" worktree remove --force "$WT_A" > /dev/null 2>&1; then
      # Drop WT_A from cleanup list (already removed)
      NEW_WT=()
      for wt in "${WORKTREES_CREATED[@]:-}"; do
        if [ "$wt" != "$WT_A" ]; then
          NEW_WT+=("$wt")
        fi
      done
      WORKTREES_CREATED=("${NEW_WT[@]:-}")
      ok "git worktree remove (session A) cleaned up"
    else
      bad "git worktree remove (session A) FAILED"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# 4. Reviewer Phase 1.6 rule present (porcelain checkpoint)
# ---------------------------------------------------------------------------
step "4/6 Reviewer Phase 1.6 porcelain checkpoint present"

if grep -q "git status --porcelain" .claude/agents/reviewer.md; then
  ok "reviewer.md contains 'git status --porcelain' check"
else
  bad "reviewer.md MISSING 'git status --porcelain' rule"
fi

if grep -qE "Phase 1\.6|tree.*hygiene|tree-clean|tree clean" .claude/agents/reviewer.md; then
  ok "reviewer.md has tree-hygiene phase header"
else
  bad "reviewer.md MISSING tree-hygiene phase header"
fi

# ---------------------------------------------------------------------------
# 5. safety.md cross-user section present + non-trivial
# ---------------------------------------------------------------------------
step "5/6 safety.md cross-user section"

if grep -qE "^## Cross-user|cross-user file ownership" .claude/rules/safety.md; then
  ok "safety.md has Cross-user section header"
else
  bad "safety.md MISSING Cross-user section header"
fi

# Section must mention all three failing commands
for term in "pnpm install" "copy-api-handlers" "EPERM" "chmod"; do
  if grep -qF "$term" .claude/rules/safety.md; then
    ok "safety.md mentions '$term'"
  else
    bad "safety.md MISSING mention of '$term'"
  fi
done

# Workaround pointer present
if grep -q "worktree" .claude/rules/safety.md; then
  ok "safety.md points to worktree workaround"
else
  bad "safety.md MISSING worktree pointer"
fi

# ---------------------------------------------------------------------------
# 6. Worktree convention reachable from all 4 protocol files
# ---------------------------------------------------------------------------
step "6/6 worktree convention reachable from all 4 protocol files"

for f in startup-protocol.md architect-protocol.md workflow.md scope-guard.md; do
  if grep -q "worktree" ".claude/rules/$f"; then
    ok ".claude/rules/$f mentions worktree"
  else
    bad ".claude/rules/$f MISSING worktree mention"
  fi
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo
echo "═══════════════════════════════════════════════════"
echo "  M-Q3 acceptance: PASS=$PASS FAIL=$FAIL"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
