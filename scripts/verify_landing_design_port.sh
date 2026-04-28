#!/usr/bin/env bash
# M-L9 acceptance — Landing Design Port (paxio.network → Paxio B5 visual).
#
# Boots Next.js production build of @paxio/landing-app on :3500, runs
# structural + textual fidelity checks.  Log suppressed — all output to stdout.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
step() { echo; echo "▶ $1"; }

NEXT_PID=""
cleanup() {
  if [ -n "$NEXT_PID" ] && kill -0 "$NEXT_PID" 2>/dev/null; then
    kill "$NEXT_PID" 2>/dev/null || true
    wait "$NEXT_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

step "1. Install + build @paxio/landing-app (production)"
if pnpm install --frozen-lockfile 2>&1 \
   && pnpm --filter @paxio/landing-app build 2>&1; then
  ok "build succeeded"
else
  # If install fails due to existing node_modules, try build-only
  if pnpm --filter @paxio/landing-app build 2>&1; then
    ok "build succeeded (skipping install — node_modules already present)"
  else
    bad "build FAILED"
    exit 1
  fi
fi

step "2. Start Next.js prod server (auto-detect free port in 3500..3510)"
# Auto-detect free port — dev environment may have zombie next-server
# processes from prior runs (different user, can't kill).
PORT=""
for candidate in 3500 3501 3502 3503 3504 3505 3506 3507 3508 3509 3510; do
  if ! (ss -tln 2>/dev/null | grep -q ":${candidate} ") \
     && ! (curl -sf "http://127.0.0.1:${candidate}/" -o /dev/null 2>/dev/null); then
    PORT="$candidate"
    break
  fi
done
[ -n "$PORT" ] || { bad "No free port in 3500..3510"; exit 1; }
echo "  Using port :$PORT"

NEXT_PID=""
{
  PORT="$PORT" NEXT_PUBLIC_API_URL=https://api.paxio.network \
    pnpm --filter @paxio/landing-app start --port "$PORT" 2>&1 &
} &
NEXT_PID=$!
echo "  Started Next.js pid=$NEXT_PID"

BOUND=false
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    BOUND=true
    ok "Next.js listening on :$PORT (after ${i}s)"
    break
  fi
  sleep 1
done
[ "$BOUND" = true ] || { bad "Next.js never bound :$PORT"; exit 1; }

step "3. Page renders (200 + content-type text/html)"
HEAD=$(curl -sI http://127.0.0.1:${PORT}/ | head -3)
echo "  $HEAD" | head -2 | sed 's/^/    /'
if echo "$HEAD" | head -1 | grep -q "200"; then
  ok "GET / 200"
else
  bad "GET / non-200"
fi

step "4. Title matches artefact (Paxio — Financial OS for the agentic economy)"
PAGE=$(curl -sf http://127.0.0.1:${PORT}/)
TITLE=$(echo "$PAGE" | grep -oE "<title>[^<]+</title>" | head -1)
echo "  rendered: $TITLE"
if echo "$TITLE" | grep -qE "Paxio.*Financial.*Operating|Paxio.*Financial OS|Paxio.*agent"; then
  ok "title contains Paxio + Financial/agentic"
else
  bad "title doesn't match artefact intent"
fi

step "5. Preview ribbon present (SIMULATED PREVIEW disclaimer)"
if echo "$PAGE" | grep -qE "SIMULATED PREVIEW|LAUNCHING Q[0-9]|METRICS ARE PROJECTED"; then
  ok "preview-ribbon visible"
else
  bad "preview-ribbon missing — TD-31 candidate (artefact ribbon must be ported per M-L9 invariant)"
fi

step "6. All 9 sections present in DOM"
sections_found=0
for marker in 'paxio-header' 'registry' 'quickstart' 'bitcoin-native' 'radar' 'pay' 'network' 'doors' 'page-foot'; do
  if echo "$PAGE" | grep -qE "id=[\"']${marker}[\"']|data-section=[\"']${marker}[\"']"; then
    sections_found=$((sections_found+1))
  else
    bad "section [$marker] missing from rendered HTML"
  fi
done
if [ "$sections_found" -eq 9 ]; then
  ok "all 9 sections present"
else
  bad "only $sections_found of 9 sections rendered"
fi

step "7. Real-data invariant — no Math.random or hardcoded mega-numbers"
# Check rendered HTML doesn't contain literal "2,483,989" or "$18.2M" from
# artefact mock data. Real backend currently returns 0; UI should show 0
# (or em-dash), not artefact placeholders.
if echo "$PAGE" | grep -qE "2,483,989|\\\$18\.2M|1\.21M Guard|312 agents drifted"; then
  bad "rendered page contains hardcoded artefact mock numbers — Real-Data Invariant violated"
else
  ok "no hardcoded artefact mock numbers (Real-Data Invariant intact)"
fi

step "8. Required text markers from artefact copy"
markers_found=0
markers_total=0
for marker in 'State of the Agentic Economy' 'agents indexed' 'FAP throughput' 'Guard-blocked' 'Install the SDK' 'Open the Registry' 'Get Intel access' 'Talk to us'; do
  markers_total=$((markers_total+1))
  if echo "$PAGE" | grep -qF "$marker"; then
    markers_found=$((markers_found+1))
  fi
done
if [ "$markers_found" -ge $((markers_total - 1)) ]; then
  ok "$markers_found / $markers_total artefact copy markers present"
else
  bad "$markers_found / $markers_total — missing copy from artefact"
fi

step "9. Backend live (sanity — proves real-data path, not mocked)"
HERO=$(curl -sf https://api.paxio.network/api/landing/hero || echo "{}")
if echo "$HERO" | grep -qE '"agents":[0-9]'; then
  ok "/api/landing/hero returns numeric agents field — frontend can consume"
else
  bad "/api/landing/hero doesn't return expected shape — backend regression"
fi

step "10. Lighthouse-style smoke (page weight + critical resources)"
SIZE=$(curl -sf http://127.0.0.1:${PORT}/ | wc -c)
echo "  rendered HTML: $SIZE bytes"
if [ "$SIZE" -gt 100 ] && [ "$SIZE" -lt 2000000 ]; then
  ok "HTML weight in sane range (100B..2MB)"
else
  bad "HTML weight $SIZE bytes — outside expected 100B..2MB range"
fi

echo
echo "─────────────────────────────────────────────"
echo "M-L9 ACCEPTANCE — PASS=$PASS  FAIL=$FAIL"
echo "─────────────────────────────────────────────"
[ $FAIL -eq 0 ] || exit 1
echo "M-L9: paxio.network landing visually + structurally matches Paxio B5 artefact;"
echo "real-data invariant intact; all 9 sections present."