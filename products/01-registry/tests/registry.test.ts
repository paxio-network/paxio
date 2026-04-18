// M01 Registry TS core — behavior specification (RED tests).
//
// Dev: registry-dev
// Implementation target: products/01-registry/app/domain/registry.ts
//   MUST export: createInMemoryRegistry(deps: { clock: Clock; idGen: () => string }): Registry
//
// For M01 MVP the Registry is an in-memory Map<Did, AgentCard>.
// PostgreSQL + Qdrant + Redis is M17 (Phase 1). Reputation canister is M31b.

import { describe, it, expect, beforeEach } from 'vitest';
import type { Registry } from '@paxio/interfaces';
import type { AgentCard } from '@paxio/types';
import { createFixedClock } from '@paxio/utils/clock';
// RED: not yet implemented. registry-dev must create this module.
import { createInMemoryRegistry } from '../app/domain/registry.js';

const makeCard = (over: Partial<AgentCard> = {}): AgentCard => ({
  did: 'did:paxio:base:0xagent1',
  name: 'Agent One',
  description: 'Test agent',
  capability: 'INTELLIGENCE',
  endpoint: 'https://a1.example.com',
  version: '0.1.0',
  createdAt: '2026-04-18T00:00:00.000Z',
  ...over,
});

let registry: Registry;
let nonceCounter: number;

beforeEach(() => {
  nonceCounter = 0;
  registry = createInMemoryRegistry({
    clock: createFixedClock(new Date('2026-04-18T10:00:00.000Z').getTime()),
    idGen: () => {
      nonceCounter += 1;
      return `nonce-${nonceCounter.toString().padStart(16, '0')}`;
    },
  });
});

describe('Registry.register', () => {
  it('returns Ok(did) for a new Agent Card', async () => {
    const r = await registry.register(makeCard());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('did:paxio:base:0xagent1');
  });

  it('returns Err(conflict) on duplicate DID', async () => {
    await registry.register(makeCard());
    const r2 = await registry.register(makeCard());
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.code).toBe('conflict');
  });

  it('returns Err(validation_error) on malformed DID', async () => {
    const r = await registry.register(makeCard({ did: 'not-a-did' as never }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('validation_error');
  });
});

describe('Registry.resolve', () => {
  it('returns the card after register', async () => {
    await registry.register(makeCard());
    const r = await registry.resolve('did:paxio:base:0xagent1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('Agent One');
  });

  it('returns Err(not_found) for unknown DID', async () => {
    const r = await registry.resolve('did:paxio:base:0xunknown');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('not_found');
  });
});

describe('Registry.count', () => {
  it('starts at 0', async () => {
    expect(await registry.count()).toBe(0);
  });

  it('increments on register', async () => {
    await registry.register(makeCard({ did: 'did:paxio:base:0xa' }));
    await registry.register(makeCard({ did: 'did:paxio:base:0xb' }));
    expect(await registry.count()).toBe(2);
  });
});

describe('Registry.find', () => {
  beforeEach(async () => {
    await registry.register(
      makeCard({
        did: 'did:paxio:base:0xtr1',
        name: 'English Spanish Translator',
        description: 'Translates English to Spanish',
      }),
    );
    await registry.register(
      makeCard({
        did: 'did:paxio:base:0xtr2',
        name: 'French German Translator',
        description: 'Translates French to German',
      }),
    );
    await registry.register(
      makeCard({
        did: 'did:paxio:base:0xpay',
        name: 'Payment Router',
        description: 'Routes x402 payments',
        capability: 'FACILITATOR',
      }),
    );
  });

  it('returns results sorted by descending score', async () => {
    const r = await registry.find({ intent: 'translator', limit: 10 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.length).toBeGreaterThanOrEqual(2);
    // First two results are translators.
    const firstTwoNames = r.value.slice(0, 2).map((x) => x.card.name);
    expect(firstTwoNames).toEqual(
      expect.arrayContaining([
        'English Spanish Translator',
        'French German Translator',
      ]),
    );
    // Scores are descending.
    for (let i = 1; i < r.value.length; i += 1) {
      expect(r.value[i]!.score).toBeLessThanOrEqual(r.value[i - 1]!.score);
    }
  });

  it('honors limit', async () => {
    const r = await registry.find({ intent: 'translator', limit: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBe(1);
  });

  it('returns empty list when nothing matches', async () => {
    const r = await registry.find({ intent: 'quantum-teleporter', limit: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBe(0);
  });
});

describe('Registry.issueClaimChallenge', () => {
  it('returns nonce + expiresAt for existing DID', async () => {
    await registry.register(makeCard());
    const r = await registry.issueClaimChallenge('did:paxio:base:0xagent1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.nonce.length).toBeGreaterThanOrEqual(16);
      expect(new Date(r.value.expiresAt).getTime()).toBeGreaterThan(
        new Date('2026-04-18T10:00:00.000Z').getTime(),
      );
    }
  });

  it('returns Err(not_found) for unknown DID', async () => {
    const r = await registry.issueClaimChallenge('did:paxio:base:0xunknown');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('not_found');
  });
});

describe('Registry.verifyClaim', () => {
  it('returns Err(claim_invalid_signature) when signature is wrong', async () => {
    await registry.register(makeCard());
    const chal = await registry.issueClaimChallenge('did:paxio:base:0xagent1');
    if (!chal.ok) throw new Error('challenge failed');
    const r = await registry.verifyClaim({
      did: 'did:paxio:base:0xagent1',
      nonce: chal.value.nonce,
      signature: 'invalid-signature',
      publicKey: '02deadbeef',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('claim_invalid_signature');
  });

  it('returns Err(claim_expired) for expired nonce (fresh nonce not issued)', async () => {
    await registry.register(makeCard());
    const r = await registry.verifyClaim({
      did: 'did:paxio:base:0xagent1',
      nonce: 'never-issued-nonce',
      signature: 'sig',
      publicKey: 'pub',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(['claim_expired', 'claim_invalid_signature']).toContain(r.error.code);
  });
});
