import type { RailInfo } from '@paxio/types';

interface FAPDiagramProps {
  rails: RailInfo[];
  className?: string;
}

export function FAPDiagram({ rails, className }: FAPDiagramProps) {
  if (!rails.length) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {rails.map((rail) => (
        <div key={rail.name} className="flex items-center gap-3">
          {/* color swatch */}
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: rail.color_hex }} />
          <span className="text-sm font-mono text-white/80 w-36 shrink-0 truncate">{rail.name}</span>
          {/* bar */}
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${rail.share_pct}%`, background: rail.color_hex }}
            />
          </div>
          <span className="text-xs font-mono text-white/40 w-12 text-right">{rail.share_pct.toFixed(1)}%</span>
          {rail.concentration_risk && (
            <span className="text-xs text-[--color-bitcoin] font-mono" title="High concentration risk">⚠</span>
          )}
        </div>
      ))}
      <p className="text-xs text-white/30 font-mono mt-2">Share of FAP throughput · last 24h</p>
    </div>
  );
}