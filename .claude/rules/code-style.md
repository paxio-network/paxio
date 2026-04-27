---
description: Cross-language code style reference — naming, error handling, data externalization, V8 optimization rules, FP discipline (R29-R75). Architect-zone reference for spec design. Dev-agents use domain-specific replacements which already cover relevant subsets — backend-code-style.md (TS/V8, factory pattern, no class in app/), frontend-rules.md (TS strict, no any, real-data invariant), rust-*.md (Rust style + lints + async patterns).
globs: ["packages/{types,interfaces,errors,contracts}/**/*.ts", "docs/sprints/**/*.md", "docs/feature-areas/**/*.md"]
---

# Code Style Rules

## General

- **snake_case** everywhere: functions, variables, filenames
- **PascalCase** for type names: `AgentCard`, `ReputationScore`, `FapRoute`
- **camelCase** for object properties and method names
- **UPPER_SNAKE_CASE** for constants: `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT_MS`
- Max 100 chars per line
- Comments in English

## TypeScript

### Imports (TypeScript — types/contracts)
```typescript
// app/types/ and app/interfaces/ are TypeScript (typed) but compiled/used as JS in VM sandbox
import type { AgentCard, ReputationScore } from 'app/types/agent.js';
import { ZodAgentCard } from 'app/types/schemas.js';
import { DatabaseError, NotFoundError } from 'app/errors/index.js';
```

Note: в `app/` нет `require()` — модули загружаются через `vm.Script` loader. См.
`.claude/rules/backend-architecture.md` для деталей.

### Error Handling
```typescript
// GOOD: Result pattern or custom error
export async function findAgent(did: string): Promise<Result<AgentCard, NotFoundError>> {
  const agent = await db.agents.findOne({ did });
  if (!agent) return Err(new NotFoundError(`Agent ${did} not found`));
  return Ok(agent);
}

// BAD: no error handling
export async function findAgent(did: string) {
  return await db.agents.findOne({ did }); // throws on not found
}
```

### Data Externalization
```typescript
// GOOD: reference data from JSON
import { PROTOCOL_FEES } from '../data/protocol-fees.json' with { type: 'json' };

// BAD: hardcoded values
const FEE = 0.003; // never hardcode
```

## Rust

### Naming
```rust
// snake_case for functions, variables, files
// PascalCase for types, enums, structs
pub struct WalletCanister { ... }
pub fn threshold_ecdsa_sign(&mut self, tx: &Transaction) -> Result<Signature, canister::Error> { ... }
```

### Error Handling
```rust
// GOOD: Result<T, E>
pub fn send_transaction(tx: UnsignedTx) -> Result<TxHash, WalletError> {
    if tx.value() == 0 {
        return Err(WalletError::ZeroAmount);
    }
    Ok(self.sign_and_broadcast(tx)?)
}

// Use thiserror for error enums
#[derive(Error, Debug)]
pub enum WalletError {
    #[error("zero amount not allowed")]
    ZeroAmount,
    #[error("insufficient balance: got {got}, need {need}")]
    InsufficientBalance { got: u64, need: u64 },
}
```

## No Hardcoded Values

Allowed as constants (in code):
- `0`, `1`, `-1` (identities)
- `true`, `false` (boolean flags)

NEVER hardcode:
- Paths → environment variable or config
- Ports, IPs → environment variable or config
- API keys, tokens → `.env` (gitignored)
- Thresholds, fees → JSON in `app/data/`
- Model names, version numbers → JSON config

## No File Bloat

- One logical unit per file
- Group related functions in a service file
- Don't create a new file for a single utility function

## No Copy-Paste

If you need the same logic in two places → extract it:
- Shared utility → `app/lib/`
- Shared type → `app/types/`
- Three similar lines → fine. Three similar blocks → refactor signal.

## Data Structures

Use the right tool for the data:

| Data | Use |
|------|-----|
| Structured records with validation | Zod schema + TypeScript type |
| Key-value cache | Redis |
| Vector search | Qdrant |
| Relation data | PostgreSQL |
| Immutable audit log | ICP canister |
| Reference lookup tables | JSON file |
| Secrets | Environment variables |

## V8 Optimization Rules (M-Q2 T-5 — ported from /PROJECT donor)

These rules are **performance + correctness invariants**. V8 (Node.js engine) deoptimizes
on certain patterns — performance drops by 10-100×. Beyond perf, several patterns also
hide bugs (missing fields, mixed types, prototype pollution).

### R29 [C57]: NO `for...in` — use `Object.keys() + for...of`

**Severity: P2** (performance, caught by ESLint).

```typescript
// ❌ for...in iterates prototype chain + V8 deopts
for (const key in obj) { console.log(key, obj[key]); }

// ✅ for...of with Object.keys/values/entries
for (const key of Object.keys(obj)) { console.log(key, obj[key]); }
for (const [key, value] of Object.entries(obj)) { console.log(key, value); }
```

ESLint enforcement (`no-restricted-syntax`):
```json
{ "selector": "ForInStatement", "message": "Use Object.keys() + for...of instead of for...in" }
```

### R30 [C58]: NO `delete obj.prop` — use spread exclusion

**Severity: P2** (V8 hidden class morphing — entire object deopts).

```typescript
// ❌ delete forces V8 to morph hidden class — slows every subsequent access
delete user.password;

// ✅ spread exclusion creates new object с same shape minus excluded fields
const { password, ...userWithoutPassword } = user;

// ✅ если нужна mutation — присвой undefined вместо delete
user.password = undefined;  // V8 hidden class stays stable
```

### R32 [C59]: NO RxJS / generators-as-async / Deferred / Async.js — only async/await

**Severity: P2** (style consistency, modern async).

