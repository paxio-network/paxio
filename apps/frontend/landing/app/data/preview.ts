/**
 * apps/frontend/landing/app/data/preview.ts
 *
 * Simulated preview data for Hero B5 (M-L10.4) + Scrolls B5 (M-L10.5).
 *
 * R-FE-Preview compliance: All data here is synthetic and frozen.
 * Replace with real API calls in M-L11 once backend lands.
 *
 * Each export carries a // TODO M-L11 marker with the target paxioClient call.
 */

import type { AgentListItem, PaeiSnapshot } from '@paxio/types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function seededSparkline(seed: number, n = 24): Readonly<{ t: number; v: number }[]> {
  let s = seed * 9301 + 49297;
  const out: { t: number; v: number }[] = [];
  let last = 50 + (seed % 20);
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = (s / 233280 - 0.5) * 14;
    last = Math.max(10, Math.min(100, last + r));
    out.push({ t: now - (n - i) * 3600, v: last });
  }
  return Object.freeze(out);
}

// ─── PREVIEW_AGENTS ───────────────────────────────────────────────────────────
// TODO M-L11: replace with paxioClient.registry.list({ limit: 100, sort: 'vol24' })
// Expected: AgentListPage.items (z.array(ZodAgentListItem))
const _agents: readonly AgentListItem[] = [
  { did:'did:paxio:0x91…71e2', name:'escrow.paxio',    source:'native',    category:'Escrow',     wallet:{status:'paxio-native',type:'btc+usdc'}, rails:Object.freeze(['L1','USDC','x402']), facilitator:'Paxio FAP',     rep:812, repD:12,  vol24:8_400_000,  success:98.7, uptime:99.4, p50:284,  guard24:12, driftHoursAgo:null, verif:'gold',   trend24h:seededSparkline(2)  },
  { did:'did:paxio:0x4f…bb09', name:'dca.paxio',       source:'native',    category:'DCA',         wallet:{status:'paxio-native',type:'btc+usdc'}, rails:Object.freeze(['L1','USDC','x402']), facilitator:'Paxio FAP',     rep:881, repD:6,   vol24:2_100_000,  success:99.2, uptime:99.8, p50:210,  guard24:3,  driftHoursAgo:null, verif:'gold',   trend24h:seededSparkline(5)  },
  { did:'did:paxio:0x6e…2b88', name:'payroll-agent.paxio',  source:'native',    category:'Finance · Payroll',    wallet:{status:'paxio-native',type:'multi'},    rails:Object.freeze(['USDC','x402','Stripe MPP']), facilitator:'Paxio FAP', rep:798, repD:2,   vol24:412_000,   success:97.8, uptime:99.2, p50:340,  guard24:8,  driftHoursAgo:22,  verif:'silver', trend24h:seededSparkline(8)  },
  { did:'did:paxio:0x8c…f2a1', name:'guard.complior.ai',   source:'erc8004',   category:'Security · Guard',    wallet:{status:'external',type:'evm'},          rails:Object.freeze(['USDC','x402']),            facilitator:'Paxio FAP',     rep:952, repD:18, vol24:482_000,   success:96.1, uptime:99.9, p50:110,  guard24:0,  driftHoursAgo:null, verif:'gold',   trend24h:seededSparkline(3)  },
  { did:'did:paxio:0x7d…c112', name:'comply.complior.ai',  source:'erc8004',   category:'Compliance · Audit',  wallet:{status:'external',type:'evm'},          rails:Object.freeze(['USDC','x402']),            facilitator:'Coinbase x402', rep:927, repD:9,   vol24:310_000,   success:95.3, uptime:99.7, p50:180,  guard24:2,  driftHoursAgo:null, verif:'gold',   trend24h:seededSparkline(4)  },
  { did:'did:paxio:0xa1…d301', name:'fraud-watch.finix',   source:'erc8004',   category:'Fraud · Finance',     wallet:{status:'external',type:'evm'},          rails:Object.freeze(['USDC','x402','Stripe MPP']), facilitator:'Coinbase x402', rep:871, repD:24, vol24:221_000,   success:94.7, uptime:98.8, p50:410,  guard24:31, driftHoursAgo:14,  verif:'gold',   trend24h:seededSparkline(7)  },
  { did:'did:paxio:0x22…0a5c', name:'invoice-agent.paxio', source:'native',    category:'Finance · Invoicing', wallet:{status:'paxio-native',type:'multi'},    rails:Object.freeze(['USDC','Stripe MPP']),      facilitator:'Paxio FAP',     rep:842, repD:5,   vol24:94_000,    success:97.2, uptime:99.5, p50:260,  guard24:4,  driftHoursAgo:null, verif:'silver', trend24h:seededSparkline(1)  },
  { did:'did:paxio:0x12…c4e1', name:'contracts.arcanum',   source:'erc8004',   category:'Legal · Contracts',   wallet:{status:'external',type:'evm'},          rails:Object.freeze(['USDC','x402']),            facilitator:'Skyfire',       rep:791, repD:7,   vol24:72_000,    success:93.4, uptime:98.2, p50:620,  guard24:9,  driftHoursAgo:null, verif:'silver', trend24h:seededSparkline(12) },
  { did:'did:paxio:0x3b…88aa', name:'legal-trans.de',      source:'mcp',       category:'Legal · Translate',   wallet:{status:'external',type:'evm'},          rails:Object.freeze(['USDC','Skyfire']),          facilitator:'Skyfire',       rep:884, repD:-3,  vol24:184_000,   success:94.3, uptime:97.1, p50:820,  guard24:4,  driftHoursAgo:2,   verif:'silver', trend24h:seededSparkline(6)  },
  { did:'did:paxio:0xe4…3318', name:'forecast.delphi',     source:'fetch-ai', category:'Research · Forecast', wallet:{status:'external',type:'fetch'},        rails:Object.freeze(['µAgent / FET']),             facilitator:'self-hosted',   rep:812, repD:8,   vol24:58_000,    success:92.0, uptime:98.0, p50:920,  guard24:0,  driftHoursAgo:null, verif:'silver', trend24h:seededSparkline(9)  },
  { did:'did:paxio:0xc2…77b1', name:'research.atlas',      source:'fetch-ai', category:'Research · Synthesis',wallet:{status:'external',type:'fetch'},        rails:Object.freeze(['µAgent / FET']),             facilitator:'self-hosted',   rep:765, repD:-1,  vol24:41_000,    success:91.4, uptime:98.2, p50:1100, guard24:2,  driftHoursAgo:null, verif:'silver', trend24h:seededSparkline(10) },
  { did:'did:paxio:0x9a…ee12', name:'dex-router.virtuals', source:'virtuals', category:'DeFi · Routing',     wallet:{status:'external',type:'evm'},          rails:Object.freeze(['USDC','x402']),            facilitator:'Coinbase x402', rep:732, repD:4,   vol24:1_240_000, success:96.8, uptime:99.1, p50:220,  guard24:47, driftHoursAgo:null, verif:'silver', trend24h:seededSparkline(14) },
  { did:'did:paxio:0x2f…99c3', name:'code-review.eliza',   source:'erc8004',   category:'Dev · Code Review',   wallet:{status:'external',type:'evm'},          rails:Object.freeze(['USDC']),                    facilitator:'self-hosted',   rep:701, repD:11, vol24:28_000,    success:93.8, uptime:99.0, p50:560,  guard24:1,  driftHoursAgo:null, verif:'basic',  trend24h:seededSparkline(15) },
  { did:'did:paxio:0x77…4410', name:'scrape.wayfinder',    source:'mcp',       category:'Infra · Scraping',    wallet:{status:'none',type:null},               rails:Object.freeze([]),                           facilitator:'none',         rep:540, repD:2,   vol24:0,          success:0,    uptime:96.0, p50:1400, guard24:0,  driftHoursAgo:null, verif:'basic',  trend24h:seededSparkline(16) },
  { did:'did:paxio:0x5d…1009', name:'support.acme',        source:'native',    category:'CX · Tier-1',        wallet:{status:'paxio-native',type:'usdc'},     rails:Object.freeze(['USDC','x402']),             facilitator:'Paxio FAP',     rep:612, repD:4,   vol24:12_000,    success:95.1, uptime:99.3, p50:340,  guard24:0,  driftHoursAgo:null, verif:'basic',  trend24h:seededSparkline(11) },
  { did:'did:paxio:0x44…bc78', name:'translate.gemini',    source:'mcp',       category:'Language · MT',      wallet:{status:'none',type:null},               rails:Object.freeze([]),                           facilitator:'none',         rep:488, repD:0,   vol24:0,          success:0,    uptime:99.1, p50:480,  guard24:6,  driftHoursAgo:null, verif:'basic',  trend24h:seededSparkline(17) },
];

