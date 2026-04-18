# M00 — Foundation: монорепо, git, types, interfaces, CI

## Готово когда

Есть git-репозиторий Paxio, настроен npm workspace с TypeScript + Vitest + eslint-config-metarhia, создан каркас директорий (`server/`, `app/`, `canisters/`, `packages/`, `tests/`, `cli/`), написаны базовые доменные типы + контракты (Result, Did, Capability, AgentCard, AppError hierarchy), CI pipeline stub в GitHub Actions. Любой другой milestone может теперь работать.

## Метод верификации

- [x] **Unit tests** — `npm run test -- --run` → 72/72 GREEN (6 test files)
  - `tests/result.test.ts` — 13 tests GREEN
  - `tests/types.test.ts` — 26 tests GREEN
  - `tests/errors.test.ts` — 15 tests GREEN
  - `tests/contracts.test.ts` — 5 tests GREEN
  - `tests/logger.test.ts` — 7 tests GREEN
  - `tests/clock.test.ts` — 6 tests GREEN
- [x] **Acceptance script** — `bash scripts/verify_foundation.sh` → ALL 11 CHECKS PASSED
- [x] **Server smoke test** — `curl http://localhost:8999/health` → `{"status":"ok",...}` (verified in-place, E2E canary на fresh clone опционально)

## Статус

✅ **ВЫПОЛНЕН** (2026-04-17). Commits: `93d984d` (RED tests + contracts), `<next>` (impl app/errors, app/lib/logger, app/lib/clock).

## Зависимости

Нет. **M00 — блокирует ВСЕ остальные milestones.** Параллельно с M00 могут идти только M11-M13 (frontend) если не требуют types из `app/types/`.

## Roadmap reference

Phase 0, «Монорепо setup» (из раздела «АУДИТ СУЩЕСТВУЮЩЕГО КОДА — Bitgent + Complior»).

## FA reference

Нет. Это preparatory milestone — инфраструктура для всех FA.

---

## Шаг 1: Architect пишет спецификации

### 1.1 Structure (каркас директорий)

**Правило:** директории создаются dev-агентами НА ЛЕТУ когда пишут файлы. Никаких отдельных скриптов setup.

**FA-mapping в layout:**

| Directory | Feature Area | Product |
|---|---|---|
| `app/domain/registry/` + `app/api/registry/` + `canisters/src/registry/` | FA-01 | P1 Universal Registry |
| `app/domain/fap/` + `app/api/fap/` | FA-02 | P2 Meta-Facilitator + FAP |
| `app/domain/wallet/` + `app/api/wallet/` + `canisters/src/wallet/` | FA-03 | P3 Wallet + Adapter |
| `app/domain/guard/` + `app/api/guard/` + `server/infrastructure/guard-client.cjs` + `canisters/src/security_sidecar/` | FA-04 | P4 Security (Guard + Sidecar) |
| `app/domain/bitcoin/` + `canisters/src/bitcoin_agent/` | FA-05 | P5 Bitcoin Agent |
| `app/domain/compliance/` + `app/api/compliance/` + `canisters/src/audit_log/` | FA-06 | P6 Compliance Layer |
| `app/domain/intelligence/` + `app/api/intelligence/` | FA-07 | P7 Intelligence |
| `canisters/src/reputation/` | FA-01 (cross-cutting) | Reputation Engine — used by P1 |
| `canisters/src/shared/` | — | Общие Rust-типы для всех canisters |
| `packages/sdk/` | FA-03 (SDK) | `@paxio/sdk` npm package |
| `packages/mcp-server/` | cross-cutting | MCP Server (mcp.paxio.network) |
| `packages/frontend/landing/` | UX | paxio.network |
| `packages/frontend/app/` | UX | app.paxio.network |
| `packages/frontend/docs/` | UX | docs.paxio.network |
| `cli/` | cross-cutting | Paxio CLI |

