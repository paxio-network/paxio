---
name: complior-security
description: Security agent implementation based on Complior pipeline. Use when implementing Prompt Injection Guard, OWASP LLM scorer, Secrets Scanner, or Transaction Intent Verifier.
---

# Complior Security Pipeline — Paxio Guard Agent (FA-08)

## What is Complior
EU AI Act compliance scanner with 550+ tests, 6 frameworks (OWASP LLM, MITRE ATLAS).
Paxio Guard Agent = Complior logic, ported to Python ML on FA-08 + Rust fast-path in canister.

## 11 threat detection tasks (FA-08)

| # | Task | Type | Latency |
|---|------|------|---------|
| 1 | Prompt Injection | Classification | <50ms |
| 2 | Secret Detection | Pattern match | <10ms |
| 3 | Intent Classification | Embedding similarity | <30ms |
| 4 | Budget Check | Rule-based | <5ms |
| 5 | Address Whitelist | Rule-based | <5ms |
| 6 | Velocity Check | Rule-based | <5ms |
| 7 | Exfiltration Pattern | ML classification | <100ms |
| 8 | Model Theft Detection | ML classification | <100ms |
| 9 | Excessive Agency | ML classification | <100ms |
| 10 | Supply Chain Risk | Heuristic | <20ms |
| 11 | Social Engineering | ML classification | <100ms |

Total budget: <200ms end-to-end.

## Rust fast-path (in canister — <2ms)

```rust
// Level 1: pattern matching — in canister, no network
pub fn check_injection_fast(input: &str) -> InjectionResult {
    for pattern in INJECTION_PATTERNS {
        if input.to_lowercase().contains(pattern) {
            return InjectionResult::Suspicious { pattern: pattern.to_string() };
        }
    }
    InjectionResult::Safe
}
```

## Python ML path (Hetzner — for heavy classification)

```python
# services/guard/classifiers.py
from pydantic import BaseModel
from typing import Literal

class ClassificationResult(BaseModel):
    task: str
    label: Literal["safe", "suspicious", "blocked"]
    confidence: float
    reason: str | None = None

# Latency budget per classifier
CLASSIFIER_LATENCY = {
    "prompt_injection": 0.050,   # 50ms
    "exfiltration": 0.100,       # 100ms
    "intent": 0.030,            # 30ms
}
```

## Threshold config (externalized to JSON)

```json
{
  "prompt_injection": {
    "threshold": 0.85,
    "patterns": ["ignore previous", "disregard instructions", "you are now"]
  },
  "budget": {
    "daily_default": 1000,
    "per_tx_min": 10,
    "velocity_window_hours": 24
  },
  "exfiltration": {
    "keywords": ["password", "api_key", "secret", "token"],
    "threshold": 0.7
  }
}
```

## Security rules (FA-04)
- LLM-free for financial OUTPUT decisions — Rust deterministic code only
- Guard Agent (ML) for INPUT classification only
- Budget limits enforced on every transaction
- Gradual escalation detection (small amounts → large amounts pattern)
- OWASP LLM Top 10 scored for every agent interaction

## Deployment
Heavy ML (PromptGuard, LLM Guard, Presidio) — Hetzner Docker, not in canister.
Canister calls ML service via HTTPS — authenticated with threshold ECDSA signature.
