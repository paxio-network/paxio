---
description: Architecture enforcement — server/app split, layer separation, dependency rules, data externalization
globs: ["server/**/*.cjs", "app/**/*.{js,ts}", "canisters/**/*.rs", "packages/**/*.{ts,tsx}", "docs/**/*.md", "scripts/**"]
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
