---
name: typescript-patterns
description: >
  TypeScript patterns for Paxio backend (Fastify + TypeScript).
  Use when writing engine/core/src/ services, routes, or shared types.
  Adapted from Metarhia/Mitar patterns for Node.js + Fastify stack.
---

# TypeScript Patterns (Paxio Backend)

## CRITICAL: JS/TS → Our project translation

| Common pattern | Our project | Why |
|---|---|---|
| `any` type | `unknown` + type guard | Type safety at boundaries |
| class + methods | module.exports = object with functions | Simpler, tree-shakeable |
| async/await + try/catch | `Result<T>` pattern + `.then()` | No exceptions in service layer |
| Global state / singleton | Dependency injection via context | Testability |
| `require()` at top | `import` at top | ESM + tree-shaking |
| `console.log` | `fastify.log.{info,error}` | Structured logging |
| Runtime type checks | Zod schemas at boundaries | Fail fast, clear errors |

## Result<T> pattern — replaces throw/catch

```typescript
// BAD: throws on error
async function getAgent(id: string): Promise<Agent> {
  const agent = await db.agents.findUnique({ where: { id } });
  if (!agent) throw new Error('not found');
  return agent;
}

// GOOD: returns Result
async function getAgent(id: string): Promise<Result<Agent, 'NOT_FOUND' | 'DB_ERROR'>> {
  try {
    const agent = await db.agents.findUnique({ where: { id } });
    if (!agent) return { ok: false, error: 'NOT_FOUND' };
    return { ok: true, value: agent };
  } catch (e) {
    return { ok: false, error: 'DB_ERROR' };
  }
}
```

## Discriminated union for state

```typescript
// BAD: optional fields + boolean flags
interface ProcessState {
  status: 'idle' | 'running' | 'done';
  result?: string;
  error?: string;
}

// GOOD: discriminated union — only one field is present
type ProcessState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: string }
  | { status: 'failed'; error: string };
```

## Zod for input validation

```typescript
import { z } from 'zod';

const CreateAgentSchema = z.object({
  did: z.string().startsWith('did:paxio:'),
  name: z.string().min(1).max(256),
  capability: z.enum(['REGISTRY', 'PAYMENT', 'TRUST', 'COMPLIANCE', 'INTELLIGENCE']),
  metadata: z.record(z.string()).optional(),
});

type CreateAgentInput = z.infer<typeof CreateAgentSchema>;

// At route boundary:
fastify.post('/agents', async (request, reply) => {
  const parsed = CreateAgentSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.format() });
  }
  // parsed.data is CreateAgentInput — fully typed
  return createAgent(parsed.data);
});
```

## Fastify route pattern

```typescript
// routes/agents.ts
import type { FastifyPluginAsync } from 'fastify';
import { getAgent, createAgent } from '../services/agent.js';

const route: FastifyPluginAsync = async (fastify) => {
  fastify.get('/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getAgent(id);
    if (!result.ok) {
      if (result.error === 'NOT_FOUND') return reply.status(404).send();
      return reply.status(500).send({ error: result.error });
    }
    return result.value;
  });

  fastify.post('/agents', async (request, reply) => {
    const result = await createAgent(request.body);
    if (!result.ok) {
      return reply.status(400).send({ error: result.error });
    }
    return reply.status(201).send(result.value);
  });
};

export default route;
```

## Dependency injection via Fastify

```typescript
// Inject services via decorate
fastify.decorate('agents', agentService);
fastify.decorate('db', prismaClient);

// Use in routes
fastify.get('/agents/:id', async (request, reply) => {
  const agent = await fastify.agents.find(request.params.id);
  // ...
});
```

## Error codes as const objects

```typescript
// errors.ts — centralize error codes
export const AgentErrors = {
  NOT_FOUND: 'AGENT_NOT_FOUND',
  ALREADY_EXISTS: 'AGENT_ALREADY_EXISTS',
  INVALID_DID: 'INVALID_DID_FORMAT',
  DB_ERROR: 'DATABASE_ERROR',
} as const;

export type AgentError = typeof AgentErrors[keyof typeof AgentErrors];
```

## Type-safe config

```typescript
// config/index.ts
import { z } from 'zod';

const ConfigSchema = z.object({
  env: z.enum(['development', 'testnet', 'production']),
  port: z.number().default(3000),
  icpGateway: z.string().url(),
  databaseUrl: z.string().url(),
  redisUrl: z.string().url(),
});

const config = ConfigSchema.parse(process.env);
export type Config = z.infer<typeof ConfigSchema>;
```

## No `any` — use `unknown` + type guard

