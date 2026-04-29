#!/usr/bin/env bash
# M-Q1 — Deterministic quality gate. test-runner runs ONLY this command.
#
# Replaces .claude/agents/test-runner.md mandatory-checklist (which Haiku
# can ignore on M-L9 round 2 + 3). bash exit code IS the answer.
#
# Usage: bash scripts/quality-gate.sh <milestone>
#
# Output: 6 steps, ✅/❌ per step, PASS=N FAIL=M summary.
# Exit: 0 on all GREEN, 1 on first failure (fail-fast).
#
# Detects touched apps via `git diff --name-only origin/dev..HEAD` and
# runs per-app filter only for changed apps — Turborepo-aware.

set -euo pipefail

MILESTONE="${1:?usage: quality-gate.sh <milestone>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# M-Q19 — refuse to run in shared /home/nous/paxio checkout.
# Cross-user node_modules/.vite/ ownership causes vitest EPERM on cache write
# at step 2/6. Test-runner MUST create own worktree per session
# (.claude/agents/test-runner.md::Workflow Step 0).
case "$ROOT" in
  /home/nous/paxio|/home/nous/paxio/)
    echo "🔴 INFRASTRUCTURE — quality-gate.sh refused: shared checkout /home/nous/paxio"
    echo ""
    echo "    Cross-user node_modules/ ownership pollutes vitest cache (EPERM at step 2/6)."
    echo "    Test-runner MUST run in own worktree per .claude/agents/test-runner.md::Workflow Step 0."
    echo ""
    echo "    Fix:"
    echo "      cd /home/nous/paxio"
    echo "      git fetch origin"
    echo "      git worktree add /tmp/paxio-test-${MILESTONE} feature/<branch> 2>/dev/null \\"
    echo "        || git worktree add /tmp/paxio-test-${MILESTONE} --detach origin/<branch>"
    echo "      cd /tmp/paxio-test-${MILESTONE}"
    echo "      pnpm install"
    echo "      bash scripts/quality-gate.sh ${MILESTONE}"
    exit 1
    ;;
esac

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

# 1/6 — Typecheck
step "1/6 pnpm typecheck"
if pnpm typecheck > /tmp/qg-typecheck.log 2>&1; then
  ok "typecheck clean"
else
  bad "typecheck failed (full: /tmp/qg-typecheck.log)"
  tail -20 /tmp/qg-typecheck.log | sed 's,^,    ,'
  exit 1
fi

# 2/6 — Root vitest (catches workspace config drift, the M-L9 round-2 gap)
step "2/6 pnpm exec vitest run (ROOT — not per-app filter!)"
if pnpm exec vitest run > /tmp/qg-root-vitest.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/qg-root-vitest.log | tail -1 || echo "")
  ok "root vitest GREEN — $passed"
else
  bad "root vitest RED (full: /tmp/qg-root-vitest.log)"
  tail -30 /tmp/qg-root-vitest.log | sed 's,^,    ,'
  exit 1
fi

# 3-4/6 — Per-app test + build for each touched frontend app.
# Use `pnpm turbo run` (NOT `pnpm --filter` direct) so Turborepo's cache
# kicks in — instant cache hit when sources unchanged. For one-char fixes
# in tests/, build step becomes ~0s (cached). Without turbo wrapper,
# Next.js prod build runs from scratch every time (~60s/app).
step "3-4/6 per-app test + build for changed frontend apps (Turborepo cache)"
APPS=$(git diff --name-only origin/dev..HEAD 2>/dev/null \
       | grep -oE '^apps/frontend/[^/]+' \
       | sort -u \
       | sed 's,apps/frontend/,,' || true)
if [ -z "$APPS" ]; then
  ok "no frontend apps changed in diff origin/dev..HEAD — skipping per-app gates"
else
  for app in $APPS; do
    pkg="@paxio/${app}-app"
    if pnpm turbo run test --filter="$pkg" > "/tmp/qg-${app}-test.log" 2>&1; then
      cache_hit=$(grep -oE 'cache hit, replaying|FULL TURBO' "/tmp/qg-${app}-test.log" | head -1 || echo "")
      if [ -n "$cache_hit" ]; then
        ok "${app} test GREEN (turbo cache hit — no work needed)"
      else
        ok "${app} test GREEN"
      fi
    else
      bad "${app} test RED (full: /tmp/qg-${app}-test.log)"
      tail -20 "/tmp/qg-${app}-test.log" | sed 's,^,    ,'
      exit 1
    fi
    if pnpm turbo run build --filter="$pkg" > "/tmp/qg-${app}-build.log" 2>&1; then
      cache_hit=$(grep -oE 'cache hit, replaying|FULL TURBO' "/tmp/qg-${app}-build.log" | head -1 || echo "")
      if [ -n "$cache_hit" ]; then
        ok "${app} build OK (turbo cache hit)"
      else
        ok "${app} build OK"
      fi
    else
      bad "${app} build FAILED (full: /tmp/qg-${app}-build.log)"
      tail -20 "/tmp/qg-${app}-build.log" | sed 's,^,    ,'
      exit 1
    fi
  done
fi

# 5/6 — cargo test if Rust touched
step "5/6 cargo test --workspace (only if Rust touched)"
if git diff --name-only origin/dev..HEAD 2>/dev/null \
   | grep -qE '^(products/.*/canister|platform/canister-shared|Cargo\.(toml|lock))'; then
  if cargo test --workspace > /tmp/qg-cargo.log 2>&1; then
    ok "cargo test --workspace GREEN"
  else
    bad "cargo test RED (full: /tmp/qg-cargo.log)"
    tail -30 /tmp/qg-cargo.log | sed 's,^,    ,'
    exit 1
  fi
else
  ok "no Rust changes in diff — skipping cargo"
fi

# 6/6 — Acceptance script for milestone.
# Canonical: scripts/verify_<milestone>.sh (e.g. verify_M-L9.sh).
# Fallback: scripts/verify_*.sh with grep header `# M-L9 acceptance` etc.
# This handles legacy descriptive names like verify_landing_design_port.sh.
step "6/6 bash scripts/verify_${MILESTONE}.sh (or fallback)"
ACC="scripts/verify_${MILESTONE}.sh"
if [ ! -f "$ACC" ]; then
  # Look for any verify_*.sh with milestone tag in its header comment.
  fallback=$(grep -lE "^# *${MILESTONE}\b|^# *${MILESTONE} acceptance" scripts/verify_*.sh 2>/dev/null | head -1 || true)
  if [ -n "$fallback" ] && [ -f "$fallback" ]; then
    ACC="$fallback"
    echo "  (canonical $MILESTONE not found — using fallback $ACC)"
  else
    bad "no acceptance script at $ACC (and no fallback with '# $MILESTONE' header)"
    echo "    (architect must create scripts/verify_${MILESTONE}.sh for this milestone)"
    exit 1
  fi
fi
if bash "$ACC" > /tmp/qg-acceptance.log 2>&1; then
  pass_line=$(grep -oE 'PASS=[0-9]+ +FAIL=[0-9]+' /tmp/qg-acceptance.log | tail -1 || echo "")
  ok "acceptance — $pass_line (full: /tmp/qg-acceptance.log)"
else
  bad "acceptance FAILED (full: /tmp/qg-acceptance.log)"
  tail -30 /tmp/qg-acceptance.log | sed 's,^,    ,'
  exit 1
fi

echo
echo "─────────────────────────────────────────────"
echo "QUALITY GATE — ${MILESTONE} — PASS=${PASS} FAIL=${FAIL}"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ]
