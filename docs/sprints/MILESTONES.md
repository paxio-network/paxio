# Paxio Milestones Master Plan

> Мастер-список ВСЕХ milestones с mapping на Roadmap × Feature Areas.
> Milestones организованы по фазам Roadmap. Каждый milestone — кусок Roadmap фазы, покрывающий конкретные FA.
> Reuse (PORT-bitgent / PORT-complior / REF-guard) — метод, а не цель.
>
> **Правило:** Milestone пишется ТОЛЬКО если он продвигает Roadmap Phase milestone. Если не покрывает — не пишется.

---

## Легенда

| Метка | Что значит |
|---|---|
| **[NEW]** | Пишем с нуля |
| **[PORT-bitgent]** | Копируем из `/home/nous/bitgent/` + адаптация |
| **[PORT-complior]** | Копируем из `/home/openclaw/complior/` + адаптация |
| **[REF-guard]** | Внешний сервис `guard.paxio.network`, только HTTP клиент + контракт |
| **[PORT-ts→rust]** | Портируем из TypeScript в Rust canister |
| Status | ⬜ НЕ НАЧАТО · 🧪 ТЕСТЫ НАПИСАНЫ · 🔨 В РАБОТЕ · ✅ ВЫПОЛНЕН |

---

## Phase 0 — Фундамент (Недели 1-4)

**Roadmap Phase 0 MILESTONE** (конец Недели 4):
> DKI canister подписывает настоящую BTC транзакцию. @paxio/sdk alpha опубликован на npm. Guard API отвечает на /v1/classify < 200ms. Registry содержит 10K+ агентов из ERC-8004 + A2A. Complior Agent зарегистрирован в Registry.

### Детализация Phase 0 milestones

