// Paxio Landing — scrolls below the B3 hero
// 5 conversion-first sections, each with one thesis + deep-link CTA.
//
// Scroll 2  · One install, every rail       → SDK
// Scroll 3  · We don't host. We measure.   → Radar
// Scroll 4  · Pay any agent, any rail       → FAP
// Scroll 5  · Deploy 1000. Audit every call → Fleet
// Scroll 6  · Pick your door                → router

(function () {
  const { useState, useEffect, useMemo } = React;

  // ───────────────────────── shared primitives ─────────────────────────
  function SectionFrame({ n, kicker, title, sub, href, cta, children, tone="paper", leftExtra, anchor, screenLabel }) {
    return (
      <section className={`scroll-section tone-${tone}`} id={anchor} data-screen-label={screenLabel}>
        <div className="scroll-inner">
          <header className="scroll-head">
            <div className="scroll-num mono">§{String(n).padStart(2,"0")}</div>
            <div className="scroll-kicker kicker"><span className="dot">●</span> {kicker}</div>
          </header>
          <div className="scroll-grid">
            <div className="scroll-copy">
              <h2 className="scroll-title h-display">{title}</h2>
              {sub && <p className="scroll-sub">{sub}</p>}
              {cta && (
                <div className="scroll-cta-row">
                  <a className="btn solid" href={href}>{cta} →</a>
                  <a className="btn ghost" href={href}>Read the docs</a>
                </div>
              )}
              {leftExtra}
            </div>
            <div className="scroll-stage">{children}</div>
          </div>
        </div>
      </section>
    );
  }

  // ───────────────────────── Scroll 2 · SDK install ─────────────────────
  function ScrollSDK() {
    const [stage, setStage] = useState(0); // 0 init, 1 install, 2 register, 3 done
    const [ticks, setTicks] = useState(0);
    useEffect(() => {
      const id = setInterval(() => setTicks(t => t+1), 900);
      return () => clearInterval(id);
    }, []);
    useEffect(() => {
      if (ticks === 1) setStage(1);
      else if (ticks === 4) setStage(2);
      else if (ticks === 7) setStage(3);
      else if (ticks === 10) { setTicks(0); setStage(0); }
    }, [ticks]);

    return (
      <SectionFrame n={2}
        anchor="quickstart"
        screenLabel="02 Quickstart · SDK"
        kicker="SDK · Builders"
        title={<>Give your agent a wallet<br/><span className="serif display-italic">in 60 seconds.</span></>}
        sub={<>An MCP tool today has no wallet, no pricing, no reputation — it just <i>runs</i>. <b>@paxio/sdk wraps any agent in the full stack</b>: wallet (BTC + USDC), payment rails (x402, USDC, Stripe MPP, BTC L1), DID, compliance feed, federated indexing across 6 registries.</>}
        href="https://docs.paxio.network"
        cta="Install the SDK"
      >
        {/* Before/after metric strip — no decorative frame (P1·14) */}
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
            <div className="split-manifest mono dim-manifest">
              Just a tool.
            </div>
            <div className="code-mini">
              <div className="cm-line">{"// register on ERC-8004"}</div>
              <div className="cm-line">{"const tx = await registry.register({"}</div>
              <div className="cm-line">{"  owner, metadata, stake: 0.1 ETH"}</div>
              <div className="cm-line">{"});"}</div>
              <div className="cm-line dim">{"// wire up x402 facilitator…"}</div>
              <div className="cm-line dim">{"// set up USDC paymaster…"}</div>
              <div className="cm-line dim">{"// write OWASP scanner harness…"}</div>
              <div className="cm-line dim">{"// sign attestations, rotate keys…"}</div>
              <div className="cm-line dim">{"// publish to MCP registry…"}</div>
              <div className="cm-line dim">{"// mirror to Fetch.ai catalog…"}</div>
              <div className="cm-line dim">{"// write reputation feed…"}</div>
              <div className="cm-line dim">{"// set up health endpoint…"}</div>
              <div className="cm-line dim">{"// plus compliance logs…"}</div>
              <div className="cm-line dim">{"// plus dispute rails…"}</div>
              <div className="cm-footer mono">
                <span>6 protocols · 4 keys · 2 weeks</span>
                <span className="warn">still wallet-less</span>
              </div>
            </div>
            {/* Anti-strip — shows what's MISSING without Paxio, with tooltips (P1·15) */}
            <div className="got-strip anti mono">
              {[
                ["DID", "Decentralized identifier — none"],
                ["Wallet", "No wallet, no address, no funds"],
                ["Rails", "Cannot receive payment"],
                ["Index", "Not discoverable in any registry"],
                ["Guard", "No injection / attack scanning"],
                ["Reputation", "No feed, no history, no score"],
              ].map(([k, tip]) => (
                <div key={k} className="got-cell anti-cell" title={tip}>
                  <span className="got-dot">○</span> {k}
                </div>
              ))}
            </div>
          </div>

          {/* After */}
          <div className="split-col after">
            <div className="split-head mono">
              <span>WITH <b style={{color:"var(--gold)"}}>@paxio/sdk</b></span>
              <span className="split-lines">∼ 6 lines</span>
            </div>
            <div className="split-manifest mono" style={{ color: "var(--gold)" }}>
              An economic actor.
            </div>
            <div className="term-mini-wrap">
              <div className="term-mini">
              <div className="tm-line">
                <span className="tm-prompt">$</span>{" "}
                <span className={stage >= 1 ? "visible" : "dim"}>npm install @paxio/sdk</span>
              </div>
              {stage >= 1 && (
                <>
                  <div className="tm-line out">+ @paxio/sdk@1.4.0</div>
                  <div className="tm-line out">added 1 package in 1.8s</div>
                </>
              )}
              <div className="tm-line" style={{ marginTop: 10 }}>
                <span className="tm-prompt">$</span>{" "}
                <span className={stage >= 2 ? "visible" : "dim"}>paxio register --capability legal-translate</span>
              </div>
              {stage >= 2 && (
                <>
                  <div className="tm-line out"><span className="chk">✓</span> DID issued            <span className="gold-tag">did:paxio:0x4f…a21b</span></div>
                  <div className="tm-line out"><span className="chk">✓</span> Wallet attached       <span className="gold-tag">BTC + USDC</span></div>
                  <div className="tm-line out"><span className="chk">✓</span> Rails enabled         <span className="mut">x402 · USDC-Base · Stripe MPP · BTC L1</span></div>
                  <div className="tm-line out"><span className="chk">✓</span> Indexed               <span className="mut">ERC-8004 · MCP · Fetch · Virtuals · ElizaOS</span></div>
                  <div className="tm-line out"><span className="chk">✓</span> Guard attached        <span className="mut">pre-flight injection scanning</span></div>
                  <div className="tm-line out"><span className="chk">✓</span> Reputation feed live  <span className="mut">ERC-8004 + ICP</span></div>
                </>
              )}
              {stage >= 3 && (
                <div className="tm-line done" style={{ marginTop: 8 }}>
                  <span style={{ color: "var(--gold)" }}>◆</span> Agent is live. Earning enabled.
                </div>
              )}
            </div>
            </div>

            {/* What you get strip — with tooltips (P1·15) */}
            <div className="got-strip mono">
              {[
                ["DID", "did:paxio:0x… issued on register"],
                ["Wallet", "Threshold-ECDSA BTC + USDC non-custodial"],
                ["Rails", "x402 · USDC-Base · Stripe MPP · BTC L1"],
                ["Index", "ERC-8004 · MCP · Fetch · Virtuals · ElizaOS"],
                ["Guard", "Pre-flight prompt/doc-inj · 6 patterns"],
                ["Reputation", "ERC-8004 + ICP feed, cross-ecosystem"],
              ].map(([k, tip], i) => (
                <div key={k} className={`got-cell ${stage >= 2 ? "on" : ""}`} title={tip} style={{ transitionDelay: `${i*100}ms` }}>
                  <span className="got-dot">{stage >= 2 ? "●" : "○"}</span> {k}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionFrame>
    );
  }

  // ───────────────────────── Scroll 2.5 · Bitcoin-native ───────────────
  // Dark section between two light sections — visual rhythm.
  // Bitcoin is money; obsidian + gold is the right register.
  function ScrollBitcoin() {
    return (
      <section className="scroll-section tone-btc btc-v2" id="bitcoin-native" data-screen-label="02b Bitcoin-native">
        <div className="scroll-inner">

          <header className="scroll-head">
            <div className="scroll-num mono">§02·b</div>
            <div className="scroll-kicker kicker"><span className="dot">●</span> Bitcoin-native · only on Paxio</div>
          </header>

          {/* ─── HERO ─── */}
          <div className="btcv2-hero">
            <div className="btcv2-hero-copy">
              <h2 className="btcv2-title">
                Your agent.<br/>
                <span className="serif display-italic">A real Bitcoin address.</span>
              </h2>
              <p className="btcv2-lede">
                Threshold-ECDSA derives a native <code className="btcv2-code-inline">bc1q…</code> address on Bitcoin L1.
                No wrapping, no bridges, no custodian.
              </p>
              <div className="btcv2-spec-row">
                <div className="btcv2-spec"><span className="btcv2-spec-k mono">protocol</span><span className="btcv2-spec-v">Bitcoin L1</span></div>
                <div className="btcv2-spec"><span className="btcv2-spec-k mono">signing</span><span className="btcv2-spec-v">t-ECDSA · 32/40</span></div>
                <div className="btcv2-spec"><span className="btcv2-spec-k mono">custody</span><span className="btcv2-spec-v">non-custodial</span></div>
              </div>
            </div>

            {/* Address as monument — the real "bitcoin object" */}
            <div className="btcv2-hero-art" aria-hidden="true">
              <div className="btcv2-addr-card">
                <div className="btcv2-addr-bar mono">
                  <span>derived address</span>
                  <span className="btcv2-addr-status"><span className="pulse-dot"/> live · block 829,441</span>
                </div>
                <div className="btcv2-addr-body">
                  <div className="btcv2-addr-mono">
                    <div><span className="btcv2-addr-prefix">bc1q</span> 4n7r0x</div>
                    <div>3kfp2m x9q5wt</div>
                    <div>v8lp7c 3kfp</div>
                  </div>
                  <div className="btcv2-addr-stats mono">
                    <div className="btcv2-addr-stat"><span className="k">balance</span><span className="v">0.0142 ₿</span></div>
                    <div className="btcv2-addr-stat"><span className="k">received</span><span className="v">0.0207 ₿</span></div>
                    <div className="btcv2-addr-stat"><span className="k">tx count</span><span className="v">17</span></div>
                    <div className="btcv2-addr-stat"><span className="k">first seen</span><span className="v">block 824,107</span></div>
                  </div>
                </div>
                <div className="btcv2-addr-foot mono">
                  <span>did:paxio:0x4f…a21b</span>
                  <span className="sep">·</span>
                  <span>verifiable on mempool.space</span>
                </div>
              </div>
              <div className="btcv2-addr-watermark serif" aria-hidden="true">₿</div>
            </div>
          </div>

          {/* ─── TWO PATHS ─── */}
          <div className="btcv2-paths">
            <article className="btcv2-path">
              <div className="btcv2-path-num mono">01</div>
              <div className="btcv2-path-meta mono">off-chain agents</div>
              <h3 className="btcv2-path-h">Any agent.<br/>One install.</h3>
              <p className="btcv2-path-p">
                Wrap LangChain, CrewAI, MCP. The SDK derives a real Bitcoin address and rails it through x402, USDC, BTC L1.
              </p>
              <div className="btcv2-term">
                <div className="btcv2-term-bar mono">
                  <span className="btcv2-dot r"/><span className="btcv2-dot y"/><span className="btcv2-dot g"/>
                  <span className="btcv2-term-title">~/agent</span>
                </div>
                <div className="btcv2-term-body mono">
                  <div className="tline"><span className="prompt">$</span> npm install @paxio/sdk</div>
                  <div className="tline" style={{ marginTop: 6 }}><span className="prompt">$</span> paxio register</div>
                  <div className="tline out"><span className="ok">✓</span> DID issued       <span className="dim">did:paxio:0x4f…a21b</span></div>
                  <div className="tline out"><span className="ok">✓</span> BTC address      <span className="gold-mono">bc1q4n7…3kfp</span></div>
                  <div className="tline out"><span className="ok">✓</span> Rails enabled    <span className="dim">x402 · USDC · BTC L1</span></div>
                </div>
              </div>
              <div className="btcv2-path-foot mono">
                <span className="ts">≈ 60 sec</span>
                <span className="sep">·</span>
                <span>any framework</span>
                <span className="sep">·</span>
                <span>non-custodial</span>
              </div>
            </article>

            <article className="btcv2-path featured">
              <div className="btcv2-path-num mono">02</div>
              <div className="btcv2-path-meta mono">on-chain agents</div>
              <h3 className="btcv2-path-h">The canister<br/><span className="serif display-italic">is</span> the wallet.</h3>
              <p className="btcv2-path-p">
                Deploy an ICP canister whose code <i>is</i> the agent. The canister itself signs Bitcoin — non-custodial by construction.
              </p>
              <div className="btcv2-term">
                <div className="btcv2-term-bar mono">
                  <span className="btcv2-dot r"/><span className="btcv2-dot y"/><span className="btcv2-dot g"/>
                  <span className="btcv2-term-title">~/canister</span>
                </div>
                <div className="btcv2-term-body mono">
                  <div className="tline"><span className="prompt">$</span> paxio deploy --type bitcoin-dca</div>
                  <div className="tline out"><span className="ok">✓</span> Canister deployed</div>
                  <div className="tline out"><span className="ok">✓</span> BTC address      <span className="gold-mono">bc1q8d3…m72p</span></div>
                  <div className="tline" style={{ marginTop: 6 }}><span className="prompt">$</span> paxio agent.run</div>
                  <div className="tline out"><span className="ok">●</span> live · signing on-chain</div>
                </div>
              </div>
              <div className="btcv2-path-foot mono">
                <span>DCA</span><span className="sep">·</span>
                <span>escrow</span><span className="sep">·</span>
                <span>payroll</span><span className="sep">·</span>
                <span>treasury</span>
              </div>
            </article>
          </div>

          {/* ─── COMPARISON ─── */}
          <div className="btcv2-compare">
            <div className="btcv2-compare-head">
              <span className="kicker mono">how others handle BTC for agents</span>
              <span className="btcv2-compare-rule"/>
            </div>
            <div className="btcv2-compare-grid">
              <div className="btcv2-comp">
                <div className="btcv2-comp-name mono">Coinbase AgentKit</div>
                <div className="btcv2-comp-verb">wraps</div>
                <div className="btcv2-comp-desc">wBTC on Base. Custodial.</div>
              </div>
              <div className="btcv2-comp">
                <div className="btcv2-comp-name mono">Skyfire</div>
                <div className="btcv2-comp-verb">skips</div>
                <div className="btcv2-comp-desc">USDC-only. No BTC rail.</div>
              </div>
              <div className="btcv2-comp btcv2-comp-win">
                <div className="btcv2-comp-flag mono">only on Paxio</div>
                <div className="btcv2-comp-name mono">Paxio</div>
                <div className="btcv2-comp-verb gold">settles</div>
                <div className="btcv2-comp-desc">Native L1 · t-ECDSA.</div>
              </div>
            </div>
          </div>

          {/* ─── CTA ─── */}
          <div className="btcv2-cta-row">
            <a href="https://docs.paxio.network/bitcoin" className="btcv2-btn primary">
              <span>Read the Bitcoin docs</span>
              <span className="arr">→</span>
            </a>
            <a href="https://docs.paxio.network/deploy" className="btcv2-btn ghost">
              <span className="mono">paxio deploy</span>
              <span className="ref">reference</span>
              <span className="arr">→</span>
            </a>
            <span className="btcv2-cta-meta mono">
              <span className="pulse-dot"/> mainnet live · ICP testnet today
            </span>
          </div>

        </div>
      </section>
    );
  }

  // ───────────────────────── Scroll 3 · Radar / intelligence ────────────
  function ScrollRadar() {
    // live-ish mini dashboard: PAEI ticker + drift diff + attack heatmap
    const HEAT_ROWS = ["Legal·translate","DeFi·routing","CX·tier-1","Finance·invoice","Research·synth","Security·guard"];
    const HEAT_COLS = ["Prompt-inj","Doc-inj","Price-manip","Jailbreak","Exfil","DDoS"];
    const HEAT_DATA = [
      [88, 72, 4,  12, 14, 6],
      [22, 10, 94, 32, 18, 41],
      [74, 18, 2,  86, 22, 14],
      [38, 64, 28, 22, 58, 12],
      [54, 28, 6,  18, 12, 4],
      [12, 8,  12, 6,  72, 48],
    ];

    return (
      <SectionFrame n={3}
        anchor="radar"
        screenLabel="03 Radar · Intelligence"
        kicker="Radar · Analysts, buyers, enterprises"
        title={<>We don't host agents.<br/><span className="serif display-italic">We measure them.</span></>}
        sub={<>Three data-series no one else has: <b>capability drift</b> (hash-diff across 6 registries), <b>cross-ecosystem baseline</b> (pinged every 5 min), and <b>attack-target profiling</b> (Guard, 6 patterns). The institutional data terminal for the agentic economy.</>}
        href="https://radar.paxio.network"
        cta="Open Radar"
        tone="dark"
      >
        {/* KPI strip — pricing + ops + pilots (not hero-repeats) (P1·16) */}
        <div className="radar-kpi-strip">
          <div className="radar-kpi-card accent">
            <div className="radar-kpi-label">Intelligence API · live pricing</div>
            <div className="radar-kpi-val gold">$2,400<span style={{ fontSize: 14, color: "#8A7F66", letterSpacing: "0.08em", fontFamily: "var(--f-mono)", marginLeft: 6 }}>/mo</span></div>
            <div className="radar-kpi-delta">12 seats included · per-seat billing</div>
            <div className="radar-kpi-note">REST · WebSocket · weekly CSV · SSO + SIEM integration available.</div>
          </div>
          <div className="radar-kpi-card">
            <div className="radar-kpi-label">API latency · operational</div>
            <div className="radar-kpi-val">40<span style={{ fontSize: 14, color: "#8A7F66", letterSpacing: "0.08em", fontFamily: "var(--f-mono)", marginLeft: 4 }}>ms p50</span></div>
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

        {/* Intelligence API pricing cards — moved up before heatmap (P1·17) */}
        <div className="radar-closer radar-closer-up">
          <div className="radar-closer-head">
            <div>
              <div className="kicker-dark" style={{ color: "var(--gold)", letterSpacing: "0.18em" }}>Intelligence API · three products, one feed</div>
              <div className="mono" style={{ fontSize: 11, color: "#8A7F66", marginTop: 4 }}>REST · WebSocket · weekly CSV · built for institutional data terminals</div>
            </div>
            <a href="https://radar.paxio.network/api" className="mono" style={{ fontSize: 11, color: "var(--gold)", whiteSpace: "nowrap" }}>radar.paxio.network/api ↗</a>
          </div>

          <div className="radar-closer-grid">
            <div className="radar-closer-cell">
              <div className="radar-closer-role mono">ANALYSTS · HEDGE FUNDS</div>
              <div className="radar-closer-who">PAEI indices · sector sub-indices · 90d history · rebased daily</div>
              <div className="radar-closer-endpoint mono">GET /indices/PAEI · GET /indices/sector/:key</div>
              <div className="radar-closer-price mono">$2,400 / mo · per seat · 12 seats included</div>
            </div>
            <div className="radar-closer-cell">
              <div className="radar-closer-role mono">BUYERS · ENTERPRISES</div>
              <div className="radar-closer-who">Drift alerts · hash-diff · capability-change webhooks</div>
              <div className="radar-closer-endpoint mono">POST /watch · WS /drift · weekly CSV export</div>
              <div className="radar-closer-price mono">$800 / mo · unlimited watches · 30d history</div>
            </div>
            <div className="radar-closer-cell">
              <div className="radar-closer-role mono">SECURITY · COMPLIANCE</div>
              <div className="radar-closer-who">Attack heatmap · pattern lineage · SOC-ready JSON</div>
              <div className="radar-closer-endpoint mono">GET /attacks/heatmap · /attacks/pattern/:id</div>
              <div className="radar-closer-price mono">$1,600 / mo · 6 patterns · SIEM integration</div>
            </div>
          </div>
        </div>
        <div className="radar-grid">
          {/* Panel A — PAEI sparklines */}
          <div className="radar-panel">
            <div className="radar-panel-head">
              <span className="kicker-dark">PAEI · by sector · 90d</span>
              <span className="mono gold">radar.paxio.network/indices ↗</span>
            </div>
            <div className="radar-spark-list">
              {[
                ["PAEI·BTC",     "431.9","+1.42%","up", 4],
                ["PAEI·FINANCE", "1147.3","+1.15%","up", 2],
                ["PAEI·LEGAL",   "892.1", "-0.31%","down", 6],
                ["PAEI·RESEARCH","642.0", "+0.18%","up", 8],
                ["PAEI·CX",      "218.4", "-0.05%","down", 10],
              ].map(([k,v,d,dir,seed]) => (
                <div key={k} className="radar-spark-row">
                  <span className="mono">{k}</span>
                  <MiniSpark seed={seed} dir={dir}/>
                  <span className="mono" style={{ color: "var(--fg-dark-0)" }}>{v}</span>
                  <span className="mono" style={{ color: dir==="up"?"var(--up)":"var(--down)" }}>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Panel B — Drift diff */}
          <div className="radar-panel accent">
            <div className="radar-panel-head">
              <span className="kicker-dark" style={{ color: "var(--gold)" }}>Capability drift · only on Paxio</span>
              <span className="mono" style={{ color: "var(--down)" }}>2h ago · legal-trans.de</span>
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
                <div className="drift-label mono" style={{ color: "var(--gold)" }}>now · 19 Apr</div>
                <pre className="drift-code">{`{
  "capability": "translate",
  "langs": ["en","de","fr"],   ← new
  "tools": ["summarize"],      ← new
  "price": "$0.85/tx",         ← 1.7×
  "sla_p95": "1240ms"          ← 3.3×
}`}</pre>
              </div>
            </div>
            <div className="drift-foot mono">agent.json diff · hashed every 24h across 6 registries</div>
          </div>

          {/* Panel C — Attack heatmap with legend (P1·18) */}
          <div className="radar-panel wide">
            <div className="radar-panel-head">
              <span className="kicker-dark">Attack heatmap · 24h · capability × pattern</span>
              <span className="mono gold">1,204,883 blocks</span>
            </div>
            <div className="heatmap">
              <div className="heatmap-row heatmap-head">
                <div/>
                {HEAT_COLS.map(c => <div key={c} className="hm-col-label mono">{c}</div>)}
              </div>
              {HEAT_ROWS.map((r,i) => (
                <div key={r} className="heatmap-row">
                  <div className="hm-row-label mono">{r}</div>
                  {HEAT_DATA[i].map((v,j) => (
                    <div key={j} className="hm-cell" style={{
                      background: `rgba(165, 66, 51, ${v/100})`,
                      color: v > 50 ? "#F6EDD3" : "var(--fg-dark-2)"
                    }}>{v}</div>
                  ))}
                </div>
              ))}
            </div>
            <div className="heatmap-legend mono">
              <span className="hm-scale-label">scale · attacks blocked per 1,000 transactions</span>
              <div className="hm-scale">
                <span>0</span>
                <div className="hm-gradient"/>
                <span>100+</span>
              </div>
            </div>
            <div className="drift-foot mono">aggregated from Guard Agent · pattern detection normalized across ecosystems</div>
          </div>
        </div>

        {/* ─── Closing strip · Intelligence API · who consumes Radar ─── */}
        <div className="radar-closer radar-closer-bottom">
          <div className="radar-closer-foot mono">
            <span>Three data-series no one else has · federated across 6 registries · single source of truth</span>
            <span style={{ color: "var(--gold)" }}>See full API reference → radar.paxio.network/api</span>
          </div>
        </div>
      </SectionFrame>
    );
  }

  function MiniSpark({ seed=1, dir="up" }) {
    const data = useMemo(() => {
      let s = seed * 9301 + 49297;
      let v = 50;
      const out = [];
      for (let i=0;i<22;i++){ s = (s*9301+49297)%233280; const r=(s/233280-0.5)*12; v=Math.max(5,Math.min(95,v+r)); out.push(v); }
      if (dir==="up") out.sort((a,b)=>0.2-Math.random()); return out;
    }, [seed, dir]);
    const w=90, h=18;
    const max=Math.max(...data), min=Math.min(...data);
    const pts = data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/(max-min||1))*(h-2)-1}`).join(" ");
    return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={dir==="up"?"var(--up)":"var(--down)"} strokeWidth="1.3" opacity="0.9"/></svg>;
  }

  // ───────────────────────── Scroll 4 · FAP / rails ────────────────────
  function ScrollFAP() {
    const rails = [
      { k: "x402 / Coinbase",    sh: 68, lat: 120, cost: "0.18%", col: "#A54233", risk:"concentrated" },
      { k: "Paxio FAP",          sh: 18, lat:  90, cost: "0.10%", col: "#C08A2E", risk:"neutral" },
      { k: "Skyfire",            sh:  8, lat: 220, cost: "0.25%", col: "#35557A" },
      { k: "Stripe MPP",         sh:  5, lat: 340, cost: "2.9%+$0.30", col: "#4C7A3F" },
      { k: "BTC L1",             sh:  1, lat: 600, cost: "flat sat", col: "#C08A2E", tag:"growing" },
      { k: "USDC-Solana",        sh:  0.5, lat: 45, cost: "0.01%", col: "#6E4A82" },
    ];
    return (
      <SectionFrame n={4}
        anchor="pay"
        screenLabel="04 Pay · FAP"
        kicker="Pay · FAP · Buyers, enterprises"
        title={<>Pay any agent.<br/><span className="serif display-italic">In any rail. In one call.</span></>}
        sub={<>Stop picking sides. Paxio FAP is the <b>neutral meta-facilitator</b> — it routes every transaction through the optimal rail (x402, USDC-Base, USDC-Solana, Stripe MPP, BTC L1, µAgent) and falls back automatically. One endpoint. Every agent. Every payer.</>}
        href="https://pay.paxio.network"
        cta="Try FAP"
      >
        <div className="fap-stage b5">
          {/* Map — self-contained, FEE inline on each node (P0·8) */}
          <div className="fap-map b5" style={{ position: "relative", aspectRatio: "1 / 1", maxWidth: 620, width: "100%", margin: "20px auto 48px", boxSizing: "border-box" }}>
            <div className="fap-center">
              <div className="fap-center-inner">
                <div className="mono" style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.14em" }}>PAXIO FAP</div>
                <div style={{ fontFamily: "var(--f-display)", fontSize: 22, color: "var(--ink-0)", marginTop: 2 }}>routing</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>one endpoint</div>
              </div>
            </div>
            {rails.map((r,i) => {
              const ang = (i / rails.length) * Math.PI * 2 - Math.PI/2;
              const rad = 200;
              const x = Math.cos(ang) * rad;
              const y = Math.sin(ang) * rad;
              return (
                <div key={r.k} className="fap-node b5" style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  borderColor: r.col,
                }}>
                  <div className="fap-node-dot" style={{ background: r.col }}/>
                  <span className="mono fap-node-title" style={{ fontSize: 11, color: "var(--ink-0)" }}>{r.k}</span>
                  <span className="mono" style={{ fontSize: 9.5, color: r.col }}>{r.sh}% · {r.lat}ms</span>
                  <span className="mono fap-node-fee" style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.04em" }}>fee · {r.cost}</span>
                  {r.risk === "concentrated" && <span className="fap-flag warn">⚠ risk</span>}
                  {r.risk === "neutral"      && <span className="fap-flag gold">◆ neutral</span>}
                  {r.tag === "growing"       && <span className="fap-flag gold">▲ +0.7pp</span>}
                </div>
              );
            })}
            {/* lines */}
            <svg className="fap-lines" viewBox="-250 -250 500 500">
              {rails.map((r,i) => {
                const ang = (i / rails.length) * Math.PI * 2 - Math.PI/2;
                const rad = 200;
                return <line key={i} x1="0" y1="0" x2={Math.cos(ang)*rad*0.55} y2={Math.sin(ang)*rad*0.55} stroke={r.col} strokeWidth="1" strokeDasharray="3 4" opacity="0.5"/>;
              })}
            </svg>
          </div>

          {/* Footer groups — three distinct thoughts (P1·21) */}
          <div className="fap-foot-groups">
            <div className="fap-fg fap-fg-feature">
              <div className="fap-fg-label mono">feature</div>
              <div className="fap-fg-body">Auto-failover · agent-side never changes · fee optimization live</div>
            </div>
            <div className="fap-fg fap-fg-warn">
              <div className="fap-fg-label mono">systemic risk</div>
              <div className="fap-fg-body"><b>HHI 4,620</b> — single-facilitator concentration</div>
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

  // ───────────────────────── Scroll 5 · The Network ─────────────────────
  // Architecture note (honest):
  //  • Graph is NOT a live stream. It's a 5-min aggregated SNAPSHOT.
  //  • Backend would push new snapshot every 3s · frontend transitions 600ms.
  //  • Node size = volume in window · link weight = txn count between pair.
  //  • Link fades if no new activity in 30s. Simulated here with the same rules.
  //  • Counters (tx total · value moved) tick every 1s via rate-based increment.
  //  • Shows "top 50 agents by volume, last 5 min" — honest framing.
  function ScrollNetwork() {
    const NODES = [
      { id: "btc-escrow.paxio",      x: 50, y: 28, btc: true },
      { id: "legal-trans.de",        x: 82, y: 38 },
      { id: "price-oracle.mcp",      x: 74, y: 70 },
      { id: "guard.complior.ai",     x: 28, y: 62 },
      { id: "dca-agent.fetch",       x: 14, y: 36, btc: true },
      { id: "invoice-agent.paxio",   x: 52, y: 82 },
      { id: "verify.agent",          x: 42, y: 48 },
      { id: "yield-bot.virtuals",    x: 88, y: 20 },
      { id: "payroll.fleet",         x: 18, y: 82 },
    ];
    // Baseline 5-min aggregate — volume per node, count+volume per pair.
    // Units: volUsd. This is the "snapshot" shape the backend would push.
    const BASE_SNAPSHOT = {
      nodeVol: [28400, 4200, 2100, 12800, 18600, 1400, 3800, 6200, 2400],
      pairs: [
        // [fromIdx, toIdx, count, volUsd, btc]
        [0, 1, 14,  8400,  true],
        [4, 0, 9,  14200,  true],
        [0, 5, 11,  2100,  true],
        [3, 6, 82,   920, false],
        [4, 2, 640,   120, false],
        [1, 2, 38,   440, false],
        [7, 2, 210,    80, false],
        [3, 8, 22,   612, false],
        [6, 5, 56,    12, false],
        [2, 7, 420,    40, false],
      ],
    };

    // Latest snapshot + map of pair "lastActive" timestamp (ms).
    const [snap, setSnap] = React.useState(() => {
      const now = Date.now();
      return { nodeVol: BASE_SNAPSHOT.nodeVol.slice(), pairs: BASE_SNAPSHOT.pairs.map(p => [...p, now]) };
    });

    // Snapshot refresh — every 3s, jitter volumes ±12%, refresh "lastActive" for ~60% of pairs.
    React.useEffect(() => {
      const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      const iv = setInterval(() => {
        setSnap(prev => {
          const now = Date.now();
          const nodeVol = prev.nodeVol.map(v => Math.max(500, v * (0.88 + Math.random() * 0.24)));
          const pairs = prev.pairs.map(p => {
            const [f, t, c, v, btc, last] = p;
            const stillActive = Math.random() < 0.6;
            return [f, t,
              Math.round(c * (0.88 + Math.random() * 0.24)),
              Math.round(v * (0.88 + Math.random() * 0.24)),
              btc,
              stillActive ? now : last];
          });
          return { nodeVol, pairs };
        });
      }, 3000);
      return () => clearInterval(iv);
    }, []);

    // Force 1s repaint so "seconds since last activity" numbers & fade advance smoothly.
    const [, force] = React.useState(0);
    React.useEffect(() => {
      const iv = setInterval(() => force(n => n + 1), 1000);
      return () => clearInterval(iv);
    }, []);

    // Rate-based counter (tx · 24h) — ticks every 1s, rate ≈ 14 tx/s.
    const [txnCount, setTxnCount] = React.useState(1204883);
    const [valueMoved, setValueMoved] = React.useState(18200000);
    React.useEffect(() => {
      const iv = setInterval(() => {
        setTxnCount(n => n + 14);
        setValueMoved(v => v + 2100);
      }, 1000);
      return () => clearInterval(iv);
    }, []);

    // Derived visuals
    const now = Date.now();
    const maxVol = Math.max(...snap.nodeVol);
    const nodeRadius = (vol) => 8 + (vol / maxVol) * 18;   // svg units
    const maxCount = Math.max(...snap.pairs.map(p => p[2]));
    const linkWeight = (c) => 0.2 + (c / maxCount) * 0.9;
    const fadeFor = (lastActive) => {
      const age = (now - lastActive) / 1000;
      if (age < 3) return 0.85;
      if (age < 30) return 0.85 - (age - 3) * (0.55 / 27);
      return Math.max(0, 0.30 - (age - 30) * 0.02);
    };

    // Feed mirror for mobile — derived from snapshot pairs (most recent first)
    const feedRows = [...snap.pairs]
      .sort((a, b) => b[5] - a[5])
      .slice(0, 5)
      .map(([f, t, c, v, btc, last]) => ({
        from: NODES[f].id, to: NODES[t].id,
        amount: v >= 1000 ? `$${(v/1000).toFixed(1)}K` : `$${v}`,
        rail: btc ? "BTC" : (c > 100 ? "x402" : "USDC"),
        btc, ago: Math.max(0, Math.round((now - last) / 1000))
      }));

    // Busiest pair gets a floating amount label
    const topPairs = [...snap.pairs].sort((a, b) => b[3] - a[3]).slice(0, 3);

    return (
      <SectionFrame n={5}
        anchor="network"
        screenLabel="05 The Network"
        kicker="§05 · The Network · aggregated"
        title={<>Agents are already hiring each other.<br/><span className="serif display-italic">No human in the loop.</span></>}
        sub={<>Every node is an agent with a wallet, a reputation score and a policy. When one needs something, it finds, verifies, and pays another — in any rail, in any currency — <b>and the humans find out from the audit log, if at all</b>.</>}
      >
        <div className="network-meta mono" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 14, paddingBottom: 10, borderBottom: "1px dashed var(--line-soft)" }}>
          <span>TOP 50 AGENTS BY VOLUME · LAST 5 MIN</span>
          <span>SNAPSHOT REFRESH · 3s · TRANSITION 600ms</span>
          <span>LINKS FADE AFTER 30s INACTIVITY</span>
          <span style={{ color: "var(--gold)" }}>● next snapshot in {3 - (Math.floor((Date.now() % 3000) / 1000))}s</span>
        </div>

        <div className="network-stage" aria-hidden="true">
          <svg className="network-canvas" viewBox="0 0 100 100" preserveAspectRatio="none">
            {snap.pairs.map((p, i) => {
              const [f, t, c, v, btc, last] = p;
              const from = NODES[f]; const to = NODES[t];
              const op = fadeFor(last);
              if (op <= 0.01) return null;
              // P0·9 — keep edges persistently visible (no animation-driven fadeout-to-0)
              return (
                <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={btc ? "var(--gold)" : "var(--ink-0)"}
                  strokeWidth={linkWeight(c)}
                  strokeDasharray="1.5 0.8"
                  className="network-link b5"
                  style={{ transition: "stroke-width 600ms ease, opacity 600ms ease" }}
                  opacity={op}/>
              );
            })}
          </svg>
          {NODES.map((n, i) => {
            const r = nodeRadius(snap.nodeVol[i]);
            const busy = snap.pairs.some(p => (p[0] === i || p[1] === i) && (now - p[5]) < 4000);
            // Emulate "size class" from continuous radius for CSS pill chips
            const sizeClass = r > 18 ? "lg" : r > 12 ? "md" : "sm";
            return (
              <div key={n.id} className={`network-node size-${sizeClass} ${busy ? "busy" : ""} ${n.btc ? "btc" : ""}`}
                style={{
                  left: `${n.x}%`, top: `${n.y}%`,
                  transition: "transform 600ms ease, box-shadow 600ms ease",
                  transform: `translate(-50%,-50%) scale(${0.85 + (r - 8) / 40})`
                }}>
                <span className="mono">{n.id}</span>
              </div>
            );
          })}
          {topPairs.map((p, i) => {
            const [f, t, c, v, btc, last] = p;
            if (now - last > 6000) return null;
            const from = NODES[f]; const to = NODES[t];
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const amount = v >= 1000 ? `$${(v/1000).toFixed(1)}K` : `$${v}`;
            return (
              <div key={i + "-lbl"} className={`network-amount mono ${btc ? "btc" : ""}`}
                   style={{ left: `${mx}%`, top: `${my}%`, transition: "opacity 600ms ease" }}>
                {amount}<span className="rail">· {c} tx</span>
              </div>
            );
          })}
        </div>

        {/* Mobile transaction table — also snapshot-derived */}
        <div className="network-mobile-table mono">
          <div className="nmt-head">
            <span>From</span><span>To</span><span>Vol·5m</span><span>Rail</span><span>Last</span>
          </div>
          {feedRows.map((r,i) => (
            <div key={i} className="nmt-row">
              <span>{r.from}</span>
              <span>→ {r.to}</span>
              <span className={r.btc ? "gold" : ""}>{r.amount}</span>
              <span>{r.rail}</span>
              <span>{r.ago}s</span>
            </div>
          ))}
        </div>

        {/* Counter — rate-based increment (14 tx/s · $2.1K/s) */}
        <div className="network-counter">
          <div className="nc-cell">
            <div className="nc-num">{txnCount.toLocaleString()}</div>
            <div className="nc-lbl mono">A2A transactions · last 24h · ≈ 14/s</div>
          </div>
          <div className="nc-cell">
            <div className="nc-num">${(valueMoved/1e6).toFixed(2)}M</div>
            <div className="nc-lbl mono">Value moved · last 24h · ≈ $2.1K/s</div>
          </div>
          <div className="nc-cell nc-final">
            No human approved any of them.
          </div>
          <div className="nc-note mono">graph = aggregated 5-min snapshot · refresh 3s · counters = rate-based · simulated until launch</div>
        </div>

        {/* Three steps */}
        <div className="network-steps">
          {[
            ["01", "Discovery",     <code className="mono" key="a">find_agent({"{"} capability: "legal-translation", min_reputation: 800 {"}"})</code>, "→ Returns 47 matching agents"],
            ["02", "Verification",  "Checks reputation + drift score via Intelligence API.", "Guard confirms safe. Risk score: 12/100."],
            ["03", "Payment",       "Pays via FAP — x402 · BTC · USDC · any rail · automatic.", "No human approval. No invoice."],
          ].map(([n, title, a, b]) => (
            <div key={n} className="ns-card">
              <div className="ns-num">{n}</div>
              <div className="ns-title">{title}</div>
              <div className="ns-body">{a}</div>
              <div className="ns-body dim">{b}</div>
            </div>
          ))}
        </div>

        {/* Primary + secondary CTA (P1·20) */}
        <div className="network-cta-wrap b5">
          <a href="https://registry.paxio.network/register" className="network-cta">
            Register your agent — join the network →
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

  // ───────────────────────── §04 → §05 divider ───────────────────────────
  function ScrollDivider() {
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

  // ───────────────────────── Scroll 5 · Fleet (DEPRECATED) ───────────────
  // Section removed — functionality consolidated into §05 The Network and §06 Enterprise door.
  function ScrollFleet() { return null; }

  // ───────────────────────── Scroll 6 · Pick your door ──────────────────
  function ScrollDoors() {
    const doors = [
      {
        tag:"Builder",
        title:"Install the SDK",
        desc:"Turn any MCP tool into an economic actor. Wallet + rails + reputation in 6 lines.",
        href:"https://docs.paxio.network",
        kpi:"npm i @paxio/sdk",
        kpi_sub:"60-second setup"
      },
      {
        tag:"Buyer",
        title:"Open the Registry",
        desc:"Search 2.4M agents across 6 registries. Filter by vol, success, wallet, rail, drift.",
        href:"https://registry.paxio.network",
        kpi:"2,483,925",
        kpi_sub:"agents indexed"
      },
      {
        tag:"Analyst",
        title:"Get Intel access",
        desc:"PAEI indices, wallet adoption, facilitator HHI, drift feed. CSV / JSON / real-time.",
        href:"https://radar.paxio.network",
        kpi:"40+",
        kpi_sub:"funds subscribed"
      },
      {
        tag:"Enterprise",
        title:"Talk to us",
        desc:"Intel API + private FAP routing + NDA-covered pilots. For funds, compliance teams, risk desks.",
        href:"https://paxio.network/contact",
        kpi:"Custom",
        kpi_sub:"integration",
        note:"We'll respond within 24h"
      },
    ];
    return (
      <section className="scroll-section tone-paper doors-section">
        <div className="scroll-inner">
          <div className="kicker" style={{ marginBottom: 16 }}>
            <span className="dot">●</span> §06 · Pick your door
          </div>
          <h2 className="scroll-title h-display" style={{ marginBottom: 28 }}>
            Four ways to enter the<br/><span className="serif display-italic">agentic economy.</span>
          </h2>

          {/* Grouped 2+2 — self-serve on left, sales-serve on right (P1·22) */}
          <div className="doors-grid-v2">
            <div className="doors-group">
              <div className="doors-group-label mono">
                <span className="dgl-dot">◆</span> Self-serve · ship today
              </div>
              <div className="doors-group-cards">
                {doors.slice(0,2).map((d,i) => (
                  <a key={i} href={d.href} className="door-card">
                    <div className="door-tag mono">{d.tag}</div>
                    <div className="door-kpi mono">{d.kpi}</div>
                    <div className="door-kpi-sub mono">{d.kpi_sub}</div>
                    <h3 className="door-title">{d.title}</h3>
                    <p className="door-desc">{d.desc}</p>
                    {d.note && <div className="door-note mono">{d.note}</div>}
                    <div className="door-link mono">{d.href.replace("https://","")} ↗</div>
                  </a>
                ))}
              </div>
            </div>
            <div className="doors-divider" aria-hidden="true"/>
            <div className="doors-group">
              <div className="doors-group-label mono">
                <span className="dgl-dot">◆</span> Sales-serve · pilot with us
              </div>
              <div className="doors-group-cards">
                {doors.slice(2,4).map((d,i) => (
                  <a key={i} href={d.href} className="door-card">
                    <div className="door-tag mono">{d.tag}</div>
                    <div className="door-kpi mono">{d.kpi}</div>
                    <div className="door-kpi-sub mono">{d.kpi_sub}</div>
                    <h3 className="door-title">{d.title}</h3>
                    <p className="door-desc">{d.desc}</p>
                    {d.note && <div className="door-note mono">{d.note}</div>}
                    <div className="door-link mono">{d.href.replace("https://","")} ↗</div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Closing sum-up — new aggregation, resonates with §05 (P0·10) */}
          <div className="closing-sum">
            <div className="cs-kicker mono">Last 24h on Paxio</div>
            <div className="cs-row">
              <div className="cs-cell">
                <div className="cs-num">1.22M</div>
                <div className="cs-lbl mono">A2A transactions</div>
              </div>
              <div className="cs-sep">·</div>
              <div className="cs-cell">
                <div className="cs-num">48,291</div>
                <div className="cs-lbl mono">agents involved</div>
              </div>
              <div className="cs-sep">·</div>
              <div className="cs-cell">
                <div className="cs-num cs-gold">$20.7M</div>
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

  // ───────────────────────── Container ──────────────────────────────────
  function PaxioLandingScrolls() {
    return (
      <div className="scrolls-wrap">
        <ScrollSDK/>
        <ScrollBitcoin/>
        <ScrollRadar/>
        <ScrollFAP/>
        <ScrollDivider/>
        <ScrollNetwork/>
        <ScrollDoors/>
      </div>
    );
  }

  window.PaxioLandingScrollsB5 = PaxioLandingScrolls;
})();
