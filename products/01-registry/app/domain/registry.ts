// In-memory Registry — MVP for M01.
//
// Storage: Map<Did, AgentCard> + per-DID nonce cache (5-min TTL).
// Search: BM25 over name + description (see search.ts).
// Claim: secp256k1 ECDSA verification over the nonce hash (see claim.ts).
//
// PostgreSQL + Qdrant + Redis swap-in is M17 — Registry interface is the
// stable boundary, this implementation is replaceable.

import type {
  AgentCard,
  Did,
  FindQuery,
  FindResult,
  ClaimChallenge,
  ClaimProof,
  Result,
} from '@paxio/types';
import { ok, err, ZodAgentCard } from '@paxio/types';
import type { Clock } from '@paxio/interfaces';
import type { Registry, RegistryError } from '@paxio/interfaces';
import { bm25Search } from './search.js';
import { verifySignature } from './claim.js';

const CLAIM_TTL_MS = 5 * 60 * 1000;

interface ClaimEntry {
  readonly did: Did;
  readonly nonce: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export interface RegistryDeps {
  readonly clock: Clock;
  readonly idGen: () => string;
}

const validationError = (message: string): RegistryError => ({
  code: 'validation_error',
  message,
});

const notFound = (did: Did): RegistryError => ({
  code: 'not_found',
  message: `agent not found: ${did}`,
});

const conflict = (did: Did): RegistryError => ({
  code: 'conflict',
  message: `agent already registered: ${did}`,
});

export const createInMemoryRegistry = (deps: RegistryDeps): Registry => {
  const cards = new Map<Did, AgentCard>();
  // Active claim challenges keyed by nonce (one nonce → one DID).
  const challenges = new Map<string, ClaimEntry>();

  const sweepExpiredChallenges = (now: number): void => {
    for (const [nonce, entry] of challenges) {
      if (entry.expiresAt <= now) challenges.delete(nonce);
    }
  };

  const register = async (
    card: AgentCard,
  ): Promise<Result<Did, RegistryError>> => {
    const parsed = ZodAgentCard.safeParse(card);
    if (!parsed.success) {
      return err(validationError(parsed.error.issues[0]?.message ?? 'invalid card'));
    }
    const valid = parsed.data;
    if (cards.has(valid.did)) {
      return err(conflict(valid.did));
    }
    cards.set(valid.did, valid);
    return ok(valid.did);
  };

  const resolve = async (
    did: Did,
  ): Promise<Result<AgentCard, RegistryError>> => {
    const card = cards.get(did);
    if (!card) return err(notFound(did));
    return ok(card);
  };

  const find = async (
    query: FindQuery,
  ): Promise<Result<readonly FindResult[], RegistryError>> => {
    const results = bm25Search(cards.values(), query.intent, {
      limit: query.limit,
    });
    return ok(results);
  };

  const count = async (): Promise<number> => cards.size;

  const issueClaimChallenge = async (
    did: Did,
  ): Promise<Result<ClaimChallenge, RegistryError>> => {
    if (!cards.has(did)) return err(notFound(did));

    const now = deps.clock.now();
    sweepExpiredChallenges(now);

    const nonce = deps.idGen();
    const expiresAt = now + CLAIM_TTL_MS;
    challenges.set(nonce, {
      did,
      nonce,
      issuedAt: now,
      expiresAt,
    });

    return ok({
      did,
      nonce,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  };

  const verifyClaim = async (
    proof: ClaimProof,
  ): Promise<Result<Did, RegistryError>> => {
    const now = deps.clock.now();
    sweepExpiredChallenges(now);

    const entry = challenges.get(proof.nonce);
    if (!entry || entry.did !== proof.did) {
      return err({
        code: 'claim_expired',
        message: 'no active challenge for this nonce/did',
      });
    }
    if (entry.expiresAt <= now) {
      challenges.delete(proof.nonce);
      return err({
        code: 'claim_expired',
        message: 'challenge expired',
      });
    }

    const valid = verifySignature({
      nonce: proof.nonce,
      signature: proof.signature,
      publicKey: proof.publicKey,
    });
    if (!valid) {
      return err({
        code: 'claim_invalid_signature',
        message: 'signature verification failed',
      });
    }

    challenges.delete(proof.nonce);
    return ok(entry.did);
  };

  return {
    register,
    resolve,
    find,
    count,
    issueClaimChallenge,
    verifyClaim,
  };
};
