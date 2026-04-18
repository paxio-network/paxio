import { describe, it, expect } from 'vitest';
import {
  ZodDecision,
  ZodReason,
  ZodAgentPolicy,
  ZodVerifyRequest,
  ZodVerifyResponse,
  DECISIONS,
  BLOCK_REASONS,
  HOLD_REASONS,
} from '@paxio/types';

// Contract tests — FA-04 Security Sidecar (Intent Verifier only).

describe('ZodDecision', () => {
  it('has exactly APPROVE, HOLD, BLOCK', () => {
    expect(DECISIONS).toEqual(['APPROVE', 'HOLD', 'BLOCK']);
  });

  it('rejects unknown decision', () => {
    expect(ZodDecision.safeParse('YOLO').success).toBe(false);
  });

  it('rejects lowercase approve', () => {
    expect(ZodDecision.safeParse('approve').success).toBe(false);
  });
});

describe('ZodReason', () => {
  it('includes budget_exceeded as a BLOCK reason', () => {
    expect(BLOCK_REASONS).toContain('budget_exceeded');
    expect(ZodReason.safeParse('budget_exceeded').success).toBe(true);
  });

  it('includes behavioral_anomaly as a HOLD reason', () => {
    expect(HOLD_REASONS).toContain('behavioral_anomaly');
    expect(ZodReason.safeParse('behavioral_anomaly').success).toBe(true);
  });

  it('rejects unknown reason', () => {
    expect(ZodReason.safeParse('just_because').success).toBe(false);
  });
});

describe('ZodAgentPolicy', () => {
  const policy = {
    did: 'did:paxio:base:0xagent',
    dailyBudget: 1_000_000n,
    perTxLimit: 100_000n,
    whitelist: ['bc1q' + 'a'.repeat(39)],
    allowedHours: [9, 17] as [number, number],
  };

  it('accepts a valid policy', () => {
    expect(ZodAgentPolicy.safeParse(policy).success).toBe(true);
  });

  it('rejects negative dailyBudget', () => {
    expect(
      ZodAgentPolicy.safeParse({ ...policy, dailyBudget: -1n }).success,
    ).toBe(false);
  });

  it('rejects perTxLimit as non-bigint', () => {
    expect(
      ZodAgentPolicy.safeParse({ ...policy, perTxLimit: 100 as unknown as bigint })
        .success,
    ).toBe(false);
  });

  it('rejects allowedHours outside 0..23', () => {
    expect(
      ZodAgentPolicy.safeParse({ ...policy, allowedHours: [0, 25] as [number, number] })
        .success,
    ).toBe(false);
  });

  it('accepts empty whitelist (no recipient allowed — everything will BLOCK)', () => {
    expect(ZodAgentPolicy.safeParse({ ...policy, whitelist: [] }).success).toBe(true);
  });
});

describe('ZodVerifyRequest', () => {
  const base = {
    intent: {
      from: 'did:paxio:base:0xagent',
      to: 'bc1q' + 'a'.repeat(39),
      asset: 'btc' as const,
      amount: 50_000n,
      nonce: 'n-1',
      createdAt: '2026-04-18T10:00:00.000Z',
    },
  };

  it('accepts intent without guardConfidence', () => {
    expect(ZodVerifyRequest.safeParse(base).success).toBe(true);
  });

  it('accepts guardConfidence in [0,1]', () => {
    expect(
      ZodVerifyRequest.safeParse({ ...base, guardConfidence: 0.73 }).success,
    ).toBe(true);
  });

  it('rejects guardConfidence > 1', () => {
    expect(
      ZodVerifyRequest.safeParse({ ...base, guardConfidence: 1.5 }).success,
    ).toBe(false);
  });
});

describe('ZodVerifyResponse', () => {
  it('accepts APPROVE without reason', () => {
    expect(
      ZodVerifyResponse.safeParse({
        decision: 'APPROVE',
        verifiedAt: '2026-04-18T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('accepts BLOCK with reason', () => {
    expect(
      ZodVerifyResponse.safeParse({
        decision: 'BLOCK',
        reason: 'budget_exceeded',
        verifiedAt: '2026-04-18T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('accepts HOLD with reason', () => {
    expect(
      ZodVerifyResponse.safeParse({
        decision: 'HOLD',
        reason: 'behavioral_anomaly',
        verifiedAt: '2026-04-18T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown reason even with valid decision', () => {
    expect(
      ZodVerifyResponse.safeParse({
        decision: 'BLOCK',
        reason: 'cosmic_rays',
        verifiedAt: '2026-04-18T10:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});
