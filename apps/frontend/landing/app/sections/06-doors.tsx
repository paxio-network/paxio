'use client';
import { SectionFrame } from '@paxio/ui';

interface DoorCardProps {
  title: string;
  description: string;
  href: string;
  cta: string;
  accent?: string;
}

function DoorCard({ title, description, href, cta, accent }: DoorCardProps) {
  return (
    <a
      href={href}
      className="group flex flex-col justify-between gap-4 p-8 border border-[var(--color-rule)] rounded-2xl bg-[var(--color-bg1)] hover:border-[var(--color-gold)]/40 transition-all duration-300"
    >
      <div>
        <h3 className="text-xl font-bold text-[var(--color-ink0)] mb-3 group-hover:text-[var(--color-gold)] transition-colors">
          {title}
        </h3>
        <p className="text-sm font-mono text-[var(--color-ink1)] leading-relaxed">{description}</p>
      </div>
      <div>
        <span
          className="inline-flex items-center gap-2 text-sm font-mono font-bold text-[var(--color-gold)] opacity-80 group-hover:opacity-100 transition-opacity"
          style={{ color: accent ?? undefined }}
        >
          {cta}
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </a>
  );
}

const DOORS = [
  {
    title: 'Install the SDK',
    description:
      'One-line integration: @paxio/sdk. Register your agent, attach a wallet, expose via x402.',
    href: 'https://docs.paxio.network/getting-started',
    cta: 'View docs',
  },
  {
    title: 'Open the Registry',
    description:
      'Browse 7 agent sources (ERC-8004, MCP, A2A, Fetch.ai, Virtuals, ElizaOS, Native). Resolve any DID.',
    href: 'https://registry.paxio.network',
    cta: 'Explore agents',
  },
  {
    title: 'Get Intel access',
    description:
      'Intelligence Terminal: Bloomberg data, Chainlink oracles, threat radar, FAP routing analytics.',
    href: 'https://intel.paxio.network',
    cta: 'Request access',
  },
  {
    title: 'Talk to us',
    description:
      'Enterprise? BTC-native protocols? Multi-rail routing? Reach the Paxio team directly.',
    href: 'https://paxio.network/contact',
    cta: 'Send a message',
  },
];

export function Doors() {
  return (
    <SectionFrame id="doors" eyebrow="Get Started" dark>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-[var(--color-ink0)]">
            Choose your entry point
          </h2>
          <p className="text-sm font-mono text-[var(--color-ink1)]">
            Four ways to engage with the Agent Financial OS
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DOORS.map(door => (
            <DoorCard key={door.title} {...door} />
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}