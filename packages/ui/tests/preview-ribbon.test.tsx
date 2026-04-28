// @vitest-environment happy-dom
/**
 * RED spec for M-L10.3 — `<PreviewRibbon>` (B5 shell component).
 *
 * Source: `docs/design/paxio-b5/Paxio-B5.html` lines 87-90 (preview-ribbon).
 * The ribbon is the visible disclosure that satisfies R-FE-Preview rule's
 * condition #2 (`<PreviewRibbon>` rendered non-collapsed, non-dismissable, sticky top).
 *
 * Frontend-dev implements `packages/ui/src/PreviewRibbon.tsx` ('use client').
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { PreviewRibbon } from '../src/PreviewRibbon';

afterEach(() => cleanup());

describe('M-L10.3 PreviewRibbon — visible disclosure', () => {
  it('renders role="status" so assistive tech announces it', () => {
    render(<PreviewRibbon />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('renders the canonical disclosure copy (matches Paxio-B5.html line 88)', () => {
    render(<PreviewRibbon />);
    expect(
      screen.getAllByText(
        /SIMULATED PREVIEW.*LAUNCHING Q2 2026.*METRICS ARE PROJECTED/,
      ).length,
      'disclosure text must appear (≥1 instance — repeated for marquee)',
    ).toBeGreaterThanOrEqual(1);
  });

  it('disclosure text repeats for marquee (≥2 spans in track for seamless scroll)', () => {
    const { container } = render(<PreviewRibbon />);
    // Marquee pattern: text duplicated across multiple spans inside .marquee-track
    const matches = container.textContent?.match(/SIMULATED PREVIEW/g) ?? [];
    expect(matches.length, 'text must repeat ≥2× for marquee seamlessness').toBeGreaterThanOrEqual(2);
  });
});

describe('M-L10.3 PreviewRibbon — non-dismissable', () => {
  it('contains NO close button / dismiss control', () => {
    render(<PreviewRibbon />);
    // Should never expose a way to close — design intent is permanent disclosure pre-launch
    expect(screen.queryByLabelText(/close|dismiss|hide/i)).toBeNull();
    expect(screen.queryByText(/×|✕|✖|close|dismiss/i)).toBeNull();
  });

  it('does NOT accept onClose / onDismiss prop in TS contract', () => {
    // Static check via TS-level absence: passing such a prop should not be supported.
    // Behavioural check: rendering produces no controls regardless of props.
    // @ts-expect-error — onClose intentionally not in PreviewRibbonProps
    render(<PreviewRibbon onClose={() => {}} />);
    expect(screen.queryByLabelText(/close/i)).toBeNull();
  });
});

describe('M-L10.3 PreviewRibbon — sticky position', () => {
  it('uses CSS position sticky (or fixed) at top — class hint OR data attribute', () => {
    const { container } = render(<PreviewRibbon />);
    const root = container.firstElementChild as HTMLElement;
    expect(root, 'must render a root element').toBeTruthy();
    // Either inline style, class containing 'sticky'/'fixed', or CSS-tokens-driven via id
    const hasStickyClass = /sticky|fixed/.test(root.className);
    const hasStickyId = root.id === 'preview-ribbon';
    expect(
      hasStickyClass || hasStickyId,
      'root must be #preview-ribbon (CSS-positioned via Paxio-B5.html styles) OR carry sticky/fixed class',
    ).toBe(true);
  });
});

describe('M-L10.3 PreviewRibbon — reduced-motion honored', () => {
  it('marquee track honors `[data-motion="off"]` (animation paused)', () => {
    const { container } = render(<PreviewRibbon />);
    // Track must be addressable so CSS rule `[data-motion="off"] .marquee-track { animation-play-state: paused }` applies
    const track = container.querySelector('.marquee-track, [data-marquee-track]');
    expect(track, 'marquee track must be queryable for motion override').toBeTruthy();
  });
});
