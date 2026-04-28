---
description: Architecture enforcement — server/app split, layer separation, dependency rules, data externalization, CQS, domain events, idempotency. Architect / reviewer reference. Manual-load only.
globs: []
---

# Architecture Rules

## Layer Separation

```
paxio/
├── server/                       # Fastify infrastructure (CommonJS .cjs)
│   ├── main.cjs                  # entrypoint
│   └── src/
│       ├── http.cjs              # Fastify + route mounter
│       ├── ws.cjs                # WebSocket broadcaster
│       ├── loader.cjs            # VM Script loader for app/
│       ├── telemetry.cjs
│       └── infrastructure/       # external clients (DB, Redis, ICP, Guard HTTP)
│
├── app/                          # Business logic (VM sandbox .js)
│   ├── types/                    # Shared domain types + Zod (architect)
│   ├── interfaces/               # Contracts (architect)
│   ├── errors/                   # AppError hierarchy
│   ├── lib/                      # permissions, validation, utilities
│   ├── config/                   # frozen configuration
│   ├── data/                     # reference JSON (NOT hardcoded)
│   ├── domain/                   # pure business logic
│   └── api/                      # HTTP handlers
│
├── canisters/                    # Rust ICP canisters
│   └── src/
│       ├── registry/
│       ├── wallet/
│       ├── audit_log/
│       ├── reputation/
│       ├── security_sidecar/
│       └── bitcoin_agent/
│
├── packages/
│   ├── sdk/                      # @paxio/sdk (TypeScript)
│   └── frontend/                 # Next.js 15 apps
│       ├── landing/
│       ├── app/
│       └── docs/
│
└── tests/
```

## server/ vs app/ — ДВА МИРА, НЕ СМЕШИВАТЬ

```
server/  = ИНФРАСТРУКТУРА (Fastify, WebSocket, PostgreSQL, Redis, Qdrant, ICP HTTP bindings)
           CommonJS (.cjs), require() разрешён, I/O разрешён, process/env разрешены

app/     = БИЗНЕС-ЛОГИКА (domain, API handlers, config, types)
           ESM-like .js, загружается через vm.Script в sandbox
           require() ЗАПРЕЩЁН, import ЗАПРЕЩЁН, I/O ЗАПРЕЩЁН, process ЗАПРЕЩЁН
```

Детали VM sandbox, frozen context, порядка загрузки слоёв, формата модулей — см.
`.claude/rules/backend-architecture.md` и `.claude/rules/backend-api-patterns.md`.

## Dependency Rules

### Backend (server/ + app/)

```
server/ → app/api/ → app/domain/ → app/lib/
                   ↘
                     app/types/ (читают все слои)
                     app/interfaces/ (читают все слои)
```

- **НИКОГДА**: `domain/` → `api/`, `domain/` → `server/`, `lib/` → `domain/`
- `app/types/` и `app/interfaces/` не импортируют ничего из других слоёв
- `app/lib/` не импортирует `domain/` или `api/`
- `app/domain/` не импортирует `api/` или `server/`
- `server/` не вызывает `app/` функции напрямую — только через loader + mounted Fastify routes

### Canisters

- `canisters/src/*/` — независимые друг от друга canister'ы
- Inter-canister calls через `ic0.call` с явной обработкой ошибок
- Common types в `canisters/src/common/` (если появится) — но НЕ Rust-side версия `app/types/`

### Frontend

- `apps/frontend/*` (8 apps) + `packages/{ui,hooks,api-client,auth}/` (shared frontend packages) зависят от `packages/types/` (API Zod-схемы) через `@paxio/types`
- НЕ зависят от `apps/back/server/`, `products/*/app/domain/`, `products/*/canister(s)/`
- Общаются с backend только через HTTP API (Fastify routes) или WebSocket — типизированный клиент в `packages/api-client/`

## No Circular Dependencies

Проверяй импорты: не должно быть циклов `a → b → c → a`.
Используй `app/interfaces/` для разрыва циклов.

## State Management

- **Backend**: domain state в PostgreSQL, hot state в Redis, vector в Qdrant
- **Canisters**: `StableBTreeMap` / `StableCell` через `ic-stable-structures` (survives upgrades)
- **Frontend**: React state / context; нет глобальных stores вроде Redux/Zustand без обоснования

## Error Handling

- **TypeScript / Backend**: `Result<T, E>` pattern ИЛИ throw конкретного `AppError` subclass. Без generic `throw new Error(...)`.
- **Rust / Canisters**: `Result<T, ErrorType>` с `thiserror` derive. `panic!` ЗАПРЕЩЁН в публичных methods.
- **Fastify**: ошибки всплывают в `server/src/http.cjs` error handler. `app/api/*` НЕ делает try/catch вокруг своих вызовов.

## Data Externalization

**ВСЕ справочные данные хранятся в JSON в `app/data/`:**

- Цены, маппинги, пороги, лимиты → `app/data/*.json`
- Типы и функции — в TS/JS файлах
- **Хардкод данных в коде ЗАПРЕЩЁН**

Если видишь число в коде → оно должно быть либо mathematical identity (`0`, `1`, `-1`), либо константой из `app/data/`, либо параметром функции, либо env через `app/config/`.

## Non-Custodial Principle

- Keys NEVER exist in one place. Threshold ECDSA распределяет signing между 13+ ICP узлами.
- Нет single point of failure для финансовых операций.
- Security Sidecar — архитектурная гарантия (Rust, детерминированный), не политика.

## LLM-Free for Financial Decisions

- ML модели только для классификации input (Guard Agent: prompt injection, PII, exfiltration).
- Rust детерминированный код принимает transaction approval (Security Sidecar).
- LLM НИКОГДА не принимает compliance / financial determination decisions.