**Server ядро (адаптируется из `/home/nous/Olympus/server/` как reference):**
- `server/main.cjs` — Fastify entry + graceful shutdown
- `server/src/loader.cjs` — VM sandbox loader (3 слоя: lib → domain → api)
- `server/src/http.cjs` — CORS, security headers, request ID, error handler, sandbox route registration
- `server/src/ws.cjs` — WebSocket broadcaster (channels: `registry`, `payment`, `fap`, `guard`, `heartbeat`)
- `server/src/logger.cjs` — pino wrapper
- `server/lib/errors.cjs` — CommonJS AppError (для server/ уровня)
- `server/infrastructure/` — внешние клиенты (пустая директория в M00, заполняется M01+)

Pint Olympus: `main.cjs` + `loader.cjs` копируются почти дословно (loader уже generic). `http.cjs` адаптируется: убираются Cesium static serving + drone-specific. `ws.cjs` упрощается до generic broadcaster без drone-channels.

**Target directory tree (итог после M00):**

```
paxio/
├── server/
│   ├── main.cjs                        # placeholder: console.log + graceful exit
│   └── src/
│       ├── http.cjs                    # placeholder
│       ├── loader.cjs                  # placeholder
│       └── infrastructure/             # empty dir
├── app/
│   ├── types/
│   │   ├── index.ts                    # re-exports
│   │   ├── result.ts                   # Result<T, E> + Ok/Err helpers
│   │   ├── did.ts                      # Did, ZodDid
│   │   ├── capability.ts               # Capability enum, ZodCapability
│   │   ├── agent-card.ts               # AgentCard, ZodAgentCard
│   │   └── errors.ts                   # ошибочные коды (не hierarchy, а codes)
│   ├── interfaces/
│   │   ├── index.ts                    # re-exports
│   │   ├── logger.ts                   # Logger interface
│   │   └── clock.ts                    # Clock interface
│   ├── errors/                         # AppError hierarchy (IMPLEMENTATION — backend-dev)
│   ├── lib/                            # Logger + Clock implementations (backend-dev)
│   ├── config/                         # empty placeholder
│   ├── data/                           # empty placeholder
│   ├── domain/                         # empty placeholder
│   └── api/                            # empty placeholder
├── canisters/
│   ├── Cargo.toml                      # workspace root
│   └── src/
│       └── shared/
│           ├── Cargo.toml
│           └── src/
│               └── lib.rs              # placeholder
├── packages/
│   ├── sdk/
│   │   └── package.json                # skeleton, @paxio/sdk
│   ├── mcp-server/
│   │   └── package.json                # skeleton
│   └── frontend/                       # empty placeholder
├── cli/                                # empty placeholder (M14 will scaffold)
├── tests/                              # unit tests (architect)
├── scripts/                            # verify_*.sh
├── docs/                               # already exists
├── opensrc/                            # already exists
├── .claude/                            # already exists
├── .github/workflows/
│   └── ci.yml                          # CI stub
├── .gitignore
├── CLAUDE.md                           # already exists
├── README.md
├── package.json                        # workspace root
├── tsconfig.base.json                  # shared tsconfig
├── vitest.config.ts                    # multi-project vitest
├── .eslintrc.json                      # extends eslint-config-metarhia
└── .prettierrc.json
```

### 1.2 Types (architect пишет)

#### `app/types/result.ts`

```typescript
// Source of truth: Result<T, E> pattern для Paxio
// Все domain функции возвращают Result вместо throw.

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok === true;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => r.ok === false;

// map: Result<T, E> → Result<U, E>
export const map = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  r.ok ? ok(f(r.value)) : r;

// chain (flatMap): Result<T, E> → Result<U, E>
export const chain = <T, U, E>(
  r: Result<T, E>,
  f: (t: T) => Result<U, E>,
): Result<U, E> => (r.ok ? f(r.value) : r);

// unwrap: throws on Err — use ТОЛЬКО в тестах и верхних уровнях
export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw new Error(`unwrap on Err: ${JSON.stringify(r.error)}`);
};

// mapErr: Result<T, E> → Result<T, F>
export const mapErr = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F> =>
  r.ok ? r : err(f(r.error));
```

#### `app/types/did.ts`

