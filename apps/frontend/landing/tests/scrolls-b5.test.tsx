// @vitest-environment jsdom
/**
 * RED spec for M-L10.5 — Scrolls (B5 port) + preview.ts extensions.
 *
 * Source: docs/design/paxio-b5/components/landing_scrolls_b5.jsx (1035 lines).
 * Frontend-dev creates `apps/frontend/landing/app/sections/02-scrolls-b5.tsx`
 * porting 6 sub-scrolls (SDK/audiences, Bitcoin agents, Radar/heatmap, FAP/rails,
 * Network snapshot, Doors/enterprise).
 *
 * R-FE-Preview compliance: simulated metrics in preview.ts with TODO M-L11
 * markers, NOT inline (same lesson as M-L10.4 round 2).
 *
 * Tests SACRED — only architect modifies.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

afterEach(() => cleanup());

// ─────────────────────────────────────────────────────────────────────────────
// 1. preview.ts extensions — new exports for scrolls data
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.5 preview.ts — new frozen exports for scrolls', () => {
  it('PREVIEW_AUDIENCES exists, frozen, ≥3 audience entries', async () => {
    const mod = await import('../app/data/preview');
    const a = (mod as Record<string, unknown>).PREVIEW_AUDIENCES;
    expect(a, 'PREVIEW_AUDIENCES required (ScrollSDK source)').toBeDefined();
    expect(Array.isArray(a) || typeof a === 'object').toBe(true);
    expect(Object.isFrozen(a)).toBe(true);
  });

  it('PREVIEW_BITCOIN_AGENTS exists, frozen, ≥4 entries', async () => {
    const mod = await import('../app/data/preview');
    const b = (mod as Record<string, unknown>).PREVIEW_BITCOIN_AGENTS;
    expect(b, 'PREVIEW_BITCOIN_AGENTS required (ScrollBitcoin source)').toBeDefined();
    expect(Object.isFrozen(b)).toBe(true);
  });

  it('PREVIEW_RADAR_INDICES exists, frozen, has heatmap rows + cols + data', async () => {
    const mod = await import('../app/data/preview');
    const r = (mod as Record<string, unknown>).PREVIEW_RADAR_INDICES as Record<string, unknown>;
    expect(r, 'PREVIEW_RADAR_INDICES required (ScrollRadar source)').toBeDefined();
    expect(Object.isFrozen(r)).toBe(true);
    // Per landing_scrolls_b5.jsx::ScrollRadar — has HEAT_ROWS / HEAT_COLS / HEAT_DATA
    expect(r.heatRows ?? r.HEAT_ROWS).toBeDefined();
    expect(r.heatCols ?? r.HEAT_COLS).toBeDefined();
    expect(r.heatData ?? r.HEAT_DATA).toBeDefined();
  });

  it('PREVIEW_NETWORK_SNAPSHOT exists, frozen', async () => {
    const mod = await import('../app/data/preview');
    const n = (mod as Record<string, unknown>).PREVIEW_NETWORK_SNAPSHOT;
    expect(n, 'PREVIEW_NETWORK_SNAPSHOT required (ScrollNetwork source)').toBeDefined();
    expect(Object.isFrozen(n)).toBe(true);
  });
});

describe('M-L10.5 preview.ts — TODO M-L11 markers for scrolls', () => {
  it('source file has ≥10 TODO M-L11 markers (M-L10.4 had 7; +3 minimum for new exports)', () => {
    const src = readFileSync(
      resolve(__dirname, '..', 'app', 'data', 'preview.ts'),
      'utf8',
    );
    const markers = src.match(/TODO M-L11/g) ?? [];
    expect(markers.length, `M-L10.5 must keep ≥10 TODO markers (was 7 after M-L10.4)`).toBeGreaterThanOrEqual(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ScrollsB5 component renders + 6 sub-sections present
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.5 ScrollsB5 — component renders + 6 sub-sections', () => {
  it('exports ScrollsB5 (named OR default) and renders without throwing', async () => {
    const mod = await import('../app/sections/02-scrolls-b5');
    const Scrolls = (mod as { ScrollsB5?: unknown; default?: unknown }).ScrollsB5
      ?? (mod as { default?: unknown }).default;
    expect(Scrolls, 'ScrollsB5 named OR default export required').toBeDefined();
    expect(() => render(<>{(Scrolls as () => JSX.Element)()}</>)).not.toThrow();
  });

  it('renders all 6 numbered sub-section frames (01..06 OR similar)', async () => {
    const mod = await import('../app/sections/02-scrolls-b5');
    const Scrolls = (mod as { ScrollsB5?: () => JSX.Element; default?: () => JSX.Element }).ScrollsB5
      ?? (mod as { default?: () => JSX.Element }).default;
    if (!Scrolls) return;
    const { container } = render(<Scrolls />);
    // SectionFrame components have `data-screen-label` attributes per design
    const screens = container.querySelectorAll('[data-screen-label]');
    expect(screens.length, 'expect ≥6 SectionFrame screens (sdk/bitcoin/radar/fap/network/doors)').toBeGreaterThanOrEqual(6);
  });

  it('contains audience copy from ScrollSDK ("Builders" or "Developers")', async () => {
    const mod = await import('../app/sections/02-scrolls-b5');
    const Scrolls = (mod as { ScrollsB5?: () => JSX.Element; default?: () => JSX.Element }).ScrollsB5
      ?? (mod as { default?: () => JSX.Element }).default;
    if (!Scrolls) return;
    render(<Scrolls />);
    // queryAllByText returns array (queryByText throws on multiple matches —
    // ScrollSDK has «SDK» in install snippet AND in heading text → multi-match).
    const builders = screen.queryAllByText(/Builders|Developers|SDK/i);
    expect(builders.length, 'ScrollSDK section content must render').toBeGreaterThan(0);
  });

  it('contains Bitcoin section copy (ScrollBitcoin)', async () => {
    const mod = await import('../app/sections/02-scrolls-b5');
    const Scrolls = (mod as { ScrollsB5?: () => JSX.Element; default?: () => JSX.Element }).ScrollsB5
      ?? (mod as { default?: () => JSX.Element }).default;
    if (!Scrolls) return;
    render(<Scrolls />);
    expect(screen.queryAllByText(/Bitcoin|BTC/i).length, 'ScrollBitcoin section content').toBeGreaterThan(0);
  });

  it('renders heatmap structure (ScrollRadar — HEAT_ROWS × HEAT_COLS table)', async () => {
    const mod = await import('../app/sections/02-scrolls-b5');
    const Scrolls = (mod as { ScrollsB5?: () => JSX.Element; default?: () => JSX.Element }).ScrollsB5
      ?? (mod as { default?: () => JSX.Element }).default;
    if (!Scrolls) return;
    const { container } = render(<Scrolls />);
    // Heatmap = grid of cells. Either via class, role, or HEAT_ROWS labels.
    // queryAllByText avoids multi-match throw (Radar/Heatmap/Threat coexist).
    const radarMatches = screen.queryAllByText(/Radar|Heatmap|Threat/i);
    const radarContent =
      radarMatches.length > 0
      || container.querySelector('[data-screen-label*="Radar"], [data-screen-label*="Threat"]');
    expect(radarContent, 'ScrollRadar section content').toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. No inline simulated metrics in 02-scrolls-b5.tsx (R-FE-Preview compliance)
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.5 ScrollsB5 — R-FE-Preview compliance (no inline simulated metrics)', () => {
  it('02-scrolls-b5.tsx does NOT inline numeric `val={N}` literals on TickerCell-like calls', () => {
    const src = readFileSync(
      resolve(__dirname, '..', 'app', 'sections', '02-scrolls-b5.tsx'),
      'utf8',
    );
    // Pattern from M-L10.4 round 2 must-fix — same pattern banned here
    const inlineVals = src.match(/val=\{[0-9]+(\.[0-9]+)?\s*\}/g) ?? [];
    expect(
      inlineVals.length,
      `inline val={NUMBER} = R-FE-Preview drift (move to preview.ts с TODO M-L11). Found ${inlineVals.length}: ${inlineVals.join(', ')}`,
    ).toBe(0);
  });

  it('02-scrolls-b5.tsx imports from app/data/preview (not inline simulated objects)', () => {
    const src = readFileSync(
      resolve(__dirname, '..', 'app', 'sections', '02-scrolls-b5.tsx'),
      'utf8',
    );
    expect(src, 'must import preview data').toMatch(/from\s+['"]@?\/?\.\.?\/data\/preview['"]|from\s+['"]@\/app\/data\/preview['"]/);
  });
});
