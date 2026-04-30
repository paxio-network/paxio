**Paxio**

Продукт 1 из 7

**Universal Registry**

Identity Layer --- OS Слой 1

Продуктовая спецификация · v1.0 · Без кода

paxio.network · Берлин · Апрель 2026 · Конфиденциально

**1. Что это**

  ------------------------------------------------------------------------------
  **ОДНО ПРЕДЛОЖЕНИЕ**

  Universal Registry --- поисковая система для AI агентов:

  единственная точка где любой агент может быть найден, верифицирован и вызван

  независимо от того в какой экосистеме он был создан.
  ------------------------------------------------------------------------------

Сегодня миллионы AI агентов работают в изолированных экосистемах: ERC-8004 (Ethereum/Base), A2A (Google), MCP (Anthropic/Claude), Fetch.ai Agentverse, Virtuals Protocol, Olas, Salesforce AgentExchange. Каждая из этих экосистем --- закрытый остров. Агент зарегистрированный в Fetch.ai невидим для агента работающего через MCP. Агент на Base не знает что существует нужный ему сервис в Agentverse.

Universal Registry --- это кросс-экосистемный индекс. Он не заменяет существующие реестры --- он агрегирует их в единое адресное пространство с семантическим поиском, верификацией endpoint и репутационной системой на основе реальных транзакций.

  ------------------ ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                     

  Роль в Paxio OS    Identity Layer (Слой 1). Первая точка контакта любого участника с OS. Все остальные слои используют Registry как источник правды об идентичности агента.

  Кто использует     Агент-покупатель: ищет нужный агент по способности. Разработчик: регистрирует своего агента и делает его видимым. Enterprise: аудит какие агенты работают в его инфраструктуре.

  Главная ценность   «Найти нужного агента» решается одним семантическим запросом вместо обхода десятков разных реестров. Reputation score на ICP --- единственный unforgeable сигнал доверия в экосистеме.

  Уникальность       Кросс-экосистемность (никто не агрегирует все источники), семантический поиск по намерению (не по keywords), репутация на ICP (нельзя подделать).
  ------------------ ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**2. Для кого --- пользователи и сценарии**

  ------------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------
  **Пользователь**                            **Сценарий использования**                                                                                                                  **Что получает**                                                                                            **Entry point**

  Разработчик агента                          Создал агента на LangChain, хочет чтобы другие агенты его находили и платили за его услуги.                                                 Регистрация в Registry → видимость для всех 3M+ агентов → первые входящие транзакции без маркетинга.        Wallet Adapter auto-registration или ручная форма на /register

  Агент-покупатель (programmatic)             Agentный оркестратор ищет специализированный агент для subtask: «найди переводчика с немецкого на английский для юридических документов».   Семантический API возвращает топ-10 агентов с reputation score, ценой, latency, security badge.             GET /registry/find?intent=\... или MCP tool find_agent()

  Владелец пассивно индексированного агента   Его агент уже в Registry (краулер нашёл в ERC-8004). Получил Claim Your Agent email.                                                        Верифицировать владение через challenge → подключить Wallet Adapter → получить Security Badge.              Email link → /claim/:agent_id

  Enterprise CTO                              Хочет проаудировать какие внешние агенты используются в его организации и какой у них reputation score.                                     Список всех агентов с которыми взаимодействовала его инфраструктура + их OWASP score + compliance status.   Enterprise API / Dashboard

  Разработчик платформы                       Строит мультиагентную систему, хочет использовать Registry как service discovery layer.                                                     REST API + webhook при изменении статуса агента. Полный доступ к данным через API.                          API key + webhooks
  ------------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------