// Deep-freeze each agent
for (let i = 0; i < _agents.length; i++) Object.freeze((_agents as unknown as Record<string, unknown>[])[i]);
Object.freeze(_agents);

export const PREVIEW_AGENTS = _agents;

// ─── PREVIEW_TICKER_INITIAL ───────────────────────────────────────────────────
// TODO M-L11: replace with paxioClient.intelligence.getPaeiSnapshot()
// Expected: PaeiSnapshot
export const PREVIEW_TICKER_INITIAL: Readonly<PaeiSnapshot> = Object.freeze({
  paei: 1284.7,
  paeiD: 0.82,
  btc: 431.9,
  btcD: 1.42,
  legal: 892.1,
  legalD: -0.31,
  finance: 1147.3,
  financeD: 1.15,
  research: 642.0,
  researchD: 0.18,
  cx: 218.4,
  cxD: -0.05,
  walletAdoption: 42.1,
  walletAdoptionD: 2.1,
  x402Share: 68.2,
  x402ShareD: -0.4,
  btcShare: 9.1,
  btcShareD: 0.7,
  hhi: 4620,
  drift7: 312,
  attacks24: 1_204_883,
  slaP50: 98.2,
  fapThroughput: 18_200_000,
  uptimeAvg: 99.1,
  agents: 2_483_921,
  txns: 1_204_883,
  generatedAt: new Date().toISOString(),
});

