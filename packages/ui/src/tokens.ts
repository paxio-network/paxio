/**
 * Paxio design tokens — source of truth for all 8 frontend apps.
 * Each app overrides `--color-accent` in its `app/globals.css`.
 *
 * @see docs/sprints/M01b-frontend-bootstrap.md §Design tokens
 */
export const tokens = {
  colors: {
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