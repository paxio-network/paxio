#!/usr/bin/env bash
# TD-17 acceptance script — verify `pnpm build` copies every
# `products/*/app/api/*.js` handler into `dist/`.
#
# WHY: `apps/back/server/src/loader.cjs` scans `dist/products/<fa>/app/api/`
# for `.js` files and mounts them as Fastify routes. But `tsconfig.app.json`
# `include` covers only `.ts` files, so `.js` handlers written in the
# VM-sandbox IIFE format never reach `dist/`. Result: handlers compile
# (and typecheck) fine, but production server returns 404 because loader
# finds an empty directory.
#
# Discovered during M-L4a review 2026-04-24 (TD-17).
#
# Pass criteria:
#   count(handlers in source) > 0
#   count(handlers in dist)   >= count(handlers in source)
#   for each source handler, the mirrored dist file exists
#
# After backend-dev adds a copy-step (e.g. in `package.json::build` script),
# this script goes FAIL → PASS.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()  { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "═════════════════════════════════════════════════════════════"
echo "  TD-17 acceptance — VM-sandbox handlers reach dist/"
echo "═════════════════════════════════════════════════════════════"

echo
echo "── Step 1: pnpm build"
if pnpm build >/tmp/td17-build.log 2>&1; then
  ok "pnpm build exited 0"
else
  bad "pnpm build failed — see /tmp/td17-build.log"
  tail -40 /tmp/td17-build.log
  exit 1
fi

echo
echo "── Step 2: count handlers in source vs dist"

# Source handlers: products/*/app/api/*.js (NOT .ts, those go through tsc)
mapfile -t SRC_HANDLERS < <(find products/*/app/api -maxdepth 2 -name "*.js" -type f 2>/dev/null | sort)
SRC_COUNT=${#SRC_HANDLERS[@]}

# Dist handlers: dist/products/*/app/api/*.js
mapfile -t DIST_HANDLERS < <(find dist/products/*/app/api -maxdepth 2 -name "*.js" -type f 2>/dev/null | sort)
DIST_COUNT=${#DIST_HANDLERS[@]}

echo "  source handlers: $SRC_COUNT"
echo "  dist   handlers: $DIST_COUNT"

if [ "$SRC_COUNT" -gt 0 ]; then
  ok "at least one source handler exists"
else
  bad "no source handlers found under products/*/app/api — milestone regression?"
fi

if [ "$DIST_COUNT" -ge "$SRC_COUNT" ]; then
  ok "dist handler count >= source ($DIST_COUNT >= $SRC_COUNT)"
else
  bad "dist handler count < source ($DIST_COUNT < $SRC_COUNT) — build copy-step missing"
fi

echo
echo "── Step 3: each source handler mirrored in dist"

MISSING=0
for src in "${SRC_HANDLERS[@]}"; do
  # products/01-registry/app/api/find.js → dist/products/01-registry/app/api/find.js
  mirror="dist/${src}"
  if [ -f "$mirror" ]; then
    ok "$src  →  $mirror"
  else
    bad "$src  →  $mirror  (MISSING)"
    MISSING=$((MISSING + 1))
  fi
done

echo
echo "── Step 4: minimum coverage (TD-17 says ≥ 13 handlers expected)"
MIN_EXPECTED=13
if [ "$DIST_COUNT" -ge "$MIN_EXPECTED" ]; then
  ok "dist has ≥ $MIN_EXPECTED handlers ($DIST_COUNT)"
else
  bad "dist has < $MIN_EXPECTED handlers ($DIST_COUNT) — once 01-registry (5) + 02-facilitator (1) + 07-intelligence (7) are all built, this must be ≥13"
fi

echo
echo "═════════════════════════════════════════════════════════════"
echo "  PASS: $PASS   FAIL: $FAIL"
echo "═════════════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo "TD-17 still OPEN — handlers are NOT copied into dist/"
  exit 1
fi

echo "TD-17 CLOSED — every source handler is mirrored into dist/"
exit 0
