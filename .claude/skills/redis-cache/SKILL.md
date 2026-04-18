---
name: redis-cache
description: >
  Redis caching patterns for Paxio.
  Use when implementing caching, session storage, or rate limiting.
---

# Redis Cache Patterns

## Client setup

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});
```

## Cache-aside pattern

```typescript
async function getAgentWithCache(id: string): Promise<Result<Agent>> {
  const cacheKey = `agent:${id}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return { ok: true, value: JSON.parse(cached) };
  }

  // 2. Fetch from DB
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) return { ok: false, error: 'NOT_FOUND' };

  // 3. Store in cache (1 hour TTL)
  await redis.setex(cacheKey, 3600, JSON.stringify(agent));

  return { ok: true, value: agent };
}
```

## Invalidation

```typescript
async function invalidateAgentCache(id: string): Promise<void> {
  await redis.del(`agent:${id}`);
}

async function updateAgent(id: string, data: UpdateAgentInput): Promise<Result<Agent>> {
  const agent = await prisma.agent.update({ where: { id }, data });
  await invalidateAgentCache(id);
  return { ok: true, value: agent };
}
```

## Session storage

```typescript
// Store session with TTL
async function createSession(agentId: string, sessionId: string): Promise<void> {
  const key = `session:${sessionId}`;
  await redis.setex(key, 86400, agentId); // 24 hour TTL
}

async function validateSession(sessionId: string): Promise<string | null> {
  return redis.get(`session:${sessionId}`);
}
```

## Rate limiting

```typescript
// Sliding window rate limiter
async function isRateLimited(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const multi = redis.multi();
  multi.zremrangebyscore(key, 0, windowStart);
  multi.zadd(key, now, `${now}`);
  multi.zcard(key);
  multi.expire(key, windowSeconds);

  const results = await multi.exec();
  const count = results?.[2]?.[1] as number;

  return count > limit;
}

// Usage in middleware
async function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const identifier = request.ip;
  if (await isRateLimited(identifier, 100, 60)) {
    return reply.status(429).send({ error: 'Rate limit exceeded' });
  }
}
```

## Distributed lock

```typescript
async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = 5000
): Promise<T> {
  const lockKey = `lock:${key}`;
  const lockValue = Date.now().toString();

  const acquired = await redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX');
  if (!acquired) {
    throw new Error(`Lock not acquired: ${key}`);
  }

  try {
    return await fn();
  } finally {
    await redis.del(lockKey);
  }
}
```

## Pub/Sub for cache invalidation across instances

```typescript
// Publisher
async function publishAgentUpdated(agentId: string): Promise<void> {
  await redis.publish('agent:updated', JSON.stringify({ id: agentId }));
}

// Subscriber
const subscriber = redis.duplicate();
subscriber.subscribe('agent:updated');
subscriber.on('message', async (channel, message) => {
  if (channel === 'agent:updated') {
    const { id } = JSON.parse(message);
    await redis.del(`agent:${id}`);
  }
});
```
