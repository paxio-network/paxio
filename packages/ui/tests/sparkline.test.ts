/**
 * Unit tests for `packages/ui/src/sparkline-utils.ts` (TD-16).
 *
 * These tests verify the pure functions used to generate sparkline paths,
 * independent of React rendering. Determinism is the key invariant —
 * without it, server-rendered HTML would diverge from client hydration.
 */
import { describe, it, expect } from 'vitest';
import { seededRandom, computeSparkline } from '../src/sparkline-utils';

describe('seededRandom', () => {
  it('is deterministic — same seed produces same sequence', () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toStrictEqual(seq2);
  });

  it('returns values in [0, 1)', () => {
    const rng = seededRandom(7);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different initial values', () => {
    const a = seededRandom(1)();
    const b = seededRandom(2)();
    const c = seededRandom(3)();
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });

  it('yields distinct consecutive values (avoids stuck states)', () => {
    const rng = seededRandom(100);
    const v1 = rng();
    const v2 = rng();
    const v3 = rng();
    expect(v1).not.toBe(v2);
    expect(v2).not.toBe(v3);
  });

  it('seed=0 still produces a valid sequence', () => {
    const rng = seededRandom(0);
    const v = rng();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

describe('computeSparkline', () => {
  it('returns a non-empty string starting with M (moveTo)', () => {
    const d = computeSparkline(42, 120, 32);
    expect(typeof d).toBe('string');
    expect(d.length).toBeGreaterThan(0);
    expect(d.startsWith('M')).toBe(true);
  });

  it('is deterministic — same args return same string', () => {
    expect(computeSparkline(42, 120, 32)).toBe(computeSparkline(42, 120, 32));
    expect(computeSparkline(99, 200, 50)).toBe(computeSparkline(99, 200, 50));
  });

  it('different seeds produce different paths', () => {
    const a = computeSparkline(1, 120, 32);
    const b = computeSparkline(2, 120, 32);
    expect(a).not.toBe(b);
  });

  it('contains 23 C (curveto) instructions for a 24-point curve', () => {
    const d = computeSparkline(42, 120, 32);
    const cCount = (d.match(/C/g) ?? []).length;
    expect(cCount).toBe(23);
  });

  it('x coordinates span [0, width]', () => {
    const width = 200;
    const d = computeSparkline(42, width, 32);
    // First point's x should be 0 (moveTo)
    expect(d.startsWith('M0.0,')).toBe(true);
    // Last C command should land near width (final point at i=23 → (23/23)*200 = 200)
    expect(d).toContain(`${width.toFixed(1)},`);
  });

  it('width/height scale produce proportional paths', () => {
    // The same seed with different dimensions yields different strings.
    const small = computeSparkline(42, 60, 16);
    const large = computeSparkline(42, 120, 32);
    expect(small).not.toBe(large);
  });
});
