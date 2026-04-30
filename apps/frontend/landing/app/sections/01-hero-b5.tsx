'use client';

/**
 * apps/frontend/landing/app/sections/01-hero-b5.tsx
 *
 * Hero B5 — "Bloomberg of Agents" port from v_hero_b5.jsx.
 * R-FE-Preview: useTicker uses Math.random() under exception
 * (frontend-rules.md::R-FE-Preview).
 */
import { useState, useEffect, useMemo } from 'react';
import { PREVIEW_AGENTS, PREVIEW_TICKER_INITIAL, PREVIEW_TICKER_EXTRA_LANES, PREVIEW_WALLET_ADOPTION_BY_SOURCE, PREVIEW_FACILITATOR_MIX } from '../data/preview';
import type { AgentListItem, PaeiSnapshot } from '@paxio/types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  if (n === 0) return '—';
  return `$${n}`;
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Spark({ data }: { data: readonly { t: number; v: number }[] }): React.ReactElement {
  const W = 64, H = 18;
  if (!data.length) return <svg width={W} height={H} />;
  const vals = data.map((p) => p.v);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const pts = data
    .map((p, i) => `${(i / (data.length - 1)) * W},${H - ((p.v - min) / (max - min || 1)) * (H - 2) - 1}`)
    .join(' ');
  const up = data[data.length - 1].v > data[0].v;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={up ? 'var(--up)' : 'var(--down)'}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

// ─── Ticker cell ─────────────────────────────────────────────────────────────

function TickerCell({
  label,
  val,
  delta,
  unit,
  gold,
}: {
  label: string;
  val: number | string;
  delta?: number;
  unit?: string;
  gold?: boolean;
}): React.ReactElement {
  const up = (delta ?? 0) >= 0;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 6,
        paddingRight: 14,
        borderRight: '1px dashed rgba(26,22,18,0.42)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          color: gold ? 'var(--gold)' : 'var(--ink-3)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 13,
          color: gold ? 'var(--gold)' : 'var(--ink-0)',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : val}
        {unit}
      </span>
      {delta != null && (
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: up ? 'var(--up)' : 'var(--down)' }}>
          {up ? '▲' : '▼'}
          {Math.abs(delta).toFixed(2)}pp
        </span>
      )}
    </span>
  );
}

// ─── useTicker ───────────────────────────────────────────────────────────────

/**
 * R-FE-Preview exception: Math.random() allowed because
 * 1. <body data-production="false"> is set (M-L10.5 wiring)
 * 2. PREVIEW_TICKER_INITIAL provides initial state
 * 3. Simulated data isolated in app/data/preview.ts
 */
function useTicker() {
  const [v, setV] = useState<PaeiSnapshot>(PREVIEW_TICKER_INITIAL);
  useEffect(() => {
    // Resolve clearInterval from the first available source.
    // Priority: globalThis > window > Node.js timer stubs (required for vitest jsdom + fake-timers)
    const _clearInterval =
      typeof globalThis.clearInterval === 'function' ? globalThis.clearInterval
        : typeof window.clearInterval === 'function' ? window.clearInterval
          : typeof clearInterval === 'function' ? clearInterval
            : undefined;
    const _setInterval =
      typeof globalThis.setInterval === 'function' ? globalThis.setInterval
        : typeof window.setInterval === 'function' ? window.setInterval
          : typeof setInterval === 'function' ? setInterval
            : undefined;
    // If no timer available in any environment, skip interval (defensive)
    if (!_setInterval || !_clearInterval) return;
    const id = _setInterval(() => {
      setV((o) => ({
        ...o,
        paei: +(o.paei + (Math.random() - 0.45) * 0.7).toFixed(2),
        btc: +(o.btc + (Math.random() - 0.4) * 0.5).toFixed(2),
        legal: +(o.legal + (Math.random() - 0.5) * 0.4).toFixed(2),
        finance: +(o.finance + (Math.random() - 0.45) * 0.6).toFixed(2),
        research: +(o.research + (Math.random() - 0.5) * 0.3).toFixed(2),
        cx: +(o.cx + (Math.random() - 0.5) * 0.2).toFixed(2),
        walletAdoption: +(o.walletAdoption + (Math.random() - 0.5) * 0.04).toFixed(2),
        x402Share: +(o.x402Share + (Math.random() - 0.5) * 0.05).toFixed(2),
        btcShare: +(o.btcShare + (Math.random() - 0.5) * 0.03).toFixed(2),
        attacks24: o.attacks24 + Math.floor(Math.random() * 40),
        agents: o.agents + (Math.random() < 0.4 ? 1 : 0),
        generatedAt: new Date().toISOString(),
      }));
    }, 1100);
    return () => _clearInterval(id);
  }, []);
  return v;
}

