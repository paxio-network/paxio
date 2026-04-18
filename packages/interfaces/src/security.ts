// Security Sidecar port (FA-04) — Intent Verifier.
// Deterministic APPROVE/HOLD/BLOCK decision. No ML. Concrete implementation is
// a Rust canister at products/04-security/canister/.

import type {
  Result,
  Did,
  AgentPolicy,
  VerifyRequest,
  VerifyResponse,
} from '@paxio/types';

export interface SecurityError {
  readonly code:
    | 'validation_error'
    | 'policy_not_found'
    | 'canister_error';
  readonly message: string;
}

export interface SecuritySidecar {
  /** Set/replace the policy for an agent. */
  setPolicy(policy: AgentPolicy): Promise<Result<void, SecurityError>>;

  /** Fetch the currently active policy for an agent. */
  getPolicy(did: Did): Promise<Result<AgentPolicy, SecurityError>>;

  /** Deterministic APPROVE/HOLD/BLOCK decision. MUST be idempotent for same intent. */
  verify(req: VerifyRequest): Promise<Result<VerifyResponse, SecurityError>>;
}
