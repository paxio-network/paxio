#!/usr/bin/env bash
# M-L11 Phase 1 acceptance — Real Data Pipeline contracts
#
# Idempotent E2E verification for Phase 1 ONLY (contracts + RED specs).
# Phases 2-7 get их own milestones (M-L11.2..6).
#
# Steps:
#   1. Phase 1 deliverables exist
#   2. Type/interface barrels re-export new modules
#   3. Zod contract tests GREEN (intelligence-contracts.test.ts)
#   4. RED specs vacuous-skip GREEN (cron-scheduler + intelligence-handlers)
#   5. Infrastructure clean: typecheck + frozen-lockfile + baseline vitest

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

TMPDIR_LOCAL="$(mktemp -d -t ml11-acc-XXXXXX)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

# ---------------------------------------------------------------------------
# 1. Phase 1 deliverables exist
# ---------------------------------------------------------------------------
step "1/5 Phase 1 deliverables exist"

DELIVERABLES=(
  "packages/types/src/cron-scheduler.ts"
  "packages/types/src/intelligence.ts"
  "packages/interfaces/src/cron-scheduler.ts"
  "packages/interfaces/src/intelligence.ts"
  "packages/types/src/index.ts"
  "packages/interfaces/src/index.ts"
  "tests/intelligence-contracts.test.ts"
  "products/01-registry/tests/cron-scheduler.test.ts"
  "products/07-intelligence/tests/intelligence-handlers.test.ts"
  "docs/sprints/M-L11-real-data-pipeline.md"
)

for f in "${DELIVERABLES[@]}"; do
  if [ -f "$f" ]; then
    ok "$f exists"
  else
    bad "$f MISSING"
  fi
done

# ---------------------------------------------------------------------------
# 2. Barrel re-exports
# ---------------------------------------------------------------------------
step "2/5 Barrel re-exports include new modules"

if grep -q "from './cron-scheduler.js'" packages/types/src/index.ts; then
  ok "@paxio/types barrel re-exports cron-scheduler"
else
  bad "@paxio/types barrel MISSING cron-scheduler re-export"
fi

if grep -q "from './intelligence.js'" packages/types/src/index.ts; then
  ok "@paxio/types barrel re-exports intelligence"
else
  bad "@paxio/types barrel MISSING intelligence re-export"
fi

if grep -q "from './cron-scheduler.js'" packages/interfaces/src/index.ts; then
  ok "@paxio/interfaces barrel re-exports CronScheduler"
else
  bad "@paxio/interfaces barrel MISSING CronScheduler re-export"
fi

if grep -q "from './intelligence.js'" packages/interfaces/src/index.ts; then
  ok "@paxio/interfaces barrel re-exports Intelligence ports"
else
  bad "@paxio/interfaces barrel MISSING Intelligence re-export"
fi

# ---------------------------------------------------------------------------
# 3. Zod contract tests GREEN
# ---------------------------------------------------------------------------
step "3/5 Zod contract tests GREEN"

if pnpm exec vitest run tests/intelligence-contracts.test.ts > "$TMPDIR_LOCAL/zod.log" 2>&1; then
  P=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/zod.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  ok "intelligence-contracts.test.ts $P passed"
else
  bad "intelligence-contracts.test.ts RED:"
  tail -25 "$TMPDIR_LOCAL/zod.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 4. RED specs vacuous-skip GREEN (impl missing → tests still pass)
# ---------------------------------------------------------------------------
step "4/5 RED specs vacuous-skip GREEN"

if pnpm exec vitest run products/01-registry/tests/cron-scheduler.test.ts > "$TMPDIR_LOCAL/sched.log" 2>&1; then
  P=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/sched.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  ok "cron-scheduler.test.ts $P passed (vacuous-skip until registry-dev impl)"
else
  bad "cron-scheduler.test.ts RED:"
  tail -25 "$TMPDIR_LOCAL/sched.log" | sed 's,^,     ,'
fi

if pnpm exec vitest run products/07-intelligence/tests/intelligence-handlers.test.ts > "$TMPDIR_LOCAL/handlers.log" 2>&1; then
  P=$(grep -oE 'Tests\s+[0-9]+ passed' "$TMPDIR_LOCAL/handlers.log" | tail -1 | grep -oE '[0-9]+' || echo "?")
  ok "intelligence-handlers.test.ts $P passed (vacuous-skip until backend-dev impl)"
else
  bad "intelligence-handlers.test.ts RED:"
  tail -25 "$TMPDIR_LOCAL/handlers.log" | sed 's,^,     ,'
fi

# ---------------------------------------------------------------------------
# 5. Infrastructure clean
# ---------------------------------------------------------------------------
step "5/5 Infrastructure clean"

if pnpm install --frozen-lockfile --lockfile-only > "$TMPDIR_LOCAL/install.log" 2>&1; then
  ok "pnpm install --frozen-lockfile clean"
else
  bad "pnpm install --frozen-lockfile FAILED — TD-35 class regression"
fi

if pnpm typecheck > "$TMPDIR_LOCAL/typecheck.log" 2>&1; then
  ok "pnpm typecheck clean"
else
  bad "pnpm typecheck FAILED:"
  tail -15 "$TMPDIR_LOCAL/typecheck.log" | sed 's,^,     ,'
fi

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
echo "  M-L11 Phase 1 acceptance: PASS=$PASS FAIL=$FAIL"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