Forbidden patterns:
- `import { Observable } from 'rxjs'` — use Promise / AsyncIterator
- `function*() { yield ... }` as async iterator — use `async function*` или `for await`
- `new Deferred(); deferred.resolve(...)` — use Promise constructor
- `import async from 'async'` (the npm package) — use Promise.all / for-await

Reason: mixing paradigms makes async flow hard to follow. Unified async/await across
codebase = single mental model.

### R34 [C61]: NO `.forEach()` с outer-scope mutation — use `.map/filter/reduce`

**Severity: P2** (FP discipline).

```typescript
// ❌ forEach с side-effect мутации — imperative, hard to compose
let total = 0;
items.forEach(item => { total += item.price; });

// ✅ reduce — declarative, single expression
const total = items.reduce((sum, item) => sum + item.price, 0);

// ❌ forEach building array — wasteful
const result: User[] = [];
users.forEach(user => { if (user.active) result.push(transform(user)); });

// ✅ filter + map — composable
const result = users.filter(user => user.active).map(transform);
```

`.forEach()` OK для **terminal side-effects** (logging, telemetry) where no value collected.

### R35 [C62]: Return objects (named fields), not arrays

**Severity: P2** (readability, refactor-safety).

```typescript
// ❌ array return — caller positional, easy to swap, no field names
function parseRange(s: string): [number, number] {
  return [start, end];
}
const [start, end] = parseRange("1-10");  // swap risk
const [end, start] = parseRange("1-10");  // ← bug, compiles fine

// ✅ object return — named, refactor-safe
function parseRange(s: string): { start: number; end: number } {
  return { start, end };
}
const { start, end } = parseRange("1-10");  // can't swap
```

Exception: tuple-style returns OK for **mathematical pairs** (`[x, y]` coordinates,
`[head, tail]` from list ops) where order is semantic.

### R36 [C63]: Consistent return shape — same fields в всех ветках

**Severity: P2** (V8 monomorphic inline caches + caller type narrowing).

```typescript
// ❌ different shapes per branch — V8 megamorphic, caller can't narrow
function classify(x: Item) {
  if (x.type === 'rule') return { ruleId: x.id, score: x.score };
  if (x.type === 'llm')  return { llmId: x.id, confidence: x.score };
  return { error: 'unknown' };
}

// ✅ discriminated union — one shape per discriminator value, all fields present
function classify(x: Item):
  | { kind: 'rule'; id: string; score: number }
  | { kind: 'llm'; id: string; score: number }
  | { kind: 'error'; reason: string }
{
  if (x.type === 'rule') return { kind: 'rule', id: x.id, score: x.score };
  if (x.type === 'llm')  return { kind: 'llm', id: x.id, score: x.score };
  return { kind: 'error', reason: 'unknown' };
}
```

См. также [R75 / C76 — Discriminated unions](#r75-c76-discriminated-unions--optional-fields)
ниже.

### R39 [C66]: Max file length: 300 lines

**Severity: P2** (cognitive load, modularity signal).

If a file > 300 lines:
- Likely violates SRP — single file doing multiple things
- Hard to review (PR diff overwhelms)
- Hard to navigate (search must scroll)

Split signals:
- Multiple unrelated function clusters → extract per-cluster file
- Helper functions only used internally → extract `<name>-helpers.ts`
- Type definitions accreted → extract `<name>-types.ts`

Exception: generated code (Zod schemas, OpenAPI clients) — comment with `// AUTOGENERATED`
header marks file как exempt.

### R40 [C67]: Monomorphic objects — V8 hidden classes stable

**Severity: P2** (performance, prevents megamorphic deopt).

```typescript
// ❌ different shapes for "same type" — V8 морфит hidden class каждый instance
const a = { id: 1, name: 'a' };
const b = { id: 2, name: 'b', extra: 'sometimes' };  // ← extra field
const c = { id: 3 };                                 // ← missing field

// ✅ all instances of same type have same shape
type User = { id: number; name: string; extra: string | null };
const a: User = { id: 1, name: 'a', extra: null };
const b: User = { id: 2, name: 'b', extra: 'sometimes' };
const c: User = { id: 3, name: 'c', extra: null };
```

**Tactical rule**: define TS interface/type, ALL instances populate ALL fields (use `null`
or sentinel values для missing data, not omission).

### R47 [C68]: Law of Demeter — no `a.b.c.d.e()`, max 1-level chaining

**Severity: P2** (coupling reduction, refactor safety).

```typescript
// ❌ deep chain — coupling с интernal structure of multiple objects
const fee = wallet.signer.key.publicKey.toHex();

// ✅ wallet exposes what's needed
const fee = wallet.getPublicKeyHex();
```

Refactor signal: `a.b.c` уже sus, `a.b.c.d` — guaranteed LoD violation. Add method to `a`
that returns `c` (or `d`) directly.

См. также [`engineering-principles.md` §4](engineering-principles.md) для подробного
обоснования.

### R75 [C76]: Discriminated unions > optional fields

**Severity: P2** (type safety, exhaustive narrowing).

```typescript
// ❌ optional fields — caller must check each
type Result = {
  success: boolean;
  data?: Data;
  error?: Error;
  warning?: string;
};
// caller: result.data может быть undefined даже когда success=true (compiler не помогает)

// ✅ discriminated union — compiler enforces narrowing
type Result =
  | { kind: 'ok'; data: Data }
  | { kind: 'error'; error: Error }
  | { kind: 'warning'; data: Data; warning: string };

// caller — exhaustive narrowing:
if (result.kind === 'ok') {
  use(result.data);  // ← guaranteed defined
} else if (result.kind === 'error') {
  log(result.error); // ← guaranteed defined
} else {
  use(result.data); log(result.warning);
}
```

Применять везде где есть mutually exclusive states — Result, FAP route choices, payment
status, agent kind, validation outcomes.