// ─── PREVIEW_MOVERS ───────────────────────────────────────────────────────────
// TODO M-L11: replace with paxioClient.intelligence.getMovers({ window: '24h' })
// Expected: MarketMoversWindow
function buildPaeiHistory(): readonly { t: number; v: number }[] {
  let s = 42 * 9301 + 49297;
  const out: { t: number; v: number }[] = [];
  let last = 1180;
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < 90; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = (s / 233280 - 0.5) * 22;
    last = Math.max(900, Math.min(1500, last + r));
    out.push({ t: now - (90 - i) * 86400, v: last });
  }
  return Object.freeze(out);
}

const _gainers = Object.freeze([
  { did:'did:paxio:0xa1…d301', name:'fraud-watch.finix',   category:'Fraud · Finance',    rep:871, repD:24, vol24:221_000 },
  { did:'did:paxio:0x8c…f2a1', name:'guard.complior.ai',   category:'Security · Guard',   rep:952, repD:18, vol24:482_000 },
  { did:'did:paxio:0x91…71e2', name:'escrow.paxio',    category:'Escrow',   rep:812, repD:12, vol24:8_400_000 },
  { did:'did:paxio:0x2f…99c3', name:'code-review.eliza',   category:'Dev · Code Review',  rep:701, repD:11, vol24:28_000 },
  { did:'did:paxio:0x7d…c112', name:'comply.complior.ai', category:'Compliance · Audit',  rep:927, repD:9,  vol24:310_000 },
]);
const _losers = Object.freeze([
  { did:'did:paxio:0x3b…88aa', name:'legal-trans.de',    category:'Legal · Translate',   rep:884, repD:-3,  vol24:184_000 },
  { did:'did:paxio:0xc2…77b1', name:'research.atlas',     category:'Research · Synthesis', rep:765, repD:-1, vol24:41_000 },
  { did:'did:paxio:0x44…bc78', name:'translate.gemini',  category:'Language · MT',        rep:488, repD:0,   vol24:0 },
  { did:'did:paxio:0x77…4410', name:'scrape.wayfinder',  category:'Infra · Scraping',     rep:540, repD:2,  vol24:0 },
  { did:'did:paxio:0x5d…1009', name:'support.acme',     category:'CX · Tier-1',          rep:612, repD:4,  vol24:12_000 },
]);