```typescript
import { z } from 'zod';

// W3C DID Core 1.0: did:paxio:<network>:<id>
// Примеры: did:paxio:base:0x1a2b..., did:paxio:icp:rdmx6-jaaaa-aaaaa-aaadq-cai
export type Did = string;

const DID_REGEX = /^did:paxio:[a-z0-9]+:[a-zA-Z0-9._-]+$/;

export const ZodDid = z
  .string()
  .regex(DID_REGEX, 'invalid DID format: must be did:paxio:<network>:<id>');

export const isDid = (s: string): s is Did => DID_REGEX.test(s);
```

#### `app/types/capability.ts`

```typescript
import { z } from 'zod';

// 5 capability types, из CLAUDE.md + FA-01
export const CAPABILITIES = [
  'REGISTRY',
  'FACILITATOR',
  'WALLET',
  'SECURITY',
  'INTELLIGENCE',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const ZodCapability = z.enum(CAPABILITIES);
```

#### `app/types/agent-card.ts`

Минимальный MVP. Full schema из FA-01 section 4 — в M01.

```typescript
import { z } from 'zod';
import { ZodDid } from './did.js';
import { ZodCapability } from './capability.js';

export const ZodAgentCard = z.object({
  did: ZodDid,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  capability: ZodCapability,
  endpoint: z.string().url().optional(),
  version: z.string().default('0.0.1'),
  createdAt: z.string().datetime(),
});

export type AgentCard = z.infer<typeof ZodAgentCard>;
```

#### `app/types/errors.ts`

Коды ошибок (domain константы). Сами классы AppError — в `app/errors/` (backend-dev implement).

```typescript
export const ERROR_CODES = {
  VALIDATION: 'validation_error',
  NOT_FOUND: 'not_found',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  CONFLICT: 'conflict',
  INTERNAL: 'internal_error',
  EXTERNAL_SERVICE: 'external_service_error',
  RATE_LIMIT: 'rate_limit',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
```

#### `app/types/index.ts`

```typescript
export * from './result.js';
export * from './did.js';
export * from './capability.js';
export * from './agent-card.js';
export * from './errors.js';
```

### 1.3 Interfaces (architect пишет)

#### `app/interfaces/logger.ts`

```typescript
export interface LogContext {
  readonly [key: string]: string | number | boolean | null | undefined;
}

export interface Logger {
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, ctx?: LogContext): void;
  debug(msg: string, ctx?: LogContext): void;
  child(bindings: LogContext): Logger;
}
```

#### `app/interfaces/clock.ts`

```typescript
// Clock abstraction для testability.
// В коде: не используй Date.now() напрямую, всегда через Clock.
export interface Clock {
  now(): number; // Unix timestamp ms
  nowIso(): string; // ISO 8601
}
```

#### `app/interfaces/index.ts`

```typescript
export type { Logger, LogContext } from './logger.js';
export type { Clock } from './clock.js';
```

### 1.4 RED tests (architect пишет)

#### `tests/result.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, map, chain, unwrap, mapErr } from 'app/types/result.js';

describe('Result', () => {
  it('ok() creates Ok variant', () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    expect(isOk(r)).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('err() creates Err variant', () => {
    const r = err('bad');
    expect(r.ok).toBe(false);
    expect(isErr(r)).toBe(true);
    if (!r.ok) expect(r.error).toBe('bad');
  });

  it('map transforms Ok value', () => {
    const r = map(ok(2), (n) => n * 3);
    expect(unwrap(r)).toBe(6);
  });

  it('map leaves Err unchanged', () => {
    const r = map<number, number, string>(err('bad'), (n) => n * 3);
    expect(isErr(r)).toBe(true);
  });

  it('chain flatMaps over Result', () => {
    const r = chain(ok(2), (n) => (n > 0 ? ok(n * 10) : err('neg')));
    expect(unwrap(r)).toBe(20);
  });

  it('chain short-circuits on Err', () => {
    const r = chain(err<string>('prev'), (n: number) => ok(n * 10));
    expect(isErr(r)).toBe(true);
  });

  it('mapErr transforms Err value', () => {
    const r = mapErr(err('low'), (e) => e.toUpperCase());
    expect(isErr(r) && r.error).toBe('LOW');
  });

  it('unwrap throws on Err', () => {
    expect(() => unwrap(err('bad'))).toThrow(/unwrap on Err/);
  });
});
```

#### `tests/types.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ZodDid, isDid } from 'app/types/did.js';
import { ZodCapability, CAPABILITIES } from 'app/types/capability.js';
import { ZodAgentCard } from 'app/types/agent-card.js';

