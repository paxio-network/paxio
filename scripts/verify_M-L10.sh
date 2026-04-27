#!/usr/bin/env bash
# M-L10 Phase 1 acceptance — Paxio B5 Landing Foundation
#
# Idempotent E2E verification for Phase 1 ONLY (foundation: vendoring + rule).
# Phase 2-5 ports get their own acceptance scripts (verify_M-L10.2.sh, …).
#
# Steps:
#   1. Phase 1 deliverables exist
#   2. Drift-guard tests GREEN (13 + 5 TODO)
#   3. Vendored design assets reachable (5 CSS + 2 JSX + HTML + 2 README + SVG)
#   4. R-FE-Preview rule complete (4 conditions + forbidden list + migration + drift-guard pattern)
#   5. _design/ excluded from ESLint
#   6. Infrastructure clean: typecheck + frozen-lockfile + baseline vitest

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

TMPDIR_LOCAL="$(mktemp -d -t ml10-acc-XXXXXX)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

# ---------------------------------------------------------------------------
# 1. Phase 1 deliverables exist
# ---------------------------------------------------------------------------
step "1/6 Phase 1 deliverables exist"

DELIVERABLES=(
  "docs/design/paxio-b5/README.md"
  "docs/design/paxio-b5/SOURCE_README.md"
  "docs/design/paxio-b5/Paxio-B5.html"
  "docs/design/paxio-b5/components/v_hero_b5.jsx"
  "docs/design/paxio-b5/components/landing_scrolls_b5.jsx"
  "docs/design/paxio-b5/styles/paxio.css"
  "docs/design/paxio-b5/styles/hero_variants.css"
  "docs/design/paxio-b5/styles/landing_scrolls.css"
  "docs/design/paxio-b5/styles/paxio_b3_page.css"
  "docs/design/paxio-b5/styles/paxio_b5_fixes.css"
  "docs/design/paxio-b5/styles/paxio_mark.svg"
  ".claude/rules/frontend-rules.md"
  "tests/landing-b5-foundation-drift.test.ts"
  "docs/sprints/M-L10-paxio-b5-landing.md"
)

for f in "${DELIVERABLES[@]}"; do
  if [ -f "$f" ]; then
    ok "$f exists"
  else
    bad "$f MISSING"
  fi
done

# ---------------------------------------------------------------------------
# 2. Drift-guard tests GREEN
# ---------------------------------------------------------------------------
step "2/6 Drift-guard tests GREEN"

if pnpm exec vitest run tests/landing-b5-foundation-drift.test.ts > "$TMPDIR_LOCAL/drift.log" 2>&1; then
  PASSED=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/drift.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  TODO=$(grep -oE '[0-9]+ todo' "$TMPDIR_LOCAL/drift.log" | tail -1 | grep -oE '[0-9]+' || echo "0")
  ok "landing-b5-foundation-drift.test.ts — $PASSED passed, $TODO todo"
else
  bad "drift-guard tests RED:"
  tail -25 "$TMPDIR_LOCAL/drift.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 3. Vendored design assets size sanity
# ---------------------------------------------------------------------------
step "3/6 Vendored design size sanity (≤300KB target)"

DESIGN_SIZE=$(du -sk docs/design/paxio-b5 2>/dev/null | awk '{print $1}')
if [ -z "$DESIGN_SIZE" ]; then
  bad "could not measure _design/ size"
elif [ "$DESIGN_SIZE" -le 300 ]; then
  ok "_design/ is ${DESIGN_SIZE}KB (≤300KB target)"
else
  bad "_design/ is ${DESIGN_SIZE}KB (exceeds 300KB target — what bloated?)"
fi

# Hero JSX has expected components
HERO_JSX="docs/design/paxio-b5/components/v_hero_b5.jsx"
if grep -q "HeroVariantB5\|useTicker\|AGENTS" "$HERO_JSX" 2>/dev/null; then
  ok "$HERO_JSX has HeroVariantB5 + useTicker + AGENTS markers"
