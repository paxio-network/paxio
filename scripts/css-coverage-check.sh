#!/usr/bin/env bash
# css-coverage-check.sh — visual milestone drift-guard
#
# Extracts every `className="..."` token from apps/frontend/<app>/app/sections/
# and components/ .tsx files. For each token, asserts it resolves to one of:
#   1. CSS rule defined in apps/frontend/<app>/app/{globals.css, styles/*.css}
#   2. Known Tailwind utility (atom or pattern-matched)
#   3. Per-app whitelist (apps/frontend/<app>/.css-whitelist if exists)
#
# Exit 0 = all classes resolve. Exit 1 = unresolved classes (visual will break).
#
# Usage: bash scripts/css-coverage-check.sh <app>
#   <app> = name of frontend app (landing, registry, pay, radar, intel, docs, wallet, fleet)
set -euo pipefail

APP="${1:?usage: css-coverage-check.sh <app-name>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/apps/frontend/$APP"

if [ ! -d "$APP_DIR" ]; then
  echo "🔴 unknown app: $APP (looked at $APP_DIR)"
  exit 1
fi

SECTIONS="$APP_DIR/app/sections"
COMPONENTS="$APP_DIR/app/components"
GLOBALS="$APP_DIR/app/globals.css"
STYLES_DIR="$APP_DIR/app/styles"
# Two whitelist paths checked (architect-owned wins on conflict — entries are
# additive). Per-app .css-whitelist is frontend-dev convenience; architect
# whitelist at scripts/css-whitelist/<app>.txt holds governance exemptions.
WHITELIST_APP="$APP_DIR/.css-whitelist"
WHITELIST_ARCH="$ROOT/scripts/css-whitelist/$APP.txt"

# Collect every CSS selector defined in app's stylesheets.
collect_defined() {
  local css=""
  [ -f "$GLOBALS" ] && css+=$'\n'"$(cat "$GLOBALS")"
  if [ -d "$STYLES_DIR" ]; then
    for f in "$STYLES_DIR"/*.css; do
      [ -f "$f" ] && css+=$'\n'"$(cat "$f")"
    done
  fi
  # Strip comments + extract class selectors. `|| true` to survive grep finding zero.
  echo "$css" \
    | sed 's,/\*[^*]*\*/,,g' \
    | { grep -oE '\.[a-zA-Z_][a-zA-Z0-9_-]*' || true; } \
    | sed 's/^\.//' \
    | sort -u
}

# Collect every className token used in .tsx files.
# Handles: className="foo bar", className={`foo ${cond ? 'bar' : 'baz'}`}, className={'foo'}
collect_used() {
  local files=()
  [ -d "$SECTIONS" ] && while IFS= read -r f; do files+=("$f"); done < <(find "$SECTIONS" -name "*.tsx" -type f 2>/dev/null)
  [ -d "$COMPONENTS" ] && while IFS= read -r f; do files+=("$f"); done < <(find "$COMPONENTS" -name "*.tsx" -type f 2>/dev/null)
  if [ ${#files[@]} -eq 0 ]; then return 0; fi
  # Extract className value as raw string regardless of quote/template style.
  # Match `className="..."` and `className={`...`}` and `className={'...'}`.
  cat "${files[@]}" \
    | { grep -oE 'className=("[^"]+"|\{[^}]+\})' || true; } \
    | sed -E 's/className=//; s/^["{]//; s/["}]$//; s/`//g' \
    | tr -s ' \t\n' '\n' \
    | { grep -E '^[a-zA-Z_][a-zA-Z0-9_-]*$' || true; } \
    | sort -u
}

# Tailwind utility pattern detection — heuristic for atom/responsive/state utilities.
# True if token matches common Tailwind shape; false otherwise.
is_tailwind_atom() {
  local t="$1"
  # Strip variant prefixes (sm:, md:, lg:, xl:, 2xl:, hover:, focus:, dark:, group-hover:, etc)
  local stripped="$t"
  while [[ "$stripped" == *:* ]]; do
    stripped="${stripped#*:}"
  done
  # Common single-word atoms
  case "$stripped" in
    flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|static|table|contents) return 0 ;;
    container|truncate|antialiased|italic|underline|uppercase|lowercase|capitalize|invisible) return 0 ;;
  esac
  # Pattern atoms: text-*, bg-*, p-*, m-*, w-*, h-*, etc.
  if echo "$stripped" | grep -qE '^(text|bg|border|rounded|shadow|p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|w|h|min-w|min-h|max-w|max-h|gap|space|leading|tracking|font|opacity|z|top|left|right|bottom|inset|order|grid-cols|grid-rows|col-span|row-span|flex|items|justify|content|self|place|object|overflow|cursor|pointer-events|select|resize|appearance|outline|ring|divide|fill|stroke|transition|duration|delay|ease|animate|origin|scale|rotate|translate|skew|transform|backdrop|filter|blur|brightness|contrast|saturate|sepia|hue-rotate|invert|drop-shadow|aspect|columns|break|whitespace|word|hyphens|placeholder|caret|accent|scroll)-'; then
    return 0
  fi
  # Arbitrary value: text-[#fff], w-[100px]
  if echo "$stripped" | grep -qE '\['; then
    return 0
  fi
  return 1
}

# Per-app whitelist — explicitly allowed classes (one per line, # for comments)
in_whitelist() {
  local t="$1"
  [ -f "$WHITELIST_ARCH" ] && grep -qE "^${t}\$" "$WHITELIST_ARCH" 2>/dev/null && return 0
  [ -f "$WHITELIST_APP" ] && grep -qE "^${t}\$" "$WHITELIST_APP" 2>/dev/null && return 0
  return 1
}

defined=$(collect_defined)
used=$(collect_used)

if [ -z "$used" ]; then
  echo "ℹ️  no className tokens found in $APP — sections/ + components/ empty or absent"
  exit 0
fi

unresolved=()
while IFS= read -r tok; do
  [ -z "$tok" ] && continue
  if echo "$defined" | grep -qE "^${tok}\$"; then continue; fi
  if is_tailwind_atom "$tok"; then continue; fi
  if in_whitelist "$tok"; then continue; fi
  unresolved+=("$tok")
done <<< "$used"

if [ ${#unresolved[@]} -eq 0 ]; then
  total=$(echo "$used" | wc -l)
  echo "✅ CSS coverage clean — all $total className tokens in $APP resolve to definitions or Tailwind atoms"
  exit 0
fi

echo "🔴 CSS coverage FAIL — $APP has ${#unresolved[@]} unresolved className tokens:"
for t in "${unresolved[@]}"; do
  echo "   - $t"
done
echo
echo "Each token must be one of:"
echo "  1. CSS rule in apps/frontend/$APP/app/{globals.css, styles/*.css}"
echo "  2. Known Tailwind utility (auto-detected by pattern)"
echo "  3. Listed in apps/frontend/$APP/.css-whitelist (one per line)"
echo
echo "If you copied JSX from docs/design/, also copy the matching CSS source."
exit 1