**3. Архитектура**

  -------------------------------------------------------------------------
  **ОБЩАЯ СХЕМА КОМПОНЕНТОВ**

  ┌─────────────────────────────────────────────────────────────────────┐

  │ CLIENTS (agents, developers, enterprise) │

  │ REST API · MCP Server · Web Dashboard · CLI │

  └────────────────────────────┬────────────────────────────────────────┘

  │

  ┌────────────────────────────▼────────────────────────────────────────┐

  │ API GATEWAY (rate limiting, auth, routing) │

  └──────┬─────────────────┬──────────────────┬───────────────┬────────┘

  │ │ │ │

  ┌──────▼──────┐ ┌───────▼───────┐ ┌──────▼──────┐ ┌────▼────────┐

  │ SEARCH │ │ REGISTRATION │ │ REPUTATION │ │ CRAWLERS │

  │ ENGINE │ │ SERVICE │ │ ENGINE │ │ SERVICE │

  │ │ │ │ │ │ │ │

  │ Semantic │ │ Validation │ │ Score calc │ │ ERC-8004 │

  │ Vector DB │ │ Dedup │ │ History │ │ A2A / MCP │

  │ BM25+cosine │ │ DID binding │ │ Alerts │ │ Fetch.ai │

  └──────┬──────┘ └───────┬───────┘ └──────┬──────┘ └────┬────────┘

  │ │ │ │

  ┌──────▼─────────────────▼──────────────────▼───────────────▼────────┐

  │ DATA LAYER │

  │ PostgreSQL (agent metadata) · Qdrant (vector embeddings) │

  │ Redis (cache, rate limits) · ICP Canister (reputation, immutable│

  └─────────────────────────────────────────────────────────────────────┘
  -------------------------------------------------------------------------

**3.1 Компоненты**

  -----------------------------------------------------------------------
  **Interaction Layer --- Fastify API**

  **Fastify API Server**

  **REST API**

  **MCP Server**

  **Web Dashboard**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Search Engine**

  **Embedding Service**

  **Vector Database**

  **BM25 Index**

  **Search Orchestrator**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Registration & Identity Service**

  **Registration Handler**

  **Endpoint Prober**

  **DID Generator**

  **Claim Service**

  **Deduplication Engine**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Reputation Engine**

  **Score Calculator**

  **ICP Reputation Canister**

  **Sybil Detector**

  **Badge Manager**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Crawlers Service --- источники агентов**

  **ERC-8004 Crawler**

  **A2A Crawler**

  **MCP Registry Crawler**

  **Fetch.ai Crawler**

  **ElizaOS Crawler**

  **Virtuals / Olas Crawler**

  **Paxio Native (Wallet Adapter)**

  **Scheduler**
  -----------------------------------------------------------------------

**4. Agent Card --- формат данных**

Agent Card --- стандартный JSON объект описывающий агента. Paxio Registry использует расширенную версию поверх A2A Agent Card спецификации (Google/Linux Foundation). Совместима с ERC-8004, A2A и MCP форматами через трансформацию.

  ---------------------------------------------------------------------------------------------------------------------
  **СТРУКТУРА AGENT CARD (Paxio формат v2)**

  {

  // --- IDENTITY ---

  \"did\": \"did:paxio:base:0x1a2b3c\...\", // Decentralized Identifier (immutable)

  \"name\": \"Legal Document Translator\",

  \"description\": \"Translates legal documents between EN, DE, FR, ES\",

  \"version\": \"1.2.0\",

  \"endpoint\": \"https://agent.example.com/v1\",

  \"source\": \"paxio-native\", // M-L1-taxonomy: paxio-native\|erc8004\|a2a\|mcp\|fetch\|virtuals\|eliza

  \"framework\": \"langchain\", // langchain\|crewai\|autogen\|eliza\|paxio-native\|custom

  \"open_source\": \"https://github.com/dev/legal-agent\", // null если закрытый

  // --- CAPABILITIES ---

  \"capabilities\": \[\"translate\", \"legal-documents\", \"multilingual\"\],

  \"skills\": \[

  { \"id\": \"legal_translation\", \"languages\": \[\"en\",\"de\",\"fr\"\], \"doc_types\": \[\"contract\",\"nda\"\] }

  \],

  \"input_types\": \[\"text\", \"file/pdf\", \"file/docx\"\], // text\|image\|audio\|file/\*\|code

  \"output_types\": \[\"text\", \"file/docx\"\],

  // --- PAYMENT ---

  \"payment_accepts\": \[\"usdc-base\", \"btc-l1\", \"x402\"\],

  \"pricing\": { \"per_call\": 0.003, \"currency\": \"usdc\" },

  \"bitcoin_enabled\": true, // threshold ECDSA кошелёк

  // --- PERFORMANCE ---

  \"sla\": { \"p50_ms\": 1200, \"p99_ms\": 5000, \"uptime_30d\": 0.998 },

  // --- TRUST ---

  \"security_badge\": {

  \"owasp_score\": 0.12, // 0 = perfect, 1 = worst

  \"badge_level\": \"gold\", // none \| bronze \| silver \| gold

  \"verified_at\": \"2026-04-10T10:00:00Z\"

  },

  \"reputation\": {

  \"score\": 847, // хранится в ICP canister --- unforgeable

  \"tx_count\": 12483,

  \"delivery_rate\": 0.994,

  \"dispute_rate\": 0.002

  },

  // --- COMPLIANCE ---

  \"data_handling\": \"no-storage\", // no-storage \| ephemeral \| logged

  // --- DEVELOPER ---

  \"developer\": { \"name\": \"Acme Corp\", \"verified\": true }, // verified через challenge

  \"network\": \"base\",

  \"updated_at\": \"2026-04-14T08:23:11Z\"

  }
  ---------------------------------------------------------------------------------------------------------------------

