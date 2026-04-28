#!/usr/bin/env bash
# M-Q2 acceptance — Architect Spec-Review Gate + Coding Standards Port
#
# Idempotent E2E verification:
#   1. All M-Q2 deliverables exist (rules files, tests, hook extension, workflow)
#   2. Drift-guard tests GREEN (5 test files: spec-review-checklist, reviewer-phase-0,
#      architect-self-review, rust-rules, ts-gap-rules, spec-review-workflow,
#      pre-commit-hook)
#   3. Infrastructure clean: pnpm install --frozen-lockfile + typecheck PASS
#   4. Hook smoke tests: lockfile-drift catcher works (architect-only block)
#   5. Workflow file structure verified (label gate, fast steps)
#   6. Sub-agent invocation pattern documented (architect-protocol.md § 6.5)
#
# Re-runnable без manual cleanup. Trap для temp files.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

# Cleanup temp directory + working tree on exit
TMPDIR_LOCAL="$(mktemp -d -t mq2-acc-XXXXXX)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

# ---------------------------------------------------------------------------
# 1. M-Q2 deliverables exist
# ---------------------------------------------------------------------------
step "1/6 M-Q2 deliverables exist"

DELIVERABLES=(
  ".claude/rules/coding-standards-checklist.md"
  ".claude/rules/rust-error-handling.md"
  ".claude/rules/rust-async.md"
  ".claude/rules/rust-build.md"
  ".claude/agents/reviewer.md"
  ".claude/rules/architect-protocol.md"
  ".claude/rules/workflow.md"
  ".claude/rules/code-style.md"
  ".claude/rules/architecture.md"
  ".husky/pre-commit"
  ".github/workflows/spec-review.yml"
  "docs/sprints/M-Q2-spec-review-gate.md"
)

for f in "${DELIVERABLES[@]}"; do
  if [ -f "$f" ]; then
    ok "$f exists"
  else
    bad "$f MISSING"
  fi
done

# ---------------------------------------------------------------------------
# 2. M-Q2 drift-guard tests GREEN
# ---------------------------------------------------------------------------
step "2/6 M-Q2 drift-guard tests GREEN"

DRIFT_TESTS=(
  "tests/spec-review-checklist.test.ts"
  "tests/reviewer-phase-0.test.ts"
  "tests/architect-self-review.test.ts"
  "tests/rust-rules.test.ts"
  "tests/ts-gap-rules.test.ts"
  "tests/spec-review-workflow.test.ts"
  "tests/pre-commit-hook.test.ts"
)

# Verify each test file exists first
for t in "${DRIFT_TESTS[@]}"; do
  if [ -f "$t" ]; then
    ok "$t present"
  else
    bad "$t MISSING"
  fi
done

# Run all drift-guard tests together
if pnpm exec vitest run "${DRIFT_TESTS[@]}" > "$TMPDIR_LOCAL/drift.log" 2>&1; then
  TOTAL=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/drift.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  ok "all drift-guard tests GREEN ($TOTAL passed)"
else
  bad "drift-guard tests RED — see breakdown:"
  tail -25 "$TMPDIR_LOCAL/drift.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 3. Infrastructure clean: pnpm install --frozen-lockfile + typecheck
# ---------------------------------------------------------------------------
step "3/6 Infrastructure clean (frozen-lockfile + typecheck)"

if pnpm install --frozen-lockfile --lockfile-only > "$TMPDIR_LOCAL/install.log" 2>&1; then
  ok "pnpm install --frozen-lockfile PASS (no lockfile drift)"
else
  bad "pnpm install --frozen-lockfile FAILED — TD-35 class regression:"
  tail -10 "$TMPDIR_LOCAL/install.log" | sed 's,^,     ,'
fi

if pnpm typecheck > "$TMPDIR_LOCAL/typecheck.log" 2>&1; then
  ok "pnpm typecheck clean"
else
  bad "pnpm typecheck FAILED:"
  tail -15 "$TMPDIR_LOCAL/typecheck.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 4. Hook smoke: lockfile-drift catcher works для architect (T-3)
# ---------------------------------------------------------------------------
step "4/6 .husky/pre-commit lockfile-drift catcher smoke (T-3)"

# Setup isolated temp git repo to test hook
SMOKE_DIR="$TMPDIR_LOCAL/hook-smoke"
mkdir -p "$SMOKE_DIR"
cd "$SMOKE_DIR"
git init -q
git config user.name architect
git config user.email architect@paxio.network
cp "$ROOT/.husky/pre-commit" .
chmod +x pre-commit
mkdir -p .git
echo '{}' > package.json
git add package.json
echo "test commit subject" > .git/COMMIT_EDITMSG

