// @vitest-environment happy-dom
/**
 * RED spec for M-L10.3 — `<Footer>` (B5 shell component, refactored from M-L9 placeholder).
 *
 * Source: `docs/design/paxio-b5/Paxio-B5.html` lines 100-154 (page-foot).
 * Frontend-dev refactors `packages/ui/src/Footer.tsx` (breaking change OK, M-L9 callers
 * — only landing page.tsx — pick up new shape via M-L10.5).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { Footer } from '../src/Footer';

afterEach(() => cleanup());

describe('M-L10.3 Footer — brand block', () => {
  it('renders SVG mark identical to Header (5-node graph + gold accent)', () => {
    render(<Footer />);
    const svg = document.querySelector('svg[aria-hidden="true"]');
    expect(svg, 'footer must include same SVG mark').toBeTruthy();
    expect(svg!.getAttribute('viewBox')).toBe('0 0 40 40');
    expect(svg!.querySelector('circle[fill*="gold"]'), 'gold accent node required').toBeTruthy();
  });

  it('renders wordmark "Paxio" in foot-mark area', () => {
    render(<Footer />);
    expect(screen.getByText('Paxio')).toBeTruthy();
  });

  it('renders tagline "Financial OS for the agentic economy."', () => {
    render(<Footer />);
    expect(screen.getByText('Financial OS for the agentic economy.')).toBeTruthy();
  });
});

describe('M-L10.3 Footer — 3 link columns', () => {
  it('Product column header + 4 links (Registry, Wallet, Pay, Radar)', () => {
    render(<Footer />);
    expect(screen.getByText('Product')).toBeTruthy();
    expect((screen.getByText('Registry') as HTMLAnchorElement).href).toContain('registry.paxio.network');
    expect((screen.getByText('Wallet') as HTMLAnchorElement).href).toContain('wallet.paxio.network');
    expect((screen.getByText(/Pay/) as HTMLAnchorElement).href).toContain('pay.paxio.network');
    expect((screen.getByText('Radar') as HTMLAnchorElement).href).toContain('radar.paxio.network');
  });

  it('Builders column header + 4 links (Docs, SDK, GitHub, Status)', () => {
    render(<Footer />);
    expect(screen.getByText('Builders')).toBeTruthy();
    expect((screen.getByText('Docs') as HTMLAnchorElement).href).toContain('docs.paxio.network');
    expect(screen.getByText(/SDK/)).toBeTruthy();
    expect((screen.getByText('GitHub') as HTMLAnchorElement).href).toContain('github.com/paxio-network');
    expect((screen.getByText('Status') as HTMLAnchorElement).href).toContain('status.paxio.network');
  });

  it('Company column header + 4 links (Manifesto, Blog, Careers, Contact)', () => {
    render(<Footer />);
    expect(screen.getByText('Company')).toBeTruthy();
    expect(screen.getByText('Manifesto')).toBeTruthy();
    expect(screen.getByText('Blog')).toBeTruthy();
    expect(screen.getByText('Careers')).toBeTruthy();
    const contact = screen.getByText('Contact') as HTMLAnchorElement;
    expect(contact.href.startsWith('mailto:')).toBe(true);
  });
});

describe('M-L10.3 Footer — legal block', () => {
  it('renders copyright with Berlin location', () => {
    render(<Footer />);
    expect(screen.getByText(/©\s*2026\s*Paxio GmbH.*Berlin/)).toBeTruthy();
  });

  it('renders projected-metrics disclaimer', () => {
    render(<Footer />);
    expect(
      screen.getByText(/preview displays projected metrics|Real-time data enabled on launch/i),
    ).toBeTruthy();
  });

  it('uses provided year prop in copyright (default 2026)', () => {
    const { rerender } = render(<Footer year={2027} />);
    expect(screen.getByText(/©\s*2027/)).toBeTruthy();
    rerender(<Footer />);
    expect(screen.getByText(/©\s*2026/)).toBeTruthy();
  });

  it('year prop is optional — Footer renders without it', () => {
    expect(() => render(<Footer />)).not.toThrow();
  });
});

describe('M-L10.3 Footer — semantic baseline', () => {
  it('uses <footer> tag with id="page-foot" (matches design CSS hooks)', () => {
    const { container } = render(<Footer />);
    const f = container.querySelector('footer');
    expect(f).toBeTruthy();
    expect(f!.id).toBe('page-foot');
  });

  it('Footer is server-component-friendly — no `useState`/`useEffect` required', () => {
    // Indirect proof: rendering does not throw and produces static markup that
    // does not require hydration-only APIs.
    const { container } = render(<Footer year={2026} />);
    expect(container.querySelector('footer')).toBeTruthy();
  });
});
