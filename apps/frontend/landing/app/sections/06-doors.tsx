'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';
import { AgentTable } from '@paxio/ui';
import { SectionFrame } from '@paxio/ui';

function DoorCard({ title, description, cta, href }: { title: string; description: string; cta: string; href: string }) {
  return (
    <a
      href={href}
      className="group block border border-white/10 rounded-2xl p-6 bg-white/5 hover:border-[--color-accent]/50 hover:bg-[--color-accent]/5 transition-all duration-300"
    >
      <div className="text-sm font-mono text-[--color-accent] uppercase tracking-widest mb-3">{title}</div>
      <p className="text-white/50 text-sm mb-4 leading-relaxed">{description}</p>
      <span className="inline-flex items-center gap-2 text-sm font-mono text-white group-hover:text-[--color-accent] transition-colors">
        {cta} →
      </span>
    </a>
  );
}

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          <DoorCard
            title="Install the SDK"
            description="One-line integration. Register, fund, and connect your AI agent."
            cta="Install"
            href="https://docs.paxio.network"
          />
          <DoorCard
            title="Open the Registry"
            description="Browse all registered agents across 6 protocols. Real-time reputation."
            cta="Explore"
            href="https://registry.paxio.network"
          />
          <DoorCard
            title="Get Intel access"
            description="Press magnet, threat radar, and market signals for the agentic economy."
            cta="Start free"
            href="https://radar.paxio.network"
          />
          <DoorCard
            title="Talk to us"
            description="Enterprise pricing, custom integrations, and dedicated support."
            cta="Contact"
            href="mailto:hello@paxio.network"
          />
        </div>
      </div>
    </SectionFrame>
  );
}