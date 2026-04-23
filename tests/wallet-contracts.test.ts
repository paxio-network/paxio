import { describe, it, expect } from 'vitest';
import {
  ZodAsset,
  ZodBtcAddress,
  ZodEvmAddress,
  ZodTransactionIntent,
  ZodBalanceResponse,
  ZodSignTransactionResponse,
  ZodTxRecord,
  ASSETS,
} from '@paxio/types';

// Contract tests — FA-03 Wallet canister Candid mirror.

describe('ZodAsset', () => {
  it('enumerates btc, eth, usdc', () => {
    expect(ASSETS).toEqual(['btc', 'eth', 'usdc']);
  });

  it('rejects unknown asset', () => {
    expect(ZodAsset.safeParse('sol').success).toBe(false);
  });

  it('accepts each known asset', () => {
    for (const a of ASSETS) {
      expect(ZodAsset.safeParse(a).success).toBe(true);
    }
  });
});

describe('ZodBtcAddress', () => {
  it('accepts bc1q… bech32', () => {
    // Valid-length bech32 address (42 chars after bc1)
    const addr = 'bc1q' + 'a'.repeat(39);
    expect(ZodBtcAddress.safeParse(addr).success).toBe(true);
  });

  it('rejects legacy 1… address', () => {
    expect(ZodBtcAddress.safeParse('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa').success).toBe(false);
  });

  it('rejects EVM-style 0x', () => {
    expect(ZodBtcAddress.safeParse('0xabc').success).toBe(false);
  });

  it('rejects too-short bc1', () => {
    expect(ZodBtcAddress.safeParse('bc1q123').success).toBe(false);
  });
});

describe('ZodEvmAddress', () => {
  it('accepts 0x + 40 hex chars', () => {
    const addr = '0x' + 'a'.repeat(40);
    expect(ZodEvmAddress.safeParse(addr).success).toBe(true);
  });

  it('rejects 0x + 38 hex (short)', () => {
    expect(ZodEvmAddress.safeParse('0x' + 'a'.repeat(38)).success).toBe(false);
  });

  it('rejects missing 0x prefix', () => {
    expect(ZodEvmAddress.safeParse('a'.repeat(40)).success).toBe(false);
  });
});

describe('ZodTransactionIntent', () => {
  const base = {
    from: 'did:paxio:base:0xsender',
    to: 'bc1q' + 'a'.repeat(39),
    asset: 'btc' as const,
    amount: 100_000n,
    nonce: 'idempotency-key-1',
    createdAt: '2026-04-18T10:00:00.000Z',
  };

  it('accepts a full intent', () => {
    expect(ZodTransactionIntent.safeParse(base).success).toBe(true);
  });

  it('rejects negative amount', () => {
    expect(ZodTransactionIntent.safeParse({ ...base, amount: -1n }).success).toBe(false);
  });

  it('accepts zero amount (caller decides semantics)', () => {
    // Design note: sign_transaction rejects zero amount — but the intent schema
    // is reused for dry-run flows.
    expect(ZodTransactionIntent.safeParse({ ...base, amount: 0n }).success).toBe(true);
  });

  it('rejects empty nonce', () => {
    expect(ZodTransactionIntent.safeParse({ ...base, nonce: '' }).success).toBe(false);
  });

  it('rejects non-bigint amount', () => {
    expect(
      ZodTransactionIntent.safeParse({ ...base, amount: 100 as unknown as bigint }).success,
    ).toBe(false);
  });
});

describe('ZodBalanceResponse', () => {
  it('accepts all-zero balance', () => {
    expect(
      ZodBalanceResponse.safeParse({ btc: 0n, eth: 0n, usdc: 0n }).success,
    ).toBe(true);
  });

  it('rejects missing asset', () => {
    expect(ZodBalanceResponse.safeParse({ btc: 0n, eth: 0n }).success).toBe(false);
  });
});

describe('ZodSignTransactionResponse', () => {
  it('accepts signature + publicKey', () => {
    const r = ZodSignTransactionResponse.safeParse({
      signature: '30450221...',
      publicKey: '02abc...',
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty signature', () => {
    expect(
      ZodSignTransactionResponse.safeParse({ signature: '', publicKey: '02abc' }).success,
    ).toBe(false);
  });
});

describe('ZodTxRecord', () => {
  const rec = {
    txId: 'tx-1',
    asset: 'btc' as const,
    amount: 50_000n,
    counterparty: 'bc1q' + 'b'.repeat(39),
    direction: 'out' as const,
    status: 'confirmed' as const,
    timestamp: '2026-04-18T10:00:00.000Z',
  };

  it('accepts valid record', () => {
    expect(ZodTxRecord.safeParse(rec).success).toBe(true);
  });

  it('rejects unknown status', () => {
    expect(
      ZodTxRecord.safeParse({ ...rec, status: 'cancelled' }).success,
    ).toBe(false);
  });

  it('rejects unknown direction', () => {
    expect(
      ZodTxRecord.safeParse({ ...rec, direction: 'both' }).success,
    ).toBe(false);
  });
});
