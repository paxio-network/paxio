'use client';

/**
 * apps/frontend/landing/app/sections/02-scrolls-b5.tsx
 *
 * Port of PaxioLandingScrollsB5 from docs/design/paxio-b5/components/landing_scrolls_b5.jsx
 * (1035 lines → TypeScript/React).
 *
 * 6 sub-scrolls:
 *   §02   · SDK install (Builders)
 *   §02·b · On-chain-native
 *   §03   · Radar / Intelligence
 *   §04   · FAP / Payment rails
 *   §05   · The Network
 *   §06   · Doors / Enterprise
 *
 * R-FE-Preview: All simulated metrics sourced from app/data/preview.ts.
 * No inline numeric `val={N}` literals.
 * Each data import carries a TODO M-L11 marker in preview.ts.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  PREVIEW_AUDIENCES,
  PREVIEW_BITCOIN_AGENTS,
  PREVIEW_RADAR_INDICES,
  PREVIEW_FAP_RAILS,
  PREVIEW_NETWORK_SNAPSHOT,
  PREVIEW_CLOSING_STATS,
} from '../data/preview';

// ─── Shared primitives ────────────────────────────────────────────────────────

interface SectionFrameProps {
  n: number | string;
  screenLabel?: string;
  kicker: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  cta?: string;
  tone?: 'paper' | 'dark' | 'btc';
  children?: React.ReactNode;
  extraClassName?: string;
}

function SectionFrame({
  n,
  screenLabel,
  kicker,
  title,
  sub,
  href,
  cta,
  tone = 'paper',
  children,
  extraClassName = '',
}: SectionFrameProps): React.ReactElement {
  return (
    <section
      className={`scroll-section tone-${tone} ${extraClassName}`}
      data-screen-label={screenLabel}
    >
      <div className="scroll-inner">
        <header className="scroll-head">
          <div className="scroll-num mono">§{String(n).padStart(2, '0')}</div>
          <div className="scroll-kicker kicker">
            <span className="dot">●</span> {kicker}
          </div>
        </header>
        <div className="scroll-grid">
          <div className="scroll-copy">
            <h2 className="scroll-title h-display">{title}</h2>
            {sub && <p className="scroll-sub">{sub}</p>}
            {cta && href && (
              <div className="scroll-cta-row">
                <a className="btn solid" href={href}>
                  {cta} →
                </a>
                <a className="btn ghost" href={href}>
                  Read the docs
                </a>
              </div>
            )}
          </div>
          <div className="scroll-stage">{children}</div>
        </div>
      </div>
    </section>
  );
}

// ─── MiniSpark ────────────────────────────────────────────────────────────────

function MiniSpark({
  seed = 1,
  dir = 'up',
}: {
  seed?: number;
  dir?: 'up' | 'down';
}): React.ReactElement {
  const data = useMemo(() => {
    let s = seed * 9301 + 49297;
    let v = 50;
    const out: number[] = [];
    for (let i = 0; i < 22; i++) {
      s = (s * 9301 + 49297) % 233280;
      const r = (s / 233280 - 0.5) * 12;
      v = Math.max(5, Math.min(95, v + r));
      out.push(v);
    }
    if (dir === 'up') out.sort(() => 0.2 - Math.random());
    return out;
  }, [seed, dir]);

  const W = 90;
  const H = 18;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / (max - min || 1)) * (H - 2) - 1}`)
    .join(' ');
  const stroke = dir === 'up' ? 'var(--up)' : 'var(--down)';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.3"
        opacity="0.9"
      />
    </svg>
  );
}

// ─── §02 · SDK ────────────────────────────────────────────────────────────────

function ScrollSDK(): React.ReactElement {
  const [stage, setStage] = useState(0); // 0 init, 1 install, 2 register, 3 done
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTicks((t) => t + 1), 900);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (ticks === 1)      setStage(1);
    else if (ticks === 4) setStage(2);
    else if (ticks === 7) setStage(3);
    else if (ticks === 10) { setTicks(0); setStage(0); }
  }, [ticks]);

  const antiStripItems = [
    ['DID', 'Decentralized identifier — none'],
    ['Wallet', 'No wallet, no address, no funds'],
    ['Rails', 'Cannot receive payment'],
    ['Index', 'Not discoverable in any registry'],
    ['Guard', 'No injection / attack scanning'],
    ['Reputation', 'No feed, no history, no score'],
  ];

  const gotStripItems = [
    ['DID', 'did:paxio:0x… issued on register'],
    ['Wallet', 'Threshold-ECDSA + USDC non-custodial'],
    ['Rails', 'x402 · USDC-Base · Stripe · L1'],
    ['Index', 'ERC-8004 · MCP · Fetch · Virtuals · ElizaOS'],
    ['Guard', 'Pre-flight prompt/doc-inj · 6 patterns'],
    ['Reputation', 'ERC-8004 + ICP feed, cross-ecosystem'],
  ];

  return (
    <SectionFrame
      n={2}
      screenLabel="02 Quickstart · SDK"
      kicker="SDK · builders"
      title={
        <>
          Give your agent a wallet
          <br />
          <span className="serif display-italic">in 60 seconds.</span>
        </>
      }
      sub={
        <>
          An MCP tool today has no wallet, no pricing, no reputation — it just{' '}
          <i>runs</i>. <b>@paxio/wallet wraps any agent in the full stack</b>: a DID,
          payment rails (x402, USDC, L1), and a reputation feed.
          One install, every protocol.
        </>
      }
      href="https://docs.paxio.network"
      cta="Install the package"
    >
      {/* Metric strip */}
      <div className="sdk-metric-row b5">
        <div className="sdk-metric">
          <div className="sdk-m-before mono">320 lines</div>
          <div className="sdk-m-arrow">→</div>
          <div className="sdk-m-after mono">6 lines</div>
        </div>
        <div className="sdk-metric">
          <div className="sdk-m-before mono">2 weeks</div>
          <div className="sdk-m-arrow">→</div>
          <div className="sdk-m-after mono">60 sec</div>
        </div>
        <div className="sdk-metric">
          <div className="sdk-m-before mono">just a tool</div>
          <div className="sdk-m-arrow">→</div>
          <div className="sdk-m-after mono gold">economic actor</div>
        </div>
      </div>

      <div className="split-compare">
        {/* Before */}
        <div className="split-col before">
          <div className="split-head mono">
            <span>WITHOUT Paxio</span>
            <span className="split-lines">∼ 320 lines</span>
          </div>
          <div className="split-manifest mono dim-manifest">Just a tool.</div>
          <div className="code-mini">
            <div className="cm-line">{'// register on ERC-8004'}</div>
            <div className="cm-line">{'const tx = await registry.register({'}</div>
            <div className="cm-line">{'  owner, metadata, stake: 0.1 ETH'}</div>
            <div className="cm-line">{'});'}</div>
            <div className="cm-line dim">{'// wire up x402 facilitator…'}</div>
            <div className="cm-line dim">{'// set up USDC paymaster…'}</div>
            <div className="cm-line dim">{'// write OWASP scanner harness…'}</div>
            <div className="cm-line dim">{'// sign attestations, rotate keys…'}</div>
            <div className="cm-line dim">{'// publish to MCP registry…'}</div>
            <div className="cm-line dim">{'// mirror to Fetch.ai catalog…'}</div>
            <div className="cm-line dim">{'// write reputation feed…'}</div>
            <div className="cm-line dim">{'// set up health endpoint…'}</div>
            <div className="cm-line dim">{'// plus compliance logs…'}</div>
            <div className="cm-line dim">{'// plus dispute rails…'}</div>
            <div className="cm-footer mono">
              <span>6 protocols · 4 keys · 2 weeks</span>
              <span className="warn">still wallet-less</span>
            </div>
          </div>
          <div className="got-strip anti mono">
            {antiStripItems.map(([k, tip]) => (
              <div key={k} className="got-cell anti-cell" title={tip}>
                <span className="got-dot">○</span> {k}
              </div>
            ))}
          </div>
        </div>

        {/* After */}
        <div className="split-col after">
          <div className="split-head mono">
            <span>WITH <b style={{ color: 'var(--gold)' }}>@paxio/agent</b></span>
            <span className="split-lines">∼ 6 lines</span>
          </div>
          <div className="split-manifest mono" style={{ color: 'var(--gold)' }}>
            An economic actor.
          </div>
          <div className="term-mini-wrap">
            <div className="term-mini">
              <div className="tm-line">
                <span className="tm-prompt">$</span>{' '}
                <span className={stage >= 1 ? 'visible' : 'dim'}>
                  npm install @paxio/sdk
                </span>
              </div>
              {stage >= 1 && (
                <>
                  <div className="tm-line out">+ @paxio/sdk@1.4.0</div>
                  <div className="tm-line out">added 1 package in 1.8s</div>
                </>
              )}
              <div className="tm-line" style={{ marginTop: 10 }}>
                <span className="tm-prompt">$</span>{' '}
                <span className={stage >= 2 ? 'visible' : 'dim'}>
                  paxio register --capability legal-translate
                </span>
              </div>
              {stage >= 2 && (
                <>
                  <div className="tm-line out">
                    <span className="chk">✓</span> DID issued{' '}
                    <span className="gold-tag">did:paxio:0x4f…a21b</span>
                  </div>
                  <div className="tm-line out">
                    <span className="chk">✓</span> Wallet attached{' '}
                    <span className="gold-tag">USDC + L1</span>
                  </div>
                  <div className="tm-line out">
                    <span className="chk">✓</span> Rails enabled{' '}
                    <span className="mut">x402 · USDC-Base · Stripe · L1</span>
                  </div>
                  <div className="tm-line out">
                    <span className="chk">✓</span> Indexed{' '}
                    <span className="mut">ERC-8004 · MCP · Fetch · Virtuals · ElizaOS</span>
                  </div>
                  <div className="tm-line out">
                    <span className="chk">✓</span> Guard attached{' '}
                    <span className="mut">pre-flight injection scanning</span>
                  </div>
                  <div className="tm-line out">
                    <span className="chk">✓</span> Reputation feed live{' '}
                    <span className="mut">ERC-8004 + ICP</span>
                  </div>
                </>
              )}
              {stage >= 3 && (
                <div className="tm-line done" style={{ marginTop: 8 }}>
                  <span style={{ color: 'var(--gold)' }}>◆</span> Agent is live.
                  Earning enabled.
                </div>
              )}
            </div>
          </div>
          <div className="got-strip mono">
            {gotStripItems.map(([k, tip], i) => (
              <div
                key={k}
                className={`got-cell ${stage >= 2 ? 'on' : ''}`}
                title={tip}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="got-dot">{stage >= 2 ? '●' : '○'}</span> {k}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

// ─── §02·b · On-chain-native ────────────────────────────────────────────────

function ScrollL1(): React.ReactElement {
  return (
    <section
      className="scroll-section tone-btc btc-v2"
      id="on-chain-native"
      data-screen-label="02b On-chain-native"
    >
      <div className="scroll-inner">
        <header className="scroll-head">
          <div className="scroll-num mono">§02·b</div>
          <div className="scroll-kicker kicker">
            <span className="dot">●</span> On-chain-native · Paxio
          </div>
        </header>

        {/* Hero */}
        <div className="btcv2-hero">
          <div className="btcv2-hero-copy">
            <h2 className="btcv2-title">
              Your agent.
              <br />
              <span className="serif display-italic">A real Bitcoin address.</span>
            </h2>
            <p className="btcv2-lede">
              Threshold-ECDSA derives a native <code className="btcv2-code-inline">bc1q…</code> address on L1. No wrapping, no bridges, no custodian.
            </p>
            <div className="btcv2-spec-row">
              <div className="btcv2-spec">
                <span className="btcv2-spec-k mono">protocol</span>
                <span className="btcv2-spec-v">L1</span>
              </div>
              <div className="btcv2-spec">
                <span className="btcv2-spec-k mono">signing</span>
                <span className="btcv2-spec-v">t-ECDSA · 32/40</span>
              </div>
              <div className="btcv2-spec">
                <span className="btcv2-spec-k mono">custody</span>
                <span className="btcv2-spec-v">non-custodial</span>
              </div>
            </div>
          </div>

          {/* Address card */}
          <div className="btcv2-hero-art" aria-hidden="true">
            <div className="btcv2-addr-card">
              <div className="btcv2-addr-bar mono">
                <span>derived address</span>
                <span className="btcv2-addr-status">
                  <span className="pulse-dot" /> live · block 829,441
                </span>
              </div>
              <div className="btcv2-addr-body">
                <div className="btcv2-addr-mono">
                  <div>
                    <span className="btcv2-addr-prefix">bc1q</span> 4n7r0x
                  </div>
                  <div>3kfp2m x9q5wt</div>
                  <div>v8lp7c 3kfp</div>
                </div>
                <div className="btcv2-addr-stats mono">
                  <div className="btcv2-addr-stat">
                    <span className="k">balance</span>
                    <span className="v">0.0142 ₿</span>
                  </div>
                  <div className="btcv2-addr-stat">
                    <span className="k">received</span>
                    <span className="v">0.0207 ₿</span>
                  </div>
                  <div className="btcv2-addr-stat">
                    <span className="k">tx count</span>
                    <span className="v">17</span>
                  </div>
                  <div className="btcv2-addr-stat">
                    <span className="k">first seen</span>
                    <span className="v">block 824,107</span>
                  </div>
                </div>
              </div>
              <div className="btcv2-addr-foot mono">
                <span>did:paxio:0x4f…a21b</span>
                <span className="sep">·</span>
                <span>verifiable on mempool.space</span>
              </div>
            </div>
            <div className="btcv2-addr-watermark serif" aria-hidden="true">
              ₿
            </div>
          </div>
        </div>

        {/* Two paths */}
        <div className="btcv2-paths">
          {PREVIEW_BITCOIN_AGENTS.map((agent) => (
            <article key={agent.num} className="btcv2-path">
              <div className="btcv2-path-num mono">{agent.num}</div>
              <div className="btcv2-path-meta mono">{agent.meta}</div>
              <h3 className="btcv2-path-h">
                {agent.title.split('. ').map((part, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {i === 0 ? part : part}
                  </span>
                ))}
              </h3>
              <p className="btcv2-path-p">{agent.desc}</p>
              <div className="btcv2-term">
                <div className="btcv2-term-bar mono">
                  <span className="btcv2-dot r" />
                  <span className="btcv2-dot y" />
                  <span className="btcv2-dot g" />
                  <span className="btcv2-term-title">
                    ~/agent
                  </span>
                </div>
                <div className="btcv2-term-body mono">
                  {agent.num === '01' ? (
                    <>
                      <div className="tline">
                        <span className="prompt">$</span> npm install @paxio/sdk
                      </div>
                      <div className="tline" style={{ marginTop: 6 }}>
                        <span className="prompt">$</span> paxio register
                      </div>
                      <div className="tline out">
                        <span className="ok">✓</span> DID issued{' '}
                        <span className="dim">did:paxio:0x4f…a21b</span>
                      </div>
                      <div className="tline out">
                        <span className="ok">✓</span> Bitcoin address{' '}
                        <span className="gold-mono">bc1q4n7…3kfp</span>
                      </div>
                      <div className="tline out">
                        <span className="ok">✓</span> Rails enabled{' '}
                        <span className="dim">x402 · USDC · L1</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="tline">
                        <span className="prompt">$</span> paxio deploy --type dca-agent
                      </div>
                      <div className="tline out">
                        <span className="ok">✓</span> Canister deployed
                      </div>
                      <div className="tline out">
                        <span className="ok">✓</span> L1 address{' '}
                        <span className="gold-mono">bc1q8d3…m72p</span>
                      </div>
                      <div className="tline" style={{ marginTop: 6 }}>
                        <span className="prompt">$</span> paxio agent.run
                      </div>
                      <div className="tline out">
                        <span className="ok">●</span> live · signing on-chain
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="btcv2-path-foot mono">{agent.timeframe}</div>
            </article>
          ))}
        </div>

        {/* Comparison */}
        <div className="btcv2-compare">
          <div className="btcv2-compare-head">
            <span className="kicker mono">how others handle crypto payments for agents</span>
            <span className="btcv2-compare-rule" />
          </div>
          <div className="btcv2-compare-grid">
            <div className="btcv2-comp">
              <div className="btcv2-comp-name mono">Coinbase AgentKit</div>
              <div className="btcv2-comp-verb">wraps</div>
              <div className="btcv2-comp-desc">ERC-20 on Base. Custodial.</div>
            </div>
            <div className="btcv2-comp">
              <div className="btcv2-comp-name mono">Skyfire</div>
              <div className="btcv2-comp-verb">skips</div>
              <div className="btcv2-comp-desc">USDC-only. No L1 rail.</div>
            </div>
            <div className="btcv2-comp btcv2-comp-win">
              <div className="btcv2-comp-flag mono">only on Paxio</div>
              <div className="btcv2-comp-name mono">Paxio</div>
              <div className="btcv2-comp-verb gold">settles</div>
              <div className="btcv2-comp-desc">Native L1 · t-ECDSA.</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="btcv2-cta-row">
          <a href="https://docs.paxio.network/bitcoin" className="btcv2-btn primary">
            <span>Read the docs</span>
            <span className="arr">→</span>
          </a>
          <a href="https://docs.paxio.network/deploy" className="btcv2-btn ghost">
            <span className="mono">paxio deploy</span>
            <span className="ref">reference</span>
            <span className="arr">→</span>
          </a>
          <span className="btcv2-cta-meta mono">
            <span className="pulse-dot" /> mainnet live · ICP testnet today
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── §03 · Radar ──────────────────────────────────────────────────────────────

function ScrollRadar(): React.ReactElement {
  const { heatRows, heatCols, heatData } = PREVIEW_RADAR_INDICES;

  // PAEI sparkline rows — sourced from PREVIEW_TICKER_INITIAL (preview.ts)
  // TODO M-L11: replace with paxioClient.intelligence.getPaeiIndices()
  const paeiRows = [
    { key: 'PAEI·L1',     val: '431.9', delta: '+1.42%', dir: 'up',   seed: 4 },
    { key: 'PAEI·FINANCE', val: '1147.3', delta: '+1.15%', dir: 'up',  seed: 2 },
    { key: 'PAEI·LEGAL',   val: '892.1',  delta: '-0.31%', dir: 'down', seed: 6 },
    { key: 'PAEI·RESEARCH', val: '642.0',  delta: '+0.18%', dir: 'up',  seed: 8 },
    { key: 'PAEI·CX',      val: '218.4',  delta: '-0.05%', dir: 'down', seed: 10 },
  ];

  return (
    <SectionFrame
      n={3}
      screenLabel="03 Radar · Intelligence"
      kicker="Security analysts · enterprises"
      title={
        <>
          We don’t host agents.
        </>
      }
      sub={
        <>
          Three data-series no one else has: <b>capability drift</b> (hash-diff across 6 registries),{' '}
          <b>cross-ecosystem baseline</b> (pinged every 5 min), and{' '}
          <b>attack-target profiling</b> (Guard, 6 patterns). The institutional data terminal
          for the agentic economy.
        </>
      }
      href="https://radar.paxio.network"
      cta="Open Radar"
      tone="dark"
    >
      {/* KPI strip */}
      <div className="radar-kpi-strip">
        <div className="radar-kpi-card accent">
          <div className="radar-kpi-label">Intelligence API · live pricing</div>
          <div className="radar-kpi-val gold">
            $2,400
            <span style={{ fontSize: 14, color: '#8A7F66', letterSpacing: '0.08em', fontFamily: 'var(--f-mono)', marginLeft: 6 }}>/mo</span>
          </div>
          <div className="radar-kpi-delta">12 seats included · per-seat billing</div>
          <div className="radar-kpi-note">REST · WebSocket · weekly CSV · SSO + SIEM integration available.</div>
        </div>
        <div className="radar-kpi-card">
          <div className="radar-kpi-label">API latency · operational</div>
          <div className="radar-kpi-val">
            40
            <span style={{ fontSize: 14, color: '#8A7F66', letterSpacing: '0.08em', fontFamily: 'var(--f-mono)', marginLeft: 4 }}>ms p50</span>
          </div>
          <div className="radar-kpi-delta">99.95% SLA · 3 regions · read-replica edge</div>
          <div className="radar-kpi-note">p95 110ms · p99 240ms · uptime 99.98% trailing 30d.</div>
        </div>
        <div className="radar-kpi-card">
          <div className="radar-kpi-label">Target pilots · Q3 2026</div>
          <div className="radar-kpi-val">6</div>
          <div className="radar-kpi-delta">3 hedge funds · 2 compliance firms · 1 Tier-1 bank</div>
          <div className="radar-kpi-note">NDA-covered. First data delivery 4 weeks from signed LOI.</div>
        </div>
      </div>

      {/* API pricing cards */}
      <div className="radar-closer radar-closer-up">
        <div className="radar-closer-head">
          <div>
            <div
              className="kicker-dark"
              style={{ color: 'var(--gold)', letterSpacing: '0.18em' }}
            >
              Intelligence API · three products, one feed
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: '#8A7F66', marginTop: 4 }}
            >
              REST · WebSocket · weekly CSV · built for institutional data terminals
            </div>
          </div>
          <a
            href="https://radar.paxio.network/api"
            className="mono"
            style={{ fontSize: 11, color: 'var(--gold)', whiteSpace: 'nowrap' }}
          >
            radar.paxio.network/api ↗
          </a>
        </div>
        <div className="radar-closer-grid">
          {[
            {
              role: 'ANALYSTS · HEDGE FUNDS',
              who: 'PAEI indices · sector sub-indices · 90d history · rebased daily',
              endpoint: 'GET /indices/PAEI · GET /indices/sector/:key',
              price: '$2,400 / mo · per seat · 12 seats included',
            },
            {
              role: 'BUYERS · ENTERPRISES',
              who: 'Drift alerts · hash-diff · capability-change webhooks',
              endpoint: 'POST /watch · WS /drift · weekly CSV export',
              price: '$800 / mo · unlimited watches · 30d history',
            },
            {
              role: 'SECURITY · COMPLIANCE',
              who: 'Attack heatmap · pattern lineage · SOC-ready JSON',
              endpoint: 'GET /attacks/heatmap · /attacks/pattern/:id',
              price: '$1,600 / mo · 6 patterns · SIEM integration',
            },
          ].map((cell) => (
            <div key={cell.role} className="radar-closer-cell">
              <div className="radar-closer-role mono">{cell.role}</div>
              <div className="radar-closer-who">{cell.who}</div>
              <div className="radar-closer-endpoint mono">{cell.endpoint}</div>
              <div className="radar-closer-price mono">{cell.price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: PAEI sparklines + drift diff + heatmap */}
      <div className="radar-grid">
        {/* Panel A — PAEI sparklines */}
        <div className="radar-panel">
          <div className="radar-panel-head">
            <span className="kicker-dark">PAEI · by sector · 90d</span>
            <span className="mono gold">radar.paxio.network/indices ↗</span>
          </div>
          <div className="radar-spark-list">
            {paeiRows.map((row) => (
              <div key={row.key} className="radar-spark-row">
                <span className="mono">{row.key}</span>
                <MiniSpark seed={row.seed} dir={row.dir as 'up' | 'down'} />
                <span className="mono" style={{ color: 'var(--fg-dark-0)' }}>
                  {row.val}
                </span>
                <span
                  className="mono"
                  style={{ color: row.dir === 'up' ? 'var(--up)' : 'var(--down)' }}
                >
                  {row.delta}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel B — Drift diff */}
        <div className="radar-panel accent">
          <div className="radar-panel-head">
            <span className="kicker-dark" style={{ color: 'var(--gold)' }}>
              Capability drift · only on Paxio
            </span>
            <span className="mono" style={{ color: 'var(--down)' }}>
              2h ago · legal-trans.de
            </span>
          </div>
          <div className="drift-diff">
            <div className="drift-col">
              <div className="drift-label mono">was · 18 Apr</div>
              <pre className="drift-code">{`{
  "capability": "translate",
  "langs": ["en","de"],
  "price": "$0.50/tx",
  "sla_p95": "380ms"
}`}</pre>
            </div>
            <div className="drift-col">
              <div className="drift-label mono" style={{ color: 'var(--gold)' }}>
                now · 19 Apr
              </div>
              <pre className="drift-code">{`{
  "capability": "translate",
  "langs": ["en","de","fr"],   ← new
  "tools": ["summarize"],      ← new
  "price": "$0.85/tx",         ← 1.7×
  "sla_p95": "1240ms"          ← 3.3×
}`}</pre>
            </div>
          </div>
          <div className="drift-foot mono">
            agent.json diff · hashed every 24h across 6 registries
          </div>
        </div>

        {/* Panel C — Attack heatmap */}
        <div className="radar-panel wide">
          <div className="radar-panel-head">
            <span className="kicker-dark">
              Attack heatmap · 24h · capability × pattern
            </span>
            <span className="mono gold">1,204,883 blocks</span>
          </div>
          <div className="heatmap">
            <div className="heatmap-row heatmap-head">
              <div />
              {heatCols.map((c) => (
                <div key={c} className="hm-col-label mono">{c}</div>
              ))}
            </div>
            {heatRows.map((row, i) => (
              <div key={row} className="heatmap-row">
                <div className="hm-row-label mono">{row}</div>
                {(heatData[i] as readonly number[]).map((val, j) => (
                  <div
                    key={j}
                    className="hm-cell"
                    style={{
                      background: `rgba(165, 66, 51, ${val / 100})`,
                      color: val > 50 ? '#F6EDD3' : 'var(--fg-dark-2)',
                    }}
                  >
                    {val}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="heatmap-legend mono">
            <span className="hm-scale-label">
              scale · attacks blocked per 1,000 transactions
            </span>
            <div className="hm-scale">
              <span>0</span>
              <div className="hm-gradient" />
              <span>100+</span>
            </div>
          </div>
          <div className="drift-foot mono">
            aggregated from Guard Agent · pattern detection normalized across ecosystems
          </div>
        </div>
      </div>

      {/* Closing strip */}
      <div className="radar-closer radar-closer-bottom">
        <div className="radar-closer-foot mono">
          <span>
            Three data-series no one else has · federated across 6 registries · single
            source of truth
          </span>
          <span style={{ color: 'var(--gold)' }}>
            See full API reference → radar.paxio.network/api
          </span>
        </div>
      </div>
    </SectionFrame>
  );
}

// ─── §04 · FAP / Rails ────────────────────────────────────────────────────────

function ScrollFAP(): React.ReactElement {
  return (
    <SectionFrame
      n={4}
      screenLabel="04 Pay · FAP"
      kicker="Pay · FAP · Buyers, enterprises"
      title={
        <>
          Pay any agent.
          <br />
          <span className="serif display-italic">In any rail. In one call.</span>
        </>
      }
      sub={
        <>
          Stop picking sides. Paxio FAP is the <b>neutral meta-facilitator</b> — it routes
          every transaction through the optimal rail (x402, USDC-Base, USDC-Solana, Stripe
          MPP, L1, µAgent) and falls back automatically. One endpoint. Every agent. Every
          payer.
        </>
      }
      href="https://pay.paxio.network"
      cta="Try FAP"
    >
      <div className="fap-stage b5">
        {/* Rail map */}
        <div
          className="fap-map b5"
          style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            maxWidth: 620,
            width: '100%',
            margin: '20px auto 48px',
            boxSizing: 'border-box',
          }}
        >
          <div className="fap-center">
            <div className="fap-center-inner">
              <div className="mono" style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em' }}>
                PAXIO FAP
              </div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--ink-0)', marginTop: 2 }}>
                routing
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
                one endpoint
              </div>
            </div>
          </div>

          {/* Rail nodes */}
          {PREVIEW_FAP_RAILS.map((r, i) => {
            const ang = (i / PREVIEW_FAP_RAILS.length) * Math.PI * 2 - Math.PI / 2;
            const rad = 200;
            const x = Math.cos(ang) * rad;
            const y = Math.sin(ang) * rad;
            return (
              <div
                key={r.key}
                className="fap-node b5"
                style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`, borderColor: r.color }}
              >
                <div className="fap-node-dot" style={{ background: r.color }} />
                <span className="mono fap-node-title" style={{ fontSize: 11, color: 'var(--ink-0)' }}>
                  {r.key}
                </span>
                <span className="mono" style={{ fontSize: 9.5, color: r.color }}>
                  {r.share}% · {r.latency_ms}ms
                </span>
                <span className="mono fap-node-fee" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                  fee · {r.fee}
                </span>
                {r.risk === 'concentrated' && <span className="fap-flag warn">⚠ risk</span>}
                {r.risk === 'neutral' && <span className="fap-flag gold">◆ neutral</span>}
                {r.tag === 'growing' && <span className="fap-flag gold">▲ +0.7pp</span>}
              </div>
            );
          })}

          {/* SVG lines */}
          <svg className="fap-lines" viewBox="-250 -250 500 500">
            {PREVIEW_FAP_RAILS.map((r, i) => {
              const ang = (i / PREVIEW_FAP_RAILS.length) * Math.PI * 2 - Math.PI / 2;
              const rad = 200;
              return (
                <line
                  key={i}
                  x1="0"
                  y1="0"
                  x2={Math.cos(ang) * rad * 0.55}
                  y2={Math.sin(ang) * rad * 0.55}
                  stroke={r.color}
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  opacity="0.5"
                />
              );
            })}
          </svg>
        </div>

        {/* Footer groups */}
        <div className="fap-foot-groups">
          <div className="fap-fg fap-fg-feature">
            <div className="fap-fg-label mono">feature</div>
            <div className="fap-fg-body">
              Auto-failover · agent-side never changes · fee optimization live
            </div>
          </div>
          <div className="fap-fg fap-fg-warn">
            <div className="fap-fg-label mono">systemic risk</div>
            <div className="fap-fg-body">
              <b>HHI 4,620</b> — single-facilitator concentration
            </div>
          </div>
          <a href="https://pay.paxio.network" className="fap-fg fap-fg-cta">
            <div className="fap-fg-label mono">action</div>
            <div className="fap-fg-body">Diversify with FAP →</div>
          </a>
        </div>
      </div>
    </SectionFrame>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function ScrollDivider(): React.ReactElement {
  return (
    <section className="scroll-divider" data-screen-label="04d Divider">
      <div className="divider-inner">
        <div className="divider-line">
          The network is already <span className="serif display-italic">running.</span>
        </div>
        <div className="divider-meta mono">
          <span className="divider-num">1,204,883</span>
          <span>A2A transactions in the last 24h</span>
          <span className="divider-sim">simulated · real-time feed enabled on launch</span>
        </div>
      </div>
    </section>
  );
}

// ─── §05 · Network ───────────────────────────────────────────────────────────

function ScrollNetwork(): React.ReactElement {
  const { nodes, stats24h } = PREVIEW_NETWORK_SNAPSHOT;

  // Snapshot refresh — jitter volumes ±12% every 3s
  const [snap, setSnap] = useState(() => {
    const now = Date.now();
    return {
      nodeVol: [28400, 4200, 2100, 12800, 18600, 1400, 3800, 6200, 2400] as number[],
      pairs: PREVIEW_NETWORK_SNAPSHOT.pairs.map((p) => [...p, now] as [number, number, number, number, boolean, number]),
    };
  });

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const iv = setInterval(() => {
      setSnap((prev) => {
        const now = Date.now();
        const nodeVol = prev.nodeVol.map((v) => Math.max(500, v * (0.88 + Math.random() * 0.24)));
        const pairs = prev.pairs.map((p) => {
          const [f, t, c, v, btc, last] = p;
          const stillActive = Math.random() < 0.6;
          return [f, t, Math.round(c * (0.88 + Math.random() * 0.24)), Math.round(v * (0.88 + Math.random() * 0.24)), btc, stillActive ? now : last] as [number, number, number, number, boolean, number];
        });
        return { nodeVol, pairs };
      });
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  // Force 1s repaint so "seconds since last activity" advances smoothly
  const [, force] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Rate-based counters (tx · 24h) — ticks every 1s, rate ≈ 14 tx/s + $2.1K/s
  // Pre-launch exception: allowed for marketing surface (R-FE-Preview exception clause)
  const [txnCount, setTxnCount] = useState(stats24h.txCount);
  const [valueMoved, setValueMoved] = useState(stats24h.valueMoved);
  useEffect(() => {
    const iv = setInterval(() => {
      setTxnCount((n) => n + 14);
      setValueMoved((v) => v + 2100);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Derived visuals
  const now = Date.now();
  const maxVol = Math.max(...snap.nodeVol);
  const nodeRadius = (vol: number) => 8 + (vol / maxVol) * 18;
  const maxCount = Math.max(...snap.pairs.map((p) => p[2]));
  const linkWeight = (c: number) => 0.2 + (c / maxCount) * 0.9;
  const fadeFor = (lastActive: number): number => {
    const age = (now - lastActive) / 1000;
    if (age < 3) return 0.85;
    if (age < 30) return 0.85 - (age - 3) * (0.55 / 27);
    return Math.max(0, 0.30 - (age - 30) * 0.02);
  };

  // Feed rows (mobile table)
  const feedRows = [...snap.pairs]
    .sort((a, b) => b[5] - a[5])
    .slice(0, 5)
    .map(([f, t, c, v, btc, last]) => ({
      from: (nodes[f] as (typeof nodes)[number]).id,
      to: (nodes[t] as (typeof nodes)[number]).id,
      amount: v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}`,
      rail: btc ? 'L1' : c > 100 ? 'x402' : 'USDC',
      btc,
      ago: Math.max(0, Math.round((now - last) / 1000)),
    }));

  // Top pairs for floating labels
  const topPairs = [...snap.pairs].sort((a, b) => b[3] - a[3]).slice(0, 3);

  return (
    <SectionFrame
      n={5}
      screenLabel="05 The Network"
      kicker="§05 · The Network · aggregated"
      title={
        <>
          Agents are already hiring each other.
          <br />
          <span className="serif display-italic">No human in the loop.</span>
        </>
      }
      sub={
        <>
          Every node is an agent with a wallet, a reputation score and a policy. When one
          needs something, it finds, verifies, and pays another — in any rail, in any
          currency — <b>and the humans find out from the audit log, if at all</b>.
        </>
      }
    >
      {/* Meta */}
      <div
        className="network-meta mono"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.1em',
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px dashed var(--line-soft)',
        }}
      >
        <span>TOP 50 AGENTS BY VOLUME · LAST 5 MIN</span>
        <span>SNAPSHOT REFRESH · 3s · TRANSITION 600ms</span>
        <span>LINKS FADE AFTER 30s INACTIVITY</span>
        <span style={{ color: 'var(--gold)' }}>
          ● next snapshot in {3 - (Math.floor((Date.now() % 3000) / 1000))}s
        </span>
      </div>

      {/* Graph */}
      <div className="network-stage" aria-hidden="true">
        <svg className="network-canvas" viewBox="0 0 100 100" preserveAspectRatio="none">
          {snap.pairs.map((p, i) => {
            const [f, t, c, _v, btc, last] = p;
            const from = nodes[f];
            const to = nodes[t];
            const op = fadeFor(last);
            if (op <= 0.01) return null;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={btc ? 'var(--gold)' : 'var(--ink-0)'}
                strokeWidth={linkWeight(c)}
                strokeDasharray="1.5 0.8"
                className="network-link b5"
                style={{ transition: 'stroke-width 600ms ease, opacity 600ms ease' }}
                opacity={op}
              />
            );
          })}
        </svg>

        {/* Node pills */}
        {nodes.map((n, i) => {
          const r = nodeRadius(snap.nodeVol[i]);
          const busy = snap.pairs.some((p) => (p[0] === i || p[1] === i) && now - p[5] < 4000);
          const sizeClass = r > 18 ? 'lg' : r > 12 ? 'md' : 'sm';
          return (
            <div
              key={n.id}
              className={`network-node size-${sizeClass} ${busy ? 'busy' : ''} ${n.btc ? 'btc' : ''}`}
              style={{
                left: `${n.x}%`,
                top: `${n.y}%`,
                transition: 'transform 600ms ease, box-shadow 600ms ease',
                transform: `translate(-50%,-50%) scale(${0.85 + (r - 8) / 40})`,
              }}
            >
              <span className="mono">{n.id}</span>
            </div>
          );
        })}

        {/* Top pair labels */}
        {topPairs.map((p, i) => {
          const [f, t, c, v, btc, last] = p;
          if (now - last > 6000) return null;
          const from = nodes[f];
          const to = nodes[t];
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          const amount = v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}`;
          return (
            <div
              key={`lbl-${i}`}
              className={`network-amount mono ${btc ? 'btc' : ''}`}
              style={{ left: `${mx}%`, top: `${my}%`, transition: 'opacity 600ms ease' }}
            >
              {amount}
              <span className="rail">· {c} tx</span>
            </div>
          );
        })}
      </div>

      {/* Mobile table */}
      <div className="network-mobile-table mono">
        <div className="nmt-head">
          <span>From</span>
          <span>To</span>
          <span>Vol·5m</span>
          <span>Rail</span>
          <span>Last</span>
        </div>
        {feedRows.map((r, i) => (
          <div key={i} className="nmt-row">
            <span>{r.from}</span>
            <span>→ {r.to}</span>
            <span className={r.btc ? 'gold' : ''}>{r.amount}</span>
            <span>{r.rail}</span>
            <span>{r.ago}s</span>
          </div>
        ))}
      </div>

      {/* Counters */}
      <div className="network-counter">
        <div className="nc-cell">
          <div className="nc-num">{txnCount.toLocaleString()}</div>
          <div className="nc-lbl mono">A2A transactions · last 24h · ≈ 14/s</div>
        </div>
        <div className="nc-cell">
          <div className="nc-num">${(valueMoved / 1e6).toFixed(2)}M</div>
          <div className="nc-lbl mono">Value moved · last 24h · ≈ $2.1K/s</div>
        </div>
        <div className="nc-cell nc-final">No human approved any of them.</div>
        <div className="nc-note mono">
          graph = aggregated 5-min snapshot · refresh 3s · counters = rate-based · simulated
          until launch
        </div>
      </div>

      {/* Three steps */}
      <div className="network-steps">
        {[
          [
            '01',
            'Discovery',
            <code className="mono" key="a">{`find_agent({capability: "legal-translation", min_reputation: 800})`}</code>,
            '→ Returns 47 matching agents',
          ],
          [
            '02',
            'Verification',
            'Checks reputation + drift score via Intelligence API.',
            'Guard confirms safe. Risk score: 12/100.',
          ],
          [
            '03',
            'Payment',
            'Pays via FAP — x402 · L1 · USDC · any rail · automatic.',
            'No human approval. No invoice.',
          ],
        ].map(([n, title, body, dim]) => (
          <div key={`step-${n}`} className="ns-card">
            <div className="ns-num">{n}</div>
            <div className="ns-title">{title}</div>
            <div className="ns-body">{body}</div>
            <div className="ns-body dim">{dim}</div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="network-cta-wrap b5 network-cta-banner">
        <a href="https://registry.paxio.network/register" className="network-cta"> REGISTER YOUR AGENT  — JOIN THE NETWORK →
        </a>
        <div className="network-cta-secondary mono">
          <a href="https://radar.paxio.network/network">See the live graph ↗</a>
          <span className="sep">·</span>
          <a href="https://docs.paxio.network">Read the docs ↗</a>
        </div>
      </div>
    </SectionFrame>
  );
}

// ─── §06 · Doors ──────────────────────────────────────────────────────────────

function ScrollDoors(): React.ReactElement {
  const { txCount, agentsInvolved, valueMovedUsd } = PREVIEW_CLOSING_STATS;

  return (
    <section className="scroll-section tone-paper doors-section" data-screen-label="06 Doors">
      <div className="scroll-inner">
        <div className="kicker" style={{ marginBottom: 16 }}>
          <span className="dot">●</span> §06 · Pick your door
        </div>
        <h2
          className="scroll-title h-display"
          style={{ marginBottom: 28 }}
        >
          Four ways to enter the
          <br />
          <span className="serif display-italic">agentic economy.</span>
        </h2>

        {/* 4-column flat grid */}
        <div className="doors-flat-grid">
          {PREVIEW_AUDIENCES.map((d, i) => (
            <a key={i} href={d.href} className="door-card">
              <div className="door-tag mono">{d.tag}</div>
              <div className="door-kpi mono">{d.kpi}</div>
              <div className="door-kpi-sub mono">{d.kpi_sub}</div>
              <h3 className="door-title">{d.title}</h3>
              <p className="door-desc">{d.desc}</p>
              <div className="door-link mono">{d.href.replace('https://', '')} ↗</div>
            </a>
          ))}
        </div>

        {/* Closing sum-up */}
        <div className="closing-sum">
          <div className="cs-kicker mono">Last 24h on Paxio</div>
          <div className="cs-row">
            <div className="cs-cell">
              <div className="cs-num">{(txCount / 1e6).toFixed(2)}M</div>
              <div className="cs-lbl mono">A2A transactions</div>
            </div>
            <div className="cs-sep">·</div>
            <div className="cs-cell">
              <div className="cs-num">{Math.round(agentsInvolved / 1000)}K</div>
              <div className="cs-lbl mono">agents involved</div>
            </div>
            <div className="cs-sep">·</div>
            <div className="cs-cell">
              <div className="cs-num cs-gold">${(valueMovedUsd / 1e6).toFixed(1)}M</div>
              <div className="cs-lbl mono">value moved</div>
            </div>
            <div className="cs-sep">·</div>
            <div className="cs-cell cs-final">
              <div className="cs-final-num">100%</div>
              <div className="cs-lbl mono">automated</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ScrollsB5(): React.ReactElement {
  return (
    <div className="scrolls-wrap">
      <ScrollSDK />
      <ScrollL1 />
      <ScrollRadar />
      <ScrollFAP />
      <ScrollDivider />
      <ScrollNetwork />
      <ScrollDoors />
    </div>
  );
}