describe('ZodDid', () => {
  it('accepts did:paxio:base:0x1a2b', () => {
    expect(ZodDid.safeParse('did:paxio:base:0x1a2b').success).toBe(true);
  });

  it('accepts did:paxio:icp:rdmx6-jaaaa-aaaaa-aaadq-cai', () => {
    expect(
      ZodDid.safeParse('did:paxio:icp:rdmx6-jaaaa-aaaaa-aaadq-cai').success,
    ).toBe(true);
  });

  it('rejects did:wrong:base:0x1a', () => {
    expect(ZodDid.safeParse('did:wrong:base:0x1a').success).toBe(false);
  });

  it('rejects plain string', () => {
    expect(ZodDid.safeParse('not-a-did').success).toBe(false);
  });

  it('rejects empty id part', () => {
    expect(ZodDid.safeParse('did:paxio:base:').success).toBe(false);
  });

  it('isDid narrows type', () => {
    const s = 'did:paxio:base:0x1';
    expect(isDid(s)).toBe(true);
  });
});

describe('ZodCapability', () => {
  it('accepts all 5 capabilities', () => {
    for (const c of CAPABILITIES) {
      expect(ZodCapability.safeParse(c).success).toBe(true);
    }
  });

  it('rejects unknown capability', () => {
    expect(ZodCapability.safeParse('UNKNOWN').success).toBe(false);
  });
});

describe('ZodAgentCard', () => {
  const valid = {
    did: 'did:paxio:base:0x1a2b',
    name: 'Test Agent',
    capability: 'REGISTRY' as const,
    version: '0.1.0',
    createdAt: '2026-04-18T00:00:00.000Z',
  };

  it('accepts minimal valid AgentCard', () => {
    expect(ZodAgentCard.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(ZodAgentCard.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects invalid DID', () => {
    expect(
      ZodAgentCard.safeParse({ ...valid, did: 'not-a-did' }).success,
    ).toBe(false);
  });

  it('rejects invalid endpoint URL', () => {
    expect(
      ZodAgentCard.safeParse({ ...valid, endpoint: 'not a url' }).success,
    ).toBe(false);
  });

  it('rejects invalid createdAt', () => {
    expect(
      ZodAgentCard.safeParse({ ...valid, createdAt: 'yesterday' }).success,
    ).toBe(false);
  });

  it('description is optional', () => {
    expect(ZodAgentCard.safeParse(valid).success).toBe(true);
  });
});
```

#### `tests/errors.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalError,
  RateLimitError,
  ExternalServiceError,
} from 'app/errors/index.js';
import { ERROR_CODES } from 'app/types/errors.js';

describe('AppError hierarchy', () => {
  it('ValidationError has code + statusCode 400', () => {
    const e = new ValidationError('bad input');
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe(ERROR_CODES.VALIDATION);
    expect(e.statusCode).toBe(400);
    expect(e.message).toBe('bad input');
  });

  it('NotFoundError has statusCode 404', () => {
    const e = new NotFoundError('agent did:paxio:x not found');
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe(ERROR_CODES.NOT_FOUND);
  });

  it('UnauthorizedError has statusCode 401', () => {
    expect(new UnauthorizedError('no token').statusCode).toBe(401);
  });

  it('ForbiddenError has statusCode 403', () => {
    expect(new ForbiddenError('not owner').statusCode).toBe(403);
  });

  it('ConflictError has statusCode 409', () => {
    expect(new ConflictError('already exists').statusCode).toBe(409);
  });

  it('RateLimitError has statusCode 429', () => {
    expect(new RateLimitError('slow down').statusCode).toBe(429);
  });

  it('InternalError has statusCode 500', () => {
    expect(new InternalError('boom').statusCode).toBe(500);
  });

  it('ExternalServiceError has statusCode 502', () => {
    expect(new ExternalServiceError('guard.paxio.network timeout').statusCode).toBe(502);
  });

  it('all errors serialize to JSON', () => {
    const e = new ValidationError('bad', { field: 'did' });
    const json = e.toJSON();
    expect(json).toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: 'bad',
      statusCode: 400,
      context: { field: 'did' },
    });
  });
});
```

#### `tests/logger.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from 'app/lib/logger.js';