**5. Функциональные требования**

+-----------------------------------------------------------------------+
| **ПОИСК И DISCOVERY**                                                 |
+-----------------------------------------------------------------------+
| **Семантический поиск**                                               |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Фильтрация**                                                        |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Keyword fallback**                                                  |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Похожие агенты**                                                    |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+
| **Сортировка leaderboard**                                            |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+
| **Bulk search API**                                                   |
|                                                                       |
| *v1.2*                                                                |
+-----------------------------------------------------------------------+
| **Поиск по input/output типам**                                       |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+
| **Status фильтр**                                                     |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **РЕГИСТРАЦИЯ И IDENTITY**                                            |
+-----------------------------------------------------------------------+
| **Ручная регистрация**                                                |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Paxio Native auto-registration**                                    |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Claim Your Agent**                                                  |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **DID генерация**                                                     |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Обновление профиля**                                                |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Multi-endpoint агент**                                              |
|                                                                       |
| *v1.2*                                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **РЕПУТАЦИЯ И ВЕРИФИКАЦИЯ**                                           |
+-----------------------------------------------------------------------+
| **Reputation score**                                                  |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Security Badge**                                                    |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Endpoint health monitoring**                                        |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Sybil detection**                                                   |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+
| **Dispute mechanism**                                                 |
|                                                                       |
| *v1.2*                                                                |
+-----------------------------------------------------------------------+
| **Верифицированный разработчик**                                      |
|                                                                       |
| *v1.2*                                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **КРАУЛИНГ И ИНДЕКСАЦИЯ**                                             |
+-----------------------------------------------------------------------+
| **ERC-8004 краулер**                                                  |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **A2A краулер**                                                       |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **MCP Registry краулер**                                              |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Fetch.ai краулер**                                                  |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Virtuals / Olas краулер**                                           |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+
| **Crawl health dashboard**                                            |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **API И ИНТЕГРАЦИИ**                                                  |
+-----------------------------------------------------------------------+
| **REST API**                                                          |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **MCP Server**                                                        |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Webhooks**                                                          |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+

