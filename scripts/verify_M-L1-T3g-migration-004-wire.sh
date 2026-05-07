#!/usr/bin/env bash
# M-L1-T3g-migration-004-wire acceptance — verifies MIGRATION_004_SOURCE_EXPANSION
# is mirrored inline in postgres-storage.ts and runs after MIGRATION_003 on startup.
#
# Without this wire-up, every backend restart reverts source CHECK to the narrow
# 7-source list of MIGRATION_003 — blocking fetch-ai/native legacy-alias inserts.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step(){ echo; echo "▶ $1"; }

PG=products/01-registry/app/infra/postgres-storage.ts
TESTS=products/01-registry/tests/postgres-storage.test.ts
SQL=packages/contracts/sql/004_source_expansion.sql

step "1. SQL source-of-truth file exists"
if [ -f "$SQL" ]; then
  ok "$SQL present"
else
  bad "$SQL missing — TS mirror has nothing to mirror"
fi

step "2. MIGRATION_004_SOURCE_EXPANSION constant defined in postgres-storage.ts"
if grep -q "MIGRATION_004_SOURCE_EXPANSION" "$PG"; then
  ok "MIGRATION_004_SOURCE_EXPANSION constant present"
else
  bad "MIGRATION_004_SOURCE_EXPANSION constant missing"
fi

step "3. MIGRATION_004 lists fetch-ai + native legacy aliases"
if grep -A 20 "MIGRATION_004_SOURCE_EXPANSION" "$PG" | grep -q "fetch-ai" \
   && grep -A 20 "MIGRATION_004_SOURCE_EXPANSION" "$PG" | grep -q "'native'"; then
  ok "MIGRATION_004 includes both legacy aliases"
else
  bad "MIGRATION_004 missing fetch-ai or native — would still reject legacy inserts"
fi

step "4. MIGRATION_004 includes 13 canonical source values"
canonical=(paxio-native paxio-curated erc8004 a2a bittensor virtuals mcp eliza langchain-hub fetch huggingface vercel-ai github-discovered)
all_present=1
for src in "${canonical[@]}"; do
  if ! grep -A 30 "MIGRATION_004_SOURCE_EXPANSION" "$PG" | grep -q "'$src'"; then
    bad "$src missing from MIGRATION_004 enum"
    all_present=0
  fi
done
if [ "$all_present" = "1" ]; then
  ok "all 13 canonical sources present"
fi

step "5. MIGRATION_004 wired to run after MIGRATION_003 in startup chain"
if grep -E "pool\.query\(MIGRATION_004_SOURCE_EXPANSION\)|query\(MIGRATION_004" "$PG" > /dev/null; then
  ok "MIGRATION_004 invoked in runMigrations chain"
else
  bad "MIGRATION_004 not invoked — defined but never run"
fi

step "6. Test asserts MIGRATION_004 runs after 003"
if grep -E "MIGRATION_004|migration.*004|after.*003" "$TESTS" > /dev/null; then
  ok "test references MIGRATION_004 ordering"
else
  bad "test does not assert MIGRATION_004 wire-up"
fi

step "7. Vitest target file all GREEN"
if pnpm exec vitest run "$TESTS" >/tmp/vitest-t3g.log 2>&1; then
  PASSED=$(grep -E "Tests +[0-9]+ passed" /tmp/vitest-t3g.log | grep -oE "[0-9]+ passed" | head -1)
  ok "vitest target file: $PASSED"
else
  bad "vitest target file FAIL"
  tail -15 /tmp/vitest-t3g.log
fi

echo
echo "M-L1-T3g-migration-004-wire ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