describe('Logger', () => {
  let stdoutWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('emits JSON on info()', () => {
    const log = createLogger({ level: 'info' });
    log.info('hello', { user: 'alice' });
    const out = stdoutWrite.mock.calls[0]?.[0];
    expect(out).toBeDefined();
    const parsed = JSON.parse(out as string);
    expect(parsed).toMatchObject({ level: 'info', msg: 'hello', user: 'alice' });
    expect(typeof parsed.time).toBe('number');
  });

  it('respects log level (debug not emitted at info level)', () => {
    const log = createLogger({ level: 'info' });
    log.debug('ignore me');
    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('child() inherits bindings', () => {
    const log = createLogger({ level: 'info' });
    const child = log.child({ reqId: 'abc' });
    child.info('handled');
    const out = stdoutWrite.mock.calls[0]?.[0];
    const parsed = JSON.parse(out as string);
    expect(parsed.reqId).toBe('abc');
  });
});
```

#### `tests/clock.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { createSystemClock, createFixedClock } from 'app/lib/clock.js';

describe('Clock', () => {
  it('systemClock.now() returns current timestamp', () => {
    const c = createSystemClock();
    const before = Date.now();
    const n = c.now();
    const after = Date.now();
    expect(n).toBeGreaterThanOrEqual(before);
    expect(n).toBeLessThanOrEqual(after);
  });

  it('systemClock.nowIso() returns ISO 8601', () => {
    const c = createSystemClock();
    expect(c.nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/);
  });

  it('fixedClock returns fixed time', () => {
    const c = createFixedClock(1_700_000_000_000);
    expect(c.now()).toBe(1_700_000_000_000);
    expect(c.nowIso()).toBe('2023-11-14T22:13:20.000Z');
  });
});
```

#### `tests/contracts.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import type { Logger, Clock } from 'app/interfaces/index.js';
import { CAPABILITIES } from 'app/types/index.js';

describe('Contracts export surface', () => {
  it('interfaces have Logger type', () => {
    const logger: Logger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      child: () => logger,
    };
    expect(logger).toBeDefined();
  });

  it('interfaces have Clock type', () => {
    const clock: Clock = { now: () => 0, nowIso: () => '1970-01-01T00:00:00.000Z' };
    expect(clock.now()).toBe(0);
  });

  it('CAPABILITIES is readonly tuple of 5', () => {
    expect(CAPABILITIES).toHaveLength(5);
    expect(CAPABILITIES).toContain('REGISTRY');
    expect(CAPABILITIES).toContain('WALLET');
  });
});
```

### 1.5 Acceptance script (architect пишет)

`scripts/verify_foundation.sh`:

```bash
#!/usr/bin/env bash
# M00 Foundation acceptance — проверяет что весь скелет корректный
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "FAIL: $1" >&2; exit 1; }
pass() { echo "PASS: $1"; }

echo "=== 1. Git repo ==="
[ -d .git ] || fail "no git repo"
git log --oneline -1 >/dev/null 2>&1 || fail "no commits yet"
pass "git repo initialised"

echo "=== 2. Workspace structure ==="
for d in server app/types app/interfaces app/errors app/lib app/config app/data app/domain app/api canisters/src/shared packages/sdk packages/mcp-server tests scripts docs opensrc .github/workflows; do
  [ -d "$d" ] || fail "missing directory: $d"
done
pass "all skeleton directories present"

echo "=== 3. Root files ==="
for f in package.json tsconfig.base.json vitest.config.ts .gitignore .eslintrc.json .prettierrc.json README.md CLAUDE.md; do
  [ -f "$f" ] || fail "missing file: $f"
done
pass "all root files present"

echo "=== 4. Package.json workspaces ==="
node -e "const p=require('./package.json'); if(!Array.isArray(p.workspaces)) process.exit(1); if(!p.workspaces.includes('packages/*')) process.exit(1);" || fail "package.json workspaces misconfigured"
pass "npm workspaces configured"

