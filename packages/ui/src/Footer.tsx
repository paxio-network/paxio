/**
 * M-L10.3 + M-L10.7.3 — `<Footer>` B5 shell component.
 * Server-component-friendly — no client hooks.
 *
 * Spec: docs/sprints/M-L10.3-shell-components.md
 * Design source: docs/design/paxio-b5/Paxio-B5.html lines 101-160 (page-foot)
 */

interface FooterProps {
  /** Copyright year. Defaults to 2026 (server-side computed). */
  year?: number;
}

// ─── SVG Mark (same as Header) ───────────────────────────────────────────────
function FootMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
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
      <div className="foot-inner">
        {/* Brand block */}
        <div className="foot-brand">
          <div className="foot-mark">
            <FootMark size={20} />
            <span>Paxio</span>
          </div>
          <div className="foot-tagline">Financial OS for the agentic economy.</div>
        </div>

        {/* 3-column sitemap */}
        <div className="foot-cols">
          {/* Product */}
          <div>
            <div className="foot-h">Product</div>
            <nav aria-label="Product links">
              <a href="https://registry.paxio.network">Registry</a>
              <a href="https://wallet.paxio.network">Wallet</a>
              <a href="https://pay.paxio.network">Pay / FAP</a>
              <a href="https://radar.paxio.network">Radar</a>
            </nav>
          </div>

          {/* Builders */}
          <div>
            <div className="foot-h">Builders</div>
            <nav aria-label="Builder links">
              <a href="https://docs.paxio.network">Docs</a>
              <a href="#quickstart">SDK · 60s</a>
              <a href="https://github.com/paxio-network">GitHub</a>
              <a href="https://status.paxio.network">Status</a>
            </nav>
          </div>

          {/* Company */}
          <div>
            <div className="foot-h">Company</div>
            <nav aria-label="Company links">
              <a href="/manifesto">Manifesto</a>
              <a href="/blog">Blog</a>
              <a href="/careers">Careers</a>
              <a href="mailto:hi@paxio.network">Contact</a>
            </nav>
          </div>
        </div>
      </div>

      {/* Legal block */}
      <div className="foot-legal">
        <span>© {year} Paxio GmbH · Berlin</span>
        <span>This preview displays projected metrics. Real-time data enabled on launch.</span>
      </div>
    </footer>
  );
}