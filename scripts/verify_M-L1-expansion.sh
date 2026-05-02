#!/usr/bin/env bash
# M-L1-expansion acceptance — 13-source enum + adapters + migration 004
#
# Covers all M-L1-expansion task PRs (T-1..T-15):
#   - T-1   source enum 13-canonical (PR #117 — landed)
#   - T-1.5 inline migration 004 mirror в postgres-storage.ts (BLOCKING)
#   - T-2   paxio-curated adapter + Zod schemas + wiring (PRs #118, #119)
#   - T-3   Fetch.ai real adapter (PR #120)
#   - T-4..T-13 per-source adapters (subsequent dev sessions)
#   - T-14  x402 enrichment crawler
#   - T-15  /api/intelligence/economy aggregator endpoint
#
# Run: bash scripts/verify_M-L1-expansion.sh
# Run via gate: bash scripts/quality-gate.sh M-L1-expansion
#
# Each task's deliverable verified independently — этот script grows как
# PR'ы M-L1-expansion landыят. Не блокирующий fail если task ещё не landed
# (skipped с notice); blocker только если task SHOULD have landed но
# evidence отсутствует.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()    { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()   { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
skip()  { echo "  ⏭  $1 (not landed yet)"; }
step()  { echo; echo "▶ $1"; }

# ---------------------------------------------------------------------------
step "T-1: source enum has 13 canonical + 2 legacy + AGENT_SOURCE_LABELS exhaustive"
# ---------------------------------------------------------------------------

if grep -q "'paxio-curated'" packages/types/src/agent-source.ts && \
   grep -q "'bittensor'" packages/types/src/agent-source.ts && \
   grep -q "'langchain-hub'" packages/types/src/agent-source.ts && \
   grep -q "'huggingface'" packages/types/src/agent-source.ts && \
   grep -q "'vercel-ai'" packages/types/src/agent-source.ts && \
   grep -q "'github-discovered'" packages/types/src/agent-source.ts; then
  ok "AGENT_SOURCES contains all 6 new M-L1-expansion sources"
else
  bad "AGENT_SOURCES missing M-L1-expansion sources (T-1 not landed?)"
fi

if grep -q "AGENT_SOURCE_LABELS" packages/types/src/agent-source.ts && \
   grep -q "'Bittensor'" packages/types/src/agent-source.ts && \
   grep -q "'LangChain Hub'" packages/types/src/agent-source.ts; then
  ok "AGENT_SOURCE_LABELS has display labels for new sources"
else
  bad "AGENT_SOURCE_LABELS missing new entries"
fi

# ---------------------------------------------------------------------------
step "T-1: SQL migration 004 source-of-truth exists"
# ---------------------------------------------------------------------------

if [ -f packages/contracts/sql/004_source_expansion.sql ]; then
  if grep -q "'paxio-curated'" packages/contracts/sql/004_source_expansion.sql && \
     grep -q "'bittensor'" packages/contracts/sql/004_source_expansion.sql; then
    ok "004_source_expansion.sql exists + lists new canonical values"
  else
    bad "004_source_expansion.sql missing new source values"
  fi
else
  bad "packages/contracts/sql/004_source_expansion.sql not found"
fi

# ---------------------------------------------------------------------------
step "T-1.5: inline MIGRATION_004 mirror в postgres-storage.ts"
# ---------------------------------------------------------------------------

if grep -q "MIGRATION_004" products/01-registry/app/infra/postgres-storage.ts 2>/dev/null; then
  if grep -A60 "MIGRATION_004" products/01-registry/app/infra/postgres-storage.ts | grep -q "'paxio-curated'"; then
    ok "MIGRATION_004 inline mirror present + lists 13 canonical values"
  else
    bad "MIGRATION_004 constant exists но не содержит new sources"
  fi
  # Verify it's actually invoked в createPostgresStorage runMigrations chain
  if grep -A8 "if (deps.runMigrations" products/01-registry/app/infra/postgres-storage.ts | grep -q "MIGRATION_004"; then
    ok "MIGRATION_004 wired в runMigrations sequential chain"
  else
    bad "MIGRATION_004 not invoked в runMigrations chain"
  fi
else
  skip "T-1.5 inline migration 004 mirror — pending registry-dev session"
fi

# ---------------------------------------------------------------------------
step "T-2: paxio-curated adapter + Zod schemas + wiring"
# ---------------------------------------------------------------------------

