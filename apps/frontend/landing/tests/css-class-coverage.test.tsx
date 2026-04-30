// @vitest-environment node
/**
 * RED spec for M-L10.6 — CSS class coverage drift-guard.
 *
 * Closure for the M-L10.5 deploy bug: frontend-dev ported JSX from
 * docs/design/paxio-b5/components/*.jsx but NOT the matching CSS from
 * docs/design/paxio-b5/styles/{hero_variants,landing_scrolls,paxio_b3_page,
 * paxio_b5_fixes}.css. Hero / Scrolls components reference ~50 design-system
 * classes that don't exist in globals.css → unstyled cream-paper deploy.
 *
 * This test pins the design-system parity invariant:
 *   "Every CSS selector defined in docs/design/paxio-b5/styles/*.css MUST
 *   also be defined in apps/frontend/landing/app/globals.css (or a CSS
 *   module imported by it)."
 *
 * RED: globals.css has only paxio.css (~30 selectors). 4 other source files
 * provide ~150+ selectors that are missing.
 *
 * GREEN: frontend-dev ports the 4 missing files (M-L10.6 T-1).
 *
 * Test SACRED — only architect modifies.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const DESIGN_STYLES = resolve(REPO_ROOT, 'docs/design/paxio-b5/styles');
const LANDING_APP = resolve(REPO_ROOT, 'apps/frontend/landing/app');
const GLOBALS_CSS = resolve(LANDING_APP, 'globals.css');
const STYLES_DIR = resolve(LANDING_APP, 'styles');

// Extract simple class selectors `.foo`, `.foo-bar`, `.foo:hover`, `.foo.bar`
// from CSS source. Returns Set of bare class names (no leading `.`, no
// pseudo-class, no chained class).
const extractSelectors = (css: string): Set<string> => {
  // Strip block comments + at-rules content
  const stripped = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@media[^{]+\{/g, '{');
  // Match `.classname` followed by space, `,`, `{`, `:`, `.`, `[`, `>`, etc.
  const matches = stripped.matchAll(/\.([a-zA-Z_][\w-]*)/g);
  const set = new Set<string>();
  for (const m of matches) set.add(m[1]);
  return set;
};

// Read all CSS files imported by globals.css transitively (1 level — globals.css
// either inlines or `@import './styles/X.css'`).
const readEffectiveStylesheet = (): string => {
  if (!existsSync(GLOBALS_CSS)) return '';
  let css = readFileSync(GLOBALS_CSS, 'utf8');
  // Resolve `@import './styles/foo.css'` (single-quote OR double-quote)
  const importRe = /@import\s+['"](\.\/?styles\/[\w-]+\.css)['"]/g;
  for (const m of css.matchAll(importRe)) {
    const subpath = m[1].replace(/^\.\//, '');
    const subfile = resolve(LANDING_APP, subpath);
    if (existsSync(subfile)) {
      css += '\n' + readFileSync(subfile, 'utf8');
    }
  }
  // Also append every file in app/styles/ if directory exists (regardless of
  // explicit import — frontend-dev may use Next.js `app/styles/` convention).
  if (existsSync(STYLES_DIR)) {
    for (const f of readdirSync(STYLES_DIR)) {
      if (f.endsWith('.css')) {
        css += '\n' + readFileSync(resolve(STYLES_DIR, f), 'utf8');
      }
    }
  }
  return css;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Source design files exist (sanity)
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.6 — design source CSS files present', () => {
  for (const f of [
    'paxio.css',
    'hero_variants.css',
    'landing_scrolls.css',
    'paxio_b3_page.css',
    'paxio_b5_fixes.css',
  ]) {
    it(`docs/design/paxio-b5/styles/${f} exists`, () => {
      expect(existsSync(resolve(DESIGN_STYLES, f)), `source design CSS missing: ${f}`).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CSS port coverage — every source selector MUST be in landing globals
// ─────────────────────────────────────────────────────────────────────────────

// Per-source whitelist of selectors landing INTENTIONALLY does not port —
// either obsoleted by a later refactor or replaced with a different selector.
// Each entry has a one-line rationale referencing the milestone that diverged.
const INTENTIONAL_DIVERGENCE: Record<string, ReadonlySet<string>> = {
  // M-L10.7.1 D-5: Doors section refactored from "grouped" layout (doors-group/
  // doors-grid-v2/doors-divider/dgl-dot) to a flat 4-column grid (doors-flat-grid).
  // The grouped selectors stay in design source as historical reference; landing
  // diverges intentionally.
  'paxio_b5_fixes.css': new Set([
    'doors-grid-v2',
    'doors-group',
    'doors-group-label',
    'doors-group-cards',
    'doors-divider',
    'dgl-dot',
  ]),
};

describe('M-L10.6 — design-system parity (every source CSS selector ported)', () => {
  for (const sourceName of [
    'hero_variants.css',
    'landing_scrolls.css',
    'paxio_b3_page.css',
    'paxio_b5_fixes.css',
  ]) {
    it(`${sourceName} — all selectors present in landing effective stylesheet`, () => {
      const sourcePath = resolve(DESIGN_STYLES, sourceName);
      const sourceCss = readFileSync(sourcePath, 'utf8');
      const sourceSelectors = extractSelectors(sourceCss);
      const landingCss = readEffectiveStylesheet();
      const landingSelectors = extractSelectors(landingCss);
      const allowed = INTENTIONAL_DIVERGENCE[sourceName] ?? new Set<string>();

      const missing: string[] = [];
      for (const sel of sourceSelectors) {
        if (allowed.has(sel)) continue;
        if (!landingSelectors.has(sel)) missing.push(sel);
      }

      expect(
        missing.length,
        `${sourceName} → landing missing ${missing.length}/${sourceSelectors.size} selectors. ` +
          `First 10: ${missing.slice(0, 10).join(', ')}. ` +
          `Frontend-dev: port ${sourceName} into apps/frontend/landing/app/{globals.css OR styles/*.css}. ` +
          `If a selector is intentionally diverged (refactored to a different name), add it to INTENTIONAL_DIVERGENCE in this test (architect-only edit).`,
      ).toBe(0);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Critical class spot-check (most-visible classes from M-L10.4 + M-L10.5)
// ─────────────────────────────────────────────────────────────────────────────

const CRITICAL_CLASSES_HERO = [
  'v-frame',
  'v-stage',
  'state-strip',
  'state-text',
  'panel',
  'kicker',
  'hand',
  'btn',
  'chip',
] as const;

const CRITICAL_CLASSES_SCROLLS = [
  'b3-grid',
  'btcv2-hero',
  'btcv2-addr-card',
  'btcv2-compare-grid',
  'btcv2-paths',
] as const;

describe('M-L10.6 — critical class spot-check', () => {
  it('Hero-critical classes defined in landing stylesheet', () => {
    const css = readEffectiveStylesheet();
    const selectors = extractSelectors(css);
    const missing = CRITICAL_CLASSES_HERO.filter((c) => !selectors.has(c));
    expect(
      missing.length,
      `Hero-critical missing: ${missing.join(', ')} (these are visible on first paint of paxio.network)`,
    ).toBe(0);
  });

  it('Scrolls-critical classes defined in landing stylesheet', () => {
    const css = readEffectiveStylesheet();
    const selectors = extractSelectors(css);
    const missing = CRITICAL_CLASSES_SCROLLS.filter((c) => !selectors.has(c));
    expect(
      missing.length,
      `Scrolls-critical missing: ${missing.join(', ')} (Bitcoin/Antithesis/Doors sections rely on these)`,
    ).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Effective stylesheet line count threshold
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.6 — effective stylesheet size threshold', () => {
  it('total CSS in landing app is at least 2500 lines (sum of 5 source files)', () => {
    const css = readEffectiveStylesheet();
    const lineCount = css.split('\n').length;
    expect(
      lineCount,
      `effective CSS only ${lineCount} lines — design source totals ~3300; ` +
        `frontend-dev to port hero_variants + landing_scrolls + paxio_b3_page + paxio_b5_fixes`,
    ).toBeGreaterThanOrEqual(2500);
  });
});
