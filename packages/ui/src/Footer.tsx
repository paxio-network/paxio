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

export function Footer({ dark = false }: FooterProps) {
  return (
    <footer
      className={`px-6 py-10 lg:px-16 border-t ${
        dark ? 'border-[var(--color-rule)]' : 'border-white/10'
      } bg-[var(--color-bg1)]`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="font-mono text-sm text-[var(--color-ink1)]">
          <span className="text-[var(--color-gold)] font-bold">Paxio</span>
          {' · '}Agent Financial OS{' · '}
          {new Date().getFullYear()}
        </div>
        <nav className="flex gap-6 text-sm text-[var(--color-ink1)]" aria-label="Footer navigation">
          {FOOTER_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-[var(--color-ink0)] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}