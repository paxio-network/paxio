---
name: zod-validation
description: >
  Zod schema validation for Paxio TypeScript.
  Use when validating API inputs, configuration, or data from external sources.
---

# Zod Validation Patterns

## Schema definition

```typescript
import { z } from 'zod';

// Primitives
const idSchema = z.string().cuid();
const emailSchema = z.string().email();
const urlSchema = z.string().url();
const boolSchema = z.boolean();

// Enum
const capabilitySchema = z.enum(['REGISTRY', 'PAYMENT', 'TRUST', 'COMPLIANCE', 'INTELLIGENCE']);

// Object
const AgentSchema = z.object({
  id: z.string(),
  did: z.string().startsWith('did:paxio:'),
  name: z.string().min(1).max(256),
  capability: capabilitySchema,
  metadata: z.record(z.string()).optional(),
  reputation: z.number().min(0).max(1).default(0.5),
  createdAt: z.coerce.date(),
});

// Array
const AgentListSchema = z.array(AgentSchema);

// Union
const ErrorResultSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

const SuccessResultSchema = z.object({
  ok: z.literal(true),
  value: AgentSchema,
});

const AgentResultSchema = z.union([SuccessResultSchema, ErrorResultSchema]);
```

## Input schemas (for API routes)

```typescript
export const CreateAgentSchema = z.object({
  did: z.string().startsWith('did:paxio:'),
  name: z.string().min(1).max(256),
  capability: z.enum(['REGISTRY', 'PAYMENT', 'TRUST', 'COMPLIANCE', 'INTELLIGENCE']),
  metadata: z.record(z.string()).optional(),
});

export const UpdateAgentSchema = CreateAgentSchema.partial();

export const AgentIdSchema = z.object({
  id: z.string().cuid(),
});

// Request type inference
type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
type AgentIdParams = z.infer<typeof AgentIdSchema>;
```

## API response schemas

```typescript
export const AgentResponseSchema = z.object({
  id: z.string(),
  did: z.string(),
  name: z.string(),
  capability: z.string(),
  reputation: z.number(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.array(z.string())).optional(),
});

export const PaginatedResponseSchema = z.object({
  data: z.array(AgentResponseSchema),
  cursor: z.string().optional(),
  hasMore: z.boolean(),
});
```

## Route handler validation

```typescript
// POST /api/v1/agents
const createAgentRoute = async (request: FastifyRequest, reply: FastifyReply) => {
  const parsed = CreateAgentSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Validation failed',
      details: parsed.error.format(),
    });
  }

  const result = await createAgent(parsed.data);
  if (!result.ok) {
    return reply.status(400).send({ error: result.error });
  }

  return reply.status(201).send(result.value);
};

// GET /api/v1/agents/:id
const getAgentRoute = async (request: FastifyRequest<{ Params: AgentIdParams }>, reply: FastifyReply) => {
  const parsed = AgentIdSchema.safeParse(request.params);

  if (!parsed.success) {
    return reply.status(400).send({ error: 'Invalid ID format' });
  }

  const result = await getAgent(parsed.data.id);
  if (!result.ok) {
    return reply.status(404).send();
  }

  return result.value;
};
```

## Transform on parse

```typescript
const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  capability: capabilitySchema.optional(),
  sort: z.enum(['createdAt', 'name', 'reputation']).default('createdAt'),
});

type QueryInput = z.infer<typeof QuerySchema>;

// In route:
const query = QuerySchema.parse(request.query);
// page and limit are already numbers (coerced)
```

## Custom validator

```typescript
const DidSchema = z.string().refine(
  (val) => val.startsWith('did:paxio:') && val.length > 15,
  { message: 'Invalid DID format. Must start with did:paxio:' }
);

const BtcAddressSchema = z.string().refine(
  (val) => {
    // Legacy: 1...; Native segwit: bc1...; Nested: 3...
    return /^(1|bc1|3)[a-km-zA-HJ-NP-Z1-9]{25,}$/.test(val);
  },
  { message: 'Invalid Bitcoin address' }
);
```

## Parsing with error handling

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

// Usage in Fastify error handler
if (error instanceof ZodError) {
  return reply.status(400).send({
    error: 'Validation failed',
    details: formatZodError(error),
  });
}
```

## Discriminated unions for state

```typescript
const AgentStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('active'), reputation: z.number() }),
  z.object({ status: z.literal('suspended'), reason: z.string() }),
  z.object({ status: z.literal('pending'), pendingSince: z.date() }),
]);

type AgentStatus = z.infer<typeof AgentStatusSchema>;
```

## Validator composition

```typescript
// Combine schemas for complex validation
const CreateTransactionSchema = z.object({
  fromAgentId: z.string().cuid(),
  toAgentId: z.string().cuid(),
  amount: z.bigint().positive(),
  asset: z.enum(['BTC', 'ETH', 'USD']),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.fromAgentId !== data.toAgentId,
  { message: "Cannot transfer to self", path: ['toAgentId'] }
);
```
