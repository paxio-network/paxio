---
name: rust-gof
description: >
  Design patterns adapted from GoF for Rust ICP canister development.
  Use when implementing factories, facades, strategies, builders, adapters,
  or when the user mentions design patterns. Functional Rust — no inheritance.
---

# Design Patterns (Rust Functional)

## General principles

- Use structural composition over inheritance
- Use multiparadigm code and contract-programming
- Separate and do not mix system and domain code
- Use GRASP and SOLID principles; especially reduce coupling
- Keep patterns simple — do not over-engineer

## What to USE vs what to AVOID

| USE | AVOID | Why |
|-----|-------|-----|
| Factory (free function) | Abstract Factory | Over-engineering for canisters |
| Strategy (trait / fn pointer) | Singleton | Global state! Use thread_local! |
| Facade (module wrapping subsystem) | Visitor | Complex, rarely needed |
| Builder (for complex structs) | Mediator | Hidden coupling |
| Adapter (wrapper functions) | Decorator chains | Overhead, prefer composition |
| Newtype (type safety) | Prototype chain | Not idiomatic Rust |

## Factory (free function returning struct)

```rust
pub fn create_agent_profile(endpoint: String, tags: Vec<String>) -> AgentProfile {
    AgentProfile {
        endpoint,
        intent_tags: tags,
        reputation_score: 0.5,
        security_badge: SecurityBadge::Unscored,
        bitcoin_enabled: false,
    }
}
```

## Builder (for complex configuration)

```rust
pub struct SecurityConfigBuilder {
    daily_limit: u64,
    whitelist: Vec<String>,
    escalation_detection: bool,
}

impl SecurityConfigBuilder {
    pub fn new() -> Self {
        Self { daily_limit: 1000, whitelist: vec![], escalation_detection: true }
    }
    pub fn daily_limit(mut self, limit: u64) -> Self { self.daily_limit = limit; self }
    pub fn whitelist(mut self, addrs: Vec<String>) -> Self { self.whitelist = addrs; self }
    pub fn build(self) -> AgentSecurityConfig {
        AgentSecurityConfig {
            daily_limit_remaining: self.daily_limit,
            address_whitelist: self.whitelist,
            detect_escalation: self.escalation_detection,
            recent_transactions: vec![],
        }
    }
}
```

## Newtype (type safety — prevents mixing IDs)

```rust
pub struct AgentId(pub String);
pub struct TxHash(pub String);

fn get_agent(id: AgentId) -> Option<AgentProfile> { ... }
fn get_transaction(hash: TxHash) -> Option<Transaction> { ... }
```

## Facade (module hiding complex subsystem)

```rust
pub fn find_best_agent(intent: &str) -> Result<AgentProfile, RegistryError> {
    let candidates = semantic_search(intent)?;
    let scored = score_by_reputation(candidates)?;
    let filtered = filter_by_security(scored)?;
    filtered.into_iter().next()
        .ok_or(RegistryError::NoAgentFound)
}
```

## Strategy (trait for pluggable behavior)

```rust
trait SearchStrategy {
    fn search(&self, query: &str, agents: &[AgentProfile]) -> Vec<AgentProfile>;
}

struct CosineSimilaritySearch { threshold: f32 }

impl SearchStrategy for CosineSimilaritySearch {
    fn search(&self, query: &str, agents: &[AgentProfile]) -> Vec<AgentProfile> {
        // implementation
        todo!()
    }
}
```

## Anti-patterns (FORBIDDEN)

### Global mutable state — NEVER
```rust
// FORBIDDEN:
static mut COUNTER: u64 = 0;

// CORRECT:
thread_local! {
    static COUNTER: RefCell<u64> = RefCell::new(0);
}
```

### Inheritance — NOT idiomatic Rust
Use traits for shared behavior, composition for shared data, enums for variants.
