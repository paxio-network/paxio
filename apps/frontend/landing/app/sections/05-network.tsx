'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';
import { NetworkGraph, EmptyGraph, SectionFrame } from '@paxio/ui';

export function Network() {
  const { data } = useQuery({
    queryKey: ['landing-network'],
    queryFn: () => paxioClient.landing.getNetworkSnapshot(),
    refetchInterval: 3_000,
    staleTime: 2_000,
  });

  return (
    <SectionFrame id="network" eyebrow="Trust Layer" dark>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-3 text-white">Agent Network — Live</h2>
          <p className="text-white/50">Top agents by 5m volume · connections via shared rails</p>
        </div>
        {data && data.nodes.length > 0 ? (
          <>
            <NetworkGraph snapshot={data} className="mb-4" />
            <p className="text-center text-xs font-mono text-white/20">
              Gold nodes = Bitcoin-native · Node size ∝ 5m volume
            </p>
          </>
        ) : (
          <EmptyGraph className="mb-4" />
        )}
      </div>
    </SectionFrame>
  );
}
