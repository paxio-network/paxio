import type { ReactNode } from 'react';

interface ConditionalSectionProps {
  show: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Progressive Reveal pattern (M-L0). Renders `children` only when `show` is
 * true. When `show` is false and a `fallback` is provided, renders the
 * fallback instead. Otherwise renders nothing.
 *
 * Pure presentation component — no fetching, no timers, no randomness. The
 * decision to "show" is the responsibility of the caller (e.g. a useQuery
 * result `data?.length > 0`). This keeps the landing page honest: empty
 * states stay invisible (or display an "Upcoming" badge) rather than fake
 * data while upstream dependencies catch up.
 */
export function ConditionalSection({ show, fallback, children }: ConditionalSectionProps) {
  if (show) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return null;
}
