'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';
import { HeatmapGrid } from '@paxio/ui';
import type { HeatGrid } from '@paxio/types';
import { SectionFrame } from '@paxio/ui';

const EMPTY_GRID: HeatGrid = {
  rows: ['Legal·translate', 'DeFi·routing', 'CX·tier-1', 'Finance·invoice', 'Research·synth', 'Security·guard'],
  cols: ['Prompt-inj', 'Doc-inj', 'Price-manip', 'Jailbreak', 'Exfil', 'DDoS'],
  cells: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]],
  window_hours: 24,
};

export function Radar() {
  const { data } = useQuery({
    queryKey: ['landing-heatmap'],
    queryFn: () => paxioClient.landing.getHeatmap(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const grid = data ?? EMPTY_GRID;

  return (
    <SectionFrame id="radar" eyebrow="Security Layer" dark>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-white">Threat Radar — 24h</h2>
          <p className="text-white/50">Attacks blocked by Guard Agent · categories × attack patterns</p>
        </div>
        <HeatmapGrid grid={grid} className="mb-6" />
        <p className="text-center text-xs font-mono text-white/20">
          Guard-blocked attacks: {grid.cells.flat().reduce((s, v) => s + v, 0)} (24h) · window: {grid.window_hours}h
        </p>
      </div>
    </SectionFrame>
  );
}