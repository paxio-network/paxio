'use client';

interface EmptyGraphProps {
  className?: string;
}

/**
 * Empty-state placeholder for the agent network graph (TD-12 Real Data Invariant —
 * no seeded-random fake nodes). Shown while `paxioClient.landing.getNetworkSnapshot()`
 * is pending or returns `{nodes: [], pairs: []}`.
 */
export function EmptyGraph({ className }: EmptyGraphProps) {
  return (
    <div className={`relative ${className ?? ''}`} aria-busy="true" aria-label="Loading agent network">
      <div
        className="w-full rounded-lg bg-black/40 border border-white/10 flex items-center justify-center"
        style={{ aspectRatio: '2 / 1', minHeight: '200px' }}
      >
        <p className="text-sm font-mono text-white/30">No agent activity yet</p>
      </div>
      <p className="text-xs font-mono text-white/20 text-center mt-2">
        Agents will appear here as they come online
      </p>
    </div>
  );
}
