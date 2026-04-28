#!/usr/bin/env bash
# M-L10.2 acceptance — CSS tokens + theme system + 3 Google Fonts
#
# Idempotent. Steps:
#   1. Deliverables exist (globals.css updated, layout.tsx updated, ThemeProvider new, RED tests committed)
#   2. RED test file present + GREEN after frontend-dev impl
#   3. Light + dark theme blocks present in globals.css
#   4. next/font/google for all 3 fonts in layout.tsx
#   5. ThemeProvider — 'use client' + localStorage + data-theme
#   6. Architectural enforcement: no fonts.googleapis CDN, no prefers-color-scheme media, body uses tokens
#   7. Infrastructure clean: typecheck + landing build + drift-guard tests preserved

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

TMPDIR_LOCAL="$(mktemp -d -t ml102-acc-XXXXXX)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

LANDING="apps/frontend/landing"
GLOBALS="$LANDING/app/globals.css"
LAYOUT="$LANDING/app/layout.tsx"
THEMEPROV="$LANDING/app/_components/ThemeProvider.tsx"
TESTS="$LANDING/tests/css-tokens.test.tsx"

# ---------------------------------------------------------------------------
# 1. Deliverables exist
# ---------------------------------------------------------------------------
step "1/7 Deliverables exist"

for f in "$GLOBALS" "$LAYOUT" "$THEMEPROV" "$TESTS" "scripts/verify_M-L10.2.sh"; do
  if [ -f "$f" ]; then
    ok "$f"
  else
    bad "$f MISSING"
  fi
done

# ---------------------------------------------------------------------------
# 2. RED tests GREEN after impl
# ---------------------------------------------------------------------------
step "2/7 css-tokens.test.tsx GREEN"

if pnpm --filter @paxio/landing-app test -- --run css-tokens > "$TMPDIR_LOCAL/css.log" 2>&1; then
  P=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/css.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  ok "css-tokens.test.tsx $P passed"
else
  bad "css-tokens.test.tsx RED:"
  tail -25 "$TMPDIR_LOCAL/css.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 3. Light + dark theme tokens in globals.css
# ---------------------------------------------------------------------------
step "3/7 Theme system (light + dark)"

if [ -f "$GLOBALS" ]; then
  # Light theme tokens
  for token in '--paper-0' '--paper-1' '--paper-2' '--paper-3' \
               '--ink-0' '--ink-1' '--ink-2' '--ink-3' '--ink-4' \
               '--gold' '--gold-bright' '--gold-ink' \
               '--up' '--down' '--blue' \
               '--line' '--line-soft' '--line-xsoft' \
               '--f-display' '--f-sans' '--f-mono' \
               '--page-pad' '--ease-out'; do
    if grep -q -- "$token" "$GLOBALS"; then
      ok "globals.css declares $token"
    else
      bad "globals.css missing $token"
    fi
  done

  # Dark theme block
  if grep -qE 'html\[data-theme=["'"'"']dark["'"'"']\]' "$GLOBALS"; then
    ok "globals.css has html[data-theme=\"dark\"] block"
  else
    bad "globals.css missing dark theme block"
  fi
fi

# ---------------------------------------------------------------------------
# 4. next/font/google in layout.tsx
# ---------------------------------------------------------------------------
step "4/7 Google Fonts via next/font/google"

if [ -f "$LAYOUT" ]; then
  if grep -q "next/font/google" "$LAYOUT"; then
    ok "layout.tsx imports from next/font/google"
  else
    bad "layout.tsx missing next/font/google import"
  fi

  for font in 'Fraunces' 'Inter_Tight' 'JetBrains_Mono'; do
    if grep -q -- "$font" "$LAYOUT"; then
      ok "layout.tsx uses $font"
    else
      bad "layout.tsx missing $font"
    fi
  done

  # Negative — no CDN <link> tag
  if grep -qE 'href=["'"'"'][^"'"'"']*fonts\.googleapis\.com' "$LAYOUT"; then
    bad "layout.tsx STILL has fonts.googleapis.com CDN <link> (next/font replaces it)"
  else
    ok "layout.tsx has no fonts.googleapis.com CDN <link>"
  fi
fi

# ---------------------------------------------------------------------------
# 5. ThemeProvider — 'use client' + localStorage + data-theme
# ---------------------------------------------------------------------------
step "5/7 ThemeProvider component"

if [ -f "$THEMEPROV" ]; then
  if grep -q "'use client'" "$THEMEPROV" || grep -q '"use client"' "$THEMEPROV"; then
    ok "ThemeProvider has 'use client' directive"
  else
    bad "ThemeProvider missing 'use client' directive"
  fi

  if grep -q "localStorage.getItem.*paxio-theme" "$THEMEPROV"; then
    ok "ThemeProvider reads localStorage paxio-theme"
  else
    bad "ThemeProvider missing localStorage.getItem('paxio-theme')"
  fi

  if grep -q "localStorage.setItem.*paxio-theme" "$THEMEPROV"; then
    ok "ThemeProvider writes localStorage paxio-theme"
  else
    bad "ThemeProvider missing localStorage.setItem('paxio-theme')"
  fi

  if grep -q "data-theme" "$THEMEPROV"; then
    ok "ThemeProvider sets data-theme attribute"
  else
    bad "ThemeProvider missing data-theme attribute setter"
  fi

  if grep -qE 'export\s+(const|function)\s+useTheme' "$THEMEPROV"; then
    ok "ThemeProvider exports useTheme hook"
  else
    bad "ThemeProvider missing useTheme export"
  fi
fi

# ---------------------------------------------------------------------------
# 6. Architectural enforcement
# ---------------------------------------------------------------------------
step "6/7 Architectural invariants"

if [ -f "$GLOBALS" ]; then
  # No prefers-color-scheme — theme via data-theme attribute only
  if grep -qE '@media\s*\(\s*prefers-color-scheme' "$GLOBALS"; then
    bad "globals.css STILL has @media (prefers-color-scheme) — use data-theme attribute only"
  else
    ok "globals.css uses data-theme (no prefers-color-scheme media)"
  fi

  # Tailwind import preserved
  if grep -qE "@import\s+['\"]tailwindcss['\"]" "$GLOBALS"; then
    ok "globals.css preserves @import 'tailwindcss'"
  else
    bad "globals.css missing @import 'tailwindcss'"
  fi
fi

# ---------------------------------------------------------------------------
# 7. Infrastructure clean
# ---------------------------------------------------------------------------
step "7/7 Infrastructure clean"

if pnpm typecheck > "$TMPDIR_LOCAL/typecheck.log" 2>&1; then
  ok "pnpm typecheck clean"
else
  bad "pnpm typecheck FAILED:"
  tail -10 "$TMPDIR_LOCAL/typecheck.log" | sed 's,^,     ,'
fi

if pnpm --filter @paxio/landing-app build > "$TMPDIR_LOCAL/build.log" 2>&1; then
  ok "pnpm --filter @paxio/landing-app build clean"
else
  bad "landing build FAILED:"
  tail -15 "$TMPDIR_LOCAL/build.log" | sed 's,^,     ,'
fi

# Drift-guard preserved (M-Q4)
if pnpm exec vitest run tests/context-budget-drift.test.ts > "$TMPDIR_LOCAL/drift.log" 2>&1; then
  ok "M-Q4 drift-guard tests still GREEN"
else
  bad "M-Q4 drift-guard tests REGRESSED:"
  tail -10 "$TMPDIR_LOCAL/drift.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo
echo "═══════════════════════════════════════════════════"
echo "  M-L10.2 acceptance: PASS=$PASS FAIL=$FAIL"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
