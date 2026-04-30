/**
 * M-L10.3 + M-L10.7.3 — `<Header>` B5 shell component.
 * 'use client' — needs Radix Dialog for mobile drawer + theme state.
 *
 * Spec: docs/sprints/M-L10.3-shell-components.md
 * Design source: docs/design/paxio-b5/Paxio-B5.html lines 28-90
 */
'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

const THEME_KEY = 'paxio-theme';

/** Returns current theme from localStorage or 'light' default. */
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved =
      typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
    const initial = (saved as 'light' | 'dark') ?? 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  };

  return { theme, toggle };
}

// ─── SVG Mark (5-node graph + gold accent) ───────────────────────────────────
function PaxioMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* 6 edges */}
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="6" y1="10" x2="22" y2="6" />
        <line x1="22" y1="6" x2="34" y2="18" />
        <line x1="6" y1="10" x2="14" y2="26" />
        <line x1="14" y1="26" x2="22" y2="6" />
        <line x1="14" y1="26" x2="28" y2="34" />
        <line x1="34" y1="18" x2="28" y2="34" />
      </g>
      {/* 4 ink nodes */}
      <g fill="currentColor">
        <circle cx="6" cy="10" r="2.6" />
        <circle cx="22" cy="6" r="2.2" />
        <circle cx="34" cy="18" r="2.2" />
        <circle cx="14" cy="26" r="2.2" />
      </g>
      {/* Gold accent node — the economic one */}
      <circle cx="28" cy="34" r="3.1" fill="var(--gold)" />
    </svg>
  );
}

// ─── Theme toggle button ─────────────────────────────────────────────────────
function ThemeToggle({ theme, toggle }: { theme: string; toggle: () => void }) {
  return (
    <button
      id="hdr-theme-btn"
      type="button"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      onClick={toggle}
      className="hdr-theme-btn"
    >
      {/* Light icon — sun */}
      <svg
        className="hdr-theme-icon-light"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
        style={{ display: theme === 'dark' ? 'none' : 'block' }}
      >
        <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <line x1="8" y1="1" x2="8" y2="3" />
          <line x1="8" y1="13" x2="8" y2="15" />
          <line x1="1" y1="8" x2="3" y2="8" />
          <line x1="13" y1="8" x2="15" y2="8" />
          <line x1="3" y1="3" x2="4.5" y2="4.5" />
          <line x1="11.5" y1="11.5" x2="13" y2="13" />
          <line x1="3" y1="13" x2="4.5" y2="11.5" />
          <line x1="11.5" y1="4.5" x2="13" y2="3" />
        </g>
      </svg>
      {/* Dark icon — crescent moon */}
      <svg
        className="hdr-theme-icon-dark"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
        style={{ display: theme === 'dark' ? 'block' : 'none' }}
      >
        <path
          d="M12.5 9.5A5 5 0 0 1 6.5 3.5a5.5 5.5 0 1 0 6 6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ─── Mobile drawer via Radix Dialog ─────────────────────────────────────────
function MobileDrawer() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          id="hdr-menu-btn"
          aria-label="Open menu"
          aria-expanded="false"
          type="button"
          className="hdr-menu-btn"
        >
          <span />
          <span />
          <span />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drw-overlay" />
        <Dialog.Content
          aria-label="Navigation"
          className="drw-panel"
        >
          <Dialog.Close asChild>
            <button
              aria-label="Close menu"
              type="button"
            >
              ×
            </button>
          </Dialog.Close>
          <nav aria-label="Mobile navigation" className="drw-nav">
            {[
              { href: 'https://registry.paxio.network', label: 'Registry' },
              { href: 'https://radar.paxio.network', label: 'Radar' },
              { href: 'https://docs.paxio.network', label: 'Docs' },
              { href: '#quickstart', label: 'Install SDK' },
            ].map(({ href, label }) => (
              <Dialog.Close asChild key={label}>
                <a
                  href={href}
                  style={{ fontSize: '18px', color: 'var(--ink-0)', fontFamily: 'var(--f-sans)' }}
                >
                  {label}
                </a>
              </Dialog.Close>
            ))}
          </nav>
          <div className="hdr-live" aria-label="Network status">
            <span className="pulse-dot" />
            <span>live</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Main Header export ───────────────────────────────────────────────────────
export function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header id="paxio-header">
      <div className="hdr-inner">
        {/* Brand block */}
        <a href="https://paxio.network" aria-label="Paxio home" className="hdr-brand">
          <span className="hdr-mark"><PaxioMark size={22} /></span>
          <span className="hdr-wordmark">Paxio</span>
          <span className="hdr-tagline">Financial OS · Agentic Economy</span>
        </a>

        {/* Primary nav */}
        <nav aria-label="Primary" className="hdr-links">
          <a href="https://registry.paxio.network">Registry</a>
          <a href="https://radar.paxio.network">Radar</a>
          <a href="https://docs.paxio.network">Docs</a>
        </nav>

        {/* Actions block */}
        <div className="hdr-actions">
          <ThemeToggle theme={theme} toggle={toggle} />
          <a href="#quickstart" className="hdr-cta hdr-cta-outline">Install SDK</a>
          <a href="https://registry.paxio.network" className="hdr-cta hdr-cta-primary">Open Registry →</a>
          <span className="hdr-live" aria-label="Network status">
            <span className="pulse-dot" />
            <span>live</span>
          </span>
        </div>

        {/* Mobile trigger — visible < 900px */}
        <div className="hdr-mobile-trigger">
          <MobileDrawer />
        </div>
      </div>
    </header>
  );
}