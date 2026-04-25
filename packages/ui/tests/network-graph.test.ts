/**
 * Unit tests for `packages/ui/src/network-graph-utils.ts` (TD-16).
 *
 * Deterministic visual projections: bitcoin-native → gold, volume → radius.
 */
import { describe, it, expect } from 'vitest';
import { nodeColor, nodeRadius } from '../src/network-graph-utils';

describe('nodeColor', () => {
  it('returns Bitcoin gold (#D97706) when bitcoin_native is true, regardless of volume', () => {
    expect(nodeColor({ bitcoin_native: true, volume_usd_5m: 0 })).toBe('#D97706');
    expect(nodeColor({ bitcoin_native: true, volume_usd_5m: 5_000 })).toBe('#D97706');
    expect(nodeColor({ bitcoin_native: true, volume_usd_5m: 999_999 })).toBe('#D97706');
  });

  it('returns an rgb(...) string for non-bitcoin-native nodes', () => {
    const c = nodeColor({ bitcoin_native: false, volume_usd_5m: 5_000 });
    expect(c).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
  });

  it('caps channel values (r ≤ 200, g ≤ 100, b ≤ 80) even at huge volumes', () => {
    const c = nodeColor({ bitcoin_native: false, volume_usd_5m: 1e12 });
    const match = c.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    expect(match).not.toBeNull();
    const [, r, g, b] = match!;
    expect(Number(r)).toBeLessThanOrEqual(200);
    expect(Number(g)).toBeLessThanOrEqual(100);
    expect(Number(b)).toBeLessThanOrEqual(80);
  });

  it('is deterministic — same input → same color', () => {
    const a = nodeColor({ bitcoin_native: false, volume_usd_5m: 1_234 });
    const b = nodeColor({ bitcoin_native: false, volume_usd_5m: 1_234 });
    expect(a).toBe(b);
  });
});

describe('nodeRadius', () => {
  it('returns 4 when volume is 0 (lower bound)', () => {
    expect(nodeRadius({ volume_usd_5m: 0 })).toBe(4);
  });

  it('is bounded in [4, 12]', () => {
    const samples = [0, 1, 10, 100, 1_000, 10_000, 100_000, 1e9, 1e12];
    for (const v of samples) {
      const r = nodeRadius({ volume_usd_5m: v });
      expect(r).toBeGreaterThanOrEqual(4);
      expect(r).toBeLessThanOrEqual(12);
    }
  });

  it('is deterministic — same input → same radius', () => {
    expect(nodeRadius({ volume_usd_5m: 1_234 })).toBe(nodeRadius({ volume_usd_5m: 1_234 }));
  });

  it('is monotonic non-decreasing in volume', () => {
    const volumes = [0, 10, 100, 1_000, 10_000, 100_000, 1_000_000];
    const radii = volumes.map((v) => nodeRadius({ volume_usd_5m: v }));
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]).toBeGreaterThanOrEqual(radii[i - 1]);
    }
  });

  it('scales logarithmically (difference shrinks as volume grows)', () => {
    // 100 → 1000 should add ~1 radius unit (log10 difference); same for 1M → 10M.
    const r1 = nodeRadius({ volume_usd_5m: 100 });
    const r2 = nodeRadius({ volume_usd_5m: 1_000 });
    const diff = r2 - r1;
    expect(diff).toBeGreaterThan(0);
    expect(diff).toBeLessThan(2); // not linear
  });
});
