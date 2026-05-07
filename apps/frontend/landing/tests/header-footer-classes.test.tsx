// @vitest-environment jsdom
/**
 * RED spec for M-L10.7.3 — Header + Footer refactor: inline styles → design class names.
 *
 * Design source: docs/design/paxio-b5/Paxio-B5.html (header lines 26-72; footer lines 101-160).
 * Pins concrete class-name usage + drops inline-style anti-pattern that's making
 * landing render structurally identical но visually drifted from design.
 *
 * Test SACRED — only architect modifies.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const HEADER_PATH = resolve(REPO_ROOT, 'packages/ui/src/Header.tsx');
const FOOTER_PATH = resolve(REPO_ROOT, 'packages/ui/src/Footer.tsx');
const LAYOUT_PATH = resolve(__dirname, '..', 'app', 'layout.tsx');

const readHeader = (): string => readFileSync(HEADER_PATH, 'utf8');
const readFooter = (): string => readFileSync(FOOTER_PATH, 'utf8');
const readLayout = (): string => readFileSync(LAYOUT_PATH, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// D-1: Header — id="paxio-header" + design class names
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.3 D-1 — Header uses design source structure', () => {
  it('Header.tsx uses id="paxio-header" (NOT className="paxio-header")', () => {
    const src = readHeader();
    expect(
      src,
      'design source: <header id="paxio-header"> — class selector ".paxio-header" does NOT match "#paxio-header" CSS rule',
    ).toMatch(/id=["']paxio-header["']/);
  });

  for (const cls of ['hdr-inner', 'hdr-brand', 'hdr-mark', 'hdr-wordmark', 'hdr-links', 'hdr-actions']) {
    it(`Header.tsx applies className="${cls}" (per design)`, () => {
      const src = readHeader();
      expect(src, `design source uses .${cls}`).toMatch(new RegExp(`className=["'][^"']*\\b${cls}\\b`));
    });
  }

  it('Header.tsx CTA buttons use hdr-cta + hdr-cta-outline / hdr-cta-primary classes', () => {
    const src = readHeader();
    expect(src).toMatch(/hdr-cta-outline/);
    expect(src).toMatch(/hdr-cta-primary/);
  });

  it('Header.tsx has hdr-live status indicator class', () => {
    const src = readHeader();
    expect(src).toMatch(/hdr-live/);
  });

  it('Header.tsx drops layout inline styles (≤ 4 style={} blocks — only for SVG)', () => {
    const src = readHeader();
    const styleBlocks = (src.match(/style=\{\{/g) ?? []).length;
    expect(
      styleBlocks,
      `Header.tsx has ${styleBlocks} inline style={{...}} blocks — design uses class names. Allow ≤4 for SVG-internal styling (display: inline-block etc.).`,
    ).toBeLessThanOrEqual(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D-2: Footer — id="page-foot" + design class names + 3-column sitemap
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.3 D-2 — Footer uses design source structure', () => {
  it('Footer.tsx uses id="page-foot" (per design line 101)', () => {
    const src = readFooter();
    expect(src).toMatch(/id=["']page-foot["']/);
  });

  for (const cls of ['foot-inner', 'foot-brand', 'foot-mark', 'foot-tagline', 'foot-cols', 'foot-h', 'foot-legal']) {
    it(`Footer.tsx applies className="${cls}"`, () => {
      const src = readFooter();
      expect(src).toMatch(new RegExp(`className=["'][^"']*\\b${cls}\\b`));
    });
  }

  it('Footer.tsx has 3 sitemap headings: Product / Builders / Company', () => {
    const src = readFooter();
    expect(src).toMatch(/Product/);
    expect(src).toMatch(/Builders/);
    expect(src).toMatch(/Company/);
  });

  it('Footer.tsx tagline includes "Financial OS for the agentic economy"', () => {
    const src = readFooter();
    expect(src).toMatch(/Financial OS for the agentic economy/);
  });

  it('Footer.tsx drops layout inline styles (≤ 4 style={} blocks — only for SVG)', () => {
    const src = readFooter();
    const styleBlocks = (src.match(/style=\{\{/g) ?? []).length;
    expect(
      styleBlocks,
      `Footer.tsx has ${styleBlocks} inline style={{...}} blocks — design uses class names. Allow ≤4 for SVG-internal.`,
    ).toBeLessThanOrEqual(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D-3: layout.tsx body data-attributes
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.3 D-3 — layout.tsx body data-attributes per design', () => {
  it('layout.tsx body has data-density="regular"', () => {
    const src = readLayout();
    expect(src).toMatch(/data-density=["']regular["']/);
  });

  it('layout.tsx body has data-accent="classic"', () => {
    const src = readLayout();
    expect(src).toMatch(/data-accent=["']classic["']/);
  });

  it('layout.tsx body keeps data-production="false" (R-FE-Preview disclosure preserved)', () => {
    const src = readLayout();
    expect(src).toMatch(/data-production=["']false["']/);
  });

  it('layout.tsx body keeps data-motion attribute', () => {
    const src = readLayout();
    expect(src).toMatch(/data-motion=["'](live|off)["']/);
  });
});