```typescript
// BAD
function parseWebhook(data: any) {
  return data.foo.bar; // runtime error if data is unexpected
}

// GOOD
function parseWebhook(data: unknown) {
  if (!isWebhookPayload(data)) throw new Error('invalid payload');
  return data.foo; // TypeScript knows shape
}

function isWebhookPayload(v: unknown): v is WebhookPayload {
  return (
    typeof v === 'object' &&
    v !== null &&
    'foo' in v &&
    typeof (v as Record<string, unknown>).foo === 'string'
  );
}
```

## Async service layer pattern

```typescript
// services/agent.ts
export interface AgentRepository {
  findById(id: string): Promise<Result<Agent, 'NOT_FOUND' | 'DB_ERROR'>>;
  create(data: CreateAgentInput): Promise<Result<Agent, 'ALREADY_EXISTS' | 'DB_ERROR'>>;
}

export async function createAgent(
  input: CreateAgentInput,
  repo: AgentRepository = agentRepository
): Promise<Result<Agent, AgentError>> {
  const result = await repo.create(input);
  if (!result.ok) return result;
  // Post-condition: agent is created
  fastify.log.info({ agentId: result.value.id }, 'agent created');
  return result;
}
```

---

## Paxio Backend Code Style (ported from .claude/rules/backend-code-style.md)

> FP-first conventions for VM-sandbox app/ layer + server/ infrastructure. NO classes in app/.

# Backend Code Style — Paxio

## Functional Programming — обязательно для `app/`

### NO classes в `app/` (VM sandbox layer)

- **ЗАПРЕЩЕНО**: `class WalletManager { ... }`, `class FAPRouter { ... }`
- **РАЗРЕШЕНО**: plain objects + free functions + factory functions с closures
- **Исключение**: Error subclasses в `packages/errors/` + CJS mirror в `apps/back/server/lib/errors.cjs` (единственное место)

```javascript
// ✅ ПРАВИЛЬНО — функции + factory
const cache = new Map();
const calculateFee = (amount, rateSchedule) => { /* ... */ };
const getQuote = (assetPair) => cache.get(assetPair) ?? null;

({ calculateFee, getQuote })

// ❌ НЕПРАВИЛЬНО — класс
class FeeCalculator {
  constructor() { this.cache = new Map(); }
  calculate(amount) { ... }
}
```

### Pure functions в `domain/`

- `app/domain/` модули — чистая логика (engineering-principles §6)
- Все inputs через аргументы, все outputs через return
- Побочные эффекты (DB queries, ICP calls, HTTP fetches, LLM calls) — **только в `app/api/` или `apps/back/server/`** через injected deps
- State (Map, Set) допустим внутри модуля (sandbox изолирует)
- **Никогда `Date.now()` / `new Date()` / `Math.random()` напрямую** — используй injected `clock`/`prng`

```javascript
// ✅ ПРАВИЛЬНО — pure
const calculateFee = (amount, schedule, clock) => {
  const tier = schedule.tiers.find(t => amount >= t.min);
  return { fee: amount * tier.rate, calculatedAt: clock() };
};

// ❌ НЕПРАВИЛЬНО — hidden deps + impurity
const calculateFee = async (amount) => {
  const schedule = await db.query('SELECT ...'); // I/O в domain!
  return { fee: amount * 0.003, at: Date.now() }; // hardcoded + impure
};
```

### Immutability

- `Object.freeze()` на sandbox context — enforcement на уровне VM loader
- Spread для обновлений: `{ ...existing, status: 'paid' }`
- НЕ мутируй входные аргументы — создавай новый объект
- Arrays: `.slice()`, `.filter()`, `.map()`, `.toSorted()` вместо `.splice()`, `.push()`, `.sort()` на чужих данных
- Factory results — обернуть в `Object.freeze({ method1, method2 })` чтобы dev не мог мутировать

```javascript
// ✅ Factory pattern — frozen result
const createWalletService = (deps) => {
  const sign = async (intent) => { /* ... */ };
  const balance = async (did) => { /* ... */ };
  return Object.freeze({ sign, balance });
};
```

## Naming — backend

| Что | Стиль | Пример |
|---|---|---|
| Файлы `server/` | `kebab-case.cjs` | `guard-client.cjs`, `icp-actor.cjs` |
| Файлы `app/api/` | `kebab-case.js` | `register.js`, `landing-hero.js` |
| Файлы `app/domain/` | `kebab-case.ts` | `risk-scorer.ts`, `fap-router.ts` |
| Каталоги | `kebab-case` | `products/02-facilitator/app/domain/` |
| Функции | `camelCase` | `calculateFee()`, `routePayment()` |
| Factory functions | `create` prefix | `createWalletService()`, `createFAPRouter()` |
| Переменные | `camelCase` | `agentDid`, `transactionHash` |
| Booleans | `is`/`has`/`can` prefix | `isAuthenticated`, `hasPermission`, `canRoute` |
| Константы | `UPPER_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT_MS` |
| Error classes | `PascalCase` | `AppError`, `ValidationError`, `NotFoundError` |
| API paths | `kebab-case` | `/api/registry/find`, `/api/wallet/sign-transaction` |
| Zod schemas | `Zod` prefix + `PascalCase` | `ZodAgentCard`, `ZodSignRequest` |
| TypeScript types | `PascalCase` | `AgentCard`, `WalletState` |

