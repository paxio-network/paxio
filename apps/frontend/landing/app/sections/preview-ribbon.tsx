'use client';

export function PreviewRibbon() {
  return (
    <div
      className="w-full bg-[--color-bitcoin]/10 border-b border-[--color-bitcoin]/20 py-1.5 overflow-hidden"
      aria-label="Preview notice"
    >
      <p className="text-center text-xs font-mono text-[--color-bitcoin] tracking-widest uppercase animate-marquee">
        SIMULATED PREVIEW &nbsp;·&nbsp; LAUNCHING Q2 2026 &nbsp;·&nbsp; METRICS ARE PROJECTED
      </p>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee { animation: none; }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
