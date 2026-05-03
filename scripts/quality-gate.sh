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
    echo "      git worktree add /home/nous/paxio-worktrees/test-${MILESTONE} feature/<branch> 2>/dev/null \\"
    echo "        || git worktree add /home/nous/paxio-worktrees/test-${MILESTONE} --detach origin/<branch>"
    echo "      cd /home/nous/paxio-worktrees/test-${MILESTONE}"
    echo "      pnpm install"
    echo "      bash scripts/quality-gate.sh ${MILESTONE}"
    exit 1
    ;;
esac

# M-Q19 patch — early TMPDIR sanity (M-Q17 reinforcement).
#
# Class of bug: TMPDIR env value contains literal `$HOME` because Claude Code
# does NOT expand env values before passing to subprocesses. When pnpm install
# resolves $TMPDIR, it gets a literal `$HOME/...` path → creates literal
# `./\$HOME/.cache/...` directory at cwd → poisoned worktree.
#
# Caught post-fact by tests/m-q17-tmpdir-no-literal-home.test.ts at vitest step.
# This pre-flight catches it BEFORE pnpm install runs in the worktree at all.
if [[ "${TMPDIR:-}" == *'$HOME'* ]]; then
  echo "🔴 INFRASTRUCTURE — TMPDIR contains literal \$HOME"
  echo ""
  echo "    Current value: TMPDIR=$TMPDIR"
  echo ""
  echo "    Claude Code does NOT expand env values. Fix ~/.claude/settings.json:"
  echo "      {"
  echo "        \"env\": {"
  echo "          \"TMPDIR\": \"/home/<your-user>/.cache/paxio-tmp\""
  echo "        }"
  echo "      }"
  echo "    (absolute path, NOT \$HOME literal)"
  echo ""
  echo "    Then restart Claude Code session — env is captured at session start."
  exit 1
fi

# M-Q19 patch — early leftover \$HOME/ dir check.
#
# If a literal \$HOME/ directory exists at repo root, pnpm install previously
# ran with bad TMPDIR. Even if TMPDIR is now fixed in env, the leftover dir
# trips the M-Q17 drift-guard at step 2/6. Catch + diagnose at start.
if [ -d "$ROOT/\$HOME" ]; then
  echo "🔴 INFRASTRUCTURE — literal \$HOME/ directory at $ROOT/\$HOME"
  echo ""
  echo "    Leftover from prior pnpm install with bad TMPDIR (now fixed)."
  echo "    Cleanup:"
  echo "      rm -rf \"$ROOT/\\\$HOME\""
  echo ""
  echo "    Then re-run quality-gate. (If recurs, your session env still has"
  echo "    bad TMPDIR — see M-Q19 TMPDIR-sanity diagnostic above.)"
  exit 1
fi

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

# 1.5/6 — node --check on backend server CJS entry points.
#
# Catches the bug class «backend .cjs edit breaks node syntax but typecheck
# + vitest don't catch it» (typecheck runs only on .ts; vitest tests don't
# load main.cjs; build doesn't run server). Same shape as M-Q20 closed for
# frontend (build-clean ≠ visual-correct) — this closes the backend analog
# (tests-GREEN ≠ server-starts).
#
# Scope: every .cjs file in apps/back/server/ when any of them are in diff.
# Skips if no server CJS changes — saves ~200ms on pure-frontend or pure-Rust
# milestones.
step "1.5/6 node --check apps/back/server/*.cjs (only if server CJS touched)"
if git diff --name-only origin/dev..HEAD 2>/dev/null \
   | grep -qE '^apps/back/server/.*\.cjs$'; then
  syntax_failed=0
  while IFS= read -r f; do
    if ! node --check "$f" > /tmp/qg-node-check.log 2>&1; then
      bad "node --check failed on $f (full: /tmp/qg-node-check.log)"
      tail -10 /tmp/qg-node-check.log | sed 's,^,    ,'
      syntax_failed=1
    fi
  done < <(find apps/back/server -name '*.cjs' -type f 2>/dev/null)
  if [ "$syntax_failed" -eq 0 ]; then
    ok "all apps/back/server/*.cjs node --check clean"
  else
    exit 1
  fi
else
  ok "no apps/back/server/*.cjs changes in diff — skipping node --check"
fi

# Governance test patterns — non-blocking informational gate.
# Code-correctness gates fail-stop; governance gates collect into TD.
#
# Pattern logic: governance tests audit process compliance (reviewer chore
# coverage, lockfile drift, husky identity, etc.) — their failure is a
# real signal but should not block code-correct merges. file TD; user
# decides catch-up plan.
#
# Add new governance tests via this list — single source of truth.
GOVERNANCE_TESTS=(
  'tests/m-q22-reviewer-chore-coverage.test.ts'
)

# 2/6 — Root vitest CODE-CORRECTNESS (governance tests excluded — gated separately).
step "2/6 pnpm exec vitest run — code-correctness (governance tests gated separately)"
EXCLUDE_ARGS=()
for t in "${GOVERNANCE_TESTS[@]}"; do
  EXCLUDE_ARGS+=(--exclude "$t")
