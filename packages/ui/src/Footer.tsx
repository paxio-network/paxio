interface FooterProps {
  dark?: boolean;
}

export function Footer({ dark = false }: FooterProps) {
  return (
    <footer className={`px-6 py-10 lg:px-16 border-t border-white/10 ${dark ? 'bg-[--color-dark]' : 'bg-[--color-dark]'}`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="font-mono text-sm text-white/50">
          <span className="text-[--color-primary] font-bold">Paxio</span> · Agent Financial OS · © 2026
        </div>
        <nav className="flex gap-6 text-sm text-white/40" aria-label="Footer navigation">
          {['Docs', 'Registry', 'Pay', 'Radar', 'Intel', 'Wallet'].map(link => (
            <a key={link} href={`https://${link.toLowerCase()}.paxio.network`} className="hover:text-white/70 transition-colors">
              {link}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}