## Модуль = один файл

- Один domain concept = один файл (`fap-router.ts`, `wallet-orchestrator.ts`, `intent-validator.ts`)
- НЕ дроби на отдельные файлы per function
- НЕ создавай `index.js` в `app/api/` — VM loader загружает все файлы из каталога автоматически
- В `app/domain/` тоже flat structure — loader подхватывает

## Config — нет hardcode

- Server config: `process.env` в `apps/back/server/main.cjs` → инжектируется как `config` в sandbox
- App код: только `config.section.value` — **никогда** `process.env`
- Пороги/timeouts: константы в начале файла с `UPPER_SNAKE_CASE`
- Магические числа: только `0`, `1`, `-1` допустимы без имени

```javascript
// ✅ ПРАВИЛЬНО
const MAX_INVOICE_AGE_MS = 30 * 60 * 1000;  // 30 min
const DEFAULT_FAP_TIMEOUT_MS = 5_000;
if (Date.now() - invoice.createdAt > MAX_INVOICE_AGE_MS) { /* ... */ }

// ❌ НЕПРАВИЛЬНО
if (Date.now() - invoice.createdAt > 1800000) { /* ... */ }
```

## Data Externalization — JSON, не hardcode

- Все справочные данные (fee schedules, routing rules, agent sources, threat patterns) в `apps/back/app/data/*.json` или `products/<fa>/app/data/*.json`
- Импорт: `import data from '../../../app/data/x.json' with { type: 'json' };`
- Backend наполняет JSON, **architect** определяет схему (Zod в `packages/types/`)

Примеры:
- `apps/back/app/data/protocol-fees.json` — fee schedules для x402/MPP/TAP/BTC
- `products/02-facilitator/app/data/routing-rules.json` — protocol routing decisions
- `products/01-registry/app/data/agent-sources.json` — ERC-8004, A2A, MCP, FetchAi, Virtuals

## No dead code

- НЕ оставляй закомментированный код
- НЕ оставляй stub функций без TODO + milestone reference (`// TODO M07-3: real impl after Bitcoin Agent`)
- Если функционал будущий — напиши минимальный stub с явным комментарием
- `console.log` в production = WARNING (используй inject'ed `console` который — Pino logger)

## Domain Purity — `app/domain/`

- **ZERO I/O** — domain/ НЕ делает DB queries, HTTP calls, file reads, ICP calls
- **ZERO side effects** — no logging (кроме `console.error` для unexpected branches), no broadcasting, no mutations
- domain/ = чистая математика: входные данные → результат
- Если нужен I/O — это задача `app/api/` слоя или `apps/back/server/infrastructure/`

```javascript
// ✅ domain/risk-scorer.ts — ПРАВИЛЬНО
const scoreRisk = (intent, weights) => {
  const score = weights.reduce((sum, w) => sum + w.value * intent[w.field], 0);
  return { riskLevel: score > 60 ? 'high' : 'low', score };
};

// ❌ domain/risk-scorer.ts — НЕПРАВИЛЬНО
const scoreRisk = async (intentId) => {
  const intent = await db.query('...'); // I/O в domain!
  return { riskLevel: 'high', score: 100 };
};
```

## Async / Concurrency

- `async/await` everywhere — никаких callbacks, no Deferred pattern
- **NO middleware pattern** (Express-style `app.use()`) — все логика explicit в handler
- **NO swallowed errors** — `catch {}` запрещено, минимум `console.error`
- AppError hierarchy для бизнес-ошибок: `ValidationError`, `NotFoundError`, `ForbiddenError`, `ConflictError`, `ProtocolError`, `InternalError`
- НЕ generic `throw new Error(...)` — только `throw new errors.SubclassError('msg')` (с `new`!)
- `Promise.allSettled()` для batch operations где partial failure ОК
- AbortSignal для cancellable operations с timeouts

## V8 Optimization

- **NO `for...in`** — `Object.keys()` + `for...of`
- **NO `delete obj.prop`** — spread `const { removed, ...rest } = obj`
- No holey arrays `[1, , 3]`
- No multi-type arrays `[1, 'a', {}]` — отдельные typed
- Monomorphic objects — consistent shape, all fields initialized
- `map`/`filter`/`reduce` over `forEach` с outer mutation
