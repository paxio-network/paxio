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
| **M01** | Registry canister MVP: DID, capability, storage, HTTP | FA-01 | «Agent Card v2 JSON Schema», «Registry API v1» | [PORT-bitgent] canisters/registry/ | registry-dev | ⬜ |
| **M02** | Wallet canister + threshold ECDSA BTC signing | FA-03 | «DKI Canister (Rust)», «ckBTC интеграция» | [PORT-bitgent] canisters/wallet/ + [NEW] BTC L1 finalization | icp-dev | ⬜ |
| **M03** | Security Sidecar canister MVP (Intent Verifier + Secrets Scanner) | FA-04 | — (preparatory for Phase 1) | [PORT-bitgent] canisters/security/ | icp-dev | ⬜ |
| **M04** | Audit Log canister + Evidence Chain port TS→Rust | FA-06 | «P6 Compliance: Complior Engine → paxio-sdk интеграция» | [PORT-bitgent] + [PORT-ts→rust] complior evidence-chain | icp-dev | ⬜ |
| **M05** | @paxio/sdk alpha (SDK hooks + Wallet Adapter) | FA-03 | «@paxio/sdk alpha (TypeScript)» | [PORT-complior] hooks + [NEW] Wallet Adapter | backend-dev | ⬜ |
| **M06** | Guard integration: Zod contract + HTTP client + mock | FA-04 | «Guard Service production deploy» (Paxio-side) | [REF-guard] + [NEW] client | architect + backend-dev | ⬜ |
| **M07** | Registry Tier 1 crawlers: Fetch.ai, ERC-8004, Virtuals, Olas | FA-01 | «TIER 1 — On-chain реестры» | [NEW] | backend-dev | ⬜ |
| **M08** | Registry Tier 2 crawlers: Smithery, MCP Registry | FA-01 | «TIER 2 — MCP Экосистема» | [NEW] | backend-dev | ⬜ |
| **M09** | Registry API v1 + Qdrant vector DB setup | FA-01 | «Registry API v1», «Vector DB setup» | [PORT-bitgent] registry + [NEW] Qdrant integration | backend-dev | ⬜ |
| **M10** | Complior Agent setup: scanner + FRIA + passport | FA-06 | «Complior Engine → paxio-sdk», «did:paxio:complior-agent регистрация» | [PORT-complior] | backend-dev | ⬜ |
| **M11** | paxio.network Landing v1 | — | «Landing page v1 (Неделя 1-2)» | [NEW] | frontend-dev | ⬜ |
| **M12** | docs.paxio.network Developer Docs v1 | — | «Developer Docs (Неделя 2-3)» | [NEW] | frontend-dev | ⬜ |
| **M13** | app.paxio.network Registry Explorer v1 | — | «Registry Explorer v1 (Неделя 3-4)» | [NEW] | frontend-dev | ⬜ |
| **M14** | Names/org occupation: npm @paxio, PyPI, GitHub, jsr.io, Docker | — | «ЗАНЯТЬ ИМЕНА» | [NEW] | user (не agent task) | ⬜ |

**Verification на конец Phase 0:**
- [ ] `dfx canister call wallet derive_btc_address '()'` → returns `bc1q...` (real BTC testnet/mainnet)
- [ ] `dfx canister call wallet sign_transaction '(...)'` → broadcastable BTC tx
- [ ] `npm view @paxio/sdk` shows alpha version published
- [ ] `curl https://guard.paxio.network/v1/classify -d '{"text":"..."}'` → < 200ms response
- [ ] `curl https://api.paxio.network/registry/count` → ≥ 10,000 agents
- [ ] `dfx canister call registry resolve '("did:paxio:complior-agent")'` → valid profile

---

## Phase 1 — Первые агенты (Недели 5-10)

**Roadmap Phase 1 MILESTONE** (конец Недели 10):
> Registry: 100K+ агентов. Guard Agent: $0.0001/call работает. DCA + Escrow + Streaming агенты обрабатывают реальные транзакции. Complior Agent: первые платящие клиенты. Hero Demo записан и опубликован. DFINITY Grant Tier 1 ($5K) получен. MRR: $5K-15K.

### Детализация Phase 1 milestones

