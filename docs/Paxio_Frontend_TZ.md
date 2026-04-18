**Paxio**

**Техническое задание**

Frontend разработчику

3 домена · 25+ страниц · v1.0 · Апрель 2026

paxio.network · Берлин · Конфиденциально

**0. Задача и контекст**

  -------------------------------------------------------------------------------------------
  **ЗАДАЧА В ОДНОМ ПРЕДЛОЖЕНИИ**

  Создать три взаимосвязанных web-продукта (маркетинговый сайт, приложение и документация),

  которые переводят сложную финансовую OS для AI агентов на язык понятный трём аудиториям:

  разработчикам, enterprise-командам и широкой публике.
  -------------------------------------------------------------------------------------------

**Что такое Paxio**

Paxio --- Financial OS для AI агентов. Пять слоёв инфраструктуры которые превращают любого AI агента в экономического актора: Identity (реестр агентов), Payment (мультипротокольные платежи), Trust (кошелёк + безопасность + Bitcoin), Compliance (EU AI Act) и Intelligence (данные и аналитика агентной экономики).

Ключевое: Paxio не конкурирует с Coinbase x402, Stripe или Skyfire. Paxio --- OS-слой над всеми ними. Разработчик интегрируется один раз и получает доступ ко всем протоколам, некастодиальный BTC L1 кошелёк, security protection и compliance автоматически.

**Три аудитории --- три разных сообщения**

  ------------------------------ ---------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------- -------------------------------------------------------------------------------------
  **Аудитория**                  **Кто это**                                                                                                            **Их боль**                                                                         **Что мы им говорим**

  Разработчик агентов            Индивидуальный разработчик или небольшая команда. Написал агента --- хочет монетизацию. Знает TypeScript или Python.   Нет кошелька. Не знает рыночную цену. Нет security. Нет compliance.                 npm install \@paxio/sdk → 60 секунд → агент принимает USDC, BTC и 7 протоколов.

  Enterprise                     CTO или CISO компании деплоящей 10-100+ агентов. EU AI Act enforcement --- реальная угроза.                            Нет audit trail. Нет compliance. Нет fleet visibility. Штрафы до €35M.              Весь fleet под наблюдением. EU AI Act certification. Immutable audit trail на DKI.

  Builder / VC / Исследователь   Строит платформу поверх агентов. VC следящий за сектором. Журналист. Researcher.                                       Нет данных о рынке агентов. Нет pricing benchmarks. Нет ecosystem health metrics.   Paxio Radar: live данные агентной экономики. Capability Tickers. Ecosystem indices.
  ------------------------------ ---------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------- -------------------------------------------------------------------------------------

**1. Дизайн-система и принципы**

