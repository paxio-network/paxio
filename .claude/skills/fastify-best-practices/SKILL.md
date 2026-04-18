---
name: fastify-best-practices
description: >
  Fastify best practices for Paxio routing engine.
  Use when building routes, plugins, middleware, or Fastify configuration.
---

# Fastify Best Practices

## Route organization

```
engine/core/src/http/
├── routes/
│   ├── agents.ts        # one file per resource
│   ├── sessions.ts
│   ├── registry.ts
│   └── index.ts         # registers all routes
├── plugins/
│   ├── auth.ts          # JWT verification
│   ├── prisma.ts        # DB client
│   └── icp.ts           # ICP gateway client
└── server.ts            # buildServer()
```

## Plugin pattern (lifecycle management)

```typescript
// plugins/prisma.ts
import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: fastify.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

  await prisma.$connect();

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};

export default prismaPlugin;
```

## Route registration

```typescript
// routes/index.ts
import type { FastifyPluginAsync } from 'fastify';
import agentsRoute from './agents.js';
import sessionsRoute from './sessions.js';

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(agentsRoute, { prefix: '/api/v1/agents' });
  fastify.register(sessionsRoute, { prefix: '/api/v1/sessions' });
};

export default routes;
```

## Request/Response schemas

```typescript
// schemas/agent.ts
export const AgentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    did: { type: 'string' },
    name: { type: 'string' },
    capability: { type: 'string' },
    reputation: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const CreateAgentBodySchema = {
  type: 'object',
  required: ['did', 'name', 'capability'],
  properties: {
    did: { type: 'string' },
    name: { type: 'string', minLength: 1, maxLength: 256 },
    capability: { type: 'string', enum: ['REGISTRY', 'PAYMENT', 'TRUST', 'COMPLIANCE', 'INTELLIGENCE'] },
    metadata: { type: 'object', additionalProperties: true },
  },
};
```

## Prehandler for auth

```typescript
// plugins/auth.ts
import type { FastifyPluginAsync } from 'fastify';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('verifyToken', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('no token');
      const payload = await fastify.jwt.verify(token);
      request.user = payload;
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
};

declare module 'fastify' {
  interface FastifyInstance {
    verifyToken: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
```

## Stateless middleware via onRequest

```typescript
fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const ms = Date.now() - request.startTime;
  fastify.log.info({ url: request.url, status: reply.statusCode, ms }, 'request completed');
});
```

## Serialization with reply.send (not JSON.stringify)

```typescript
// BAD
reply.header('Content-Type', 'application/json');
reply.send(JSON.stringify(data));

// GOOD
reply.send(data); // Fastify serializes automatically
```

## 404 handler

```typescript
// server.ts
const server = buildServer();

server.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: 'NOT_FOUND',
    message: `Route ${request.method} ${request.url} not found`,
  });
});
```

## Error handler

```typescript
server.setErrorHandler((error, request, reply) => {
  fastify.log.error({ err: error, url: request.url }, 'request error');

  if (error.validation) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: error.message,
      details: error.validation,
    });
  }

  return reply.status(error.statusCode || 500).send({
    error: error.name || 'INTERNAL_ERROR',
    message: error.message,
  });
});
```
