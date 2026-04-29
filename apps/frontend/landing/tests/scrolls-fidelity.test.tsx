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

  it('CTA has dark banner class (banner / dark / cta-banner / similar)', () => {
    const src = readScrolls();
    // Heuristic: find network-cta block, ensure it carries a class implying dark/banner styling
    const networkBlock = src.match(/REGISTER YOUR AGENT[\s\S]{0,500}/);
    if (!networkBlock) return;
    // The CTA wrap or anchor must use a class with "banner", "dark", or "tone-ink"
    expect(
      networkBlock[0],
      'CTA wrap requires dark banner class — banner/dark/tone-ink/ink/cta-banner',
    ).toMatch(/(banner|tone-ink|cta-dark|dark-cta|ink-bg|class[^>]*dark)/i);
  });

  it('CTA copy does NOT use legacy mixed-case "Register your agent — join the network"', () => {
    const src = readScrolls();
    expect(src).not.toMatch(/Register your agent — join the network/);
  });
});