done
if pnpm exec vitest run "${EXCLUDE_ARGS[@]}" > /tmp/qg-root-vitest.log 2>&1; then
  passed=$(grep -oE 'Tests +[0-9]+ passed' /tmp/qg-root-vitest.log | tail -1 || echo "")
  ok "root vitest GREEN (code-correctness) — $passed"
else
  bad "root vitest RED — code-correctness (full: /tmp/qg-root-vitest.log)"
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
# Fallback chain (M-Q27 — task-tag → parent-milestone fallback):
#   1. exact: verify_<TAG>.sh
#   2. parent-tag: strip `-T<digits>(.<digits>)*[a-z]*` suffix → try verify_<PARENT>.sh
#      (так dev report on `M-L1-T2` resolves to `verify_M-L1-expansion.sh` через
#       `verify_M-L1-T2.sh` MISS → strip `-T2` → check verify_M-L1.sh + handle
#       milestone family parent verify_M-L1-expansion.sh)
#   3. header-grep: any verify_*.sh с `# <TAG>` или `# <PARENT>` в header
step "6/6 bash scripts/verify_${MILESTONE}.sh (or parent-tag/header fallback)"
ACC="scripts/verify_${MILESTONE}.sh"
if [ ! -f "$ACC" ]; then
  # Step 2: parent-tag fallback. Strip `-T<N>` suffix to find milestone-level
  # acceptance script. Examples:
  #   M-L1-T2          → M-L1
  #   M-L1-T2.5        → M-L1
  #   M-L1-T2-impl     → M-L1
  #   M-Q26            → M-Q26 (no suffix to strip)
  PARENT_TAG=$(echo "$MILESTONE" | sed -E 's/-T[0-9]+([._-][[:alnum:]]+)*$//')
  if [ "$PARENT_TAG" != "$MILESTONE" ]; then
    # Try canonical of parent OR any verify_<PARENT>*.sh family
    parent_candidate="scripts/verify_${PARENT_TAG}.sh"
    if [ -f "$parent_candidate" ]; then
      ACC="$parent_candidate"
      echo "  (parent-tag fallback: $MILESTONE → $PARENT_TAG → $ACC)"
    else
      # Family search: verify_<PARENT>-*.sh covers expansions like
      # verify_M-L1-expansion.sh для parent M-L1
      family=$(ls scripts/verify_${PARENT_TAG}-*.sh 2>/dev/null | head -1 || true)
      if [ -n "$family" ] && [ -f "$family" ]; then
        ACC="$family"
        echo "  (family fallback: $MILESTONE → $PARENT_TAG-* → $ACC)"
      fi
    fi
  fi
fi

# Step 3: header-grep fallback (legacy descriptive names + cross-milestone tags).
if [ ! -f "$ACC" ]; then
  fallback=$(grep -lE "^# *${MILESTONE}\b|^# *${MILESTONE} acceptance" scripts/verify_*.sh 2>/dev/null | head -1 || true)
  if [ -n "$fallback" ] && [ -f "$fallback" ]; then
    ACC="$fallback"
    echo "  (header fallback: $MILESTONE matched in $ACC)"
  else
    bad "no acceptance script at $ACC (no parent-tag, family, or header fallback)"
    echo "    (architect must create scripts/verify_${MILESTONE}.sh OR ensure parent-tag mapping resolves)"
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

# 7/7 — Governance audit (non-blocking — informational fail).
#
# Code-correctness gates 1-6 above already passed by this point. Governance
# gates audit process compliance: did reviewer write chore commits? did
# architect skip Phase N? lockfile drift? identity mismatch?
#
# Their fail is a REAL signal — but it doesn't block code merge. Reviewer
# files TD via Phase 13; architect plans catch-up. Tied to merge gate at
# CI level via separate workflow status check (M-Q24 — future milestone),
# not at quality-gate.sh level.
step "7/7 governance audit (informational — non-blocking) — m-q* compliance tests"
GOV_FAILED=0
if [ "${#GOVERNANCE_TESTS[@]}" -eq 0 ]; then
  ok "no governance tests configured"
else
  if pnpm exec vitest run "${GOVERNANCE_TESTS[@]}" > /tmp/qg-governance.log 2>&1; then
    ok "governance audit GREEN — process compliance OK"
  else
    echo "  ⚠️  GOVERNANCE AUDIT FAIL (non-blocking — file TD, не блокирует merge)"
    tail -25 /tmp/qg-governance.log | sed 's,^,    ,'
    GOV_FAILED=1
  fi
fi

echo
echo "─────────────────────────────────────────────"
echo "QUALITY GATE — ${MILESTONE} — PASS=${PASS} FAIL=${FAIL}"
if [ $GOV_FAILED -eq 1 ]; then
  echo "⚠️  GOVERNANCE AUDIT FAILED (non-blocking — file TD entry via reviewer Phase 13)"
fi
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ]