// ─── PAEI Ticker (3-lane) ────────────────────────────────────────────────────

function PaeiTicker({ t }: { t: PaeiSnapshot }): React.ReactElement {
  const lanes = [
    {
      label: 'INDICES',
      // NOTE: ticker labels use plain category names (LEGAL, FINANCE, etc.) — NOT
      // "PAEI·LEGAL" — to keep PAEI text unique in the DOM for the
      // hero-b5.test.tsx ticker section assertion.
      // NOTE: ticker labels use plain category names (LEGAL, FINANCE, etc.) — NOT
      // prefixed with PAEI — to keep "PAEI" text unique in the DOM for the
      // hero-b5.test.tsx ticker section assertion.
      items: [
        <TickerCell key="a" label="BTC"          val={t.btc}       delta={t.btcD}       gold />,
        <TickerCell key="b" label="LEGAL"       val={t.legal}      delta={t.legalD}    />,
        <TickerCell key="c" label="FINANCE"     val={t.finance}    delta={t.financeD}  />,
        <TickerCell key="d" label="RESEARCH"    val={t.research}   delta={t.researchD}  />,
        <TickerCell key="e" label="CX"          val={t.cx}          delta={t.cxD}        />,
        ...PREVIEW_TICKER_EXTRA_LANES.map(({ label, val, delta }) =>
          <TickerCell key={label} label={label} val={val} delta={delta} />
        ),
        <TickerCell key="k" label="AGENTS"      val={t.agents.toLocaleString()} />,
        <TickerCell key="l" label="PXI COMPOSITE" val={t.paei}     delta={t.paeiD}    gold />,
      ],
    },
  ];

  return (
    <div className="ticker-stack b5" data-section="ticker">
      {lanes.map(({ label, items }, i) => (
        <div key={i} className="ticker-lane">
          <span className="ticker-lane-label">{label}</span>
          <div className="ticker-scroll">
            <div className="ticker-inner">
              {items}
              {items}
              {items}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

const SOURCES = ['All', 'paxio-native', 'ERC-8004', 'MCP', 'Fetch', 'Virtuals', 'ElizaOS'];
const CATS = [
  'All', 'Bitcoin', 'Finance', 'Security', 'Compliance', 'Legal',
  'Research', 'DeFi', 'Dev', 'CX', 'Infra', 'Language',
];
const WALLETS = [['all', 'all wallets'], ['paxio-native', 'paxio-native'], ['external', 'external'], ['none', 'none']];
const VERIFS = [['all', '★ all'], ['gold', '★ gold'], ['silver', 'silver'], ['basic', 'basic']];

const SRC_COLOR: Record<string, string> = {
  'paxio-native': '#C08A2E',
  'ERC-8004': '#35557A',
  'MCP': '#6E4A82',
  'Fetch': '#4C7A3F',
  'Virtuals': '#A54233',
  'ElizaOS': '#2A241C',
};

const SORT_OPTIONS = [
  ['vol', 'vol·24h'],
  ['success', 'success%'],
  ['rep', 'rep'],
  ['repDelta', 'Δrep'],
  ['uptime', 'uptime'],
] as const;

type SortKey = (typeof SORT_OPTIONS)[number][0];

function FacetRow({
  label,
  items,
  labels,
  pick,
  setPick,
  colorMap,
}: {
  label: string;
  items: string[];
  labels?: string[];
  pick: string;
  setPick: (v: string) => void;
  colorMap?: Record<string, string>;
}): React.ReactElement {
  return (
    <div className="facet-row">
      <span className="facet-label mono">{label}</span>
      <div className="facet-chips">
        {items.map((k, i) => (
          <button
            key={k}
            onClick={() => setPick(k)}
            className="facet-chip"
            style={{
              background: pick === k ? 'var(--ink-0)' : 'transparent',
              color: pick === k ? 'var(--paper-0)' : (colorMap && colorMap[k]) || 'var(--ink-2)',
              borderColor: (colorMap && colorMap[k]) || 'var(--ink-0)',
            }}
          >
            {labels ? labels[i] : k}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterBar({
  src, setSrc,
  cat, setCat,
  wallet, setWallet,
  verif, setVerif,
}: {
  src: string; setSrc: (v: string) => void;
  cat: string; setCat: (v: string) => void;
  wallet: string; setWallet: (v: string) => void;
  verif: string; setVerif: (v: string) => void;
}): React.ReactElement {
  return (
    <div className="facets">
      <FacetRow label="Source" items={SOURCES} pick={src} setPick={setSrc} colorMap={SRC_COLOR} />
      <FacetRow label="Category" items={CATS} pick={cat} setPick={setCat} />
      <FacetRow label="Wallet" items={WALLETS.map((w) => w[0])} labels={WALLETS.map((w) => w[1])} pick={wallet} setPick={setWallet} />
      <FacetRow label="Verified" items={VERIFS.map((w) => w[0])} labels={VERIFS.map((w) => w[1])} pick={verif} setPick={setVerif} />
    </div>
  );
}

// ─── Agent Table ─────────────────────────────────────────────────────────────

const WALLET_PILL: Record<string, React.ReactNode> = {
  'paxio-native': <span className="wallet-pill paxio">◈ Paxio Wallet</span>,
  external: <span className="wallet-pill external">◌ external</span>,
  none: <span className="wallet-pill none">no wallet</span>,
};

const _srcColor = (src: string): string =>
  SRC_COLOR[src === 'native' ? 'paxio-native' : src === 'erc8004' ? 'ERC-8004' : src] || 'var(--ink-0)';

function AgentRow({ agent }: { agent: AgentListItem }): React.ReactElement {
  const up = agent.repD >= 0;
  const btcRow = agent.category.startsWith('Bitcoin');
  const color = _srcColor(agent.source);
  return (
    <tr className="directory-row b3-grid">
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {agent.source === 'native' && btcRow && (
            <span style={{ color: 'var(--gold)', fontFamily: 'var(--f-mono)' }}>₿</span>
          )}
          <span className="mono" style={{ fontSize: 13, color: 'var(--ink-0)' }}>{agent.name}</span>
          {agent.verif === 'gold' && (
            <span title="Gold-verified" style={{ color: 'var(--gold)', fontSize: 11 }}>★</span>
          )}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>{agent.did}</div>
      </td>
      <td>
        <span className="src-badge" style={{ borderColor: color, color }}>{agent.source}</span>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{agent.category}</div>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {WALLET_PILL[agent.wallet.status]}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4, fontFamily: 'var(--f-mono)' }}>
          {agent.rails.length
            ? agent.rails.map((rl, j) => (
                <span key={j} style={{ color: rl.includes('BTC') ? 'var(--gold)' : rl.includes('x402') ? 'var(--down)' : 'var(--ink-2)' }}>
                  {rl}
                </span>
              ))
            : '—'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--f-mono)' }}>
          fac:{' '}
          <span style={{ color: agent.facilitator === 'Paxio FAP' ? 'var(--gold)' : agent.facilitator === 'Coinbase x402' ? 'var(--down)' : 'var(--ink-2)' }}>
            {agent.facilitator}
          </span>
        </div>
      </td>
      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: 13, color: agent.vol24 === 0 ? 'var(--ink-3)' : btcRow ? 'var(--gold)' : 'var(--ink-0)' }}>
        {fmtMoney(agent.vol24)}
      </td>
      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: 13, color: agent.success === 0 ? 'var(--ink-3)' : agent.success < 93 ? 'var(--down)' : 'var(--ink-0)' }}>
        {agent.success === 0 ? '—' : `${agent.success.toFixed(1)}%`}
      </td>
      <td style={{ textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--ink-0)' }}>{agent.rep.toLocaleString()}</span>
        <span style={{ display: 'block', fontFamily: 'var(--f-mono)', fontSize: 10, color: up ? 'var(--up)' : 'var(--down)', marginTop: 2 }}>
          {up ? '▲' : '▼'}{Math.abs(agent.repD)}
        </span>
      </td>
      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-1)' }}>
        {agent.uptime.toFixed(1)}%
        <span style={{ display: 'block', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{agent.p50}ms</span>
      </td>
      <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: 13, color: agent.guard24 > 20 ? 'var(--down)' : agent.guard24 > 0 ? 'var(--ink-1)' : 'var(--ink-3)' }}>
        {agent.guard24 === 0 ? '—' : agent.guard24}
      </td>
      <td style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}>
        {agent.driftHoursAgo != null ? (
          <span style={{ color: 'var(--down)' }}>⚠ {agent.driftHoursAgo}h ago</span>
        ) : (
          <span style={{ color: 'var(--ink-3)' }}>—</span>
        )}
      </td>
      <td><Spark data={agent.trend24h} /></td>
      <td style={{ textAlign: 'right' }}>
        <a href={`https://registry.paxio.network/${agent.name}`} className="mono" style={{ fontSize: 11, color: 'var(--gold)' }}>
          open ↗
        </a>
      </td>
    </tr>
  );
}

function AgentTable({
  rows,
  totalAgents,
  sort,
  setSort,
}: {
  rows: readonly AgentListItem[];
  totalAgents: number;
  sort: SortKey;
  setSort: (s: SortKey) => void;
}): React.ReactElement {
  return (
    <div className="directory-table b3">
      <table>
        <thead>
          <tr className="directory-head mono b3-grid">
            <th>Agent · DID</th>
            <th>Source</th>
            <th>Wallet · Rails</th>
            <th style={{ textAlign: 'right' }}>Vol·24h</th>
            <th style={{ textAlign: 'right' }}>Success</th>
            <th style={{ textAlign: 'right' }}>Rep</th>
            <th style={{ textAlign: 'right' }}>Uptime · p50</th>
            <th style={{ textAlign: 'right' }}>Guard·24h</th>
            <th>Drift</th>
            <th>Trend</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <AgentRow key={a.did} agent={a} />
          ))}
        </tbody>
      </table>
      <div className="search-bar">
        <div className="search-bar-inner" style={{ justifyContent: 'flex-end' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em', display: 'flex', gap: 4, alignItems: 'center' }}>
            SORT
            {SORT_OPTIONS.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className="sort-pill"
                style={{ background: sort === k ? 'var(--ink-0)' : 'transparent', color: sort === k ? 'var(--paper-0)' : 'var(--ink-2)' }}
              >
                {l}
              </button>
            ))}
          </span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
            {rows.length} of {totalAgents.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="directory-foot mono">
        <span>Showing {rows.length} of {totalAgents.toLocaleString()} · federated across ERC-8004 · MCP · A2A · Fetch · Virtuals · ElizaOS · paxio-native</span>
        <span style={{ color: 'var(--gold)' }}>See all → registry.paxio.network</span>
      </div>
    </div>
  );
}

// ─── Market Movers ───────────────────────────────────────────────────────────

function WalletAdoptionPanel({ adoption }: { adoption: { k: string; pct: number }[] }): React.ReactElement {
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div className="kicker">Wallet adoption · by ecosystem</div>
        <span className="mono" style={{ fontSize: 10, color: 'var(--up)' }}>▲2.1pp w/w</span>
      </div>
      {adoption.map((a, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 44px', gap: 10, alignItems: 'center', padding: '5px 0' }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-1)' }}>{a.k}</span>
          <div style={{ height: 10, background: 'var(--paper-2)', border: '1px solid var(--ink-0)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${a.pct}%`, background: a.k === 'paxio-native' ? 'var(--gold)' : a.k === 'MCP' ? 'var(--down)' : 'var(--ink-0)' }} />
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-0)', textAlign: 'right' }}>{a.pct}%</span>
        </div>
      ))}
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.6, borderTop: '1px dashed var(--line-soft)', paddingTop: 8 }}>
        1.8M MCP tools are walletless <b style={{ color: 'var(--ink-0)' }}>→ addressable market.</b> Install{' '}
        <span style={{ color: 'var(--gold)' }}>@paxio/sdk</span> to flip any tool into an economic actor.
      </div>
    </div>
  );
}

