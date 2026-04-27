// M-L10 Phase 1 T-2 — Drift-guard for the foundation pieces of B5 landing port:
//
//   T-0: vendored design package в docs/design/paxio-b5/
//   T-1: R-FE-Preview rule в .claude/rules/frontend-rules.md
//
// These pin architect-zone artefacts that frontend-dev will reference during
// the Phase 2-5 port. Future phases (port impl) get their own architect-written
// drift-guards at the time of each phase milestone.
//
// Pre-Phase 1: tests RED (files don't exist or rule missing).
// Post-Phase 1: tests GREEN.

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = (...parts: string[]) => resolve(__dirname, '..', ...parts);

// ---------------------------------------------------------------------------
// T-0: Vendored design package
// ---------------------------------------------------------------------------

describe('M-L10 T-0 — design package vendored to docs/design/paxio-b5/', () => {
  it('_design/ folder exists', () => {
    expect(() =>
      statSync(root('docs/design/paxio-b5')),
    ).not.toThrow();
  });

  it('_design/README.md explains usage rules', () => {
    const readme = readFileSync(
      root('docs/design/paxio-b5/README.md'),
      'utf8',
    );
    // Must explicitly forbid imports from _design/
    expect(readme).toMatch(/NOT for production|read-only/i);
    expect(readme).toMatch(/_design\//);
  });

  it('SOURCE_README.md preserves original handoff instructions', () => {
    const src = readFileSync(
      root('docs/design/paxio-b5/SOURCE_README.md'),
      'utf8',
    );
    expect(src).toMatch(/CODING AGENTS|Claude Design|handoff bundle/i);
  });

  it('Paxio-B5.html (entry point) vendored', () => {
    expect(() =>
      statSync(root('docs/design/paxio-b5/Paxio-B5.html')),
    ).not.toThrow();
    const html = readFileSync(
      root('docs/design/paxio-b5/Paxio-B5.html'),
      'utf8',
    );
    expect(html).toMatch(/HeroVariantB5/);
    expect(html).toMatch(/PaxioLandingScrollsB5/);
    expect(html).toMatch(/preview-ribbon/);
    expect(html).toMatch(/data-production="true"|data-production="false"/);
  });

  it('Hero + Scrolls JSX vendored', () => {
    expect(() =>
      statSync(
        root('docs/design/paxio-b5/components/v_hero_b5.jsx'),
      ),
    ).not.toThrow();
    expect(() =>
      statSync(
        root('docs/design/paxio-b5/components/landing_scrolls_b5.jsx'),
      ),
    ).not.toThrow();
  });

  it('all 5 stylesheets + paxio_mark.svg vendored', () => {
    const styles = [
      'paxio.css',
      'hero_variants.css',
      'landing_scrolls.css',
      'paxio_b3_page.css',
      'paxio_b5_fixes.css',
      'paxio_mark.svg',
    ];
    for (const s of styles) {
      expect(() =>
        statSync(root('docs/design/paxio-b5/styles', s)),
      ).not.toThrow();
    }
  });

  it('vendor lives in docs/, not apps/ (architect zone, no scope conflict)', () => {
    // Negative check: confirm absence of earlier-draft apps/frontend/landing/_design/
    const stalePath = root('apps/frontend/landing/_design');
    let exists = true;
    try {
      statSync(stalePath);
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-1: R-FE-Preview rule в frontend-rules.md
// ---------------------------------------------------------------------------

describe('M-L10 T-1 — R-FE-Preview rule в frontend-rules.md', () => {
  const readRules = () =>
    readFileSync(root('.claude/rules/frontend-rules.md'), 'utf8');

  it('has R-FE-Preview section header', () => {
    const content = readRules();
    expect(content).toMatch(/##\s+R-FE-Preview\s+[—\-]/);
  });

  it('mentions all 4 mandatory conditions for the exception', () => {
    const content = readRules();
    // Condition 1: data-production="false" attr
    expect(content).toMatch(/data-production="false"/);
    // Condition 2: PreviewRibbon visible
    expect(content).toMatch(/PreviewRibbon/);
    // Condition 3: app/data/preview.ts isolation
    expect(content).toMatch(/app\/data\/preview\.ts/);
    // Condition 4: drift-guard test required
    expect(content).toMatch(/drift-guard|drift guard/i);
  });

  it('lists what is STILL forbidden under exception (auth, money, forms)', () => {
    const content = readRules();
    // The forbidden list MUST mention these classes
    expect(content).toMatch(/auth flow|login|signup/i);
    expect(content).toMatch(/money|BTC|payment/i);
    expect(content).toMatch(/form submission|form submit/i);
  });

  it('describes migration path к real data (TODO marker → real API)', () => {
    const content = readRules();
    expect(content).toMatch(/TODO M-L\d+|TODO marker/);
    expect(content).toMatch(/migration path|migration/i);
  });

  it('shows drift-guard pattern example для frontend impl', () => {
    const content = readRules();
    // Pattern example must appear (code block with readFileSync + data-production="false" assertion)
    expect(content).toMatch(/readFileSync/);
    expect(content).toMatch(/expect\(.*\)\.toMatch\(.*data-production="false"/);
  });

  it('marks severity P1', () => {
    const content = readRules();
    // Must be P1 (P0 is too strict for a rule that says "OK to use Math.random under conditions")
    expect(content).toMatch(/Severity:\s*P1/);
  });
});

// ---------------------------------------------------------------------------
// Phase 2-5 stubs (will be implemented by architect when each phase lands).
// Marked describe.skip so they document intent without failing Phase 1 build.
// Frontend-dev does NOT implement these tests — architect writes them at each
// phase milestone.
// ---------------------------------------------------------------------------

describe.skip('M-L10 Phase 2-5 — TODO markers (impl awaits phase milestones)', () => {
  it.todo('Phase 2: app/globals.css has paxio paper/ink/gold tokens ported from _design/styles/paxio.css');
  it.todo('Phase 3: @paxio/ui exports Header + Footer + PreviewRibbon + ThemeToggle');
  it.todo('Phase 4: app/sections/01-hero-b5.tsx renders + uses PREVIEW_AGENTS from app/data/preview.ts');
  it.todo('Phase 5: app/sections/02-scrolls-b5.tsx ported + page.tsx wires Hero+Scrolls+Footer');
  it.todo('Final: app/layout.tsx body has data-production="false" + PreviewRibbon visible + 16 TODO markers in preview.ts');
});
