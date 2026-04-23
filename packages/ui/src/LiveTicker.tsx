'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';
import type { TickerLane, TickerCell } from '@paxio/types';

function TickerCellComponent({ label, value, delta_pct, unit, gold, warn }: TickerCell) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-3 min-w-28 ${gold ? 'border border-[--color-bitcoin]/30 bg-[--color-bitcoin]/5' : ''} ${warn ? 'border border-white/10' : ''}`}>
      <span className="text-xs font-mono text-white/40 uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-xl font-mono font-bold ${gold ? 'text-[--color-bitcoin]' : 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-xs font-mono text-white/40 ml-1">{unit}</span>}
      </span>
      {delta_pct != null && (
        <span className={`text-xs font-mono mt-0.5 ${delta_pct >= 0 ? 'text-[--color-green]' : 'text-[--color-red]'}`}>
          {delta_pct >= 0 ? '+' : ''}{delta_pct.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export function LiveTicker({ className }: { className?: string }) {
  const { data, isPending } = useQuery({
    queryKey: ['landing-ticker'],
    queryFn: () => paxioClient.landing.getTicker(),
    refetchInterval: 1100,
  });

  if (isPending || !data) {
    return (
      <div className={`flex items-center gap-6 overflow-hidden border-y border-white/10 bg-black/30 py-4 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 w-28 bg-white/5 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={`border-y border-white/10 bg-black/30 ${className}`}>
      {data.map((lane: TickerLane) => (
        <div key={lane.lane} className="flex overflow-x-auto gap-0 py-1 scrollbar-none" data-lane={lane.lane}>
          {lane.items.map((cell: TickerCell, i: number) => (
            <div key={`${lane.lane}-${i}`} className="shrink-0 first:ml-4 last:mr-4">
              <TickerCellComponent {...cell} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}