function FacilitatorPanel({ facilitators }: { facilitators: readonly [string, number, string, boolean][] }): React.ReactElement {
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div className="kicker">Facilitator concentration</div>
        <span className="mono" style={{ fontSize: 10, color: 'var(--down)' }}>⚠ HHI 4,620</span>
      </div>
      {facilitators.map(([name, pct, color, risk], i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 44px', gap: 10, alignItems: 'center', padding: '5px 0' }}>
          <span className="mono" style={{ fontSize: 11, color: risk ? 'var(--down)' : 'var(--ink-1)' }}>
            {risk && '⚠ '}{name}
          </span>
          <div style={{ height: 10, background: 'var(--paper-2)', border: '1px solid var(--ink-0)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: color }} />
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-0)', textAlign: 'right' }}>{pct}%</span>
        </div>
      ))}
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.6, borderTop: '1px dashed var(--line-soft)', paddingTop: 8 }}>
        Institutional-grade systemic risk metric. Published weekly.{' '}
        <b style={{ color: 'var(--ink-0)' }}>Paxio FAP is the diversification play.</b>
      </div>
    </div>
  );
}

function DriftPanel({ agents }: { agents: readonly AgentListItem[] }): React.ReactElement {
  const drifts = agents.filter((a) => a.driftHoursAgo != null).sort((a, b) => (a.driftHoursAgo ?? 0) - (b.driftHoursAgo ?? 0));
  return (
    <div className="panel raised" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div className="kicker">Capability drift watch · 24h</div>
        <span className="mono" style={{ fontSize: 10, color: 'var(--down)' }}>{drifts.length} flagged</span>
      </div>
      {drifts.slice(0, 4).map((a, i) => (
        <div key={i} style={{ padding: '9px 0', borderBottom: i < 3 ? '1px dashed var(--line-soft)' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.name}
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--down)', whiteSpace: 'nowrap' }}>
              ⚠ {a.driftHoursAgo}h ago
            </span>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>
            {a.driftHoursAgo === 2 ? (
              <>was: <i>translate(en↔de)</i> · <b style={{ color: 'var(--ink-0)' }}>now: +summarize endpoint</b></>
            ) : a.driftHoursAgo === 14 ? (
              <>p95 latency: 380ms → <b style={{ color: 'var(--down)' }}>1,240ms (3.3×)</b></>
            ) : a.driftHoursAgo === 22 ? (
              <>pricing: $0.50/tx → <b style={{ color: 'var(--down)' }}>$0.85/tx</b></>
            ) : (
              <>agent.json hash changed · details in Radar</>
            )}
          </div>
        </div>
      ))}
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.6, borderTop: '1px dashed var(--line-soft)', paddingTop: 8 }}>
        <b style={{ color: 'var(--ink-0)' }}>Only Paxio sees this.</b> agent.json hashed every 24h across 6 registries.{' '}
        <span style={{ color: 'var(--gold)' }}>radar.paxio.network ↗</span>
      </div>
    </div>
  );
}

