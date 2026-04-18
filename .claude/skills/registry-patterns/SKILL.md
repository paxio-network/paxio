---
name: registry-patterns
description: Agent registry patterns — DID registry, capability system, semantic search. Use when implementing agent discovery, capability-based routing, or registry indexing (FA-01).
---

# Registry Patterns — FA-01 Universal Registry

## DID Registry (W3C DID Core 1.0)

```rust
#[derive(CandidType, Deserialize, Clone)]
pub struct DidDocument {
    pub id: Did,
    pub verification_method: Vec<VerificationMethod>,
    pub authentication: Vec<VerificationMethod>,
    pub service: Vec<ServiceEndpoint>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct AgentProfile {
    pub did: Did,
    pub name: String,
    pub endpoint: String,
    pub capability: Capability,
    pub reputation_score: f32,
    pub bitcoin_address: Option<String>,
    pub security_badge: SecurityBadge,
}
```

## Capability system (5 capabilities)

| Capability | Description | Example use |
|------------|-------------|-------------|
| REGISTRY | Agent registry operations | Register, resolve, update |
| FACILITATOR | Payment routing | Hold, release, settle |
| WALLET | Non-custodial BTC | Sign, send, receive |
| SECURITY | Threat detection | Classify, verify, block |
| INTELLIGENCE | NLU routing | Parse intent, context |

## Capability hierarchy

```
REGISTRY (root)
  └── FACILITATOR
        └── WALLET
  └── SECURITY
  └── INTELLIGENCE
```

## Semantic search (FA-01 future)

```rust
// Cosine similarity search over agent capability + intent_tags
pub fn find_agents(intent: &str, threshold: f32) -> Vec<AgentProfile> {
    let query_embedding = embed_text(intent);

    REGISTRY.with(|r| {
        r.borrow().iter()
            .filter_map(|(_, agent)| {
                let agent_embedding = embed_tags(&agent.intent_tags);
                let similarity = cosine_similarity(&query_embedding, &agent_embedding);
                if similarity >= threshold {
                    Some((agent.clone(), similarity))
                } else {
                    None
                }
            })
            .sorted_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(agent, _)| agent)
            .collect()
    })
}
```

## Key design decisions
- Registry is READ-HEAVY: use `#[ic_cdk::query]` for search (free, fast)
- Updates are WRITE: use `#[ic_cdk::update]` with validation
- Default similarity threshold: 0.7
- Agent deduplication: by DID (canonical form)

## DID resolution flow

```
1. User calls resolve("did:paxio:agent-name")
2. Registry canister looks up DID in StableBTreeMap
3. Returns DidDocument with:
   - verification_method (for signature verification)
   - service (endpoint for routing)
   - authentication (which keys can act on behalf of agent)
```