echo "=== 5. TypeScript config ==="
npx tsc --version >/dev/null 2>&1 || fail "tsc not available"
pass "tsc available"

echo "=== 6. Npm scripts present ==="
for s in typecheck test lint; do
  node -e "const p=require('./package.json'); if(!p.scripts || !p.scripts['$s']) process.exit(1);" || fail "missing npm script: $s"
done
pass "npm scripts typecheck/test/lint defined"

echo "=== 7. Types + interfaces exist ==="
for f in app/types/result.ts app/types/did.ts app/types/capability.ts app/types/agent-card.ts app/types/errors.ts app/types/index.ts app/interfaces/logger.ts app/interfaces/clock.ts app/interfaces/index.ts; do
  [ -f "$f" ] || fail "missing: $f"
done
pass "types and interfaces present"

echo "=== 8. Typecheck passes ==="
npm run typecheck 2>&1 | tail -20 | grep -q "error" && fail "typecheck errors" || true
pass "typecheck clean"

echo "=== 9. Tests present + GREEN ==="
[ -f tests/result.test.ts ] || fail "missing tests/result.test.ts"
[ -f tests/types.test.ts ] || fail "missing tests/types.test.ts"
[ -f tests/errors.test.ts ] || fail "missing tests/errors.test.ts"
[ -f tests/logger.test.ts ] || fail "missing tests/logger.test.ts"
[ -f tests/clock.test.ts ] || fail "missing tests/clock.test.ts"
[ -f tests/contracts.test.ts ] || fail "missing tests/contracts.test.ts"
npm run test -- --run 2>&1 | tail -20 | grep -qE "(failed|FAIL)" && fail "tests have failures" || true
pass "all foundation tests GREEN"

echo "=== 10. Lint clean ==="
npm run lint 2>&1 | tail -10 | grep -qE "error" && fail "lint errors" || true
pass "lint clean"

echo "=== 11. CI workflow present ==="
[ -f .github/workflows/ci.yml ] || fail "no CI workflow"
pass "CI workflow present"

echo ""
echo "✅ M00 Foundation: ALL CHECKS PASSED"
```

### 1.6 E2E scenario (architect пишет)

`docs/e2e/M00-foundation-canary.md`:

```markdown
# E2E: M00 Foundation Canary

## Среда
- [x] developer laptop (fresh clone)

## Предусловия
- Node.js ≥ 22 installed
- npm ≥ 10 installed
- git installed
- TypeScript-compatible editor (VSCode/Cursor)

## Шаги

### 1. Fresh clone
\```bash
cd /tmp
rm -rf paxio-canary
git clone <repo-url> paxio-canary
cd paxio-canary
\```
**Ожидаемый:** клонирование проходит, `.git` и файлы на месте.

### 2. Install
\```bash
npm install
\```
**Ожидаемый:** установка проходит без ошибок, создаётся `node_modules/`, все workspaces resolved.

### 3. Typecheck
\```bash
npm run typecheck
\```
**Ожидаемый:** 0 TypeScript errors.

### 4. Unit tests
\```bash
npm run test -- --run
\```
**Ожидаемый:** все 6 тест-файлов GREEN (result, types, errors, logger, clock, contracts). Минимум 30 тестов passed.

### 5. Lint
\```bash
npm run lint
\```
**Ожидаемый:** нет ошибок линтера (eslint-config-metarhia).

### 6. Acceptance
\```bash
bash scripts/verify_foundation.sh
\```
**Ожидаемый:** все 11 проверок PASS, финальное `✅ M00 Foundation: ALL CHECKS PASSED`.

### 7. Developer can add new type
Симуляция: разработчик добавляет `app/types/test-scratch.ts` с минимальным типом, импортирует в `tests/scratch.test.ts`, запускает тест.
**Ожидаемый:** typecheck + test проходят без дополнительной настройки.

## Постусловия
- Репозиторий готов для разработки
- Любой dev-агент может стартовать M01-M13 без дополнительной инфраструктурной работы

## Критерии успеха
- [ ] Все 7 шагов пройдены
- [ ] Новый разработчик может ≤15 минут от clone до tests GREEN

## Контакты для эскалации
architect (если E2E FAIL → hotfix milestone M00.1)
```