## Three Technical Levels

```
┌────────────────────────────────────────────────────────────┐
│  INTERACTION LAYER  —  REST API (Fastify), любое облако   │
│  <50ms latency. Клиент не знает про ICP.                   │
│  Реализация: server/ + app/api/                            │
└─────────────────────────────┬──────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────┐
│  ROUTING ENGINE  —  stateless, горизонтально масштабируемый│
│  FAP: protocol routing, translation, capital float         │
│  Реализация: app/domain/fap/                               │
└─────────────────────────────┬──────────────────────────────┘
                              │  только то что ТРЕБУЕТ decentralization
┌─────────────────────────────▼──────────────────────────────┐
│  ICP BACKBONE  —  trust, settlement, cryptographic proofs  │
│  Audit Log · Reputation · Wallet (threshold ECDSA)         │
│  Security Sidecar · Bitcoin L1                              │
│  Реализация: canisters/src/                                 │
└────────────────────────────────────────────────────────────┘
```

## Guard Agent (external service)

Guard Agent — **внешний Python/FastAPI/vLLM сервис** на `guard.paxio.network`.
В Paxio codebase Python ОТСУТСТВУЕТ.

Paxio взаимодействует с Guard через HTTP:
- Контракт: `app/types/guard-api.ts` (Zod схемы request/response)
- HTTP клиент: `server/infrastructure/guard-client.cjs` (retry, timeout, circuit-breaker)
- Бизнес-логика: `app/domain/guard/` (когда звать, fallback при timeout)

Разработка Guard ML-сервиса ведётся в отдельном репо `/home/openclaw/guard/`.

## Architectural Patterns (M-Q2 T-5 — ported from /PROJECT donor)

### R43 [C77]: CQS — Command Query Separation

**Severity: P2** (architecture principle, prevents bugs from mixed responsibilities).

Каждая функция либо:
- **Command** — изменяет state, не возвращает business data (return `void` или `id` for
  newly created entity)
- **Query** — читает state, не мутирует, возвращает data

```typescript
// ✅ Command — mutates, returns only id (для allowing client to reference new entity)
async function createAgent(data: AgentInput, agentDid: Did): Promise<{ id: string }> {
  const id = await db.agents.insert({ ...data, owner: agentDid });
  return { id };  // ← only what's needed for client
}

// ✅ Query — reads, no mutation, returns full data
async function getAgent(id: string, agentDid: Did): Promise<AgentCard | null> {
  return db.agents.findOne({ id, owner: agentDid });
}

// ❌ Mixed — command returns business data + mutates
async function createAndReturnAgent(data: AgentInput): Promise<AgentCard> {
  const id = await db.agents.insert(data);
  return await db.agents.findOne({ id });  // extra read
}
```

**Исключение для CQS:** `create → return { id }` для allowing client to reference newly
created entity без round-trip. Это **practical relaxation**, оригинальная Bertrand Meyer
CQS строже (commands return void).

### R44 [C78]: Domain events — anemic objects, serializable

**Severity: P2** (audit trail, event sourcing, eventual consistency).

Domain events = plain objects с обязательными fields:
- `type` (string, discriminator)
- `timestamp` (ISO 8601 или unix epoch ms)
- `aggregateId` (что именно изменилось)
- `payload` (event-specific data)

```typescript
// ✅ serializable, immutable, audit-friendly
type AgentRegisteredEvent = {
  type: 'agent.registered';
  timestamp: number;          // unix ms
  aggregateId: string;        // agent DID
  payload: {
    did: string;
    capabilities: string[];
    source: 'erc8004' | 'a2a' | 'native';
  };
};

// emit
telemetry.broadcast('registry', {
  type: 'agent.registered',
  timestamp: Date.now(),
  aggregateId: agent.did,
  payload: { ... },
});

// ❌ class with methods — not serializable to JSON, can't be stored in audit log
class AgentRegisteredEvent {
  constructor(public did: string) {}
  apply(state: State) { state.agents.add(this.did); }  // ← method couples event с handler
}
```

Events stored в:
- **Audit log** (immutable canister) — для compliance/forensics
- **WebSocket broadcast** (`telemetry.broadcast`) — для frontend live updates
- **Event sourcing replay** — для state reconstruction (если используется)

### R46 [C79]: Idempotency через GUID для job queue / retry-prone operations

**Severity: P1** (correctness в distributed systems).

Operations, which могут retry (network failures, queue redelivery), must be idempotent:

```typescript
// ✅ idempotent payment endpoint
async function processPayment(req: PaymentRequest): Promise<PaymentResult> {
  const idempotencyKey = req.idempotencyKey || req.headers['idempotency-key'];
  if (!idempotencyKey) {
    throw new ValidationError('Missing Idempotency-Key header');
  }
  
  // First call — process; subsequent calls — return cached result
  const cached = await redis.get(`idempotency:${idempotencyKey}`);
  if (cached) return JSON.parse(cached);
  
  const result = await charge(req.amount, req.from, req.to);
  await redis.setex(`idempotency:${idempotencyKey}`, 86400, JSON.stringify(result));
  return result;
}
```

**Patterns:**
- **POST endpoints accepting retries** — accept `Idempotency-Key` header, dedupe by it
- **Payment / financial operations** — ALWAYS idempotent (double-charge = catastrophic)
- **Job queue handlers** — check `if (job.guid in processedSet) return;` at start
- **Database upserts** — `INSERT ... ON CONFLICT DO UPDATE` с stable PK
- **Inter-canister calls** — design messages с `idempotency_key` field, canister state
  tracks processed keys

См. также `engineering-principles.md` §15 «Idempotent operations» для теории.
