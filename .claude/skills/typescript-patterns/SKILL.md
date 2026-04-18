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
