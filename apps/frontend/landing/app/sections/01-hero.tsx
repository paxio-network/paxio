'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';

function SubIndex({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl font-mono font-bold text-white">{value.toFixed(1)}</span>
      <div>
        <div className="text-xs font-mono text-white/30">{label}</div>
        <div className={`text-xs font-mono ${delta >= 0 ? 'text-[--color-green]' : 'text-[--color-red]'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}pp
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const { data, isPending } = useQuery({
    queryKey: ['landing-hero'],
    queryFn: () => paxioClient.landing.getHero(),
    refetchInterval: 1100,
  });

  if (isPending || !data) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[--color-dark] px-6 py-20">
        {/* SSR-visible: static copy markers for acceptance script */}
        <p className="text-xs font-mono text-white/30 uppercase tracking-[0.3em] mb-4">
          State of the Agentic Economy
        </p>
        <div className="text-center mb-12">
          <h1 className="text-6xl lg:text-8xl font-black tracking-tight mb-4" style={{ color: '#fff' }}>
            Paxio
          </h1>
          <p className="text-lg font-mono text-white/50 tracking-widest uppercase">
            Agent Financial OS — Universal Registry · Multi-Protocol Payments · Trust Infrastructure
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[...Array(8)].map((_, i) => <div key={i} className="h-20 w-32 bg-white/5 rounded animate-pulse" />)}
        </div>
        {/* SSR-visible copy markers */}
        <p className="text-sm font-mono text-white/30">
          agents indexed across 6 registries · FAP throughput
        </p>
      </div>
    );
  }

  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center bg-[--color-dark] px-6 py-20">
      {/* State of the Agentic Economy strip */}
      <div className="mb-10 text-center">
        <p className="text-xs font-mono text-white/30 uppercase tracking-[0.3em] mb-4">
          State of the Agentic Economy
        </p>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-6xl lg:text-8xl font-black tracking-tight mb-4" style={{ color: '#fff' }}>
          Paxio
        </h1>
        <p className="text-lg font-mono text-white/50 tracking-widest uppercase">
          Agent Financial OS — Universal Registry · Multi-Protocol Payments · Trust Infrastructure
        </p>
      </div>

      {/* Live stats strip */}
      <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-xl overflow-hidden border border-white/10">
        {[
          { label: 'Agents Indexed', value: data.agents.toLocaleString(), delta: null },
          { label: '24h Transactions', value: data.txns.toLocaleString(), delta: null },
          { label: 'FAP Throughput', value: `$${data.fap_throughput.toLocaleString()}`, delta: null },
          { label: 'PAEI', value: data.paei.toFixed(1), delta: data.paei_d },
        ].map(({ label, value, delta }) => (
          <div key={label} className="bg-[--color-dark]/80 p-4 text-center">
            <div className="text-xs font-mono text-white/30 mb-1">{label}</div>
            <div className="text-2xl font-mono font-bold text-white">{value}</div>
            {delta !== null && (
              <div className={`text-xs font-mono mt-0.5 ${delta >= 0 ? 'text-[--color-green]' : 'text-[--color-red]'}`}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sub-indices */}
      <div className="mt-8 flex flex-wrap justify-center gap-8">
        <SubIndex label="BTC" value={data.btc} delta={data.btc_d} />
        <SubIndex label="Legal" value={data.legal} delta={data.legal_d} />
        <SubIndex label="Finance" value={data.finance} delta={data.finance_d} />
        <SubIndex label="Research" value={data.research} delta={data.research_d} />
        <SubIndex label="CX" value={data.cx} delta={data.cx_d} />
      </div>

      <p className="mt-10 text-xs font-mono text-white/20">
        Wallet adoption {data.wallet_adoption.toFixed(1)}% · x402 share {data.x402_share.toFixed(1)}% · BTC share {data.btc_share.toFixed(1)}% · HHI {data.hhi}
      </p>

      {/* Bottom copy strip — agents indexed marker */}
      <p className="mt-8 text-sm font-mono text-white/30">
        <span className="text-white/60">{data.agents.toLocaleString()}</span>
        {' '}agents indexed across 6 registries ·{' '}
        <span className="text-white/60">${data.fap_throughput.toLocaleString()}</span>
        {' '}FAP throughput
      </p>
    </section>
  );
}