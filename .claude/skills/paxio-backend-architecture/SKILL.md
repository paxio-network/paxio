---
name: paxio-backend-architecture
description: Paxio backend split — server/ (CJS infrastructure) vs app/ (VM sandbox business logic), layered loading order, IIFE module format, multi-tenancy P0 invariants. Use when implementing apps/back/server/, apps/back/app/, or products/*/app/, designing server↔app boundary, writing SQL with tenant filtering, or when the user mentions VM sandbox, Object.freeze, identity filter, agentDid, organizationId, multi-tenancy, audit log.
---

# Paxio Backend Architecture

> See also: `paxio-backend-api` (handler format, AppError), `typescript-patterns` (FP style), `sql-best-practices`.

## Two worlds — never mix

```
server/  = INFRASTRUCTURE (Fastify, WebSocket, DB clients, ICP HTTP)
           CommonJS .cjs — require() OK, I/O OK, process.env OK

app/     = BUSINESS LOGIC (domain, API handlers, config)
           Loaded via vm.Script with frozen sandbox context
           require/import/fs/process/global ALL FORBIDDEN
```

## VM sandbox — what's injected into `app/`

`server/src/loader.cjs` builds a frozen context per request:

```javascript
{
  setTimeout, clearTimeout, AbortController, Buffer,
  console,    // Pino logger (frozen)
  crypto,     // node:crypto (frozen)
  config,     // app/config/* (frozen)
  errors,     // AppError hierarchy (frozen)
  telemetry,  // WebSocket broadcaster (frozen)
  lib,        // app/lib/* (frozen, after lib load)
  domain,     // app/domain/* (frozen, after domain load)
}
```

5000 ms timeout per script. No `require`, no `import`, no I/O, no `process.env`.

## Loading order — strict, one-way

```
lib/  →  domain/  →  api/
```

- `lib/` sees: config, errors, crypto
- `domain/` sees: lib + above (NO api)
- `api/` sees: domain, lib + above (CANNOT call sibling api/ modules)

Shared logic across handlers → `domain/` or `lib/`.

## Module format in `app/` — IIFE returning plain object

```javascript
// app/domain/registry/state.js
const MAX_HISTORY = 100;
const updateDrone = (id, data) => { /* ... */ };
const getDrone = (id) => { /* ... */ };

({
  updateDrone,
  getDrone,
})  // ← bare expression, no module.exports / export
```

`loader.cjs` wraps with `'use strict';\n{\n${src}\n}` and runs through `vm.Script`.

## Onion dependency direction — strictly inward

```
server/  →  app/api/  →  app/domain/  →  app/lib/
```

- ❌ `domain/ → api/`, `domain/ → server/`, `lib/ → domain/` — banned
- ✅ Pure `domain/` — no I/O, all data via parameters, returns Result/AppError

## Multi-tenancy — P0 BLOCKER

**Every query touching agent/org data MUST filter by identity from `session`, never from `body`.**

| Identity | Source | Filters |
|---|---|---|
| `agentDid` | `session.agentDid` (auth middleware → signed DID token) | wallet balance, transactions, signed intents, registry claims, FAP routes |
| `organizationId` | `session.organizationId` (WorkOS/SSO) | fleet dashboard, batch ops, billing, audit feed |

```javascript
// ✅ identity from session
method: async ({ body, session }) => {
  if (!session?.agentDid) throw new errors.AuthError();
  return db.query(
    'SELECT * FROM transactions WHERE agent_did = $1',
    [session.agentDid]
  );
}

// ❌ identity from body — client can impersonate
method: async ({ body }) => {
  return db.query('SELECT ... WHERE agent_did = $1', [body.agentDid]);
}

// ❌ no filter — leaks ALL tenants
method: async () => db.query('SELECT * FROM wallets');
```

**Same rule for Qdrant + Redis** — payload filter or key prefix on `organizationId` / `agentDid`.

## Inter-canister calls — `ic_cdk::caller()`, not argument

```rust
// ✅ identity from ICP runtime
#[ic_cdk::update]
fn sign_intent(intent: Intent) -> Result<Signature, WalletError> {
    let caller = ic_cdk::caller();
    let wallet = WALLETS.with(|w| w.borrow().get(&caller))?;
    wallet.sign(&intent)
}

// ❌ caller as argument — client can lie
fn sign_intent(agent_did: String, intent: Intent) -> Result<...> { /* WRONG */ }
```

## Public exceptions whitelist

| Endpoint | Why public |
|---|---|
| `/api/registry/find` | Public agent index (ERC-8004 standard) |
| `/api/landing/*` | Aggregated metrics, not tenant-specific |
| `/api/radar/*` (free tier) | Public market intelligence |
| `/api/docs/*` | Documentation |

Anything else public → `!!! SCOPE VIOLATION REQUEST !!!` → architect adds to whitelist.

## Ownership invariants

- `wallet`, `signed intents`, `audit log entries` — owner = `agentDid`, immutable post-creation
- `audit log` — append-only, never deleted (compliance)

## Reviewer P0 checks (B1-B7)

- B1: SQL has `WHERE agent_did = ...` or `WHERE organization_id = ...`
- B2: identity from `session.*`, never `body.*`
- B3: canister methods use `ic_cdk::caller()`
- B4: public endpoint in explicit whitelist
- B5: Qdrant/Redis keys carry tenant prefix
- B6: wallet ownership verified before sign
- B7: audit log append-only

Any fail → REJECT, severity=CRITICAL (data leak / financial risk).
