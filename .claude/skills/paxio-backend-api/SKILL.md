---
name: paxio-backend-api
description: Paxio backend API handler format for Fastify routes loaded into VM sandbox. Use when implementing apps/back/app/api/ or products/*/app/api/, throwing AppError, validating at HTTP boundary, broadcasting via telemetry, or when the user mentions handler format, http endpoint, api validation, AppError, websocket channel.
---

# Paxio Backend API

> See also: `paxio-backend-architecture` (server/app split, sandbox), `zod-validation`, `error-handling`, `fastify-best-practices`.

## Handler format — the only allowed shape

Every file in `app/api/` returns one object literal:

```javascript
({
  httpMethod: 'POST',
  path: '/api/registry/find',
  method: async ({ body, query, params, headers, session }) => {
    return { data };  // plain JSON-serialisable object
  },
})
```

- **No middleware** — every step explicit inside `method`
- **No Fastify API** — handler doesn't see `request` / `reply`
- **No try/catch** — errors bubble to `server/src/http.cjs` global handler
- **`_statusCode`** for non-default codes: `return { _statusCode: 201, data }`
- **`_headers`** for custom headers: `return { _headers: { 'Cache-Control': '...' }, data }`

## Validate at HTTP boundary, not in domain

```javascript
// ✅ api/registry/find.js — validation here
method: async ({ body, session }) => {
  lib.validation.requireParam(body, 'query');
  if (!lib.validation.isValidDID(body.query.did)) {
    throw new errors.ValidationError('Invalid DID format');
  }
  return domain.registry.findByDID(body.query.did);  // domain gets clean input
}
```

`domain/` may enforce business invariants (FSM transitions, etc.) but never input-shape validation.

## AppError hierarchy

```
AppError (500)
├── ValidationError (400)
├── AuthError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
└── ProtocolError (500)  // FAP: x402, MPP, TAP failures
```

```javascript
// ✅ specific subclass
throw new errors.NotFoundError(`Agent ${agentId} not found`);
throw new errors.ProtocolError('x402 payment required');

// ❌ generic Error — fails AppError contract
throw new Error('Something went wrong');

// ❌ silent swallow
try { await x(); } catch (e) { /* ignore */ }
```

System errors (canister timeout, WS disconnect) → log + retry, never swallow. Never leak stack trace to client in production.

## Authorization — explicit per endpoint

`session` is injected by sandbox context (set by auth middleware after verifying signed DID-token). **Never trust `body.agentDid`** — see `paxio-backend-architecture::Multi-Tenancy`.

```javascript
method: async ({ body, session }) => {
  if (!session) throw new errors.AuthError();
  if (!session.roles.includes('admin')) throw new errors.ForbiddenError();
  // ...
}
```

## WebSocket broadcast — `telemetry` channel

```javascript
telemetry.broadcast('registry', { type: 'agent-registered', agent });
```

| Channel | Events |
|---|---|
| `registry` | agent-registered, agent-updated, claim-made |
| `payment` | invoice-created, invoice-paid, payment-failed |
| `fap` | route-selected, protocol-switch |
| `heartbeat` | ping, pong |
