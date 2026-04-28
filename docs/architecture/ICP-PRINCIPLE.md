# «ICP только там где надо» — Canister Boundary Rule

> Architect reference for deciding when a feature requires an ICP canister.
> All other features = TS in `apps/back/server/` + `products/*/app/` или Rust в
> `products/*/cli/` / `products/*/http-proxy/`.

## Канister = ТОЛЬКО если требуется одно из

1. **Threshold ECDSA** — Wallet keys, BTC signing. Физически невозможно иначе
   (без HSM, который single-point-of-failure).
2. **Immutable cryptographic proof** — Audit Log, Evidence Chain, Forensics
   Trail. Must survive admin compromise.
3. **Decentralized consensus** — Reputation Engine. Score нельзя подделать
   admin'у.
4. **Deterministic enforcement** — Security Sidecar Intent Verifier. Rust
   код принимает решение, не LLM.
5. **Chain Fusion** — Bitcoin Agent (threshold ECDSA + BTC L1).

## Всё остальное — НЕ canister

- Registry search/discovery → TS + PostgreSQL/Qdrant/Redis
- FAP routing (stateless engine) → TS + app/domain/
- Guard HTTP client → TS in app/domain/
- Compliance logic (non-immutable) → TS or Rust CLI
- MCP Server → TS
- Bitcoin HTTP proxy (signed elsewhere) → Rust binary
- Compliance CLI → Rust binary

Никаких canister'ов «потому что красиво». Canister'ы дороги (cycles + deploy +
upgrade migrations + 13-узловой consensus latency). Каждый canister = audit
boundary + governance burden.

## Применение

При планировании milestone architect задаёт 5 вопросов:
1. Нужен threshold ECDSA?
2. Нужна immutability for audit?
3. Нужен decentralized consensus (anti-tampering)?
4. Нужен deterministic enforcement (Rust over LLM)?
5. Нужен Chain Fusion (BTC L1 access)?

Если хотя бы одно «да» → canister. Иначе — TS / Rust off-chain.

См. также `docs/feature-areas/FA-09-icp-canister-architecture.md` (детальный
list canister'ов в Paxio).
