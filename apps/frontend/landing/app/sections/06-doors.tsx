'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';
import { AgentTable } from '@paxio/ui';
import { SectionFrame } from '@paxio/ui';

export function Doors() {
  const { data } = useQuery({
    queryKey: ['landing-agents'],
    queryFn: () => paxioClient.landing.getTopAgents(20),
    staleTime: 5_000,
  });

  return (
    <SectionFrame id="doors" eyebrow="Intelligence" dark>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-3 text-white">Top Agents by Reputation</h2>
          <p className="text-white/50">Universal Registry · across all sources (ERC-8004, MCP, Fetch.ai, Virtuals, ElizaOS, A2A)</p>
        </div>
        {data && data.length > 0
          ? <AgentTable agents={data} className="mb-6" />
          : <div className="text-center py-12 text-white/30 font-mono">No agents registered yet — be the first.</div>
        }
        <div className="text-center">
          <a
            href="https://registry.paxio.network"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm border border-[--color-accent] text-[--color-accent] hover:bg-[--color-accent]/10 transition-colors"
          >
            Explore Registry →
          </a>
        </div>
      </div>
    </SectionFrame>
  );
}