---
description: Safety reference — Zod validation, no secrets, async/concurrency, rate limiting, ICP canister safety, cross-user EPERM. Architect/reviewer reference. Manual-load only.
globs: []
---

# Safety Rules

## Input Validation — ALWAYS

- **Every external input MUST be validated** before processing
- Use Zod schemas for API request/response validation
- Parse then validate — never use unvalidated input

```typescript
// GOOD: validate with Zod first
import { ZodAgentSearchRequest } from '../types/schemas.js';

export async function searchAgents(raw: unknown) {
  const parsed = ZodAgentSearchRequest.safeParse(raw);
  if (!parsed.success) return Err(new ValidationError(parsed.error));
  // now use parsed.data — it's safe
}

// BAD: use raw input directly
export async function searchAgents(query: string) {
  // query used directly in DB query — SQL injection risk
  const agents = await db.query(`SELECT * FROM agents WHERE intent LIKE '%${query}%'`);
}
```

## No Secrets in Source Code

- API keys → `.env` (gitignored), loaded via environment
- Tokens → environment variable only
- Credentials → NEVER in source code, NEVER in git

```bash
# .env (gitignored)
PAXIO_API_KEY=sk_live_xxxxx
OPENAI_API_KEY=sk-xxxxx
DATABASE_URL=postgresql://...
```

```typescript
// GOOD: load from environment
const apiKey = process.env.PAXIO_API_KEY;
if (!apiKey) throw new ConfigurationError('PAXIO_API_KEY not set');

// BAD: hardcoded
const apiKey = 'sk_live_xxxxx'; // NEVER
```

## Async/Concurrency Safety

- Use proper async/await patterns
- Don't mix sync and async incorrectly
- Handle race conditions in concurrent operations
- Use transactions for multi-step operations that must be atomic

## Rate Limiting

- Always implement rate limiting on public API endpoints
- Use `@fastify/rate-limit` plugin
- Return proper `429 Too Many Requests` with `Retry-After` header

## Security Headers

- Use `@fastify/helmet` for security headers
- CORS only for allowed origins
- Content-Security-Policy for browser-facing endpoints

## No Dynamic Code Execution

- Never use `eval()`, `new Function()`, `exec()` with user input
- Never construct SQL queries with string concatenation
- Use parameterized queries only

## TypeScript Specific

```typescript
// Use unknown for external data, then validate
async function handler(body: unknown) {
  const parsed = SomeZodSchema.safeParse(body);
  // now you have type safety
}

// Never use 'any' — use 'unknown' instead
function processExternalData(data: unknown): Result<ProcessedData, Error> { ... }
```

## Rust Specific

```rust
// Use anyhow or thiserror for error handling
// Don't use panics in library code
// Validate inputs at public API boundaries

pub fn new(api_key: String) -> Result<Self, ConfigError> {
    if api_key.is_empty() {
        return Err(ConfigError::EmptyApiKey);
    }
    Ok(Self { api_key })
}
```

## ICP Canister Safety

- Always validate input in canister methods
- Useic0.call for inter-canister calls with proper error handling
- Never store secrets in canister state
- Use certified variables for data that needs to be served to browsers

## Compliance

- Log all financial transactions (amount, parties, timestamp, outcome)
- Never log: passwords, API keys, full credit card numbers
- PII handling — see Guard Agent (PII detection + redaction)

## Cross-user file ownership / chmod EPERM (M-Q3 T-5)

`/home/nous/paxio` — общий рабочий каталог, в котором могут запускаться
агент-сессии под разными OS-юзерами (`nous`, `minimax`, и т.д.) и под
разными git identity (`architect@`, `backend-dev@`, `registry-dev@`).
Это создаёт класс багов где `pnpm install`, `node scripts/copy-api-handlers.mjs`,
`pnpm build` падают с:

```
EPERM: operation not permitted, chmod '/home/nous/paxio/node_modules/.pnpm/...'
```

### Почему это происходит

POSIX rule: **chmod requires owner OR root**. Group membership
(включая `devteam` group в которую входят все наши OS-юзеры) даёт права
на read и write по group bit'ам (`g+rw`), но **group does not grant chmod**.
Это архитектурное ограничение POSIX, а не баг настройки.

Когда сессия А (user `minimax`) запустила `pnpm install`, файлы в
`node_modules/.pnpm/<hash>/` принадлежат `minimax:devteam`. Сессия Б
(user `nous`) не может их chmod'ить, даже состоя в группе `devteam`.
`pnpm install`, `node scripts/copy-api-handlers.mjs` (вызывает `chmod` на
скопированных handler'ах), `pnpm build` (turbo cache cleanup) — все
ломаются.

### Workaround: per-session worktree

Каждая агент-сессия создаёт свой worktree с собственным `node_modules/`,
владелец которого = сама сессия. Подробности — `architect-protocol.md::ФАЗА 0`,
`startup-protocol.md::Step 0`, `scope-guard.md::Per-session worktree isolation`.

```bash
cd /home/nous/paxio
git worktree add /tmp/paxio-<session> -b feature/M-XX-name origin/dev
cd /tmp/paxio-<session>
pnpm install                  # owns its own node_modules/
```

### Когда это уже не помогает

Если worktree уже создан, но `node_modules/` всё равно содержит файлы от
другой identity (наследовали от base checkout, хардлинки на pnpm-store),
fallback:

```bash
rm -rf node_modules            # пересоздать с твоим owner
pnpm install
```

`rm` работает потому что владельцем каталога-родителя обычно является ты
сам (worktree был создан тобой).

### Что НЕ работает (даже не пробуй)

- `chmod -R g+w /home/nous/paxio` — chmod снова требует ownership
- `sudo chown -R $USER:devteam node_modules/` — нужен sudo, не везде есть
- `umask 002` в .bashrc — влияет только на новые файлы, не на существующие
- Перевод всех агентов под одного OS-юзера — конфликтует с git identity audit

Per-session worktree — единственное durable решение.