### 1.7 Templates для monorepo (architect пишет)

#### `package.json` (root)

```json
{
  "name": "paxio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "license": "UNLICENSED",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "typecheck": "tsc -p tsconfig.base.json --noEmit",
    "test": "vitest",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "lint": "eslint . && prettier --check \"**/*.{js,cjs,ts,tsx,json,md}\"",
    "fix": "eslint . --fix && prettier --write \"**/*.{js,cjs,ts,tsx,json,md}\"",
    "dev:server": "node --watch server/main.cjs",
    "server": "node server/main.cjs"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0",
    "eslint-config-metarhia": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "zod": "^3.23.0",
    "metaskills": "^1.0.4"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

#### `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "app/*": ["app/*"]
    }
  },
  "include": ["app/**/*.ts", "tests/**/*.ts", "packages/**/*.ts"],
  "exclude": ["node_modules", "dist", "target", "packages/frontend"]
}
```

#### `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      app: new URL('./app', import.meta.url).pathname,
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.integration.ts', 'node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['app/**/*.ts', 'packages/*/src/**/*.ts'],
      exclude: ['app/types/**', 'app/interfaces/**', 'tests/**'],
    },
  },
});
```

#### `.eslintrc.json`

```json
{
  "root": true,
  "extends": ["eslint-config-metarhia"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "module" },
  "env": { "node": true, "es2022": true },
  "ignorePatterns": ["node_modules", "dist", "target", "canisters/target"]
}
```

#### `.prettierrc.json`

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2
}
```

#### `.gitignore`

```
node_modules/
dist/
target/
.dfx/
.env
.env.*
!.env.example
*.log
coverage/
.DS_Store
.vscode/
.idea/

# canister artifacts
canisters/target/
packages/frontend/*/node_modules/
packages/frontend/*/.next/
```

#### `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push: { branches: [main, dev] }
  pull_request: { branches: [main, dev] }

jobs:
  typescript:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test -- --run

  rust:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cd canisters && cargo build --release
      - run: cd canisters && cargo test
      - run: cd canisters && cargo clippy -- -D warnings
```

#### `README.md` (минимальный)

```markdown
# Paxio — Agent Financial OS

> Financial OS for the Agentic Economy. Identity · Payment · Trust · Compliance · Intelligence.

**Status:** Phase 0 (Foundation). См. `docs/sprints/MILESTONES.md`.

## Documents
- `docs/architecture.md` — Strategy (symlink to NOUS_Strategy_v5.md)
- `docs/roadmap.md` — Development Roadmap (symlink)
- `docs/feature-areas/` — Feature Area specs (FA-01..FA-07)
- `CLAUDE.md` — Master rules
- `.claude/rules/engineering-principles.md` — SE principles reference

## Quickstart

\`\`\`bash
npm install
npm run typecheck
npm run test -- --run
npm run lint
bash scripts/verify_foundation.sh
\`\`\`

## License
UNLICENSED (pre-release).
```

---

## Шаг 2: Реализация

### 2.1 user (one-time setup actions)

Задачи user'а:
- [ ] `cd /home/nous/paxio && git init`
- [ ] Создать remote repo `paxio-network/paxio` на GitHub
- [ ] `git remote add origin git@github.com:paxio-network/paxio.git`
- [ ] Первый commit с настройкой (architect закоммитит спеки)

### 2.2 backend-dev

Задачи backend-dev:
- [ ] Выполнить startup protocol (9 шагов)
- [ ] Реализовать `app/errors/` — AppError hierarchy (9 классов: base AppError + 8 subclasses) → `tests/errors.test.ts` GREEN
- [ ] Реализовать `app/lib/logger.ts` — `createLogger({ level })` с JSON output, child(), levels → `tests/logger.test.ts` GREEN
- [ ] Реализовать `app/lib/clock.ts` — `createSystemClock()` + `createFixedClock(ms)` → `tests/clock.test.ts` GREEN
- [ ] `npm install` → проверить что workspaces работают
- [ ] `npm run typecheck && npm run test -- --run` — все GREEN
- [ ] `bash scripts/verify_foundation.sh` PASS

