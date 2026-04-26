'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';

function StateStrip() {
  // Build a realistic-looking timestamp from current UTC time
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false });

  return (
    <div className="inline-flex items-center gap-3 px-5 py-2 border border-[var(--color-rule)] rounded-full bg-[var(--color-bg1)] mb-12">
      <span className="text-[var(--color-gold)] font-mono text-xs font-bold tracking-widest uppercase">
        State of the Agentic Economy
      </span>
      <span className="text-[var(--color-ink1)] font-mono text-xs">·</span>
      <span className="text-[var(--color-ink1)] font-mono text-xs">{dateStr}</span>
      <span className="text-[var(--color-ink1)] font-mono text-xs">·</span>
      <span className="text-[var(--color-ink1)] font-mono text-xs">{timeStr} UTC</span>
    </div>
  );
}

function MetricCard({ label, value, delta }: { label: string; value: number; delta?: number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-5 border border-[var(--color-rule)] rounded-xl bg-[var(--color-bg1)] min-w-36">
      <span className="font-mono text-xs text-[var(--color-ink1)] uppercase tracking-widest">{label}</span>
      <span className="font-mono text-3xl font-bold text-[var(--color-ink0)]">
        {value.toLocaleString()}
      </span>
      {delta !== undefined && (
        <span className={`font-mono text-xs ${delta >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}pp
        </span>
      )}
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
      <section className="min-h-[80vh] flex flex-col items-center justify-center bg-[var(--color-bg0)] px-6 py-20">
        <StateStrip />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 w-36 bg-[var(--color-bg1)] border border-[var(--color-rule)] rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center bg-[var(--color-bg0)] px-6 py-20 text-center">
      <StateStrip />

      {/* Hero heading */}
      <div className="mb-12">
        <h1 className="text-7xl lg:text-9xl font-black tracking-tighter text-[var(--color-ink0)] mb-4">
          Paxio
        </h1>
        <p className="text-sm font-mono text-[var(--color-ink1)] tracking-widest uppercase">
          Agent Financial OS — Universal Registry · Multi-Protocol Payments · Trust Infrastructure
        </p>
      </div>

      {/* Main metrics strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="agents indexed" value={data.agents} />
        <MetricCard label="24h Transactions" value={data.txns} />
        <MetricCard label="FAP throughput" value={data.fap_throughput} delta={data.paei_d} />
        <MetricCard label="PAEI Index" value={data.paei} delta={data.paei_d} />
      </div>

      {/* Sub-indices row */}
      <div className="flex flex-wrap justify-center gap-6 mb-6">
        {[
          { label: 'BTC', value: data.btc, delta: data.btc_d },
          { label: 'Legal', value: data.legal, delta: data.legal_d },
          { label: 'Finance', value: data.finance, delta: data.finance_d },
          { label: 'Research', value: data.research, delta: data.research_d },
          { label: 'CX', value: data.cx, delta: data.cx_d },
        ].map(({ label, value, delta }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold text-[var(--color-ink0)]">{value.toFixed(1)}</span>
            <div>
              <div className="text-xs font-mono text-[var(--color-ink1)]">{label}</div>
              <div className={`text-xs font-mono ${delta >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}pp
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom state text — must contain "agents indexed" marker */}
      <p className="text-xs font-mono text-[var(--color-ink1)]">
        <span className="text-[var(--color-ink0)] font-bold">{data.agents.toLocaleString()}</span>{' '}
        agents indexed across 6 registries ·{' '}
        <span className="text-[var(--color-ink0)] font-bold">{data.wallet_adoption.toFixed(1)}%</span>{' '}
        with wallets ·{' '}
        <span className="text-[var(--color-ink0)] font-bold">{data.x402_share.toFixed(1)}%</span>{' '}
        via x402 ·{' '}
        <span className="text-[var(--color-ink0)] font-bold">{data.btc_share.toFixed(1)}%</span>{' '}
        BTC native · HHI{' '}
        <span className="text-[var(--color-ink0)] font-bold">{data.hhi.toLocaleString()}</span>
      </p>

      {/* Ticker lanes below main strip (ticker strip from LiveTicker lives at top of page) */}
    </section>
  );
}