| # | Milestone | FA | Roadmap item | Reuse | Agent(s) | Status |
|---|---|---|---|---|---|---|
| **M15** | Registry Tier 3 crawlers: HuggingFace, ElizaOS, LangChain, Bittensor | FA-01 | «TIER 3 — Фреймворки» | [NEW] | backend-dev | ⬜ |
| **M16** | Registry Tier 4 web discovery crawler | FA-01 | «TIER 4 — Web Discovery» | [NEW] | backend-dev | ⬜ |
| **M17** | Semantic search production (embeddings + Qdrant + BM25) | FA-01 | «Semantic search production» | [NEW] | backend-dev | ⬜ |
| **M18** | paxio-native auto-registration from SDK | FA-01 + FA-03 | «paxio-native auto-registration» | [NEW] | backend-dev | ⬜ |
| **M19** | @paxio/sdk v1.0 stable release | FA-03 | «@paxio/sdk v1.0 (npm)» | [PORT-complior] extend + [NEW] | backend-dev | ⬜ |
| **M20** | MCP Server (mcp.paxio.network) | FA-03 | «MCP Server (mcp.paxio.network)» | [PORT-complior] mcp | backend-dev | ⬜ |
| **M21** | HTTP Proxy (localhost:8402) | FA-03 | «HTTP Proxy (localhost:8402)» | [NEW] | backend-dev | ⬜ |
| **M22** | Security Sidecar v1 production (Behavioral Anomaly + AML/OFAC) | FA-04 | «Security Sidecar v1 (DKI)» | [PORT-bitgent] + [NEW] AML Oracle | icp-dev | ⬜ |
| **M23** | Guard Agent Live production (external) | FA-04 | «guard.paxio.network API live» | [REF-guard] deploy + register | — (внешний) | ⬜ |
| **M24** | OWASP Scanner Agent registration | FA-04 | «OWASP Scanner агент» | [PORT-bitgent] security | backend-dev | ⬜ |
| **M25** | Behavioral Anomaly Engine v1 | FA-04 | «Behavioral Anomaly Engine v1» | [PORT-complior] anomaly.ts → Rust + Paxio glue | backend-dev + icp-dev | ⬜ |
| **M26** | AML/OFAC Oracle (ICP HTTPS Outcall) | FA-04 | «AML / OFAC Oracle» | [NEW] | icp-dev | ⬜ |
| **M27** | Forensics Trail canister full | FA-04 + FA-06 | «Forensics Trail (DKI canister)» | [PORT-complior→rust] extend M04 | icp-dev | ⬜ |
| **M28** | GitHub Action: security-check + compliance-check | FA-04 + FA-06 | «GitHub Action (paxio-network/security-check@v1)» | [PORT-complior] github-action | backend-dev | ⬜ |
| **M29** | Bitcoin DCA Agent v1 | FA-05 | «Bitcoin DCA Agent v1» | [NEW] | icp-dev | ⬜ |
| **M30** | Bitcoin Escrow Agent v1 | FA-05 | «Bitcoin Escrow Agent v1» | [NEW] | icp-dev | ⬜ |
| **M31** | Bitcoin Streaming Payments v1 | FA-05 | «Bitcoin Streaming Payments v1» | [NEW] | icp-dev | ⬜ |
| **M32** | Reputation Stake v1 | FA-01 + FA-05 | «Reputation Stake v1» | [NEW] + [PORT-bitgent] reputation.rs | icp-dev | ⬜ |
| **M33** | Complior Agent Live: EU AI Act scan + OWASP Cert + FRIA | FA-06 | «EU AI Act scan flow», «OWASP Certificate», «FRIA Generator live» | [PORT-complior] extend | backend-dev | ⬜ |
| **M34** | Flagship Report «State of AI Compliance 2026» | FA-06 | «Flagship Report» | [NEW] (публикация отчёта) | user | ⬜ |
| **M35** | Hero Demo (BTC DCA agent видео) | — | «Hero Demo» | [NEW] | frontend-dev + user | ⬜ |
| **M36** | paxio.network Landing v2 | — | «Landing page v2» | [NEW] | frontend-dev | ⬜ |
| **M37** | app.paxio.network Agent Dashboard | — | «Agent Dashboard (app.paxio.network)» | [NEW] | frontend-dev | ⬜ |
| **M38** | Registry Explorer v2 | — | «Registry Explorer v2» | [NEW] | frontend-dev | ⬜ |
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
| **M40** | FAP Protocol v1 spec + TS router | FA-02 | «FAP Protocol v1» | [REF-bitgent/facilitator.rs] + [NEW] TS | backend-dev |
| **M41** | x402 Adapter (Coinbase + Cloudflare + PayAI) | FA-02 | «x402 Adapter» | [PORT-bitgent] x402.rs → TS + [NEW] | backend-dev |
| **M42** | Stripe MPP Adapter | FA-02 | «Stripe MPP Adapter» | [NEW] | backend-dev |
| **M43** | ckUSDC / ckETH Adapter + Capital Float | FA-02 | «ckUSDC / ckETH Adapter» | [NEW] | backend-dev + icp-dev |
| **M44** | On-chain агенты integration (DeFi, keepers) | FA-02 | «On-chain агенты — первый приоритет» | [NEW] | backend-dev + icp-dev |
| **M45** | Protocol Translation MPP↔x402 | FA-02 | «MPP ↔ x402 Translation» | [NEW] | backend-dev |
| **M46** | Visa TAP Adapter | FA-02 | «Visa TAP Adapter» | [NEW] | backend-dev |
| **M47** | Mastercard VI (DKI реализация) | FA-02 | «Mastercard VI (DKI реализация)» | [NEW] | backend-dev + icp-dev |
| **M48** | Bitcoin L1 Adapter в FAP | FA-02 + FA-05 | «Bitcoin L1 Adapter в FAP» | [PORT-bitgent] bitcoin.rs + [NEW] | icp-dev + backend-dev |
| **M49** | MoonPay OWS Adapter | FA-02 | «MoonPay OWS Adapter» | [NEW] | backend-dev |
| **M50** | FAP Dashboard | — | «FAP Dashboard» | [NEW] | frontend-dev |
| **M51** | Security Sidecar v2 (Full Trust Layer) | FA-04 | «Security Sidecar v2 (full)» | extend M22 | icp-dev |
| **M52** | Wallet Dashboard | — | «Wallet Dashboard» | [NEW] | frontend-dev |
| **M53** | Solana adapter (Wallet v1.1) | FA-03 | «Solana adapter (v1.1)» | [NEW] | icp-dev |
| **M54** | Dead Man's Switch | FA-03 + FA-04 | «Dead Man's Switch» | [NEW] | icp-dev |
| **M55** | AML Screening upgrade | FA-04 | «AML Screening upgrade» | extend M26 | icp-dev |
| **M56** | Bitcoin Treasury Agent v1 | FA-05 | «Bitcoin Treasury Agent v1» | [NEW] | icp-dev |
| **M57** | Bitcoin Yield Agent v1 | FA-05 | «Bitcoin Yield Agent v1» | [NEW] | icp-dev |
| **M58** | Agent Payroll v1 | FA-05 | «Agent Payroll v1» | [NEW] | icp-dev |
| **M59** | Price Oracle (multi-source) | FA-07 preview | «Price Oracle (multi-source)» | [NEW] | backend-dev |
| **M60** | MITRE ATLAS Modeler ($5/model) | FA-04 | «MITRE ATLAS Modeler» | [PORT-bitgent] mitre_modeler.rs (уже есть!) | icp-dev |
| **M61** | Multi-sig Gate | FA-04 | «Multi-sig Gate» | [NEW] | icp-dev |
| **M62** | Complior Regulation Feed integration | FA-06 | «Complior Regulation Feed интеграция» | [PORT-complior] regulation-db | backend-dev |
| **M63** | complior eval production (550 tests) | FA-04 + FA-06 | «complior eval — 550 тестов» | [PORT-complior] eval | backend-dev |
| **M64** | Semgrep + Bandit + ModelScan integration | FA-04 | «Semgrep + Bandit + ModelScan» | [PORT-complior] | backend-dev |
| **M65** | Security Dashboard | — | «Security Dashboard» | [NEW] | frontend-dev |

