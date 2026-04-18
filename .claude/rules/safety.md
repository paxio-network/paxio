---
description: Safety rules — input validation, no secrets, async/concurrency safety
globs: ["server/**/*.cjs", "app/**/*.{js,ts}", "canisters/**/*.rs", "packages/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "docs/**/*.md"]
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
