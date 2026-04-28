---
name: paxio-backend-architecture
description: >
  Paxio backend architecture — server/ (CJS infrastructure) vs app/ (VM sandbox business logic),
  layered loading order, IIFE module format, multi-tenancy P0 invariants. Use when
  implementing files under apps/back/server/, apps/back/app/, or products/*/app/, designing
  server↔app boundary, writing SQL with tenant filtering, or when the user mentions
  VM sandbox, Object.freeze, identity filter, agentDid, organizationId, multi-tenancy,
  or audit log.
---

# Paxio Backend Architecture — server/ vs app/

> Ported 1-в-1 from `.claude/rules/backend-architecture.md`. Rule file is now archive
> (`globs: []`); this skill is the canonical reference.

Два каталога, два мира. Не смешивать.

## Принцип

```
server/  = ИНФРАСТРУКТУРА (Fastify, WebSocket, external clients)
           CommonJS (.cjs), require() разрешён, I/O разрешён

app/     = БИЗНЕС-ЛОГИКА (domain, API handlers, config)
           Загружается через vm.Script в sandbox
           require() ЗАПРЕЩЁН, import ЗАПРЕЩЁН, I/O ЗАПРЕЩЁН
```

## VM Sandbox — изоляция app/

Каждый .js модуль в app/ загружается через `vm.Script` с `Object.freeze()` на контексте.

1. **НЕТ require()** — модуль не может подключить Node.js модули
2. **НЕТ import** — ESM не работает в VM context
3. **НЕТ fs/net/http** — никакого I/O из бизнес-логики
4. **НЕТ process/global** — только то что инжектировано через sandbox
5. **Timeout: 5000ms** — модуль который зависает = ошибка

### Что доступно внутри sandbox:

```javascript
// Инжектируется server/src/loader.cjs:
{
  setTimeout, clearTimeout, AbortController, Buffer,
  console,    // Pino logger (frozen)
  crypto,     // Node.js crypto (frozen)
  config,     // app/config/* (frozen)
  errors,     // AppError hierarchy (frozen)
  telemetry,  // WebSocket broadcaster (frozen)
  lib,        // app/lib/* (frozen, после загрузки)
  domain,     // app/domain/* (frozen, после загрузки)
}
```

### Порядок загрузки (СТРОГИЙ):

```
1. lib/         → sandbox.lib         (permissions, validation)
2. domain/      → sandbox.domain      (pure business logic)
3. api/         → sandbox.api         (HTTP handlers)
```

Каждый слой видит ТОЛЬКО предыдущие слои:
- `lib/` видит: config, errors, crypto
- `domain/` видит: lib + всё выше
- `api/` видит: domain, lib + всё выше

**api/ НЕ МОЖЕТ обращаться к другим api/ модулям напрямую.** Общая логика — в domain/ или lib/.

## Формат модулей в app/

Каждый .js файл в app/ — это IIFE-выражение, возвращающее объект:

```javascript
// app/domain/registry/drone-state.js
const MAX_HISTORY = 100;

const updateDrone = (droneId, data) => { /* ... */ };
const getDrone = (droneId) => { /* ... */ };

({
  updateDrone,
  getDrone,
})
```

**НЕ export, НЕ module.exports** — просто объект в конце файла.
loader.cjs оборачивает код в `'use strict';\n{\n${src}\n}` и выполняет через vm.Script.

## server/ — что можно, что нельзя

### server/ МОЖЕТ:
- `require()` npm пакетов (fastify, pino, ws)
- Открывать TCP/UDP сокеты
- Создавать HTTP endpoints
- Управлять WebSocket connections
- Читать .env переменные
- Lazy-load infrastructure клиентов

### server/ НЕ МОЖЕТ:
- Содержать бизнес-логику (расчёты, FSM, валидация данных)
- Напрямую манипулировать domain objects
- Обходить sandbox (вызывать app/ код через require)

## app/ — что можно, что нельзя

### app/ МОЖЕТ:
- Чистая бизнес-логика (расчёты, FSM, state management)
- Использовать инжектированные сервисы (console, errors, telemetry)
- Возвращать данные через return (handler → Fastify → client)

### app/ НЕ МОЖЕТ:
- require() или import
- fs, net, http, child_process — любой I/O
- process.env — конфиг только через инжектированный `config`
- Модифицировать sandbox context (он frozen)
- Обращаться к Fastify API (request, reply) — только входные данные

## Onion слои (backend)

```
server/ (infrastructure)        ← I/O, Fastify, WebSocket, TCP
   ↓
