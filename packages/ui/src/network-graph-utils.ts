/**
 * Pure projections extracted from NetworkGraph.tsx (TD-16).
 *
 * Both functions are deterministic and tested in
 * packages/ui/tests/network-graph.test.ts.
 */

/**
 * Subset of NetworkNode fields needed by `nodeColor`.
 * Kept local so these utils don't depend on @paxio/types at runtime
 * (the types package carries Zod schemas + is zero-runtime for TS consumers,
 * but avoiding the import here keeps the unit test surface minimal).
 */
interface NodeColorInput {
  bitcoin_native: boolean;
  volume_usd_5m: number;
}

interface NodeRadiusInput {
  volume_usd_5m: number;
}

/**
 * Color for an agent node in the network graph.
 *  - Bitcoin-native agents → brand gold `#D97706` (Bitcoin orange).
 *  - Other agents → `rgb(r, g, b)` with r scaling by volume (cap 200/100/80).
 *    Low-volume agents look cool/dark; higher-volume agents tint warm/red.
 */
export function nodeColor(node: NodeColorInput): string {
  if (node.bitcoin_native) return '#D97706';
  const r = Math.round((node.volume_usd_5m / 10_000) * 255);
  return `rgb(${Math.min(r, 200)}, ${Math.min(100, r / 2)}, ${Math.min(80, r / 4)})`;
}

/**
 * Radius for an agent node in the network graph.
 * Bounded in `[4, 12]` pixels. Log-scaled so high-volume outliers don't
 * dominate the graph.
 */
export function nodeRadius(node: NodeRadiusInput): number {
  return Math.max(4, Math.min(12, 4 + Math.log10(node.volume_usd_5m + 1)));
}
