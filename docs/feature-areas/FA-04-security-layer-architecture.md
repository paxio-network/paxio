**Paxio**

Продукт 4 из 7

**Security Layer**

Trust Layer --- OS Слой 3 · Guard Agent + Security Sidecar

Продуктовая спецификация · v2.0

paxio.network · Берлин · Апрель 2026 · Конфиденциально

**1. Что это**

  ---------------------------------------------------------------------------------------
  **ОДНО ПРЕДЛОЖЕНИЕ**

  Security Layer --- постоянно включённая ML+детерминированная защита

  для AI агентов с финансовым доступом:

  Guard Agent проверяет каждое входящее сообщение (ML, \<200ms),

  Security Sidecar блокирует каждую подозрительную транзакцию (детерминированный Rust).
  ---------------------------------------------------------------------------------------

Security Layer состоит из двух принципиально разных компонентов. Guard Agent --- ML сервис который стоит перед агентом и проверяет весь входящий контент семантически: найти injection, PII, exfiltration попытки, jailbreak. Security Sidecar --- ICP canister с детерминированным Rust кодом который стоит между агентом и кошельком и блокирует подозрительные транзакции математически.

Ключевой принцип из Complior Guard: «Guard дополняет детерминированный пайплайн, но никогда не заменяет его». ML модели дают семантическое понимание. Rust код даёт математическую гарантию. LLM никогда не принимает финансовые решения.

  -------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                                         

  Guard Agent (ML)                       did:paxio:guard-agent в Registry. Qwen 2.5 7B (fine-tuned на 63K примерах) + PromptGuard 2 (86M) + LLM Guard + Presidio. 11 задач классификации. \<200ms latency. Hetzner GX11, Германия (GDPR).

  Security Sidecar (детерминированный)   Rust ICP canister. Intent Verifier: budget, whitelist, per-tx limit, allowed hours. Behavioral Anomaly Engine. AML/OFAC. APPROVE/HOLD/BLOCK. LLM не участвует в решении.

  Почему два компонента                  Guard --- INPUT сторона. Что агент получает. Security Sidecar --- OUTPUT сторона. Что агент делает с деньгами. Вместе закрывают полный периметр.

  Standalone продукт                     Guard Agent доступен по API для любой экосистемы: x402/Base, Skyfire, LangChain без Paxio SDK. \$0.0001/классификация. did:paxio:guard-agent в Registry.
  -------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**2. Три уровня защиты для агентной экономики**

Оригинальный Complior работает на пяти уровнях (static, dynamic, continuous, runtime, guard). Для агентной экономики статический анализ кода --- не главный приоритет. Агент опасен не кодом а поведением в runtime. Поэтому Paxio Security Layer фокусируется на уровнях 2, 4 и 5.

  ----------------------------- --------------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------- ----------------------------------------------------
  **Уровень**                   **Complior уровень**                                                                    **Paxio реализация**                                                                                                                                                                                           **Когда работает**                              **Приоритет**

  Pre-deployment тестирование   Level 2 --- complior eval: 550 тестов (250 conformity + 300 security probes)            Paxio Security Scan: complior eval \--basic (118 детерминированных), \--llm (132 с LLM-judge), \--full (550 включая финансово-специфичные: escalation, treasury, DCA). Запускается перед деплоем в Registry.   Один раз перед деплоем. При major изменениях.   🔴 Высокий --- Security Badge в Registry

  Runtime INPUT защита          Level 5 --- Guard ML models: injection, pii, exfiltration, prohibited, bias, toxicity   Guard Agent (did:paxio:guard-agent): 11 ML задач, \<200ms, постоянно включён. Проверяет каждое входящее сообщение.                                                                                             Постоянно. Каждое входящее сообщение.           🔴 Высокий --- основная защита от prompt injection

  Runtime OUTPUT защита         Level 4 --- \@complior/sdk runtime hooks: pre/post hooks вокруг LLM вызовов             Security Sidecar (ICP canister): детерминированный Intent Verifier вокруг каждой транзакции. Rust код, не LLM.                                                                                                 Постоянно. Каждая исходящая транзакция.         🔴 Высокий --- финансовая защита

  Static код анализ             Level 1 --- complior scan: 5-layer static analysis                                      Secrets Scanner + Dependency Chain (из Complior). Полезно для конфигов MCP, YAML, env файлов агента. НЕ главный фокус для агентной экономики.                                                                  При регистрации агента + GitHub Action.         🟡 Средний --- для OWASP Badge

  Continuous мониторинг         Level 3 --- Daemon + File watcher: 200ms rescan при изменении                           Behavioral Anomaly Engine в Security Sidecar. 30-дневный baseline. Compliance drift через Complior monitoring/.                                                                                                Постоянно. После каждой транзакции.             🟡 Средний --- для обнаружения паттернов
  ----------------------------- --------------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------- ----------------------------------------------------

**2.1 SDK хуки --- готовый Security middleware**