**Ценности которые передаёт визуал**

  ------------------------------- --------------------------------------------------------------------------------------------------------------------------
  **Ценность**                    **Как передаём визуально**

  Надёжность и серьёзность        Тёмная палитра с deep navy (#1A1A2E) как основа. Строгая типографика. Минимализм в деталях. Никаких игривых иллюстраций.

  Технологическое превосходство   Монospace шрифт для кода и DID. Терминальная эстетика в некоторых компонентах. Данные и цифры на виду.

  Финансовая точность             Таблицы и данные выровнены по правому краю (как Bloomberg). Статусы: зелёный/жёлтый/красный строго семантичны.

  Открытость экосистемы           Source badges (ERC-8004, Fetch.ai, MCP) с разными цветами. Registry показывает разнообразие.

  Bitcoin-native                  Золотой акцент (#D97706) появляется только там где BTC. Не разбрасываем его.
  ------------------------------- --------------------------------------------------------------------------------------------------------------------------

**Цветовая палитра**

  ----------------- ---------- ------------------------------------------------------
  **Токен**         **HEX**    **Применение**

  primary           #0F3460    Основной фирменный цвет. Заголовки, кнопки, акценты.

  dark              #1A1A2E    Фон тёмного режима. Основной текст на светлом.

  accent / purple   #533483    Intelligence Layer, Intelligence Dashboard, индексы.

  teal              #0F766E    Registry, Compliance Layer, успешные статусы.

  red               #991B1B    Security Layer, Guard Agent, алерты, блокировки.

  bitcoin / gold    #D97706    Только Bitcoin. DCA Agent, Escrow, BTC баланс.

  navy              #1E3A5F    Wallet, Trust Layer, DKI компоненты.

  orange            #C2410C    Предупреждения, HOLD статусы, средний приоритет.

  green             #166534    Успех, APPROVE, verified badge, доходы.

  lightGray         #F4F4F6    Фон карточек, зебра-таблицы.
  ----------------- ---------- ------------------------------------------------------

**Типографика**

  --------------------------------- ---------------------------------------------------- ---------- --------------------
  **Применение**                    **Шрифт**                                            **Вес**    **Размер**

  Дисплейные заголовки (Hero, H1)   Geist (Vercel) или Syne --- геометрический гротеск   700--800   48--96px

  Заголовки секций (H2, H3)         Geist / Syne                                         600--700   24--40px

  Основной текст                    Geist или IBM Plex Sans                              400        16--18px

  Код, DID, адреса                  JetBrains Mono или Geist Mono                        400--500   13--15px

  Метки, badges, статусы            Geist / IBM Plex Sans                                500--600   11--13px

  Числа и метрики (Dashboard)       JetBrains Mono (tabular nums)                        400--600   14--32px
  --------------------------------- ---------------------------------------------------- ---------- --------------------

**Режим интерфейса**

Основной режим --- тёмный (dark mode) для App и Docs. Маркетинговый сайт (paxio.network) --- светлый с тёмными секциями. Переключатель тёмный/светлый только на App.

**Технический стек**

  --------------------- -------------------------------------------- --------------------------------------------------------------------------------
  **Категория**         **Технология**                               **Обоснование**

  Framework             Next.js 15 (App Router)                      SSR для SEO (landing). RSC для перформанса. Единый стек для всех трёх доменов.

  Стилизация            Tailwind CSS 4 + CSS Variables               Быстро, консистентно, легко кастомизировать под дизайн-систему.

  UI компоненты         Radix UI (unstyled primitives) + кастомные   Accessible by default. Никаких чужих стилей которые нужно переопределять.

  Анимации              Framer Motion                                Для page transitions, chart animations, стаггеред reveals.

  Графики и данные      Recharts или Tremor                          Для Intelligence Dashboard, Registry analytics, Bitcoin charts.

  Иконки                Lucide React                                 Консистентный набор. Строгий стиль.

  Форматирование кода   Shiki (syntax highlight)                     Для Docs и code snippets в Landing.

  Деплой                Vercel                                       Edge functions, analytics, preview deployments.

  Auth (App)            Privy или Clerk                              Web3-first auth: wallet connect + email magic link.
  --------------------- -------------------------------------------- --------------------------------------------------------------------------------

**2. Три домена --- архитектура**

  -------------------- ---------------------------------------------------------------- ------------------------------------------------------- -------------------------------
  **Домен**            **Назначение**                                                   **Главная аудитория**                                   **Приоритет**

  paxio.network        Маркетинговый сайт. Конвертация в signup, docs, app.             Все --- первое касание. Разработчики, Enterprise, VC.   🔴 Неделя 2 --- Launch

  app.paxio.network    Основное приложение. Registry, Dashboard, Walletам, Analytics.   Разработчики агентов. Enterprise teams.                 🔴 Неделя 4 --- Beta

  docs.paxio.network   Документация. Getting started, API reference, guides.            Разработчики --- интеграция и onboarding.               🔴 Неделя 3 --- First version
  -------------------- ---------------------------------------------------------------- ------------------------------------------------------- -------------------------------

**3. paxio.network --- Маркетинговый сайт**

Маркетинговый сайт --- первое касание с продуктом. Цель: конвертировать посетителя в одно из трёх действий: установить SDK, прочитать документацию, записаться в waitlist/demo. Сайт не продаёт features --- он продаёт трансформацию: «твой агент из инструмента становится экономическим актором».

+-----------------------------------------------------------------------+
| **paxio.network** /                                                   |
|                                                                       |
| **Home --- Главная страница**                                         |
+-----------------------------------------------------------------------+

**Секция 1 --- Hero**

Полный экран. Тёмный фон. Центрированный контент.

  ---------------------------------------------------------------------------
  **ТЕКСТ**

  HEADLINE (H1, крупно):

  «Financial OS for AI Agents»

  SUBHEADLINE:

  «Give your agent an identity, a wallet, and the ability to earn ---

  in 60 seconds.»

  CTA КНОПКИ (две):

  \[Get Started →\] (primary, ведёт на docs.paxio.network/quickstart)

  \[Explore the Registry\] (secondary, ведёт на app.paxio.network/registry)

  КОД-СНИППЕТ под кнопками (терминальная эстетика):

  npm install \@paxio/sdk

  \# Your agent can now earn, pay, and be trusted.
  ---------------------------------------------------------------------------

Фон: анимированный граф агентов --- узлы соединяются линиями (particles.js или custom canvas). Показывает «сеть» --- Registry, Payment flows между агентами. Медленно, атмосферно. Не отвлекает от текста.

**Секция 2 --- Социальное доказательство (сразу под Hero)**

  -----------------------------------------------------------------------
  **ТЕКСТ**

  Live stats (обновляются в реальном времени из API):

  \[2,400,000+\] agents indexed \[37,000+\] ERC-8004 agents

  \[7,000+\] MCP servers \[↑ live\] transactions today

  Логотипы экосистем (source badges):

  Fetch.ai · Ethereum ERC-8004 · Virtuals · Smithery MCP ·

  LangChain · CrewAI · ElizaOS · A2A
  -----------------------------------------------------------------------

**Секция 3 --- Проблема (без заголовка «Проблема»)**

  -----------------------------------------------------------------------------------------
  **ТЕКСТ**

  «Your agent can do anything. But it can\'t get paid.»

  Три карточки слева направо (pain points):

  ❶ «No wallet. No identity. No way to earn.»

  Agents have capabilities. They have no financial existence.

  ❷ «7 payment protocols. None of them talk to each other.»

  x402, Stripe MPP, Bitcoin L1, Visa TAP --- every ecosystem speaks a different language.

  ❸ «EU AI Act enforcement started. Are your agents compliant?»

  €35M fines. No tools designed for agents.
  -----------------------------------------------------------------------------------------

**Секция 4 --- Решение: 5 слоёв OS**

  --------------------------------------------------------------------------
  **ТЕКСТ + ВИЗУАЛ**

  ЗАГОЛОВОК: «One integration. Five layers of infrastructure.»

  Интерактивный стек (click/hover на каждый слой → раскрывается описание):

  ┌─────────────────────────────────────────────┐

  │ 5. Intelligence │ Market data · Fraud API · Oracle Network │

  ├─────────────────────────────────────────────┤

  │ 4. Compliance │ EU AI Act · ISO 42001 · OWASP Cert │

  ├─────────────────────────────────────────────┤

  │ 3. Trust │ Wallet · Guard Agent · Bitcoin (9 agents)│

  ├─────────────────────────────────────────────┤

  │ 2. Payment │ x402 · Stripe · Visa · BTC · 7 protocols │

  ├─────────────────────────────────────────────┤

  │ 1. Identity │ Universal Registry · 2.5M+ agents │

  └─────────────────────────────────────────────┘

  Hover на каждый слой: справа появляется code snippet как подключить.
  --------------------------------------------------------------------------

**Секция 5 --- Как это работает (для разработчика)**

  -------------------------------------------------------------------------
  **ТЕКСТ**

  ЗАГОЛОВОК: «From zero to earning agent in 3 steps.»

  Три колонки с номерами:

  1\. Install

  npm install \@paxio/sdk

  Your agent gets a DID, a BTC address, and a USDC wallet.

  2\. Register

  paxio.inject(app)

  Your agent appears in the Universal Registry.

  Other agents can find and hire it.

  3\. Earn

  Any agent pays yours: x402, Stripe MPP, Bitcoin, or any of 7 protocols.

  You receive USDC or BTC. No custodian. No intermediary.
  -------------------------------------------------------------------------

**Секция 6 --- Три входа в OS (три аудитории)**

  -----------------------------------------------------------------------
  **ТЕКСТ**

  ЗАГОЛОВОК: «Built for every role in the agentic economy.»

  Три карточки (tabs или горизонтальный scroll на mobile):

  DEVELOPERS

  «Give your agent a financial identity in 60 seconds.»

  npm install \@paxio/sdk → wallet.inject(app) → done.

  Supports: TypeScript, Python, Go, Rust, MCP, HTTP Proxy.

  \[Get started →\]

  ENTERPRISE

  «Full compliance for your AI fleet.»

  EU AI Act certification. Immutable audit trail.

  Fleet visibility. 18 months of compliance history.

  \[Book a demo →\]

  ON-CHAIN AGENTS

  «DeFi agents can now pay off-chain agents.»

  Yearn, Aave, Gelato --- finally connected to the agentic economy.

  No HTTP endpoint required.

  \[Learn more →\]
  -----------------------------------------------------------------------

**Секция 7 --- Seed Economy агенты (live)**

  -----------------------------------------------------------------------
  **ТЕКСТ**

  ЗАГОЛОВОК: «Agents already working in the Paxio ecosystem.»

  Три карточки агентов (live данные из API):

  🛡️ PAXIO GUARD

  «ML security for AI agents.»

  did:paxio:guard-agent

  11 threat classifications · \<200ms · \$0.0001/check

  \[View agent →\]

  📋 COMPLIOR

  «EU AI Act compliance certification.»

  did:paxio:complior-agent

  108 EU AI Act obligations · \$10--50/scan

  \[View agent →\]

  ₿ BITCOIN DCA AGENT

  «Autonomous BTC accumulation for agents.»

  did:paxio:btc-dca

  0.5% fee · USDC→BTC L1 · Non-custodial

  \[View agent →\]
  -----------------------------------------------------------------------

**Секция 8 --- Bitcoin L1 (уникальность)**

  -----------------------------------------------------------------------
  **ТЕКСТ**

  ЗАГОЛОВОК: «The only non-custodial Bitcoin L1 for AI agents.»

  Краткое объяснение в двух колонках:

  СЛЕВА --- проблема:

  «\$1.7 trillion in Bitcoin. Zero of it accessible to AI agents.»

  Coinbase = custodial. Lightning = L2. Everyone else = USDC.

  СПРАВА --- решение:

  «Paxio uses Distributed Key Infrastructure (DKI).

  Your agent gets a real bc1q\... Bitcoin address.

  No custodian. Not even Paxio holds the keys.»

  Визуал: анимированная схема threshold signing ---

  13+ узлов, ни один не держит ключ целиком.
  -----------------------------------------------------------------------

**Секция 9 --- Paxio Radar (preview)**

  ------------------------------------------------------------------------------------
  **ТЕКСТ**

  ЗАГОЛОВОК: «Intelligence for the agentic economy.»

  Live preview (embedded, read-only):

  Capability Tickers: LEGAL-TRANS-EN-DE \$0.0041 ▲2.3% \| CODE-REVIEW \$0.0089 ▼0.8%

  Active agents: \[live counter\]

  Transaction volume (24h): \[live counter\]

  \[Explore Paxio Radar →\] (ведёт на app.paxio.network/radar)
  ------------------------------------------------------------------------------------

**Секция 10 --- Pricing**

Три колонки. Без хитрых условий --- простые цены.

  -----------------------------------------------------------------------
  **ТЕКСТ**

  FREE

  \@paxio/sdk open source

  Universal Registry --- indexed automatically

  x402 payments (up to 1K txn/month free via Coinbase)

  Guard API --- 500 calls/month

  Compliance GitHub Action

  \[Get started free →\]

  WALLET PRO --- \$29/month per agent

  Everything in Free

  Unlimited payment routing

  Security Sidecar + Guard monitoring

  Wallet Dashboard

  Bitcoin DCA/Escrow/Streaming agents

  \[Start free trial →\]

  ENTERPRISE --- from \$299/month

  Everything in Pro

  EU AI Act certification

  Fleet Intelligence Dashboard

  SOC 2 evidence package

  Dedicated support

  \[Book a demo →\]
  -----------------------------------------------------------------------

**Секция 11 --- Footer**

  -----------------------------------------------------------------------
  **КОНТЕНТ**

  LOGO + tagline: «Financial OS for the Agentic Economy»

  Колонки ссылок:

  Product: Registry, Wallet, Security, Compliance, Intelligence

  Developers: Docs, SDK (@paxio/sdk), GitHub, Changelog

  Company: About, Blog, Careers (Berlin), Contact

  Legal: Privacy, Terms

  Внизу: «Built in Berlin · paxio.network · 2026»

  Status page: status.paxio.network

  Newsletter signup (email field + subscribe)
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **paxio.network** /about                                              |
|                                                                       |
| **About --- О нас**                                                   |
+-----------------------------------------------------------------------+

Миссия: «We\'re building the financial infrastructure for autonomous AI agents --- so agents can earn, pay, and be trusted without human intermediaries.»

Команда: фото + bio. Берлин, 2026. Если нет фото --- illustrated avatars.

Инвесторы и партнёры: логотипы + one-liners. AAIF Silver Member badge.

Open positions: список вакансий с кнопкой Apply.

+-----------------------------------------------------------------------+
| **paxio.network** /blog                                               |
|                                                                       |
| **Blog --- Статьи**                                                   |
+-----------------------------------------------------------------------+

Список статей: карточки с preview image, заголовок, дата, теги, время чтения.

Первые статьи: «How DKI enables non-custodial Bitcoin for AI agents», «Building your first earning agent in 60 seconds», «EU AI Act: what it means for your AI deployment».

Статья: полноширинный layout, серьёзная типографика. Sidebar: table of contents + newsletter CTA.

+-----------------------------------------------------------------------+
| **paxio.network** /pricing                                            |
|                                                                       |
| **Pricing --- Цены**                                                  |
+-----------------------------------------------------------------------+

Детальная страница ценообразования. Toggle: Monthly / Annual (Annual = 2 месяца бесплатно). FAQ accordion под таблицей: «Can I use Paxio without a wallet?», «What is DKI?», «How does compliance certification work?».

**4. app.paxio.network --- Приложение**

Основное приложение. Тёмный режим по умолчанию. Left sidebar navigation. Авторизация: wallet connect (MetaMask, Privy) + email magic link. Неавторизованные пользователи могут читать Registry Explorer --- всё остальное требует auth.

**Навигация (left sidebar)**

  -------------------------------------------------------------------------
  **СТРУКТУРА САЙДБАРА**

  PAXIO \[logo\]

  Registry

  🔍 Explore Agents

  ⭐ Watchlist

  My Agents

  📊 Dashboard

  💰 Earnings

  🛡️ Security

  Wallet

  💳 Balances

  📋 Transactions

  ₿ Bitcoin Agents

  Compliance

  📜 Certifications

  🏛️ Fleet (Enterprise)

  Intelligence

  📡 Paxio Radar

  📈 Market Data \[Pro\]

  --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

  ⚙️ Settings

  📖 Docs ↗

  \[avatar\] Username · Plan badge
  -------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /registry                                       |
|                                                                       |
| **Registry Explorer**                                                 |
+-----------------------------------------------------------------------+

**Назначение**

Главный discovery tool Paxio OS. Разработчик находит агента которого хочет нанять. VC оценивает рынок. Платформа строит pipeline из агентов.

**Функциональность**

  -------------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  ПОИСК (natural language, prominent):

  «Find an agent that translates legal documents EN→DE and accepts USDC»

  \[🔍 Search agents\...\]

  ФИЛЬТРЫ (sidebar или chips сверху):

  Source: All · ERC-8004 · Fetch.ai · Virtuals · MCP · paxio-native

  Capability: \[multiselect или tag input\]

  Payment: USDC · BTC · Any

  Security Badge: Gold · Silver · Bronze · Any

  Price range: \$0 → \$∞ (slider)

  Reputation: \>800 / \>900 / Any

  СОРТИРОВКА: Relevance · Reputation ↓ · Price ↑ · Newest · Most Active

  КАРТОЧКА АГЕНТА (grid layout, 3 колонки desktop):

  \[Icon/avatar\] \[Name\] \[Source badge: ERC-8004 / Fetch.ai / paxio-native\]

  DID: did:paxio:guard-agent \[copy button\]

  Capabilities: \[tag chips\]

  Price: \$0.0001/call или \$3/scan или 0.5%

  Reputation: ████████░░ 847/1000 \[verified green если ≥850\]

  Security: \[Gold badge icon\] или \[Silver\] или \[---\]

  \[View Details →\] \[Hire →\]
  -------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /registry/\[did\]                               |
|                                                                       |
| **Agent Profile --- Профиль агента**                                  |
+-----------------------------------------------------------------------+

  -------------------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  HEADER:

  \[Avatar\] Name Source badge Verified checkmark (если верифицирован)

  DID: did:paxio:translator:0x1a2b \[copy\]

  \[Hire this agent\] \[Add to watchlist ☆\]

  ТАБЫ: Overview · Capabilities · Pricing · Security · Compliance · History

  OVERVIEW TAB:

  Description (из Agent Card v2)

  Stats row: Reputation 847 · Transactions 12,483 · Avg response 340ms · Uptime 99.7%

  Accepts: \[payment protocol badges\]

  Developer: \[did or address\] Source ecosystem: Fetch.ai

  CAPABILITIES TAB:

  Список capabilities с описанием и pricing каждой

  Input/Output types. SLA: p50/p95/p99 latency.

  SECURITY TAB:

  OWASP Score: 0.12 / 1.0 \[Gold Badge\]

  Last scanned: 3 days ago

  Score breakdown: LLM01-LLM10 individual scores (bar chart)

  Incidents (90 days): 0

  COMPLIANCE TAB:

  EU AI Act: ✅ Certified \[PDF download\] Expires: Oct 2026

  ISO 42001: 🟡 In progress

  OWASP Certificate: ✅ QR code для верификации

  HISTORY TAB:

  График reputation по времени (line chart)

  Transaction volume по времени (bar chart)

  Recent reviews (от других агентов)
  -------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /dashboard                                      |
|                                                                       |
| **Developer Dashboard**                                               |
+-----------------------------------------------------------------------+

  ---------------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  HEADER STATS ROW (4 крупных цифры):

  Total Earnings (30d) \| Active Agents \| Avg Reputation \| Transactions (30d)

  МОИ АГЕНТЫ (таблица):

  Name · DID · Status \[Active/Paused\] · Reputation · Revenue (30d) · \[Manage\]

  Кнопка \[+ Register New Agent\]

  REVENUE CHART:

  Line chart: ежедневный доход за 30 дней

  Breakdown по агентам (разные цвета)

  Toggle: Daily / Weekly / Monthly

  CAPABILITIES GAP ALERTS (справа):

  «You offer legal-translation EN→DE.

  340 unfilled requests for EN→FR this week.

  Estimated revenue: \~\$180/month»

  \[Explore opportunity →\]

  REVENUE OPTIMIZATION (справа):

  «Your price: \$0.003 Market median: \$0.0051

  Your delivery rate: top 15%

  Recommendation: raise to \$0.0045»

  \[Update pricing →\]
  ---------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /dashboard/\[agent-id\]                         |
|                                                                       |
| **Agent Management --- Управление агентом**                           |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  ТАБЫ: Overview · Pricing · Security · Earnings · Settings

  OVERVIEW:

  Reputation trend (90 дней). ETA до следующего badge level.

  Audience breakdown: frameworks (LangChain 45%, CrewAI 23%), geography, protocols.

  Active transactions today.

  PRICING TAB:

  Текущие цены по каждой capability.

  Market benchmark для каждой (p25/p50/p75).

  Редактор цен. \[Save changes\]

  SECURITY TAB:

  OWASP score + trend.

  \[Run Security Scan \$3\]

  \[Download OWASP Certificate\]

  Guard events log: последние 30 Guard classifications.

  EARNINGS TAB:

  Revenue по capability breakdown.

  По payment protocol breakdown.

  Pending withdrawals.

  \[Withdraw to BTC address\] \[Withdraw to USDC\]
  -----------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /wallet                                         |
|                                                                       |
| **Wallet Dashboard**                                                  |
+-----------------------------------------------------------------------+

  ------------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  BALANCES (top cards):

  ₿ Bitcoin (BTC L1) ████████ 0.00234 BTC ≈ \$187.20

  ◎ USDC (Base) ████████ \$1,234.56

  Ξ ETH ████████ 0.0891 ETH

  ck ckBTC ████████ 0.00156 ckBTC

  SECURITY STATUS:

  Security Sidecar: \[Active ✅\]

  Guard Agent: \[Connected ✅\] Last check: 2 min ago

  Daily budget: \$500 used / \$2,000 limit \[████░░░░░░ 25%\]

  \[Edit limits →\]

  RECENT TRANSACTIONS:

  Таблица: Date · Agent · Amount · Protocol · Status \[APPROVED/HOLD/BLOCKED\]

  HOLD транзакции выделены оранжевым с \[Review\] кнопкой

  BLOCKED транзакции --- красным с \[Details\] кнопкой

  SEND PAYMENT:

  To DID or address. Amount. Asset. \[Review & Send\]

  Pre-flight: Guard check + Sidecar pre-approval показывается до отправки.

  FORENSICS TRAIL:

  \[Download Audit Log (PDF)\] \[Download (JSON)\]

  Last 10 security decisions с reason.
  ------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /wallet/bitcoin                                 |
|                                                                       |
| **Bitcoin Agents Dashboard**                                          |
+-----------------------------------------------------------------------+

  ----------------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  9 карточек Bitcoin агентов. Каждая карточка:

  Название · Status (Active/Paused/Pending) · Accumulated BTC · Fees paid

  \[Configure\] \[Pause\] \[Details\]

  DCA AGENT detail:

  График: BTC накоплено по времени (area chart, gold цвет)

  Следующая покупка: через 3 дня · \$100 USDC → BTC

  История: таблица покупок: Date · USDC Spent · BTC Received · BTC Price · Tx Hash

  \[Edit schedule\] \[Pause\] \[Withdraw BTC\]

  ESCROW detail:

  Активные escrow: Counterparty DID · Amount · Status · Timeout

  \[Create new escrow\] \[Release / Dispute\]

  STREAMING detail:

  Active streams: To agent · Rate · Elapsed · Earned

  \[Start stream\] \[Stop stream\]
  ----------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /security                                       |
|                                                                       |
| **Security Dashboard**                                                |
+-----------------------------------------------------------------------+

  ---------------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  ECOSYSTEM SECURITY STATUS (header):

  Guard Agent: \[Online ✅\] Qwen 7B + PromptGuard 2 + LLM Guard

  Calls today: 12,483 · Threats blocked: 47 · Avg latency: 142ms

  МОИ АГЕНТЫ --- SECURITY OVERVIEW:

  Таблица: Agent · OWASP Score · Badge · Last Scan · Incidents (30d) · \[Action\]

  Агенты без Gold badge подсвечены жёлтым

  THREAT FEED (live):

  «New injection pattern detected --- 23 agents at risk» \[Details\]

  «Secrets leak attempt blocked on did:paxio:translator» \[Details\]

  Format: время · тип угрозы · статус · affected агент

  SCAN AGENT:

  Dropdown: выбрать агента

  \[Run OWASP Scan \$3\] \[Run Secrets Scan \$2\] \[Full Scan \$7\]

  Last scan results: breakdown по LLM01-LLM10

  GUARD LOGS:

  Последние 50 Guard classifications.

  Фильтр: All / Blocked / Suspicious / Clean

  Каждая запись: timestamp · input preview · task · result · confidence
  ---------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /compliance                                     |
|                                                                       |
| **Compliance Dashboard**                                              |
+-----------------------------------------------------------------------+

  ---------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  COMPLIANCE STATUS (header):

  EU AI Act Enforcement: ACTIVE since Aug 2026

  Your fleet: 3 agents certified · 1 in progress · 0 non-compliant

  CERTIFICATIONS TABLE:

  Agent · Standard · Status · Issued · Expires · \[Download PDF\] \[Renew\]

  EU AI Act: ✅ Certified / 🟡 In Progress / ❌ Not certified

  OWASP Certificate: ✅ Gold / 🟡 Silver / ❌ None

  ISO 42001: \[coverage %\]

  QUICK ACTIONS:

  \[Run EU AI Act Scan \$50\] \[Generate FRIA \$30\]

  \[Technical Documentation \$20\] \[KYA Certificate \$15\]

  COMPLIANCE TIMELINE (Enterprise):

  Visual timeline до следующих EU AI Act deadlines.

  «Your fleet compliance: 78% · Needed: 100% by Dec 2026»

  AUDIT PACKAGE:

  \[Download full compliance package (ZIP)\]

  Includes: passports + evidence chain + all certificates
  ---------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /radar                                          |
|                                                                       |
| **Paxio Radar --- Ecosystem Feed**                                    |
+-----------------------------------------------------------------------+

Частично открытая страница. Базовые метрики без авторизации. Детальные данные --- за подпиской.

  ------------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  LIVE COUNTERS (top row, крупно, анимированы):

  Agents indexed: 2,483,921 ↑ \| Active (24h): 48,291 \| Txns (24h): 1,204,883

  CAPABILITY TICKERS (scrolling ticker tape, как Bloomberg):

  LEGAL-TRANS-EN-DE \$0.0041 ▲2.3% \| CODE-REVIEW-SOL \$0.0089 ▼0.8% \| \...

  PAXIO AI ECONOMY INDICES:

  PAEI \[Agent Economy\] 1,284.7 ▲0.8%

  Legal AI Index 892.1 ▼0.3%

  DeFi Agent Index 2,104.5 ▲3.2%

  Security Score 78.4 ▲1.1%

  \[Compliance Ready\] 61.2 ▲5.4% \[Trend line charts\]

  PROTOCOL ADOPTION CHART:

  Stacked area chart: x402 vs MPP vs BTC vs Visa TAP over time.

  «x402: 67% · BTC: 18% · MPP: 11% · Other: 4%»

  TOP EARNERS LEADERBOARD:

  Rank · Agent name · Capability · Revenue (7d) · Badge

  Top 20 агентов. Public. Вирусная механика.

  BITCOIN AGENT ECONOMY (gold section):

  BTC volume via agents (24h): 0.847 BTC

  Active DCA agents: 312 · Escrow volume: \$84,210

  THREAT ALERT (header banner если активна угроза):

  «⚠️ New attack pattern detected. 47 agents at risk. Guard protecting.»

  \-\-- ПЛАТНЫЙ КОНТЕНТ (Pro+ badge) \-\--

  Capability Heatmap (интерактивная)

  Price Discovery Index --- full 50 capabilities

  Ecosystem Resilience Score
  ------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /intelligence                                   |
|                                                                       |
| **Intelligence Terminal**                                             |
+-----------------------------------------------------------------------+

Pro и Enterprise план. Bloomberg-style интерфейс для серьёзного анализа рынка агентов.

  --------------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  LEFT PANEL --- Navigation:

  Market Data · Fraud API · Developer Analytics · Network Graph · Risk Analytics

  MARKET DATA TAB:

  Capability search + Ticker detail view.

  Chart: price history + volume (candlestick).

  Stats: Market Cap, P/E Ratio, Volatility Index, Demand Growth.

  Capability Screener: фильтр по market cap, demand growth, competition density.

  DEVELOPER ANALYTICS TAB:

  Portfolio: все мои агенты, revenue, rank percentile.

  Revenue Optimization: конкретные рекомендации по ценам.

  Audience breakdown: фреймворки, geography, protocols.

  FRAUD API TAB:

  Agent Risk Score lookup: ввести DID → получить score + explanation.

  Address Risk: ввести BTC/ETH адрес → score.

  Active threat patterns: таблица с типами и частотой.
  --------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **app.paxio.network** /settings                                       |
|                                                                       |
| **Settings --- Настройки**                                            |
+-----------------------------------------------------------------------+

  ----------------------------------------------------------------------------------
  **ЭЛЕМЕНТЫ СТРАНИЦЫ**

  ПРОФИЛЬ:

  DID (readonly). Display name. Email. Plan badge.

  Connected wallets: MetaMask, Privy. \[Add wallet\]

  SECURITY SETTINGS:

  Daily budget limit (per agent). Per-transaction limit.

  Whitelist addresses. Allowed hours.

  Guard sensitivity: Conservative / Balanced / Permissive.

  \[Save policies → applied to DKI Security Sidecar\]

  NOTIFICATIONS:

  Email: Security incidents · Reputation changes · Earnings · Compliance deadlines

  Webhook URL (для enterprise интеграций)

  API KEYS:

  Список активных ключей. \[Create new key\] \[Revoke\]

  Guard API Key (grd\_\...) отдельно.

  PLAN & BILLING:

  Текущий план. Следующий платёж. Usage this month.

  \[Upgrade\] \[Download invoice\]
  ----------------------------------------------------------------------------------

**5. docs.paxio.network --- Документация**

Документация --- критичный продукт. Разработчик принимает решение использовать SDK или нет в первые 5 минут чтения Docs. Стандарт: Stripe Docs (лучшая техническая документация в мире).

**Структура и навигация**

  -----------------------------------------------------------------------
  **ЛЕВЫЙ SIDEBAR**

  Getting Started

  Introduction

  Quickstart (60 seconds)

  Installation

  Authentication

  Core Concepts

  Agent Identity (DID)

  Wallet & Payments

  Security Layer

  Compliance

  Intelligence

  SDK Reference

  \@paxio/sdk (TypeScript)

  paxio-sdk (Python)

  \@paxio/mcp (Claude Code / Cursor)

  \@paxio/proxy (Go / Rust / Java)

  Integrations

  LangChain

  CrewAI

  AutoGen

  ElizaOS

  Vercel AI SDK

  API Reference

  Registry API

  Guard API

  Intelligence API

  FAP (Payment Routing)

  Guides

  Building your first earning agent

  Bitcoin DCA for agents

  EU AI Act compliance

  On-chain DeFi agent payments

  Changelog
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **docs.paxio.network** /quickstart                                    |
|                                                                       |
| **Quickstart --- 60 секунд**                                          |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **КОНТЕНТ СТРАНИЦЫ**

  ЗАГОЛОВОК: «Give your agent a wallet in 60 seconds»

  Step 1 --- Install (5 секунд)

  npm install \@paxio/sdk

  \# or: pip install paxio-sdk

  Step 2 --- Inject (10 секунд)

  import { inject } from \'@paxio/sdk\'

  import Fastify from \'fastify\'

  const app = Fastify()

  await inject(app, { apiKey: process.env.PAXIO_KEY })

  // Your agent now has:

  // ✓ A DID (did:paxio:\...)

  // ✓ A BTC address (bc1q\...)

  // ✓ A USDC address

  // ✓ Auto-registered in Universal Registry

  // ✓ Security Sidecar active

  Step 3 --- Accept payments (15 секунд)

  app.post(\'/task\', async (req, reply) =\> {

  // Payment is verified automatically by Paxio

  const result = await doYourTask(req.body)

  return reply.send(result)

  })

  Step 4 --- Run

  node app.js

  \# Your agent is live. Find it at app.paxio.network/registry

  → What just happened? \[expandable explanation\]

  → Next: Configure pricing \[link\]

  → Next: Set up security policies \[link\]
  -----------------------------------------------------------------------

**6. Общие UI компоненты**

  ------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ -----------------------------------------
  **Компонент**       **Описание**                                                                                                                                                                         **Где используется**

  Agent Card          Карточка агента: avatar/icon, name, DID, source badge, capabilities tags, price, reputation bar, security badge, \[View\] \[Hire\]. Два размера: grid (compact) и list (detailed).   Registry Explorer, Watchlist, Dashboard

  Source Badge        Цветной chip с иконкой экосистемы: ERC-8004 🔵, Fetch.ai 🟠, Virtuals 🟣, MCP ⚫, paxio-native 🟢. Размер S и M.                                                                     Везде где агент

  Security Badge      Gold / Silver / Bronze / None. Иконка щита с цветом. Tooltip: score, дата скана.                                                                                                     Agent Card, Profile, Dashboard

  Reputation Bar      Горизонтальный прогресс-бар 0-1000. Цвет: зелёный \>850, жёлтый 600-849, красный \<600. Число рядом.                                                                                 Agent Card, Profile

  Status Chip         Active 🟢 / Paused 🟡 / Blocked 🔴 / Pending ⚪. Маленький inline chip.                                                                                                              Везде

  Transaction Row     Amount + asset icon + direction (→/←) + counterparty DID (truncated) + timestamp + status chip + \[Details\].                                                                        Wallet, Dashboard

  Metric Card         Большое число + label + change (▲/▼ %) + mini sparkline. 4 в ряд на Desktop.                                                                                                         Dashboard, Radar

  Capability Ticker   LEGAL-TRANS-EN-DE · \$0.0041 · ▲2.3% · Vol: 48K. Monospace шрифт. Цвет изменения.                                                                                                    Radar, Intelligence

  DID Display         did:paxio:name:0x1a2b\... \[copy icon\]. Моноширинный, truncated, tooltip полный.                                                                                                    Везде где DID

  Code Block          Syntax highlighting (Shiki). Copy button. Language label. Dark theme.                                                                                                                Docs, Landing

  Alert Banner        Full-width. Severity: info/warning/critical. Icon + text + \[action\] + \[dismiss\].                                                                                                 Security alerts, Compliance deadlines

  Empty State         Icon + headline + description + CTA. Для пустых таблиц, нет агентов, нет транзакций.                                                                                                 Все пустые состояния
  ------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ -----------------------------------------

**7. Приоритеты запуска**

  --------------- ------------------------------------------------------------------------------------- -------------- -----------------------------------------------------------------------------------
  **Приоритет**   **Что**                                                                               **Срок**       **Критерий готовности**

  🔴 P0           Landing page v1 (paxio.network): Hero + OS layers + Quickstart + Pricing + Footer     Неделя 2       Деплоится на Vercel. Newsletter signup работает. Google Analytics подключён.

  🔴 P0           Developer Docs: /quickstart, Installation, Core Concepts, SDK reference \@paxio/sdk   Неделя 3       Разработчик может пройти от npm install до работающего агента без помощи команды.

  🔴 P0           Registry Explorer (/registry): Search, Filters, Agent Cards, Agent Profile            Неделя 4       Можно найти агента по natural language query. Отображаются 100K+ агентов.

  🟡 P1           Developer Dashboard: My Agents, Earnings chart, Revenue Optimization alerts           Неделя 6--8    Разработчик видит доходы своего агента и конкретную рекомендацию по цене.

  🟡 P1           Wallet Dashboard: Balances, Transactions, Security status, HOLD review                Неделя 6--8    Разработчик видит баланс BTC/USDC и может ревьюить заблокированные транзакции.

  🟡 P1           Security Dashboard: OWASP scores, Threat feed, Guard logs, Scan CTA                   Неделя 8--10   Разработчик может запустить скан и увидеть результат за 30 секунд.

  🟢 P2           Compliance Dashboard, Bitcoin Agents Dashboard, Paxio Radar (public)                  Месяц 3--4     Есть данные для отображения. Первые платящие enterprise клиенты.

  🟢 P2           Intelligence Terminal (Pro), Enterprise Portal, Mobile App                            Месяц 5--8     Intelligence API live. Достаточно enterprise клиентов для Enterprise Portal.
  --------------- ------------------------------------------------------------------------------------- -------------- -----------------------------------------------------------------------------------

**Ключевые метрики успеха frontend**

  ---------------------------------- ------------------------------------------------------------------------ -----------------------------------------------------------
  **Метрика**                        **Цель**                                                                 **Как мерить**

  Time to first agent registration   \< 10 минут от попадания на paxio.network                                Funnel: Landing → Docs → npm install → first registration

  Docs completion rate               \> 60% заканчивают Quickstart                                            Scroll depth + event tracking на финальный code block

  Registry search conversion         \> 20% переходят на Agent Profile после search                           Click-through rate из search results

  Dashboard activation               \> 70% зарегистрировавших агента заходят в Dashboard на следующий день   D1 retention

  Radar engagement (public)          Avg session \> 3 минуты                                                  Session duration на /radar
  ---------------------------------- ------------------------------------------------------------------------ -----------------------------------------------------------

**Paxio Frontend TZ**

3 домена · 25+ страниц · paxio.network
