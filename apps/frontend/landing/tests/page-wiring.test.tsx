// @vitest-environment jsdom
/**
 * RED spec for M-L10.5 — page.tsx + layout.tsx wiring + M-L9 cleanup.
 *
 * Final phase of B5 visual port. Frontend-dev:
 *   - Refactor app/page.tsx to compose Header + PreviewRibbon + HeroB5 + ScrollsB5 + Footer
 *   - Update app/layout.tsx with body[data-production="false"][data-motion="live"]
 *     (R-FE-Preview condition #1 — visible disclosure)
 *   - DELETE 10 M-L9 section files
 *
 * Tests SACRED — only architect modifies.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

afterEach(() => cleanup());

const LANDING = resolve(__dirname, '..');

// ─────────────────────────────────────────────────────────────────────────────
// 1. layout.tsx — R-FE-Preview body attributes
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.5 layout.tsx — R-FE-Preview body attributes', () => {
  it('layout.tsx contains data-production="false" attribute', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'layout.tsx'), 'utf8');
    expect(src, 'body[data-production="false"] required per R-FE-Preview condition #1').toMatch(
      /data-production=["']false["']/,
    );
  });

  it('layout.tsx contains data-motion attribute (live | off)', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'layout.tsx'), 'utf8');
    expect(src).toMatch(/data-motion=["'](live|off)["']/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. page.tsx — composition order (Header → PreviewRibbon → main(Hero+Scrolls) → Footer)
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.5 page.tsx — B5 composition', () => {
  it('page.tsx imports Header from @paxio/ui', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'page.tsx'), 'utf8');
    expect(src).toMatch(/import\s+\{[^}]*Header[^}]*\}\s+from\s+['"]@paxio\/ui['"]/);
  });

  it('page.tsx imports Footer from @paxio/ui', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'page.tsx'), 'utf8');
    expect(src).toMatch(/import\s+\{[^}]*Footer[^}]*\}\s+from\s+['"]@paxio\/ui['"]/);
  });

  it('page.tsx imports PreviewRibbon from @paxio/ui', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'page.tsx'), 'utf8');
    expect(src).toMatch(/import\s+\{[^}]*PreviewRibbon[^}]*\}\s+from\s+['"]@paxio\/ui['"]/);
  });

  it('page.tsx imports HeroB5 from sections/01-hero-b5', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'page.tsx'), 'utf8');
    expect(src).toMatch(/01-hero-b5/);
  });

  it('page.tsx imports ScrollsB5 from sections/02-scrolls-b5', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'page.tsx'), 'utf8');
    expect(src).toMatch(/02-scrolls-b5/);
  });

  it('page.tsx renders <Header />, <PreviewRibbon />, <HeroB5 />, <ScrollsB5 />, <Footer />', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'page.tsx'), 'utf8');
    for (const tag of ['<Header', '<PreviewRibbon', '<HeroB5', '<ScrollsB5', '<Footer']) {
      expect(src, `expected ${tag}`).toContain(tag);
    }
  });

  it('page.tsx composition order: Header before PreviewRibbon before HeroB5 before ScrollsB5 before Footer', () => {
    const src = readFileSync(resolve(LANDING, 'app', 'page.tsx'), 'utf8');
    const headerIdx = src.indexOf('<Header');
    const ribbonIdx = src.indexOf('<PreviewRibbon');
    const heroIdx = src.indexOf('<HeroB5');
    const scrollsIdx = src.indexOf('<ScrollsB5');
    const footerIdx = src.indexOf('<Footer');
    expect(headerIdx).toBeGreaterThan(0);
    expect(ribbonIdx).toBeGreaterThan(headerIdx);
    expect(heroIdx).toBeGreaterThan(ribbonIdx);
    expect(scrollsIdx).toBeGreaterThan(heroIdx);
    expect(footerIdx).toBeGreaterThan(scrollsIdx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. M-L9 sections deleted
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.5 M-L9 cleanup — 10 deprecated section files removed', () => {
  const M_L9_FILES = [
    '00-header.tsx',
    '01-hero.tsx',
    '02-quickstart.tsx',
    '02b-bitcoin.tsx',
    '03-radar.tsx',
    '04-pay.tsx',
    '05-network.tsx',
    '06-doors.tsx',
    '07-foot.tsx',
    'preview-ribbon.tsx',
  ] as const;

  for (const file of M_L9_FILES) {
    it(`apps/frontend/landing/app/sections/${file} DELETED (M-L9 era, replaced by HeroB5/ScrollsB5/PreviewRibbon)`, () => {
      const path = resolve(LANDING, 'app', 'sections', file);
      expect(
        existsSync(path),
        `${file} must be deleted — M-L9 sections replaced by B5 components`,
      ).toBe(false);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. B5 sections present (positive check)
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.5 B5 sections in place', () => {
  for (const file of ['01-hero-b5.tsx', '02-scrolls-b5.tsx']) {
    it(`apps/frontend/landing/app/sections/${file} exists`, () => {
      const path = resolve(LANDING, 'app', 'sections', file);
      expect(existsSync(path), `${file} missing`).toBe(true);
    });
  }
});