---

## Phase 3 — Партнёрства и Стандарт (Месяцы 5-8)

**Roadmap Phase 3 MILESTONE**:
> AAIF Silver активен. Universal Registry Protocol предложен как AAIF project. LangChain + CrewAI официально интегрированы. Visa ICC sandbox заявка подана. Все 9 Bitcoin агентов активны. 1M+ агентов в Registry. MRR: $60K+.

### Phase 3 milestones (outline)

| # | Milestone | FA | Roadmap item |
|---|---|---|---|
| **M66** | AAIF Silver Membership + Registry Protocol proposal | — | «AAIF Silver Membership», «Universal Registry Protocol → AAIF proposal» |
| **M67** | LangChain official integration | FA-01 + FA-03 | «LangChain официальная интеграция» |
| **M68** | CrewAI official integration | FA-01 + FA-03 | «CrewAI официальная интеграция» |
| **M69** | ERC-8183 crawler (new standard) | FA-01 | «ERC-8183 краулер» |
| **M70** | Continuous crawl optimization | FA-01 | «Continuous crawl optimization» |
| **M71** | 500K+ agents milestone | FA-01 | «500K+ агентов milestone» |
| **M72** | Visa ICC sandbox application | FA-02 | «Visa ICC sandbox заявка» |
| **M73** | Mastercard Digital Labs pitch | FA-02 | «Mastercard Digital Labs pitch» |
| **M74** | x402 Bitcoin L1 extension draft | FA-02 | «x402 Bitcoin L1 extension draft» |
| **M75** | DFINITY Grant Tier 2 ($25K) | — | «DFINITY Grant Tier 2 ($25K)» |
| **M76** | SOC 2 Evidence Pack | FA-06 | «SOC 2 Evidence Pack» |
| **M77** | KYA Certificate productisation | FA-06 | «KYA Certificate» |
| **M78** | Auditor Portal (read-only) | FA-06 | «Auditor Portal (read-only)» |
| **M79** | Compliance drift monitoring | FA-06 | «Compliance drift monitoring» |
| **M80** | Price-Triggered Actions | FA-05 | «Price-Triggered Actions» |
| **M81** | Trustless Inheritance | FA-05 | «Trustless Inheritance» |
| **M82** | Treasury auto-rebalancing | FA-05 | «Treasury auto-rebalancing» |
| **M83** | Cross-border Settlement Agent | FA-05 | «cross-border Settlement Agent» |
| **M84** | Compliance Dashboard | — | «Compliance Dashboard» |
| **M85** | Bitcoin Agent Dashboard | — | «Bitcoin Agent Dashboard» |
| **M86** | Public Leaderboard | FA-01 | «Public Leaderboard» |
| **M87** | Press Kit page | — | «Press Kit страница» |

