// M-L11 RED — contract tests for Intelligence shapes (Zod schemas in @paxio/types).
//
// These verify the Zod parsers admit valid samples and reject invalid ones.
// Architect-zone (tests/), no impl required for these to pass — they validate
// schema definitions only. The HANDLER tests live in
// products/07-intelligence/tests/intelligence-handlers.test.ts (vacuous-skip
// until backend-dev creates the handlers).

import { describe, it, expect } from 'vitest';
import {
  ZodPaeiSnapshot,
  ZodAgentListItem,
  ZodAgentListQuery,
  ZodAgentListPage,
  ZodMarketMoversWindow,
  ZodMoverWindow,
  ZodAgentVerificationTier,
  ZodAgentWalletStatus,
} from '@paxio/types';

describe('M-L11 ZodPaeiSnapshot', () => {
  it('accepts a fully populated snapshot', () => {
    const sample = {
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
      attacks24: 1204883,
      slaP50: 98.2,
      fapThroughput: 18_200_000,
      uptimeAvg: 99.1,
      agents: 2483921,
      txns: 1204883,
      generatedAt: '2026-04-27T20:00:00.000Z',
    };
    expect(ZodPaeiSnapshot.parse(sample)).toEqual(sample);
  });

  it('rejects walletAdoption > 100 (percent invariant)', () => {
    const r = ZodPaeiSnapshot.safeParse({
      paei: 0,
      paeiD: 0,
      btc: 0,
      btcD: 0,
      legal: 0,
      legalD: 0,
      finance: 0,
      financeD: 0,
      research: 0,
      researchD: 0,
      cx: 0,
      cxD: 0,
      walletAdoption: 101, // ← invalid
      walletAdoptionD: 0,
      x402Share: 0,
      x402ShareD: 0,
      btcShare: 0,
      btcShareD: 0,
      hhi: 0,
      drift7: 0,
      attacks24: 0,
      slaP50: 0,
      fapThroughput: 0,
      uptimeAvg: 0,
      agents: 0,
      txns: 0,
      generatedAt: '2026-04-27T20:00:00.000Z',
    });
    expect(r.success).toBe(false);
  });

  it('rejects negative agent count', () => {
    const r = ZodPaeiSnapshot.safeParse({
      paei: 0,
      paeiD: 0,
      btc: 0,
      btcD: 0,
      legal: 0,
      legalD: 0,
      finance: 0,
      financeD: 0,
      research: 0,
      researchD: 0,
      cx: 0,
      cxD: 0,
      walletAdoption: 0,
      walletAdoptionD: 0,
      x402Share: 0,
      x402ShareD: 0,
      btcShare: 0,
      btcShareD: 0,
      hhi: 0,
      drift7: 0,
      attacks24: 0,
      slaP50: 0,
      fapThroughput: 0,
      uptimeAvg: 0,
      agents: -1, // ← invalid
      txns: 0,
      generatedAt: '2026-04-27T20:00:00.000Z',
    });
    expect(r.success).toBe(false);
  });

  it('rejects non-ISO generatedAt', () => {
    const r = ZodPaeiSnapshot.safeParse({
      paei: 0,
      paeiD: 0,
      btc: 0,
      btcD: 0,
      legal: 0,
      legalD: 0,
      finance: 0,
      financeD: 0,
      research: 0,
      researchD: 0,
      cx: 0,
      cxD: 0,
      walletAdoption: 0,
      walletAdoptionD: 0,
      x402Share: 0,
      x402ShareD: 0,
      btcShare: 0,
      btcShareD: 0,
      hhi: 0,
      drift7: 0,
      attacks24: 0,
      slaP50: 0,
      fapThroughput: 0,
      uptimeAvg: 0,
      agents: 0,
      txns: 0,
      generatedAt: '2026-04-27 not-iso', // ← invalid
    });
    expect(r.success).toBe(false);
  });
});