\@complior/sdk содержит 14 production-ready хуков которые являются основой Security Sidecar middleware. Код уже написан и протестирован.

  --------------------- ------------------- ----------------------------------------------------------------------------------------------------------------- ---------------------------------------------------------------------------
  **Хук**               **Тип**             **Что делает**                                                                                                    **Паттерны / Покрытие**

  prohibited            Pre-hook            Блокирует запрещённые практики EU AI Act Art.5. Детерминированный regex.                                          138 паттернов, 8 категорий Art.5, 6 языков (EN/DE/FR/IT/ES + RU)

  sanitize              Pre-hook            Редакция PII до отправки в LLM. Checksum validators для номеров карт, IBAN, SSN.                                  50+ типов PII включая EU-специфичные: IBAN, Steuernummer, BSN, NIR, PESEL

  permission            Pre-hook (agent)    Проверка tools allowlist/deny для агентов с tool calling. Предотвращает несанкционированный вызов инструментов.   Configurable allowlist + denylist per agent

  rate-limit            Pre-hook (agent)    Скользящее окно лимитов вызовов. Защита от DoS и budget exhaustion.                                               Window + max configurable, per-agent

  escalation            Post-hook           Детекция попыток агента эскалировать права или выйти за рамки роли.                                               Pattern matching + context analysis

  bias-check            Post-hook           Проверка ответа LLM на предвзятость по 15 EU Charter характеристикам.                                             15 protected characteristics, Art.21 EU Charter

  circuit-breaker       Post-hook           Каскадная защита: при систематических нарушениях --- автоматическое отключение агента.                            Configurable threshold + cooldown

  budget + action-log   Post-hook (agent)   Учёт расходов агента + callback аудита каждого действия. Основа финансового audit trail.                          Token counting + custom callback

  Finance domain hook   Domain (opt-in)     Специальные хуки для финансовых агентов: расширенный audit logging, financial data redaction.                     Finance-specific patterns + audit callback
  --------------------- ------------------- ----------------------------------------------------------------------------------------------------------------- ---------------------------------------------------------------------------

**3. Guard Agent --- ML защита в реальном времени**

Guard Agent --- это Paxio агент в Registry который предоставляет ML классификацию как сервис. Любой агент в любой экосистеме может вызвать Guard через Registry или напрямую через API. Всегда включён, работает параллельно с агентом, не блокирует reasoning.

