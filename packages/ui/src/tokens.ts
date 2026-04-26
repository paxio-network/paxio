/**
 * Paxio design tokens — source of truth for all 8 frontend apps.
 * Each app overrides `--color-accent` in its `app/globals.css`.
 *
 * B5 warm dark palette (Paxio B5 Design, sourced from artefact):
 *   bg0/bg1  — warm dark backgrounds
 *   ink0/ink1 — warm off-white text
 *   gold      — Bitcoin / accent (D4A658)
 *   up/down   — positive/negative deltas
 *   rule      — dashed dividers
 *
 * @see docs/sprints/M-L9-landing-design-port.md §Architecture
 */
export const tokens = {
  colors: {
    // B5 warm dark palette
    bg0: '#0E0B07',        // page background (warm dark)
    bg1: '#171107',        // section background
    ink0: '#F4ECDA',       // primary text (warm off-white)
    ink1: 'rgba(244, 236, 218, 0.62)', // secondary text
    gold: '#D4A658',       // Bitcoin / accent
    up: '#7DBE74',         // positive delta
    down: '#E07A6E',       // negative delta
    rule: 'rgba(244, 236, 218, 0.18)', // dashed dividers
    // App-layer accent (M01b legacy — kept for existing components)
    primary: '#0F3460',
    dark: '#1A1A2E',
    accent: '#533483',
    teal: '#0F766E',
    red: '#991B1B',
    bitcoin: '#D97706',
    navy: '#1E3A5F',
    green: '#166534',
    amber: '#C2410C',
  },
  fonts: {
    display: 'Geist, system-ui, sans-serif',
    body: 'Geist, system-ui, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, monospace',
  },
} as const;

export type TokenColors = typeof tokens.colors;
export type TokenFonts = typeof tokens.fonts;

/**
 * Maps app name → CSS `--color-accent` hex value.
 * Matches M01b spec table.
 */
export const APP_ACCENT: Record<string, string> = {
  landing: '#0F3460',
  registry: '#0F766E',
  pay: '#533483',
  radar: '#533483',
  intel: '#533483',
  docs: '#1A1A2E',
  wallet: '#1E3A5F',
  fleet: '#1A1A2E',
} as const;