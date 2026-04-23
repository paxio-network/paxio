// Registry port (FA-01).
// Dev (registry-dev) provides a concrete implementation in products/01-registry/app/domain/.
// MVP (M01) = in-memory Map. M17 = PostgreSQL + Qdrant + Redis.

import type {
  Result,
  AgentCard,
  Did,
  FindQuery,
  FindResult,
  ClaimChallenge,
  ClaimProof,
} from '@paxio/types';

export interface RegistryError {
  readonly code:
    | 'validation_error'
    | 'not_found'
    | 'conflict'
    | 'claim_expired'
    | 'claim_invalid_signature';
  readonly message: string;
}

export interface Registry {
  /** Register a new Agent Card. Rejects on duplicate DID. */
  register(card: AgentCard): Promise<Result<Did, RegistryError>>;

  /** Resolve an Agent Card by its DID. */
  resolve(did: Did): Promise<Result<AgentCard, RegistryError>>;

  /** Semantic / text search. Returns scored results in descending score order. */
  find(query: FindQuery): Promise<Result<readonly FindResult[], RegistryError>>;

  /** Total number of registered agents. */
  count(): Promise<number>;

  /** Begin claim flow — server issues a nonce the client must sign. */
  issueClaimChallenge(
    did: Did,
  ): Promise<Result<ClaimChallenge, RegistryError>>;

  /** Complete claim flow — server verifies signature over nonce. */
  verifyClaim(proof: ClaimProof): Promise<Result<Did, RegistryError>>;
}
