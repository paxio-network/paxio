interface FooterProps {
  dark?: boolean;
}

const FOOTER_LINKS = [
  { label: 'Docs', href: 'https://docs.paxio.network' },
  { label: 'Registry', href: 'https://registry.paxio.network' },
  { label: 'Pay', href: 'https://pay.paxio.network' },
  { label: 'Radar', href: 'https://radar.paxio.network' },
  { label: 'Intel', href: 'https://intel.paxio.network' },
  { label: 'Wallet', href: 'https://wallet.paxio.network' },
];

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/paxio-network' },
  { label: 'X', href: 'https://x.com/paxio_network' },
];

export function Foot() {
  return (
    <footer className="px-6 py-12 lg:px-16 border-t border-[var(--color-rule)] bg-[var(--color-bg1)]">
      <div className="max-w-7xl mx-auto">
        {/* Brand row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            {/* SVG brand mark */}
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-label="Paxio brand mark">
              <rect width="28" height="28" rx="6" fill="#D4A658" fillOpacity="0.12" />
              <path d="M7 8l7 12 7-12" stroke="#D4A658" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 18l7-5 7 5" stroke="#D4A658" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
            </svg>
            <div>
              <div className="font-mono font-bold text-sm text-[var(--color-ink0)]">Paxio</div>
              <div className="font-mono text-xs text-[var(--color-ink1)]">Agent Financial OS · {new Date().getFullYear()}</div>
            </div>
          </div>
          <div className="flex gap-6">
            {SOCIAL_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-mono text-[var(--color-ink1)] hover:text-[var(--color-gold)] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--color-rule)] mb-8" />

        {/* Links row */}
        <div className="flex flex-wrap gap-x-8 gap-y-3 mb-8">
          {FOOTER_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-mono text-[var(--color-ink1)] hover:text-[var(--color-ink0)] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Legal line */}
        <p className="text-xs font-mono text-[var(--color-ink1)]/50">
          Paxio Financial OS — agentic economy infrastructure. All metrics are projected until launch.
          DID resolution via Universal Registry (ERC-8004, MCP, A2A, Fetch.ai, Virtuals, ElizaOS).
        </p>
      </div>
    </footer>
  );
}