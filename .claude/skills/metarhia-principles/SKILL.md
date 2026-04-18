---
name: metarhia-principles
description: >
  Architectural principles adapted from Metarhia JS stack to TypeScript/Rust/Python.
  Use when making architecture decisions, reviewing code structure, or when
  architect plans new modules. Core: contracts, layered architecture, no global state.
---

# Metarhia Architecture Principles (adapted for Paxio)

## Core principles that apply to ALL layers (TS/Rust/Python)

## Principle 1: Contract-based modules

Every module = contract (interface/.h) + implementation.

**TypeScript:**
```typescript
// engine/core/src/services/registry.ts — contract
export interface RegistryService {
  register(profile: AgentProfile): Promise<Result<AgentId, RegistryError>>;
  resolve(did: Did): Promise<Result<DidDocument, RegistryError>>;
  find(intent: string, threshold: number): Promise<Result<AgentProfile[], RegistryError>>;
}

// Implementation — separate file, same module
// engine/core/src/services/registry.ts — implementation
```

**Rust:**
```rust
// canisters/src/registry/src/lib.rs — contract + impl
pub fn register(profile: AgentProfile) -> Result<AgentId, RegistryError> { }
pub fn resolve(did: &Did) -> Result<DidDocument, RegistryError> { }
```

## Principle 2: Separate domain and system code

**TypeScript:**
- Domain (`engine/core/src/services/`): pure business logic, NO I/O, NO `fetch()`, NO file access
- System (`engine/daemon/src/http/`): HTTP routes, plugins — ONLY at boundaries
- Data (`engine/core/src/data/`): reference JSON files, NOT imported directly into domain

**Rust:**
- Domain (`canisters/src/`): pure logic, NO file I/O, NO network calls
- System (canister entry points): `#[ic_cdk::update]` / `#[ic_cdk::query]` at boundaries

**Python:**
- Domain (`services/guard/`): pure ML logic, NO `requests.get()`, NO file I/O in hot path
- System (`services/guard/api.py`): FastAPI routes at boundary

## Principle 3: Layered (onion) architecture

Paxio layers (inside → outside):

```
core:     trust/ — reputation, crypto (depends on NOTHING)
mid:      services/ — domain logic (depends on core)
outer:    http/ — Fastify routes (depends on mid + canister bindings)
boundary: canisters/ — ICP (trust + settlement)
```

Dependencies point INWARD only. Never reverse.

## Principle 4: No global state

**TypeScript:**
```typescript
// FORBIDDEN:
let globalCache: Map<string, AgentProfile> = new Map();

// CORRECT: pass state explicitly
export function createRegistryService(cache: Cache): RegistryService {
  return {
    async find(intent: string) {
      const cached = cache.get(intent); // explicit dependency
      // ...
    }
  }
}
```

**Rust:**
```rust
// FORBIDDEN:
static mut COUNTER: u64 = 0;

// CORRECT: thread_local + RefCell, or pass state explicitly
thread_local! {
    static STATE: RefCell<RegistryState> = RefCell::new(RegistryState::default());
}
```

## Principle 5: Schema validation at boundaries

**TypeScript:** Zod at every HTTP handler entry point
```typescript
const RegisterSchema = z.object({
  did: z.string().regex(/^did:paxio:/),
  name: z.string().min(1).max(100),
  capability: z.enum(['REGISTRY', 'FACILITATOR', 'WALLET', 'SECURITY', 'INTELLIGENCE']),
});

fastify.post('/register', async (request, reply) => {
  const parsed = RegisterSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.format() });
  }
  // parsed.data is guaranteed valid inside
});
```

## Principle 6: Error classification

| Error type | Cause | How to handle |
|------------|-------|---------------|
| **Programming** | Bug (null deref, logic error) | Fix the code. In tests: ok. In prod: crash |
| **Operational** | Expected failure (bad input, network timeout, not found) | `Result<T,E>` — return, don't throw |

**Never:**
- `try/catch` for operational errors in Rust
- `throw new Error()` for operational errors in TypeScript
- Swallow errors silently

**Always:**
- Return `Result<T,E>` in Rust
- Return `{ ok: true, value } | { ok: false, error }` in TypeScript
- Propagate or log, never silently ignore

## Principle 7: Factory functions, not constructors

**TypeScript:**
```typescript
// FORBIDDEN:
const agent = new AgentProfile({ did, name, capability });

// CORRECT: factory function
export function createAgentProfile(data: {
  did: string;
  name: string;
  capability: Capability;
}): AgentProfile {
  return {
    id: generateId(data.did),
    reputationScore: 0.5, // default
    securityBadge: SecurityBadge.Unscored,
    ...data,
  };
}
```

## Principle 8: Facade for complex subsystems

```typescript
// One function that hides: validation + routing + security check + settlement
export async function executeTransaction(
  tx: ProposedTransaction,
  agentConfig: AgentSecurityConfig
): Promise<Result<TransactionResult, FacilitatorError>> {
  // User doesn't need to know the internal steps
  // 1. verify_x402_payment(tx.proof)
  // 2. check_security(Intput)
  // 3. route_to_agent(tx)
  // 4. record_audit_log(tx)
}
```

## Principle 9: No inheritance hierarchies

**TypeScript:** Use composition, not class inheritance
```typescript
// FORBIDDEN:
class SecureAgent extends Agent { }  // NO inheritance chains

// CORRECT: composition via interface
interface Agent {
  did: Did;
  resolve(): Promise<DidDocument>;
}

interface SecureAgent extends Agent {
  securityBadge: SecurityBadge;
}
```

**Rust:** Use traits, not inheritance
```rust
// FORBIDDEN: inheritance
struct SecureAgent { base: Agent, security_badge: SecurityBadge }

// CORRECT: trait composition
trait Secure { fn security_badge(&self) -> SecurityBadge; }
```

## Principle 10: Data externalization

Reference data in JSON, NOT hardcoded:

```
engine/core/data/
├── protocol-fees.json      # fee schedules
├── routing-rules.json     # protocol routing
├── agent-sources.json     # ecosystem crawlers
└── threshold-config.json   # Guard ML thresholds
```

Code should NEVER contain raw numbers that could be externalized.

## Translation table: JS → TS → Rust → Python

| Concept | JS (Metarhia) | TS (Paxio) | Rust (Canister) | Python (Guard) |
|---------|---------------|------------|-----------------|----------------|
| module | `module.exports` | `export function` | `pub fn` in `.rs` | `def` in `.py` |
| interface | JSDoc `@param` | `interface` or `type` | `trait` | `Protocol` or `BaseModel` |
| class | `class` | `interface + factory` | `struct + impl` | `dataclass` |
| state | closure capture | DI via factory | `thread_local!` | passed as arg |
| errors | `throw/catch` | `Result<T,E>` | `Result<T,E>` | `Result[T,E]` or exception |
| validation | joi/z-schema | Zod | `thiserror` + manual | Pydantic |
| async | `async/await` | `async/await` | `async fn` + `.await` | `async def` + `asyncio` |