**3.1 Guard Agent в Registry**

  -----------------------------------------------------------------------------
  **GUARD AGENT КАК PAXIO АГЕНТ**

  did:paxio:guard-agent

  name: Paxio Guard

  capabilities: \[injection-detection, jailbreak-detection, pii-scan,

  exfiltration-detection, prohibited-detection, bias-detection,

  toxicity-scan, secrets-scan, content-safety, escalation-detection\]

  endpoint: https://guard.paxio.network

  pricing: { per_call: 0.0001, currency: usdc }

  sla: { p95_ms: 200, uptime_30d: 0.999 }

  security_badge: { badge_level: gold } ← сам же верифицирован

  // Любой оркестратор вызывает:

  find_agent({capabilities: \[\'injection-detection\'\]}) → Guard Agent found

  pay_agent(\'did:paxio:guard-agent\', 0.0001, \'usdc\')

  → { injection: false, exfiltration: true, confidence: 0.94 }
  -----------------------------------------------------------------------------

**3.2 Технический стек Guard (из Complior Guard architecture)**

  ------------------------------------ ---------------------------------------------------------------------------------------------------------------- ----------------- ----------------------------------------------------------------- --------------
  **Компонент**                        **Модель**                                                                                                       **VRAM**          **Задачи**                                                        **Latency**

  Guard Classifier (наш, fine-tuned)   Qwen 2.5 7B AWQ INT4 via vLLM. 63K примеров обучения (QLoRA, NF4, rank=64). F1 \> 88% по всем задачам.           \~4.2 ГБ          prohibited, pii, bias, escalation, content_safety, exfiltration   \< 200ms p95

  PromptGuard 2 (Meta)                 Llama-Prompt-Guard-2-86M via transformers. Специализирован на injection/jailbreak. Проверен Meta в production.   \~0.4 ГБ          injection, jailbreak                                              \< 50ms

  LLM Guard (ProtectAI)                DeBERTa-v3 (toxicity, injection scan), AI4Privacy (PII). Production-ready библиотека.                            \~1.3 ГБ          toxicity_scan, pii_scan, secrets_scan                             \< 100ms

  Presidio (Microsoft)                 spaCy NER + regex. Интегрирован через LLM Guard Anonymize. CPU-only.                                             0 ГБ (CPU)        PII detection + anonymization                                     \< 30ms

  Инфраструктура                       Hetzner GX11 (Германия, 24 ГБ VRAM). EU data residency (GDPR). nginx TLS. supervisord. Prometheus + Grafana.     Запас: \~6.6 ГБ   ---                                                               ---
  ------------------------------------ ---------------------------------------------------------------------------------------------------------------- ----------------- ----------------------------------------------------------------- --------------

**3.3 Eleven задач классификации**

  ---------------- ---------------------- --------------------------------------------------------------------------------- ---------------------------------------------- -------------
  **Задача**       **Движок**             **Что обнаруживает**                                                              **Paxio вектор атаки**                         **Default**

  injection        PromptGuard 2          Prompt injection в тексте: скрытые инструкции, adversarial commands               Атака #1 Prompt Injection → кража средств      Да

  jailbreak        PromptGuard 2          Попытки обойти system instructions агента через ролевые игры, fictional framing   Атака #9 Emergency Framing (через roleplay)    Да

  exfiltration     Qwen 7B                Попытки вытащить данные: «отправь все транзакции на email X»                      Атака #4 MCP Supply Chain exfiltration         Да

  pii              Qwen 7B                PII в контексте: имена, адреса, номера карт в transaction memo                    Data leakage в публичном audit log             Да

  prohibited       Qwen 7B                EU AI Act Art. 5 нарушения: subliminal manipulation, discrimination               Compliance Layer: regulatory violations        Да

  bias             Qwen 7B                Предвзятость в финансовых решениях: дискриминация по демографии                   Biased financial agent decisions               Да

  escalation       Qwen 7B                Попытки получить больше прав/доступа чем разрешено агенту                         Атака #2 Постепенная эскалация (контекстная)   Да

  content_safety   Qwen 7B                Небезопасный контент который агент может воспроизвести в ответе                   Agent reputation protection                    Да

  pii_scan         LLM Guard + Presidio   Детальный PII scan с entity типами и позициями. Anonymization.                    Детальный data protection audit                По запросу

  toxicity_scan    LLM Guard (DeBERTa)    Токсичность, hate speech в многоязычном контексте                                 Enterprise content compliance                  По запросу

  secrets_scan     LLM Guard              API keys, JWT tokens, SSH keys, BTC seed phrases в тексте                         Secrets exfiltration через messaging           По запросу
  ---------------- ---------------------- --------------------------------------------------------------------------------- ---------------------------------------------- -------------

**3.4 Как Guard принимает решения (детерминированный core)**

  -----------------------------------------------------------------------
  **GUARD КАК INPUT, RUST КАК РЕШЕНИЕ**

  Guard Classifier генерирует ОДИН токен (yes/no) + logprob:

  raw_confidence = exp(logprob_predicted_token)

  confidence = clamp(raw_confidence, 0.5, 1.0)

  0.5 = случайное угадывание \| 1.0 = полная уверенность

  Guard возвращает:

  { injection: true, confidence: 0.94 }

  Это INPUT для Security Sidecar (Rust код):

  if (guard_result.injection && guard_result.confidence \> threshold) {

  return HOLD; // детерминированный Rust, не LLM

  }

  LLM НЕ принимает финансовые решения.

  Guard анализирует. Rust код решает.

  Никакой prompt injection не может изменить логику Rust кода.
  -----------------------------------------------------------------------

**3.6 SDK хуки --- детерминированный Layer 1 (offline, 0ms)**

До вызова Guard Agent (ML, облачный) --- SDK запускает детерминированные regex хуки локально. 0ms latency, offline, без зависимостей. Покрывает \~60-70% угроз без сети. Guard добавляет семантику для оставшихся 30-40%.

  ------------------- ------------------- --------------------------------------------------------------------------------------------------------------------------------------- ----------------------- ------------
  **SDK хук**         **Тип**             **Что блокирует**                                                                                                                       **Артикул EU AI Act**   **Статус**

  prohibited          pre-hook, regex     138 паттернов запрещённых практик: subliminal manipulation, biometric categorization, social scoring, exploitation of vulnerabilities   Art. 5                  ✅ Готов

  sanitize            pre-hook, regex     50+ типов PII: имена, адреса, IBAN, Steuernummer, BSN, NIR, PESEL, email, phone, credit cards. Checksum validators.                     Art. 10                 ✅ Готов

  disclosure          pre/post-hook       Автоматическое добавление AI disclosure в system prompt и верификация в output (4 языка: EN/DE/FR/IT)                                   Art. 50                 ✅ Готов

  permission          pre-hook (agent)    Проверка tools allowlist/denylist. Агент не может вызвать неразрешённый инструмент.                                                     Art. 14                 ✅ Готов

  rate-limit          pre-hook (agent)    Скользящее окно (window/max). Защита от DoS и чрезмерного использования бюджета.                                                        Art. 9                  ✅ Готов

  bias-check          post-hook           15 protected characteristics (EU Charter): пол, раса, религия, возраст, инвалидность и др.                                              Art. 10                 ✅ Готов

  escalation          post-hook           Детекция эскалации привилегий в ответе агента. HITL Gate для критических решений.                                                       Art. 14                 ✅ Готов

  budget              post-hook (agent)   Учёт расходов агента. Автоматический стоп при превышении budget_limit.                                                                  Art. 9                  ✅ Готов

  action-log          post-hook (agent)   Callback аудита каждого LLM вызова. Интегрируется с ICP Forensics Trail.                                                                Art. 12                 ✅ Готов

  circuit-breaker     post-hook           Каскадная защита: при серии ошибок → open state → fallback response. DoS protection.                                                    Art. 15                 ✅ Готов

  content-marking     post-hook           Metadata AI-generated: HTTP headers + JSON metadata + HTML attrs. Машиночитаемая маркировка.                                            Art. 50.2               ✅ Готов

  disclosure-verify   post-hook           Проверка что AI disclosure присутствует в output. Авто-добавление если отсутствует.                                                     Art. 50                 ✅ Готов
  ------------------- ------------------- --------------------------------------------------------------------------------------------------------------------------------------- ----------------------- ------------

  -------------------------------------------------------------------------------
  **SDK LAYER 1 + GUARD LAYER 2 --- ДВУХУРОВНЕВАЯ ЗАЩИТА**

  80% угроз блокируется regex на Layer 1 (0ms, offline, бесплатно)

  20% требуют семантики --- Guard ML на Layer 2 (\<200ms, cloud, \$0.0001/call)

  Порядок выполнения (для каждого LLM вызова):

  1\. SDK pre-hooks (regex, 0ms) → блокировать явные нарушения

  2\. Guard check (ML, \<200ms) → семантический анализ

  3\. LLM вызов → только чистый контент

  4\. SDK post-hooks (regex, 0ms) → проверить output

  5\. Security Sidecar (Rust, ICP) → перед финансовой транзакцией

  Разработчик устанавливает \@paxio/sdk --- всё это активируется автоматически.
  -------------------------------------------------------------------------------

**3.5 LRU кеш и производительность**

  ------------------------- -------------------------------------------------------- -----------------------------------------------------------------------------------
  **Параметр**              **Значение**                                             **Зачем**

  Кеш ключ                  SHA-256(text + task)                                     Идентичные тексты не классифицируются повторно

  Размер кеша               10 000 записей                                           Покрывает типичные повторяющиеся паттерны

  TTL                       300 секунд                                               Баланс между freshness и производительностью

  Graceful degradation      asyncio.gather + return_exceptions=True                  Если один ML движок падает --- остальные работают. Нет single point of failure.

  Mock режим                GUARD_MOCK_MODE=true → regex вместо GPU                  Тестирование без GPU. Все middleware (auth, rate limit, metrics) работают штатно.

  Параллельное выполнение   3 движка запускаются одновременно через asyncio.gather   Latency = max(Qwen, PromptGuard, LLM Guard), не сумма
  ------------------------- -------------------------------------------------------- -----------------------------------------------------------------------------------

**4. Три режима интеграции --- для любой экосистемы**

Guard работает в любой агентной экосистеме. Не нужен Paxio Wallet или Paxio SDK. x402 агент на Coinbase/Base, Skyfire агент, LangChain агент без Paxio --- все могут использовать Guard через API. Три режима на выбор в зависимости от экосистемы агента.

  ------------------------------------------------------------------------------------
  **ТРИ РЕЖИМА --- ОДИН GUARD**

  РЕЖИМ 1 --- SDK (автоматически, для Paxio агентов):

  \@paxio/sdk → Guard встроен в Wallet Adapter

  Каждое входящее сообщение → Guard проверяет → агент получает только чистый контент

  Разработчик не пишет ни строки кода для Guard

  РЕЖИМ 2 --- API (для любой экосистемы, включая x402/Base):

  POST guard.paxio.network/v1/classify

  X-Guard-API-Key: grd\_\...

  { text: incoming_message, tasks: \[injection, exfiltration, pii\] }

  → { results: \[{task: injection, label: false, confidence: 0.97}\] }

  Любой HTTP-клиент. Go, Rust, Python, on-chain через HTTPS Outcall.

  РЕЖИМ 3 --- Registry Agent (programmatic через Paxio OS):

  find_agent({capabilities: \[injection-detection\]}) → Guard Agent found

  pay_agent(did:paxio:guard-agent, 0.0001, usdc)

  → classification result

  Оркестраторы явно нанимают Guard как sub-агента для верификации
  ------------------------------------------------------------------------------------

  ------------------------------ ------------------------------------------------------------------------------------------------------ ----------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------- -----------------------------------
  **Режим**                      **Для кого**                                                                                           **Установка**                                                                             **Покрывает x402/Base?**                                                              **Цена**

  SDK (авто)                     Paxio Wallet Adapter пользователи. LangChain, CrewAI, AutoGen с \@paxio/sdk.                           npm install \@paxio/sdk → Guard включён автоматически. Ноль конфигурации.                 Только если используют \@paxio/sdk                                                    Включён в Wallet Pro \$29/мес

  MCP Server                     Claude Code, Cursor, Windsurf. mcp.paxio.network подключён.                                            4 строки JSON в MCP settings. Инструмент: guard_check(text, tasks).                       Нет --- только MCP клиенты                                                            Included в MCP подключении

  REST API                       x402 агенты на Base/Coinbase. Skyfire агенты. Go/Rust/Java агенты. On-chain через ICP HTTPS Outcall.   POST guard.paxio.network/v1/classify + API ключ. Любой HTTP клиент.                       ✅ ДА --- любой HTTP клиент. x402 агент вызывает Guard перед обработкой транзакции.   \$0.0001/запрос pay-as-you-go

  Registry Agent                 Оркестраторы которые явно хотят нанять Guard как sub-агента. Multi-agent системы.                      find_agent() → pay_agent() → classify. Стандартный Paxio A2A вызов.                       ✅ ДА --- любой агент в Paxio Registry                                                \$0.0001/классификация через FAP

  FAP Middleware (опционально)   Все агенты проходящие через Paxio Facilitator для роутинга платежей.                                   Оператор включает Guard как required middleware в FAP. Каждая транзакция → Guard check.   ✅ ДА --- все агенты через FAP включая x402                                           Включён в Facilitator routing fee
  ------------------------------ ------------------------------------------------------------------------------------------------------ ----------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------- -----------------------------------

**4.1 x402 агенты на Base --- как это работает**

  --------------------------------------------------------------------------
  **x402 АГЕНТ + GUARD БЕЗ PAXIO SDK**

  Сценарий: агент написан для x402 на Coinbase/Base, нет Paxio SDK.

  Хочет добавить защиту от prompt injection для входящих сообщений.

  // Шаг 1: получить API ключ на guard.paxio.network

  // Шаг 2: добавить одну функцию перед обработкой входящего сообщения:

  async function processMessage(incoming) {

  const guard = await fetch(\'https://guard.paxio.network/v1/classify\', {

  method: \'POST\',

  headers: { \'X-Guard-API-Key\': \'grd\_\...\' },

  body: JSON.stringify({

  text: incoming,

  tasks: \[\'injection\', \'exfiltration\', \'pii\'\]

  })

  });

  const result = await guard.json();

  if (result.results.some(r =\> r.label && r.confidence \> 0.8)) {

  return QUARANTINE; // не передавать агенту

  }

  return agent.process(incoming); // чистый контент

  }

  Время интеграции: 15 минут.

  Стоимость: \$0.0001/запрос (при 1000 запросов/день = \$3/месяц).
  --------------------------------------------------------------------------

**4.2 FAP как universal Guard middleware**

Paxio Facilitator (FAP) может быть настроен как обязательный Guard middleware для всех транзакций через него. Это означает: любой агент который роутит платежи через Paxio автоматически получает Guard проверку --- даже без SDK.

  ------------------------------------------------------------------------------
  **FAP + GUARD = UNIVERSAL PROTECTION**

  Агент A (x402/Base) → Paxio FAP → роутинг к Агент B

  С Guard middleware в FAP:

  Агент A отправляет платёж + сообщение через FAP

  FAP → guard.paxio.network/v1/classify (transaction memo + context)

  Guard: { exfiltration: false, injection: false }

  FAP: продолжает роутинг → Агент B получает платёж

  Или: Guard: { injection: true, confidence: 0.95 }

  FAP: HOLD транзакцию → уведомление отправителю

  Это опциональная функция --- оператор включает на уровне FAP политики.

  Enterprise агенты могут требовать Guard check как условие принятия платежей.
  ------------------------------------------------------------------------------

**5. Security Sidecar --- детерминированная OUTPUT защита**

  -----------------------------------------------------------------------
  **ПОЛНАЯ СХЕМА ЗАЩИТЫ**

  Внешний контент Guard Agent Агент Security Sidecar Wallet

  (PDF/email/API) (ML, \<200ms) (reasoning) (Rust, det.) (ICP)

  │ │ │ │ │

  │── incoming msg ───────►│ │ │ │

  │ │── CLEAN ──────────────►│ │ │

  │ │── QUARANTINE ──────────│ (block) │ │

  │ │ │── wants \$500 ──────►│ │

  │ │ │ │── checks: │

  │ │ │ │ budget ✓ │

  │ │ │ │ whitelist ✓ │

  │ │ │ │ anomaly ✓ │

  │ │ │◄─── APPROVE ───────│ │

  │ │ │──────────────────────────────────── ►│

  threshold ECDSA sign

  INPUT GUARD (semantic) AGENT OUTPUT GUARD (math) SIGNING
  -----------------------------------------------------------------------

  -------------------------------- ----------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Security Sidecar компонент**   **Технология**                                  **Что проверяет перед подписью**

  Transaction Intent Verifier      Rust ICP canister --- ДЕТЕРМИНИРОВАННЫЙ         Budget limit, whitelist addresses, per-tx limit, allowed_hours. APPROVE/HOLD/BLOCK. Guard confidence score как INPUT сигнал. Политики в canister state --- нельзя изменить через API агента.

  Behavioral Anomaly Engine        TypeScript + Complior anomaly.ts + Rust state   30-дневный rolling baseline транзакций агента. Транзакция \>3σ → HOLD. Sequence analysis для постепенной эскалации. Baseline в ICP canister.

  AML / Sanctions Oracle           TypeScript + ICP HTTPS Outcall к OFAC           Каждый новый адрес получателя → OFAC SDN list. ICP consensus среди нескольких узлов. Кеш 7 дней. Санкционный адрес → BLOCK без override.

  Multi-sig Gate                   Rust ICP canister                               Транзакции выше configurable порога: (m-of-n) одобрений от trusted approvers. BFT-aware consensus. Защита от Byzantine fault.

  Forensics Trail                  Rust ICP canister (append-only)                 Каждое решение логируется: timestamp, tx details, decision, reason, Guard confidence. Immutable. Tamper-evident chain. EU AI Act Art. 72.
  -------------------------------- ----------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**6. Десять векторов атак --- Guard + Sidecar**

  -------- ---------------------------------- ---------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------- --------------
  **\#**   **Вектор**                         **Guard задачи (INPUT)**                                                                       **Sidecar (OUTPUT)**                                                                        **Покрытие**

  1        Prompt Injection → кража средств   injection (PromptGuard 2, 86M специализированная). Quarantine до reasoning агента.             Intent Verifier блокирует транзакцию даже если injection прошёл Guard.                      Двойное

  2        Постепенная эскалация              escalation (Qwen 7B): контекстный анализ нарастания запросов.                                  Behavioral Anomaly Engine: \>3σ rolling baseline → HOLD.                                    Двойное

  3        Подмена агента                     ---                                                                                            Agent Identity Verifier: threshold ECDSA challenge-response. Complior ai-registry checks.   Sidecar

  4        MCP Supply Chain                   secrets_scan (LLM Guard): API keys, JWT, seed phrases в tool output. exfiltration (Qwen 7B).   Dependency Chain Scanner (Complior) при регистрации агента.                                 Двойное

  5        Отравление контекста               injection + pii (Unicode normalization, invisible chars). Guard изолирует до reasoning.        Intent Verifier: даже если агент «убеждён» --- детерминированный код блокирует.             Двойное

  6        Replay Attack                      ---                                                                                            Nonce Registry в ICP: TTL=10 мин. Timestamp + nonce + receiver binding.                     Sidecar

  7        Byzantine Fault                    ---                                                                                            Multi-sig Gate: (m-of-n) кворум. Детерминированный подсчёт голосов.                         Sidecar

  8        Timing Attack                      ---                                                                                            Скользящее 24-часовое окно. Нет calendar day reset.                                         Sidecar

  9        Emergency Framing                  jailbreak (PromptGuard 2) + content_safety (Qwen 7B). Urgency/authority паттерны.              Intent Verifier: Guard confidence как signal → HOLD детерминированным кодом.                Двойное

  10       Reputation Rug Pull                ---                                                                                            Reputation Monitor (Complior agent-governance). Graph analysis. Прогрессивные лимиты.       Sidecar
  -------- ---------------------------------- ---------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------- --------------

  -----------------------------------------------------------------------------
  **ISO 27090 --- МАППИНГ УГРОЗ НА НАШУ ЗАЩИТУ**

  ISO/IEC 27090 (безопасность ИИ) --- 13 категорий угроз:

  Prompt Injection → Guard Agent (injection task, PromptGuard 2)

  Supply Chain Attack → Semgrep/Bandit/ModelScan + MCP scanner

  Model Extraction → SDK rate-limit hook + Security Sidecar limits

  AI-specific DoS → SDK circuit-breaker hook

  Data Poisoning → complior eval adversarial probes

  Adversarial Examples → Guard content_safety + bias tasks

  Privacy Violation → SDK sanitize (50+ PII) + Guard pii_scan

  Evasion Attack → Guard jailbreak (PromptGuard 2, 86M специализир.)

  Model Inversion → SDK permission hook (toollist restriction)

  Membership Inference → SDK action-log + audit trail

  Complior уже покрывает: \~15-20% ISO 27090 изначально.

  Paxio Security Layer поднимает до \~70%+ через Guard + Sidecar + SDK hooks.
  -----------------------------------------------------------------------------

**7. Функциональные требования**

+-----------------------------------------------------------------------+
| **GUARD AGENT (ML, постоянно включён)**                               |
+-----------------------------------------------------------------------+
| **11 задач классификации**                                            |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **\<200ms p95 latency**                                               |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **REST API (guard.paxio.network)**                                    |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Batch API**                                                         |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Graceful degradation**                                              |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Mock mode**                                                         |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **FAP Middleware интеграция**                                         |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+
| **Custom fine-tuning (Enterprise)**                                   |
|                                                                       |
| *v1.2*                                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **SECURITY SIDECAR (детерминированный, ICP)**                         |
+-----------------------------------------------------------------------+
| **Intent Verifier**                                                   |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Behavioral Anomaly Engine**                                         |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **AML / OFAC Screening**                                              |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Forensics Trail**                                                   |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Multi-sig Gate**                                                    |
|                                                                       |
| *v1.1*                                                                |
+-----------------------------------------------------------------------+
| **Dead Man\'s Switch**                                                |
|                                                                       |
| *v1.2*                                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **PRE-DEPLOYMENT TESTING (complior eval)**                            |
+-----------------------------------------------------------------------+
| **Evidence Chain (SHA-256 + ed25519)**                                |
|                                                                       |
| *v1.0 --- MVP (код готов)*                                            |
+-----------------------------------------------------------------------+
| **complior eval (550 тестов)**                                        |
|                                                                       |
| *v1.0 --- MVP (код готов)*                                            |
+-----------------------------------------------------------------------+
| **complior redteam (300+ probes)**                                    |
|                                                                       |
| *v1.0 --- MVP (код готов)*                                            |
+-----------------------------------------------------------------------+
| **ModelScan (ML model security)**                                     |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **CycloneDX AI SBOM**                                                 |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **Security Badge по результатам**                                     |
|                                                                       |
| *v1.0 --- MVP*                                                        |
+-----------------------------------------------------------------------+
| **OWASP LLM Top 10 Score**                                            |
|                                                                       |
| *v1.0 --- MVP (код готов)*                                            |
+-----------------------------------------------------------------------+

**8. Монетизация Guard**

  ------------------------------ ------------------------------------------------ -------------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------------------------------
  **Продукт**                    **Цена**                                         **Для кого**                                                                           **Что включает**

  Guard API --- pay-as-you-go    \$0.0001/классификация                           x402/Base агенты, Skyfire агенты, любые HTTP агенты. Те кто не использует Paxio SDK.   REST API доступ. Все 11 задач. \<200ms. Нет лимитов.

  Guard в Wallet Pro             Включён в \$29/мес                               Paxio Wallet пользователи. SDK режим --- Guard автоматически.                          Автоматическая защита всех входящих. Dashboard с Guard insights. Alertы при обнаружении угроз.

  Guard Enterprise SLA           \$299/мес                                        Платформы с тысячами агентов. Financial institutions.                                  Гарантированная latency \< 100ms p99. Dedicated instance. Custom fine-tuning на их угрозах. White-label endpoint.

  Guard via FAP Middleware       Включён в FAP routing fee                        Все агенты роутящие через Paxio Facilitator.                                           Автоматический Guard check при каждой транзакции через FAP. Оператор включает в политике.

  Pre-deployment Security Scan   \$10/скан (включает OWASP + adversarial tests)   Разработчики перед деплоем в Registry.                                                 550+ тестов + OWASP score + Security Badge. Complior eval адаптированный.
  ------------------------------ ------------------------------------------------ -------------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------------------------------

**9. Технический стек агентов**

Guard Agent и Security Scanner --- не LangChain агенты. Это специализированные API сервисы с Paxio идентичностью. Агентные фреймворки не нужны потому что они не принимают решений --- делают одно фиксированное действие.

  ------------------------------------------------------------------------------
  **ПОЧЕМУ НЕ LANGCHAIN И НЕ ICP CANISTERS**

  LangChain/CrewAI/AutoGen нужны агентам которые ПРИНИМАЮТ РЕШЕНИЯ:

  выбирают следующий инструмент, планируют многошаговые задачи,

  рассуждают о том что делать дальше.

  Guard Agent и Security Scanner делают одно фиксированное действие:

  Guard: получить текст → ML классификация → вернуть score

  Security Scanner: получить endpoint → запустить checks → вернуть отчёт

  Это специализированный API сервис с идентичностью в Paxio Registry.

  LangChain добавил бы: абстракции, промежуточные слои, зависимости, overhead.

  Всё это лишнее.

  ICP canisters --- только там где нужна математическая гарантия:

  Security Sidecar (детерминированный Intent Verifier --- Rust)

  Forensics Trail (immutable log --- Rust)

  Wallet keys (threshold ECDSA --- только ICP)

  Guard и Scanner логика --- обычный Python/TypeScript без GPU на ICP.
  ------------------------------------------------------------------------------

  ----------------------------------------- ------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------
  **Компонент**                             **Стек**                                                **Почему именно этот стек**                                                                                                                                                       **НЕ используем**

  Guard Agent (ML классификация)            Python 3.11 + FastAPI + vLLM + PyTorch + transformers   vLLM требует Python. GPU inference --- Python-native экосистема. Node.js эквивалента для vLLM не существует. FastAPI уже написан в Complior Guard.                                LangChain, ICP canister (нет GPU поддержки), TypeScript (нет vLLM)

  Security Scanner Agent (OWASP, Secrets)   TypeScript + Fastify + Complior scanner/ (код готов)    Complior Engine уже написан на TypeScript. Единый стек с остальными Paxio продуктами. Fastify --- быстро, без overhead агентных фреймворков.                                      LangChain, CrewAI (оверинжиниринг для фиксированного pipeline), ICP canister

  Paxio идентичность (оба агента)           paxio-sdk (Python) + \@paxio/sdk (TypeScript)           Одна строка: wallet.inject(app). Агент получает BTC+USDC адрес, авторегистрацию в Registry, x402 payment acceptance, Audit Log. Одинаково для обоих стеков.                       Ручная реализация payment flow

  Security Sidecar (детерминированный)      Rust + ICP canister                                     Детерминированный код который нельзя обойти через prompt injection. Политики в canister state. Threshold ECDSA только на ICP. Математическая гарантия, не программная политика.   Python/TypeScript (можно убедить словами), LangChain (LLM в решении)

  Judge LLM (контекстный анализ Guard)      OpenAI GPT-4o-mini (API)                                INPUT только --- LLM анализирует context, детерминированный Rust код решает. Баланс качества и цены. В v2.0 → self-hosted Qwen для Enterprise privacy.                            LLM как decision maker (нарушает deterministic core принцип)
  ----------------------------------------- ------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **ТРИ СЛОЯ СТЕКА**

  СЛОЙ 1 --- АГЕНТ ЛОГИКА (обычные сервисы, без агентных фреймворков)

  Guard Agent: Python + FastAPI + vLLM (GPU inference, код готов)

  Security Scanner: TypeScript + Fastify + Complior scanner (код готов)

  СЛОЙ 2 --- PAXIO ИДЕНТИЧНОСТЬ (одна строка кода)

  wallet.inject(app) → USDC адрес + Registry + x402 + Audit Log

  paxio-sdk (Python) и \@paxio/sdk (TypeScript) --- одинаково

  СЛОЙ 3 --- ICP CANISTER (только математически необходимое)

  Security Sidecar → Rust: Intent Verifier, APPROVE/HOLD/BLOCK

  Forensics Trail → Rust: immutable append-only log

  Wallet keys → Rust: threshold ECDSA
  -----------------------------------------------------------------------

**10. Open Source --- что используем**

  ------------------------------ ----------------------------------------------------------------------------------------------------------------------- --------------------------------- -----------------------------------------------------------------------------------------------------------------
  **Компонент**                  **Open Source**                                                                                                         **Лицензия**                      **Роль**

  Guard Classifier (наш)         Complior Guard (fine-tuned Qwen 2.5 7B AWQ). 63K примеров, QLoRA NF4 rank=64. aka03/guard-merged-fp16 на HuggingFace.   Apache 2.0 (Qwen) + наш датасет   Основной ML движок. 6 финансово-релевантных задач.

  PromptGuard 2 (Meta)           Llama-Prompt-Guard-2-86M. Специализирован на injection/jailbreak. 86M параметров.                                       Llama Community License           Injection + jailbreak detection. Лучший в классе для этих задач.

  LLM Guard (ProtectAI)          DeBERTa-v3 (toxicity, injection scan), AI4Privacy (PII scan), Presidio (NER).                                           Apache 2.0                        Toxicity, secrets, PII scanning. Production-ready библиотека.

  Presidio (Microsoft)           spaCy NER + regex. CPU-only. Интегрирован через LLM Guard Anonymize.                                                    MIT                               PII entity detection + anonymization.

  vLLM                           High-throughput LLM serving. PagedAttention. Continuous batching.                                                       Apache 2.0                        Serving Qwen 7B. \<200ms latency при concurrent запросах.

  ICP Canister (Rust)            ic-cdk + ic-stable-structures (DFINITY).                                                                                Apache 2.0                        Security Sidecar, Intent Verifier, Forensics Trail, Nonce Registry.

  Complior anomaly.ts            Наш open source. Drift detection, statistical baseline.                                                                 MIT                               Behavioral Anomaly Engine --- адаптируем для финансовых агентов.

  simple-statistics (npm)        Статистические функции для z-score и rolling baseline.                                                                  ISC                               Anomaly detection в Behavioral Engine.

  Promptfoo probes               Promptfoo attack dataset (\~5K) + Garak (\~3K NVIDIA probes)                                                            MIT / Apache 2.0                  Embedded static data. 300+ adversarial проб для complior eval и Guard training data.

  Semgrep + Bandit + ModelScan   Semgrep OSS + Bandit (PyCQA) + ModelScan (ProtectAI)                                                                    LGPL / Apache 2.0                 Deep static analysis. uv auto-download при \--deep флаге. ModelScan сканирует ML model files на malicious code.

  CycloneDX JS (OWASP)           CycloneDX JavaScript                                                                                                    Apache 2.0                        AI SBOM --- Software Bill of Materials. npm dep. AI libraries inventory + CVE check для Supply Chain detection.

  Langfuse                       Langfuse (open source)                                                                                                  MIT                               LLM observability. Опциональный peer dep. Каждый LLM вызов → trace → forensics audit.

  BullMQ + Redis                 TypeScript-native job queue.                                                                                            MIT                               Async jobs: alerts, forensics export, monitoring.
  ------------------------------ ----------------------------------------------------------------------------------------------------------------------- --------------------------------- -----------------------------------------------------------------------------------------------------------------

**11. Интеграции и роадмап**

  ------------------------------ ------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------
  **Продукт**                    **Интеграция**                                                                                                            **Направление**

  Wallet (Продукт 3)             Security Sidecar встроен в Wallet Canister. Guard автоматически для всех Wallet пользователей. Нет wallet без Security.   Security ↔ Wallet (integrated)

  Registry (Продукт 1)           Guard Agent зарегистрирован как агент. Security Badge после скана. Золотой badge = выше в поиске.                         Security → Registry (badge + agent)

  Meta-Facilitator (Продукт 2)   FAP Middleware: Guard check для транзакций через FAP. Покрывает x402/Base агентов без SDK.                                Security → Facilitator (middleware gate)

  Compliance (Продукт 6)         Forensics Trail → Compliance Layer для EU AI Act Art. 72 reporting. Guard logs → compliance audit.                        Security → Compliance (shared Complior base)

  Intelligence (Продукт 7)       Anonymized Guard events (attack type, vector, confidence, blocked) → fraud model.                                         Security → Intelligence (threat feed)
  ------------------------------ ------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------

  ----------------- ------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ ------------------------------------------------------------------------------------
  **Версия**        **Срок**      **Что включено**                                                                                                                                                                                                   **Milestone**

  v1.0 --- Launch   Недели 1--6   Guard Agent в Registry (did:paxio:guard-agent). REST API guard.paxio.network. Все 11 задач. Security Sidecar ICP canister. Intent Verifier + Anomaly Engine + AML. Pre-deployment Security Scan. Security Badge.   Guard Agent работает. Первые \$0.0001/call доходы. x402 агенты могут подключаться.

  v1.1              Месяц 3--4    FAP Middleware интеграция (Guard для всех FAP транзакций). Multi-sig Gate. Custom threshold per agent. Batch API оптимизация.                                                                                      FAP + Guard работает. Все агенты через FAP автоматически защищены.

  v1.2              Месяц 5--6    Custom fine-tuning для Enterprise. Dead Man\'s Switch. Incident Response toolkit. Guard insights в Compliance Layer.                                                                                               Enterprise contracts. Dedicated Guard instances.

  v2.0              Месяц 9--12   Local LLM Judge option (self-hosted Guard для privacy-first Enterprise). Guard архитектура как open standard.                                                                                                      Guard = стандарт ML защиты для агентной безопасности.
  ----------------- ------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ ------------------------------------------------------------------------------------

**Paxio · Security Layer**

Guard Agent + Security Sidecar · paxio.network