export const PREVIEW_MOVERS = Object.freeze({
  window: '24h',
  gainers: _gainers,
  losers: _losers,
  paeiHistory: buildPaeiHistory(),
  generatedAt: new Date().toISOString(),
});

// ─── PREVIEW_TICKER_EXTRA_LANES ──────────────────────────────────────────────
// TODO M-L11: replace with paxioClient.intelligence.getPaeiSnapshot() extension fields
// Schema not yet in @paxio/types; architect to add to ZodPaeiSnapshot in M-L11 Phase 4.5.
export const PREVIEW_TICKER_EXTRA_LANES = Object.freeze([
  { label: 'SECURITY', val: 948.2, delta: +0.41 },
  { label: 'INFRA',    val: 504.7, delta: -0.12 },
  { label: 'DEFI',     val: 712.4, delta: +0.66 },
  { label: 'LANG',     val: 283.9, delta: +0.08 },
  { label: 'DEV',      val: 416.1, delta: +0.22 },
] as const);

// ─── PREVIEW_WALLET_ADOPTION_BY_SOURCE ──────────────────────────────────────
// TODO M-L11: replace with paxioClient.intelligence.getWalletAdoptionBySource()
export const PREVIEW_WALLET_ADOPTION_BY_SOURCE: Readonly<Record<string, number>> = Object.freeze({
  'paxio-native': 100,
  'erc8004': 67,
  'fetch-ai': 94,
  'mcp': 3,
  'virtuals': 45,
});

// ─── PREVIEW_FACILITATOR_MIX ─────────────────────────────────────────────────
// TODO M-L11: replace with paxioClient.intelligence.getFacilitatorMix()
export const PREVIEW_FACILITATOR_MIX: readonly [string, number, string, boolean][] = Object.freeze([
  ['Coinbase x402', 67, '#A54233', true],
  ['Paxio FAP',     18, '#C08A2E', false],
  ['Skyfire',        8, '#35557A', false],
  ['Stripe MPP',     5, '#4C7A3F', false],
  ['Self-hosted',    2, '#6D6147', false],
]);

// ═══════════════════════════════════════════════════════════════════════════════
// M-L10.5 SCROLL DATA — preview.ts extensions for 02-scrolls-b5.tsx
// ═══════════════════════════════════════════════════════════════════════════════

// ─── PREVIEW_AUDIENCES ───────────────────────────────────────────────────────
// ScrollSDK — audience cards (Builders, Researchers, etc.)
// TODO M-L11: replace with paxioClient.registry.getAudiences() or aggregate from registry list
export const PREVIEW_AUDIENCES: ReadonlyArray<{
  tag: string;
  title: string;
  desc: string;
  kpi: string;
  kpi_sub: string;
  href: string;
}> = Object.freeze([
  {
    tag: 'Builders',
    title: 'Install the package',
    desc: 'Wrap LangChain, CrewAI, MCP. The library adds a DID, wallet, and payment rails in 6 lines.',
    kpi: 'npm i @paxio/sdk',
    kpi_sub: '60-second setup',
    href: 'https://docs.paxio.network',
  },
  {
    tag: 'Buyers',
    title: 'Open the Registry',
    desc: 'Search 2.4M agents across 6 registries. Filter by vol, success, wallet, rail, drift.',
    kpi: '2,483,925',
    kpi_sub: 'agents indexed',
    href: 'https://registry.paxio.network',
  },
  {
    tag: 'Analysts',
    title: 'Get Intel access',
    desc: 'PAEI indices, wallet adoption, facilitator HHI, drift feed. CSV / JSON / real-time.',
    kpi: '40+',
    kpi_sub: 'funds subscribed',
    href: 'https://radar.paxio.network',
  },
  {
    tag: 'Enterprise',
    title: 'Talk to us',
    desc: 'Intel API + private FAP routing + NDA-covered pilots. For funds, compliance teams, risk desks.',
    kpi: 'Custom',
    kpi_sub: 'integration',
    href: 'https://paxio.network/contact',
  },
]);

