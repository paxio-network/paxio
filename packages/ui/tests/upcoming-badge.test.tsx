// @vitest-environment happy-dom
/**
 * Runtime tests for `<UpcomingBadge>` (M-L0 Progressive Reveal).
 *
 * The badge is a server-friendly, presentation-only component that announces
 * a not-yet-shipped section. These tests verify the visible label, the
 * `role="status"` ARIA contract, and the `aria-label` text used by screen
 * readers.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { UpcomingBadge } from '../src/UpcomingBadge';

afterEach(() => cleanup());

describe('UpcomingBadge — visible label', () => {
  it('renders the label text', () => {
    render(<UpcomingBadge label="FAP routing — launching with M-L4b" />);
    expect(screen.getByText('FAP routing — launching with M-L4b')).toBeTruthy();
  });

  it('renders different labels distinctly', () => {
    const { rerender, container } = render(<UpcomingBadge label="alpha" />);
    expect(container.textContent).toContain('alpha');
    rerender(<UpcomingBadge label="beta" />);
    expect(container.textContent).toContain('beta');
    expect(container.textContent).not.toContain('alpha');
  });
});

describe('UpcomingBadge — accessibility', () => {
  it('exposes role="status" for assistive tech', () => {
    render(<UpcomingBadge label="Agent network" />);
    const node = screen.getByRole('status');
    expect(node).toBeTruthy();
  });

  it('aria-label uses the "Coming soon: <label>" template', () => {
    render(<UpcomingBadge label="Heatmap" />);
    const node = screen.getByRole('status');
    expect(node.getAttribute('aria-label')).toBe('Coming soon: Heatmap');
  });

  it('aria-label updates when label prop changes', () => {
    const { rerender } = render(<UpcomingBadge label="FAP" />);
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Coming soon: FAP');
    rerender(<UpcomingBadge label="Guard" />);
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Coming soon: Guard');
  });
});

describe('UpcomingBadge — className composition', () => {
  it('applies the supplied className alongside the built-in classes', () => {
    render(<UpcomingBadge label="x" className="my-extra" />);
    const node = screen.getByRole('status');
    expect(node.className).toContain('my-extra');
    // built-in token still present so layout does not change
    expect(node.className).toContain('rounded-full');
  });

  it('omitting className still produces a usable element', () => {
    render(<UpcomingBadge label="x" />);
    const node = screen.getByRole('status');
    expect(node.className).toContain('rounded-full');
  });
});
