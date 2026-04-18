---
description: Naming conventions, error handling, data externalization for TypeScript + Rust
globs: ["server/**/*.cjs", "app/**/*.{js,ts}", "canisters/**/*.rs", "packages/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "docs/**/*.md"]
---

# Code Style Rules

## General

- **snake_case** everywhere: functions, variables, filenames
- **PascalCase** for type names: `AgentCard`, `ReputationScore`, `FapRoute`
- **camelCase** for object properties and method names
- **UPPER_SNAKE_CASE** for constants: `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT_MS`
- Max 100 chars per line
- Comments in English

## TypeScript

### Imports (TypeScript — types/contracts)
```typescript
// app/types/ and app/interfaces/ are TypeScript (typed) but compiled/used as JS in VM sandbox
import type { AgentCard, ReputationScore } from 'app/types/agent.js';
import { ZodAgentCard } from 'app/types/schemas.js';
import { DatabaseError, NotFoundError } from 'app/errors/index.js';
```

Note: в `app/` нет `require()` — модули загружаются через `vm.Script` loader. См.
`.claude/rules/backend-architecture.md` для деталей.

### Error Handling
```typescript
// GOOD: Result pattern or custom error
export async function findAgent(did: string): Promise<Result<AgentCard, NotFoundError>> {
  const agent = await db.agents.findOne({ did });
  if (!agent) return Err(new NotFoundError(`Agent ${did} not found`));
  return Ok(agent);
}

// BAD: no error handling
export async function findAgent(did: string) {
  return await db.agents.findOne({ did }); // throws on not found
}
```

### Data Externalization
```typescript
// GOOD: reference data from JSON
import { PROTOCOL_FEES } from '../data/protocol-fees.json' with { type: 'json' };

// BAD: hardcoded values
const FEE = 0.003; // never hardcode
```

## Rust

### Naming
```rust
// snake_case for functions, variables, files
// PascalCase for types, enums, structs
pub struct WalletCanister { ... }
pub fn threshold_ecdsa_sign(&mut self, tx: &Transaction) -> Result<Signature, canister::Error> { ... }
```

### Error Handling
```rust
// GOOD: Result<T, E>
pub fn send_transaction(tx: UnsignedTx) -> Result<TxHash, WalletError> {
    if tx.value() == 0 {
        return Err(WalletError::ZeroAmount);
    }
    Ok(self.sign_and_broadcast(tx)?)
}

// Use thiserror for error enums
#[derive(Error, Debug)]
pub enum WalletError {
    #[error("zero amount not allowed")]
    ZeroAmount,
    #[error("insufficient balance: got {got}, need {need}")]
    InsufficientBalance { got: u64, need: u64 },
}
```

## No Hardcoded Values

Allowed as constants (in code):
- `0`, `1`, `-1` (identities)
- `true`, `false` (boolean flags)

NEVER hardcode:
- Paths → environment variable or config
- Ports, IPs → environment variable or config
- API keys, tokens → `.env` (gitignored)
- Thresholds, fees → JSON in `app/data/`
- Model names, version numbers → JSON config

## No File Bloat

- One logical unit per file
- Group related functions in a service file
- Don't create a new file for a single utility function

## No Copy-Paste

If you need the same logic in two places → extract it:
- Shared utility → `app/lib/`
- Shared type → `app/types/`
- Three similar lines → fine. Three similar blocks → refactor signal.

## Data Structures

Use the right tool for the data:

| Data | Use |
|------|-----|
| Structured records with validation | Zod schema + TypeScript type |
| Key-value cache | Redis |
| Vector search | Qdrant |
| Relation data | PostgreSQL |
| Immutable audit log | ICP canister |
| Reference lookup tables | JSON file |
| Secrets | Environment variables |