**6. Open Source --- что используем**

  ------------------- -------------------------------------- ---------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------
  **Компонент**       **Open Source проект**                 **Лицензия**           **Почему именно этот**                                                                                                                                               **Альтернатива**

  Vector Database     Qdrant                                 Apache 2.0             Лучшая производительность на dense vectors, нативная поддержка payload filtering, self-hosted, Rust реализация.                                                      Weaviate, Chroma, Milvus

  Keyword Search      Meilisearch                            MIT                    Простой деплой, отличный developer experience, typo-tolerance, быстрый. Альтернатива: Elasticsearch (тяжелее).                                                       Elasticsearch, Typesense

  Embedding Model     OpenAI text-embedding-3-small          Commercial API         Нулевой ops overhead на старте. \$0.02/1M tokens --- дёшево при нашем объёме. Переключиться на self-hosted (BGE-M3) когда объём сделает это экономически выгодным.   BGE-M3 self-hosted (v2)

  Task Queue          BullMQ + Redis                         MIT                    TypeScript-native job queue. Надёжная обработка crawl jobs, retry логика, dead letter queue, cron scheduling.                                                        Temporal, graphile-worker

  API Framework       Fastify + TypeScript                   MIT                    Быстрейший Node.js framework. \@fastify/swagger для OpenAPI, \@fastify/jwt для auth, \@fastify/rate-limit. Нет нужды в отдельном gateway.                            Express, Hono, NestJS

  Database            PostgreSQL                             PostgreSQL License     Надёжность, JSON поддержка для Agent Cards, полнотекстовый поиск, расширения (pgvector как fallback).                                                                MySQL, CockroachDB

  Agent ID стандарт   W3C DID Core                           W3C Document License   Открытый стандарт децентрализованных идентификаторов. Совместим с существующей инфраструктурой.                                                                      ---

  A2A протокол        Google A2A (теперь Linux Foundation)   Apache 2.0             Официальный Agent Card формат от Google. Берём за основу нашего формата и расширяем.                                                                                 ---

  ERC-8004 парсер     ERC-8004 reference impl + viem         MIT / MIT              Официальная реализация для чтения Agent Registry смарт-контрактов. viem для on-chain чтения.                                                                         ethers.js

  ICP SDK             DFINITY agent-rs / agent-js            Apache 2.0             Официальный SDK для взаимодействия с ICP canisters из Rust/TypeScript.                                                                                               ---

  HTTP Client         undici (Node.js built-in)              MIT                    Встроенный в Node.js 18+ HTTP/1.1 и HTTP/2 клиент. Используется в Endpoint Prober и всех краулерах. Быстрее axios/got.                                               ky, got, axios

  Validation          Zod                                    MIT                    TypeScript-first schema validation. Заменяет Pydantic. Используется для валидации Agent Card при регистрации и обновлении.                                           Yup, Joi, Valibot

  EVM Client (TS)     viem                                   MIT                    TypeScript-first Ethereum library. ERC-8004 краулер читает on-chain события AgentRegistered. Лёгкий, типизированный, tree-shakeable.                                 ethers.js v6

  Fetch.ai SDK        \@fetchai/uAgents (npm)                Apache 2.0             Официальный TypeScript SDK для Fetch.ai Almanac API. Индексируем 2M+ агентов через него.                                                                             ---

  MCP Protocol SDK    \@modelcontextprotocol/sdk             MIT                    Официальный Anthropic MCP TypeScript SDK. MCP сервер mcp.paxio.network и MCP краулер.                                                                                ---

  Deduplication       simhash-js (npm)                       MIT                    Locality-Sensitive Hashing для обнаружения дублей агентов по схожести endpoint + capabilities. Pure TypeScript.                                                      minhash (npm)

  Qdrant Client       \@qdrant/js-client-rest                Apache 2.0             Официальный TypeScript REST клиент для Qdrant vector database. Используется Search Engine.                                                                           qdrant-js
  ------------------- -------------------------------------- ---------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------

**7. Что НЕ входит в Registry**

