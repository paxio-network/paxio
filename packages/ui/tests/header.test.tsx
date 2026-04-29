// @vitest-environment happy-dom
/**
 * RED spec for M-L10.3 — `<Header>` (B5 shell component).
 *
 * Source: `docs/design/paxio-b5/Paxio-B5.html` lines 28-90 (header + drawer).
 * Frontend-dev implements `packages/ui/src/Header.tsx` ('use client') to make
 * these tests GREEN. Tests are SACRED per scope-guard — only architect modifies.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { Header } from '../src/Header';

afterEach(() => cleanup());

describe('M-L10.3 Header — brand block', () => {
  it('renders SVG mark with currentColor edges + nodes + gold accent node', () => {
    render(<Header />);
    const svg = document.querySelector('svg[aria-hidden="true"]');
    expect(svg, 'header SVG mark must exist').toBeTruthy();
    expect(svg!.getAttribute('viewBox')).toBe('0 0 40 40');
    // 5-node graph + 6 edges per design
    expect(svg!.querySelectorAll('line').length).toBeGreaterThanOrEqual(6);
    expect(svg!.querySelectorAll('circle').length).toBeGreaterThanOrEqual(5);
    // Gold accent node — fill="var(--gold)"
    const goldNode = svg!.querySelector('circle[fill*="gold"]');
    expect(goldNode, 'gold accent circle (Bitcoin/value node) required').toBeTruthy();
  });

  it('renders wordmark "Paxio" + tagline "Financial OS · Agentic Economy"', () => {
    render(<Header />);
    expect(screen.getByText('Paxio')).toBeTruthy();
    expect(screen.getByText(/Financial OS.*Agentic Economy/)).toBeTruthy();
  });

  it('brand block is a link with aria-label "Paxio home"', () => {
    render(<Header />);
    const brand = screen.getByLabelText('Paxio home');
    expect(brand.tagName).toBe('A');
  });
});

describe('M-L10.3 Header — primary nav', () => {
  it('exposes nav with aria-label "Primary"', () => {
    render(<Header />);
    expect(screen.getByLabelText('Primary')).toBeTruthy();
  });

  it('contains 3 nav links: Registry, Radar, Docs', () => {
    render(<Header />);
    const nav = screen.getByLabelText('Primary');
    expect(within(nav).getByText('Registry').tagName).toBe('A');
    expect(within(nav).getByText('Radar').tagName).toBe('A');
    expect(within(nav).getByText('Docs').tagName).toBe('A');
  });

  it('Docs link points to docs.paxio.network (external subdomain)', () => {
    render(<Header />);
    const nav = screen.getByLabelText('Primary');
    const docs = within(nav).getByText('Docs') as HTMLAnchorElement;
    expect(docs.href).toContain('docs.paxio.network');
  });
});

describe('M-L10.3 Header — actions block (theme toggle + CTAs + live)', () => {
  it('renders theme toggle button with aria-label "Toggle dark mode"', () => {
    render(<Header />);
    const btn = screen.getByLabelText('Toggle dark mode');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('theme toggle button contains BOTH light and dark icons (CSS chooses by data-theme)', () => {
    render(<Header />);
    const btn = screen.getByLabelText('Toggle dark mode');
    const svgs = btn.querySelectorAll('svg');
    expect(svgs.length, 'both light + dark icons in DOM').toBe(2);
  });

  it('renders "Install SDK" CTA (outline variant)', () => {
    render(<Header />);
    const cta = screen.getByText('Install SDK') as HTMLAnchorElement;
    expect(cta.tagName).toBe('A');
    // Outline variant — class hint OR data-variant attribute
    const isOutline = cta.className.includes('outline') || cta.getAttribute('data-variant') === 'outline';
    expect(isOutline, 'Install SDK must be styled outline (per Paxio-B5.html line 60)').toBe(true);
  });

  it('renders "Open Registry →" CTA (primary variant) pointing to registry.paxio.network', () => {
    render(<Header />);
    const cta = screen.getByText(/Open Registry/) as HTMLAnchorElement;
    expect(cta.tagName).toBe('A');
    expect(cta.href).toContain('registry.paxio.network');
    const isPrimary = cta.className.includes('primary') || cta.getAttribute('data-variant') === 'primary';
    expect(isPrimary).toBe(true);
  });

  it('renders live status with pulse-dot + "live" label, aria-label "Network status"', () => {
    render(<Header />);
    const live = screen.getByLabelText('Network status');
    expect(live.textContent).toMatch(/live/i);
    // Pulse dot — element with class containing 'pulse-dot' OR data attribute
    const pulse = live.querySelector('.pulse-dot, [data-pulse]');
    expect(pulse, 'pulse-dot indicator must exist inside live block').toBeTruthy();
  });
});

describe('M-L10.3 Header — mobile drawer (Radix Dialog)', () => {
  it('renders mobile menu trigger button with aria-label "Open menu"', () => {
    render(<Header />);
    const btn = screen.getByLabelText('Open menu');
    expect(btn.tagName).toBe('BUTTON');
    // Initially aria-expanded="false"
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('mobile drawer hidden by default (aria-hidden or display:none via Radix)', () => {
    render(<Header />);
    // Drawer is a Radix Dialog — it lives in DOM only when open. By default closed.
    // No `[role="dialog"]` should be visible/findable yet.
    const dialogs = screen.queryAllByRole('dialog', { hidden: false });
    expect(dialogs.length).toBe(0);
  });
});

describe('M-L10.3 Header — semantic + a11y baseline', () => {
  it('header element has role="banner" or is <header> tag', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('header');
    expect(header, 'must be a <header> tag').toBeTruthy();
  });

  it('all interactive elements have accessible names', () => {
    render(<Header />);
    // Spot-check: theme toggle, brand, nav links, CTAs, mobile menu — each must have aria-label or text
    expect(screen.getByLabelText('Paxio home')).toBeTruthy();
    expect(screen.getByLabelText('Toggle dark mode')).toBeTruthy();
    expect(screen.getByLabelText('Open menu')).toBeTruthy();
    expect(screen.getByLabelText('Network status')).toBeTruthy();
  });
});
