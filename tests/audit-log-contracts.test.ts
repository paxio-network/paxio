import { describe, it, expect } from 'vitest';
import {
  ZodAuditAction,
  ZodLogEntryInput,
  ZodLogEntry,
  ZodLogQuery,
  ZodLogQueryResponse,
  ZodForensicsTrail,
  AUDIT_ACTIONS,
} from '@paxio/types';

// Contract tests — FA-06 Audit Log canister.

describe('ZodAuditAction', () => {
  it('includes SIGN, VERIFY, APPROVE, HOLD, BLOCK, REGISTER, CLAIM', () => {
    expect(AUDIT_ACTIONS).toEqual([
      'SIGN',
      'VERIFY',
      'APPROVE',
      'HOLD',
      'BLOCK',
      'REGISTER',
      'CLAIM',
    ]);
  });

  it('rejects unknown action', () => {
    expect(ZodAuditAction.safeParse('YOLO').success).toBe(false);
  });

  it('rejects lowercase sign', () => {
    expect(ZodAuditAction.safeParse('sign').success).toBe(false);
  });
});

describe('ZodLogEntryInput', () => {
  const base = {
    txId: 'tx-1',
    agentDid: 'did:paxio:base:0xagent',
    action: 'SIGN' as const,
    amount: 50_000n,
    asset: 'btc' as const,
  };

  it('accepts full input', () => {
    expect(ZodLogEntryInput.safeParse(base).success).toBe(true);
  });

  it('defaults metadata to {}', () => {
    const r = ZodLogEntryInput.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.metadata).toEqual({});
  });

  it('accepts minimal input (REGISTER without amount/asset)', () => {
    expect(
      ZodLogEntryInput.safeParse({
        txId: 'tx-2',
        agentDid: 'did:paxio:base:0xagent',
        action: 'REGISTER',
      }).success,
    ).toBe(true);
  });

  it('rejects empty txId (idempotency key required)', () => {
    expect(
      ZodLogEntryInput.safeParse({ ...base, txId: '' }).success,
    ).toBe(false);
  });
});

describe('ZodLogEntry', () => {
  const stored = {
    index: 0,
    txId: 'tx-1',
    agentDid: 'did:paxio:base:0xagent',
    action: 'SIGN' as const,
    amount: 50_000n,
    asset: 'btc' as const,
    metadata: { key: 'value' },
    timestamp: 1_700_000_000_000_000_000n,
    prevHash: '0'.repeat(64),
    entryHash: 'a'.repeat(64),
  };

  it('accepts genesis entry (prevHash = all zeros)', () => {
    expect(ZodLogEntry.safeParse(stored).success).toBe(true);
  });

  it('rejects prevHash of wrong length', () => {
    expect(
      ZodLogEntry.safeParse({ ...stored, prevHash: '0'.repeat(63) }).success,
    ).toBe(false);
  });

  it('rejects entryHash of wrong length', () => {
    expect(
      ZodLogEntry.safeParse({ ...stored, entryHash: 'x'.repeat(65) }).success,
    ).toBe(false);
  });

  it('rejects negative index', () => {
    expect(ZodLogEntry.safeParse({ ...stored, index: -1 }).success).toBe(false);
  });

  it('requires timestamp as bigint (nanoseconds)', () => {
    expect(
      ZodLogEntry.safeParse({ ...stored, timestamp: 1_700_000_000_000 as unknown as bigint })
        .success,
    ).toBe(false);
  });
});

describe('ZodLogQuery', () => {
  it('defaults limit to 100', () => {
    const r = ZodLogQuery.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(100);
  });

  it('accepts filter by agentDid + action', () => {
    expect(
      ZodLogQuery.safeParse({
        agentDid: 'did:paxio:base:0xagent',
        action: 'SIGN',
      }).success,
    ).toBe(true);
  });

  it('rejects limit > 1000', () => {
    expect(ZodLogQuery.safeParse({ limit: 5000 }).success).toBe(false);
  });

  it('accepts startTime + endTime as bigint', () => {
    expect(
      ZodLogQuery.safeParse({
        startTime: 1_700_000_000_000_000_000n,
        endTime: 1_800_000_000_000_000_000n,
      }).success,
    ).toBe(true);
  });
});

describe('ZodLogQueryResponse', () => {
  it('accepts empty entries', () => {
    expect(ZodLogQueryResponse.safeParse({ entries: [], total: 0 }).success).toBe(true);
  });

  it('rejects negative total', () => {
    expect(ZodLogQueryResponse.safeParse({ entries: [], total: -1 }).success).toBe(false);
  });
});

describe('ZodForensicsTrail', () => {
  const trail = {
    agentDid: 'did:paxio:base:0xagent',
    entries: [],
    chainValid: true,
    rootHash: 'f'.repeat(64),
  };

  it('accepts empty trail', () => {
    expect(ZodForensicsTrail.safeParse(trail).success).toBe(true);
  });

  it('rejects rootHash of wrong length', () => {
    expect(
      ZodForensicsTrail.safeParse({ ...trail, rootHash: 'f'.repeat(32) }).success,
    ).toBe(false);
  });
});
