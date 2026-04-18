**Paxio**

Продукт 6 из 7

**Compliance Layer**

OS Слой 4 · Powered by Complior Agent

Продуктовая спецификация · v2.0 · С учётом архитектуры Complior

paxio.network · Берлин · Апрель 2026 · Конфиденциально

**1. Что это**

  ------------------------------------------------------------------------------------------
  **ОДНО ПРЕДЛОЖЕНИЕ**

  Compliance Layer --- первый автоматизированный compliance сервис для AI агентов:

  EU AI Act certification, OWASP LLM reporting, SOC 2 evidence --- всё на ICP audit trail.

  Реализован через Complior Agent в Paxio Registry:

  разработчик платит за скан, получает официальный compliance report.
  ------------------------------------------------------------------------------------------

Complior (complior.ai) --- существующий open-source AI Act compliance engine с Rust TUI, TypeScript engine, AST сканером, Regulation DB, FRIA generator и PDF audit reports. Это и есть Compliance Layer. Complior становится агентом в Paxio Registry, принимает платежи за compliance сканирование, и генерирует официальные артефакты для аудиторов.

  ----------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                          

  Роль в Paxio OS         Compliance Layer (Слой 4). Использует Audit Log из Wallet Canister и Security Forensics Trail как источники данных. Трансформирует их в регуляторные артефакты.

  Реализация              Complior Agent на Paxio Registry. did:paxio:complior-agent. Capabilities: eu-ai-act-scan, owasp-certification, soc2-evidence, fria-generation, kya-certificate. Принимает USDC.

  Ключевое преимущество   Audit Log на ICP --- cryptographically verifiable запись. Внешний аудитор проверяет ICP chain напрямую без доверия к нам. Complior уже имеет audit-trail.ts --- мигрируем на ICP canister.

  Structural lock-in      18 месяцев compliance history нельзя создать ретроспективно. Structural lock-in + \$30M EU AI Act штраф дешевле нашей подписки.

  GTM стратегия           Open Source Outreach: сканируем 500+ open-source AI проектов, публикуем «State of AI Compliance 2026» отчёт. GitHub Action для автоматического compliance мониторинга в CI/CD.
  ----------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**2. Complior Agent --- как это работает**

Complior существует как standalone product (complior.ai) и одновременно как агент в Paxio Registry. Это не конфликт --- это синергия. Разработчик может использовать Complior CLI напрямую, или вызвать его через Paxio как агент.

**2.1 Agent Passport = KYA Certificate**

Agent Passport (36 полей, ed25519 подпись) из Complior --- это буквально наш KYA Certificate для Visa ICC. Три режима создания уже реализованы. Экспорт в A2A, AIUC-1, NIST форматы из коробки.

  ------------------------ ---------------------------------------------------------------------------------------------------------- ---------------------- -------------------------------------------
  **Режим создания**       **Как работает**                                                                                           **Заполнение**         **Для кого**

  Mode 1 --- Auto (AST)    CLI анализирует код агента: AST scan → auto-fill 57+ frameworks detected → manifest.json                   85-95% автоматически   Разработчик --- быстро, без ручного ввода

  Mode 2 --- MCP Proxy     Наблюдает runtime поведение агента через MCP Compliance Proxy → заполняет паспорт из реального поведения   40-60% из runtime      Существующие агенты в production

  Mode 3 --- SaaS Wizard   5-шаговый wizard в SaaS Dashboard + AI Registry pre-fill из 2000+ известных AI инструментов                100% через UI          DPO / Compliance officer
  ------------------------ ---------------------------------------------------------------------------------------------------------- ---------------------- -------------------------------------------

  ----------------------------------------------------------------------------------
  **AGENT PASSPORT --- 36 ПОЛЕЙ (ключевые)**

  Identity: name, version, description, endpoint, did (did:paxio:\...)

  Capabilities: autonomy_level (L1-L5), tools, permissions, data_access

  Risk: risk_level (minimal/limited/high/unacceptable), use_cases

  Compliance: eu_ai_act_obligations\[\], iso42001_controls\[\], owasp_score

  Evidence: fria_status, technical_docs, training_data_hash

  Runtime: sdk_hooks_active, guard_integration, audit_log_enabled

  Signature: ed25519 подпись creator\'а → tamper-proof

  Export: A2A Agent Card, AIUC-1 format, NIST AI RMF profile

  Для Paxio: добавляем поля bitcoin_enabled, wallet_did, security_badge, paxio_did
  ----------------------------------------------------------------------------------

