---
name: rust-error-handling
description: >
  Error handling patterns for Rust ICP canisters.
  Use when implementing error handling, Result chains, custom error types,
  or when the user mentions errors, recovery, error classification.
---

# Error Handling (Rust ICP Canisters)

## Error classification

- **Programming errors:** Bugs (unwrap on None, index out of bounds, logic errors).
  Fix the code. In tests: unwrap() is OK. In canisters: NEVER.
  In Rust: panic, unwrap on None.

- **Operational errors:** Expected failures (network timeout, invalid input, chain lookup
  failure, malformed payment proof). Handle gracefully with `Result<T, E>`.
  In Rust: return `Err(CustomError::Description)`.

## Custom error types per canister

```rust
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RegistryError {
    AgentNotFound(String),
    DuplicateEndpoint(String),
    InvalidProfile(String),
    StorageFull,
    CrawlFailed(String),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum FacilitatorError {
    PaymentNotFound(String),
    AmountMismatch { expected: u64, actual: u64 },
    InvalidNetwork(String),
    ChainLookupFailed(String),
    SecurityCheckFailed(String),
    EscrowHoldFailed(String),
    SettlementFailed(String),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum WalletError {
    InsufficientBalance { available: u64, requested: u64 },
    InvalidAddress(String),
    SigningFailed(String),
    NetworkMismatch(String),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum SecurityError {
    InjectionDetected(String),
    SecretFound { pattern_id: usize, position: usize },
    BudgetExceeded { limit: u64, requested: u64 },
    WhitelistViolation(String),
    EscalationDetected,
}
```

## Result chain — replaces try/catch

```rust
pub fn verify_and_route(proof: PaymentProof) -> Result<RouteResult, FacilitatorError> {
    let tx = lookup_transaction(&proof.tx_hash)
        .map_err(|e| FacilitatorError::ChainLookupFailed(e.to_string()))?;
    validate_amount(tx.amount, proof.expected_amount)?;
    Ok(RouteResult { tx_hash: tx.hash, amount: tx.amount })
}
```

## Error propagation with ? operator

```rust
// Each step can fail independently — ? propagates the error
pub fn register_and_score(profile: AgentProfile) -> Result<AgentId, RegistryError> {
    validate_profile(&profile)?;           // Returns RegistryError::InvalidProfile
    let id = generate_unique_id(&profile)?; // Returns RegistryError::DuplicateEndpoint
    store_agent(&id, &profile)?;           // Returns RegistryError::StorageFull
    Ok(id)
}
```

## Conventions

- Every public canister function returns `Result<T, E>` with canister-specific error type
- Use `?` operator for propagation, not nested match blocks
- Use `map_err` when crossing error type boundaries
- NEVER use `unwrap()` in canister code — causes canister trap (panic)
- NEVER swallow errors silently — always propagate or log via ic_cdk::println!
- Custom error types implement CandidType + Deserialize for cross-canister communication
- Error messages should be actionable: include what failed and what to do about it
