---
name: rust-data-structures
description: >
  Data structures for Rust ICP canisters. Use when working with collections,
  choosing between Vec/HashMap/BTreeMap/StableBTreeMap, implementing caches,
  or when the user mentions data structures.
---

# Data Structures (Rust ICP Canisters)

## Container selection

| Need | Rust choice | Why |
|------|-------------|-----|
| Persistent key-value (survives upgrades) | `StableBTreeMap` | ICP stable memory |
| In-memory key-value, frequent lookup | `HashMap` | O(1) average lookup |
| Ordered key-value | `BTreeMap` | Sorted iteration |
| Fixed-schema data | `struct` | Compile-time type checking |
| Uniqueness, fast lookup | `HashSet` | O(1) has() |
| Ordered collection, index access | `Vec` | Dynamic size, contiguous |
| Type-safe wrapper | Newtype `struct X(T)` | Prevents ID mix-ups |

## StableBTreeMap (ICP persistent storage)

Primary data structure for canister state. Survives canister upgrades.

```rust
use ic_stable_structures::{StableBTreeMap, DefaultMemoryImpl, memory_manager::*};
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static AGENTS: RefCell<StableBTreeMap<AgentId, AgentProfile, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        ));
}

// Read (query, free)
pub fn get_agent(id: &AgentId) -> Option<AgentProfile> {
    AGENTS.with(|a| a.borrow().get(id))
}

// Write (update, costs cycles)
pub fn store_agent(id: AgentId, profile: AgentProfile) {
    AGENTS.with(|a| a.borrow_mut().insert(id, profile));
}
```

## Newtype pattern (type safety)

```rust
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct AgentId(pub String);

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
pub struct TxHash(pub String);

// Compiler prevents: get_agent(TxHash("0xabc".into())) — type mismatch!
```

## Search results buffer

Temporary collection for query results:

```rust
pub fn find_agents(intent: &str) -> Vec<AgentProfile> {
    let mut results: Vec<(AgentProfile, f32)> = Vec::new();

    AGENTS.with(|a| {
        for (_, agent) in a.borrow().iter() {
            let score = compute_similarity(intent, &agent.intent_tags);
            if score >= SIMILARITY_THRESHOLD {
                results.push((agent, score));
            }
        }
    });

    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    results.into_iter().map(|(agent, _)| agent).collect()
}
```

## Audit log (append-only)

```rust
thread_local! {
    static AUDIT_LOG: RefCell<StableBTreeMap<u64, AuditEntry, Memory>> =
        RefCell::new(StableBTreeMap::init(get_audit_memory()));
    static AUDIT_COUNTER: RefCell<u64> = RefCell::new(0);
}

pub fn append_audit(entry: AuditEntry) {
    AUDIT_COUNTER.with(|c| {
        let idx = *c.borrow();
        AUDIT_LOG.with(|log| log.borrow_mut().insert(idx, entry));
        *c.borrow_mut() = idx + 1;
    });
}
```

## Key rules for ICP canisters

- Use StableBTreeMap for ALL data that must persist across upgrades
- Use thread_local! + RefCell for canister state — no static mut
- HashMap/Vec for temporary in-memory data (search results, caches)
- Newtype pattern for all IDs to prevent mix-ups at compile time
- StableBTreeMap keys must implement Storable + Ord
- StableBTreeMap values must implement Storable
- Memory IDs: assign unique MemoryId for each StableBTreeMap