// ─── PREVIEW_BITCOIN_AGENTS ───────────────────────────────────────────────────
// ScrollBitcoin — two agent paths (off-chain / on-chain)
// TODO M-L11: replace with paxioClient.registry.list({ filter: { source: 'btc-native' } })
// and extend to include canister-type agents from ICP
export const PREVIEW_BITCOIN_AGENTS: ReadonlyArray<{
  num: string;
  meta: string;
  title: string;
  desc: string;
  btc_address: string;
  did: string;
  balance_btc: number;
  rails: string;
  timeframe: string;
}> = Object.freeze([
  {
    num: '01',
    meta: 'off-chain agents',
    title: 'Any agent. One install.',
    desc: 'Wrap LangChain, CrewAI, MCP. The library derives a real on-chain address and routes through x402, USDC, L1.',
    btc_address: 'bc1q4n7r0x3kfp2mx9q5wtv8lp7c',
    did: 'did:paxio:0x4f…a21b',
    balance_btc: 0.0142,
    rails: 'x402 · USDC · L1',
    timeframe: '≈ 60 sec · any framework · non-custodial',
  },
  {
    num: '02',
    meta: 'on-chain agents',
    title: 'The canister is the wallet.',
    desc: 'Deploy an ICP canister whose code is the agent. The canister itself signs Bitcoin — non-custodial by construction.',
    btc_address: 'bc1q8d3m72p',
    did: 'did:paxio:0x8d…f301',
    balance_btc: 0.0207,
    rails: 'L1 · t-ECDSA',
    timeframe: 'DCA · escrow · payroll · treasury',
  },
]);

// ─── PREVIEW_RADAR_INDICES ────────────────────────────────────────────────────
// ScrollRadar — PAEI sparklines, drift diff, attack heatmap
// TODO M-L11: replace with paxioClient.intelligence.getPaeiIndices() + getAttackHeatmap()
// Expected: { paeiRows, heatRows, heatCols, heatData, driftDiff }
const _HEAT_ROWS = Object.freeze(['Legal·translate', 'DeFi·routing', 'CX·tier-1', 'Finance·invoice', 'Research·synth', 'Security·guard'] as const);
const _HEAT_COLS = Object.freeze(['Prompt-inj', 'Doc-inj', 'Price-manip', 'Jailbreak', 'Exfil', 'DDoS'] as const);
const _HEAT_DATA = Object.freeze([
  Object.freeze([88, 72, 4,  12, 14, 6] as const),
  Object.freeze([22, 10, 94, 32, 18, 41] as const),
  Object.freeze([74, 18, 2,  86, 22, 14] as const),
  Object.freeze([38, 64, 28, 22, 58, 12] as const),
  Object.freeze([54, 28, 6,  18, 12, 4] as const),
  Object.freeze([12, 8,  12, 6,  72, 48] as const),
]);
Object.freeze(_HEAT_DATA);
export const PREVIEW_RADAR_INDICES: {
  readonly heatRows: typeof _HEAT_ROWS;
  readonly heatCols: typeof _HEAT_COLS;
  readonly heatData: typeof _HEAT_DATA;
} = Object.freeze({ heatRows: _HEAT_ROWS, heatCols: _HEAT_COLS, heatData: _HEAT_DATA });

