---
name: typescript-patterns
description: TypeScript patterns for Paxio backend (Fastify + VM sandbox app/ layer). Use when writing apps/back/, products/*/app/, or shared types/services. FP-first, no classes in app/, Result<T,E> pattern, Zod boundaries, V8-friendly object shapes.
---

# TypeScript Patterns (Paxio Backend)

> See also: `paxio-backend-api`, `paxio-backend-architecture`, `zod-validation`, `error-handling`, `fastify-best-practices`, `metarhia-principles`.

## JS/TS → Paxio translation

| Common | Paxio | Why |
|---|---|---|
| `any` | `unknown` + type narrow / Zod | type safety at boundary |
| `class` + methods | factory function returning frozen object | tree-shake, no `this` leaks, sandbox-safe |
| `throw` in service | `Result<T, E>` OR specific `AppError` subclass | predictable error flow |
| singleton / global | DI via `app/` sandbox context (`config`, `lib`, `domain`) | testability |
| `console.log` | injected `console` (Pino), never `console.*` direct in app/ | structured logging |
| runtime type checks | Zod `safeParse` at HTTP boundary | fail fast, formatted errors |

## NO classes in `app/` (VM sandbox)

- ❌ `class WalletManager { ... }` — banned in `app/`
- ✅ Plain objects + free functions + factory with `create*` prefix
- Exception: `AppError` subclasses in `packages/errors/` + CJS mirror in `apps/back/server/lib/errors.cjs`

```javascript
// ✅ factory — frozen, no `this`, no class
const createFeeService = (deps) => {
  const cache = new Map();
  const calculate = (amount, schedule) => { /* ... */ };
  const getQuote = (pair) => cache.get(pair) ?? null;
  return Object.freeze({ calculate, getQuote });
};

// ❌ class — banned
class FeeService {
  constructor() { this.cache = new Map(); }
  calculate(amount) { ... }
}
```

## Pure domain functions

- All inputs via parameters, all outputs via return
- ❌ `Date.now()`, `new Date()`, `Math.random()` directly in `app/domain/`
- ✅ inject `clock`/`prng` as dependency
- I/O (DB, ICP, HTTP, LLM) — only in `app/api/` or `apps/back/server/`

```javascript
// ✅ pure
const calculateFee = (amount, schedule, clock) => {
  const tier = schedule.tiers.find(t => amount >= t.min);
  return { fee: amount * tier.rate, calculatedAt: clock() };
};

// ❌ hidden deps + impurity
const calculateFee = async (amount) => {
  const schedule = await db.query('SELECT ...');  // I/O in domain
  return { fee: amount * 0.003, at: Date.now() };
};
```

## Result<T, E> pattern (when not throwing AppError)

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

async function getAgent(id: string): Promise<Result<Agent, 'NOT_FOUND' | 'DB_ERROR'>> {
  try {
    const agent = await db.agents.findUnique({ where: { id } });
    if (!agent) return { ok: false, error: 'NOT_FOUND' };
    return { ok: true, value: agent };
  } catch {
    return { ok: false, error: 'DB_ERROR' };
  }
}
```

Use `Result` for crawlers / parsers / pure-domain failures. For HTTP handlers throw an `AppError` subclass — see `paxio-backend-api`.

## Discriminated unions over optional fields

```typescript
// ❌ optional + boolean — caller must check each
type ProcessState = { status: 'idle' | 'running' | 'done'; result?: string; error?: string };

// ✅ discriminated — compiler enforces narrowing
type ProcessState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: string }
  | { status: 'failed'; error: string };
```

## Zod at HTTP boundary

```typescript
import { z } from 'zod';

const CreateAgentSchema = z.object({
  did: z.string().startsWith('did:paxio:'),
  name: z.string().min(1).max(256),
  capability: z.enum(['REGISTRY', 'PAYMENT', 'TRUST', 'COMPLIANCE', 'INTELLIGENCE']),
});
type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
```

In Paxio handler format (`paxio-backend-api`):
```javascript
method: async ({ body }) => {
  const parsed = ZodCreateAgent.safeParse(body);
  if (!parsed.success) throw new errors.ValidationError(parsed.error.format());
  return domain.registry.register(parsed.data);
}
```

## No `any` — `unknown` + narrow

```typescript
// ✅
function parse(data: unknown) {
  if (!isPayload(data)) throw new errors.ValidationError('invalid');
  return data.foo;  // narrowed
}
function isPayload(v: unknown): v is Payload {
  return typeof v === 'object' && v !== null && 'foo' in v;
}
```

## Naming

| Item | Style | Example |
|---|---|---|
| Files in `server/` + `app/` | `kebab-case` | `guard-client.cjs`, `risk-scorer.ts` |
| Functions / variables | `camelCase` | `calculateFee`, `agentDid` |
| Factory functions | `create*` prefix | `createWalletService` |
| Booleans | `is/has/can` prefix | `isAuthenticated`, `hasPermission` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |
| Types | `PascalCase` | `AgentCard`, `WalletState` |
| Zod schemas | `Zod` prefix | `ZodAgentCard` |
| API paths | `kebab-case` | `/api/registry/find` |

## File organization

- One domain concept per file (`fap-router.ts`, `wallet-orchestrator.ts`)
- No `index.js` in `app/` — VM loader auto-loads each file from a directory
- Flat structure in `app/api/` and `app/domain/`
- Max 300 lines per file (refactor signal)

## V8 optimizations — performance + correctness

- ❌ `for...in` — iterates prototype chain + V8 deopts → use `Object.keys() + for...of`
- ❌ `delete obj.prop` — morphs hidden class → use spread exclusion `const { x, ...rest } = obj`
- ❌ holey arrays `[1, , 3]`, mixed-type arrays
- ❌ `forEach` with outer-scope mutation → use `map / filter / reduce`
- ✅ Monomorphic objects — same shape for all instances of a type, populate all fields (use `null` for missing)
- ✅ Consistent return shape across all branches (megamorphic deopt avoidance)

## No magic numbers / hardcoded config

- ✅ named constant: `const MAX_INVOICE_AGE_MS = 30 * 60 * 1000;`
- ✅ JSON in `app/data/*.json` for reference data (fees, routing rules, threat patterns)
- ❌ `process.env` in `app/` — only via injected `config`
- Allowed bare numbers: `0`, `1`, `-1` (mathematical identities)

## Async / errors / immutability

- `async/await` everywhere — no callbacks, no Deferred, no RxJS
- ❌ `try { await x() } catch {}` — silent swallow forbidden, log minimum `console.error`
- AbortSignal for cancellable / timed operations
- Spread for updates: `{ ...existing, status: 'paid' }` — never mutate inputs
- Arrays: `.slice()`, `.filter()`, `.map()`, `.toSorted()` (immutable) over `.splice()`, `.push()`, `.sort()` on shared data
- Factory return: wrap in `Object.freeze({ ... })` so consumers can't mutate

## Law of Demeter

- ❌ `wallet.signer.key.publicKey.toHex()` — coupled to internals
- ✅ `wallet.getPublicKeyHex()` — wallet exposes what's needed
- Rule of thumb: `a.b.c.d` is a refactor signal, `a.b.c.d.e()` is a guarantee
