import { describe, it, expect } from 'vitest';
import { ZodDid, isDid, parseDid } from '@paxio/types';
import { ZodCapability, CAPABILITIES } from '@paxio/types';
import { ZodAgentCard } from '@paxio/types';

describe('ZodDid', () => {
  it('accepts did:paxio:base:0x1a2b', () => {
    expect(ZodDid.safeParse('did:paxio:base:0x1a2b').success).toBe(true);
  });

  it('accepts did:paxio:icp:rdmx6-jaaaa-aaaaa-aaadq-cai', () => {
    expect(
      ZodDid.safeParse('did:paxio:icp:rdmx6-jaaaa-aaaaa-aaadq-cai').success,
    ).toBe(true);
  });

  it('accepts did:paxio:bitcoin with mixed case id', () => {
    expect(ZodDid.safeParse('did:paxio:bitcoin:bc1q8Dn72xz9').success).toBe(
      true,
    );
  });

  it('rejects did:wrong:base:0x1a (wrong method)', () => {
    expect(ZodDid.safeParse('did:wrong:base:0x1a').success).toBe(false);
  });

  it('rejects plain string', () => {
    expect(ZodDid.safeParse('not-a-did').success).toBe(false);
  });

  it('rejects empty id part', () => {
    expect(ZodDid.safeParse('did:paxio:base:').success).toBe(false);
  });

  it('rejects missing network part', () => {
    expect(ZodDid.safeParse('did:paxio::0x1a').success).toBe(false);
  });

  it('isDid narrows type for valid DID', () => {
    expect(isDid('did:paxio:base:0x1')).toBe(true);
  });

  it('isDid returns false for invalid DID', () => {
    expect(isDid('not-a-did')).toBe(false);
  });

  it('parseDid extracts method/network/id', () => {
    const parts = parseDid('did:paxio:base:0x1a2b');
    expect(parts).toEqual({ method: 'paxio', network: 'base', id: '0x1a2b' });
  });

  it('parseDid returns null for invalid input', () => {
    expect(parseDid('not-a-did')).toBeNull();
  });
});

describe('ZodCapability', () => {
  it('accepts all 5 capabilities', () => {
    for (const c of CAPABILITIES) {
      expect(ZodCapability.safeParse(c).success).toBe(true);
    }
  });

  it('rejects unknown capability', () => {
    expect(ZodCapability.safeParse('UNKNOWN').success).toBe(false);
  });

  it('rejects lowercase variant', () => {
    expect(ZodCapability.safeParse('registry').success).toBe(false);
  });

  it('CAPABILITIES has exactly 5 entries', () => {
    expect(CAPABILITIES).toHaveLength(5);
  });

  it('CAPABILITIES contains expected values', () => {
    expect(CAPABILITIES).toContain('REGISTRY');
    expect(CAPABILITIES).toContain('FACILITATOR');
    expect(CAPABILITIES).toContain('WALLET');
    expect(CAPABILITIES).toContain('SECURITY');
    expect(CAPABILITIES).toContain('INTELLIGENCE');
  });
});

describe('ZodAgentCard', () => {
  const valid = {
    did: 'did:paxio:base:0x1a2b',
    name: 'Test Agent',
    capability: 'REGISTRY' as const,
    version: '0.1.0',
    createdAt: '2026-04-18T00:00:00.000Z',
  };

  it('accepts minimal valid AgentCard', () => {
    expect(ZodAgentCard.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(ZodAgentCard.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects name > 200 chars', () => {
    expect(
      ZodAgentCard.safeParse({ ...valid, name: 'x'.repeat(201) }).success,
    ).toBe(false);
  });

  it('rejects invalid DID', () => {
    expect(
      ZodAgentCard.safeParse({ ...valid, did: 'not-a-did' }).success,
    ).toBe(false);
  });

  it('rejects invalid endpoint URL', () => {
    expect(
      ZodAgentCard.safeParse({ ...valid, endpoint: 'not a url' }).success,
    ).toBe(false);
  });

  it('accepts valid endpoint URL', () => {
    expect(
      ZodAgentCard.safeParse({
        ...valid,
        endpoint: 'https://agent.example.com/v1',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid createdAt (not ISO)', () => {
    expect(
      ZodAgentCard.safeParse({ ...valid, createdAt: 'yesterday' }).success,
    ).toBe(false);
  });

  it('description is optional', () => {
    expect(ZodAgentCard.safeParse(valid).success).toBe(true);
  });

  it('description accepts up to 1000 chars', () => {
    expect(
      ZodAgentCard.safeParse({ ...valid, description: 'x'.repeat(1000) })
        .success,
    ).toBe(true);
  });

  it('description rejects > 1000 chars', () => {
    expect(
      ZodAgentCard.safeParse({ ...valid, description: 'x'.repeat(1001) })
        .success,
    ).toBe(false);
  });
});
