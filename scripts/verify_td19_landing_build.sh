#!/bin/bash
#
# TD-19 acceptance — landing E2E next build succeeds.
#
# Originating failure (from docs/tech-debt.md TD-19):
#
#   pnpm --filter @paxio/landing-app build
#   → Failed to compile.
#   → ./app/sections/04-pay.tsx:39:25
#   → Type error: Type '{...} | undefined' is not assignable to type '{...}'
#   → (TS compiler dresses this up as TS2719 "Two different types with this
#     name exist" but root cause is flow-narrowing loss through intermediate
#     hasCatalog/hasTraffic boolean variables introduced by M-L0-impl 1ac2423)
#
# This script follows the Phase 1.5 reviewer protocol (TD-20) + the
# architect-protocol §4.2.1 requirement that TD RED specs with failure
# commands MUST include `scripts/verify_td<N>_*.sh` performing:
#   (1) clean install of all node_modules
#   (2) reproduce originating command
#
# Currently exits non-zero (RED). After frontend-dev fix (inline narrowing
# in 04-pay.tsx) this script exits 0 (GREEN).
#
# Acceptance:
#   bash scripts/verify_td19_landing_build.sh
#   echo $? → 0 = PASS (TD-19 can be closed)

set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p "$HOME/tmp"

PASS=0
FAIL=0

ok()  { echo "✅ $1"; PASS=$((PASS+1)); }
bad() { echo "❌ $1"; FAIL=$((FAIL+1)); }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TD-19 acceptance — landing next build after clean install"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1 — clean install. This catches bugs in the missing-symlink class
# (see TD-18 post-mortem in TD-20). After merge to dev the node_modules/
# symlinks are not refreshed until the next pnpm install; running without
# this step causes the same originating error to reproduce even when the
# fix is formally merged.
#
# We do NOT blow away node_modules if pnpm-lock.yaml is dirty — this script
# is meant to be run on branches rebased onto clean dev. Reviewer is
# responsible for ensuring rebase happened before gating.
echo
echo "Step 1/3 — clean install (imitates fresh clone)"
if pnpm install --frozen-lockfile >"$HOME/tmp/td19-install.log" 2>&1; then
  ok "pnpm install --frozen-lockfile"
else
  bad "pnpm install failed — see \$HOME/tmp/td19-install.log"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "PASS: $PASS   FAIL: $FAIL"
  exit 1
fi

# Step 2 — verify @paxio/types symlink is actually present after install.
# This is the specific invariant that TD-18 was supposed to enforce. If
# this fails, TD-18 has regressed — open a new TD before worrying about
# TD-19.
echo
echo "Step 2/3 — @paxio/types symlink present in landing node_modules"
if [ -L "apps/frontend/landing/node_modules/@paxio/types" ] \
   || [ -d "apps/frontend/landing/node_modules/@paxio/types" ]; then
  ok "apps/frontend/landing/node_modules/@paxio/types exists"
else
  bad "apps/frontend/landing/node_modules/@paxio/types MISSING — TD-18 regressed"
fi

# Step 3 — the originating command. This is the ONE command from the TD
# description that must succeed.
echo
echo "Step 3/3 — pnpm --filter @paxio/landing-app build (originating failure)"
if pnpm --filter @paxio/landing-app build >"$HOME/tmp/td19-build.log" 2>&1; then
  ok "pnpm --filter @paxio/landing-app build"
else
  bad "landing build FAILED — TD-19 still open. See \$HOME/tmp/td19-build.log"
  # Surface the actual TS error to stderr so reviewer can confirm it is
  # the 04-pay.tsx:39 flow-narrowing issue (not a different regression).
  echo
  echo "--- last 30 lines of build output ---"
  tail -n 30 "$HOME/tmp/td19-build.log" || true
  echo "--- end ---"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PASS: $PASS   FAIL: $FAIL"
if [ $FAIL -eq 0 ]; then
  echo "TD-19 CLOSED — landing E2E build succeeds"
  exit 0
else
  echo "TD-19 OPEN — landing E2E build still broken"
  exit 1
fi