# Test: architect + package.json без pnpm-lock.yaml → exit 1
if bash pre-commit > /dev/null 2>&1; then
  bad "lockfile catcher did NOT block architect package.json без lockfile (regression!)"
else
  ok "lockfile catcher BLOCKS architect package.json без lockfile (exit ≠ 0)"
fi

# Test: override marker !!! LOCKFILE OK !!! → exit 0
echo "test commit !!! LOCKFILE OK !!! reason: clean removal" > .git/COMMIT_EDITMSG
if bash pre-commit > /dev/null 2>&1; then
  ok "lockfile catcher BYPASSES with !!! LOCKFILE OK !!! marker"
else
  bad "lockfile catcher did NOT honor override marker (regression!)"
fi

# Test: with both files staged → exit 0
echo "happy path commit" > .git/COMMIT_EDITMSG
touch pnpm-lock.yaml
git add pnpm-lock.yaml
if bash pre-commit > /dev/null 2>&1; then
  ok "lockfile catcher PASSES when both files staged (happy path)"
else
  bad "lockfile catcher false-positive on happy path (regression!)"
fi

# Test: non-architect identity bypasses lockfile check entirely
git config user.name backend-dev
git config user.email backend-dev@paxio.network
git rm --cached -f pnpm-lock.yaml > /dev/null 2>&1
git rm --cached -f package.json > /dev/null 2>&1
mkdir -p apps/back/server
echo "// safe" > apps/back/server/foo.cjs
git add apps/back/server/foo.cjs
echo "happy path" > .git/COMMIT_EDITMSG
if bash pre-commit > /dev/null 2>&1; then
  ok "lockfile catcher does NOT affect non-architect identities"
else
  bad "lockfile catcher incorrectly blocked non-architect commit (regression!)"
fi

cd "$ROOT"

# ---------------------------------------------------------------------------
# 5. Workflow file structure (T-4)
# ---------------------------------------------------------------------------
step "5/6 .github/workflows/spec-review.yml structure"

WF=".github/workflows/spec-review.yml"
if grep -q "spec-ready" "$WF"; then
  ok "label gate (spec-ready) present"
else
  bad "missing spec-ready label gate"
fi

if grep -q "pnpm install --frozen-lockfile" "$WF"; then
  ok "frozen-lockfile install step present"
else
  bad "missing frozen-lockfile install"
fi

if grep -q "pnpm typecheck" "$WF"; then
  ok "pnpm typecheck step present"
else
  bad "missing typecheck step"
fi

if grep -q "pnpm exec vitest run" "$WF"; then
  ok "root vitest step present"
else
  bad "missing root vitest"
fi

if grep -qE "timeout-minutes:\s*[1-5]\b" "$WF"; then
  ok "timeout ≤ 5 minutes (fast-gate constraint)"
else
  bad "missing or excessive timeout"
fi

if ! grep -qE "cargo (build|test)" "$WF"; then
  ok "no cargo build/test (out of scope для spec-review)"
else
  bad "spec-review should NOT run cargo (would slow gate)"
fi

# ---------------------------------------------------------------------------
# 6. Sub-agent invocation pattern documented (T-2)
# ---------------------------------------------------------------------------
step "6/6 Sub-agent invocation pattern (architect-protocol § 6.5)"

PROTO=".claude/rules/architect-protocol.md"

if grep -qE "^###\s*6\.5\s*[—\-]?\s*Self-call reviewer Phase 0" "$PROTO"; then
  ok "§ 6.5 Self-call reviewer Phase 0 section present"
else
  bad "missing § 6.5 section"
fi

if grep -qE 'subagent_type:\s*"reviewer"' "$PROTO"; then
  ok "Agent invocation pattern (subagent_type: reviewer) present"
else
  bad "missing Agent invocation pattern"
fi

if grep -qE "3.round|three round" "$PROTO"; then
  ok "3-rounds-then-escalate rule present"
else
  bad "missing escalation rule"
fi

if grep -q "DO NOT update.*tech-debt" "$PROTO"; then
  ok "Phase 0 boundary (no tech-debt updates) explicit"
else
  bad "missing Phase 0 boundary on tech-debt updates"
fi

if grep -q "coding-standards-checklist.md" "$PROTO"; then
  ok "checklist file referenced in invocation prompt"
else
  bad "missing checklist reference"
fi

# ---------------------------------------------------------------------------
# Final summary
# ---------------------------------------------------------------------------

echo
echo "─────────────────────────────────────────────"
echo "M-Q2 ACCEPTANCE — PASS=$PASS  FAIL=$FAIL"
echo "─────────────────────────────────────────────"

[ "$FAIL" -eq 0 ] || exit 1
