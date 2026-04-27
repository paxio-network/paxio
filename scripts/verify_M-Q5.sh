#!/usr/bin/env bash
# M-Q5 acceptance — Context Budget round 2 (3 more rules narrowed)
#
# Symptom that triggered M-Q5: backend-dev was still hitting compaction loop
# AFTER M-Q4. Diagnosis: 5 heavy rules (architecture.md 14 KB, workflow.md
# 12 KB, code-style.md 11 KB, plus scope-guard.md 17 KB and
# backend-architecture.md 10 KB) had broad globs that auto-injected on every
# backend-dev open of any TS/CJS file. Total auto-load: ~94 KB rules + 26 KB
# CLAUDE.md = ~120 KB BEFORE reading any spec / test / source.
#
# Fix: narrow 3 heaviest with broad globs (architecture / workflow / code-style)
# to architect-zone. Devs use domain-specific replacements:
#   - backend-architecture.md (kept broad) covers VM sandbox, server vs app
#   - backend-code-style.md (kept broad) covers TS V8 / FP / naming for backend
#   - frontend-rules.md (kept broad on apps/frontend/) covers all frontend
#   - rust-{error-handling,async,build}.md (manual read for canister work)
#
# Steps:
#   1. Deliverables exist
#   2. Drift-guard tests GREEN (37 tests = 31 M-Q4 + 6 M-Q5)
#   3. 3 rules have narrow globs (no apps/**/products/**)
#   4. Frontmatter timeless (no M-Q5 / M-L* / TD-N refs)
#   5. Domain-specific replacements still broad (backend-architecture,
#      backend-code-style, frontend-rules — devs need them)
#   6. Infrastructure clean (typecheck + lockfile + baseline vitest)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

TMPDIR_LOCAL="$(mktemp -d -t mq5-acc-XXXXXX)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

# ---------------------------------------------------------------------------
# 1. Deliverables exist
# ---------------------------------------------------------------------------
step "1/6 Deliverables exist"

DELIVERABLES=(
  ".claude/rules/architecture.md"
  ".claude/rules/workflow.md"
  ".claude/rules/code-style.md"
  "tests/context-budget-drift.test.ts"
  "docs/sprints/M-Q5-context-budget-round-2.md"
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
step "2/6 Drift-guard test GREEN (37 tests = 31 M-Q4 + 6 M-Q5)"

if pnpm exec vitest run tests/context-budget-drift.test.ts > "$TMPDIR_LOCAL/drift.log" 2>&1; then
  P=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/drift.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  ok "context-budget-drift.test.ts $P passed"
  # Specifically expect 37
  if [ "$P" -eq 37 ]; then
    ok "exactly 37 tests (31 M-Q4 + 6 M-Q5)"
  else
    bad "expected 37 tests, got $P (drift in test count?)"
  fi
else
  bad "drift-guard tests RED:"
  tail -25 "$TMPDIR_LOCAL/drift.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 3. Heavy rule globs narrow (M-Q5 additions)
# ---------------------------------------------------------------------------
step "3/6 architecture.md / workflow.md / code-style.md narrow"

check_narrow() {
  local file="$1"
  local globs
  globs=$(grep -E '^globs:' "$file" || echo "")
  if [ -z "$globs" ]; then
    bad "$file MISSING globs frontmatter"
    return
  fi
  if echo "$globs" | grep -qE '"apps/\*\*/\*\.{ts,tsx,cjs,js}"'; then
    bad "$file STILL has broad apps/** glob"
  elif echo "$globs" | grep -qE '"products/\*\*/\*\.{ts,js,rs}"'; then
    bad "$file STILL has broad products/** glob"
  else
    ok "$file globs narrow (no apps/** / products/**)"
  fi
}

check_narrow ".claude/rules/architecture.md"
check_narrow ".claude/rules/workflow.md"
check_narrow ".claude/rules/code-style.md"

# ---------------------------------------------------------------------------
# 4. Frontmatter timeless (no M-Q5 / M-L* / TD-N refs)
# ---------------------------------------------------------------------------
step "4/6 Frontmatter timeless"

for rule in architecture workflow code-style; do
  fm=$(awk '/^---$/{c++; if(c==2) exit; next} c==1' ".claude/rules/${rule}.md")
  if echo "$fm" | grep -qE '\b(M-Q[0-9]+|M-L[0-9]+|TD-[0-9]+)\b'; then
    bad "${rule}.md frontmatter has specific milestone ID (timeless violated)"
  else
    ok "${rule}.md frontmatter is timeless"
  fi
done

# ---------------------------------------------------------------------------
# 5. Domain-specific replacements still broad (devs DO need these)
# ---------------------------------------------------------------------------
step "5/6 Domain-specific dev rules still broad"

check_broad_for_devs() {
  local file="$1"
  local pattern="$2"
  local globs
  globs=$(grep -E '^globs:' "$file" || echo "")
  if echo "$globs" | grep -qE "$pattern"; then
    ok "$file still broad for dev auto-load ($pattern)"
  else
    bad "$file LOST broad glob for devs — they will lose context!"
  fi
}

check_broad_for_devs ".claude/rules/backend-architecture.md" 'apps/back|products/\*\*/app'
check_broad_for_devs ".claude/rules/backend-code-style.md" 'apps/back|products/\*\*/app'
check_broad_for_devs ".claude/rules/frontend-rules.md" 'apps/frontend'
check_broad_for_devs ".claude/rules/safety.md" 'apps|products|packages'
check_broad_for_devs ".claude/rules/testing.md" 'apps|products|packages'
check_broad_for_devs ".claude/rules/scope-guard.md" 'apps|products|packages'
check_broad_for_devs ".claude/rules/startup-protocol.md" 'apps|products|packages'

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
echo "  M-Q5 acceptance: PASS=$PASS FAIL=$FAIL"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
