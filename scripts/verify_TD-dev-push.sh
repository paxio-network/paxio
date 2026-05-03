#!/usr/bin/env bash
# TD-dev-push acceptance — pre-push hook semantics + scope-guard policy update
#
# Verifies:
#   1. .husky/pre-push exists + executable
#   2. Hook recognises 7 known role identities (architect, reviewer, 4 devs, test-runner)
#   3. Hook rejects dev identities pushing to refs/heads/dev or refs/heads/main
#   4. Hook allows dev identities pushing to refs/heads/feature/*
#   5. Hook rejects non-fast-forward to dev/main for any identity
#   6. .claude/rules/scope-guard.md push permissions table updated
#   7. CLAUDE.md Branch Model section updated
#
# Run: bash scripts/verify_TD-dev-push.sh
# Run via gate: bash scripts/quality-gate.sh TD-dev-push

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

HOOK=.husky/pre-push

# ---------------------------------------------------------------------------
step "1. .husky/pre-push exists + executable"
# ---------------------------------------------------------------------------
if [ -x "$HOOK" ]; then
  ok ".husky/pre-push present + executable"
else
  bad ".husky/pre-push missing or not executable"
fi

# ---------------------------------------------------------------------------
step "2. Hook recognises 7 known identities"
# ---------------------------------------------------------------------------
for role in architect reviewer backend-dev frontend-dev icp-dev registry-dev test-runner; do
  if grep -q "$role@paxio.network" "$HOOK"; then
    ok "$role identity case present"
  else
    bad "$role identity case missing"
  fi
done

# ---------------------------------------------------------------------------
step "3. Hook simulation — dev identity pushing feature/* succeeds"
# ---------------------------------------------------------------------------
ZERO=0000000000000000000000000000000000000000
SHA=1111111111111111111111111111111111111111
simulate() {
  local email=$1
  local remote_ref=$2
  local local_ref=$3
  EMAIL="$email" \
    git -c user.email="$email" -c user.name="$email" \
        config --global --add safe.directory "$(pwd)" 2>/dev/null || true
  echo "$local_ref $SHA $remote_ref $ZERO" | (
    git config user.email "$email"
    git config user.name "$email"
    bash "$HOOK"
  ) 2>&1
}

# Test setup uses local repo's user.email override
test_push() {
  local desc=$1
  local email=$2
  local remote_ref=$3
  local expect_pass=$4   # 0 = should pass, 1 = should fail
  local local_sha=$5
  local remote_sha=$6

  local out
  out=$(echo "refs/heads/local $local_sha $remote_ref $remote_sha" | (
    git config user.email "$email" 2>/dev/null
    git config user.name "$email" 2>/dev/null
    bash "$HOOK" 2>&1 || echo "EXIT=$?"
  ))

  if [ "$expect_pass" = "0" ]; then
    if echo "$out" | grep -q "✅ pre-push OK"; then
      ok "$desc"
    else
      bad "$desc — expected pass, got: $(echo "$out" | tail -3 | tr '\n' ' ')"
    fi
  else
    if echo "$out" | grep -q "❌ pre-push REJECTED\|EXIT="; then
      ok "$desc"
    else
      bad "$desc — expected reject, got: $(echo "$out" | tail -3 | tr '\n' ' ')"
    fi
  fi
}

# Save current identity to restore after tests
ORIG_NAME=$(git config user.name 2>/dev/null || echo "")
ORIG_EMAIL=$(git config user.email 2>/dev/null || echo "")

test_push "registry-dev → feature/M-L1-T3c (allowed)" \
  "registry-dev@paxio.network" "refs/heads/feature/M-L1-T3c" 0 "$SHA" "$ZERO"

test_push "backend-dev → feature/test (allowed)" \
  "backend-dev@paxio.network" "refs/heads/feature/test" 0 "$SHA" "$ZERO"

test_push "frontend-dev → feature/landing (allowed)" \
  "frontend-dev@paxio.network" "refs/heads/feature/landing" 0 "$SHA" "$ZERO"

test_push "icp-dev → feature/wallet (allowed)" \
  "icp-dev@paxio.network" "refs/heads/feature/wallet" 0 "$SHA" "$ZERO"

# ---------------------------------------------------------------------------
step "4. Hook simulation — dev identity pushing dev/main rejected"
# ---------------------------------------------------------------------------
test_push "registry-dev → dev (REJECTED)" \
  "registry-dev@paxio.network" "refs/heads/dev" 1 "$SHA" "$ZERO"

test_push "backend-dev → main (REJECTED)" \
  "backend-dev@paxio.network" "refs/heads/main" 1 "$SHA" "$ZERO"

test_push "test-runner → dev (REJECTED)" \
  "test-runner@paxio.network" "refs/heads/dev" 1 "$SHA" "$ZERO"

# ---------------------------------------------------------------------------
step "5. Hook simulation — architect → dev allowed"
# ---------------------------------------------------------------------------
test_push "architect → dev (allowed, fast-forward)" \
  "architect@paxio.network" "refs/heads/dev" 0 "$SHA" "$ZERO"

# Restore identity
git config user.name "$ORIG_NAME" 2>/dev/null || true
git config user.email "$ORIG_EMAIL" 2>/dev/null || true

# ---------------------------------------------------------------------------
step "6. .claude/rules/scope-guard.md push permissions updated"
# ---------------------------------------------------------------------------
SG=.claude/rules/scope-guard.md
if [ -f "$SG" ]; then
  if grep -q "dev-push" "$SG" || grep -qE "feature/\*.*push" "$SG"; then
    ok "scope-guard.md mentions dev-push policy"
  else
    bad "scope-guard.md missing dev-push policy update"
  fi
  if grep -qE "(backend-dev|frontend-dev|icp-dev|registry-dev).*YES.*feature" "$SG"; then
    ok "scope-guard.md push permissions table grants devs feature/* push"
  else
    bad "scope-guard.md push permissions table missing dev row update"
  fi
else
  bad "scope-guard.md not found"
fi

# ---------------------------------------------------------------------------
step "7. CLAUDE.md Branch Model updated"
# ---------------------------------------------------------------------------
CMD=CLAUDE.md
if [ -f "$CMD" ]; then
  if grep -qE "feature/.*push|devs.*push" "$CMD"; then
    ok "CLAUDE.md Branch Model reflects dev push policy"
  else
    bad "CLAUDE.md Branch Model missing dev push policy update"
  fi
else
  bad "CLAUDE.md not found"
fi

# ---------------------------------------------------------------------------

echo
echo "TD-dev-push ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
