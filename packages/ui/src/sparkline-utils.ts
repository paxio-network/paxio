/**
 * Pure functions extracted from Sparkline.tsx (TD-16).
 *
 * Both functions are deterministic (same seed → same output), free of any
 * I/O or framework coupling, and tested in packages/ui/tests/sparkline.test.ts.
 *
 * NO Math.random() — rendering uses seeded LCG PRNG so SSR + hydration
 * produce identical paths.
 */

/**
 * Linear-congruential PRNG keyed by `seed`.
 * Constants from Numerical Recipes (`glibc` variant):
 *   s = (s * 1664525 + 1013904223) mod 2^32
 * Returns a function that yields the next float in [0, 1) each call.
 */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Build an SVG `d` path string for a 24-point cubic-Bezier curve sparkline.
 *
 * Points are placed evenly along the x-axis; y-coordinate is derived from
 * `seededRandom(seed)` so the curve is stable across renders.
 *
 * The resulting path always starts with an `M` (moveTo) instruction and
 * contains 23 `C` (curveto) instructions — one per segment.
 *
 * @param seed   — PRNG seed; distinct seeds produce distinct curves.
 * @param width  — SVG width in user units.
 * @param height — SVG height in user units.
 */
export function computeSparkline(seed: number, width: number, height: number): string {
  const rand = seededRandom(seed);
  const pts: [number, number][] = Array.from({ length: 24 }, (_, i) => [
    (i / 23) * width,
    height - rand() * height * 0.7 - height * 0.15,
  ]);

  return pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
    const [px, py] = pts[i - 1];
    const cpX = (px + x) / 2;
    return `${acc} C${cpX.toFixed(1)},${py.toFixed(1)} ${cpX.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
  }, '');
}
