// @vitest-environment jsdom
/**
 * RED spec for M-L10.7.1 — Hero fidelity pass + disable dark theme.
 *
 * Pins concrete discrepancies identified between target design source
 * (docs/design/paxio-b5/) and current Vercel deploy:
 *
 *   D-1. Agent names use btc- prefix (revert M-L10.5 round-2 rename)
 *   D-2. Dark theme disabled (no html[data-theme="dark"] block in globals.css)
 *   D-3. State strip uses bold tabular mono for numbers
 *   D-4. PaeiTicker has stronger dotted dividers + prominent numbers
 *   D-5. Doors section is 4-column grid (not 2x2)
 *
 * Test SACRED — only architect modifies.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const LANDING = resolve(__dirname, '..');

// ─────────────────────────────────────────────────────────────────────────────
// D-1: Agent names — btc- prefix
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.1 D-1 — agent names use btc- prefix (revert M-L10.5 rename)', () => {
  it('preview.ts contains btc-escrow.paxio (NOT escrow.paxio)', async () => {
    const mod = await import('../app/data/preview');
    const names = (mod.PREVIEW_AGENTS as unknown as Array<{ name: string }>).map(
      (a) => a.name,
    );
    expect(names, 'btc-escrow.paxio expected per design source').toContain('btc-escrow.paxio');
    expect(names, 'plain escrow.paxio should be reverted').not.toContain('escrow.paxio');
  });

  it('preview.ts contains btc-dca.paxio (NOT dca.paxio)', async () => {
    const mod = await import('../app/data/preview');
    const names = (mod.PREVIEW_AGENTS as unknown as Array<{ name: string }>).map(
      (a) => a.name,
    );
    expect(names).toContain('btc-dca.paxio');
    expect(names).not.toContain('dca.paxio');
  });

  it('PREVIEW_NETWORK_SNAPSHOT (if it lists agents by name) uses btc- prefix consistently', async () => {
    const src = readFileSync(resolve(LANDING, 'app', 'data', 'preview.ts'), 'utf8');
    // If preview.ts references the names elsewhere (like NETWORK_SNAPSHOT entries),
    // they too should use btc-* prefix. Asserts no remnant of bare 'escrow.paxio'/'dca.paxio'.
    // Use word-boundary regex to avoid matching 'btc-escrow.paxio' itself.
    const bareEscrow = src.match(/(?<![\w-])escrow\.paxio/g) ?? [];
    const bareDca = src.match(/(?<![\w-])dca\.paxio/g) ?? [];
    expect(
      bareEscrow.length,
      `'escrow.paxio' (without btc- prefix) appears ${bareEscrow.length} times — revert all to 'btc-escrow.paxio'`,
    ).toBe(0);
    expect(
      bareDca.length,
      `'dca.paxio' (without btc- prefix) appears ${bareDca.length} times — revert all to 'btc-dca.paxio'`,
    ).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D-2: Dark theme disabled
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.1 D-2 — dark theme disabled (light-only landing)', () => {
  it('globals.css does NOT contain html[data-theme="dark"] CSS block', () => {
    const css = readFileSync(resolve(LANDING, 'app', 'globals.css'), 'utf8');
    expect(
      css,
      'html[data-theme="dark"] block must be removed per user request «дарк отключи»',
    ).not.toMatch(/html\[data-theme=["']dark["']\]\s*\{/);
  });

  it('hero-variants.css (and other ported styles) also have no html[data-theme="dark"] block', () => {
    const stylesDir = resolve(LANDING, 'app', 'styles');
    if (!existsSync(stylesDir)) return; // Option A: only globals.css
    const fs = require('node:fs');
    const files = fs.readdirSync(stylesDir).filter((f: string) => f.endsWith('.css'));
    for (const f of files) {
      const css = readFileSync(resolve(stylesDir, f), 'utf8');
      expect(
        css,
        `${f} contains dark-theme override — strip per M-L10.7.1 D-2`,
      ).not.toMatch(/html\[data-theme=["']dark["']\]\s*\{/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D-3: State strip — bold tabular mono numbers
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.1 D-3 — state strip numbers are bold + mono + tabular', () => {
  it('01-hero-b5.tsx state-strip block wraps numeric values in <b> tags', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'sections', '01-hero-b5.tsx'), 'utf8');
    // Locate state strip section heuristically: find class="state-strip"/"state-text"
    const stateBlock = src.match(/state-strip[\s\S]{0,2500}?state-text[\s\S]{0,2500}/);
    expect(stateBlock, 'state-strip block expected in HeroB5').not.toBeNull();
    if (!stateBlock) return;
    // Count <b> tags inside state-text — target has multiple bold numbers
    const boldTagCount = (stateBlock[0].match(/<b\s/g) ?? []).length;
    expect(
      boldTagCount,
      `state-text must wrap ≥4 numeric values in <b> tags (target shows: agents count, %, $ throughput, BTC %, drift count, attacks count). Got ${boldTagCount}.`,
    ).toBeGreaterThanOrEqual(4);
  });

  it('hero-variants.css OR globals.css applies font-variant-numeric: tabular-nums to .state-text b', () => {
    const stylesDir = resolve(LANDING, 'app', 'styles');
    const stylesFiles = existsSync(stylesDir)
      ? require('node:fs').readdirSync(stylesDir).filter((f: string) => f.endsWith('.css')).map((f: string) => resolve(stylesDir, f))
      : [];
    const allCss = [resolve(LANDING, 'app', 'globals.css'), ...stylesFiles]
      .filter((p) => existsSync(p))
      .map((p) => readFileSync(p, 'utf8'))
      .join('\n');
    // Target uses tabular-nums + bold weight on numbers in state strip
    expect(
      allCss,
      'no `tabular-nums` declaration found in landing CSS — target uses tabular figure alignment for state strip numbers',
    ).toMatch(/tabular-nums/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D-4: PaeiTicker — stronger dividers + prominent numbers
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.1 D-4 — PaeiTicker stronger dotted dividers + prominent numbers', () => {
  it('TickerCell border-right alpha is ≥ 0.30 (was 0.18 — too faint vs target)', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'sections', '01-hero-b5.tsx'), 'utf8');
    // Heuristic: find borderRight with rgba alpha
    const borderMatches = src.match(/borderRight:[^,]*?rgba\(26,\s*22,\s*18,\s*([0-9.]+)\)/g) ?? [];
    expect(borderMatches.length, 'TickerCell borderRight rgba expected').toBeGreaterThan(0);
    const first = borderMatches[0];
    if (!first) return;
    // Extract first alpha value
    const alphaMatch = first.match(/0\.[0-9]+/);
    expect(alphaMatch, 'alpha expected in borderRight rgba').not.toBeNull();
    if (!alphaMatch) return;
    const alpha = parseFloat(alphaMatch[0]);
    expect(
      alpha,
      `TickerCell border-right alpha = ${alpha} — too faint (target ≥0.30 for stronger visual divider per D-4)`,
    ).toBeGreaterThanOrEqual(0.3);
  });

  it('TickerCell numeric value font-size ≥ 12 (was 10 — too small vs target)', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'sections', '01-hero-b5.tsx'), 'utf8');
    // Locate TickerCell impl block — match from `function TickerCell` until next
    // top-level `function ` declaration (greedy to next sibling component) so
    // fontSize references inside the JSX render are included. Lazy ?\} matched
    // only the destructuring close brace (round 2 reviewer must-fix).
    const tickerCellBlock = src.match(/function TickerCell[\s\S]*?(?=\nfunction |\nexport function )/);
    expect(tickerCellBlock, 'TickerCell function block expected').not.toBeNull();
    if (!tickerCellBlock) return;
    const fontSizeMatches = tickerCellBlock[0].match(/fontSize:\s*(\d+)/g) ?? [];
    const sizes = fontSizeMatches.map((m) => parseInt(m.replace(/\D/g, ''), 10));
    const max = sizes.length > 0 ? Math.max(...sizes) : 0;
    expect(
      max,
      `TickerCell max fontSize = ${max} — value text needs ≥12 for prominence (target shows ~13-15)`,
    ).toBeGreaterThanOrEqual(12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D-5: Doors section — 4-column grid + stats banner
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.1 D-5 — Doors section 4-column grid + Last24h stats banner', () => {
  it('hero-b5.tsx OR dedicated doors section uses 4-column grid (not 2x2)', () => {
    // Search both .tsx sources AND landing CSS files (grid template can live in
    // either inline style or external stylesheet — round 2 reviewer must-fix).
    const heroSrc = readFileSync(resolve(LANDING, 'app', 'sections', '01-hero-b5.tsx'), 'utf8');
    const scrollsSrc = existsSync(resolve(LANDING, 'app', 'sections', '02-scrolls-b5.tsx'))
      ? readFileSync(resolve(LANDING, 'app', 'sections', '02-scrolls-b5.tsx'), 'utf8')
      : '';
    const globalsCss = readFileSync(resolve(LANDING, 'app', 'globals.css'), 'utf8');
    const stylesDir = resolve(LANDING, 'app', 'styles');
    let stylesCss = '';
    if (existsSync(stylesDir)) {
      const fs = require('node:fs') as typeof import('node:fs');
      for (const f of fs.readdirSync(stylesDir)) {
        if (f.endsWith('.css')) {
          stylesCss += '\n' + readFileSync(resolve(stylesDir, f), 'utf8');
        }
      }
    }
    const combined = [heroSrc, scrollsSrc, globalsCss, stylesCss].join('\n');

    const has4Col =
      /grid-template-columns:\s*repeat\(4/.test(combined) ||
      /gridTemplateColumns:\s*['"`]repeat\(4/.test(combined);
    expect(
      has4Col,
      'Doors section must use 4-column grid (target shows Builder/Buyer/Analyst/Enterprise in single horizontal row). Found only 2-column or different.',
    ).toBe(true);
  });

  it('Stats banner — "Last 24h on Paxio" with txns / agents / value-moved / 100%', () => {
    const heroSrc = readFileSync(resolve(LANDING, 'app', 'sections', '01-hero-b5.tsx'), 'utf8');
    const scrollsSrc = existsSync(resolve(LANDING, 'app', 'sections', '02-scrolls-b5.tsx'))
      ? readFileSync(resolve(LANDING, 'app', 'sections', '02-scrolls-b5.tsx'), 'utf8')
      : '';
    const combined = heroSrc + '\n' + scrollsSrc;
    expect(
      combined,
      'Stats banner with "Last 24h" copy required (target shoud-be-13.png shows dark banner under Doors)',
    ).toMatch(/Last\s+24h/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Soft assertion: hero-b5.test.tsx already updated for btc- prefix.
// (Reminder for architect to update existing M-L10.4 test, NOT for impl to fix.)
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.1 — architect maintenance: hero-b5.test.tsx asserts btc- prefix', () => {
  it('hero-b5.test.tsx asserts btc-escrow.paxio (architect updates concurrently with this PR)', () => {
    const src = readFileSync(resolve(LANDING, 'tests', 'hero-b5.test.tsx'), 'utf8');
    expect(
      src,
      'M-L10.4 hero-b5 spot-check assertion must be updated to expect btc-escrow.paxio + btc-dca.paxio',
    ).toMatch(/btc-escrow\.paxio/);
  });
});
