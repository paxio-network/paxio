// @vitest-environment jsdom
/**
 * RED spec for M-L10.7.2 — Scrolls fidelity (light theme only).
 *
 * Pins 4 concrete discrepancies between target design source
 * (docs/design/paxio-b5/components/landing_scrolls_b5.jsx + screenshots)
 * and current Vercel deploy:
 *
 *   D-1. ScrollSDK kicker matches "SDK · builders" (currently "NPM package · developers")
 *   D-2. ScrollBitcoin headline says "Bitcoin address" (currently "on-chain address")
 *   D-3. ScrollRadar headline is "We don't host agents." (currently "We do not host agents. We measure them.")
 *   D-4. ScrollNetwork CTA uses ALL CAPS + dark banner styling (currently mixed-case inline link)
 *
 * Test SACRED — only architect modifies.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCROLLS_PATH = resolve(__dirname, '..', 'app', 'sections', '02-scrolls-b5.tsx');
const readScrolls = (): string => readFileSync(SCROLLS_PATH, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// D-1: ScrollSDK kicker text
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.2 D-1 — ScrollSDK kicker matches design source', () => {
  it('ScrollSDK kicker uses "SDK · builders" (NOT "NPM package · developers")', () => {
    const src = readScrolls();
    // Heuristic: locate ScrollSDK function/section, then its kicker prop value
    // Match a kicker prop that contains "SDK" (case-insensitive) + "builders"
    const sdkBlock = src.match(/function ScrollSDK[\s\S]{0,1500}?kicker=["']([^"']+)["']/);
    expect(sdkBlock, 'ScrollSDK function + kicker expected').not.toBeNull();
    if (!sdkBlock) return;
    const kicker = sdkBlock[1];
    expect(
      kicker.toLowerCase(),
      `ScrollSDK kicker = "${kicker}" — expected to contain "sdk" + "builders" per design source`,
    ).toContain('sdk');
    expect(kicker.toLowerCase()).toContain('builders');
  });

  it('ScrollSDK kicker does NOT use legacy "NPM package · developers"', () => {
    const src = readScrolls();
    // Make sure the legacy kicker text was removed
    expect(src).not.toMatch(/kicker=["']NPM package · developers["']/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D-2: ScrollBitcoin headline — Bitcoin address (not on-chain address)
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.2 D-2 — ScrollBitcoin headline says "Bitcoin address"', () => {
  it('headline contains "Bitcoin address" (italicized)', () => {
    const src = readScrolls();
    expect(
      src,
      'target headline: "Your agent. _A real Bitcoin address._" — current uses on-chain',
    ).toMatch(/A real Bitcoin address/);
  });

  it('headline does NOT contain legacy "on-chain address"', () => {
    const src = readScrolls();
    // Allow "on-chain" elsewhere (semantic), but the specific headline phrase must change
    expect(src).not.toMatch(/A real on-chain address/);
  });

  it('on-chain bullet inside code card → Bitcoin bullet (consistent revoking of on-chain phrasing)', () => {
    const src = readScrolls();
    // Soft assertion: if the bullet text exists, it should say "Bitcoin address" too.
    // We don't fail if bullet is absent; we fail if it still says "on-chain address".
    if (!src.match(/✓\s*on-chain address/)) {
      expect(true).toBe(true);
      return;
    }
    expect(src).not.toMatch(/✓\s*on-chain address/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D-3: ScrollRadar headline — "We don't host agents."
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.2 D-3 — ScrollRadar headline is "We don\'t host agents."', () => {
  it('contains exact short form "We don\'t host agents." (3 words + apostrophe)', () => {
    const src = readScrolls();
    expect(
      src,
      'target shoud-be-08.png shows headline ровно "We don\'t host agents." (3 words)',
    ).toMatch(/We don['’]t host agents\./);
  });

  it('does NOT contain legacy long form "We do not host agents."', () => {
    const src = readScrolls();
    expect(src).not.toMatch(/We do not host agents\./);
  });

  it('does NOT contain extra phrase "We measure them." in radar headline', () => {
    const src = readScrolls();
    // "We measure them." is acceptable in body copy but not as headline second-line.
    // Heuristic: locate ScrollRadar block and assert "measure them" absent within it.
    const radarBlock = src.match(/function ScrollRadar[\s\S]{0,3000}/);
    if (!radarBlock) return;
    expect(
      radarBlock[0],
      'remove secondary headline "We measure them." per D-3',
    ).not.toMatch(/We measure them/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D-4: ScrollNetwork CTA banner — ALL CAPS + dark banner styling
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.7.2 D-4 — ScrollNetwork CTA banner styling', () => {
  it('CTA copy in ALL CAPS — "REGISTER YOUR AGENT" + "JOIN THE NETWORK"', () => {
    const src = readScrolls();
    expect(
      src,
      'target shoud-be-11.png: dark CTA banner with ALL CAPS "REGISTER YOUR AGENT — JOIN THE NETWORK"',
    ).toMatch(/REGISTER YOUR AGENT/);
    expect(src).toMatch(/JOIN THE NETWORK/);
  });

  it('CTA wrap carries dark banner class + matching CSS rule exists', () => {
    const src = readScrolls();
    // Find the wrap markup containing REGISTER YOUR AGENT — both the wrap class
    // (BEFORE the text) and inner anchor/span classes need to carry a dark
    // banner indicator. Window covers up to 500 chars BEFORE + 500 AFTER.
    const idx = src.indexOf('REGISTER YOUR AGENT');
    if (idx < 0) return;
    const window = src.slice(Math.max(0, idx - 500), idx + 500);
    expect(
      window,
      'CTA wrap requires dark banner class (banner/cta-banner/cta-dark/tone-ink/ink-bg/dark-cta) — current marker-only span without CSS rule does NOT satisfy: this assertion catches the wrap class itself.',
    ).toMatch(/className=["'][^"']*(banner|cta-dark|dark-cta|tone-ink|ink-bg)[^"']*["']/i);

    // Plus: the matched class must have a CSS rule in landing styles —
    // empty marker class with no rule = test gaming, not impl. Walk landing
    // CSS files looking for a rule body that includes background:var(--ink-0)
    // OR background-color:var(--ink-0) on any of the candidate classes.
    const stylesDir = resolve(__dirname, '..', 'app', 'styles');
    const fs = require('node:fs') as typeof import('node:fs');
    let allCss = '';
    if (fs.existsSync(stylesDir)) {
      for (const f of fs.readdirSync(stylesDir)) {
        if (f.endsWith('.css')) allCss += '\n' + readFileSync(resolve(stylesDir, f), 'utf8');
      }
    }
    const globalsCss = readFileSync(resolve(__dirname, '..', 'app', 'globals.css'), 'utf8');
    allCss += '\n' + globalsCss;
    expect(
      allCss,
      'dark banner CSS rule expected — class with `background: var(--ink-0)` (or color var) somewhere in landing styles. Marker span without CSS rule is M-Q20 anti-pattern.',
    ).toMatch(/(banner|cta-dark|dark-cta|tone-ink|ink-bg)[^{}]*\{[^}]*background[^}]*var\(--ink-0\)/);
  });

  it('CTA copy does NOT use legacy mixed-case "Register your agent — join the network"', () => {
    const src = readScrolls();
    expect(src).not.toMatch(/Register your agent — join the network/);
  });
});