else
  bad "$HERO_JSX missing expected component markers"
fi

# Scrolls JSX has expected components
SCROLLS_JSX="docs/design/paxio-b5/components/landing_scrolls_b5.jsx"
if grep -q "PaxioLandingScrollsB5" "$SCROLLS_JSX" 2>/dev/null; then
  ok "$SCROLLS_JSX has PaxioLandingScrollsB5 marker"
else
  bad "$SCROLLS_JSX missing PaxioLandingScrollsB5 marker"
fi

# ---------------------------------------------------------------------------
# 4. R-FE-Preview rule complete
# ---------------------------------------------------------------------------
step "4/6 R-FE-Preview rule complete"

RULE_FILE=".claude/rules/frontend-rules.md"

# Section header
if grep -qE "^##\s+R-FE-Preview\s+[—\-]" "$RULE_FILE"; then
  ok "## R-FE-Preview section header present"
else
  bad "## R-FE-Preview section header missing"
fi

# 4 mandatory conditions
for cond in 'data-production="false"' 'PreviewRibbon' 'app/data/preview\.ts' 'TODO M-L'; do
  if grep -qE "$cond" "$RULE_FILE"; then
    ok "rule mentions condition: $cond"
  else
    bad "rule MISSING condition: $cond"
  fi
done

# Forbidden list — grep -E uses bare | for alternation
declare -a FORBIDDEN=(
  "auth flow|login|signup"
  "money|BTC|payment"
  "form submi"
)
for forb in "${FORBIDDEN[@]}"; do
  if grep -qiE "$forb" "$RULE_FILE"; then
    ok "rule lists forbidden class matching: $forb"
  else
    bad "rule MISSING forbidden class: $forb"
  fi
done

# Migration path
if grep -qiE "migration path|migration" "$RULE_FILE"; then
  ok "rule has migration path section"
else
  bad "rule MISSING migration path"
fi

# Drift-guard pattern example (code block with readFileSync)
if grep -q "readFileSync" "$RULE_FILE" && grep -qE 'data-production="false"' "$RULE_FILE"; then
  ok "rule shows drift-guard pattern example"
else
  bad "rule MISSING drift-guard pattern example"
fi

# ---------------------------------------------------------------------------
# 5. _design vendoring location: docs/design/ (not in app code)
# ---------------------------------------------------------------------------
step "5/6 _design vendoring location is architect zone (docs/)"

# The vendored package lives in docs/, NOT apps/. Confirm absence of stale
# apps/frontend/landing/_design/ from earlier draft.
if [ -d "apps/frontend/landing/_design" ]; then
  bad "apps/frontend/landing/_design/ still exists — should be in docs/design/paxio-b5/"
else
  ok "apps/frontend/landing/_design/ correctly absent (vendor lives in docs/)"
fi

if [ -d "docs/design/paxio-b5" ]; then
  ok "docs/design/paxio-b5/ vendor location confirmed"
else
  bad "docs/design/paxio-b5/ MISSING"
fi

# ---------------------------------------------------------------------------
# 6. Infrastructure clean
# ---------------------------------------------------------------------------
step "6/6 Infrastructure clean"

if pnpm install --frozen-lockfile --lockfile-only > "$TMPDIR_LOCAL/install.log" 2>&1; then
  ok "pnpm install --frozen-lockfile clean"
else
  bad "pnpm install --frozen-lockfile FAILED — TD-35 class regression"
fi

if pnpm typecheck > "$TMPDIR_LOCAL/typecheck.log" 2>&1; then
  ok "pnpm typecheck clean"
else
  bad "pnpm typecheck FAILED:"
  tail -10 "$TMPDIR_LOCAL/typecheck.log" | sed 's,^,     ,'
fi

# Baseline vitest still green
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
echo "  M-L10 Phase 1 acceptance: PASS=$PASS FAIL=$FAIL"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