---

## Phase 4 — Enterprise и Scale (Месяцы 8-13)

**Roadmap Phase 4 MILESTONE**:
> EU AI Act compliance certification работает. Fleet Intelligence beta у 10+ enterprise клиентов. AAIF стандарт официально принят. 1M+ paxio-native агентов. Bitcoin Agent AUM > $1M. MRR: $120K+.

### Phase 4 milestones (outline)

| # | Milestone | FA |
|---|---|---|
| **M88** | EU AI Act первая certification | FA-06 |
| **M89** | ISO 42001 coverage расширение | FA-06 |
| **M90** | AML SAR Generation | FA-06 |
| **M91** | GDPR DPIA templates | FA-06 |
| **M92** | Audit Package (ZIP export) | FA-06 |
| **M93** | Vendor Communication (Art.25) | FA-06 |
| **M94** | EU Database Helper (Art.49) | FA-06 |
| **M95** | Multi-jurisdiction: Colorado, Texas, UK | FA-06 |
| **M96** | Enterprise Fleet Security | FA-04 |
| **M97** | Incident Response toolkit | FA-04 |
| **M98** | Custom fine-tuning Guard (Enterprise) | FA-04 |
| **M99** | FAP Middleware Guard | FA-02 + FA-04 |
| **M100** | Complior Kill Switch | FA-04 |
| **M101** | Enterprise Wallet Pro | FA-03 |
| **M102** | 2FA выше порога | FA-03 |
| **M103** | Wallet Insurance Pool | FA-03 |
| **M104** | Multi-currency Treasury | FA-03 + FA-05 |
| **M105** | AAIF стандарт принят | — |
| **M106** | 1M+ paxio-native агентов | FA-01 |
| **M107** | Registry v2 — advanced features | FA-01 |
| **M108** | SaaS Dashboard Enterprise | — |
| **M109** | Enterprise Portal (frontend) | — |
| **M110** | Intelligence Dashboard preview | FA-07 |
| **M111** | Mobile App (iOS + Android) | — |

