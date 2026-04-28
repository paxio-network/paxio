#!/usr/bin/env bash
# M-Q4 acceptance — Context Budget (rule globs + startup-protocol slim + mini-milestones)
#
# Idempotent E2E. Steps:
#   1. Deliverables exist
#   2. Drift-guard test GREEN (context-budget-drift.test.ts)
#   3. Heavy rule globs are narrow (no "**/*", no broad "apps/**/...")
#   4. startup-protocol Step 2/5 role-conditional with grep/head
#   5. EXTRACTED.md compact (≤30KB) + key tokens
#   6. Infrastructure clean: typecheck + frozen-lockfile + baseline vitest

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

TMPDIR_LOCAL="$(mktemp -d -t mq4-acc-XXXXXX)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

# ---------------------------------------------------------------------------
# 1. Deliverables exist
# ---------------------------------------------------------------------------
step "1/6 Deliverables exist"

DELIVERABLES=(
  ".claude/rules/engineering-principles.md"
  ".claude/rules/coding-standards-checklist.md"
  ".claude/rules/architect-protocol.md"
  ".claude/rules/startup-protocol.md"
  "docs/design/paxio-b5/EXTRACTED.md"
  "docs/sprints/M-L10.2-css-tokens.md"
  "docs/sprints/M-L10.3-shell-components.md"
  "docs/sprints/M-L10.4-hero.md"
  "docs/sprints/M-L10.5-scrolls-wiring.md"
  "docs/sprints/M-Q4-context-budget.md"
  "tests/context-budget-drift.test.ts"
)

for f in "${DELIVERABLES[@]}"; do
  if [ -f "$f" ]; then
    ok "$f"
  else
    bad "$f MISSING"
  fi
done

# ---------------------------------------------------------------------------
# 2. Drift-guard test GREEN
# ---------------------------------------------------------------------------
step "2/6 Drift-guard test GREEN"

if pnpm exec vitest run tests/context-budget-drift.test.ts > "$TMPDIR_LOCAL/drift.log" 2>&1; then
  P=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/drift.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  ok "context-budget-drift.test.ts $P passed"
else
  bad "drift-guard tests RED:"
  tail -25 "$TMPDIR_LOCAL/drift.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 3. Heavy rule globs narrow
# ---------------------------------------------------------------------------
step "3/6 Heavy rule globs narrow"

check_globs_narrow() {
  local file="$1"
  local globs
  globs=$(grep -E '^globs:' "$file" || echo "")
  if [ -z "$globs" ]; then
    bad "$file MISSING globs frontmatter"
    return
  fi
  # Reject broad patterns
  if echo "$globs" | grep -qE '"\*\*/\*"'; then
    bad "$file has broad \"**/*\" glob"
  elif echo "$globs" | grep -qE '"apps/\*\*/\*\.{ts,tsx,cjs,js}"'; then
    bad "$file has broad apps/** glob (every TS file pulls 26+ KB)"
  else
    ok "$file globs narrow"
  fi
}

check_globs_narrow ".claude/rules/engineering-principles.md"
check_globs_narrow ".claude/rules/coding-standards-checklist.md"
check_globs_narrow ".claude/rules/architect-protocol.md"

# Frontmatter must NOT mention specific milestone IDs
for rule in engineering-principles coding-standards-checklist architect-protocol; do
  fm=$(awk '/^---$/{c++; if(c==2) exit; next} c==1' ".claude/rules/${rule}.md")
  if echo "$fm" | grep -qE '\b(M-Q[0-9]+|M-L[0-9]+|TD-[0-9]+)\b'; then
    bad "${rule}.md frontmatter contains specific milestone ID (timeless principle violated)"
  else
    ok "${rule}.md frontmatter is timeless"
  fi
done

# ---------------------------------------------------------------------------
# 4. startup-protocol Step 2/5 role-conditional with grep/head
# ---------------------------------------------------------------------------
step "4/6 startup-protocol Step 2 + 5 role-conditional"

PROTOCOL=".claude/rules/startup-protocol.md"

if grep -qE "grep -E '🔴 OPEN'" "$PROTOCOL"; then
  ok "Step 2 uses grep на tech-debt"
else
  bad "Step 2 missing grep recipe"
fi

if grep -qE 'head -60 docs/project-state\.md' "$PROTOCOL"; then
  ok "Step 5 uses head на project-state"
else
  bad "Step 5 missing head recipe"
fi

# Both branches: dev-agents narrow, architect/reviewer full
if grep -qiE 'dev-агент|dev-agent' "$PROTOCOL" && grep -qiE 'architect.*reviewer' "$PROTOCOL"; then
  ok "Step 2/5 differentiates dev vs architect/reviewer"
else
  bad "Step 2/5 missing role differentiation"
fi

# Architect/reviewer branch must say "целиком"
if grep -qE 'architect.*reviewer.*\n.*целиком|целиком.*architect.*reviewer' "$PROTOCOL"; then
  ok "Architect/reviewer instructed to read full"
else
  # Multi-line fallback check
  if grep -B 2 -A 8 'architect.*reviewer' "$PROTOCOL" | grep -q 'целиком'; then
    ok "Architect/reviewer instructed to read full (multi-line)"
  else
    bad "Architect/reviewer NOT instructed to read full"
  fi
fi

# ---------------------------------------------------------------------------
# 5. EXTRACTED.md compact + key content
# ---------------------------------------------------------------------------
step "5/6 EXTRACTED.md compact + complete"

EXTRACT="docs/design/paxio-b5/EXTRACTED.md"
SIZE=$(wc -c < "$EXTRACT")
SIZE_KB=$((SIZE / 1024))
if [ "$SIZE" -lt 30720 ]; then
  ok "EXTRACTED.md is ${SIZE_KB}KB (≤30KB target)"
else
  bad "EXTRACTED.md is ${SIZE_KB}KB (exceeds 30KB)"
fi

for token in "--paper-0" "--ink-0" "--gold" "--f-display" "--f-mono"; do
  if grep -q -- "$token" "$EXTRACT"; then
    ok "EXTRACTED.md mentions token $token"
  else
    bad "EXTRACTED.md missing token $token"
  fi
done

for component in ".btn" ".panel" ".marquee" ".ticker-stack" ".chip"; do
  if grep -q -F -- "$component" "$EXTRACT"; then
    ok "EXTRACTED.md describes $component"
  else
    bad "EXTRACTED.md missing $component"
  fi
done

# ---------------------------------------------------------------------------
# 6. Infrastructure clean
# ---------------------------------------------------------------------------
step "6/6 Infrastructure clean"

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
# Summary
# ---------------------------------------------------------------------------
echo
echo "═══════════════════════════════════════════════════"
echo "  M-Q4 acceptance: PASS=$PASS FAIL=$FAIL"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