Важно явно определить границы продукта чтобы не расползался scope.

  ----------------------------------- ------------------------------------------------------------------------------------------------ -----------------------------------
  **Что НЕ делаем**                   **Почему**                                                                                       **Где это решается**

  Не выполняем транзакции             Registry --- это discovery и identity. Платежи --- отдельный продукт.                            Продукт 2: Meta-Facilitator + FAP

  Не генерируем кошельки              Кошелёк --- часть Trust Layer, не Identity Layer.                                                Продукт 3: Paxio Wallet + Adapter

  Не запускаем агентов                Registry знает где агент, но не управляет его execution.                                         Инфраструктура клиента

  Не храним контент агентов           Только метаданные и Agent Card. Никаких промптов, весов, данных клиентов.                        Инфраструктура агента

  Не являемся Certificate Authority   Не выдаём X.509 сертификаты. Верификация через DID и challenge-response.                         W3C DID + ICP

  Не индексируем приватных агентов    Только публично доступные endpoint. Приватные агенты enterprise могут быть в private registry.   Enterprise private deployment

  Не гарантируем uptime агента        Мониторим и показываем статус, но не несём ответственности за availability.                      Клиентская инфраструктура
  ----------------------------------- ------------------------------------------------------------------------------------------------ -----------------------------------

**8. Интеграции внутри Paxio OS**

  ------------------------------------ ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- --------------------------------------------------
  **Продукт Paxio**                    **Как интегрируется с Registry**                                                                                                                                                      **Направление**

  Wallet + Adapter (Продукт 3)         При установке Wallet Adapter агент авто-регистрируется в Registry. BTC адрес привязывается к DID агента. Поле bitcoin_enabled = true в Agent Card.                                    Wallet → Registry (push)

  Meta-Facilitator / FAP (Продукт 2)   Перед каждым платежом Facilitator проверяет Registry: существует ли агент с таким DID, какой у него статус endpoint, не заблокирован ли. После транзакции --- обновляет reputation.   Facilitator ↔ Registry (read + write reputation)

  Security Layer (Продукт 4)           Security Scan результаты → обновление Security Badge в Registry. Sybil detection использует данные Registry о паттернах транзакций.                                                   Security → Registry (badge update)

  Compliance Layer (Продукт 6)         Compliance сертификаты агента хранятся как поля Agent Card в Registry. Аудитор может проверить compliance status через Registry API.                                                  Compliance → Registry (cert storage)

  Intelligence Layer (Продукт 7)       Registry --- основной источник данных для Intelligence: какие агенты существуют, как меняется их reputation, какие capabilities в дефиците.                                           Registry → Intelligence (data feed)
  ------------------------------------ ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- --------------------------------------------------

**9. Нефункциональные требования**

  ------------------------ ----------------------------------------------------------------------- ---------------------------------------------------------------------------------------------------
  **Категория**            **Требование**                                                          **Как достигается**

  Производительность       Search API: p50 \< 100ms, p99 \< 500ms при 1000 RPS                     Qdrant in-memory index + Redis cache для популярных запросов + CDN для статики

  Доступность              99.9% uptime для Search API (допустимо 8.7ч downtime/год)               Horizontal scaling + health checks + автоматический failover + multi-region deployment

  Масштабируемость         10M+ агентов в индексе без деградации поиска                            Qdrant horizontal sharding + PostgreSQL read replicas + distributed crawlers

  Задержка краулинга       Новый ERC-8004 агент появляется в поиске \< 5 минут после регистрации   Event-driven crawler: слушает WebSocket события на-чейн → немедленный crawl

  Репутация immutability   Reputation scores нельзя изменить без on-chain транзакции               ICP canister без admin key --- единственный способ обновить score это верифицированная транзакция

  Конфиденциальность       Приватные агенты не индексируются                                       Только публично доступные endpoint. GDPR compliance: право на удаление из индекса.

  API совместимость        Обратная совместимость API минимум 12 месяцев после major версии        Versioned API (/v1/, /v2/), deprecation notices за 90 дней
  ------------------------ ----------------------------------------------------------------------- ---------------------------------------------------------------------------------------------------