---

## Phase 5 — Intelligence и Data Moat (Месяцы 13-18+)

**Roadmap Phase 5 MILESTONE**:
> Intelligence API: $100K+ MRR от Intelligence. Oracle Network live на DKI + Base + Ethereum. 10M+ транзакций в data warehouse. Predictive models F1 > 70%. PAXIO token Oracle staking v1. Total MRR: $200K+. Acquisition conversations начались.

### Phase 5 milestones (outline)

| # | Milestone | FA |
|---|---|---|
| **M112** | Data Pipeline production (был фоном с Phase 0) | FA-07 |
| **M113** | Fraud Intelligence API public | FA-07 |
| **M114** | Market Data Terminal | FA-07 |
| **M115** | Developer Analytics Dashboard ($29/мес) | FA-07 |
| **M116** | Paxio Radar (public free) | FA-07 |
| **M117** | Agent-to-Agent Intelligence | FA-07 |
| **M118** | Research Report #1 | FA-07 |
| **M119** | Network Graph Intelligence | FA-07 |
| **M120** | Enterprise Fleet Intelligence ($999/мес) | FA-07 |
| **M121** | Risk Analytics | FA-07 |
| **M122** | Intelligence Pro ($299/мес) | FA-07 |
| **M123** | Data Licensing (Embed, $499 + rev share) | FA-07 |
| **M124** | Custom Research ($2K-15K) | FA-07 |
| **M125** | Oracle Network v1 (DKI-native) | FA-07 |
| **M126** | Oracle Network EVM (Chain Fusion) | FA-07 |
| **M127** | Predictive Intelligence | FA-07 |
| **M128** | Oracle Operator Program (Phase 2) | FA-07 |
| **M129** | Paxio Radar (public UI) | — |
| **M130** | Intelligence Terminal (UI) | — |
| **M131** | Oracle Explorer (UI) | — |
| **M132** | Acquisition conversations | — |

---

## Сводная статистика

| Phase | Milestones | Agents involved |
|---|---|---|
| Phase 0 | M00-M14 (15) | architect, registry-dev, icp-dev, backend-dev, frontend-dev, user |
| Phase 1 | M15-M39 (25) | All |
| Phase 2 | M40-M65 (26) | All |
| Phase 3 | M66-M87 (22) | All |
| Phase 4 | M88-M111 (24) | All |
| Phase 5 | M112-M132 (21) | Mostly backend-dev + frontend-dev |
| **Total** | **133 milestones** | |

---

## Правила

1. **Milestone = кусок Roadmap × FA.** Не пишем "потому что есть код", пишем "потому что Roadmap требует и FA описывает".
2. **Reuse = метод.** `[PORT-*]` метки показывают источник, но milestone — про delivery FA requirement.
3. **Детальные `M0X-*.md` файлы** пишутся ДО Phase 0 старта. Phase 1+ детализируются по мере приближения (после M00-M14 complete).
4. **Parallel execution:** M00 блокирует M01-M13. M01-M04 (canisters) могут идти параллельно. M05-M10 (TS) могут идти параллельно после M00. M11-M13 (frontend) могут идти параллельно.
5. **Critical path Phase 0:** M00 → M01 + M02 + M09 → Roadmap milestone Phase 0 verified.

---

## Next Steps

1. **User review** этого мастер-плана. Одобряет структуру / изменения / приоритеты.
2. **Architect пишет детальные M00-M14** (Phase 0) — файлы `docs/sprints/M00-foundation.md` ... `M14-names-occupation.md`.
3. **Architect пишет RED-тесты** для каждого M0X (только после одобрения milestone).
4. **Dev-агенты реализуют** по тестам.
5. **После Phase 0 complete** — детализация Phase 1 (M15-M39).
