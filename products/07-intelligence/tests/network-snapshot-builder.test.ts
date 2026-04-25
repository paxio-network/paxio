// M-L5 RED spec — pure function `buildNetworkSnapshot(cards, nowMs)`
//
// Located at `products/07-intelligence/app/domain/network-snapshot-builder.ts`
// (created by backend-dev — M-L5 task T-6).
//
// Contract:
//   - Pure: same (cards, nowMs) → same NetworkSnapshot (structural equality)
//   - No I/O: no Date.now(), no Math.random(), no fetch, no imports of
//     `node:*` modules (domain purity per engineering-principles §6)
//   - Deterministic position: x_pct/y_pct derive from DID via stable hash
//     (same DID across runs → same coordinates — important so the landing
//     graph doesn't visually "jitter" on each snapshot poll)
//   - Result frozen: top-level + nodes[] + pairs[]
//   - Empty input → `{ nodes: [], pairs: [], generated_at: ... }` with
//     `pairs` ALWAYS empty in MVP (no transaction data yet per Roadmap —
//     pairs arrive with Audit Log integration M17+)
//   - `bitcoin_native` derived from `capability === 'WALLET'`
//     (capability enum from @paxio/types — matches M-L1-contracts)
//   - `volume_usd_5m` is always 0 in MVP (Real Data Invariant — no
//     transaction volume source yet; Roadmap tracks)
//
// Why pure function instead of factory:
//   No dependencies (no clock because nowMs is passed as arg; no logger
//   because domain; no storage because cards are passed). Simpler surface.
//   Factory pattern (createBuildNetworkSnapshot(deps)) would be over-design.

import { describe, it, expect } from 'vitest';
import { ZodNetworkSnapshot } from '@paxio/types';
import type { AgentCard, Did } from '@paxio/types';
import { buildNetworkSnapshot } from '../app/domain/network-snapshot-builder.js';

// --- Fixtures ---

const FIXED_NOW_MS = 1_714_000_000_000; // 2024-04-24T23:06:40.000Z — ISO
const FIXED_NOW_ISO = '2024-04-24T23:06:40.000Z';

const cardA: AgentCard = {
  did: 'did:paxio:base:0xaaaa111122223333444455556666777788889999' as Did,
  name: 'Agent Alice',
  description: 'Intelligence',
  capability: 'INTELLIGENCE',
  endpoint: 'https://alice.example.com',
  version: '1.0.0',
  createdAt: '2026-04-23T10:00:00.000Z',
  source: 'erc8004',
  externalId: '0xaaaa1111',
  sourceUrl: 'https://basescan.org/address/0xaaaa1111',
  crawledAt: '2026-04-23T10:30:00.000Z',
};

const cardB: AgentCard = {
  did: 'did:paxio:mcp:bob-server' as Did,
  name: 'Agent Bob',
  description: 'Wallet service',
  capability: 'WALLET',
  endpoint: 'https://bob.example.com',
  version: '2.0.0',
  createdAt: '2026-04-23T11:00:00.000Z',
  source: 'mcp',
  externalId: 'bob-server',
  sourceUrl: 'https://smithery.ai/server/bob-server',
  crawledAt: '2026-04-23T11:30:00.000Z',
};

const cardC: AgentCard = {
  did: 'did:paxio:native:0xccccdddd' as Did,
  name: 'Agent Charlie with a somewhat long name that nonetheless fits',
  description: undefined,
  capability: 'FACILITATOR',
  endpoint: 'https://charlie.example.com',
  version: '0.1.0',
  createdAt: '2026-04-23T12:00:00.000Z',
  source: 'native',
  externalId: undefined,
  sourceUrl: undefined,
  crawledAt: undefined,
};