**2.1 7-Step Pipeline --- как работает Compliance Layer**

  ----------------------------------------------------------------------------------------
  **DISCOVER → CLASSIFY → SCAN → FIX → DOCUMENT → MONITOR → CERTIFY**

  Каждое из 108 обязательств EU AI Act проходит через этот pipeline.

  Agent Passport --- центральный data layer в который стекаются результаты каждого шага.

  DISCOVER → Обнаружение всех AI систем в инфраструктуре: код, конфиги, SaaS через IdP

  CLASSIFY → Risk level: unacceptable / high / limited / minimal (Annex III)

  SCAN → 108 обязательств × агент. Dual scoring: compliance + security.

  FIX → 18 стратегий автофиксов: код (A1-A9), документы (B1-B6), конфиги (C1-C3)

  DOCUMENT → 14+ EU AI Act шаблонов. FRIA (80% auto-fill). Technical Docs (Art.11).

  MONITOR → Drift detection при изменениях. Regulation change feed (EUR-Lex).

  CERTIFY → AIUC-1 Readiness Score. OWASP Certificate. KYA Certificate. On-chain.
  ----------------------------------------------------------------------------------------

  ------------------------------------------------------------------------------------
  **COMPLIOR КАК PAXIO АГЕНТ**

  Зарегистрирован в Registry: did:paxio:complior-agent

  Capabilities: eu-ai-act-scan, owasp-certification, soc2-evidence, fria-generation,

  kya-certificate, tech-documentation, risk-classification, audit-pdf

  Pricing: от \$3/скан (OWASP) до \$299/мес (Enterprise compliance monitoring)

  Оркестратор или разработчик вызывает:

  find_agent({capabilities: \[\'eu-ai-act-scan\'\]}) → Complior Agent found

  pay_agent(\'did:paxio:complior-agent\', 50.00, \'usdc\')

  → Complior сканирует агента по EU AI Act

  → генерирует Technical Documentation (Art.11)

  → возвращает signed PDF report + compliance score

  → обновляет compliance badge в Registry

  Paxio получает двойной доход:

  Facilitator fee: \$0.05 (routing)

  Agent revenue: \$49.95 (Complior agent revenue)
  ------------------------------------------------------------------------------------

**2.2 Покрытие стандартов**

  ---------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------ -------------------------
  **Стандарт**                       **Что охватывает**                                                                                                                                                                                                      **Complior модуль**                                          **Покрытие**

  EU AI Act (108 обязательств)       Art.4 (literacy), Art.5 (prohibited, 138 patterns), Art.9 (risk), Art.10 (data), Art.11-12 (docs, logs), Art.14 (oversight), Art.26 (deployer), Art.27 (FRIA), Art.50 (disclosure, marking), Art.72 (monitoring)        regulation-db/ + scanner/ + SDK 14 hooks + reports/          \~85% с Paxio OS

  ISO 42001 (39 контролей Annex A)   A.5.2-5.4 (Risk Assessment), A.6.2.3-6 (V&V, деплой), A.6.2.9 (документация), A.6.2.10 (запрещённое использование), A.6.2.11 (third-party), A.7.6 (происхождение данных), A.8.2 (disclosure), A.9.5 (human oversight)   FRIA + Evidence Chain + Passport + SDK + Obligation Mapper   \~50-60%

  ISO 27090 (безопасность ИИ)        13 категорий угроз: prompt injection, supply chain, model extraction, DoS, data poisoning, adversarial examples, privacy violation, evasion                                                                             Guard Service + SDK hooks + Semgrep/Bandit/ModelScan         \~70%+ с Security Layer

  NIST AI RMF                        4 функции, 19 категорий. GOVERN (политики), MAP (контекст), MEASURE (метрики), MANAGE (риски)                                                                                                                           Passport (36 полей) + Obligation Mapper + Agent Registry     \~35-40%
  ---------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------ -------------------------

  -----------------------------------------------------------------------------------
  **COMPLIOR MODULES → COMPLIANCE LAYER MAPPING**

  COMPLIOR MODULE COMPLIANCE LAYER ФУНКЦИЯ

  regulation-db/ → EU AI Act rules, Colorado SB205, штрафы, дедлайны

  scanner/checks/ → Risk classification, compliance score per agent

  reports/audit-pdf.ts → Official audit PDF для DPO/CTO/аудиторов

  reports/fria.ts → FRIA generator (Fundamental Rights Impact Assessment)

  reports/tech-docs.ts → Technical Documentation (Art.11)

  agent-governance/ → Agent lifecycle compliance: draft→deploy→retire

  agent-governance/audit-trail → Immutable action log → мигрируем на ICP canister

  agent-governance/manifest.ts → agent-compliance.yaml parse/generate

  monitoring/drift.ts → Compliance drift detection

  monitoring/regulation-feed.ts → Law change monitoring (EUR-Lex, Federal Register)

  runtime/logger.ts → JSONL interaction logger (Art.12)

  ICP canister (новый):

  Compliance Records → Upgrade audit-trail.ts на immutable ICP canister

  Certification Manager → On-chain compliance certificates
  -----------------------------------------------------------------------------------

**2.3 7-Step Pipeline и Obligation Mapper**

Complior реализует полный 7-шаговый compliance pipeline. 108 обязательств EU AI Act + 39 контролей ISO 42001 уже замаплены на конкретные действия разработчика.

  ----------------------------------------------------------------------------------
  **7-STEP COMPLIANCE PIPELINE (из Complior)**

  DISCOVER → обнаружить все AI системы в коде (57+ frameworks, import graph)

  CLASSIFY → определить risk level по Annex III (L1-L5 autonomy rating)

  SCAN → статический анализ: L1 Files → L2 Docs → L3 Deps → L4 AST → L5 LLM

  FIX → 18 стратегий авто-фикса: A(код) + B(документы) + C(deps) + D(config)

  DOCUMENT → 14 EU AI Act шаблонов: FRIA, AI Policy, Risk Register, SoA, Tech Docs

  MONITOR → drift detection, regulation change monitoring, anomaly detection

  CERTIFY → AIUC-1 readiness score, adversarial testing, compliance certificate

  Для Paxio Compliance Layer: каждый агент проходит этот pipeline.

  Certify шаг = Paxio Compliance Badge в Registry.

  Monitor шаг = ICP Audit Log canister (immutable).
  ----------------------------------------------------------------------------------

  --------------------------------------- ------------------------------------------------------------------------------------------------ ---------------------------------------------------------------------------------------
  **Compliance стандарт**                 **Покрытие в Complior**                                                                          **Что Paxio добавляет**

  EU AI Act (108 обязательств)            \~50% авто, \~35% с шаблонами. Все 12 ключевых статей: Art.4,5,6,9,10,11,12,14,26,27,50,72,73.   ICP immutable audit trail. On-chain certificates. Financial agent специфика.

  ISO 42001 (39 контролей Annex A)        \~45-50% покрытие. Agent governance, risk assessment, documentation, disclosure --- готовы.      Certification Manager на ICP для on-chain ISO 42001 readiness scores.

  ISO 27090 (13 AI security threats)      \~15-20% покрытие: Prompt Injection, Supply Chain, Model Extraction, DoS --- mapped.             Guard Agent закрывает оставшиеся threat categories. Full 100% с Paxio Security Layer.

  NIST AI RMF (4 функции, 19 категорий)   \~35-40% покрытие. MEASURE strong (scanner, метрики). GOVERN, MAP --- частично.                  Intelligence Layer data обогащает MEASURE функцию реальными метриками рынка.
  --------------------------------------- ------------------------------------------------------------------------------------------------ ---------------------------------------------------------------------------------------

**3. Open Source Outreach --- GTM стратегия**

Стратегия основана на документе «Open-Source AI-проекты на GitHub --- главный канал бесплатного роста». Complior уже спланировал эту стратегию. Paxio усиливает её через Registry и платёжный слой.

  --------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------ ------------------
  **Поток**                         **Что делаем**                                                                                                                                                    **Paxio усиление**                                                                                                                         **Срок**

  Flagship Report                   Сканируем 500+ open-source AI проектов. Публикуем «State of AI Compliance in Agentic Economy 2026». Каждый проект получает Compliance Score по всем 5 слоям OS.   Отчёт включает Paxio Registry метрики: сколько агентов, какие compliance scores, trending capabilities. Hacker News + Reddit + LinkedIn.   Апрель-Май 2026

  GitHub Action (Complior-based)    paxio-network/compliance-check@v1 в GitHub Marketplace. Один YAML → scan on PR → comment с findings → badge в README. Бесплатно для open-source навсегда.         Badge ссылается на paxio.network. Badge кликабелен → страница агента в Registry. Organic discovery.                                        Март-Апрель 2026

  Топ-30 персональный outreach      20-30 крупнейших open-source AI проектов с компаниями за ними. Личные сообщения с детальным 2-3 страничным отчётом. Не PR spam --- только по приглашению.         Предлагаем не просто compliance scan, но регистрацию агента в Paxio Registry. First compliance agents = первые участники экосистемы.       Май-Июнь 2026

  Берлинский фокус (n8n, deepset)   n8n GmbH (Берлин, 70K+ stars workflow automation). deepset/Haystack (Берлин, NLP/RAG). EU AI Act для них критичен. Прямой контакт через берлинские meetups.       Берлин = наш город. Физический networking. Первые enterprise пилоты.                                                                       Месяц 3--4
  --------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------ ------------------

  --------------------------------------------------------------------------------
  **ЦЕЛЕВЫЕ OPEN-SOURCE ПРОЕКТЫ (топ приоритет)**

  LangChain (100K+ stars) --- самый популярный AI фреймворк (целевой #1)

  Hugging Face Transformers --- крупнейшая AI платформа (140K+)

  n8n GmbH (Берлин, 70K+) --- workflow automation + AI, НАШИ СОСЕДИ

  Dify (90K+) --- Open-source LLM App platform

  CrewAI (25K+) --- Multi-agent framework, наши прямые пользователи

  Haystack / deepset (Берлин) --- NLP/RAG, немецкая компания, EU AI Act критичен

  AutoGPT (170K+) --- Пионер AI агентов

  LlamaIndex (40K+) --- RAG фреймворк

  Open WebUI (80K+) --- Популярный UI для LLM

  Ожидаемый response rate: 10-20% ответят, 5-10% интегрируют GitHub Action.

  Достаточно 2-3 крупных проектов с badge = огромная победа.
  --------------------------------------------------------------------------------

**4. Что входит в Compliance Layer**

  ------------------------------------ --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------- --------------------------
  **Compliance область**               **Complior module**                                                                                                                                                                                             **Артефакт**                                                                                                  **Срок**

  Agent Passport (36 полей, ed25519)   Centralная сущность. Mode 1: Auto AST (85-95% auto-fill). Mode 2: MCP Proxy (40-60%). Mode 3: SaaS Wizard (100%). Export: A2A, AIUC-1, NIST. Три режима создания --- разработчик, runtime observer, менеджер.   v1.0 --- MVP (код готов)                                                                                      

  EU AI Act Risk Assessment            regulation-db/ + scanner/ + risk classifier                                                                                                                                                                     Risk Assessment Report. Technical Documentation (Art.11). Risk level: unacceptable/high/limited/minimal.      v1.0 --- MVP (код готов)

  EU AI Act Audit Trail                audit-trail.ts → ICP canister upgrade                                                                                                                                                                           On-chain immutable log. Верифицируется внешним аудитором через ICP chain напрямую.                            v1.0 --- MVP

  EU AI Act Incident Reporting         monitoring/ + Security Layer incidents                                                                                                                                                                          Incident Log в формате ENISA. Root cause + remediation. Автоматически из Security Layer.                      v1.0 --- MVP

  FRIA Generator                       reports/fria.ts (80% pre-filled)                                                                                                                                                                                Fundamental Rights Impact Assessment. Complior уже генерирует --- 80% заполняется автоматически из profile.   v1.0 --- MVP (код готов)

  OWASP LLM Certificate                scanner/checks/ + scoring.ts                                                                                                                                                                                    OWASP Compliance Certificate. 90 дней срок действия. QR код для верификации. Shared с Security Layer.         v1.0 --- MVP

  Technical Documentation (Art.11)     reports/tech-docs.ts                                                                                                                                                                                            Официальная техническая документация для EU AI Act. Complior уже генерирует.                                  v1.0 --- MVP (код готов)

  SOC 2 Type II Evidence Pack          audit-trail.ts + monitoring/                                                                                                                                                                                    Evidence bundle для SOC 2 аудитора. Logs + controls + exceptions. Signed ZIP.                                 v1.1

  KYA Certificate (Know Your Agent)    agent-governance/manifest.ts + Registry DID                                                                                                                                                                     Agent Identity Certificate. DID + on-chain attestation. Нужен для Visa ICC.                                   v1.1

  Compliance Drift Monitoring          monitoring/drift.ts                                                                                                                                                                                             Score drift detection при изменениях. Regulation change monitoring (EUR-Lex).                                 v1.1

  AML SAR Generation                   Security Layer incidents + regulation-db/                                                                                                                                                                       Suspicious Activity Reports в форматах FinCEN/goAML для financial institution клиентов.                       v1.2

  Multi-jurisdiction                   regulation-db/ (Complior Sprint S3, S6, S10)                                                                                                                                                                    Colorado SB205 (готово). Texas TRAIGA, California AB2885, UK, Japan, Canada --- по roadmap Complior.          v1.1--v2.0
  ------------------------------------ --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------- --------------------------

**5. Архитектура**

  -----------------------------------------------------------------------
  **КАК COMPLIANCE LAYER РАБОТАЕТ**

  SOURCES (читаем, не пишем):

  ICP Audit Log canister (Wallet) ← immutable transaction log

  Security Forensics Trail ← incident log

  Registry Agent Card history ← agent changes over time

  Complior scanner results ← compliance scores

  COMPLIOR ENGINE (TypeScript, Bun/Node + Hono):

  regulation-db/ → EU AI Act rules, штрафы, дедлайны

  scanner/ → OWASP scoring, risk classification

  reports/ → audit-pdf, fria, tech-docs, compliance-md

  agent-governance/ → lifecycle, manifest, audit-trail

  monitoring/ → drift, regulation-feed, anomaly

  ICP CANISTER (Rust, новый):

  Compliance Records Canister → upgrade audit-trail.ts на ICP

  Certification Manager → on-chain compliance certificates

  OUTPUTS (артефакты для аудиторов):

  Signed PDF reports ← react-pdf/renderer (Complior уже использует)

  JSON evidence bundles ← signed ZIP для SOC 2

  Compliance certificates ← on-chain, QR верифицируемые

  Registry badge updates ← compliance badge в agent profile

  Auditor portal (read-only) ← Next.js (Complior Sprint C.7)
  -----------------------------------------------------------------------

**6. Функциональные требования**

+-----------------------------------------------------------------------+
| **CORE COMPLIANCE (Complior-based, большая часть готова)**            |
+-----------------------------------------------------------------------+
| **Agent Passport (36 полей, ed25519)**                                |
|                                                                       |
| *v1.0 --- MVP (код готов)*                                            |
+-----------------------------------------------------------------------+
| **EU AI Act Risk Assessment**                                         |
|                                                                       |
| *v1.0 --- MVP (код готов)*                                            |
+-----------------------------------------------------------------------+
| **OWASP Compliance Certificate**                                      |
|                                                                       |
| *v1.0 --- MVP (код готов)*                                            |
+-----------------------------------------------------------------------+
| **Audit Trail Export**                                                |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Incident Log**                                                      |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **GitHub Action для compliance**                                      |
|                                                                       |
| *v1.0 --- MVP (база готова)*                                          |
+-----------------------------------------------------------------------+
| **Compliance Dashboard**                                              |
|                                                                       |
| *v1.0 --- MVP (база готова)*                                          |
+-----------------------------------------------------------------------+
| **SaaS Dashboard (Fleet + Passport)**                                 |
|                                                                       |
| *v1.1 (Complior SaaS Sprint S7)*                                      |
+-----------------------------------------------------------------------+
| **Audit Package (ZIP)**                                               |
|                                                                       |
| *v1.2*                                                                |
+-----------------------------------------------------------------------+
| **Vendor Communication (Art.25)**                                     |
|                                                                       |
| *v1.2*                                                                |
+-----------------------------------------------------------------------+
| **EU Database Helper (Art.49)**                                       |
|                                                                       |
| *v1.2*                                                                |
+-----------------------------------------------------------------------+
| **SOC 2 Evidence Pack**                                               |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+
| **KYA Certificate**                                                   |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+
| **Multi-jurisdiction (Colorado, Texas, UK, JP)**                      |
|                                                                       |
| *v1.1 → v2.0*                                                         |
+-----------------------------------------------------------------------+
| **AML SAR Generation**                                                |
|                                                                       |
| *v1.2*                                                                |
+-----------------------------------------------------------------------+

**7. Монетизация**

  -------------------------------------------- --------------------------------------------------------------------------------------- ----------------------------------------------------------- ---------------
  **Продукт**                                  **Цена**                                                                                **Кто платит**                                              **Срок**

  Complior Agent --- EU AI Act scan            \$50/скан (полный)                                                                      Разработчик который хочет compliance report перед деплоем   v1.0

  Complior Agent --- OWASP Certificate         \$10/скан (shared со Security Layer)                                                    Любой разработчик агента                                    v1.0

  Complior Agent --- FRIA Generator            \$30/документ                                                                           Company деплоящая high-risk AI                              v1.0

  Complior Agent --- Technical Docs (Art.11)   \$20/документ                                                                           Enterprise перед EU AI Act аудитом                          v1.0

  Compliance SaaS (monthly)                    \$299--999/мес. EU AI Act monitoring, SOC 2 evidence, KYA certificates, drift alerts.   Enterprise с постоянным compliance требованием              v1.1

  GitHub Action (open-source)                  Бесплатно навсегда для open-source. Платно для enterprise (\$49/мес private repos).     Open-source maintainers, Enterprise dev teams               v1.0

  Flagship Report (lead gen)                   Бесплатно. Email-gated. «State of AI Compliance 2026».                                  Весь рынок. Lead generation для paid tiers.                 Апрель 2026
  -------------------------------------------- --------------------------------------------------------------------------------------- ----------------------------------------------------------- ---------------

**9. Технический стек**

Complior Agent --- это не LangChain агент. Это специализированный TypeScript сервис с Paxio идентичностью. Агентные фреймворки не нужны потому что Complior Agent не принимает решений --- он выполняет фиксированный compliance pipeline.

  -----------------------------------------------------------------------------
  **ПОЧЕМУ НЕ LANGCHAIN И НЕ ICP CANISTERS**

  LangChain/CrewAI нужны агентам которые выбирают следующий шаг.

  Complior Agent делает фиксированный pipeline:

  получить агента → запустить scanner → сгенерировать PDF → вернуть результат

  Это не LLM orchestration. Это детерминированный compliance pipeline

  с одним LLM вызовом для hosted Q&A (Vercel AI SDK, не LangChain).

  ICP canisters --- только для Compliance Records (immutable certificates).

  Вся логика Complior Engine (TypeScript) остаётся как есть.

  Переписывать 10K строк TypeScript в Rust ради on-chain --- оверинжиниринг.
  -----------------------------------------------------------------------------

  ------------------------------------ ---------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------------
  **Компонент**                        **Стек**                                                               **Почему именно этот**                                                                                                                  **НЕ используем**

  Complior Engine (compliance logic)   TypeScript + Fastify + Hono (уже написан)                              Весь Complior Engine уже на TypeScript. regulation-db, scanner, reports, agent-governance --- код готов. Единый стек с Paxio.           Python (не нужен), LangChain (оверинжиниринг), ICP canister (не нужен для этой логики)

  Hosted LLM / RAG (EU AI Act Q&A)     Vercel AI SDK + Qwen 2.5 14B AWQ + ChromaDB (уже написан в Complior)   Vercel AI SDK --- не агентный фреймворк, просто удобный streaming LLM клиент. Уже интегрирован в Complior hosted/ модуль.               LangChain (тяжело, много абстракций для простого RAG)

  PDF и отчёты                         \@react-pdf/renderer + PDFKit (уже в Complior reports/)                Complior уже генерирует audit-pdf, fria, tech-docs. Переиспользуем без изменений.                                                       Новые библиотеки не нужны

  Paxio идентичность                   \@paxio/sdk → wallet.inject(app)                                       Одна строка --- агент получает USDC адрес, Registry registration, x402 payments, Audit Log.                                             Ручная реализация

  Compliance Records (on-chain)        Rust + ICP canister (upgrade Complior audit-trail.ts)                  Compliance certificates должны быть cryptographically verifiable. ICP immutable canister --- единственный правильный выбор для этого.   SQLite (не cryptographically verifiable), PostgreSQL (централизованный)
  ------------------------------------ ---------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **ТРИ СЛОЯ СТЕКА**

  СЛОЙ 1 --- COMPLIANCE ЛОГИКА (TypeScript, код уже написан)

  Complior Engine: TypeScript + Fastify/Hono

  Scanner, Reports: Complior modules --- переиспользуем без изменений

  LLM для RAG: Vercel AI SDK (streaming, не orchestration)

  СЛОЙ 2 --- PAXIO ИДЕНТИЧНОСТЬ

  \@paxio/sdk → wallet.inject(app)

  Complior Agent получает: USDC адрес, Registry, x402, Audit Log

  СЛОЙ 3 --- ICP CANISTER (только для верифицируемых records)

  Compliance Records → Rust: on-chain certificates, QR верифицируемые

  Audit Trail upgrade → Rust: immutable от Complior SQLite
  -----------------------------------------------------------------------

**10. Open Source --- что используем**

  --------------------------- ----------------------------------------------- ------------------ ------------------------------------------------
  **Компонент**               **Open Source**                                 **Лицензия**       **Источник**

  Compliance Engine           Complior Engine (наш, complior.ai)              MIT                regulation-db, scanner, reports --- code ready

  PDF Generation              PDFKit + \@react-pdf/renderer                   MIT / MIT          Complior уже использует для audit-pdf.ts

  EU AI Act reference         EU AI Act official text + NIST AI RMF           Public domain      Complior regulation-db/ --- уже парсится

  FRIA Generator              Complior reports/fria.ts (готово)               MIT                80% auto-filled из profile

  Tech Documentation          Complior reports/tech-docs.ts (готово)          MIT                Art.11 generator

  Audit Trail (upgrade)       Complior audit-trail.ts → ic-cdk ICP            MIT / Apache 2.0   SQLite → ICP immutable canister

  ICP Certification Manager   ic-cdk + ic-stable-structures                   Apache 2.0         On-chain compliance certificates

  Monitoring                  Complior monitoring/ (drift, regulation-feed)   MIT                Compliance drift + law change monitoring

  Validation                  Zod                                             MIT                Единый стек с остальными продуктами
  --------------------------- ----------------------------------------------- ------------------ ------------------------------------------------

**11. Интеграции и роадмап**

  -------------------------- --------------------------------------------------------------------------------------------------------------------------------------------- -----------------------------------------
  **Продукт**                **Интеграция**                                                                                                                                **Направление**

  Security (Продукт 4)       Complior = общая кодовая база. Forensics Trail → Compliance audit. Security incidents → compliance incidents. Security Scanner shared code.   Security ↔ Compliance (shared Complior)

  Registry (Продукт 1)       Compliance badges в Registry. Complior Agent зарегистрирован как агент. Agents with certificates = higher trust.                              Compliance → Registry (badges + agent)

  Wallet (Продукт 3)         ICP Audit Log из Wallet = источник данных для Compliance reports.                                                                             Wallet → Compliance (audit source)

  Intelligence (Продукт 7)   Compliance data → market insights: какие % агентов compliant, trending violations.                                                            Compliance → Intelligence (market data)
  -------------------------- --------------------------------------------------------------------------------------------------------------------------------------------- -----------------------------------------

  ----------------- -------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- --------------------------------------------------------------------------------------
  **Версия**        **Срок**                               **Что включено**                                                                                                                                                                                **Milestone**

  v1.0 --- Launch   Месяц 5--6 (используем Complior код)   Complior Agent в Registry. EU AI Act Risk Assessment, FRIA, Technical Docs, OWASP Certificate. GitHub Action. Audit Trail на ICP. Dashboard (Complior Sprint C.7 адаптация). Flagship Report.   Первая EU AI Act compliance certification. Complior agent работает в Registry.

  v1.1              Месяц 7--9                             SOC 2 Evidence Pack. KYA Certificate. Auditor Portal. Compliance drift monitoring. Colorado SB205 + Texas TRAIGA. Multi-jurisdiction.                                                           SOC 2 support. Visa ICC KYA requirement. n8n и deepset интеграции (Берлин outreach).

  v1.2              Месяц 10--12                           AML SAR generation. Complior Runtime middleware integration (Art.12 logging). Complior Agent Sandbox (Sprint A.9.01) для pre-deployment gate.                                                   Financial institution клиенты. AML compliance.

  v2.0              Месяц 13--18                           UK, Japan, Canada, Brazil rule sets (Complior Sprint S10). Complior white-label engine API. Self-hosted Compliance Layer для Enterprise.                                                        International compliance. Enterprise self-hosted.
  ----------------- -------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- --------------------------------------------------------------------------------------

**Paxio · Compliance Layer**

Powered by Complior Agent · paxio.network
