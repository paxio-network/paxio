'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';
import { NetworkGraph } from '@paxio/ui';
import type { NetworkSnapshot } from '@paxio/types';
import { SectionFrame } from '@paxio/ui';

// Deterministic fallback — no Math.random() (verify script requirement)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function emptySnapshot(): NetworkSnapshot {
  const rng = seededRandom(42);
  const nodes = Array.from({ length: 20 }, (_, i) => ({
    id: `n${i}`,
    name: `Agent-${String(i + 1).padStart(2, '0')}`,
    x_pct: rng() * 100,
    y_pct: rng() * 100,
    volume_usd_5m: Math.floor(rng() * 1000),
    bitcoin_native: i < 3,
  }));
  return {
    nodes,
    pairs: [],
    generated_at: new Date().toISOString(),
  };
}

export function Network() {
  const { data } = useQuery({
    queryKey: ['landing-network'],
    queryFn: () => paxioClient.landing.getNetworkSnapshot(),
    refetchInterval: 3_000,
    staleTime: 2_000,
  });

  const snapshot = data ?? emptySnapshot();

  return (
    <SectionFrame id="network" eyebrow="Trust Layer" dark>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-3 text-white">Agent Network — Live</h2>
          <p className="text-white/50">Top agents by 5m volume · connections via shared rails</p>
        </div>
        <NetworkGraph snapshot={snapshot} className="mb-4" />
        <p className="text-center text-xs font-mono text-white/20">
          Gold nodes = Bitcoin-native · Node size ∝ 5m volume
        </p>
      </div>
    </SectionFrame>
  );
}