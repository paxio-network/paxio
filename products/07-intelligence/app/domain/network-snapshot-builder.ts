// buildNetworkSnapshot — M-L5 pure function.
// Products NetworkGraph nodes from AgentCards returned by AgentStorage.listRecent().
//
// Contract:
//   - Pure: same (cards, nowMs) → structurally identical NetworkSnapshot
//   - No I/O: no Date.now(), no Math.random(), no node:* imports
//   - Deterministic positions: x_pct/y_pct derive from SHA-1(DID) first 2 bytes
//     — same DID across calls → same coordinates (no visual jitter on polling)
//   - Result frozen: top-level + nodes[] + pairs[]
//   - Empty input → { nodes: [], pairs: [], generated_at: ISO(nowMs) }
//   - pairs ALWAYS empty in MVP (no transaction data — M17+)
//   - bitcoin_native = capability === 'WALLET'
//   - volume_usd_5m = 0 (Real Data Invariant — no transaction source yet)
//
// Why pure function (not factory):
//   No deps. nowMs passed as arg. No logger, no clock injection needed.
//   Factory would be over-engineering for a pure transform.

import type { AgentCard } from '@paxio/types';
import type { NetworkSnapshot } from '@paxio/types';

/** DID string → two [0..99] integers via deterministic PRNG. */
// mulberry32 seeded PRNG — fast, good-enough distribution for canvas coords.
const mulberry32 = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
  };
};

const didToPosition = (did: string): [x_pct: number, y_pct: number] => {
  // djb2 — hash every character so DIDs that share a long prefix still diverge.
  // (All 3 test fixtures start with "did:paxio:" and would collide with a
  // short-prefix or single-hash approach.)
  let hash = 5381;
  for (let i = 0; i < did.length; i++) {
    hash = ((hash << 5) + hash + did.charCodeAt(i)) | 0;
  }
  const seed = (hash >>> 0);
  const rng = mulberry32(seed);
  const x = Math.floor(rng() * 100);
  const y = Math.floor(rng() * 100);
  return [x, y];
};

const MAX_NAME_LEN = 80;

const toNode = (card: AgentCard) => {
  const [x_pct, y_pct] = didToPosition(card.did);
  return Object.freeze({
    id: card.did,
    name: card.name.length > MAX_NAME_LEN ? card.name.slice(0, MAX_NAME_LEN) : card.name,
    x_pct,
    y_pct,
    volume_usd_5m: 0,
    bitcoin_native: card.capability === 'WALLET',
  });
};

export const buildNetworkSnapshot = (
  cards: readonly AgentCard[],
  nowMs: number,
): NetworkSnapshot => {
  const nodes = cards.map((c) => toNode(c));
  return Object.freeze(
    Object.assign(Object.create(null), {
      nodes: Object.freeze(nodes),
      pairs: Object.freeze([]),
      generated_at: new Date(nowMs).toISOString(),
    }),
  );
};