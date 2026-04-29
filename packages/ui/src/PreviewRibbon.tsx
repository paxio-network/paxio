/**
 * M-L10.3 — `<PreviewRibbon>` B5 shell component.
 * 'use client' — needs animation state for reduced-motion.
 *
 * Spec: docs/sprints/M-L10.3-shell-components.md
 * Design source: docs/design/paxio-b5/Paxio-B5.html lines 87-90 (preview-ribbon)
 */
'use client';

const RIBBON_TEXT = 'SIMULATED PREVIEW · LAUNCHING Q2 2026 · METRICS ARE PROJECTED · ';

export function PreviewRibbon() {
  return (
    <div
      id="preview-ribbon"
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        overflow: 'hidden',
        borderBottom: '1.2px solid var(--ink-0)',
        background: 'var(--paper-0)',
      }}
    >
      <div
        className="marquee-track"
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          animation: 'marquee 60s linear infinite',
        }}
      >
        {/* Two spans = seamless loop (translateX 0 → -50%) */}
        <span>{RIBBON_TEXT}</span>
        <span>{RIBBON_TEXT}</span>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        [data-motion="off"] .marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation-play-state: paused;
          }
        }
      `}</style>
    </div>
  );
}