app/api/ (presentation)         ← HTTP handlers, routing
   ↓
app/domain/ (core)              ← Pure logic, NO deps outward
```

Зависимости направлены СТРОГО ВНУТРЬ:
- `server/ → app/api/ → app/domain/ → app/lib/`
- НИКОГДА: `domain/ → api/`, `domain/ → server/`, `lib/ → domain/`

## Multi-Tenancy / Identity Filter — P0 BLOCKER

**КАЖДЫЙ запрос к агентным/организационным данным ОБЯЗАН фильтровать по identity.**

В Paxio есть ДВА уровня identity:

| Identity | Откуда | Что фильтрует |
|---|---|---|
| `agentDid` | `session.agentDid` (auth middleware из подписанного DID-токена) | Wallet balance, transactions, signed intents, registry claims, FAP routes |
| `organizationId` | `session.organizationId` (fleet/enterprise — WorkOS/SSO) | Fleet dashboard, batch операции, биллинг, audit feed |

### Identity SOURCE — `session`, не body

```javascript
// ✅ ПРАВИЛЬНО — identity из session (auth middleware подписал)
method: async ({ body, session }) => {
  if (!session?.agentDid) throw new errors.AuthError();
  return await db.query(
    'SELECT * FROM transactions WHERE agent_did = $1',
    [session.agentDid]
  );
}

// ❌ НЕПРАВИЛЬНО — identity из body, клиент может подделать
method: async ({ body }) => {
  return await db.query(
    'SELECT * FROM transactions WHERE agent_did = $1',
    [body.agentDid]   // КЛИЕНТ ПОДСТАВИЛ ЧУЖОЙ DID — data leak
  );
}
```

### Каждый SQL/Qdrant/Redis запрос к tenant-данным фильтруется

```javascript
// ✅ wallet balance — фильтр по agentDid
const balance = await db.query(
  'SELECT balance FROM wallets WHERE agent_did = $1',
  [session.agentDid]
);

// ✅ Qdrant similarity — filter в payload
const matches = await qdrant.search('agents', {
  vector: queryVec,
  filter: { must: [{ key: 'organization_id', match: { value: session.organizationId } }] },
});

// ❌ НЕПРАВИЛЬНО — нет фильтра, видны ВСЕ tenants
const wallets = await db.query('SELECT * FROM wallets');
```

### Public exceptions (явный whitelist)

| Endpoint | Почему public |
|---|---|
| `/api/registry/find` (без auth) | Registry — публичный agent index (ERC-8004 пример) |
| `/api/landing/*` | Landing page metrics — агрегированы, не tenant-specific |
| `/api/radar/*` (free tier) | Intelligence press magnet — публичные тренды |
| `/api/docs/*` | Документация |

Любой другой endpoint, который ХОЧЕШЬ сделать публичным — `!!! SCOPE VIOLATION REQUEST !!!`.

### Inter-canister calls — identity передаётся через ic_cdk::caller()

```rust
// ✅ Wallet canister проверяет caller
#[ic_cdk::update]
fn sign_intent(intent: Intent) -> Result<Signature, WalletError> {
    let caller = ic_cdk::caller();   // identity из ICP runtime
    let wallet = WALLETS.with(|w| w.borrow().get(&caller))?;
    wallet.sign(&intent)
}

// ❌ берём agent_did из аргумента — клиент может передать чужой DID
fn sign_intent(agent_did: String, intent: Intent) -> Result<Signature, WalletError> { /* WRONG */ }
```

### Ownership invariant

Wallet, signed intents, audit log entries — **owner = agentDid**, immutable после создания.
Audit log — append-only, никогда не удаляется (compliance).

### Reviewer P0 check (B1-B7)

- B1: каждый SQL имеет `WHERE agent_did = ...` или `WHERE organization_id = ...`?
- B2: identity берётся из `session.*`, не из `body.*`?
- B3: canister методы используют `ic_cdk::caller()`, не аргумент?
- B4: public endpoints в явном whitelist?
- B5: Qdrant/Redis ключи включают tenant prefix?
- B6: wallet ownership проверяется перед sign?
- B7: audit log append-only?

Любой fail → **REJECT, severity=CRITICAL**. Data leak / финансовый риск.
