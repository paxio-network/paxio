'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';
import { FAPDiagram } from '@paxio/ui';
import type { RailInfo } from '@paxio/types';
import { SectionFrame } from '@paxio/ui';

const DEFAULT_RAILS: RailInfo[] = [
  { name: 'Paxio FAP', share_pct: 0, latency_ms: 0, fee_description: '0.18%', color_hex: '#533483', concentration_risk: false },
  { name: 'Coinbase x402', share_pct: 0, latency_ms: 0, fee_description: '0.10%', color_hex: '#0F766E', concentration_risk: false },
  { name: 'Skyfire', share_pct: 0, latency_ms: 0, fee_description: '1.9%+$0.30', color_hex: '#D97706', concentration_risk: false },
  { name: 'BTC L1', share_pct: 0, latency_ms: 0, fee_description: 'flat sat fee', color_hex: '#1E3A5F', concentration_risk: false },
];

export function Pay() {
  const { data } = useQuery({
    queryKey: ['landing-rails'],
    queryFn: () => paxioClient.landing.getRails(),
    staleTime: 10_000,
  });

  const rails = data ?? DEFAULT_RAILS;

  return (
    <SectionFrame id="pay" eyebrow="Payment Layer" dark>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-white">Meta-Facilitator — Multi-Rail Routing</h2>
          <p className="text-white/50">FAP routes payments across x402, MPP, Skyfire, TAP, BTC L1</p>
        </div>
        <FAPDiagram rails={rails} className="mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {rails.slice(0, 4).map(r => (
            <div key={r.name} className="border border-white/10 rounded-lg p-4 bg-white/5">
              <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: r.color_hex }} />
              <div className="text-sm font-mono text-white/70">{r.name}</div>
              <div className="text-xs font-mono text-white/30 mt-1">{r.fee_description}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}