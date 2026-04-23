import type { HeatGrid } from '@paxio/types';

interface HeatmapGridProps {
  grid: HeatGrid;
  className?: string;
}

export function HeatmapGrid({ grid, className }: HeatmapGridProps) {
  const maxCell = Math.max(...grid.cells.flat(), 1);

  const getIntensity = (val: number): string => {
    const ratio = val / maxCell;
    if (ratio === 0) return 'bg-[--color-dark]/40';
    if (ratio < 0.25) return 'bg-[--color-red]/20';
    if (ratio < 0.5) return 'bg-[--color-red]/50';
    if (ratio < 0.75) return 'bg-[--color-red]/70';
    return 'bg-[--color-red]';
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr>
            <th className="p-2 text-left text-white/30" />
            {grid.cols.map(col => (
              <th key={col} className="p-2 text-center text-white/30 uppercase">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, ri) => (
            <tr key={row}>
              <td className="p-2 text-left text-white/50 uppercase whitespace-nowrap">{row}</td>
              {grid.cells[ri].map((val, ci) => (
                <td key={ci} className="p-1">
                  <div
                    className={`w-full aspect-square rounded-sm transition-colors ${getIntensity(val)}`}
                    title={`${row} × ${grid.cols[ci]}: ${val} attacks`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}