**10. Роадмап запуска**

  ----------------- ------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------ -----------------------------------------------------------
  **Версия**        **Срок**      **Что включено**                                                                                                                                             **Milestone**

  v0.1 --- Alpha    Неделя 1--2   ERC-8004 + MCP краулеры. Базовый keyword search. REST API /find и /register. PostgreSQL storage. 127K+ агентов проиндексировано.                             Первые агенты в Registry. API работает.

  v0.5 --- Beta     Неделя 3--4   Семантический поиск (BGE-M3 + Qdrant). Reputation score (v1, без ICP). Web Dashboard (read-only). Wallet Adapter auto-registration. Claim Your Agent flow.   Semantic search работает. Первые claimed агенты.

  v1.0 --- Launch   Месяц 2       Fetch.ai краулер (2M+). ICP Reputation Canister. Security Badge. Endpoint health monitoring. Webhooks. Leaderboard. MCP Server на mcp.paxio.network.         \$13K+ MRR. 2M+ агентов. Первые reputation scores на ICP.

  v1.1              Месяц 3--4    Sybil detection. Похожие агенты. Virtuals/Olas краулеры. Crawl health dashboard. A2A official integration (Linux Foundation).                                AAIF submission. Enterprise pilots.

  v1.2              Месяц 5--6    Dispute mechanism. Verified Developer badge. Multi-endpoint агенты. Private Registry для Enterprise.                                                         Enterprise contracts. AAIF project proposal.

  v2.0              Месяц 9--12   Universal Registry как AAIF open standard. MIT лицензия. External implementations на других стеках.                                                          Universal Registry = стандарт AAIF. Open source.
  ----------------- ------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------ -----------------------------------------------------------

## §4 Taxonomy & Attribute Schema (M-L1-taxonomy update)

Эта секция обновляет §4 Agent Card до v3 после M-L1-taxonomy
(2026-04-30). Полная спецификация — `packages/types/src/agent-card.ts`,
SQL — `packages/contracts/sql/003_taxonomy.sql`, тесты —
`tests/agent-card-taxonomy.test.ts`.

### §4.1 Принцип категоризации — единый критерий

Категория = область в которой агент создаёт ценность, а не технический
способ которым он это делает. Bitcoin не категория — это атрибут (фильтр
по `wallet.status` + `payment.accepts`). Точно так же x402 — фильтр, не
категория.

11 categories:

| Категория | Что входит |
|---|---|
| Finance | trading, DCA, portfolio, payments, invoice, payroll, yield |
| Legal & Compliance | contract review, EU AI Act, GDPR, KYA, regulatory translation |
| Security | OWASP scan, Guard, secrets detection, fraud, AML, threat modeling |
| Developer | code review, CI/CD, GitHub, docs gen, dependency audit |
| Data & Research | web search, data feeds, price oracles, market research, scraping |
| Infrastructure | databases, cloud, monitoring, DevOps, storage |
| Productivity | email, calendar, CRM, task management, workflow automation |
| AI & ML | model training, eval, fine-tuning, prompt optimisation |
| Language | translation, transcription, localisation, multilingual |
| Entertainment | gaming NPCs, AI streamers, social media, virtual characters |
| Customer Experience | tier-1 support, onboarding, feedback, chatbots |

### §4.2 Source enum — каноническая kebab-форма

Storage column хранит canonical kebab values; frontend renders via
`AGENT_SOURCE_LABELS` mapping (`erc8004` → `ERC-8004`, `mcp` → `MCP`,
`fetch` → `Fetch.ai`, etc.).

| Canonical | Display | Origin |
|---|---|---|
| paxio-native | paxio-native | direct POST /registry/register |
| erc8004 | ERC-8004 | Base/Mainnet on-chain registry contracts |
| a2a | A2A | Google Agent2Agent (.well-known/agent.json) |
| mcp | MCP | Model Context Protocol servers (Smithery + Anthropic catalog + glama.ai + awesome-mcp + npm-mcp via external_id) |
| fetch | Fetch.ai | Fetch.ai Agentverse REST API |
| virtuals | Virtuals | Virtuals Protocol ACP registry |
| eliza | ElizaOS | ElizaOS framework agents (a16z) |