describe('M-L11 ZodAgentListItem', () => {
  it('accepts a fully populated agent', () => {
    const sample = {
      did: 'did:paxio:0x91...71e2',
      name: 'btc-escrow.paxio',
      source: 'native' as const,
      category: 'Bitcoin · Escrow',
      wallet: { status: 'paxio-native' as const, type: 'btc+usdc' },
      rails: ['BTC L1', 'USDC', 'x402'],
      facilitator: 'Paxio FAP',
      rep: 812,
      repD: 12,
      vol24: 8400000,
      success: 98.7,
      uptime: 99.4,
      p50: 284,
      guard24: 12,
      driftHoursAgo: null,
      verif: 'gold' as const,
      trend24h: [
        { t: 1714145000, v: 800 },
        { t: 1714148600, v: 805 },
      ],
    };
    expect(ZodAgentListItem.parse(sample)).toMatchObject({
      did: sample.did,
      name: sample.name,
    });
  });

  it('rejects success > 100', () => {
    const r = ZodAgentListItem.safeParse({
      did: 'did:paxio:x',
      name: 'a',
      source: 'mcp',
      category: 'x',
      wallet: { status: 'none', type: null },
      rails: [],
      facilitator: 'none',
      rep: 0,
      repD: 0,
      vol24: 0,
      success: 101, // ← invalid
      uptime: 0,
      p50: 0,
      guard24: 0,
      driftHoursAgo: null,
      verif: 'basic',
      trend24h: [],
    });
    expect(r.success).toBe(false);
  });

  it('accepts wallet.type=null when status=none', () => {
    const r = ZodAgentListItem.safeParse({
      did: 'did:paxio:x',
      name: 'a',
      source: 'mcp',
      category: 'x',
      wallet: { status: 'none', type: null },
      rails: [],
      facilitator: 'none',
      rep: 0,
      repD: 0,
      vol24: 0,
      success: 0,
      uptime: 0,
      p50: 0,
      guard24: 0,
      driftHoursAgo: null,
      verif: 'basic',
      trend24h: [],
    });
    expect(r.success).toBe(true);
  });

  it('verif must be gold | silver | basic', () => {
    expect(ZodAgentVerificationTier.parse('gold')).toBe('gold');
    expect(ZodAgentVerificationTier.parse('silver')).toBe('silver');
    expect(ZodAgentVerificationTier.parse('basic')).toBe('basic');
    expect(ZodAgentVerificationTier.safeParse('platinum').success).toBe(false);
  });

  it('wallet.status must be paxio-native | external | none', () => {
    expect(ZodAgentWalletStatus.parse('paxio-native')).toBe('paxio-native');
    expect(ZodAgentWalletStatus.parse('external')).toBe('external');
    expect(ZodAgentWalletStatus.parse('none')).toBe('none');
    expect(ZodAgentWalletStatus.safeParse('demo').success).toBe(false);
  });
});

describe('M-L11 ZodAgentListQuery', () => {
  it('defaults sort=vol24, limit=20', () => {
    const r = ZodAgentListQuery.parse({});
    expect(r.sort).toBe('vol24');
    expect(r.limit).toBe(20);
  });

  it('rejects limit > 100 (DoS guard)', () => {
    const r = ZodAgentListQuery.safeParse({ limit: 1000 });
    expect(r.success).toBe(false);
  });

  it('rejects negative limit', () => {
    const r = ZodAgentListQuery.safeParse({ limit: -1 });
    expect(r.success).toBe(false);
  });

  it('source must be valid CrawlerSource', () => {
    expect(ZodAgentListQuery.parse({ source: 'mcp' }).source).toBe('mcp');
    expect(
      ZodAgentListQuery.safeParse({ source: 'unknown' }).success,
    ).toBe(false);
  });

  it('walletAttached is optional boolean', () => {
    expect(
      ZodAgentListQuery.parse({ walletAttached: true }).walletAttached,
    ).toBe(true);
    expect(ZodAgentListQuery.parse({}).walletAttached).toBeUndefined();
  });
});

describe('M-L11 ZodAgentListPage', () => {
  it('accepts empty page (cold registry)', () => {
    const sample = {
      items: [],
      total: 0,
      cursor: null,
      generatedAt: '2026-04-27T20:00:00.000Z',
    };
    expect(ZodAgentListPage.parse(sample)).toMatchObject(sample);
  });

  it('total must be non-negative integer', () => {
    expect(
      ZodAgentListPage.safeParse({
        items: [],
        total: -1,
        cursor: null,
        generatedAt: '2026-04-27T20:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('M-L11 ZodMarketMoversWindow', () => {
  it('window must be 1h|24h|7d|30d', () => {
    expect(ZodMoverWindow.parse('1h')).toBe('1h');
    expect(ZodMoverWindow.parse('24h')).toBe('24h');
    expect(ZodMoverWindow.parse('7d')).toBe('7d');
    expect(ZodMoverWindow.parse('30d')).toBe('30d');
    expect(ZodMoverWindow.safeParse('1y').success).toBe(false);
  });

  it('accepts empty movers (cold registry, no data)', () => {
    const sample = {
      window: '24h' as const,
      topGainers: [],
      topLosers: [],
      paeiHistory: [],
      generatedAt: '2026-04-27T20:00:00.000Z',
    };
    expect(ZodMarketMoversWindow.parse(sample)).toMatchObject(sample);
  });

  it('paeiHistory entries have unix epoch + value', () => {
    const sample = {
      window: '7d' as const,
      topGainers: [],
      topLosers: [],
      paeiHistory: [
        { t: 1714145000, v: 1280.1 },
        { t: 1714231400, v: 1284.5 },
      ],
      generatedAt: '2026-04-27T20:00:00.000Z',
    };
    expect(ZodMarketMoversWindow.parse(sample).paeiHistory).toHaveLength(2);
  });
});