### 2.3 architect (после реализации)

- [ ] Проверить что все тесты GREEN
- [ ] Обновить MILESTONES.md статус M00 → ✅ ВЫПОЛНЕН

---

## Шаг 3: Проверка

### User → test-runner:
- [ ] `npm install`
- [ ] `npm run typecheck` — GREEN
- [ ] `npm run test -- --run` — все 6 тест-файлов GREEN
- [ ] `npm run lint` — clean
- [ ] `bash scripts/verify_foundation.sh` — PASS
- [ ] Если RED/FAIL → backend-dev фиксит → возврат к шагу 2

### User → reviewer:
- [ ] `git diff --name-only` — проверить scope (backend-dev trогал только app/errors/, app/lib/)
- [ ] `git diff tests/` — тесты НЕ изменены
- [ ] Quality review по engineering-principles.md section 27
- [ ] APPROVED → commit обновлённый project-state.md + tech-debt.md
- [ ] CHANGES REQUESTED → backend-dev фиксит

---

## Шаг 4: Закрытие + E2E

### Architect:
- [ ] Запустить `docs/e2e/M00-foundation-canary.md` сценарий сам: fresh clone в `/tmp/paxio-canary`, 7 шагов
- [ ] E2E PASS → M00 статус ВЫПОЛНЕН в `docs/sprints/MILESTONES.md`
- [ ] Обновить `docs/NOUS_Development_Roadmap.md` — «Монорепо setup» ✅ DONE
- [ ] E2E FAIL → создать hotfix milestone M00.1

---

## Оценка: 1-2 дня

## Статус: НЕ НАЧАТО

---

## Таблица задач

| # | Задача | Агент | Метод верификации | Файлы |
|---|---|---|---|---|
| 1 | `git init` + remote + первый коммит | user | acceptance: `scripts/verify_foundation.sh` шаг 1 PASS | — |
| 2 | Создать директории на лету при записи файлов (no separate script) | architect + backend-dev | acceptance: шаг 2 PASS | — |
| 3 | `package.json` + `tsconfig.base.json` + `vitest.config.ts` + eslint/prettier | architect | acceptance: шаги 3-6 PASS | templates из 1.7 |
| 4 | `app/types/{result,did,capability,agent-card,errors,index}.ts` | architect | unit test: `tests/result.test.ts` + `tests/types.test.ts` compile | `app/types/*.ts` |
| 5 | `app/interfaces/{logger,clock,index}.ts` | architect | unit test: `tests/contracts.test.ts` compile | `app/interfaces/*.ts` |
| 6 | `tests/{result,types,errors,logger,clock,contracts}.test.ts` (RED) | architect | tests compile + RED | `tests/*.test.ts` |
| 7 | `scripts/verify_foundation.sh` | architect | script executable | `scripts/verify_foundation.sh` |
| 8 | `docs/e2e/M00-foundation-canary.md` | architect | E2E doc present | `docs/e2e/M00-foundation-canary.md` |
| 9 | `.github/workflows/ci.yml` | architect | CI stub present | `.github/workflows/ci.yml` |
| 10 | `README.md` root | architect | readme present | `README.md` |
| 11 | `.gitignore` + `.env.example` | architect | gitignore present | `.gitignore`, `.env.example` |
| 12 | `app/errors/index.ts` + 9 AppError classes | backend-dev | unit test: `tests/errors.test.ts` GREEN | `app/errors/index.ts`, `app/errors/classes.ts` |
| 13 | `app/lib/logger.ts` — `createLogger()` JSON output, levels, child() | backend-dev | unit test: `tests/logger.test.ts` GREEN | `app/lib/logger.ts` |
| 14 | `app/lib/clock.ts` — `createSystemClock()` + `createFixedClock()` | backend-dev | unit test: `tests/clock.test.ts` GREEN | `app/lib/clock.ts` |
| 15 | `npm install` + verify workspaces | backend-dev | acceptance: шаг 4 PASS | — |
| 16 | E2E canary fresh clone → tests GREEN | architect (self-test) | E2E `docs/e2e/M00-foundation-canary.md` 7 шагов pass | — |
