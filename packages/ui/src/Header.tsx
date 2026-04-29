/**
 * M-L10.3 — `<Header>` B5 shell component.
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
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '6px',
        borderRadius: '4px',
      }}
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
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'none',
            flexDirection: 'column',
            gap: '5px',
            padding: '6px',
          }}
          className="hdr-mobile-btn"
        >
          <span
            style={{
              display: 'block',
              width: '20px',
              height: '1.5px',
              background: 'currentColor',
              borderRadius: '1px',
            }}
          />
          <span
            style={{
              display: 'block',
              width: '20px',
              height: '1.5px',
              background: 'currentColor',
              borderRadius: '1px',
            }}
          />
          <span
            style={{
              display: 'block',
              width: '20px',
              height: '1.5px',
              background: 'currentColor',
              borderRadius: '1px',
            }}
          />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,22,18,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 49,
          }}
        />
        <Dialog.Content
          aria-label="Navigation"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            height: '100%',
            width: '280px',
            background: 'var(--paper-0)',
            borderLeft: '1.5px solid var(--ink-0)',
            boxShadow: '-4px 0 0 var(--ink-0)',
            zIndex: 50,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <Dialog.Close asChild>
            <button
              aria-label="Close menu"
              type="button"
              style={{
                alignSelf: 'flex-end',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ×
            </button>
          </Dialog.Close>
          <nav aria-label="Mobile navigation" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          <div aria-label="Network status" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
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
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(var(--paper-0-rgb, 246,239,221), 0.88)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1.5px solid var(--ink-0)',
      }}
      className="paxio-header"
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          paddingInline: 'clamp(24px, 4vw, 56px)',
          height: '64px',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {/* Brand block */}
        <a
          href="https://paxio.network"
          aria-label="Paxio home"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}
        >
          <PaxioMark size={22} />
          <span
            style={{
              fontFamily: 'var(--f-display)',
              fontWeight: 600,
              fontSize: '18px',
              letterSpacing: '-0.01em',
              color: 'var(--ink-0)',
            }}
          >
            Paxio
          </span>
          <span
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: '12px',
              color: 'var(--ink-2)',
              display: 'none',
            }}
            className="hdr-tagline-inline"
          >
            Financial OS · Agentic Economy
          </span>
        </a>

        {/* Primary nav */}
        <nav
          aria-label="Primary"
          style={{ display: 'flex', gap: '32px', alignItems: 'center', justifyContent: 'center' }}
          className="hdr-nav-desktop"
        >
          <a href="https://registry.paxio.network" style={{ fontFamily: 'var(--f-sans)', fontSize: '14px', color: 'var(--ink-1)' }}>Registry</a>
          <a href="https://radar.paxio.network" style={{ fontFamily: 'var(--f-sans)', fontSize: '14px', color: 'var(--ink-1)' }}>Radar</a>
          <a href="https://docs.paxio.network" style={{ fontFamily: 'var(--f-sans)', fontSize: '14px', color: 'var(--ink-1)' }}>Docs</a>
        </nav>

        {/* Actions block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeToggle theme={theme} toggle={toggle} />
          <a
            href="#quickstart"
            data-variant="outline"
            className="hdr-cta-outline"
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: '14px',
              padding: '6px 14px',
              border: '1.5px solid var(--ink-0)',
              boxShadow: '3px 3px 0 0 var(--ink-0)',
              color: 'var(--ink-0)',
              textDecoration: 'none',
              transition: 'transform 0.1s',
            }}
          >
            Install SDK
          </a>
          <a
            href="https://registry.paxio.network"
            data-variant="primary"
            className="hdr-cta-primary"
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: '14px',
              padding: '6px 14px',
              border: '1.5px solid var(--ink-0)',
              boxShadow: '3px 3px 0 0 var(--ink-0)',
              background: 'var(--ink-0)',
              color: 'var(--paper-0)',
              textDecoration: 'none',
              transition: 'transform 0.1s',
            }}
          >
            Open Registry →
          </a>
          <span aria-label="Network status" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--ink-2)', fontFamily: 'var(--f-mono)' }}>
            <span className="pulse-dot" />
            <span>live</span>
          </span>
        </div>

        {/* Mobile trigger — visible < 900px */}
        <div className="hdr-mobile-trigger" style={{ display: 'none' }}>
          <MobileDrawer />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hdr-nav-desktop { display: none !important; }
          .hdr-mobile-trigger { display: flex !important; }
          .hdr-tagline-inline { display: none !important; }
        }
        @media (min-width: 901px) {
          .hdr-mobile-btn { display: none !important; }
          .hdr-tagline-inline { display: inline !important; }
        }
      `}</style>
    </header>
  );
}