| # | Milestone | FA | Roadmap item | Reuse | Agent(s) | Status |
|---|---|---|---|---|---|---|
| **M00** | Foundation: монорепо, git, types, interfaces, CI stub | — | «Монорепо setup» | [NEW] | architect + backend-dev | ✅ |
| **M01a** | **Turborepo + pnpm + uv migration** → product-first layout (apps/back/, products/*, packages/*), Guard submodule | — | (structural) | [NEW] | architect | ✅ |
| **M01** | Registry TS core MVP: DID gen, Agent Card validate, PostgreSQL storage, `/find` `/register` API | FA-01 | «Agent Card v2 JSON Schema», «Registry API v1» (keyword v0.1) | [PORT-bitgent→ts] registry logic + [NEW] Fastify layer | **registry-dev** | ⬜ |
| **M02** | Wallet canister + threshold ECDSA BTC signing | FA-03 | «DKI Canister (Rust)», «ckBTC интеграция» | [PORT-bitgent] wallet/ + [NEW] BTC L1 finalization | **icp-dev** | ⬜ |
| **M03** | **Security Sidecar canister MVP (Intent Verifier ONLY)** — убрали Secrets Scanner (он = TS, FA-04 §9) | FA-04 | — (preparatory for Phase 1) | [PORT-bitgent] security/intent-verifier → Rust | **icp-dev** | ⬜ |
| **M04** | Audit Log canister + Evidence Chain port TS→Rust | FA-06 | «Complior Engine → paxio-sdk интеграция» | [PORT-bitgent] + [PORT-ts→rust] complior evidence-chain | **icp-dev** | ⬜ |
| **M05** | `@paxio/sdk` alpha (TS SDK hooks + Wallet Adapter) | FA-03 | «@paxio/sdk alpha (TypeScript)» | [PORT-complior] hooks + [NEW] Wallet Adapter | **backend-dev** | ⬜ |
| **M05b** | **`paxio-sdk` alpha (Python SDK)** — LangChain callback handler + Wallet inject, published to PyPI | FA-03 | «Python SDK v1.0 MVP» (FA-03 §8) | [NEW] (inside monorepo: `products/03-wallet/sdk-python/`) | **backend-dev** | ⬜ |
| **M06** | Guard integration: Zod contract + HTTP client + mock | FA-04 | «Guard Service production deploy» (Paxio-side) | [REF-guard] (submodule) + [NEW] `products/04-security/guard-client/` | architect + **backend-dev** | ⬜ |
| **M07** | Registry Tier 1 crawlers (TS): Fetch.ai, ERC-8004, Virtuals, Olas | FA-01 | «TIER 1 — On-chain реестры» | [NEW] | **registry-dev** | ⬜ |
| **M08** | Registry Tier 2 crawlers (TS): Smithery, MCP Registry | FA-01 | «TIER 2 — MCP Экосистема» | [NEW] | **registry-dev** | ⬜ |
| **M09** | Registry semantic search (Qdrant + embedding adapter) | FA-01 | «Registry API v1» (semantic v0.5), «Vector DB setup» | [NEW] | **registry-dev** + backend-dev (qdrant infra client) | ⬜ |
| **M10** | Complior Agent setup: scanner + FRIA + passport | FA-06 | «Complior Engine → paxio-sdk», «did:paxio:complior-agent регистрация» | [PORT-complior] | **backend-dev** | ⬜ |
| **M11** | paxio.network Landing v1 | — | «Landing page v1 (Неделя 1-2)» | [NEW] | **frontend-dev** | ⬜ |
| **M12** | docs.paxio.network Developer Docs v1 | — | «Developer Docs (Неделя 2-3)» | [NEW] | **frontend-dev** | ⬜ |
| **M13** | app.paxio.network Registry Explorer v1 | — | «Registry Explorer v1 (Неделя 3-4)» | [NEW] | **frontend-dev** | ⬜ |
| **M14** | Names/org occupation: npm @paxio, PyPI, GitHub, jsr.io, Docker | — | «ЗАНЯТЬ ИМЕНА» | [NEW] | user (не agent task) | ⬜ |

> **FA-01:** сам Registry (agent metadata, search, crawlers, API) живёт в TS — `products/01-registry/app/` + PostgreSQL + Qdrant + Redis. На ICP выносится **только Reputation score** (immutable) в `products/01-registry/canister/`. Reputation canister запланирован на Phase 1 — см. **M31b**.
>
> **FA-03:** два SDK равноправно в v1.0 MVP — `@paxio/sdk` (TS, npm, **M05**) и `paxio-sdk` (Python, PyPI, **M05b**). FA-03 §6, §8. Оба в `products/03-wallet/`.
>
> **FA-04 M03 уточнение:** Security Sidecar canister = ONLY Intent Verifier (Rust). Secrets Scanner = **TS** (FA-04 §9) — переехал в M24 OWASP Scanner Agent как часть общего TS scanner agent.

**Verification на конец Phase 0:**
- [ ] `dfx canister call wallet derive_btc_address '()'` → returns `bc1q...` (real BTC testnet/mainnet)
- [ ] `dfx canister call wallet sign_transaction '(...)'` → broadcastable BTC tx
- [ ] `npm view @paxio/sdk` shows alpha version published
- [ ] `pip show paxio-sdk` → alpha version on PyPI (Python SDK)
- [ ] `curl https://guard.paxio.network/v1/classify -d '{"text":"..."}'` → < 200ms response
- [ ] `curl https://api.paxio.network/registry/count` → ≥ 10,000 agents (**Registry = TS REST API, не canister**)
- [ ] `curl https://api.paxio.network/registry/did:paxio:complior-agent` → valid Agent Card JSON

---

## Phase 1 — Первые агенты (Недели 5-10)

**Roadmap Phase 1 MILESTONE** (конец Недели 10):
> Registry: 100K+ агентов. Guard Agent: $0.0001/call работает. DCA + Escrow + Streaming агенты обрабатывают реальные транзакции. Complior Agent: первые платящие клиенты. Hero Demo записан и опубликован. DFINITY Grant Tier 1 ($5K) получен. MRR: $5K-15K.

### Детализация Phase 1 milestones

| # | Milestone | FA | Roadmap item | Reuse | Agent(s) | Status |
|---|---|---|---|---|---|---|
| **M15** | Registry Tier 3 crawlers: HuggingFace, ElizaOS, LangChain, Bittensor | FA-01 | «TIER 3 — Фреймворки» | [NEW] | **registry-dev** | ⬜ |
| **M16** | Registry Tier 4 web discovery crawler | FA-01 | «TIER 4 — Web Discovery» | [NEW] | **registry-dev** | ⬜ |
| **M17** | Semantic search production (embeddings + Qdrant + BM25) | FA-01 | «Semantic search production» | [NEW] | **registry-dev** | ⬜ |
| **M18** | paxio-native auto-registration from SDK | FA-01 + FA-03 | «paxio-native auto-registration» | [NEW] | **backend-dev** (SDK) + **registry-dev** (Registry API) | ⬜ |
| **M19** | `@paxio/sdk` v1.0 stable (TS) + `paxio-sdk` v1.0 stable (Python) | FA-03 | «@paxio/sdk v1.0 (npm)», «paxio-sdk v1.0 (PyPI)» | [PORT-complior] extend + [NEW] | **backend-dev** | ⬜ |
| **M20** | MCP Server (mcp.paxio.network) | FA-03 | «MCP Server (mcp.paxio.network)» | [PORT-complior] mcp | **backend-dev** | ⬜ |
| **M21** | HTTP Proxy (localhost:8402) | FA-03 | «HTTP Proxy (localhost:8402)» | [NEW] Rust binary | **icp-dev** (Rust binary; `products/03-wallet/http-proxy/`) | ⬜ |
| **M22** | **Security Sidecar v1 production (Behavioral Anomaly + AML/OFAC)** — TS anomaly + Rust state в `products/04-security/canister/` + AML TS orchestration + ICP HTTPS Outcall к OFAC | FA-04 | «Security Sidecar v1 (DKI)» | [PORT-bitgent] security canister + [NEW] AML Oracle + [PORT-complior] anomaly.ts TS wrapper | **backend-dev + icp-dev** | ⬜ |
| **M23** | Guard Agent Live production (external deploy) | FA-04 | «guard.paxio.network API live» | [REF-guard] submodule → deploy + register did:paxio:guard-agent | — (external **a3ka team**) | ⬜ |
| **M24** | **Security Scanner Agent (TS): OWASP Scorer + Secrets Scanner + MITRE Modeler** — все в TS (FA-04 §9: Scanner = Fastify+TS, не canister). Registers as did:paxio:scanner-agent | FA-04 | «OWASP Scanner агент» (+ Secrets + MITRE из M03/M60 agregated) | [PORT-bitgent→ts] security/{owasp,secrets,mitre} + [PORT-complior] scanner | **backend-dev** | ⬜ |
| **M25** | Behavioral Anomaly Engine v1 | FA-04 | «Behavioral Anomaly Engine v1» | [PORT-complior] anomaly.ts (TS algorithm) + [NEW] Rust state hooks | **backend-dev + icp-dev** | ⬜ |
| **M26** | AML/OFAC Oracle (ICP HTTPS Outcall + TS coordination) | FA-04 | «AML / OFAC Oracle» | [NEW] canister + [NEW] TS wrapper in `products/04-security/app/domain/` | **icp-dev + backend-dev** | ⬜ |
| **M27** | Forensics Trail canister full | FA-04 + FA-06 | «Forensics Trail (DKI canister)» | [PORT-complior→rust] extend M04 | **icp-dev** | ⬜ |
| **M28** | GitHub Action: security-check + compliance-check | FA-04 + FA-06 | «GitHub Action (paxio-network/security-check@v1)» | [PORT-complior] github-action | **backend-dev** | ⬜ |
| **M29** | Bitcoin DCA Agent v1 | FA-05 | «Bitcoin DCA Agent v1» | [NEW] | **icp-dev** | ⬜ |
| **M30** | Bitcoin Escrow Agent v1 | FA-05 | «Bitcoin Escrow Agent v1» | [NEW] | **icp-dev** | ⬜ |
| **M31** | Bitcoin Streaming Payments v1 | FA-05 | «Bitcoin Streaming Payments v1» | [NEW] | **icp-dev** | ⬜ |
| **M31b** | **Reputation Canister MVP (ICP)** — immutable score, `record_transaction`, `get_score`, StableBTreeMap, **no admin key** | FA-01 | «ICP Reputation Canister» (§10 v1.0 Launch) | [PORT-bitgent] reputation.rs + [NEW] Paxio integration | **registry-dev** | ⬜ |
| **M31c** | **Nonce Registry canister** — replay protection для FAP payments | FA-02 | «Replay attack protection» (FA-02 §7 v1.0 MVP) | [NEW] | **icp-dev** | ⬜ |
| **M32** | Reputation Stake v1 (depends on M31b) | FA-01 + FA-05 | «Reputation Stake v1» | [NEW] stake logic on top of M31b canister | **icp-dev + registry-dev** | ⬜ |
| **M33** | Complior Agent Live: EU AI Act scan + OWASP Cert + FRIA | FA-06 | «EU AI Act scan flow», «OWASP Certificate», «FRIA Generator live» | [PORT-complior] extend | **backend-dev** | ⬜ |
| **M33b** | **Certification Manager canister** — on-chain compliance certificates + QR verification (FA-06 §5) | FA-06 | «On-chain certificates» (FA-06 §5 ICP CANISTER) | [NEW] | **icp-dev** | ⬜ |
| **M34** | Flagship Report «State of AI Compliance 2026» | FA-06 | «Flagship Report» | [NEW] (публикация отчёта) | user | ⬜ |
| **M35** | Hero Demo (BTC DCA agent видео) | — | «Hero Demo» | [NEW] | **frontend-dev** + user | ⬜ |
| **M36** | paxio.network Landing v2 | — | «Landing page v2» | [NEW] | **frontend-dev** | ⬜ |
| **M37** | app.paxio.network Agent Dashboard | — | «Agent Dashboard (app.paxio.network)» | [NEW] | **frontend-dev** | ⬜ |
| **M38** | Registry Explorer v2 | — | «Registry Explorer v2» | [NEW] | **frontend-dev** | ⬜ |
| **M39** | DFINITY Grant Tier 1 application ($5K) | — | «DFINITY Grant Tier 1 ($5K)» | [NEW] | user | ⬜ |

**Verification на конец Phase 1:**
- [ ] Registry: `count ≥ 100,000 agents`
- [ ] Guard: `$0.0001/call` работает, pay-as-you-go flow
- [ ] ≥3 Bitcoin agents (DCA, Escrow, Streaming) обрабатывают testnet транзакции
- [ ] Complior Agent имеет ≥5 платящих клиентов (scan transactions логируются в audit_log)
- [ ] Hero Demo опубликован
- [ ] DFINITY Grant Tier 1 получен
- [ ] Accounting MRR $5K-15K (внешний метрик)

---

## Phase 2 — Платёжная экосистема (Месяцы 3-5)

**Roadmap Phase 2 MILESTONE**:
> FAP Router обрабатывает x402 + MPP + BTC платежи. Protocol Translation MPP↔x402 работает. On-chain DeFi агенты могут платить off-chain агентам. 5 Bitcoin агентов активны. MRR: $30K+.

### Phase 2 milestones (outline, детали позже)

| # | Milestone | FA | Roadmap item | Reuse | Agent(s) |
|---|---|---|---|---|---|
| **M40** | FAP Protocol v1 spec + TS router | FA-02 | «FAP Protocol v1» | [REF-bitgent/facilitator.rs] + [NEW] TS | **backend-dev** |
| **M41** | x402 Adapter (Coinbase + Cloudflare + PayAI) | FA-02 | «x402 Adapter» | [PORT-bitgent] x402.rs → TS + [NEW] | **backend-dev** + **icp-dev** (EVM Verifier canister в `products/02-facilitator/canisters/evm-verifier/`) |
| **M42** | Stripe MPP Adapter | FA-02 | «Stripe MPP Adapter» | [NEW] | **backend-dev** |
| **M43** | ckUSDC / ckETH Adapter + Capital Float | FA-02 | «ckUSDC / ckETH Adapter» | [NEW] | **backend-dev + icp-dev** |
| **M44** | On-chain агенты integration (DeFi, keepers) | FA-02 | «On-chain агенты — первый приоритет» | [NEW] | **backend-dev + icp-dev** |
| **M45** | Protocol Translation MPP↔x402 | FA-02 | «MPP ↔ x402 Translation» | [NEW] | **backend-dev** |
| **M46** | **Visa TAP Adapter + SD-JWT Verifier canister** (FA-02 §3: «SD-JWT верификация в ICP canister») | FA-02 | «Visa TAP Adapter» | [NEW] TS adapter + [NEW] Rust canister `products/02-facilitator/canisters/sdjwt-verifier/` | **backend-dev + icp-dev** |
| **M47** | **Mastercard VI (DKI реализация) — reuses SD-JWT verifier** from M46 + adds MC-specific wrapping | FA-02 | «Mastercard VI (DKI реализация)» | [NEW] (builds on M46 sdjwt-verifier) | **backend-dev + icp-dev** |
| **M48** | Bitcoin L1 Adapter в FAP | FA-02 + FA-05 | «Bitcoin L1 Adapter в FAP» | [PORT-bitgent] bitcoin.rs + [NEW] | **icp-dev + backend-dev** |
| **M49** | MoonPay OWS Adapter | FA-02 | «MoonPay OWS Adapter» | [NEW] | **backend-dev** |
| **M50** | FAP Dashboard | — | «FAP Dashboard» | [NEW] | **frontend-dev** |
| **M51** | Security Sidecar v2 (Full Trust Layer) | FA-04 | «Security Sidecar v2 (full)» | extend M22 | **icp-dev + backend-dev** |
| **M52** | Wallet Dashboard | — | «Wallet Dashboard» | [NEW] | **frontend-dev** |
| **M53** | Solana adapter (Wallet v1.1) | FA-03 | «Solana adapter (v1.1)» | [NEW] | **icp-dev** (extend `products/03-wallet/canister/`) |
| **M54** | Dead Man's Switch | FA-03 + FA-04 | «Dead Man's Switch» | [NEW] | **icp-dev** |
| **M55** | AML Screening upgrade | FA-04 | «AML Screening upgrade» | extend M26 | **icp-dev + backend-dev** |
| **M56** | Bitcoin Treasury Agent v1 | FA-05 | «Bitcoin Treasury Agent v1» | [NEW] | **icp-dev** |
| **M57** | Bitcoin Yield Agent v1 | FA-05 | «Bitcoin Yield Agent v1» | [NEW] | **icp-dev** |
| **M58** | Agent Payroll v1 | FA-05 | «Agent Payroll v1» | [NEW] | **icp-dev** |
| **M59** | **Price Oracle canister (multi-source consensus via ICP HTTPS Outcall: Binance+Coinbase+Kraken median)** | FA-05 + FA-07 preview | «Price Oracle (multi-source)» (FA-05 §4) | [NEW] Rust canister (NOT TS — HTTPS Outcalls are canister feature) | **icp-dev** |
| **M60** | **MITRE ATLAS Modeler (TS)** — merged into M24 Scanner Agent. Standalone если нужно — extend Scanner | FA-04 | «MITRE ATLAS Modeler» | [PORT-bitgent→ts] mitre_modeler.rs + [PORT-complior] scanner extension | **backend-dev** (merged into M24 Scanner Agent) |
| **M61** | Multi-sig Gate | FA-04 | «Multi-sig Gate» | [NEW] | **icp-dev** (extend `products/04-security/canister/`) |
| **M62** | Complior Regulation Feed integration | FA-06 | «Complior Regulation Feed интеграция» | [PORT-complior] regulation-db | **backend-dev** |
| **M63** | complior eval production (550 tests) | FA-04 + FA-06 | «complior eval — 550 тестов» | [PORT-complior] eval | **backend-dev** |
| **M64** | Semgrep + Bandit + ModelScan integration | FA-04 | «Semgrep + Bandit + ModelScan» | [PORT-complior] | **backend-dev** |
| **M65** | Security Dashboard | — | «Security Dashboard» | [NEW] | **frontend-dev** |

---

## Phase 3 — Партнёрства и Стандарт (Месяцы 5-8)

**Roadmap Phase 3 MILESTONE**:
> AAIF Silver активен. Universal Registry Protocol предложен как AAIF project. LangChain + CrewAI официально интегрированы. Visa ICC sandbox заявка подана. Все 9 Bitcoin агентов активны. 1M+ агентов в Registry. MRR: $60K+.

### Phase 3 milestones (outline)

| # | Milestone | FA | Roadmap item | Agent |
|---|---|---|---|---|
| **M66** | AAIF Silver Membership + Registry Protocol proposal | — | «AAIF Silver Membership», «Universal Registry Protocol → AAIF proposal» | user |
| **M67** | LangChain official integration | FA-01 + FA-03 | «LangChain официальная интеграция» | backend-dev + registry-dev |
| **M68** | CrewAI official integration | FA-01 + FA-03 | «CrewAI официальная интеграция» | backend-dev + registry-dev |
| **M69** | ERC-8183 crawler (new standard) | FA-01 | «ERC-8183 краулер» | registry-dev |
| **M70** | Continuous crawl optimization | FA-01 | «Continuous crawl optimization» | registry-dev |
| **M71** | 500K+ agents milestone | FA-01 | «500K+ агентов milestone» | registry-dev |
| **M72** | Visa ICC sandbox application | FA-02 | «Visa ICC sandbox заявка» | backend-dev + user |
| **M73** | Mastercard Digital Labs pitch | FA-02 | «Mastercard Digital Labs pitch» | user |
| **M74** | x402 Bitcoin L1 extension draft | FA-02 | «x402 Bitcoin L1 extension draft» | backend-dev + icp-dev |
| **M75** | DFINITY Grant Tier 2 ($25K) | — | «DFINITY Grant Tier 2 ($25K)» | user |
| **M76** | SOC 2 Evidence Pack | FA-06 | «SOC 2 Evidence Pack» | backend-dev |
| **M77** | **KYA Certificate productisation** (TS API + on-chain attestation via M33b Certification Manager) | FA-06 + FA-01 | «KYA Certificate» | backend-dev + registry-dev (uses reputation + certification canisters) |
| **M78** | Auditor Portal (read-only) | FA-06 | «Auditor Portal (read-only)» | frontend-dev |
| **M79** | Compliance drift monitoring | FA-06 | «Compliance drift monitoring» | backend-dev |
| **M80** | **Price-Triggered Actions** (uses M59 Price Oracle canister) | FA-05 | «Price-Triggered Actions» | **icp-dev** |
| **M81** | **Trustless Inheritance** (Rust canister: time-lock + Internet Identity check-in) | FA-05 | «Trustless Inheritance» | **icp-dev** |
| **M82** | **Treasury auto-rebalancing** (extend M56 Treasury canister) | FA-05 | «Treasury auto-rebalancing» | **icp-dev** |
| **M83** | **Cross-border Settlement Agent** (Rust canister, FA-05) | FA-05 | «cross-border Settlement Agent» | **icp-dev** |
| **M84** | Compliance Dashboard | — | «Compliance Dashboard» | frontend-dev |
| **M85** | Bitcoin Agent Dashboard | — | «Bitcoin Agent Dashboard» | frontend-dev |
| **M86** | Public Leaderboard | FA-01 | «Public Leaderboard» | registry-dev |
| **M87** | Press Kit page | — | «Press Kit страница» | frontend-dev |

---

## Phase 4 — Enterprise и Scale (Месяцы 8-13)

**Roadmap Phase 4 MILESTONE**:
> EU AI Act compliance certification работает. Fleet Intelligence beta у 10+ enterprise клиентов. AAIF стандарт официально принят. 1M+ paxio-native агентов. Bitcoin Agent AUM > $1M. MRR: $120K+.

### Phase 4 milestones (outline)

| # | Milestone | FA | Agent |
|---|---|---|---|
| **M88** | EU AI Act первая certification | FA-06 | backend-dev + user |
| **M89** | ISO 42001 coverage расширение | FA-06 | backend-dev |
| **M90** | AML SAR Generation | FA-06 | backend-dev |
| **M91** | GDPR DPIA templates | FA-06 | backend-dev |
| **M92** | Audit Package (ZIP export) | FA-06 | backend-dev |
| **M93** | Vendor Communication (Art.25) | FA-06 | backend-dev |
| **M94** | EU Database Helper (Art.49) | FA-06 | backend-dev |
| **M95** | Multi-jurisdiction: Colorado, Texas, UK | FA-06 | backend-dev |
| **M96** | Enterprise Fleet Security | FA-04 | backend-dev + icp-dev |
| **M97** | Incident Response toolkit | FA-04 | backend-dev |
| **M98** | Custom fine-tuning Guard (Enterprise) | FA-04 | external (a3ka) + architect (contract update) |
| **M99** | FAP Middleware Guard | FA-02 + FA-04 | backend-dev |
| **M100** | Complior Kill Switch | FA-04 | icp-dev (canister feature) |
| **M101** | Enterprise Wallet Pro | FA-03 | backend-dev + icp-dev |
| **M102** | 2FA выше порога | FA-03 | icp-dev |
| **M103** | Wallet Insurance Pool | FA-03 | icp-dev |
| **M104** | Multi-currency Treasury | FA-03 + FA-05 | icp-dev |
| **M105** | AAIF стандарт принят | — | user |
| **M106** | 1M+ paxio-native агентов | FA-01 | registry-dev |
| **M107** | Registry v2 — advanced features | FA-01 | registry-dev |
| **M108** | SaaS Dashboard Enterprise | — | frontend-dev |
| **M109** | Enterprise Portal (frontend) | — | frontend-dev |
| **M110** | Intelligence Dashboard preview | FA-07 | frontend-dev + backend-dev |
| **M111** | Mobile App (iOS + Android) | — | frontend-dev (or external contractor) |

---

## Phase 5 — Intelligence и Data Moat (Месяцы 13-18+)

**Roadmap Phase 5 MILESTONE**:
> Intelligence API: $100K+ MRR от Intelligence. Oracle Network live на DKI + Base + Ethereum. 10M+ транзакций в data warehouse. Predictive models F1 > 70%. PAXIO token Oracle staking v1. Total MRR: $200K+. Acquisition conversations начались.

### Phase 5 milestones (outline)

| # | Milestone | FA | Agent |
|---|---|---|---|
| **M112** | Data Pipeline production (был фоном с Phase 0) | FA-07 | backend-dev (TS pipeline) |
| **M113** | Fraud Intelligence API public | FA-07 | backend-dev (TS API) + **ml team** (Python LightGBM model in `products/07-intelligence/ml/`) |
| **M114** | Market Data Terminal | FA-07 | backend-dev + frontend-dev |
| **M115** | Developer Analytics Dashboard ($29/мес) | FA-07 | frontend-dev + backend-dev |
| **M116** | Paxio Radar (public free) | FA-07 | backend-dev + frontend-dev |
| **M117** | Agent-to-Agent Intelligence | FA-07 | backend-dev |
| **M118** | Research Report #1 | FA-07 | user + backend-dev (data export) |
| **M119** | Network Graph Intelligence | FA-07 | backend-dev (Memgraph integration) |
| **M120** | Enterprise Fleet Intelligence ($999/мес) | FA-07 | backend-dev + frontend-dev |
| **M121** | Risk Analytics | FA-07 | backend-dev + ml team |
| **M122** | Intelligence Pro ($299/мес) | FA-07 | backend-dev + frontend-dev |
| **M123** | Data Licensing (Embed, $499 + rev share) | FA-07 | backend-dev + user |
| **M124** | Custom Research ($2K-15K) | FA-07 | user |
| **M125** | **Oracle Network v1 (ICP-native)** — Rust canister in `products/07-intelligence/canister/`, inter-canister calls from other Paxio canisters | FA-07 | **icp-dev** |
| **M126** | **Oracle Network EVM (Chain Fusion)** — Rust canister pushes data to Base/ETH via Chain Fusion threshold ECDSA writes + Solidity oracle contract | FA-07 | **icp-dev** + backend-dev (aggregation feeder) |
| **M127** | Predictive Intelligence | FA-07 | **ml team** (Prophet + LSTM, Python in `products/07-intelligence/ml/`) |
| **M128** | Oracle Operator Program (Phase 2, PAXIO staking) | FA-07 | icp-dev + backend-dev |
| **M129** | Paxio Radar (public UI) | — | frontend-dev |
| **M130** | Intelligence Terminal (UI) | — | frontend-dev |
| **M131** | Oracle Explorer (UI) | — | frontend-dev |
| **M132** | Acquisition conversations | — | user |

---

## Сводная статистика

| Phase | Milestones | Status | Agents involved |
|---|---|---|---|
| Phase 0 | M00-M14 + **M01a** + **M05b** (17) | M00 ✅ · M01a ✅ · остальные ⬜ | architect, registry-dev, icp-dev, backend-dev, frontend-dev, user |
| Phase 1 | M15-M39 + **M31b** + **M31c** + **M33b** (28) | all ⬜ | All + external (a3ka for Guard, ml team for Intelligence) |
| Phase 2 | M40-M65 (26) | all ⬜ | All |
| Phase 3 | M66-M87 (22) | all ⬜ | All |
| Phase 4 | M88-M111 (24) | all ⬜ | All |
| Phase 5 | M112-M132 (21) | all ⬜ | All (incl. external ml team для FA-07 ML) |
| **Total** | **138 milestones** | 2 done · 136 pending | |

### Добавленные milestones vs предыдущей версии (133):

- **M01a** — Turborepo + pnpm + uv migration (product-first monorepo) — ✅ DONE
- **M05b** — `paxio-sdk` alpha (Python SDK) — FA-03 §8 MVP требование
- **M31c** — Nonce Registry canister — FA-02 §7 v1.0 MVP (replay protection)
- **M33b** — Certification Manager canister — FA-06 §5 (on-chain certificates)

### Зафиксированные scope corrections (vs предыдущей версии):

| # | Что исправлено |
|---|---|
| **M03** | Убрали Secrets Scanner из Rust canister (он = TS, FA-04 §9) — перенесён в M24 |
| **M19** | TS SDK v1.0 + **Python SDK v1.0** (не только npm) |
| **M21** | owner changed `backend-dev` → **`icp-dev`** (Rust binary) |
| **M22** | owner changed `icp-dev` → **`backend-dev + icp-dev`** (TS + Rust state mix) |
| **M24** | Объединён: OWASP + Secrets + MITRE в один Scanner Agent (TS), FA-04 §9 |
| **M26** | owner changed `icp-dev` → **`icp-dev + backend-dev`** (canister + TS orchestration) |
| **M41** | Добавлен **icp-dev** owner (EVM Verifier canister) |
| **M46** | Owner `backend-dev` → **`backend-dev + icp-dev`** (SD-JWT verifier canister) |
| **M47** | Уточнено: reuses SD-JWT canister from M46 |
| **M59** | owner changed `backend-dev` → **`icp-dev`** (HTTPS Outcall = canister feature) |
| **M60** | Merged into M24 Scanner Agent (TS, не Rust canister) |
| **M80-M83** | Добавлены owner'ы **`icp-dev`** (все Bitcoin Agents) |
| **M113, M127** | Добавлен **ml team** (Python Intelligence ML) |
| **M125, M126** | Добавлен **icp-dev** (Oracle Network canister) |

---

## Правила

1. **Milestone = кусок Roadmap × FA.** Не пишем "потому что есть код", пишем "потому что Roadmap требует и FA описывает".
2. **Paths for each FA** — см. `docs/fa-registry.md` (★ source of truth). Milestone таблица даёт Что/Кто, fa-registry даёт Где.
3. **Reuse = метод.** `[PORT-*]` метки показывают источник, но milestone — про delivery FA requirement.
4. **Детальные `M0X-*.md` файлы** пишутся ДО Phase 0 старта. Phase 1+ детализируются по мере приближения.
5. **Parallel execution Phase 0:** M00 ✅ + M01a ✅ блокируют остальные. M01 (Registry TS) + M02 (Wallet canister) + M03 (Sidecar) + M04 (Audit Log) могут идти параллельно. M05 (TS SDK) + M05b (Python SDK) + M10 (Complior) — параллельно. M11-M13 (frontend) — параллельно.
6. **Critical path Phase 0:** M00 → M01a → {M01 + M02 + M03 + M04 + M05 + M05b + M06 + M10} → all green → Phase 0 verified.

---

## Next Steps

1. **User review** этого мастер-плана. Одобряет structure / changes / priorities.
2. **Architect пишет детальные M01-M14** (Phase 0) — файлы `docs/sprints/M01-registry-ts-core.md`, `M02-wallet-canister.md`, etc.
3. **Architect пишет RED-тесты** для каждого M0X (только после одобрения milestone).
4. **Dev-агенты реализуют** по тестам.
5. **После Phase 0 complete** — детализация Phase 1 (M15-M39).

---

## Cross-references

- **FA architecture docs:** `docs/feature-areas/FA-0X-*.md`
- **FA → paths mapping:** `docs/fa-registry.md` ★
- **Strategy (what):** `docs/NOUS_Strategy_v5.md`
- **Roadmap (order):** `docs/NOUS_Development_Roadmap.md`
- **Current state:** `docs/project-state.md`
- **Tech debt:** `docs/tech-debt.md`
