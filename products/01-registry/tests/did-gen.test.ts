// DID generation — deterministic from (endpoint + developer).
//
// Dev: registry-dev
// Target: products/01-registry/app/domain/did-gen.ts
//   MUST export: generateDid(params: { endpoint: string; developer: string; network: string }): Did

import { describe, it, expect } from 'vitest';
import { isDid, parseDid } from '@paxio/types';
// RED: not yet implemented.
import { generateDid } from '../app/domain/did-gen.js';

describe('generateDid', () => {
  it('returns a valid W3C DID', () => {
    const did = generateDid({
      endpoint: 'https://a1.example.com',
      developer: 'alice@example.com',
      network: 'base',
    });
    expect(isDid(did)).toBe(true);
  });

  it('uses the requested network segment', () => {
    const did = generateDid({
      endpoint: 'https://a.example.com',
      developer: 'alice',
      network: 'ethereum',
    });
    const parts = parseDid(did);
    expect(parts?.network).toBe('ethereum');
  });

  it('is deterministic: same inputs → same DID', () => {
    const input = {
      endpoint: 'https://a.example.com',
      developer: 'alice',
      network: 'base',
    };
    expect(generateDid(input)).toBe(generateDid(input));
  });

  it('differs when endpoint differs', () => {
    const d1 = generateDid({
      endpoint: 'https://a.example.com',
      developer: 'alice',
      network: 'base',
    });
    const d2 = generateDid({
      endpoint: 'https://b.example.com',
      developer: 'alice',
      network: 'base',
    });
    expect(d1).not.toBe(d2);
  });

  it('differs when developer differs', () => {
    const d1 = generateDid({
      endpoint: 'https://a.example.com',
      developer: 'alice',
      network: 'base',
    });
    const d2 = generateDid({
      endpoint: 'https://a.example.com',
      developer: 'bob',
      network: 'base',
    });
    expect(d1).not.toBe(d2);
  });

  it('rejects empty endpoint', () => {
    expect(() =>
      generateDid({ endpoint: '', developer: 'alice', network: 'base' }),
    ).toThrow();
  });
});
