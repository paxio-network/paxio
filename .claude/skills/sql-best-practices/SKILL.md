---
name: sql-best-practices
description: >
  PostgreSQL best practices for Paxio.
  Use when writing Prisma queries, migrations, or SQL optimizations.
---

# SQL Best Practices (Prisma + PostgreSQL)

## Prisma schema conventions

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Agent {
  id          String   @id @default(cuid())
  did         String   @unique
  name        String
  capability  String
  metadata    Json?
  reputation  Float    @default(0.5)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sessions    Session[]

  @@index([capability])
  @@index([did])
}

model Session {
  id          String   @id @default(cuid())
  agentId     String
  agent       Agent    @relation(fields: [agentId], references: [id])
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  @@index([agentId])
  @@index([expiresAt])
}
```

## Query patterns

```typescript
// Include relations only when needed
const agent = await prisma.agent.findUnique({
  where: { id },
  include: { sessions: true }, // only if sessions are needed
});

// Use select to limit returned fields
const agent = await prisma.agent.findUnique({
  where: { id },
  select: { id: true, did: true, name: true, reputation: true },
});

// Paginate with cursor-based (not offset)
const agents = await prisma.agent.findMany({
  take: 20,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
});
```

## Transactions

```typescript
// Transaction for multi-step writes
const [agent, session] = await prisma.$transaction([
  prisma.agent.create({ data: { did, name, capability } }),
  prisma.session.create({
    data: { agentId: agent.id, expiresAt },
  }),
]);
```

## Soft delete pattern

```prisma
model Agent {
  id        String    @id @default(cuid())
  deletedAt DateTime? // null = active
  // ...
}
```

```typescript
// Query only non-deleted
const agent = await prisma.agent.findFirst({
  where: { id, deletedAt: null },
});
```

## Index for common queries

```sql
-- agents_by_capability: used in FAP routing
CREATE INDEX idx_agent_capability ON "Agent"(capability) WHERE deleted_at IS NULL;

-- sessions_active: used in session validation
CREATE INDEX idx_session_expires ON "Session"(expires_at) WHERE deleted_at IS NULL;
```

## Avoid N+1 queries

```typescript
// BAD: N+1
const agents = await prisma.agent.findMany();
for (const agent of agents) {
  agent.reputation = await getReputation(agent.did);
}

// GOOD: batch fetch
const agents = await prisma.agent.findMany();
const dids = agents.map(a => a.did);
const reputations = await batchGetReputation(dids);
```

## JSON field queries (PostgreSQL)

```typescript
// Query JSON metadata
const agents = await prisma.$queryRaw`
  SELECT * FROM "Agent"
  WHERE metadata->>'region' = ${region}
`;
```
