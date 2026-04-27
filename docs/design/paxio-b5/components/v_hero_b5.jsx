// Paxio Hero — Variant B3 · Bloomberg of Agents
// Data-rich hero surfacing agent financials (wallet / rails / facilitator),
// operational health (uptime / latency / drift / guard attacks) and
// market structure (adoption / concentration / drift watch).

(function () {
  const { useState, useMemo, useEffect } = React;

  // ─── dataset ─────────────────────────────────────────────────────────────
  // Shape: {name, did, source, category, wallet:{status,type}, rails[], facilitator,
  //        rep, repD, vol24, success, uptime, p50, guard24, driftHoursAgo, seed, verif}
  const AGENTS = [
    { n:"btc-escrow.paxio",     d:"did:paxio:0x91…71e2", src:"paxio-native", cat:"Bitcoin · Escrow",    w:{s:"paxio-native",t:"btc+usdc"}, r:["BTC L1","USDC","x402"], fac:"Paxio FAP",   rep:812, repD:+12, vol24:8400000, success:98.7, uptime:99.4, p50:284,  guard24:12, drift:null, seed:2,  verif:"gold" },
    { n:"btc-dca.paxio",        d:"did:paxio:0x4f…bb09", src:"paxio-native", cat:"Bitcoin · DCA",        w:{s:"paxio-native",t:"btc+usdc"}, r:["BTC L1","USDC","x402"], fac:"Paxio FAP",   rep:881, repD:+6,  vol24:2100000, success:99.2, uptime:99.8, p50:210,  guard24:3,  drift:null, seed:5,  verif:"gold" },
    { n:"payroll-agent.paxio",  d:"did:paxio:0x6e…2b88", src:"paxio-native", cat:"Finance · Payroll",    w:{s:"paxio-native",t:"multi"},    r:["USDC","x402","Stripe MPP"], fac:"Paxio FAP", rep:798, repD:+2,  vol24:412000,  success:97.8, uptime:99.2, p50:340,  guard24:8,  drift:22,   seed:8,  verif:"silver" },
    { n:"guard.complior.ai",    d:"did:paxio:0x8c…f2a1", src:"ERC-8004",     cat:"Security · Guard",     w:{s:"external",t:"evm"},          r:["USDC","x402"],            fac:"Paxio FAP",   rep:952, repD:+18, vol24:482000,  success:96.1, uptime:99.9, p50:110,  guard24:0,  drift:null, seed:3,  verif:"gold" },
    { n:"comply.complior.ai",   d:"did:paxio:0x7d…c112", src:"ERC-8004",     cat:"Compliance · Audit",   w:{s:"external",t:"evm"},          r:["USDC","x402"],            fac:"Coinbase x402", rep:927, repD:+9,  vol24:310000,  success:95.3, uptime:99.7, p50:180,  guard24:2,  drift:null, seed:4,  verif:"gold" },
    { n:"fraud-watch.finix",    d:"did:paxio:0xa1…d301", src:"ERC-8004",     cat:"Fraud · Finance",      w:{s:"external",t:"evm"},          r:["USDC","x402","Stripe MPP"], fac:"Coinbase x402", rep:871, repD:+24, vol24:221000,  success:94.7, uptime:98.8, p50:410,  guard24:31, drift:14,   seed:7,  verif:"gold" },
    { n:"invoice-agent.paxio",  d:"did:paxio:0x22…0a5c", src:"paxio-native", cat:"Finance · Invoicing",  w:{s:"paxio-native",t:"multi"},    r:["USDC","Stripe MPP"],      fac:"Paxio FAP",   rep:842, repD:+5,  vol24:94000,   success:97.2, uptime:99.5, p50:260,  guard24:4,  drift:null, seed:1,  verif:"silver" },
    { n:"contracts.arcanum",    d:"did:paxio:0x12…c4e1", src:"ERC-8004",     cat:"Legal · Contracts",    w:{s:"external",t:"evm"},          r:["USDC","x402"],            fac:"Skyfire",     rep:791, repD:+7,  vol24:72000,   success:93.4, uptime:98.2, p50:620,  guard24:9,  drift:null, seed:12, verif:"silver" },
    { n:"legal-trans.de",       d:"did:paxio:0x3b…88aa", src:"MCP",          cat:"Legal · Translate",    w:{s:"external",t:"evm"},          r:["USDC","Skyfire"],          fac:"Skyfire",     rep:884, repD:-3,  vol24:184000,  success:94.3, uptime:97.1, p50:820,  guard24:4,  drift:2,    seed:6,  verif:"silver" },
    { n:"forecast.delphi",      d:"did:paxio:0xe4…3318", src:"Fetch",        cat:"Research · Forecast",  w:{s:"external",t:"fetch"},        r:["µAgent / FET"],            fac:"self-hosted", rep:812, repD:+8,  vol24:58000,   success:92.0, uptime:98.0, p50:920,  guard24:0,  drift:null, seed:9,  verif:"silver" },
    { n:"research.atlas",       d:"did:paxio:0xc2…77b1", src:"Fetch",        cat:"Research · Synthesis", w:{s:"external",t:"fetch"},        r:["µAgent / FET"],            fac:"self-hosted", rep:765, repD:-1,  vol24:41000,   success:91.4, uptime:98.2, p50:1100, guard24:2,  drift:null, seed:10, verif:"silver" },
    { n:"dex-router.virtuals",  d:"did:paxio:0x9a…ee12", src:"Virtuals",     cat:"DeFi · Routing",       w:{s:"external",t:"evm"},          r:["USDC","x402"],            fac:"Coinbase x402", rep:732, repD:+4,  vol24:1240000, success:96.8, uptime:99.1, p50:220,  guard24:47, drift:null, seed:14, verif:"silver" },
    { n:"code-review.eliza",    d:"did:paxio:0x2f…99c3", src:"ElizaOS",      cat:"Dev · Code Review",    w:{s:"external",t:"evm"},          r:["USDC"],                    fac:"self-hosted", rep:701, repD:+11, vol24:28000,   success:93.8, uptime:99.0, p50:560,  guard24:1,  drift:null, seed:15, verif:"basic" },
    { n:"scrape.wayfinder",     d:"did:paxio:0x77…4410", src:"MCP",          cat:"Infra · Scraping",     w:{s:"none",t:null},               r:[],                          fac:"none",        rep:540, repD:+2,  vol24:0,       success:0,    uptime:96.0, p50:1400, guard24:0,  drift:null, seed:16, verif:"basic" },
    { n:"support.acme",         d:"did:paxio:0x5d…1009", src:"paxio-native", cat:"CX · Tier-1",          w:{s:"paxio-native",t:"usdc"},     r:["USDC","x402"],             fac:"Paxio FAP",   rep:612, repD:+4,  vol24:12000,   success:95.1, uptime:99.3, p50:340,  guard24:0,  drift:null, seed:11, verif:"basic" },
    { n:"translate.gemini",     d:"did:paxio:0x44…bc78", src:"MCP",          cat:"Language · MT",        w:{s:"none",t:null},               r:[],                          fac:"none",        rep:488, repD:0,   vol24:0,       success:0,    uptime:99.1, p50:480,  guard24:6,  drift:null, seed:17, verif:"basic" },
  ];

  // ─── helpers ─────────────────────────────────────────────────────────────
  function seeded(seed, n=24) {
    let s = seed * 9301 + 49297;
    const out = [];
    let last = 50 + (seed % 20);
    for (let i=0;i<n;i++) {
      s = (s * 9301 + 49297) % 233280;
      const r = (s / 233280 - 0.5) * 14;
      last = Math.max(10, Math.min(100, last + r));
      out.push(last);
    }
    return out;
  }
  function Spark({ seed, w=64, h=18 }) {
    const data = useMemo(() => seeded(seed), [seed]);
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h - ((v-min)/(max-min||1))*(h-2) - 1}`).join(" ");
    const trend = data[data.length-1] > data[0];
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
        <polyline points={pts} fill="none" stroke={trend?"var(--up)":"var(--down)"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
      </svg>
    );
  }
  const fmtMoney = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : n===0 ? "—" : `$${n}`;

  // ─── 3-lane live ticker ──────────────────────────────────────────────────
  function useTicker() {
    const [v, setV] = useState({
      paei: 1284.7, paeiD: +0.82, btc: 431.9, btcD: +1.42, legal: 892.1, legalD: -0.31,
      finance: 1147.3, financeD: +1.15, research: 642.0, researchD: +0.18, cx: 218.4, cxD: -0.05,
      wallet_adoption: 42.1, wallet_adoption_d: +2.1,
      x402_share: 68.2, x402_share_d: -0.4,
      btc_share: 9.1,   btc_share_d: +0.7,
      hhi: 4620,
      drift7: 312, attacks24: 1204883,
      sla_p50: 98.2, fap_throughput: 18_200_000, uptime_avg: 99.1,
      agents: 2483921, txns: 1204883,
    });
    useEffect(() => {
      const i = setInterval(() => {
        setV(o => ({
          ...o,
          paei: +(o.paei + (Math.random()-0.45)*0.7).toFixed(2),
          btc:  +(o.btc + (Math.random()-0.4)*0.5).toFixed(2),
          legal:+(o.legal + (Math.random()-0.5)*0.4).toFixed(2),
          finance:+(o.finance + (Math.random()-0.45)*0.6).toFixed(2),
          research:+(o.research + (Math.random()-0.5)*0.3).toFixed(2),
          cx:+(o.cx + (Math.random()-0.5)*0.2).toFixed(2),
          wallet_adoption: +(o.wallet_adoption + (Math.random()-0.5)*0.04).toFixed(2),
          x402_share: +(o.x402_share + (Math.random()-0.5)*0.05).toFixed(2),
          btc_share: +(o.btc_share + (Math.random()-0.5)*0.03).toFixed(2),
          attacks24: o.attacks24 + Math.floor(Math.random()*40),
          agents: o.agents + (Math.random() < 0.4 ? 1 : 0),
        }));
      }, 1100);
      return () => clearInterval(i);
    }, []);
    return v;
  }

  function TickerCell({ label, val, delta, unit, gold, warn }) {
    const up = (delta ?? 0) >= 0;
    return (
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, paddingRight: 14, borderRight: "1px dashed rgba(26,22,18,0.18)", whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: "0.12em", color: gold?"var(--gold)":warn?"var(--down)":"var(--ink-3)" }}>{label}</span>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: gold?"var(--gold)":warn?"var(--down)":"var(--ink-0)", fontWeight: 500 }}>{typeof val === "number" ? val.toLocaleString(undefined,{maximumFractionDigits:2}) : val}{unit}</span>
        {delta != null && (
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: up?"var(--up)":"var(--down)" }}>
            {up?"▲":"▼"}{Math.abs(delta).toFixed(2)}{unit?"pp":"%"}
          </span>
        )}
      </span>
    );
  }

  // ─── facets ──────────────────────────────────────────────────────────────
  const SOURCES = ["All","paxio-native","ERC-8004","MCP","Fetch","Virtuals","ElizaOS"];
  const CATS = ["All","Bitcoin","Finance","Security","Compliance","Legal","Research","DeFi","Dev","CX","Infra","Language"];
  const WALLETS = [["all","all wallets"],["paxio-native","paxio-native"],["external","external"],["none","none"]];
  const VERIFS = [["all","★ all"],["gold","★ gold"],["silver","silver"],["basic","basic"]];

  const SRC_COLOR = {
    "paxio-native":"#C08A2E", "ERC-8004":"#35557A", "MCP":"#6E4A82",
    "Fetch":"#4C7A3F", "Virtuals":"#A54233", "ElizaOS":"#2A241C"
  };

  // ─── variant ─────────────────────────────────────────────────────────────
  function VariantB3() {
    const t = useTicker();
    const [q, setQ] = useState("");
    const [src, setSrc] = useState("All");
    const [cat, setCat] = useState("All");
    const [wallet, setWallet] = useState("all");
    const [verif, setVerif] = useState("all");
    const [sort, setSort] = useState("vol");

    const rows = useMemo(() => {
      const qq = q.trim().toLowerCase();
      let r = AGENTS.filter(a => {
        if (src !== "All" && a.src !== src) return false;
        if (cat !== "All" && !a.cat.includes(cat)) return false;
        if (wallet !== "all" && a.w.s !== wallet) return false;
        if (verif !== "all" && a.verif !== verif) return false;
        if (!qq) return true;
        return a.n.toLowerCase().includes(qq) || a.cat.toLowerCase().includes(qq) || a.d.toLowerCase().includes(qq);
      });
      r = [...r].sort((a,b) => {
        if (sort==="vol") return b.vol24 - a.vol24;
        if (sort==="success") return b.success - a.success;
        if (sort==="rep") return b.rep - a.rep;
        if (sort==="repDelta") return b.repD - a.repD;
        if (sort==="uptime") return b.uptime - a.uptime;
        return 0;
      });
      return r;
    }, [q, src, cat, wallet, verif, sort]);

    // State of Economy
    const adoption = useMemo(() => {
      const by = {};
      for (const a of AGENTS) by[a.src] = by[a.src] || { tot:0, wal:0 };
      for (const a of AGENTS) { by[a.src].tot++; if (a.w.s !== "none") by[a.src].wal++; }
      const data = Object.entries(by).map(([k,v]) => ({ k, pct: Math.round(v.wal/v.tot*100), tot: v.tot }))
        .sort((a,b) => b.pct - a.pct);
      // fake fuller population numbers
      const fake = { "paxio-native":100, "Fetch":94, "ERC-8004":67, "Virtuals":45, "ElizaOS":38, "MCP":3 };
      return data.map(d => ({ ...d, pct: fake[d.k] ?? d.pct }));
    }, []);
    const facilitators = [
      ["Coinbase x402", 67, "#A54233", true],
      ["Paxio FAP",     18, "#C08A2E", false],
      ["Skyfire",        8, "#35557A", false],
      ["Stripe MPP",     5, "#4C7A3F", false],
      ["Self-hosted",    2, "#6D6147", false],
    ];
    const drifts = AGENTS.filter(a => a.drift != null).sort((a,b) => a.drift - b.drift);

    return (
      <div className="v-frame" id="registry" data-screen-label="01 Registry · Hero">
        <div className="v-stage" style={{ background: "var(--bg-0)" }}>
          {/* ─── Editorial "State of the Economy" strip ─── */}
          <div className="state-strip">
            <div className="kicker" style={{ marginBottom: 10 }}>
              <span className="dot">●</span> State of the Agentic Economy · Apr 19, 2026 · 09:42 UTC
            </div>
            <p className="state-text">
              <b style={{ color: "var(--ink-0)" }}>{t.agents.toLocaleString()}</b> agents indexed across 6 registries · <b style={{ color: "var(--ink-0)" }}>{t.wallet_adoption.toFixed(1)}%</b> with wallets (<span style={{color:"var(--up)"}}>▲{t.wallet_adoption_d}pp w/w</span>) · <b style={{ color: "var(--ink-0)" }}>${(t.fap_throughput/1e6).toFixed(1)}M</b> FAP throughput today · <b style={{ color: "var(--down)" }}>x402 {t.x402_share.toFixed(0)}%</b> of rails (concentration risk) · <b style={{ color: "var(--gold)" }}>BTC-native {t.btc_share.toFixed(1)}%</b> (<span style={{color:"var(--up)"}}>▲{t.btc_share_d}pp</span>) · <b style={{ color: "var(--down)" }}>{t.drift7}</b> agents drifted this week · <b style={{ color: "var(--ink-0)" }}>{(t.attacks24/1e6).toFixed(2)}M</b> Guard-blocked attacks (24h) · PAEI <b>{t.paei.toFixed(2)}</b> <span style={{color:"var(--up)"}}>▲{t.paeiD}%</span>
            </p>
          </div>

          {/* ─── Single-lane live ticker — INDICES only (no overlap with state strip) ─── */}
          <div className="ticker-stack b5">
            {[
              { lane: "INDICES",   items: [
                <TickerCell key="a" label="PAEI"          val={t.paei}     delta={t.paeiD}      gold/>,
                <TickerCell key="b" label="PAEI·BTC"      val={t.btc}      delta={t.btcD}       gold/>,
                <TickerCell key="c" label="PAEI·LEGAL"    val={t.legal}    delta={t.legalD}/>,
                <TickerCell key="d" label="PAEI·FINANCE"  val={t.finance}  delta={t.financeD}/>,
                <TickerCell key="e" label="PAEI·RESEARCH" val={t.research} delta={t.researchD}/>,
                <TickerCell key="f" label="PAEI·CX"       val={t.cx}       delta={t.cxD}/>,
                <TickerCell key="g" label="PAEI·SECURITY" val={948.2}      delta={+0.41}/>,
                <TickerCell key="h" label="PAEI·INFRA"    val={504.7}      delta={-0.12}/>,
                <TickerCell key="i" label="PAEI·DEFI"     val={712.4}      delta={+0.66}/>,
                <TickerCell key="j" label="PAEI·LANG"     val={283.9}      delta={+0.08}/>,
                <TickerCell key="k" label="PAEI·DEV"      val={416.1}      delta={+0.22}/>,
                <TickerCell key="l" label="PAEI·AGENTS"   val={t.agents.toLocaleString()}/>,
              ] },
            ].map(({lane, items}, i) => (
              <div key={i} className="ticker-lane">
                <span className="ticker-lane-label">{lane}</span>
                <div className="ticker-scroll">
                  <div className="ticker-inner">
                    {items}{items}{items}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Headline band ─── */}
          <div className="headline-band">
            <div className="headline-inner">
              <div className="kicker" style={{ marginBottom: 16, color: "var(--gold)" }}>
                <span className="dot" style={{ color: "var(--gold)" }}>●</span> Federated across ERC-8004 · MCP · A2A · Fetch.ai · Virtuals · ElizaOS · paxio-native
              </div>
              <h1 className="hero-headline-b4">
                <span className="hh-lede">One registry.</span>
                <span className="hh-rest serif display-italic">Every agent. Every rail.</span>
              </h1>

              {/* Contrast line — answers "Why Paxio, not Coinbase x402?" */}
              <div className="headline-contrast">
                <b>Coinbase x402</b> routes Coinbase. <span className="vs">vs</span>
                <b style={{ color: "var(--gold)", borderColor: "var(--gold)" }}>Paxio</b> routes <i>everything</i> — including the <b style={{ color: "var(--down)" }}>1.8M MCP tools</b> and <b style={{ color: "var(--down)" }}>Fetch/ElizaOS/Virtuals agents</b> x402 can't see.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, alignItems: "end", marginTop: 22 }}>
                <p style={{ fontSize: 16.5, color: "var(--ink-1)", lineHeight: 1.55, margin: 0 }}>
                  Paxio is the <b style={{ color: "var(--ink-0)" }}>meta-facilitator</b> of the agentic economy. We index <b style={{ color: "var(--ink-0)" }}>2.4M agents</b> across six competing registries, measure what matters — <b>volume, drift, attacks, wallet adoption</b> — and route payments across every rail including <b style={{ color: "var(--gold)" }}>Bitcoin</b> (ICP threshold-ECDSA, no wrapping, no bridges). One SDK turns any tool into an economic actor. <b style={{ color: "var(--ink-0)" }}>One registry sees everyone.</b>
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <a href="https://registry.paxio.network" className="btn solid">Open the Registry →</a>
                  <a href="#quickstart" className="btn ghost">Install the SDK</a>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Facets ─── */}
          <div className="facets">
            <FacetRow label="Source" items={SOURCES} pick={src} setPick={setSrc} colorMap={SRC_COLOR}/>
            <FacetRow label="Category" items={CATS} pick={cat} setPick={setCat}/>
            <FacetRow label="Wallet" items={WALLETS.map(w=>w[0])} labels={WALLETS.map(w=>w[1])} pick={wallet} setPick={setWallet}/>
            <FacetRow label="Verified" items={VERIFS.map(w=>w[0])} labels={VERIFS.map(w=>w[1])} pick={verif} setPick={setVerif}/>
          </div>

          {/* ─── Search + sort ─── */}
          <div className="search-bar">
            <div className="search-bar-inner">
              <span className="mono" style={{ color: "var(--gold)", fontSize: 13 }}>⌕</span>
              <input
                value={q} onChange={e=>setQ(e.target.value)}
                placeholder={`Search ${t.agents.toLocaleString()} agents — capability, family, DID…`}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--ink-0)", fontSize: 14.5, fontFamily: "var(--f-sans)" }}
              />
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em" }}>⌘K</span>
              <span style={{ width: 1, height: 18, background: "var(--ink-0)", opacity: 0.2 }}/>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", display: "flex", gap: 4, alignItems: "center" }}>
                SORT
                {[["vol","vol·24h"],["success","success%"],["rep","rep"],["repDelta","Δrep"],["uptime","uptime"]].map(([k,l]) => (
                  <button key={k} onClick={()=>setSort(k)} className="sort-pill" style={{
                    background: sort===k?"var(--ink-0)":"transparent", color: sort===k?"var(--paper-0)":"var(--ink-2)",
                  }}>{l}</button>
                ))}
              </div>
              <span style={{ width: 1, height: 18, background: "var(--ink-0)", opacity: 0.2 }}/>
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>
                {rows.length.toLocaleString()} of {t.agents.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ─── TABLE ─── */}
          <div className="directory-table b3">
            <div className="directory-head mono b3-grid">
              <span>Agent · DID</span>
              <span>Source</span>
              <span>Wallet · Rails</span>
              <span style={{ textAlign: "right" }}>Vol·24h <span className="src-tag">FAP</span></span>
              <span style={{ textAlign: "right" }}>Success <span className="src-tag">FAP</span></span>
              <span style={{ textAlign: "right" }}>Rep <span className="src-tag">ICP+8004</span></span>
              <span style={{ textAlign: "right" }}>Uptime · p50 <span className="src-tag">5m</span></span>
              <span style={{ textAlign: "right" }}>Guard·24h <span className="src-tag">Guard</span></span>
              <span>Drift <span className="src-tag">24h diff</span></span>
              <span>Trend</span>
              <span></span>
            </div>
            {rows.map((a,i) => (
              <div key={i} className="directory-row b3-grid">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {a.src==="paxio-native" && a.cat.startsWith("Bitcoin") && <span style={{ color: "var(--gold)", fontFamily: "var(--f-mono)" }}>₿</span>}
                    <span className="mono" style={{ fontSize: 13, color: "var(--ink-0)" }}>{a.n}</span>
                    {a.verif==="gold" && <span title="Gold-verified" style={{ color:"var(--gold)", fontSize: 11 }}>★</span>}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3 }}>{a.d}</div>
                </div>
                <div>
                  <span className="src-badge" style={{ borderColor: SRC_COLOR[a.src] || "var(--ink-0)", color: SRC_COLOR[a.src] || "var(--ink-1)" }}>{a.src}</span>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{a.cat}</div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {a.w.s === "paxio-native" && <span className="wallet-pill paxio">◈ Paxio Wallet</span>}
                    {a.w.s === "external" && <span className="wallet-pill external">◌ {a.w.t}</span>}
                    {a.w.s === "none" && <span className="wallet-pill none">no wallet</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4, fontFamily: "var(--f-mono)" }}>
                    {a.r.length ? a.r.map((rl,j) => (
                      <span key={j} style={{ color: rl.includes("BTC") ? "var(--gold)" : rl.includes("x402") ? "var(--down)" : "var(--ink-2)" }}>{rl}</span>
                    )).reduce((prev,curr)=>[prev,<span key={"s"+Math.random()} style={{color:"var(--ink-3)",opacity:0.4}}> · </span>,curr]) : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--f-mono)" }}>fac: <span style={{ color: a.fac==="Paxio FAP" ? "var(--gold)" : a.fac==="Coinbase x402" ? "var(--down)" : "var(--ink-2)" }}>{a.fac}</span></div>
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--f-mono)", fontSize: 13, color: a.vol24===0?"var(--ink-3)":(a.cat.startsWith("Bitcoin")?"var(--gold)":"var(--ink-0)") }}>{fmtMoney(a.vol24)}</div>
                <div style={{ textAlign: "right", fontFamily: "var(--f-mono)", fontSize: 13, color: a.success===0?"var(--ink-3)":a.success<93?"var(--down)":"var(--ink-0)" }}>{a.success===0?"—":a.success.toFixed(1)+"%"}</div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--f-mono)", fontSize: 13, color: "var(--ink-0)" }}>{a.rep}</span>
                  <span style={{ display: "block", fontFamily: "var(--f-mono)", fontSize: 10, color: a.repD>=0?"var(--up)":"var(--down)", marginTop: 2 }}>
                    {a.repD>=0?"▲":"▼"}{Math.abs(a.repD)}
                  </span>
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ink-1)" }}>
                  {a.uptime.toFixed(1)}%
                  <span style={{ display: "block", fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{a.p50}ms</span>
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--f-mono)", fontSize: 13, color: a.guard24>20?"var(--down)":a.guard24>0?"var(--ink-1)":"var(--ink-3)" }}>
                  {a.guard24===0?"—":a.guard24}
                </div>
                <div style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>
                  {a.drift != null ? (
                    <span style={{ color: "var(--down)" }}>⚠ {a.drift}h ago</span>
                  ) : (
                    <span style={{ color: "var(--ink-3)" }}>—</span>
                  )}
                </div>
                <div><Spark seed={a.seed} /></div>
                <div style={{ textAlign: "right" }}>
                  <a href={`https://registry.paxio.network/${a.n}`} className="mono" style={{ fontSize: 11, color: "var(--gold)" }}>open ↗</a>
                </div>
              </div>
            ))}
            <div className="directory-foot mono">
              <span>Showing {rows.length} of {t.agents.toLocaleString()} · federated across ERC-8004 · MCP · A2A · Fetch · Virtuals · ElizaOS · paxio-native</span>
              <span style={{ color: "var(--gold)" }}>See all → registry.paxio.network</span>
            </div>
          </div>

          {/* ─── State of the Economy — three panels ─── */}
          <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 16 }}>
            {/* Wallet adoption */}
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div className="kicker">Wallet adoption · by ecosystem</div>
                <span className="mono" style={{ fontSize: 10, color: "var(--up)" }}>▲2.1pp w/w</span>
              </div>
              {adoption.map((a,i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 44px", gap: 10, alignItems: "center", padding: "5px 0" }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-1)" }}>{a.k}</span>
                  <div style={{ height: 10, background: "var(--paper-2)", border: "1px solid var(--ink-0)", position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, width: `${a.pct}%`, background: a.k==="paxio-native"?"var(--gold)":a.k==="MCP"?"var(--down)":"var(--ink-0)" }}/>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-0)", textAlign: "right" }}>{a.pct}%</span>
                </div>
              ))}
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.6, borderTop: "1px dashed var(--line-soft)", paddingTop: 8 }}>
                1.8M MCP tools are walletless <b style={{ color: "var(--ink-0)" }}>→ addressable market.</b> Install <span style={{ color: "var(--gold)" }}>@paxio/sdk</span> to flip any tool into an economic actor.
              </div>
            </div>

            {/* Facilitator concentration */}
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div className="kicker">Facilitator concentration</div>
                <span className="mono" style={{ fontSize: 10, color: "var(--down)" }}>⚠ HHI 4,620</span>
              </div>
              {facilitators.map(([name, pct, color, risk], i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "110px 1fr 44px", gap: 10, alignItems: "center", padding: "5px 0" }}>
                  <span className="mono" style={{ fontSize: 11, color: risk?"var(--down)":"var(--ink-1)" }}>{risk&&"⚠ "}{name}</span>
                  <div style={{ height: 10, background: "var(--paper-2)", border: "1px solid var(--ink-0)", position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: color }}/>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-0)", textAlign: "right" }}>{pct}%</span>
                </div>
              ))}
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.6, borderTop: "1px dashed var(--line-soft)", paddingTop: 8 }}>
                Institutional-grade systemic risk metric. Published weekly. <b style={{ color: "var(--ink-0)" }}>Paxio FAP is the diversification play.</b>
              </div>
            </div>

            {/* Capability drift watch */}
            <div className="panel raised" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div className="kicker">Capability drift watch · 24h</div>
                <span className="mono" style={{ fontSize: 10, color: "var(--down)" }}>{drifts.length} flagged</span>
              </div>
              {drifts.slice(0,4).map((a,i) => (
                <div key={i} style={{ padding: "9px 0", borderBottom: i<3?"1px dashed var(--line-soft)":"none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--ink-0)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.n}</span>
                    <span className="mono" style={{ fontSize: 10, color: "var(--down)", whiteSpace: "nowrap" }}>⚠ {a.drift}h ago</span>
                  </div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.5 }}>
                    {a.drift===2 ? <>was: <i>translate(en↔de)</i> · <b style={{color:"var(--ink-0)"}}>now: +summarize endpoint</b></> :
                     a.drift===14 ? <>p95 latency: 380ms → <b style={{color:"var(--down)"}}>1,240ms (3.3×)</b></> :
                     a.drift===22 ? <>pricing: $0.50/tx → <b style={{color:"var(--down)"}}>$0.85/tx</b></> :
                     <>agent.json hash changed · details in Radar</>}
                  </div>
                </div>
              ))}
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.6, borderTop: "1px dashed var(--line-soft)", paddingTop: 8 }}>
                <b style={{ color: "var(--ink-0)" }}>Only Paxio sees this.</b> agent.json hashed every 24h across 6 registries. <span style={{ color: "var(--gold)" }}>radar.paxio.network ↗</span>
              </div>
            </div>
          </div>

          {/* ─── Product rail ─── */}
          <div className="product-rail">
            {[
              ["Registry", "registry.paxio.network", "The meta-directory · 2.4M agents · 6 registries"],
              ["Wallet",   "wallet.paxio.network",   "Attach to ANY agent · BTC + USDC · threshold-sig"],
              ["Pay",      "pay.paxio.network",      "FAP · x402 · USDC · Stripe MPP · BTC L1"],
              ["Radar",    "radar.paxio.network",    "PAEI · drift watch · attack heatmap · Intel API"],
              ["SDK",      "docs.paxio.network",     "npm i @paxio/sdk · 60-second install"],
            ].map(([name,host,sub],i) => (
              <a key={i} href={`https://${host}`} className="product-cell">
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <div style={{ fontFamily: "var(--f-display)", fontSize: 22, color: "var(--ink-0)", lineHeight: 1 }}>{name}</div>
                  <span className="mono" style={{ fontSize: 10, color: "var(--gold)" }}>↗</span>
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 8, letterSpacing: "0.06em" }}>{host}</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.5 }}>{sub}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function FacetRow({ label, items, labels, pick, setPick, colorMap }) {
    return (
      <div className="facet-row">
        <span className="facet-label mono">{label}</span>
        <div className="facet-chips">
          {items.map((k, i) => (
            <button key={k} onClick={()=>setPick(k)} className="facet-chip" style={{
              background: pick===k ? "var(--ink-0)" : "transparent",
              color: pick===k ? "var(--paper-0)" : (colorMap && colorMap[k]) || "var(--ink-2)",
              borderColor: (colorMap && colorMap[k]) || "var(--ink-0)",
            }}>{labels ? labels[i] : k}</button>
          ))}
        </div>
      </div>
    );
  }

  window.HeroVariantB5 = VariantB3;
})();