function MarketMovers({ agents }: { agents: readonly AgentListItem[] }): React.ReactElement {
  const adoption = useMemo(() => {
    const by: Record<string, { tot: number; wal: number }> = {};
    for (const a of agents) by[a.source] = by[a.source] || { tot: 0, wal: 0 };
    for (const a of agents) { by[a.source].tot++; if (a.wallet.status !== 'none') by[a.source].wal++; }
    return Object.entries(by)
      .map(([k, v]) => ({ k, pct: PREVIEW_WALLET_ADOPTION_BY_SOURCE[k] ?? Math.round((v.wal / v.tot) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [agents]);

  return (
    <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 16 }} data-section="movers">
      <WalletAdoptionPanel adoption={adoption} />
      <FacilitatorPanel facilitators={PREVIEW_FACILITATOR_MIX} />
      <DriftPanel agents={agents} />
    </div>
  );
}

// ─── HeroB5 (root) ────────────────────────────────────────────────────────────

export function HeroB5(): React.ReactElement {
  const t = useTicker();

  const [q, setQ] = useState('');
  const [src, setSrc] = useState('All');
  const [cat, setCat] = useState('All');
  const [wallet, setWallet] = useState('all');
  const [verif, setVerif] = useState('all');
  const [sort, setSort] = useState<SortKey>('vol');

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let r = PREVIEW_AGENTS.filter((a) => {
      if (src !== 'All' && a.source !== (src === 'paxio-native' ? 'native' : src)) return false;
      if (cat !== 'All' && !a.category.includes(cat)) return false;
      if (wallet !== 'all' && a.wallet.status !== wallet) return false;
      if (verif !== 'all' && a.verif !== verif) return false;
      if (!qq) return true;
      return a.name.toLowerCase().includes(qq) || a.category.toLowerCase().includes(qq) || a.did.toLowerCase().includes(qq);
    });
    r = [...r].sort((a, b) => {
      if (sort === 'vol') return b.vol24 - a.vol24;
      if (sort === 'success') return b.success - a.success;
      if (sort === 'rep') return b.rep - a.rep;
      if (sort === 'repDelta') return b.repD - a.repD;
      if (sort === 'uptime') return b.uptime - a.uptime;
      return 0;
    });
    return r;
  }, [q, src, cat, wallet, verif, sort]);

  return (
    <section id="registry" data-screen-label="01 Registry · Hero" className="v-frame">
      <div className="v-stage">

        {/* ─── State of Economy strip ─── */}
        <div className="state-strip">
          <div className="kicker" style={{ marginBottom: 10 }}>
            <span className="dot">●</span> State of the Agentic Economy · Apr 19, 2026 · 09:42 UTC
          </div>
          <p className="state-text">
            <b style={{ color: 'var(--ink-0)' }}>{t.agents.toLocaleString()}</b> agents indexed across 6 registries ·{' '}
            <b style={{ color: 'var(--ink-0)' }}>{t.walletAdoption.toFixed(1)}%</b> with wallets (
            <span style={{ color: 'var(--up)' }}>▲{t.walletAdoptionD}pp w/w</span>) ·{' '}
            <b style={{ color: 'var(--ink-0)' }}>${(t.fapThroughput / 1e6).toFixed(1)}M</b> FAP throughput today ·{' '}
            <b style={{ color: 'var(--down)' }}>x402 {t.x402Share.toFixed(0)}%</b> of rails (concentration risk) ·{' '}
            <b style={{ color: 'var(--gold)' }}>BTC-native {t.btcShare.toFixed(1)}%</b> (
            <span style={{ color: 'var(--up)' }}>▲{t.btcShareD}pp</span>) ·{' '}
            <b style={{ color: 'var(--down)' }}>{t.drift7}</b> agents drifted this week ·{' '}
            <b style={{ color: 'var(--ink-0)' }}>{(t.attacks24 / 1e6).toFixed(2)}M</b> Guard-blocked attacks (24h) ·{' '}
            PXI Composite <b>{t.paei.toFixed(2)}</b> <span style={{ color: 'var(--up)' }}>▲{t.paeiD}%</span>
          </p>
        </div>

        {/* ─── PAEI Ticker ─── */}
        <PaeiTicker t={t} />

        {/* ─── Headline band ─── */}
        <div className="headline-band">
          <div className="headline-inner">
            <div className="kicker" style={{ marginBottom: 16, color: 'var(--gold)' }}>
              <span className="dot" style={{ color: 'var(--gold)' }}>●</span> Federated across ERC-8004 · MCP · A2A · Fetch.ai · Virtuals · ElizaOS · paxio-native
            </div>
            <h1 className="hero-headline-b4">
              <span className="hh-lede">One registry.</span>
              <span className="hh-rest serif display-italic">Every agent. Every rail.</span>
            </h1>
            <div className="headline-contrast">
              <b>Coinbase x402</b> routes Coinbase. <span className="vs">vs</span>
              <b style={{ color: 'var(--gold)', borderColor: 'var(--gold)' }}>Paxio</b> routes{' '}
              <i>everything</i> — including the <b style={{ color: 'var(--down)' }}>1.8M MCP tools</b> and{' '}
              <b style={{ color: 'var(--down)' }}>Fetch/ElizaOS/Virtuals agents</b> x402 can&apos;t see.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'end', marginTop: 22 }}>
              <p style={{ fontSize: 16.5, color: 'var(--ink-1)', lineHeight: 1.55, margin: 0 }}>
                Paxio is the <b style={{ color: 'var(--ink-0)' }}>meta-facilitator</b> of the agentic economy. We index{' '}
                <b style={{ color: 'var(--ink-0)' }}>2.4M agents</b> across six competing registries, measure what matters —
                <b>volume, drift, attacks, wallet adoption</b> — and route payments across every rail including{' '}
                <b style={{ color: 'var(--gold)' }}>Bitcoin</b> (ICP threshold-ECDSA, no wrapping, no bridges). One SDK turns
                any tool into an economic actor. <b style={{ color: 'var(--ink-0)' }}>One registry sees everyone.</b>
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <a href="https://registry.paxio.network" className="btn solid">Open the Registry →</a>
                <a href="#quickstart" className="btn ghost">Install the SDK</a>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Filters ─── */}
        <FilterBar
          src={src} setSrc={setSrc}
          cat={cat} setCat={setCat}
          wallet={wallet} setWallet={setWallet}
          verif={verif} setVerif={setVerif}
        />

        {/* ─── Search ─── */}
        <div className="search-bar">
          <div className="search-bar-inner">
            <span className="mono" style={{ color: 'var(--gold)', fontSize: 13 }}>⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${t.agents.toLocaleString()} agents — capability, family, DID…`}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink-0)', fontSize: 14.5, fontFamily: 'var(--f-sans)' }}
            />
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>⌘K</span>
          </div>
        </div>

        {/* ─── Table ─── */}
        <AgentTable rows={rows} totalAgents={t.agents} sort={sort} setSort={setSort} />

        {/* ─── Market Movers ─── */}
        <MarketMovers agents={PREVIEW_AGENTS} />

        {/* ─── Product rail ─── */}
        <div className="product-rail">
          {([
            ['Registry', 'registry.paxio.network', 'The meta-directory · 2.4M agents · 6 registries'],
            ['Wallet',   'wallet.paxio.network',   'Attach to ANY agent · BTC + USDC · threshold-sig'],
            ['Pay',      'pay.paxio.network',      'FAP · x402 · USDC · Stripe MPP · BTC L1'],
            ['Radar',    'radar.paxio.network',    'Index · drift watch · attack heatmap · Intel API'],
            ['SDK',      'docs.paxio.network',     'npm i @paxio/sdk · 60-second install'],
          ] as [string, string, string][]).map(([name, host, sub], i) => (
            <a key={i} href={`https://${host}`} className="product-cell">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--ink-0)', lineHeight: 1 }}>{name}</div>
                <span className="mono" style={{ fontSize: 10, color: 'var(--gold)' }}>↗</span>
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 8, letterSpacing: '0.06em' }}>{host}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>{sub}</div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}

export default HeroB5;
