#!/bin/bash
set -euo pipefail

# Vercel ignore script — Berkner-style
# exit 1 = BUILD (changes detected), exit 0 = SKIP (no relevant changes)
# Vercel convention is counter-intuitive: 1 = do build, 0 = skip

APP_NAME="${1:-}"
PREV_SHA="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [ -z "$APP_NAME" ] || [ -z "$PREV_SHA" ]; then
  # Missing context — fail open: build to be safe
  exit 1
fi

# Check if any files under the app or shared packages changed
if git diff --quiet "$PREV_SHA" HEAD -- "apps/frontend/$APP_NAME/" \
               "packages/ui/" \
               "packages/hooks/" \
               "packages/api-client/" \
               "packages/auth/" \
               "packages/types/"; then
  # No relevant changes — skip build
  exit 0
else
  # Changes detected — trigger build
  exit 1
fi
