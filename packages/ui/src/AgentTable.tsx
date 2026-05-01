import type { AgentPreview } from '@paxio/types';
import { AGENT_SOURCE_LABELS } from '@paxio/types';
import { Sparkline } from './Sparkline';

interface AgentTableProps {
  agents: AgentPreview[];
  className?: string;
}

const VERIFICATION_COLORS = {
  gold: 'text-[--color-bitcoin]',
  silver: 'text-white/60',
  basic: 'text-white/40',
  none: 'text-white/20',
} as const;

const SOURCE_COLORS: Record<string, string> = {
  'paxio-native': '#0F766E',
  'ERC-8004': '#533483',
  'MCP': '#0F3460',
  'Fetch.ai': '#D97706',
  'Virtuals': '#1E3A5F',
  'ElizaOS': '#166534',
  'A2A': '#991B1B',
};

function shorten(did: string): string {
  if (did.length <= 20) return did;
  return `${did.slice(0, 10)}…${did.slice(-6)}`;
}

export function AgentTable({ agents, className }: AgentTableProps) {
  if (!agents.length) return null;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-white/10 text-white/30 uppercase tracking-widest">
            <th className="p-2 text-left">Agent</th>
            <th className="p-2 text-left">Source</th>
            <th className="p-2 text-left">Category</th>
            <th className="p-2 text-left">Reputation</th>
            <th className="p-2 text-left">24h Volume</th>
            <th className="p-2 text-left">Success</th>
            <th className="p-2 text-left">Uptime</th>
            <th className="p-2 text-left">P50 Latency</th>
            <th className="p-2 text-left">Rails</th>
            <th className="p-2 text-left">Sparkline</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.did} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-${VERIFICATION_COLORS[agent.verification].replace('text-', '')}`} />
                  <div>
                    <div className="text-white/90">{agent.name}</div>
                    <div className="text-white/30 text-[10px]">{shorten(agent.did)}</div>
                  </div>
                </div>
              </td>
              <td className="p-2">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: `${SOURCE_COLORS[AGENT_SOURCE_LABELS[agent.source] ?? agent.source] ?? '#333'}33`, color: SOURCE_COLORS[AGENT_SOURCE_LABELS[agent.source] ?? agent.source] ?? '#fff' }}
                >
                  {AGENT_SOURCE_LABELS[agent.source] ?? agent.source}
                </span>
              </td>
              <td className="p-2 text-white/60">{agent.category}</td>
              <td className="p-2">
                <span className={agent.reputation >= 700 ? 'text-[--color-green]' : agent.reputation >= 400 ? 'text-white/70' : 'text-white/40'}>
                  {agent.reputation}
                </span>
                {agent.reputation_delta !== 0 && (
                  <span className={`ml-1 text-[10px] ${agent.reputation_delta > 0 ? 'text-[--color-green]' : 'text-[--color-red]'}`}>
                    {agent.reputation_delta > 0 ? '+' : ''}{agent.reputation_delta}
                  </span>
                )}
              </td>
              <td className="p-2 text-white/70">
                {agent.vol_24h_usd > 0 ? `$${agent.vol_24h_usd.toLocaleString()}` : '—'}
              </td>
              <td className="p-2">
                <span className={agent.success_pct >= 95 ? 'text-[--color-green]' : agent.success_pct >= 80 ? 'text-white/70' : 'text-[--color-red]'}>
                  {agent.success_pct.toFixed(0)}%
                </span>
              </td>
              <td className="p-2">
                <span className={agent.uptime_pct >= 99 ? 'text-[--color-green]' : agent.uptime_pct >= 90 ? 'text-white/70' : 'text-[--color-bitcoin]'}>
                  {agent.uptime_pct.toFixed(1)}%
                </span>
              </td>
              <td className="p-2 text-white/50">{agent.latency_p50_ms}ms</td>
              <td className="p-2">
                <div className="flex gap-1 flex-wrap">
                  {agent.rails.map(rail => (
                    <span key={rail} className="text-[10px] px-1 py-0.5 rounded bg-white/5 text-white/40">{rail}</span>
                  ))}
                </div>
              </td>
              <td className="p-2">
                <Sparkline seed={agent.sparkline_seed} width={80} height={24} color="#533483" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}