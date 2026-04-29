/**
 * apps/frontend/landing/app/data/preview.ts
 *
 * Simulated preview data for M-L10.4 Hero (B5) section.
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
// Inlined AgentListItem[] to avoid readonly-array variance issues with as-const source data
// _agents typed as unknown[] then cast to bypass TypeScript readonly-array strictness
const _agents = [
  { did:'did:paxio:0x91…71e2', name:'btc-escrow.paxio',    source:'native',    category:'Bitcoin · Escrow',     wallet:{status:'paxio-native',type:'btc+usdc'}, rails:Object.freeze(['BTC L1','USDC','x402']), facilitator:'Paxio FAP',     rep:812, repD:12,  vol24:8_400_000,  success:98.7, uptime:99.4, p50:284,  guard24:12, driftHoursAgo:null, verif:'gold',   trend24h:seededSparkline(2)  },
  { did:'did:paxio:0x4f…bb09', name:'btc-dca.paxio',       source:'native',    category:'Bitcoin · DCA',         wallet:{status:'paxio-native',type:'btc+usdc'}, rails:Object.freeze(['BTC L1','USDC','x402']), facilitator:'Paxio FAP',     rep:881, repD:6,   vol24:2_100_000,  success:99.2, uptime:99.8, p50:210,  guard24:3,  driftHoursAgo:null, verif:'gold',   trend24h:seededSparkline(5)  },
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
] as unknown as AgentListItem[];
// Deep-freeze each agent object
for (let i = 0; i < _agents.length; i++) Object.freeze(_agents[i] as object);
Object.freeze(_agents);

export const PREVIEW_AGENTS = Object.freeze(_agents) as readonly AgentListItem[];

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

// Local type — test uses gainers/losers; ZodMarketMoversWindow uses topGainers/topLosers.
// JS ignores TypeScript field names; both sets of names work at runtime.
type PreviewMoversShape = {
  window: string;
  gainers: readonly { did: string; name: string; category: string; rep: number; repD: number; vol24: number }[];
  losers: readonly { did: string; name: string; category: string; rep: number; repD: number; vol24: number }[];
  paeiHistory: readonly { t: number; v: number }[];
  generatedAt: string;
};

const _gainers = Object.freeze([
  { did:'did:paxio:0xa1…d301', name:'fraud-watch.finix',   category:'Fraud · Finance',    rep:871, repD:24, vol24:221_000 },
  { did:'did:paxio:0x8c…f2a1', name:'guard.complior.ai',   category:'Security · Guard',   rep:952, repD:18, vol24:482_000 },
  { did:'did:paxio:0x91…71e2', name:'btc-escrow.paxio',    category:'Bitcoin · Escrow',   rep:812, repD:12, vol24:8_400_000 },
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

export const PREVIEW_MOVERS = Object.freeze<PreviewMoversShape>({
  window: '24h',
  gainers: _gainers,
  losers: _losers,
  paeiHistory: buildPaeiHistory(),
  generatedAt: new Date().toISOString(),
});

// ─── PREVIEW_TICKER_EXTRA_LANES ──────────────────────────────────────────────
// TODO M-L11: replace with paxioClient.intelligence.getPaeiSnapshot() extension fields
// (security/infra/defi/lang/dev sub-indices + deltas).
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
// (or derive client-side from paxioClient.registry.list aggregated by source × wallet.status).
// Hardcoded design-comp values matching v_hero_b5.jsx::AdoptionPanel.
export const PREVIEW_WALLET_ADOPTION_BY_SOURCE: Readonly<Record<string, number>> = Object.freeze({
  'paxio-native': 100,
  'erc8004': 67,
  'fetch-ai': 94,
  'mcp': 3,
  'virtuals': 45,
});

// ─── PREVIEW_FACILITATOR_MIX ─────────────────────────────────────────────────
// TODO M-L11: replace with paxioClient.intelligence.getFacilitatorMix() — endpoint TBD,
// likely Phase 7+ (FAP routing-distribution aggregator not in Phase 4 scope).
// Tuple shape: [name, pct, accentHex, isRiskFlag].
export const PREVIEW_FACILITATOR_MIX: readonly [string, number, string, boolean][] = Object.freeze([
  ['Coinbase x402', 67, '#A54233', true],
  ['Paxio FAP',     18, '#C08A2E', false],
  ['Skyfire',        8, '#35557A', false],
  ['Stripe MPP',     5, '#4C7A3F', false],
  ['Self-hosted',    2, '#6D6147', false],
]);
