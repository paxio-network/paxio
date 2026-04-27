#!/usr/bin/env bash
# M-Q7 acceptance — slim CLAUDE.md + startup-protocol to PROJECT baseline
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

TMPDIR_LOCAL="$(mktemp -d -t mq7-acc-XXXXXX)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

# ---------------------------------------------------------------------------
# 1. CLAUDE.md ≤ 16 KB + preserves Turborepo content
# ---------------------------------------------------------------------------
step "1/5 CLAUDE.md slim + Turborepo preserved"

CLAUDE_SIZE=$(wc -c < CLAUDE.md)
if [ "$CLAUDE_SIZE" -le 16384 ]; then
  ok "CLAUDE.md $((CLAUDE_SIZE / 1024)) KB ≤ 16 KB"
else
  bad "CLAUDE.md $((CLAUDE_SIZE / 1024)) KB > 16 KB"
fi

for token in "Turborepo" "pnpm turbo" "@paxio" "Vercel Monorepo Projects"; do
  if grep -q -F -- "$token" CLAUDE.md; then
    ok "CLAUDE.md preserves '$token'"
  else
    bad "CLAUDE.md MISSING '$token'"
  fi
done

if grep -q "docs/architecture/MONOREPO.md" CLAUDE.md; then
  ok "CLAUDE.md links to extracted MONOREPO.md"
else
  bad "CLAUDE.md missing link to MONOREPO.md"
fi

# ---------------------------------------------------------------------------
# 2. startup-protocol ≤ 3 KB
# ---------------------------------------------------------------------------
step "2/5 startup-protocol slim"

STARTUP_SIZE=$(wc -c < .claude/rules/startup-protocol.md)
if [ "$STARTUP_SIZE" -le 3072 ]; then
  ok "startup-protocol.md ${STARTUP_SIZE}b ≤ 3 KB"
else
  bad "startup-protocol.md ${STARTUP_SIZE}b > 3 KB"
fi

if grep -q "Cross-user chmod EPERM" .claude/rules/startup-protocol.md; then
  bad "startup-protocol.md STILL has worktree boilerplate inline"
else
  ok "startup-protocol.md no worktree boilerplate (moved to docs/dev/)"
fi

if grep -q "docs/dev/worktree-isolation.md" .claude/rules/startup-protocol.md; then
  ok "startup-protocol.md links to worktree-isolation.md"
else
  bad "startup-protocol.md missing link to worktree-isolation.md"
fi

# ---------------------------------------------------------------------------
# 3. Extracted docs exist
# ---------------------------------------------------------------------------
step "3/5 Extracted docs exist"

for f in "docs/architecture/MONOREPO.md" "docs/dev/worktree-isolation.md"; do
  if [ -f "$f" ]; then
    ok "$f"
  else
    bad "$f MISSING"
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
  tail -20 "$TMPDIR_LOCAL/drift.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 5. Infrastructure clean
# ---------------------------------------------------------------------------
step "5/5 Infrastructure clean"

if pnpm install --frozen-lockfile --lockfile-only > "$TMPDIR_LOCAL/install.log" 2>&1; then
  ok "pnpm install --frozen-lockfile clean"
else
  bad "pnpm install FAILED"
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
