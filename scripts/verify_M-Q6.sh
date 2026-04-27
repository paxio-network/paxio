#!/usr/bin/env bash
# M-Q6 acceptance — heavy rules manual-load only (globs: [])
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

TMPDIR_LOCAL="$(mktemp -d -t mq6-acc-XXXXXX)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

# ---------------------------------------------------------------------------
# 1. 6 heavy rules have globs: []
# ---------------------------------------------------------------------------
step "1/5 Heavy rules have globs: []"

HEAVY=(
  "engineering-principles.md"
  "coding-standards-checklist.md"
  "architect-protocol.md"
  "architecture.md"
  "workflow.md"
  "code-style.md"
)

for rule in "${HEAVY[@]}"; do
  globs=$(grep -E '^globs:' ".claude/rules/${rule}" || echo "")
  if echo "$globs" | grep -qE 'globs:\s*\[\s*\]'; then
    ok "${rule} → globs: []"
  else
    bad "${rule} STILL has glob patterns: $globs"
  fi
done

# ---------------------------------------------------------------------------
# 2. architect.md + reviewer.md Read them explicitly
# ---------------------------------------------------------------------------
step "2/5 Agent definitions instruct manual Read"

for agent in architect.md reviewer.md; do
  for rule in "${HEAVY[@]}"; do
    if grep -qF "Read .claude/rules/${rule}" ".claude/agents/${agent}"; then
      ok "${agent} → Read ${rule}"
    else
      bad "${agent} MISSING 'Read .claude/rules/${rule}' instruction"
    fi
  done
done

# ---------------------------------------------------------------------------
# 3. Dev-zone paths NOT in heavy rule globs (regression-guard)
# ---------------------------------------------------------------------------
step "3/5 Dev-zone paths excluded from heavy rule globs"

DEV_PATHS=("docs/sprints" "docs/feature-areas" "apps/" "products/" "packages/" "platform/" "tests/" "scripts/")

for rule in "${HEAVY[@]}"; do
  globs=$(grep -E '^globs:' ".claude/rules/${rule}" || echo "")
  found_violation=0
  for path in "${DEV_PATHS[@]}"; do
    if echo "$globs" | grep -qF "$path"; then
      bad "${rule} has dev-zone path: $path"
      found_violation=1
      break
    fi
  done
  if [ "$found_violation" -eq 0 ]; then
    ok "${rule} excludes all dev-zone paths"
  fi
done

# ---------------------------------------------------------------------------
# 4. Drift-guard tests GREEN
# ---------------------------------------------------------------------------
step "4/5 Drift-guard tests GREEN"

if pnpm exec vitest run tests/context-budget-drift.test.ts > "$TMPDIR_LOCAL/drift.log" 2>&1; then
  P=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/drift.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  ok "context-budget-drift.test.ts $P passed"
else
  bad "drift-guard tests RED:"
  tail -25 "$TMPDIR_LOCAL/drift.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 5. Infrastructure clean
# ---------------------------------------------------------------------------
step "5/5 Infrastructure clean"

if pnpm install --frozen-lockfile --lockfile-only > "$TMPDIR_LOCAL/install.log" 2>&1; then
  ok "pnpm install --frozen-lockfile clean"
else
  bad "pnpm install --frozen-lockfile FAILED"
fi

if pnpm typecheck > "$TMPDIR_LOCAL/typecheck.log" 2>&1; then
  ok "pnpm typecheck clean"
else
  bad "pnpm typecheck FAILED:"
  tail -10 "$TMPDIR_LOCAL/typecheck.log" | sed 's,^,     ,'
fi

if pnpm exec vitest run > "$TMPDIR_LOCAL/baseline.log" 2>&1; then
  TOTAL=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/baseline.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  ok "baseline vitest GREEN ($TOTAL passed)"
else
  bad "baseline vitest RED:"
  tail -15 "$TMPDIR_LOCAL/baseline.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
echo
echo "═══════════════════════════════════════════════════"
echo "  acceptance: PASS=$PASS FAIL=$FAIL"
echo "═══════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ] || exit 1
exit 0
