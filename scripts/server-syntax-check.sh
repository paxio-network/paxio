#!/usr/bin/env bash
# server-syntax-check.sh — backend CJS syntax drift-guard.
#
# Runs `node --check` on every .cjs file in apps/back/server/ (recursive).
# Exit 0 = all clean. Exit 1 = first syntax failure printed + exit non-zero.
#
# Usage:
#   bash scripts/server-syntax-check.sh
#
# When to run:
#   - Backend dev: before saying «готово» when changes touch apps/back/server/
#   - Reviewer:    Phase N for any PR touching apps/back/server/
#   - quality-gate.sh step 1.5/6 calls this class of check inline
#
# Why this exists:
#   pnpm typecheck only handles .ts files (tsc -p tsconfig.base.json --noEmit).
#   .cjs files in apps/back/server/ pass typecheck even with syntax errors.
#   vitest tests don't load main.cjs end-to-end. So a duplicate `const X = ...`
#   declaration ships through CI green but breaks `node main.cjs` startup
#   silently — server fails to load on production deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
fail_files=()

while IFS= read -r f; do
  if node --check "$f" 2>/dev/null; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
    fail_files+=("$f")
  fi
done < <(find apps/back/server -name '*.cjs' -type f 2>/dev/null | sort)

if [ "$FAIL" -eq 0 ]; then
  echo "✅ all $PASS apps/back/server/*.cjs files pass node --check"
  exit 0
fi

echo "🔴 $FAIL syntax error(s) in apps/back/server/*.cjs ($PASS clean):"
for f in "${fail_files[@]}"; do
  echo
  echo "── $f ──"
  node --check "$f" 2>&1 || true
done
exit 1
