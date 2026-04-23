# M03 — Security Sidecar MVP (Intent Verifier)

**Owner:** icp-dev
**Branch:** `feature/m03-security-sidecar`
**Depends on:** M00 ✅, M01a ✅
**Parallel with:** M01, M02, M04
**Estimate:** 3–4 days

## Готово когда:
- [ ] `cargo build -p security_sidecar --release` — clean
- [ ] `cargo test -p security_sidecar` — all GREEN (7 tests)
- [ ] `cargo clippy -p security_sidecar -- -D warnings` — clean
- [ ] `bash scripts/verify_m03_security.sh` — PASS

## Scope

**Intent Verifier ONLY** — deterministic APPROVE / HOLD / BLOCK based on:

| Rule | Decision on violation | Reason |
|---|---|---|
| `tx.amount > per_tx_limit` | BLOCK | `per_tx_limit_exceeded` |
| `daily_total + tx.amount > daily_budget` | BLOCK | `budget_exceeded` |
| `tx.to ∉ whitelist` | BLOCK | `recipient_not_whitelisted` |
| Current UTC hour ∉ `[start, end]` | BLOCK | `outside_allowed_hours` |
| `guard_confidence > 0.8` (injection) | HOLD | `guard_injection_suspected` |

**Not in M03** (FA-04 §9):
- Secrets Scanner → TS, M24 (backend-dev)
- OWASP Scorer → TS, M24
- MITRE mapper → TS, M24
- AML / OFAC list match → M69 (backend-dev wires external list)
- Behavioral anomaly (z-score over 30d baseline) → later; M03 has hook but no computation

## Design rules (FA-04 §3)

- **Pure Rust. No ML deps.** Verified by `verify_m03_security.sh` step 5.
- **No `panic!` in `#[update]` / `#[query]`.** Always `Result<T, E>`.
- **Same input → same output** (determinism — idempotency test enforces).
- **`StableBTreeMap<Did, AgentPolicy>`** + `StableBTreeMap<Did, DailySpend>` for state.

## Crate structure

```
products/04-security/canister/
├── Cargo.toml
├── security_sidecar.did
├── src/
│   ├── lib.rs              # #[update] set_policy, verify; #[query] get_policy
│   ├── types.rs            # AgentPolicy, TransactionIntent, VerifyRequest, VerifyResponse
│   ├── verifier.rs         # pure fn verify_intent(policy, intent, guard_conf) -> VerifyResponse
│   ├── storage.rs          # StableBTreeMap wrappers
│   └── errors.rs
└── tests/
    └── intent_verifier_test.rs  # RED specs (already written)
```

## Tests (RED, written by architect)

`products/04-security/canister/tests/intent_verifier_test.rs` — 7 tests:
1. `approves_transaction_within_all_limits`
2. `blocks_when_recipient_not_whitelisted`
3. `blocks_when_per_tx_limit_exceeded`
4. `blocks_when_daily_budget_exceeded`
5. `holds_on_high_guard_confidence`
6. `approves_when_guard_confidence_below_threshold`
7. `verify_is_idempotent_for_same_intent`

## Acceptance script

`bash scripts/verify_m03_security.sh` — 5 steps: crate exists, build, tests, determinism, no ML deps.

## Таблица задач

| # | Задача | Агент | Метод верификации | Файлы |
|---|---|---|---|---|
| 1 | Cargo crate skeleton + Candid | icp-dev | `cargo build -p security_sidecar` | `products/04-security/canister/` |
| 2 | Types (Candid-compat) | icp-dev | tests compile | `src/types.rs` |
| 3 | Pure verifier fn (no I/O) | icp-dev | `cargo test -p security_sidecar` | `src/verifier.rs` |
| 4 | Stable-memory policy store | icp-dev | idempotency test GREEN | `src/storage.rs` |
| 5 | Daily-spend tracker with nonce dedup | icp-dev | budget_exceeded test GREEN | `src/storage.rs` |
| 6 | Guard confidence HOLD logic | icp-dev | holds_on_high_guard_confidence GREEN | `src/verifier.rs` |

## Dependencies
- Independent of M01/M02/M04.
- In Phase 1 (M22+): Wallet canister will inter-canister-call Security Sidecar before signing. The shared TransactionIntent struct comes from this milestone — wallet imports it via Candid bindings.

## Статус: ТЕСТЫ НАПИСАНЫ — ЖДЁТ icp-dev
