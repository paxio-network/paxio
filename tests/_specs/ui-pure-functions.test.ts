/**
 * TD-16 RED spec — `@paxio/ui` pure functions MUST be extracted + tested.
 *
 * Commit bf8176f (M01c Landing) added 8 React components in packages/ui/src/.
 * Two of them contain pure functions that engineering-principles §6 +
 * workflow.md "TEST-FIRST" require to have unit tests:
 *
 *   1. Sparkline::seededRandom (LCG PRNG, seed → next()) + `computeSparkline`
 *      path string generation. M01c spec task #6 explicitly said:
 *        "Pure `computeSparkline(seed:number):string` outside component;
 *         component thin."
 *      The factored function was never extracted — it lives inside Sparkline.tsx.
 *
 *   2. NetworkGraph::nodeColor + nodeRadius — pure projections
 *      NetworkNode → SVG attributes. Both deterministic, both private.
 *
 * Compound TD: with TD-12 (hardcoded fallback data in landing sections),
 * TD-16 shows M01c frontend bypassed TDD pipeline — no tests for pure logic
 * that guides visual output.
 *
 * Fix (frontend-dev):
 *   - Extract pure fns into packages/ui/src/sparkline-utils.ts +
 *     packages/ui/src/network-graph-utils.ts.
 *   - Components import + compose; stay thin.
 *   - Add packages/ui/tests/sparkline.test.ts + network-graph.test.ts
 *     with determinism + bounds assertions.
 *
 * This spec goes GREEN when the utils files exist and exports behave
 * as described.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const UI_SRC = join(process.cwd(), 'packages/ui/src');
const SPARKLINE_UTILS = join(UI_SRC, 'sparkline-utils.ts');
const NETWORK_GRAPH_UTILS = join(UI_SRC, 'network-graph-utils.ts');

describe('TD-16 — @paxio/ui pure fns extracted + behave correctly', () => {
  describe('packages/ui/src/sparkline-utils.ts', () => {
    it('file exists (extracted from Sparkline.tsx)', () => {
      expect(existsSync(SPARKLINE_UTILS)).toBe(true);
    });

    it('exports seededRandom(seed) — deterministic LCG', async () => {
      if (!existsSync(SPARKLINE_UTILS)) return; // skip body if missing
      const mod: { seededRandom?: (seed: number) => () => number } = await import(
        /* @vite-ignore */ SPARKLINE_UTILS
      );
      expect(typeof mod.seededRandom).toBe('function');
      if (!mod.seededRandom) return;

      const rng1 = mod.seededRandom(42);
      const rng2 = mod.seededRandom(42);
      const seq1 = [rng1(), rng1(), rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2(), rng2(), rng2()];
      expect(seq1).toStrictEqual(seq2);
    });

    it('seededRandom values are in [0, 1)', async () => {
      if (!existsSync(SPARKLINE_UTILS)) return;
      const mod: { seededRandom?: (seed: number) => () => number } = await import(
        /* @vite-ignore */ SPARKLINE_UTILS
      );
      if (!mod.seededRandom) return;
      const rng = mod.seededRandom(7);
      for (let i = 0; i < 100; i++) {
        const v = rng();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('different seeds produce different sequences', async () => {
      if (!existsSync(SPARKLINE_UTILS)) return;
      const mod: { seededRandom?: (seed: number) => () => number } = await import(
        /* @vite-ignore */ SPARKLINE_UTILS
      );
      if (!mod.seededRandom) return;
      const a = mod.seededRandom(1)();
      const b = mod.seededRandom(2)();
      expect(a).not.toBe(b);
    });

    it('exports computeSparkline(seed, width, height) → SVG `d` path string', async () => {
      if (!existsSync(SPARKLINE_UTILS)) return;
      const mod: {
        computeSparkline?: (seed: number, width: number, height: number) => string;
      } = await import(/* @vite-ignore */ SPARKLINE_UTILS);
      expect(typeof mod.computeSparkline).toBe('function');
      if (!mod.computeSparkline) return;

      const d = mod.computeSparkline(42, 120, 32);
      expect(typeof d).toBe('string');
      expect(d.length).toBeGreaterThan(0);
      // First instruction of an SVG path is always `M` (moveTo).
      expect(d.startsWith('M')).toBe(true);
    });

    it('computeSparkline is deterministic (same args → same string)', async () => {
      if (!existsSync(SPARKLINE_UTILS)) return;
      const mod: {
        computeSparkline?: (seed: number, width: number, height: number) => string;
      } = await import(/* @vite-ignore */ SPARKLINE_UTILS);
      if (!mod.computeSparkline) return;

      expect(mod.computeSparkline(42, 120, 32)).toBe(
        mod.computeSparkline(42, 120, 32),
      );
    });
  });

  describe('packages/ui/src/network-graph-utils.ts', () => {
    it('file exists (extracted from NetworkGraph.tsx)', () => {
      expect(existsSync(NETWORK_GRAPH_UTILS)).toBe(true);
    });

    it('exports nodeColor(node) — returns bitcoin-orange for bitcoin_native', async () => {
      if (!existsSync(NETWORK_GRAPH_UTILS)) return;
      const mod: {
        nodeColor?: (n: { bitcoin_native: boolean; volume_usd_5m: number }) => string;
      } = await import(/* @vite-ignore */ NETWORK_GRAPH_UTILS);
      expect(typeof mod.nodeColor).toBe('function');
      if (!mod.nodeColor) return;

      expect(
        mod.nodeColor({ bitcoin_native: true, volume_usd_5m: 0 }),
      ).toBe('#D97706');
      expect(
        mod.nodeColor({ bitcoin_native: true, volume_usd_5m: 999999 }),
      ).toBe('#D97706');
    });

    it('nodeColor non-bitcoin returns an rgb(...) string', async () => {
      if (!existsSync(NETWORK_GRAPH_UTILS)) return;
      const mod: {
        nodeColor?: (n: { bitcoin_native: boolean; volume_usd_5m: number }) => string;
      } = await import(/* @vite-ignore */ NETWORK_GRAPH_UTILS);
      if (!mod.nodeColor) return;

      const c = mod.nodeColor({ bitcoin_native: false, volume_usd_5m: 5000 });
      expect(c).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    it('exports nodeRadius(node) — bounded in [4, 12]', async () => {
      if (!existsSync(NETWORK_GRAPH_UTILS)) return;
      const mod: {
        nodeRadius?: (n: { volume_usd_5m: number }) => number;
      } = await import(/* @vite-ignore */ NETWORK_GRAPH_UTILS);
      expect(typeof mod.nodeRadius).toBe('function');
      if (!mod.nodeRadius) return;

      expect(mod.nodeRadius({ volume_usd_5m: 0 })).toBe(4);
      expect(mod.nodeRadius({ volume_usd_5m: 1e9 })).toBeLessThanOrEqual(12);
      expect(mod.nodeRadius({ volume_usd_5m: 1e9 })).toBeGreaterThanOrEqual(4);
    });

    it('nodeRadius is deterministic', async () => {
      if (!existsSync(NETWORK_GRAPH_UTILS)) return;
      const mod: { nodeRadius?: (n: { volume_usd_5m: number }) => number } =
        await import(/* @vite-ignore */ NETWORK_GRAPH_UTILS);
      if (!mod.nodeRadius) return;
      expect(mod.nodeRadius({ volume_usd_5m: 1234 })).toBe(
        mod.nodeRadius({ volume_usd_5m: 1234 }),
      );
    });

    it('nodeRadius is monotonic non-decreasing in volume', async () => {
      if (!existsSync(NETWORK_GRAPH_UTILS)) return;
      const mod: { nodeRadius?: (n: { volume_usd_5m: number }) => number } =
        await import(/* @vite-ignore */ NETWORK_GRAPH_UTILS);
      if (!mod.nodeRadius) return;
      const r1 = mod.nodeRadius({ volume_usd_5m: 10 });
      const r2 = mod.nodeRadius({ volume_usd_5m: 1_000_000 });
      expect(r2).toBeGreaterThanOrEqual(r1);
    });
  });

  describe('packages/ui/tests/ — dev writes real unit tests here', () => {
    it('packages/ui/tests/sparkline.test.ts exists', () => {
      expect(
        existsSync(join(process.cwd(), 'packages/ui/tests/sparkline.test.ts')),
      ).toBe(true);
    });

    it('packages/ui/tests/network-graph.test.ts exists', () => {
      expect(
        existsSync(
          join(process.cwd(), 'packages/ui/tests/network-graph.test.ts'),
        ),
      ).toBe(true);
    });
  });
});
