# Reuse Inventory — Paxio (v2 final)

> Breadth-first inventory + финальные решения по reuse.
> Цель: определить откуда берём код для каждой FA, перед написанием milestones.
>
> Версия: v2 (2026-04-17) — финальная после ответов user'а
> Следующая итерация: depth-inventory по каждой FA перед соответствующим milestone (если потребуется).

---

## Финальные решения

| # | Решение | Обоснование |
|---|---|---|
| **1. Licence** | Complior можно копировать без ограничений (это код user'а) | User owns Complior |
| **2. FAP** | FAP = TypeScript stateless service в `app/domain/fap/`. Bitgent `canisters/facilitator/` — `reference-only` (перечитываем логику, пишем заново в TS) | Принцип «ICP только там где надо». FAP не требует on-chain enforcement. |
| **3. `canisters/src/facilitator/`** | Нет (следствие #2) | — |
| **4. Evidence Chain** | Port TS→Rust в `canisters/src/audit_log/` | Audit Log ОБЯЗАН быть immutable → canister |
| **5. CLI** | Да — `cli/` в Paxio layout. Копируем Complior commands, TUI pages пропускаем | Был в плане |

---

## Принцип «ICP только где надо»

Canister = ТОЛЬКО:
- **Threshold ECDSA** (Wallet keys, BTC signing)
- **Immutable proof** (Audit Log, Evidence Chain, Forensics Trail)
- **Decentralized consensus** (Reputation scores — unforgeable)
- **Deterministic enforcement** (Security Sidecar Intent Verifier)
- **Chain Fusion** (Bitcoin Agent transactions)

Всё остальное — TypeScript.

---

## Reuse Map — финальный

### Bitgent → Paxio

| Bitgent source | Paxio destination | Strategy | Owner | Comment |
|---|---|---|---|---|
| `canisters/registry/` | `canisters/src/registry/` | `copy-and-own` | registry-dev | FA-01 canister core |
| `canisters/wallet/` | `canisters/src/wallet/` | `copy-and-own + finish BTC L1` | icp-dev | FA-03, нужно доделать threshold ECDSA BTC signing |
| `canisters/security/` | `canisters/src/security_sidecar/` | `copy-and-own` | icp-dev | FA-04 Security Sidecar — 90% готово |
| `canisters/audit_log/` | `canisters/src/audit_log/` | `copy-and-own + augment` | icp-dev | FA-06, augment evidence-chain из Complior |
| `canisters/shared/` | `canisters/src/shared/` | `copy-and-own` | icp-dev + architect | Общие типы |
| `canisters/facilitator/` | **НЕТ canister** | `reference-only` | — | Логику переписываем в TS в `app/domain/fap/` |
| `dfx.json` | `dfx.json` (adapt) | `copy-and-adapt` | architect | Убрать facilitator, добавить reputation + bitcoin_agent |
| `Cargo.toml` workspace | `canisters/Cargo.toml` | `copy-and-adapt` | architect | Rename bitgent→paxio, убрать facilitator |
| `opensrc/` | `opensrc/` (merge) | `merge` | architect | Объединить с existing Paxio opensrc |
| `src/declarations/` | `app/types/canister-bindings/` | `regenerate` | architect | TS declarations регенерируются из .did через dfx |
| `front/` | — | `reference-only` | — | У Paxio свой design system |
| `scripts/` | `scripts/` (selectively) | `copy-selectively` | architect | Deploy scripts берём, остальное — по надобности |
| `tests/` | `tests/canister_tests/` (адаптировать) | `copy-and-adapt` | architect | RED-тесты перенести, ожидать GREEN |

### Complior → Paxio

| Complior source | Paxio destination | Strategy | Owner | Comment |
|---|---|---|---|---|
| `engine/core/src/hooks/` + relevant `domain/` | `packages/sdk/src/hooks/` | `copy-and-own` | backend-dev | 14 SDK hooks — ядро @paxio/sdk |
| `engine/core/src/mcp/` | `packages/mcp-server/src/` | `copy-and-own` | backend-dev | MCP Server 8 tools → mcp.paxio.network |
| `engine/core/src/domain/passport/` + `types/passport*.ts` | `app/domain/passport/` + `app/types/passport.ts` | `copy-and-own` | architect + backend-dev | Agent Passport 36 полей + ed25519 = KYA Certificate |
| `engine/core/src/domain/audit/` + `infra/` (evidence chain) | `canisters/src/audit_log/` | **`port-to-rust`** | icp-dev | Evidence Chain TS→Rust, augment Bitgent audit_log |
| `engine/core/src/domain/fria/` | `app/domain/compliance/fria/` | `copy-and-own` | backend-dev | FRIA Generator 80% pre-fill |
| `engine/core/src/domain/scanner/` + `services/scan-service.ts` | `app/domain/scanner/` | `copy-and-own` | backend-dev | complior eval (550 tests) |
| `engine/core/src/domain/supply-chain/` | **NONE** | `skip` | — | OWASP Scorer, Secrets Scanner уже в Rust в bitgent/security/ |
| `engine/core/src/domain/reporter/` + `certification/` | `app/domain/compliance/` | `copy-and-own` | backend-dev | Reports + Security Badge |
| `engine/core/src/services/` (scan, fix, eval, chat, etc.) | `app/domain/*/` (распределить по поддоменам) | `copy-and-own` | backend-dev | Service layer → Paxio domain services |
| `engine/core/src/infra/` (event-bus, git-adapter, etc.) | `server/infrastructure/` + `app/lib/` | `copy-and-adapt` | backend-dev | Infrastructure в server/, утилиты в app/lib/ |
| `engine/core/src/http/` | **NONE** | `reference-only` | — | Paxio имеет свой server/ + app/api/ split |
| `engine/core/src/composition-root.ts`, `server.ts` | **NONE** | `reference-only` | — | Paxio имеет свой server/main.cjs + loader.cjs |
| `engine/core/src/types/` | `app/types/` (selectively) | `copy-and-own` | architect | common.types, framework.types, errors |
| `engine/core/data/regulations/` | `app/data/regulations/` | `copy-and-own` | architect + backend-dev | 108 obligations EU AI Act |
| `engine/core/data/eval/` | `app/data/eval/` | `copy-and-own` | architect | 550 adversarial test cases |
| `engine/core/data/scanner/` (semgrep-rules, patterns) | `app/data/scanner/` | `copy-and-own` | architect + backend-dev | Static analysis rules |
| `engine/core/data/templates/` | `app/data/templates/` | `copy-and-own` | architect | FRIA / Tech Doc templates |
| `cli/` (Rust CLI + TUI) | `cli/` (commands only) | `copy-and-adapt` | icp-dev | Берём commands (30+), TUI pages пропускаем |
| `guard/` (old Complior guard) | — | `skip` | — | Заменён Paxio Guard |
| `opensrc/` | `opensrc/` (merge) | `merge` | architect | |

### Guard → Paxio

| Guard source | Paxio destination | Strategy | Owner | Comment |
|---|---|---|---|---|
| `guard.paxio.network` (production endpoint) | Register `did:paxio:guard-agent` в Registry | `external-agent` | — | Live HTTP service |
| `docs/GUARD_API_SPECIFICATION.md` | `app/interfaces/guard-port.ts` | `port-to-ts` | architect | TS interface для клиента |
| `hosted/models/{request,response}.py` (Pydantic schemas) | `app/types/guard-api.ts` (Zod schemas) | `port-to-zod` | architect | Source of truth контракта |
| `hosted/routes/` (6 endpoints: analyze, chat, evaluate, fix, generate, health) | Документация в `app/interfaces/guard-port.ts` | `port-to-ts-interface` | architect | 6 методов интерфейса |
| All Python code | — | `external-only` | — | Python НЕ попадает в Paxio codebase |
| Paxio-side HTTP client (new) | `server/infrastructure/guard-client.cjs` | `new` | backend-dev | retry, timeout, circuit-breaker |
| Paxio-side domain wrapper (new) | `app/domain/guard/*.js` | `new` | backend-dev | когда звать, fallback при timeout |

---

## Coverage map — Paxio FA × источник

| FA | Что есть готовое | Что пишем с нуля | Estimate coverage |
|---|---|---|---|
| **FA-01 Registry** | Rust canister (bitgent): crawlers, search, reputation, storage, MCP, HTTP | Paxio TS side (`app/domain/registry/`, `app/api/registry/`), Semantic search via Qdrant, Dashboard | 🟢 **70%** |
| **FA-02 FAP** | Bitgent facilitator.rs (только как reference) | **Вся** TS реализация: x402 adapter, MPP adapter, router, protocol translation (в `app/domain/fap/`) | 🟡 **20%** (reference only) |
| **FA-03 Wallet** | Wallet canister (bitgent): key_manager, balance. SDK hooks (complior) | Finish threshold ECDSA BTC L1 signing, Wallet Adapter в @paxio/sdk, MCP Server, HTTP Proxy | 🟡 **45%** |
| **FA-04 Security Sidecar** | Security canister (bitgent): Intent Verifier, Secrets Scanner, OWASP Scorer, MITRE Modeler, Injection Guard, Rate Limiter, BTC Validator | Behavioral Anomaly Engine, AML/OFAC Oracle через ICP HTTPS Outcall, Multi-sig Gate, Dead Man's Switch | 🟢 **75%** |
| **FA-04 Guard Agent** | Guard ML service (external, Python/FastAPI/vLLM) — существует в `/home/openclaw/guard/` | Paxio-side HTTP client + Zod contract + domain wrapper | 🟡 **60%** (external, нужен production deploy) |
| **FA-05 Bitcoin Agent** | Нет | **Полностью новый**: DCA, Escrow, Streaming Payments, Reputation Stake, Treasury, Yield, Payroll, Price-Triggered, Inheritance | 🔴 **10%** |
| **FA-06 Compliance** | Complior engine (TS): scanner, fixer, FRIA, passport, evidence chain, regulation DB (108 obligations, 138 patterns) | Adapt под Paxio server/app split, register did:paxio:complior-agent, Audit Log canister (port evidence chain TS→Rust) | 🟢 **85%** |
| **FA-07 Intelligence** | Нет | **Полностью новый**: data pipeline (фоном с Phase 0), fraud models, market data, Oracle Network | 🔴 **0%** |

---

## Сводная оценка экономии

| Roadmap Phase | План | Без reuse | С reuse | Экономия |
|---|---|---|---|---|
| Фаза 0 (Недели 1-4) | DKI Canister, SDK alpha, Guard MVP, Registry 10K, Complior Agent | 4 нед | **~2 нед** | −50% |
| Фаза 1 (Недели 5-10) | Registry live, SDK v1, Security Sidecar, 4 BTC агентов, Complior Agent | 6 нед | **~3-4 нед** | −40% |
| Фаза 2 (Месяцы 3-5) | FAP full, Protocol Translation, Wallet Dashboard | 3 мес | **~2 мес** | −33% |

**Paxio MVP-to-launch: с ~10 недель до ~5-6 недель.** Критично для 6-12 мес window (Visa ICC / Mastercard VI / AAIF).

---

## Что НЕ берём

- `complior/guard/` — старый pre-paxio guard, заменён Paxio Guard external service
- `complior/engine/core/src/http/` + `server.ts` + `composition-root.ts` — у Paxio свой server/app split
- `complior/engine/core/src/domain/supply-chain/` + `scanner/` (OWASP/Secrets) — уже есть в Rust в bitgent/security/
- `bitgent/canisters/facilitator/` как canister — переписываем в TS (FAP не нужен on-chain)
- `bitgent/front/` — у Paxio свой design
- Complior `complior-prod/`, `complior-saas-front/` — я ошибся, таких директорий нет в реальности
