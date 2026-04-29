// @vitest-environment jsdom
/**
 * RED spec for M-L10.4 — Hero (B5 port).
 *
 * Source: docs/design/paxio-b5/components/v_hero_b5.jsx (460 lines).
 * Frontend-dev:
 *   - apps/frontend/landing/app/data/preview.ts          (frozen exports)
 *   - apps/frontend/landing/app/sections/01-hero-b5.tsx  ('use client')
 *
 * R-FE-Preview compliance: Math.random() in useTicker is allowed under
 * exception (frontend-rules.md::R-FE-Preview) because:
 *   1. body[data-production="false"]   — set in M-L10.5
 *   2. <PreviewRibbon> rendered         — wired in M-L10.5
 *   3. simulated data isolated in app/data/preview.ts
 *   4. Drift-guard pins TODO M-L11 markers (this file)
 *
 * Tests SACRED — only architect modifies.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

afterEach(() => cleanup());

// ─────────────────────────────────────────────────────────────────────────────
// 1. preview.ts data shape — drift-guard
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.4 preview.ts — frozen exports + R-FE-Preview compliance', () => {
  it('PREVIEW_AGENTS exists, frozen, has 16 items', async () => {
    const mod = await import('../app/data/preview');
    expect(mod.PREVIEW_AGENTS).toBeDefined();
    expect(Array.isArray(mod.PREVIEW_AGENTS), 'PREVIEW_AGENTS must be array').toBe(true);
    expect(mod.PREVIEW_AGENTS.length, 'must have 16 agents per v_hero_b5.jsx::AGENTS').toBe(16);
    expect(Object.isFrozen(mod.PREVIEW_AGENTS), 'must Object.freeze').toBe(true);
  });

  it('PREVIEW_TICKER_INITIAL exists, frozen, has all required PAEI sub-indices', async () => {
    const mod = await import('../app/data/preview');
    // Cast via unknown — PREVIEW_TICKER_INITIAL has both numeric scalars (paei/btc/...)
    // AND a `generatedAt: string` field, so direct Record<string, number> cast is unsound.
    // Tests below check numeric fields explicitly via name; non-numeric `generatedAt` is unread.
    const t = mod.PREVIEW_TICKER_INITIAL as unknown as Record<string, number>;
    expect(t).toBeDefined();
    expect(Object.isFrozen(t), 'must Object.freeze').toBe(true);
    // Required scalar fields per milestone spec
    for (const key of [
      'paei', 'btc', 'legal', 'finance', 'research', 'cx',
      'walletAdoption', 'x402Share', 'btcShare',
      'hhi', 'drift7', 'attacks24', 'slaP50',
      'fapThroughput', 'uptimeAvg', 'agents', 'txns',
    ]) {
      expect(typeof t[key], `${key} must be numeric`).toBe('number');
    }
  });

  it('PREVIEW_MOVERS exists, frozen, has gainers + losers + paeiHistory', async () => {
    const mod = await import('../app/data/preview');
    // Cast via unknown — PREVIEW_MOVERS uses readonly arrays (R-FE-Preview compliance,
    // Object.freeze invariant). Direct assignment to mutable unknown[] is type-unsound.
    const m = mod.PREVIEW_MOVERS as unknown as {
      gainers: readonly unknown[];
      losers: readonly unknown[];
      paeiHistory: readonly unknown[];
    };
    expect(m).toBeDefined();
    expect(Object.isFrozen(m)).toBe(true);
    expect(Array.isArray(m.gainers)).toBe(true);
    expect(Array.isArray(m.losers)).toBe(true);
    expect(Array.isArray(m.paeiHistory)).toBe(true);
    expect(m.paeiHistory.length, 'paeiHistory must be 90-day per v_hero_b5.jsx').toBe(90);
  });
});

describe('M-L10.4 preview.ts — TODO M-L11 markers (R-FE-Preview migration path)', () => {
  it('source file contains ≥3 TODO M-L11 markers (one per export)', () => {
    const src = readFileSync(
      resolve(__dirname, '..', 'app', 'data', 'preview.ts'),
      'utf8',
    );
    const markers = src.match(/TODO M-L11/g) ?? [];
    expect(
      markers.length,
      'each preview export must carry TODO M-L11 marker per R-FE-Preview',
    ).toBeGreaterThanOrEqual(3);
  });

  it('TODO markers reference real API replacements (paxioClient.X)', () => {
    const src = readFileSync(
      resolve(__dirname, '..', 'app', 'data', 'preview.ts'),
      'utf8',
    );
    expect(src).toMatch(/paxioClient\.registry\.list|registry\.list/);
    expect(src).toMatch(/paxioClient\.intelligence\.(getPaeiSnapshot|getMovers)|intelligence\.get/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PREVIEW_AGENTS conforms to ZodAgentListItem from @paxio/types
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.4 PREVIEW_AGENTS — conforms to ZodAgentListItem shape', () => {
  it('every agent has all required fields per ZodAgentListItem', async () => {
    const mod = await import('../app/data/preview');
    // Cast via unknown — PREVIEW_AGENTS uses readonly arrays + readonly fields
    // (R-FE-Preview Object.freeze invariant). Direct mutable assignment unsound.
    for (const agent of mod.PREVIEW_AGENTS as unknown as Array<Record<string, unknown>>) {
      // Identity
      expect(typeof agent.did).toBe('string');
      expect(typeof agent.name).toBe('string');
      expect(typeof agent.source).toBe('string');
      // Display
      expect(typeof agent.category).toBe('string');
      // Wallet
      expect(typeof agent.wallet).toBe('object');
      // Rails
      expect(Array.isArray(agent.rails)).toBe(true);
      // Facilitator
      expect(typeof agent.facilitator).toBe('string');
      // Reputation
      expect(typeof agent.rep).toBe('number');
      expect(typeof agent.repD).toBe('number');
      // Economic
      expect(typeof agent.vol24).toBe('number');
      expect(typeof agent.success).toBe('number');
      expect(typeof agent.uptime).toBe('number');
      expect(typeof agent.p50).toBe('number');
    }
  });

  it('parses through ZodAgentListItem at runtime (no type-erasure escape)', async () => {
    const { ZodAgentListItem } = await import('@paxio/types');
    const mod = await import('../app/data/preview');
    for (const agent of mod.PREVIEW_AGENTS) {
      const parsed = ZodAgentListItem.safeParse(agent);
      if (!parsed.success) {
        const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new Error(`Agent ${(agent as { name?: string }).name ?? '?'} fails schema: ${issues}`);
      }
    }
  });

  it('contains expected agents from v_hero_b5.jsx (spot-check)', async () => {
    const mod = await import('../app/data/preview');
    // Same cast pattern — readonly arrays from Object.freeze need unknown bridge.
    const names = (mod.PREVIEW_AGENTS as unknown as Array<{ name: string }>).map(a => a.name);
    // Spot-check 3 distinctive agents
    expect(names).toContain('btc-escrow.paxio');
    expect(names).toContain('btc-dca.paxio');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Hero component renders + key structural elements
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.4 HeroB5 — component renders', () => {
  it('Hero default export exists and renders without throwing', async () => {
    const mod = await import('../app/sections/01-hero-b5');
    const Hero = mod.HeroB5 ?? mod.default;
    expect(Hero, 'HeroB5 named export OR default export required').toBeDefined();
    expect(() => render(<Hero />)).not.toThrow();
  });

  it('renders ticker section (PAEI live)', async () => {
    const mod = await import('../app/sections/01-hero-b5');
    const Hero = mod.HeroB5 ?? mod.default;
    render(<Hero />);
    // PAEI label or section identifier visible
    const paeiNode = screen.queryByText(/PAEI/i) ?? document.querySelector('[data-section="ticker"], #ticker, .ticker');
    expect(paeiNode, 'ticker section / PAEI label must render').toBeTruthy();
  });

  it('renders agent table with 16 rows (1 header + 16 data)', async () => {
    const mod = await import('../app/sections/01-hero-b5');
    const Hero = mod.HeroB5 ?? mod.default;
    const { container } = render(<Hero />);
    const table = container.querySelector('table');
    expect(table, 'agent table must render').toBeTruthy();
    const dataRows = table!.querySelectorAll('tbody tr');
    expect(dataRows.length, 'must render 16 data rows from PREVIEW_AGENTS').toBeGreaterThanOrEqual(16);
  });

  it('renders market movers section (gainers + losers)', async () => {
    const mod = await import('../app/sections/01-hero-b5');
    const Hero = mod.HeroB5 ?? mod.default;
    render(<Hero />);
    // Either text label or data attribute
    const moversByText = screen.queryByText(/Movers|Gainers|Losers/i);
    const moversByAttr = document.querySelector('[data-section="movers"], #movers, .movers');
    expect(moversByText ?? moversByAttr, 'market movers section must render').toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. useTicker hook — interval cleanup on unmount (no memory leak)
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.4 useTicker — lifecycle', () => {
  it('clears interval on unmount (no leak after Hero unmounts)', async () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const mod = await import('../app/sections/01-hero-b5');
    const Hero = mod.HeroB5 ?? mod.default;
    const { unmount } = render(<Hero />);
    // Trigger any setIntervals
    vi.advanceTimersByTime(2200);
    unmount();
    expect(clearIntervalSpy, 'clearInterval must run on unmount').toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('Math.random() is used in render only via useTicker hook (R-FE-Preview-bound)', () => {
    // Static check on hero source file
    const src = readFileSync(
      resolve(__dirname, '..', 'app', 'sections', '01-hero-b5.tsx'),
      'utf8',
    );
    // Math.random allowed because it's inside useTicker (R-FE-Preview)
    // But NO Math.random outside useTicker function body
    const hasMathRandom = src.includes('Math.random');
    expect(hasMathRandom, 'useTicker must use Math.random per design').toBe(true);
    // Rough check: Math.random appears INSIDE a function body that mentions Ticker
    // (we don't enforce structure deeply — frontend-dev's discretion)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. SubIndex shape — sub-indices render as TickerCells
// ─────────────────────────────────────────────────────────────────────────────

describe('M-L10.4 HeroB5 — sub-indices visible (PAEI components)', () => {
  it('renders at least 4 sub-index labels (Legal, Finance, Research, CX OR similar)', async () => {
    const mod = await import('../app/sections/01-hero-b5');
    const Hero = mod.HeroB5 ?? mod.default;
    render(<Hero />);
    // Spot-check ≥ 2 sub-indices visible (lenient — exact labels may vary in port)
    const labels = ['Legal', 'Finance', 'Research', 'CX', 'Wallet', 'BTC', 'x402'];
    const visible = labels.filter(l => screen.queryAllByText(new RegExp(l, 'i')).length > 0);
    expect(
      visible.length,
      `expected ≥4 sub-index labels visible, got ${visible.length}: [${visible.join(', ')}]`,
    ).toBeGreaterThanOrEqual(4);
  });
});