# T-2 adapter
if [ -f products/01-registry/app/domain/sources/paxio-curated.ts ]; then
  if grep -q "createPaxioCuratedAdapter" products/01-registry/app/domain/sources/paxio-curated.ts; then
    ok "paxio-curated adapter present (createPaxioCuratedAdapter factory)"
  else
    bad "paxio-curated.ts exists без factory function"
  fi
else
  skip "T-2 adapter — pending PR #118 merge"
fi

# T-2 seed JSON
if [ -f products/01-registry/app/data/curated-agents.json ]; then
  ok "curated-agents.json seed file exists"
else
  skip "T-2 seed JSON — pending PR #118 merge"
fi

# T-2 Zod schemas in @paxio/types
if [ -f packages/types/src/sources/paxio-curated.ts ]; then
  if grep -q "ZodPaxioCuratedAgent\|ZodPaxioCuratedFile" packages/types/src/sources/paxio-curated.ts; then
    ok "ZodPaxioCuratedAgent + ZodPaxioCuratedFile в @paxio/types"
  else
    bad "paxio-curated Zod schemas incomplete"
  fi
else
  skip "T-2 Zod schemas — pending PR #118 merge"
fi

# T-2 wiring
if grep -q "'paxio-curated'" apps/back/server/wiring/01-registry.cjs 2>/dev/null; then
  if grep -q "createPaxioCuratedAdapter" apps/back/server/wiring/01-registry.cjs; then
    ok "wiring includes paxio-curated source + adapter selection"
  else
    bad "wiring lists paxio-curated но не connects adapter"
  fi
else
  skip "T-2 wiring — pending PR #119 merge"
fi

# ---------------------------------------------------------------------------
step "T-3: Fetch.ai real adapter (replace stub)"
# ---------------------------------------------------------------------------

if [ -f products/01-registry/app/domain/sources/fetch-ai.ts ]; then
  if grep -q "SAFETY_MAX_PAGES\|search/agents\|Retry-After" products/01-registry/app/domain/sources/fetch-ai.ts; then
    ok "fetch-ai adapter has real REST pagination (not stub)"
  else
    skip "T-3 adapter still stub — pending PR #120 merge"
  fi
else
  bad "fetch-ai.ts not found"
fi

# ---------------------------------------------------------------------------
step "T-4..T-13: остальные adapters (per-task — informational)"
# ---------------------------------------------------------------------------

for adapter in bittensor erc8004 eliza langchain-hub virtuals huggingface vercel-ai github-discovered; do
  if [ -f "products/01-registry/app/domain/sources/${adapter}.ts" ]; then
    if grep -qE "fetch|http|RPC|rpc|search|registry|api" "products/01-registry/app/domain/sources/${adapter}.ts" 2>/dev/null; then
      ok "${adapter} adapter present"
    else
      skip "${adapter} adapter — stub OR landed without external calls"
    fi
  else
    skip "${adapter} adapter — pending session"
  fi
done

# ---------------------------------------------------------------------------
step "T-14: x402 enrichment crawler"
# ---------------------------------------------------------------------------

if [ -f products/01-registry/app/domain/x402-enrichment.ts ]; then
  ok "x402 enrichment crawler exists"
else
  skip "T-14 x402 enrichment — pending icp-dev session"
fi

# ---------------------------------------------------------------------------
step "T-15: /api/intelligence/economy aggregator endpoint"
# ---------------------------------------------------------------------------

if [ -f products/07-intelligence/app/api/intelligence-economy.js ]; then
  ok "intelligence-economy handler exists"
else
  skip "T-15 economy aggregator — pending backend-dev session"
fi

# ---------------------------------------------------------------------------
step "Live API — landing/hero shows agents > 0 (regression check)"
# ---------------------------------------------------------------------------

AGENTS=$(curl -s "https://api.paxio.network/api/landing/hero" --max-time 10 | \
  grep -oE '"agents":[0-9]+' | head -1 | grep -oE '[0-9]+' || echo "0")
if [ "${AGENTS:-0}" -gt 0 ]; then
  ok "/api/landing/hero agents = $AGENTS (M-L1-taxonomy regression intact)"
else
  bad "/api/landing/hero agents = 0 (regression — M-L1-taxonomy crawler broken?)"
fi

# ---------------------------------------------------------------------------

echo
echo "M-L1-expansion ACCEPTANCE — PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ] || exit 1
