'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';
import { ConditionalSection, EmptyGraph, NetworkGraph, SectionFrame } from '@paxio/ui';

export function Network() {
  const { data, isPending } = useQuery({
    queryKey: ['landing-network'],
    queryFn: () => paxioClient.landing.getNetworkSnapshot(),
    refetchInterval: 3_000,
    staleTime: 2_000,
  });

  // While loading, show the empty-graph placeholder (it doubles as a
  // "no agents yet" affordance). Once data arrives, use ConditionalSection to
  // gate on real nodes — same pattern as 04-pay so reviewers see one shape.
  const hasAgents = !!data && data.nodes.length > 0;

  return (
    <SectionFrame id="network" eyebrow="Trust Layer" dark>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-3 text-white">Agent Network — Live</h2>
          <p className="text-white/50">Top agents by 5m volume · connections via shared rails</p>
        </div>
        {isPending || data === undefined ? (
          <EmptyGraph className="mb-4" />
        ) : (
          <ConditionalSection show={hasAgents} fallback={<EmptyGraph className="mb-4" />}>
            <NetworkGraph snapshot={data} className="mb-4" />
            <p className="text-center text-xs font-mono text-white/20">
              Gold nodes = Bitcoin-native · Node size ∝ 5m volume
            </p>
          </ConditionalSection>
        )}
      </div>
    </SectionFrame>
  );
}
