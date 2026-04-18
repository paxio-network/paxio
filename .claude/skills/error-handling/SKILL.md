---
name: error-handling
description: >
  Error handling patterns for Paxio TypeScript/Fastify backend.
  Use when implementing error handling, Result<T> chains, service-layer errors,
  or when user mentions errors, recovery, or error classification.
---

# Error Handling (TypeScript / Fastify)

## Error classification

- **Programming errors:** Bugs (null deref, type errors, assertion failure).
  Fix the code. Do not catch and continue.
  In TS: TypeError, ReferenceError.

- **Operational errors:** Expected failures (DB timeout, external API down,
  invalid input, not found). Handle gracefully with `Result<T>`.
  In TS: Prisma errors, network timeouts, validation failures.

## Result<T> — replaces try/catch

```typescript
// BAD: exception for expected failure
async function getAgent(id: string): Promise<Agent> {
  const agent = await db.agent.findUnique({ where: { id } });
  if (!agent) throw new Error('not found'); // expected, not a bug
  return agent;
}

// GOOD: Result type
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

async function getAgent(id: string): Promise<Result<Agent, 'NOT_FOUND' | 'DB_ERROR'>> {
  try {
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) return { ok: false, error: 'NOT_FOUND' };
    return { ok: true, value: agent };
  } catch (e) {
    return { ok: false, error: 'DB_ERROR' };
  }
}
```

## Result chain

```typescript
const result = await getAgent(id)
  .then(agent => enrichWithReputation(agent))
  .then(agent => validateAgent(agent));

if (!result.ok) {
  // handle error
  return result.error === 'NOT_FOUND'
    ? reply.status(404).send()
    : reply.status(500).send();
}
const agent = result.value;
```

## Discriminated union errors

```typescript
// Centralize error codes
export const Errors = {
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  DB_ERROR: 'DB_ERROR',
  EXTERNAL_ERROR: 'EXTERNAL_ERROR',
} as const;

export type ErrorCode = typeof Errors[keyof typeof Errors];

type Result<T, E extends string = string> = { ok: true; value: T } | { ok: false; error: E };
```

## Fastify error handling

```typescript
// Use reply.status() + send, not throwing
fastify.get('/agents/:id', async (request, reply) => {
  const result = await getAgent(request.params.id);
  if (!result.ok) {
    if (result.error === 'NOT_FOUND') {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    fastify.log.error({ err: result.error }, 'getAgent failed');
    return reply.status(500).send({ error: 'Internal error' });
  }
  return result.value;
});
```

## Never swallow errors

```typescript
// BAD: silently ignore error
try {
  await sendEmail(user);
} catch (e) {
  // nothing
}

// GOOD: always log or propagate
try {
  await sendEmail(user);
} catch (e) {
  fastify.log.error({ err: e, userId: user.id }, 'email send failed');
  // Re-throw if email is critical, or handle gracefully:
  // return Result.failure('EMAIL_FAILED');
}
```

## Async error wrapper (for Promises that throw)

```typescript
function tryCatch<T>(
  promise: Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  return promise
    .then(value => ({ ok: true as const, value }))
    .catch(error => ({ ok: false as const, error }));
}

// Usage:
const result = await tryCatch(prisma.user.findMany());
if (!result.ok) {
  fastify.log.error({ err: result.error }, 'DB query failed');
  return reply.status(500).send();
}
```

## Validation errors are NOT exceptions

```typescript
// BAD: throw on validation
function createAgent(input: unknown) {
  if (!input.name) throw new Error('name required');
  // ...
}

// GOOD: return Result
function createAgent(input: unknown): Result<Agent, ValidationError> {
  const parsed = CreateAgentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.format() };
  }
  return { ok: true, value: doCreate(parsed.data) };
}
```

## Zod validation error formatting

```typescript
import { ZodError } from 'zod';

function formatZodError(error: ZodError): Record<string, string[]> {
  return error.errors.reduce((acc, e) => {
    const path = e.path.join('.') || 'root';
    if (!acc[path]) acc[path] = [];
    acc[path].push(e.message);
    return acc;
  }, {} as Record<string, string[]>);
}

// In route:
const parsed = CreateAgentSchema.safeParse(request.body);
if (!parsed.success) {
  return reply.status(400).send({
    error: 'Validation failed',
    details: formatZodError(parsed.error),
  });
}
```