describe('buildNetworkSnapshot — pure function contract', () => {
  it('is deterministic (same input → same output)', () => {
    const r1 = buildNetworkSnapshot([cardA, cardB, cardC], FIXED_NOW_MS);
    const r2 = buildNetworkSnapshot([cardA, cardB, cardC], FIXED_NOW_MS);
    expect(r1).toStrictEqual(r2);
  });

  it('returns a frozen NetworkSnapshot', () => {
    const snap = buildNetworkSnapshot([cardA, cardB], FIXED_NOW_MS);
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.nodes)).toBe(true);
    expect(Object.isFrozen(snap.pairs)).toBe(true);
  });

  it('produces one node per input card, same count', () => {
    const snap = buildNetworkSnapshot([cardA, cardB, cardC], FIXED_NOW_MS);
    expect(snap.nodes).toHaveLength(3);
  });

  it('empty cards → empty nodes, empty pairs (real empty state)', () => {
    const snap = buildNetworkSnapshot([], FIXED_NOW_MS);
    expect(snap.nodes).toStrictEqual([]);
    expect(snap.pairs).toStrictEqual([]);
    expect(snap.generated_at).toBe(FIXED_NOW_ISO);
  });

  it('pairs are ALWAYS empty in MVP (no transaction data yet)', () => {
    const snap = buildNetworkSnapshot([cardA, cardB, cardC], FIXED_NOW_MS);
    expect(snap.pairs).toStrictEqual([]);
  });

  it('generated_at is ISO-8601 from nowMs (deterministic from arg, not Date.now)', () => {
    const snap = buildNetworkSnapshot([cardA], FIXED_NOW_MS);
    expect(snap.generated_at).toBe(FIXED_NOW_ISO);
  });

  it('node.id equals card.did (identity preservation)', () => {
    const snap = buildNetworkSnapshot([cardA, cardB], FIXED_NOW_MS);
    const dids = snap.nodes.map((n) => n.id);
    expect(dids).toContain(cardA.did);
    expect(dids).toContain(cardB.did);
  });

  it('node.name is card.name, truncated to 80 chars', () => {
    const snap = buildNetworkSnapshot([cardC], FIXED_NOW_MS);
    const bob = snap.nodes.find((n) => n.id === cardC.did);
    expect(bob).toBeDefined();
    expect(bob!.name.length).toBeLessThanOrEqual(80);
    expect(bob!.name.length).toBeGreaterThan(0);
    // First 20 chars should match original (prefix preserved)
    expect(bob!.name.startsWith('Agent Charlie')).toBe(true);
  });

  it('node.x_pct and y_pct are in [0, 100] range (Zod-parseable)', () => {
    const snap = buildNetworkSnapshot([cardA, cardB, cardC], FIXED_NOW_MS);
    for (const node of snap.nodes) {
      expect(node.x_pct).toBeGreaterThanOrEqual(0);
      expect(node.x_pct).toBeLessThanOrEqual(100);
      expect(node.y_pct).toBeGreaterThanOrEqual(0);
      expect(node.y_pct).toBeLessThanOrEqual(100);
    }
  });

  it('node.x_pct and y_pct derive deterministically from DID (no Math.random)', () => {
    // Same card with different NOW values must produce same coordinates
    // because position hash depends ONLY on DID.
    const s1 = buildNetworkSnapshot([cardA], 1_000_000_000_000);
    const s2 = buildNetworkSnapshot([cardA], 9_000_000_000_000);
    expect(s1.nodes[0]!.x_pct).toBe(s2.nodes[0]!.x_pct);
    expect(s1.nodes[0]!.y_pct).toBe(s2.nodes[0]!.y_pct);
  });

  it('different DIDs produce different positions (no collision on small sets)', () => {
    const snap = buildNetworkSnapshot([cardA, cardB, cardC], FIXED_NOW_MS);
    const positions = snap.nodes.map((n) => `${n.x_pct},${n.y_pct}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(positions.length);
  });

  it('node.volume_usd_5m is 0 for every card (Real Data Invariant — MVP)', () => {
    // M-L5 MVP has no transaction source. Any non-zero value would be fake.
    const snap = buildNetworkSnapshot([cardA, cardB, cardC], FIXED_NOW_MS);
    for (const node of snap.nodes) {
      expect(node.volume_usd_5m).toBe(0);
    }
  });

  it('node.bitcoin_native is true for WALLET capability, false otherwise', () => {
    const snap = buildNetworkSnapshot([cardA, cardB, cardC], FIXED_NOW_MS);
    const a = snap.nodes.find((n) => n.id === cardA.did)!;
    const b = snap.nodes.find((n) => n.id === cardB.did)!;
    const c = snap.nodes.find((n) => n.id === cardC.did)!;
    expect(a.bitcoin_native).toBe(false); // INTELLIGENCE
    expect(b.bitcoin_native).toBe(true); // WALLET
    expect(c.bitcoin_native).toBe(false); // FACILITATOR
  });

  it('full result passes ZodNetworkSnapshot validation (contract boundary)', () => {
    const snap = buildNetworkSnapshot([cardA, cardB, cardC], FIXED_NOW_MS);
    const parsed = ZodNetworkSnapshot.safeParse(snap);
    expect(parsed.success).toBe(true);
  });

  it('consistent return shape for empty vs populated input', () => {
    const empty = buildNetworkSnapshot([], FIXED_NOW_MS);
    const full = buildNetworkSnapshot([cardA], FIXED_NOW_MS);
    expect(Object.keys(empty).sort()).toStrictEqual(Object.keys(full).sort());
  });

  it('does not mutate input cards array', () => {
    const cards = [cardA, cardB];
    const before = [...cards];
    buildNetworkSnapshot(cards, FIXED_NOW_MS);
    expect(cards).toStrictEqual(before);
  });
});
