#!/usr/bin/env bash
# M01d CI/CD Bootstrap — acceptance.
# Pass criteria: 12 workflows exist, yamllint OK, secrets documented, remote live.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

step "1. 12 workflow files exist"
REQUIRED=(
  ".github/workflows/ci-frontend-landing.yml"
  ".github/workflows/ci-frontend-registry.yml"
  ".github/workflows/ci-frontend-pay.yml"
  ".github/workflows/ci-frontend-radar.yml"
  ".github/workflows/ci-frontend-intel.yml"
  ".github/workflows/ci-frontend-docs.yml"
  ".github/workflows/ci-frontend-wallet.yml"
  ".github/workflows/ci-frontend-fleet.yml"
  ".github/workflows/ci-backend.yml"
  ".github/workflows/ci-canisters.yml"
  ".github/workflows/deploy-backend.yml"
  ".github/workflows/release-tools.yml"
)
for wf in "${REQUIRED[@]}"; do
  [ -f "$wf" ] && ok "$(basename $wf)" || bad "missing $wf"
done

step "2. YAML validity"
if command -v yamllint >/dev/null 2>&1; then
  if yamllint -d relaxed .github/workflows/ >/tmp/m01d-yamllint.log 2>&1; then
    ok "yamllint relaxed"
  else
    bad "yamllint failed — see /tmp/m01d-yamllint.log"
  fi
else
  echo "  (yamllint not installed — skipping)"
fi

step "3. Each workflow has path filter (except release)"
for wf in .github/workflows/ci-frontend-*.yml .github/workflows/ci-backend.yml .github/workflows/ci-canisters.yml; do
  if grep -q 'paths:' "$wf"; then
    ok "$(basename $wf) has path filter"
  else
    bad "$(basename $wf) missing path filter"
  fi
done

step "4. Secrets documented in docs/secrets.md"
[ -f docs/secrets.md ] && ok "docs/secrets.md exists" || bad "missing docs/secrets.md"

# Cross-check: every secret referenced in workflows is listed in docs/secrets.md
SECRETS_IN_WORKFLOWS=$(grep -rho '\${{\s*secrets\.[A-Z_]\+\s*}}' .github/workflows/ 2>/dev/null | sed -E 's/.*secrets\.([A-Z_]+).*/\1/' | sort -u || true)
for s in $SECRETS_IN_WORKFLOWS; do
  if grep -q "$s" docs/secrets.md; then
    ok "secret $s documented"
  else
    bad "secret $s referenced in workflow but not in docs/secrets.md"
  fi
done

step "5. .env.example present + listed in .gitignore"
[ -f .env.example ] && ok ".env.example exists" || bad "missing .env.example"
grep -q '^\.env$' .gitignore && ok ".env in .gitignore" || bad ".env NOT in .gitignore"

step "6. Remote setup (requires gh CLI auth)"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if gh repo view paxio-network/paxio >/dev/null 2>&1; then
    ok "github.com/paxio-network/paxio reachable"
  else
    bad "paxio-network/paxio not yet created"
  fi
else
  echo "  (gh CLI not authed — remote check skipped)"
fi

step "7. Hetzner deploy docs present"
[ -f docs/deployment-hetzner.md ] && ok "deployment-hetzner.md" || bad "missing docs/deployment-hetzner.md"
[ -f docs/deployment-vercel.md ]  && ok "deployment-vercel.md"  || bad "missing docs/deployment-vercel.md"
[ -f docs/release-process.md ]    && ok "release-process.md"    || bad "missing docs/release-process.md"

echo
echo "====================================="
echo "M01d CI/CD: $PASS passed, $FAIL failed"
echo "====================================="
[ "$FAIL" -eq 0 ] || exit 1
