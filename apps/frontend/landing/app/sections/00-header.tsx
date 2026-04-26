'use client';
import { useState } from 'react';
import { paxioClient } from '@paxio/api-client';

const NAV_LINKS = [
  { label: 'Registry', href: 'https://registry.paxio.network' },
  { label: 'Radar', href: 'https://radar.paxio.network' },
  { label: 'Docs', href: 'https://docs.paxio.network' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header
        id="paxio-header"
        className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-16 py-3 bg-[var(--color-bg0)] border-b border-[var(--color-rule)] backdrop-blur"
      >
        {/* Brand mark + wordmark */}
        <div className="flex items-center gap-3">
          {/* SVG brand mark */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Paxio brand mark">
            <rect width="28" height="28" rx="6" fill="#D4A658" fillOpacity="0.12" />
            <path d="M7 8l7 12 7-12" stroke="#D4A658" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 18l7-5 7 5" stroke="#D4A658" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
          </svg>
          <div>
            <span className="text-[var(--color-ink0)] font-bold text-lg tracking-tight leading-none">Paxio</span>
            <span className="hidden sm:block text-[var(--color-ink1)] text-xs font-mono ml-2 leading-none">
              Financial OS · Agentic Economy
            </span>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-mono text-[var(--color-ink1)] hover:text-[var(--color-ink0)] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://docs.paxio.network/getting-started"
            className="px-4 py-1.5 text-sm font-mono border border-[var(--color-ink0)]/20 text-[var(--color-ink0)] hover:border-[var(--color-ink0)]/60 transition-colors rounded-lg"
          >
            Install SDK
          </a>
          <a
            href="https://registry.paxio.network"
            className="px-4 py-1.5 text-sm font-mono bg-[var(--color-gold)] text-[var(--color-bg0)] hover:brightness-110 transition-opacity rounded-lg font-bold"
          >
            Open Registry →
          </a>
        </div>

        {/* Live pulse dot */}
        <div className="hidden lg:flex items-center gap-2 ml-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-up)] opacity-60 animate-ping" style={{ animationDuration: '2s' }} />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-up)]" />
          </span>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-[var(--color-ink0)]"
          aria-label="Toggle mobile menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(v => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {mobileOpen ? (
              <>
                <line x1="5" y1="5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="17" y1="5" x2="5" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="3" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[var(--color-bg0)] border-b border-[var(--color-rule)] px-6 py-6 flex flex-col gap-4">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="text-base font-mono text-[var(--color-ink0)] hover:text-[var(--color-gold)] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-3 mt-2">
            <a
              href="https://docs.paxio.network/getting-started"
              className="px-4 py-2 text-sm font-mono border border-[var(--color-ink0)]/20 text-[var(--color-ink0)] hover:border-[var(--color-ink0)]/60 transition-colors rounded-lg text-center"
            >
              Install SDK
            </a>
            <a
              href="https://registry.paxio.network"
              className="px-4 py-2 text-sm font-mono bg-[var(--color-gold)] text-[var(--color-bg0)] hover:brightness-110 transition-opacity rounded-lg font-bold text-center"
            >
              Open Registry →
            </a>
          </div>
        </div>
      )}
    </>
  );
}