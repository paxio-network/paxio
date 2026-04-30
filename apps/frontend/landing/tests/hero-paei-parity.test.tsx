// @vitest-environment jsdom
/**
 * RED spec for M-L10.7.1.5 — Hero PAEI label parity with design source.
 *
 * User feedback: «1 в 1» pixel-perfect with target. Static analysis revealed
 * landing impl drifted away from design source on TICKER LABELS + STATE STRIP
 * ending. Architect's comment in 01-hero-b5.tsx::PaeiTicker (lines 162-167)
 * justified the drift via «keep PAEI text unique in DOM for test assertion»,
 * but the actual M-L10.4 hero-b5 test at line 172 only asserts PAEI text
 * appears at all OR ticker section data attribute exists — uniqueness NOT
 * required. So labels can be reverted to design source without breaking
 * tests.
 *
 * Reference: docs/design/paxio-b5/components/v_hero_b5.jsx::PaeiTicker
 * (12 cells labeled PAEI · PAEI·BTC · PAEI·LEGAL · PAEI·FINANCE ·
 * PAEI·RESEARCH · PAEI·CX · PAEI·SECURITY · PAEI·INFRA · PAEI·DEFI ·
 * PAEI·LANG · PAEI·DEV · PAEI·AGENTS) and state strip ends with
 * "PAEI {value} ▲{delta}%".
 *
 * Test SACRED — only architect modifies.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HERO = resolve(__dirname, '..', 'app', 'sections', '01-hero-b5.tsx');
const readHero = (): string => readFileSync(HERO, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ticker labels match design source
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.1.5 — Ticker labels match docs/design/paxio-b5/v_hero_b5.jsx', () => {
  it('contains PAEI·BTC label (currently "BTC")', () => {
    expect(readHero()).toContain('PAEI·BTC');
  });

  it('contains PAEI·LEGAL label (currently "LEGAL")', () => {
    expect(readHero()).toContain('PAEI·LEGAL');
  });

  it('contains PAEI·FINANCE label (currently "FINANCE")', () => {
    expect(readHero()).toContain('PAEI·FINANCE');
  });

  it('contains PAEI·RESEARCH label (currently "RESEARCH")', () => {
    expect(readHero()).toContain('PAEI·RESEARCH');
  });

  it('contains PAEI·CX label (currently "CX")', () => {
    expect(readHero()).toContain('PAEI·CX');
  });

  it('contains PAEI·AGENTS label (currently "AGENTS")', () => {
    expect(readHero()).toContain('PAEI·AGENTS');
  });

  it('does NOT contain "PXI COMPOSITE" label (legacy rebrand — design uses PAEI·*)', () => {
    expect(readHero()).not.toMatch(/PXI\s+COMPOSITE/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. State strip last token is "PAEI" not "PXI Composite"
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.1.5 — State strip ends with "PAEI" per design source', () => {
  it('state strip text ends with "PAEI <b>{paei.toFixed(2)}</b>" pattern', () => {
    const src = readHero();
    // Heuristic: locate state-text block and assert PAEI <b> appears in it
    const stateBlock = src.match(/state-text[\s\S]{0,3000}?<\/p>/);
    expect(stateBlock, 'state-text <p> block expected').not.toBeNull();
    if (!stateBlock) return;
    expect(
      stateBlock[0],
      'state strip ending must use "PAEI" tag per design source v_hero_b5.jsx:178',
    ).toMatch(/PAEI\s+<b/);
  });

  it('state strip does NOT use "PXI Composite" or "PXI" branding', () => {
    const src = readHero();
    const stateBlock = src.match(/state-text[\s\S]{0,3000}?<\/p>/);
    if (!stateBlock) return;
    expect(stateBlock[0]).not.toMatch(/PXI\s+Composite/i);
    expect(stateBlock[0]).not.toMatch(/\bPXI\b/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Drift comment removed (no longer needed since uniqueness assertion is bogus)
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.1.5 — drift-justification comment removed', () => {
  it('PaeiTicker block no longer carries «keep PAEI text unique in DOM» rationale', () => {
    const src = readHero();
    expect(
      src,
      'comment justified the drift but the cited test assertion does not actually require uniqueness — design parity wins',
    ).not.toMatch(/keep PAEI text unique in the DOM/);
  });
});
