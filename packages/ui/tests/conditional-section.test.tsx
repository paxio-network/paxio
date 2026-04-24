// @vitest-environment happy-dom
/**
 * Runtime tests for `<ConditionalSection>` (M-L0 Progressive Reveal).
 *
 * The component is a thin gate: it renders its `children` when `show` is true,
 * its `fallback` when `show` is false and a fallback is provided, otherwise
 * nothing. These tests verify the four branches plus the purity invariant
 * (no fetch, no timers, no randomness during render).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ConditionalSection } from '../src/ConditionalSection';

afterEach(() => cleanup());

describe('ConditionalSection — show branch', () => {
  it('renders children when show=true', () => {
    render(
      <ConditionalSection show={true}>
        <p data-testid="child">visible</p>
      </ConditionalSection>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByText('visible')).toBeTruthy();
  });

  it('renders children when show=true even if fallback provided (children win)', () => {
    render(
      <ConditionalSection show={true} fallback={<p data-testid="fallback">fb</p>}>
        <p data-testid="child">primary</p>
      </ConditionalSection>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.queryByTestId('fallback')).toBeNull();
  });
});

describe('ConditionalSection — hide branch', () => {
  it('renders nothing when show=false and no fallback', () => {
    const { container } = render(
      <ConditionalSection show={false}>
        <p data-testid="child">hidden</p>
      </ConditionalSection>,
    );
    expect(screen.queryByTestId('child')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('renders fallback when show=false and fallback provided', () => {
    render(
      <ConditionalSection show={false} fallback={<p data-testid="fallback">coming soon</p>}>
        <p data-testid="child">hidden</p>
      </ConditionalSection>,
    );
    expect(screen.queryByTestId('child')).toBeNull();
    expect(screen.getByTestId('fallback')).toBeTruthy();
    expect(screen.getByText('coming soon')).toBeTruthy();
  });

  it('renders nothing when show=false and fallback={null}', () => {
    const { container } = render(
      <ConditionalSection show={false} fallback={null}>
        <p data-testid="child">hidden</p>
      </ConditionalSection>,
    );
    // null fallback is "explicit nothing" — still nothing rendered.
    expect(container.textContent).toBe('');
  });
});

describe('ConditionalSection — purity invariant', () => {
  it('does not call fetch during render', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
    render(
      <ConditionalSection show={true}>
        <span>x</span>
      </ConditionalSection>,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('produces consistent output across re-renders with same props', () => {
    const { container, rerender } = render(
      <ConditionalSection show={true}>
        <span>stable</span>
      </ConditionalSection>,
    );
    const first = container.innerHTML;
    rerender(
      <ConditionalSection show={true}>
        <span>stable</span>
      </ConditionalSection>,
    );
    expect(container.innerHTML).toBe(first);
  });
});
