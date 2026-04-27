'use client';

export function Header() {
  return (
    <header
      id="paxio-header"
      className="sticky top-0 z-50 border-b border-white/10 bg-[--color-dark]/95 backdrop-blur"
    >
      <div className="flex items-center justify-between px-6 lg:px-16 py-4">
        <a href="https://paxio.network" className="flex items-center gap-3" aria-label="Paxio home">
          <span className="font-mono font-bold text-white text-lg tracking-tight">Paxio</span>
        </a>
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {[
            { label: 'Registry', href: 'https://registry.paxio.network' },
            { label: 'Pay', href: 'https://pay.paxio.network' },
            { label: 'Radar', href: 'https://radar.paxio.network' },
            { label: 'Docs', href: 'https://docs.paxio.network' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-mono text-white/50 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href="https://wallet.paxio.network"
          className="px-4 py-2 text-sm font-mono border border-[--color-primary] text-[--color-primary] rounded-lg hover:bg-[--color-primary]/10 transition-colors"
        >
          Connect Wallet
        </a>
      </div>
    </header>
  );
}
