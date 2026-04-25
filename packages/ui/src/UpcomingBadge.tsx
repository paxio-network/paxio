interface UpcomingBadgeProps {
  label: string;
  className?: string;
}

/**
 * Progressive Reveal pattern (M-L0). Lightweight "Coming soon" badge used as
 * the `fallback` for `<ConditionalSection>` when a section's underlying data
 * is intentionally empty (e.g. FAP routing before M-L4b ships, agent
 * network before M-L1-impl crawls, Security Heatmap before Guard v1).
 *
 * Server-friendly (no `'use client'`, no hooks, no event handlers). Pure
 * presentation: just a label, a pulsing dot, and an `aria-label` so screen
 * readers announce "Coming soon: <label>".
 */
export function UpcomingBadge({ label, className = '' }: UpcomingBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-mono text-white/60 ${className}`}
      role="status"
      aria-label={`Coming soon: ${label}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      {label}
    </div>
  );
}
