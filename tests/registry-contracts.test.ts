import { describe, it, expect } from 'vitest';
import {
  ZodRegisterRequest,
  ZodRegisterResponse,
  ZodFindQuery,
  ZodFindResult,
  ZodFindResponse,
  ZodResolveResponse,
  ZodClaimChallenge,
  ZodClaimProof,
  ZodClaimResponse,
  ZodCountResponse,
} from '@paxio/types';

// Contract-level tests for Registry request/response schemas (FA-01 §4).
// These lock down the on-wire shape so M01 implementation cannot drift.

const validCard = {
  did: 'did:paxio:base:0xabc',
  name: 'Translator Agent',
  description: 'Translates English↔Spanish',
  capability: 'INTELLIGENCE',
  endpoint: 'https://agents.example.com/translate',
  version: '0.1.0',
  createdAt: '2026-04-18T00:00:00.000Z',
};

describe('ZodRegisterRequest', () => {
  it('accepts a minimal Agent Card', () => {
    expect(ZodRegisterRequest.safeParse(validCard).success).toBe(true);
  });

  it('rejects invalid DID', () => {
    const r = ZodRegisterRequest.safeParse({ ...validCard, did: 'not-a-did' });
    expect(r.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name, ...rest } = validCard;
    expect(ZodRegisterRequest.safeParse(rest).success).toBe(false);
  });
});

describe('ZodRegisterResponse', () => {
  it('accepts { did, registered: true }', () => {
    const r = ZodRegisterResponse.safeParse({
      did: 'did:paxio:base:0x1',
      registered: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects registered: false', () => {
    const r = ZodRegisterResponse.safeParse({
      did: 'did:paxio:base:0x1',
      registered: false,
    });
    expect(r.success).toBe(false);
  });
});

describe('ZodFindQuery', () => {
  it('accepts intent+limit', () => {
    const r = ZodFindQuery.safeParse({ intent: 'translate', limit: 5 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(5);
  });

  it('defaults limit to 10 when omitted', () => {
    const r = ZodFindQuery.safeParse({ intent: 'translate' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(10);
  });

  it('rejects empty intent', () => {
    const r = ZodFindQuery.safeParse({ intent: '' });
    expect(r.success).toBe(false);
  });

  it('rejects limit > 100', () => {
    const r = ZodFindQuery.safeParse({ intent: 'x', limit: 1000 });
    expect(r.success).toBe(false);
  });

  it('coerces string limit from query string', () => {
    const r = ZodFindQuery.safeParse({ intent: 'translate', limit: '25' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(25);
  });
});

describe('ZodFindResult', () => {
  it('requires score in [0,1]', () => {
    const r = ZodFindResult.safeParse({ card: validCard, score: 0.87 });
    expect(r.success).toBe(true);
  });

  it('rejects score > 1', () => {
    const r = ZodFindResult.safeParse({ card: validCard, score: 1.5 });
    expect(r.success).toBe(false);
  });

  it('rejects score < 0', () => {
    const r = ZodFindResult.safeParse({ card: validCard, score: -0.1 });
    expect(r.success).toBe(false);
  });
});

describe('ZodFindResponse', () => {
  it('accepts empty results', () => {
    const r = ZodFindResponse.safeParse({ results: [], total: 0 });
    expect(r.success).toBe(true);
  });

  it('rejects negative total', () => {
    const r = ZodFindResponse.safeParse({ results: [], total: -1 });
    expect(r.success).toBe(false);
  });
});

describe('ZodResolveResponse', () => {
  it('wraps a card', () => {
    const r = ZodResolveResponse.safeParse({ card: validCard });
    expect(r.success).toBe(true);
  });
});

describe('ZodClaimChallenge', () => {
  it('accepts nonce ≥ 16 chars', () => {
    const r = ZodClaimChallenge.safeParse({
      did: 'did:paxio:base:0x1',
      nonce: '0123456789abcdef0123',
      expiresAt: '2026-04-18T01:00:00.000Z',
    });
    expect(r.success).toBe(true);
  });

  it('rejects short nonce', () => {
    const r = ZodClaimChallenge.safeParse({
      did: 'did:paxio:base:0x1',
      nonce: 'short',
      expiresAt: '2026-04-18T01:00:00.000Z',
    });
    expect(r.success).toBe(false);
  });
});

describe('ZodClaimProof', () => {
  it('requires did, nonce, signature, publicKey', () => {
    const r = ZodClaimProof.safeParse({
      did: 'did:paxio:base:0x1',
      nonce: 'nonce-value',
      signature: '0xsig',
      publicKey: '0xpub',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing signature', () => {
    const r = ZodClaimProof.safeParse({
      did: 'did:paxio:base:0x1',
      nonce: 'nonce-value',
      publicKey: '0xpub',
    });
    expect(r.success).toBe(false);
  });
});

describe('ZodClaimResponse', () => {
  it('accepts claimed: true', () => {
    const r = ZodClaimResponse.safeParse({
      did: 'did:paxio:base:0x1',
      claimed: true,
      claimedAt: '2026-04-18T01:00:00.000Z',
    });
    expect(r.success).toBe(true);
  });
});

describe('ZodCountResponse', () => {
  it('accepts non-negative integer', () => {
    const r = ZodCountResponse.safeParse({ count: 0 });
    expect(r.success).toBe(true);
  });

  it('rejects negative count', () => {
    const r = ZodCountResponse.safeParse({ count: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects non-integer count', () => {
    const r = ZodCountResponse.safeParse({ count: 1.5 });
    expect(r.success).toBe(false);
  });
});
