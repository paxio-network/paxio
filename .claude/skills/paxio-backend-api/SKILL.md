---
name: paxio-backend-api
description: >
  Paxio backend API handler format for Fastify routes loaded into VM sandbox.
  Use when implementing files under `apps/back/app/api/` or `products/*/app/api/`,
  writing handler endpoints, AppError throws, validation at HTTP boundary,
  WebSocket broadcasts, or when the user mentions handler format, http endpoint,
  api validation, AppError, or telemetry channel.
---

# Paxio Backend API Patterns

> Ported 1-в-1 from `.claude/rules/backend-api-patterns.md`. The rule file is now
> archive-only (`globs: []`); this skill is the canonical reference.

## Handler Format — ЕДИНСТВЕННЫЙ формат для app/api/

Каждый файл в `app/api/` возвращает объект:

```javascript
({
  httpMethod: 'GET',           // GET, POST, PUT, DELETE
  path: '/api/registry/find', // Fastify route path
  method: async ({ body, query, params, headers }) => {
    // ... logic ...
    return { data };           // plain object → JSON response
  },
})
```

### Правила:
- **НЕТ middleware** — вся логика явная внутри method
- **НЕТ Fastify API** — handler не знает о request/reply
- **НЕТ try/catch** — ошибки всплывают в server/src/http.cjs error handler
- **_statusCode** — для нестандартных HTTP кодов: `return { _statusCode: 201, data }`
- **_headers** — для custom headers: `return { _headers: { 'Cache-Control': '...' }, data }`

## Validation — на HTTP слое, НЕ в domain

```javascript
// app/api/registry/find.js — ПРАВИЛЬНО
({
  httpMethod: 'POST',
  path: '/api/registry/find',
  method: async ({ body, query }) => {
    // Валидация на входе в API
    lib.validation.requireParam(body, 'query');
    if (!lib.validation.isValidDID(body.query.did)) {
      throw new errors.ValidationError('Invalid DID format');
    }
    // Domain получает уже валидные данные
    return domain.registry.findByDID(body.query.did);
  },
})
```

**domain/ НЕ делает валидацию входных данных** — это ответственность api/.
domain/ может проверять бизнес-инварианты (например, FSM transitions).

## Error Handling — иерархия AppError

```
AppError (base, 500)
├── ValidationError (400) — невалидный вход
├── AuthError (401)       — не аутентифицирован
├── ForbiddenError (403)  — нет прав
├── NotFoundError (404)   — ресурс не найден
└── ProtocolError (500)   — FAP protocol error (x402, MPP, TAP)
```

### Правила ошибок:
- **Бизнес-ошибки** → throw конкретный AppError подкласс
- **Системные ошибки** (WebSocket disconnect, canister timeout) → логирование + retry
- **НИКОГДА** не глотай ошибки молча — как минимум `console.error`
- **НИКОГДА** не возвращай stack trace клиенту в production

```javascript
// ПРАВИЛЬНО — конкретная ошибка
throw new errors.NotFoundError(`Agent ${agentId} not found`);

// ПРАВИЛЬНО — protocol error
throw new errors.ProtocolError('x402 payment required');

// НЕПРАВИЛЬНО — generic error
throw new Error('Something went wrong');

// НЕПРАВИЛЬНО — глотание ошибки
try { ... } catch (e) { /* ignore */ }
```

## Authorization

- Проверка на КАЖДОМ endpoint явно (не через middleware magic)
- `session` инжектируется через sandbox context
- Audit log: каждое решение записывается в stateHistory

```javascript
method: async ({ body, session }) => {
  if (!session) throw new errors.AuthError();
  if (!session.roles.includes('admin')) throw new errors.ForbiddenError();
  // ...
}
```

## WebSocket Broadcasting

API handlers могут отправлять события всем подключённым клиентам
через инжектированный `telemetry` broadcaster:

```javascript
// Broadcast после изменения state
telemetry.broadcast('registry', { type: 'agent-registered', agent });
telemetry.broadcast('payment', { type: 'invoice-paid', invoice });
```

## Paxio-specific channels

| Channel | Events |
|---------|--------|
| `registry` | agent-registered, agent-updated, claim-made |
| `payment` | invoice-created, invoice-paid, payment-failed |
| `fap` | route-selected, protocol-switch |
| `heartbeat` | ping, pong |