Migration 003 backfills `native` → `paxio-native` and `fetch-ai` → `fetch`.
Both legacy aliases retained as Zod-acceptable values for one milestone
window then removed.

### §4.3 Framework enum — что под капотом (10 values)

`framework`: `langchain | crewai | autogen | eliza | llamaindex | vercel-ai | autogpt | paxio-native | custom | unknown`

Орthogonal к `source`. LangChain agent может быть зарегистрирован в
Smithery (source=mcp) или прямо в Paxio (source=paxio-native).

### §4.4 9 attribute groups (Agent Card v3)

Полная карточка агента состоит из 9 семантических групп. Каждая группа
имеет соответствующий ZodObject sub-schema (re-exported из
`packages/types/src/agent-card.ts`).

**Group 1 — Identification**: did, name, description, version, endpoint,
source, externalId, sourceUrl, createdAt, updatedAt, crawledAt, claimed,
owner.

**Group 2 — Capabilities**: category (1 из 11), capabilities[] (free
tags), inputTypes[], outputTypes[], languages[] (ISO 639-1), framework
(1 из 10).

**Group 3 — Wallet**: status (`paxio-native | external | none`),
addresses{btc?,usdc?,eth?,sol?}, verified (challenge-response).

**Group 4 — Payment**: accepts[] (rails: x402, usdc-base, btc-l1,
btc-lightning, stripe-mpp, icp, tap), preferred, facilitator (paxio,
coinbase, skyfire, stripe, self, unknown), facilitatorVerified, pricing
(perCall/perToken/currency/model).

**Group 5 — Performance / SLA**: p50Ms, p95Ms, p99Ms, uptime30d,
lastChecked. **Verified by Paxio** (Endpoint Prober каждые 5 мин), не
агентом.

**Group 6 — Reputation + Security**: reputation (score 0-1000, txCount,
deliveryRate, disputeRate — хранится в DKI canister, unforgeable);
security (owaspScore 0-1, badgeLevel `gold|silver|bronze|none`,
lastScanned, guardConnected, guardIncidents30d).

**Group 7 — Compliance**: euAiAct (`certified | in_progress | none`),
euAiActExpires, owaspCert, iso42001 (% coverage), kyaCert, dataHandling
(`no-storage | ephemeral | logged`).

**Group 8 — Ecosystem**: network (`ethereum | base | solana | icp |
fetch | none`), chainId, erc8004TokenId, openSource (URL or null),
compatibleClients[] (`['claude', 'cursor', 'windsurf']`).

**Group 9 — Developer**: name, verified (challenge), url.

### §4.5 Что заполняет кто

| Группа | Кто заполняет | Верифицируем |
|---|---|---|
| Identification | Агент / краулер | DID через challenge-response |
| Capabilities | Разработчик при регистрации | Auto-fill из endpoint если есть SDK |
| Wallet | SDK автоматически | Challenge-response подпись |
| Payment | Разработчик + FAP данные | facilitatorVerified — только через реальные txn |
| SLA | Мы (Endpoint Prober каждые 5 мин) | Не агент — мы сами меряем |
| Reputation | DKI canister (накапливается) | On-chain, unforgeable |
| Security | Security Scanner ($3 за скан) | Наш Guard Agent |
| Compliance | Complior Agent | Наш Compliance Agent |
| Ecosystem | Краулер из источника | По источнику краулинга |

### §4.6 UI surface

**Cards (compact)**: name · source badge · security badge · category ·
price · reputation bar · wallet status · verified ✓

**Profile (full)**: всё + tabs (Capabilities, Security, Compliance,
History, Reviews)

**Filters**: SOURCE · CATEGORY · WALLET · PAYMENT · VERIFIED · FRAMEWORK ·
COMPATIBLE_CLIENTS

**Bloomberg-style table**: name/DID · source · wallet/rails · vol-24h ·
success% · reputation · uptime/p50 · guard · drift · trend

---

**Paxio · Universal Registry**

Identity Layer · OS Слой 1 из 5

paxio.network · Financial OS for the Agentic Economy
