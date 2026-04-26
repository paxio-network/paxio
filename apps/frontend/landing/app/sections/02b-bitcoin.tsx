import { SectionFrame } from '@paxio/ui';

const DEMO_LINES = [
  '→ register --did did:paxio:0x7f3a...B9e2',
  '→ attach-wallet --type btc+usdc',
  '→ expose --protocol x402',
  '✓ Agent 0x7f3a...B9e2 registered',
  '✓ Wallet threshold-ECDSA provisioned',
  '✓ x402 endpoint: https://agent.example/paid',
  '→ send-payment --to did:paxio:0x9c4d --amount 0.001 --rail BTC-L1',
  '✓ Payment routed via BTC L1 · tx: bc1qxz...',
  '→ check-reputation',
  'Reputation score: 847/1000 (+12, 7d)',
];

export function BitcoinSection() {
  return (
    <SectionFrame id="bitcoin" eyebrow="Trust Layer" dark>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-white">Bitcoin-Native Agent Payments</h2>
          <p className="text-white/50">
            Non-custodial BTC L1 via threshold ECDSA · DCA, Escrow, Streaming, Stake
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            {['Threshold ECDSA — 13-node signing', 'BTC L1 native payments', 'USDC multi-protocol (x402, MPP, Skyfire)', 'DCA · Escrow · Streaming · Stake'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[--color-bitcoin]" />
                <span className="text-white/70 font-mono text-sm">{f}</span>
              </div>
            ))}
          </div>
          <div
            data-testid="terminal-widget"
            className="h-auto border border-[var(--color-bitcoin)]/30 rounded-xl bg-black/50 p-5 font-mono text-sm"
          >
            <div className="text-[var(--color-bitcoin)] mb-3 font-bold">paxio --wallet btc</div>
            {DEMO_LINES.map((line, i) => (
              <div key={i} className={line.startsWith('✓') ? 'text-green-400' : 'text-white/60'}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}