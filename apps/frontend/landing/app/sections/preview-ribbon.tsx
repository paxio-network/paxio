'use client';
/**
 * Preview ribbon — visible disclaimer while backend returns zeros.
 * Matches artefact: "SIMULATED PREVIEW · LAUNCHING Q2 2026 · METRICS ARE PROJECTED"
 * Marquee animation respects prefers-reduced-motion.
 */
export function PreviewRibbon() {
  const text = 'SIMULATED PREVIEW · LAUNCHING Q2 2026 · METRICS ARE PROJECTED';

  return (
    <div
      id="preview-ribbon"
      aria-hidden="true"
      className="bg-[var(--color-gold)] text-[var(--color-bg0)] overflow-hidden py-1.5"
    >
      <div className="flex overflow-hidden">
        <span
          className="font-mono text-xs font-bold uppercase tracking-widest whitespace-nowrap px-4"
          style={{ animation: 'none' }}
        >
          {text}
        </span>
        {/* Double-span marquee */}
        <span
          className="font-mono text-xs font-bold uppercase tracking-widest whitespace-nowrap px-4 marquee-scroll"
        >
          {text}
        </span>
      </div>
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .marquee-scroll {
            animation: marquee-scroll 12s linear infinite;
          }
        }
      `}</style>
    </div>
  );
}