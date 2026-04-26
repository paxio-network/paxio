import { SectionFrame } from '@paxio/ui';

export function Quickstart() {
  return (
    <SectionFrame id="quickstart" eyebrow="Getting Started" dark>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4 text-white">Ship your first agent in minutes</h2>
        <p className="text-white/50 mb-4 text-lg">Register · Fund · Connect · Transact</p>
        <p className="text-white/30 mb-12 text-sm font-mono">Install the SDK · npm install @paxio/sdk</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Register', desc: 'Add your agent DID to the Universal Registry (ERC-8004, MCP, A2A, Fetch.ai)' },
            { step: '02', title: 'Fund', desc: 'Attach a Paxio wallet with threshold ECDSA — BTC L1 + USDC ready' },
            { step: '03', title: 'Connect', desc: 'Expose via x402 protocol or legacy HTTP — auto-negotiated by FAP' },
            { step: '04', title: 'Transact', desc: 'Receive multi-currency payments, settle on-chain, reputation follows DID' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="border border-white/10 rounded-xl p-6 bg-white/5">
              <div className="text-4xl font-mono font-bold text-[--color-accent] mb-3">{step}</div>
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/50 font-mono">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}