# M04 — Audit Log Canister MVP (Forensics Chain)

**Owner:** icp-dev
**Branch:** `feature/m04-audit-log`
**Depends on:** M00 ✅, M01a ✅
**Parallel with:** M01, M02, M03
**Estimate:** 3 days

## Готово когда:
- [ ] `cargo build -p audit_log --release` — clean
- [ ] `cargo test -p audit_log` — all GREEN (7 tests)
- [ ] `cargo clippy -p audit_log -- -D warnings` — clean
- [ ] `bash scripts/verify_m04_audit_log.sh` — PASS

## Scope (FA-06 Audit Log)

Immutable append-only log with SHA-256 chain:
- `entry[0].prev_hash = "00…" × 64`
- `entry[n].prev_hash = entry[n-1].entry_hash`
- `entry[n].entry_hash = sha256(prev_hash ‖ serialized(entry fields))`

Tamper-evident: modifying any entry invalidates all subsequent entries' hashes.

| Method | Mode | Purpose |
|---|---|---|
| `log_entry(input)` | `#[update]` | Append entry; idempotent on `tx_id` |
| `get_entries(query)` | `#[query]` | Filter by agent/action/time, paginate |
| `get_forensics_trail(did)` | `#[query]` | Full trail + `chain_valid` + `root_hash` |
| `verify_chain()` | `#[query]` | Recompute all hashes, return bool |

**No admin key. No delete endpoint.** `reset_for_test` is `#[cfg(test)]` only — verified by acceptance script.

## Crate structure

```
products/06-compliance/canisters/audit-log/
├── Cargo.toml
├── audit_log.did
├── src/
│   ├── lib.rs
│   ├── types.rs        # AuditAction enum, LogEntryInput/LogEntry/LogQuery structs
│   ├── chain.rs        # pure fn compute_entry_hash(prev, entry) -> [u8;32]
│   ├── storage.rs      # StableBTreeMap<u64 /* index */, LogEntry> + tx_id→index dedup map
│   └── errors.rs
└── tests/
    └── chain_test.rs   # RED specs (already written)
```

## Determinism + idempotency

- `log_entry` with same `tx_id` returns the existing entry (no duplicate append).
- Hash: `sha2::Sha256::digest(prev_hash || bincode::serialize(entry_core))` — `entry_core` excludes `entry_hash` itself.
- Index auto-increments; do NOT rely on timestamp ordering for index (non-monotonic across canister upgrades).

## Tests (RED, written by architect)

`products/06-compliance/canisters/audit-log/tests/chain_test.rs` — 7 tests:
1. `genesis_entry_has_zero_prev_hash`
2. `each_entry_chains_to_previous`
3. `log_entry_is_idempotent_on_same_tx_id`
4. `verify_chain_returns_true_on_fresh_log`
5. `get_entries_filters_by_agent_did`
6. `get_entries_filters_by_action`
7. `get_entries_respects_limit`

## Acceptance script

`bash scripts/verify_m04_audit_log.sh` — 5 steps: crate exists, build, tests, chain integrity, no delete/admin endpoint.

## Таблица задач

| # | Задача | Агент | Метод верификации | Файлы |
|---|---|---|---|---|
| 1 | Cargo crate + Candid | icp-dev | `cargo build -p audit_log` | `products/06-compliance/canisters/audit-log/` |
| 2 | Types (CandidType derives) | icp-dev | tests compile | `src/types.rs` |
| 3 | Pure hash-chain fn | icp-dev | `genesis_*`, `each_entry_chains_*` GREEN | `src/chain.rs` |
| 4 | Stable storage + tx_id dedup map | icp-dev | `log_entry_is_idempotent` GREEN | `src/storage.rs` |
| 5 | `get_entries` with filters + limit | icp-dev | filter tests GREEN | `src/lib.rs` |
| 6 | `verify_chain()` + `get_forensics_trail` | icp-dev | `verify_chain_returns_true_*` GREEN | `src/lib.rs` |

## Dependencies
- Independent of M01/M02/M03.
- In Phase 1 Wallet + Security Sidecar call `log_entry` after each SIGN/VERIFY decision. This is the single source of compliance truth (EU AI Act Art. 72).

## Статус: ТЕСТЫ НАПИСАНЫ — ЖДЁТ icp-dev
