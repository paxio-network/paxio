/**
 * M-L10.3 — `<Footer>` B5 shell component (refactored from M-L9 placeholder).
 * Server-component-friendly — no client hooks.
 *
 * Spec: docs/sprints/M-L10.3-shell-components.md
 * Design source: docs/design/paxio-b5/Paxio-B5.html lines 100-154 (page-foot)
 */

interface FooterProps {
  /** Copyright year. Defaults to 2026 (server-side computed per M-L9 fix). */
  year?: number;
}

// ─── SVG Mark (same as Header) ───────────────────────────────────────────────
function PaxioMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: '8px' }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="6" y1="10" x2="22" y2="6" />
        <line x1="22" y1="6" x2="34" y2="18" />
        <line x1="6" y1="10" x2="14" y2="26" />
        <line x1="14" y1="26" x2="22" y2="6" />
        <line x1="14" y1="26" x2="28" y2="34" />
        <line x1="34" y1="18" x2="28" y2="34" />
      </g>
      <g fill="currentColor">
        <circle cx="6" cy="10" r="2.6" />
        <circle cx="22" cy="6" r="2.2" />
        <circle cx="34" cy="18" r="2.2" />
        <circle cx="14" cy="26" r="2.2" />
      </g>
      <circle cx="28" cy="34" r="3.1" fill="var(--gold)" />
    </svg>
  );
}

// ─── Main Footer export ───────────────────────────────────────────────────────
export function Footer({ year = 2026 }: FooterProps) {
  return (
    <footer id="page-foot">
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '48px clamp(24px, 4vw, 56px) 40px',
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '48px',
          borderTop: '1.5px solid var(--ink-0)',
          background: 'var(--paper-1)',
        }}
      >
        {/* Brand block */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
            <PaxioMark size={20} />
            <span
              style={{
                fontFamily: 'var(--f-display)',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--ink-0)',
              }}
            >
              Paxio
            </span>
          </div>
          <p style={{ fontFamily: 'var(--f-sans)', fontSize: '13px', color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>
            Financial OS for the agentic economy.
          </p>
        </div>

        {/* 3 link columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
          }}
        >
          {/* Product */}
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '12px' }}>
              Product
            </div>
            <nav aria-label="Product links" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { href: 'https://registry.paxio.network', label: 'Registry' },
                { href: 'https://wallet.paxio.network', label: 'Wallet' },
                { href: 'https://pay.paxio.network', label: 'Pay / FAP' },
                { href: 'https://radar.paxio.network', label: 'Radar' },
              ].map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  style={{ fontFamily: 'var(--f-sans)', fontSize: '13px', color: 'var(--ink-1)' }}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          {/* Builders */}
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '12px' }}>
              Builders
            </div>
            <nav aria-label="Builder links" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { href: 'https://docs.paxio.network', label: 'Docs' },
                { href: '#quickstart', label: 'SDK · 60s' },
                { href: 'https://github.com/paxio-network', label: 'GitHub' },
                { href: 'https://status.paxio.network', label: 'Status' },
              ].map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  style={{ fontFamily: 'var(--f-sans)', fontSize: '13px', color: 'var(--ink-1)' }}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '12px' }}>
              Company
            </div>
            <nav aria-label="Company links" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { href: '/manifesto', label: 'Manifesto' },
                { href: '/blog', label: 'Blog' },
                { href: '/careers', label: 'Careers' },
                { href: 'mailto:hi@paxio.network', label: 'Contact' },
              ].map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  style={{ fontFamily: 'var(--f-sans)', fontSize: '13px', color: 'var(--ink-1)' }}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Legal block */}
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '16px clamp(24px, 4vw, 56px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          background: 'var(--paper-1)',
          borderTop: '1px solid var(--line-soft)',
          fontFamily: 'var(--f-sans)',
          fontSize: '12px',
          color: 'var(--ink-3)',
        }}
      >
        <span>© {year} Paxio GmbH · Berlin</span>
        <span>This preview displays projected metrics. Real-time data enabled on launch.</span>
      </div>
    </footer>
  );
}