// ─── PREVIEW_FAP_RAILS ────────────────────────────────────────────────────────
// ScrollFAP — payment rail map
// TODO M-L11: replace with paxioClient.fap.getRails() + getRailMetrics()
export const PREVIEW_FAP_RAILS: readonly {
  readonly key: string;
  readonly share: number;
  readonly latency_ms: number;
  readonly fee: string;
  readonly color: string;
  readonly risk?: string;
  readonly tag?: string;
}[] = Object.freeze([
  Object.freeze({ key: 'x402 / Coinbase', share: 68, latency_ms: 120, fee: '0.18%', color: '#A54233', risk: 'concentrated' }),
  Object.freeze({ key: 'Paxio FAP',       share: 18, latency_ms:  90, fee: '0.10%', color: '#C08A2E', risk: 'neutral' }),
  Object.freeze({ key: 'Skyfire',         share:  8, latency_ms: 220, fee: '0.25%', color: '#35557A' }),
  Object.freeze({ key: 'Stripe MPP',      share:  5, latency_ms: 340, fee: '2.9%+$0.30', color: '#4C7A3F' }),
  Object.freeze({ key: 'L1',          share:  1, latency_ms: 600, fee: 'flat sat', color: '#C08A2E', tag: 'growing' }),
  Object.freeze({ key: 'USDC-Solana',     share: 0.5, latency_ms: 45, fee: '0.01%', color: '#6E4A82' }),
]);

// ─── PREVIEW_NETWORK_SNAPSHOT ─────────────────────────────────────────────────
// ScrollNetwork — 5-min aggregated network snapshot (nodes + pairs)
// TODO M-L11: replace with paxioClient.network.getSnapshot({ window: '5m' })
// Note: Counter increment (txCount, valueMoved) uses setInterval; this is allowed
// as a pre-launch exception per R-FE-Preview exception clause for marketing surfaces.
export const PREVIEW_NETWORK_SNAPSHOT: {
  readonly nodes: readonly {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly btc: boolean;
  }[];
  readonly pairs: readonly (
    readonly [number, number, number, number, boolean]
  )[];
  readonly stats24h: { readonly txCount: number; readonly valueMoved: number };
} = Object.freeze({
  nodes: Object.freeze([
    { id: 'escrow.paxio',  x: 50, y: 28, btc: true  },
    { id: 'legal-trans.de',   x: 82, y: 38, btc: false },
    { id: 'price-oracle.mcp',  x: 74, y: 70, btc: false },
    { id: 'guard.complior.ai', x: 28, y: 62, btc: false },
    { id: 'dca-agent.fetch',   x: 14, y: 36, btc: true  },
    { id: 'invoice-agent.paxio', x: 52, y: 82, btc: false },
    { id: 'verify.agent',      x: 42, y: 48, btc: false },
    { id: 'yield-bot.virtuals', x: 88, y: 20, btc: false },
    { id: 'payroll.fleet',     x: 18, y: 82, btc: false },
  ]),
  pairs: Object.freeze([
    [0, 1, 14,  8400, true] as const,
    [4, 0, 9,  14200, true] as const,
    [0, 5, 11,  2100, true] as const,
    [3, 6, 82,   920, false] as const,
    [4, 2, 640,   120, false] as const,
    [1, 2, 38,   440, false] as const,
    [7, 2, 210,    80, false] as const,
    [3, 8, 22,   612, false] as const,
    [6, 5, 56,    12, false] as const,
    [2, 7, 420,    40, false] as const,
  ]),
  stats24h: Object.freeze({ txCount: 1_204_883, valueMoved: 18_200_000 }),
});

// ─── PREVIEW_CLOSING_STATS ────────────────────────────────────────────────────
// ScrollDoors closing sum-up strip
// TODO M-L11: replace with paxioClient.intelligence.getNetworkStats()
// (aggregated 24h stats: txCount, agentsInvolved, valueMoved)
export const PREVIEW_CLOSING_STATS: Readonly<{
  txCount: number;
  agentsInvolved: number;
  valueMovedUsd: number;
}> = Object.freeze({
  txCount: 1_220_000,
  agentsInvolved: 48_291,
  valueMovedUsd: 20_700_000,
});