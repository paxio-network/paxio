'use client';

export function Footer() {
  return (
    <footer id="page-foot" className="border-t border-white/10 bg-[--color-dark] px-6 lg:px-16 py-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="font-mono text-sm text-white/40">
          <span className="text-[--color-primary] font-bold">Paxio</span>
          {' · '}Agent Financial OS{' · '}© 2026
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/30" aria-label="Footer navigation">
          {[
            ['Docs', 'https://docs.paxio.network'],
            ['Registry', 'https://registry.paxio.network'],
            ['Pay', 'https://pay.paxio.network'],
            ['Radar', 'https://radar.paxio.network'],
            ['Intel', 'https://intel.paxio.network'],
            ['Wallet', 'https://wallet.paxio.network'],
          ].map(([label, href]) => (
            <a key={label} href={href} className="hover:text-white/60 transition-colors">
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
