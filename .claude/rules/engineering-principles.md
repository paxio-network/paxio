---
description: Architect-level software engineering principles — type systems, polymorphism, composition, dispatch, abstraction, metaprogramming, concurrency, DSL, and more. Reference document for architect (RED spec design) + reviewer (Phase 0 walks). Auto-loads only on architect-zone files; dev-agents load manually if a specific principle is referenced from their milestone.
globs: ["packages/{types,interfaces,errors,contracts}/**/*.ts", "docs/sprints/**/*.md", "docs/feature-areas/**/*.md"]
---

# Engineering Principles — Paxio Architect Reference

> Принципы-мета, которые architect применяет при дизайне типов, интерфейсов, milestones.
> Dev-агенты опираются при реализации. Reviewer использует при quality review.
>
> Не перечитывается целиком каждый раз. Используется как индекс по темам.

---

## 1. Type systems — nominal, structural, variance

**TypeScript = structural typing.** Два типа совместимы если их shapes совпадают.
**Rust = nominal typing.** Два типа совместимы ТОЛЬКО если один явно — другой (или impl trait).

### Structural (TS)
```typescript
type A = { did: string };
type B = { did: string };
const a: A = { did: 'x' };
const b: B = a;  // ✅ OK — shapes совпадают
```

### Nominal (Rust)
```rust
struct A(String);
struct B(String);
let a: A = A("x".into());
let b: B = a;  // ❌ error: expected B, got A
```

### Variance (ковариантность / контравариантность)

**Ковариантность**: `Dog <: Animal` ⇒ `List<Dog> <: List<Animal>` (только если read-only).
**Контравариантность**: `Dog <: Animal` ⇒ `Consumer<Animal> <: Consumer<Dog>` (handlers).
**Инвариантность**: `List<Dog>` ≠ `List<Animal>` для mutable collections.

TS: функция параметры **контравариантны**, возврат **ковариантен**.

**Правило для Paxio:**
- Всегда используй `readonly` для параметров если не мутируешь — расширяет ковариантность
- В `app/types/` Zod схемы дают structural типы — **не делай** "brand types" (`type Did = string & { _brand: 'did' }`) без крайней нужды

### Red flags
- ❌ `const x: A = {} as A` — cast в обход проверки
- ❌ `any` в публичных API — убивает всю систему типов
- ✅ `unknown` + Zod validation на границе

---

## 2. Polymorphism — 4 вида

| Вид | Что | TS пример | Rust пример |
|---|---|---|---|
| **Parametric** | Generics. Один код — много типов | `function first<T>(xs: T[]): T` | `fn first<T>(xs: &[T]) -> &T` |
| **Ad-hoc** | Overloading, traits/interfaces | `add(a, b)` работает для чисел и строк | `trait Add { fn add(...); }` |
| **Subtype** | Inheritance / subtyping | `class Dog extends Animal` | `trait Animal; struct Dog: Animal` (через impl) |
| **Row** | Structural extension | `type WithId<T> = T & { id: string }` | N/A (Rust — nominal) |

**Правило для Paxio:**
- Предпочитай **parametric** (generics) и **ad-hoc** (interfaces/traits) subtyping'у
- **НЕТ class inheritance** в TypeScript (`extends` между domain-классами запрещён). Используй композицию + interfaces
- Rust — используй traits, не думай о class inheritance (его нет)

### Red flags
- ❌ `class Wallet extends BaseWallet extends BaseEntity` — inheritance chain = фрагильный код
- ❌ `if (x instanceof Dog) ... else if (x instanceof Cat)` — заменить на polymorphism через trait/interface
- ✅ `interface PaymentAdapter { pay(...): Result }` + N implementations

---

## 3. Composition — structural, aggregation, delegation, functional

### Structural composition
Объект СОДЕРЖИТ другой объект как поле.
```typescript
class Wallet {
  constructor(
    private signer: Signer,      // has-a
    private audit: AuditLog,     // has-a
  ) {}
}
```

### Aggregation vs Composition
- **Aggregation**: объект использует другой, но не владеет lifecycle. Если Wallet уничтожен, Signer может жить.
- **Composition (strict)**: владеет lifecycle. Wallet уничтожен → Signer уничтожен.
- TS/Rust — обычно aggregation (GC / ownership handle lifecycle).

### Delegation
Объект делегирует метод другому.
```typescript
class LoggingWallet {
  constructor(private inner: Wallet, private logger: Logger) {}
  pay(...args) {
    this.logger.info('pay called');
    return this.inner.pay(...args);  // delegates
  }
}
```

### Functional composition
```typescript
const pipe = <A, B, C>(f: (a: A) => B, g: (b: B) => C) => (a: A) => g(f(a));
const process = pipe(parse, validate);
```

**Правило для Paxio:**
- **Композиция > наследование.** Всегда.
- Decorator pattern через composition + interface — OK
- В Rust: `#[derive(Deref)]` для delegation только для infra-типов, не для domain

### Red flags
- ❌ Глубокие inheritance chains (>1 уровень)
- ❌ `super.parentMethod()` — coupling с parent
- ✅ `new Service(a, b, c)` — явная composition в constructor'е

---

## 4. Abstraction layers + separation

Paxio имеет ТРИ уровня абстракции (из `architecture.md`):

```
server/     — infrastructure (I/O, Fastify, DB, Redis, ICP HTTP)
  ↑
app/api/    — HTTP handlers (validation → domain)
  ↑
app/domain/ — pure business logic (NO I/O, NO external calls)
  ↑
app/lib/    — pure utilities (no dependencies on app/)
```

**Зависимости — ТОЛЬКО внутрь.** `domain/` не знает о `api/`. `lib/` не знает о `domain/`.

### Law of Demeter (LoD)

«Говори только с непосредственными друзьями».

```typescript
// ❌ bad — LoD violation
wallet.signer.key.publicKey.toHex();

// ✅ good — wallet exposes what's needed
wallet.getPublicKeyHex();
```

Правило большого пальца: `a.b.c.d` — это сигнал нарушения LoD.

### Red flags
- ❌ `api/` импортирует из `server/`
- ❌ `domain/` вызывает `fetch()` или `fs.readFile()`
- ❌ Глубокое цепочное обращение `a.b.c.d.e()`

---

## 5. Dispatch — static vs dynamic

### Static dispatch
Метод известен в compile-time. Генерируется код конкретного вызова.
```rust
fn call(signer: &dyn Signer) { signer.sign() }  // dynamic
fn call<S: Signer>(signer: &S) { signer.sign() } // static (generics, monomorphization)
```

### Dynamic dispatch
Метод определяется в runtime через vtable.
```typescript
const adapter: PaymentAdapter = getAdapter(route);  // runtime choice
adapter.pay(...)  // dynamic
```

**Правило для Paxio:**
- **Генерики (static dispatch) по умолчанию** — быстрее, проверяется в compile-time
- **Dynamic dispatch** только там где набор реализаций неизвестен заранее (плагины, адаптеры выбираемые в runtime)

### Multi-dispatch
Выбор метода по ВСЕМ аргументам, не только по receiver. В TS/Rust нет — эмулируется через pattern matching.

### Red flags
- ❌ `abstract class` в TS с десятком `abstract` методов + N subclasses — обычно нужно 1-2 функции, не иерархия
- ✅ Discriminated union + switch:
```typescript
type Event = { type: 'paid'; amount: number } | { type: 'failed'; reason: string };
const handle = (e: Event) => e.type === 'paid' ? ... : ...;
```

---

## 6. Pure functions + referential transparency

### Pure function = детерминированная + без side-effects
```typescript
// ✅ pure
const add = (a: number, b: number) => a + b;

// ❌ impure (side-effect)
const addAndLog = (a, b) => { console.log(a); return a + b; };

// ❌ impure (non-deterministic)
const randomId = () => Math.random();
```

### Referential transparency
Выражение можно заменить его результатом без изменения смысла программы.
```typescript
const x = pure(5);       // x всегда то же самое
const y = pure(5);       // x === y
// Можно заменить: const z = pure(5) + pure(5); → const z = 10;
```

**Правило для Paxio:**
- `app/domain/` — все функции ДОЛЖНЫ быть pure (чистые)
- I/O изолируется в `server/` и `app/api/`
- Нужен side-effect внутри domain? — возвращай **описание** effect'а (command object), исполняй в api/

### Red flags
- ❌ `Date.now()`, `Math.random()`, `console.log()` в `app/domain/`
- ❌ Мутация аргументов функции
- ✅ Явный параметр `now: number` передаётся в domain функцию

---

## 7. ADT — Abstract Data Types

ADT = тип определяется **операциями**, а не представлением. Реализация скрыта.

### Sum type (discriminated union)
```typescript
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const handleResult = <T, E>(r: Result<T, E>) =>
  r.ok ? use(r.value) : handleError(r.error);
```

### Product type (struct)
```typescript
interface AgentCard {
  did: Did;
  capabilities: Capability[];
  reputation: number;
}
```

### Opaque type
Скрытая реализация — клиент не знает внутри.
```typescript
// public API
export interface Registry {
  register(card: AgentCard): Promise<Result<Did, Error>>;
  resolve(did: Did): Promise<Result<AgentCard, Error>>;
}

// private implementation — не экспортируется
class RegistryImpl implements Registry { ... }
```

**Правило для Paxio:**
- `app/interfaces/` = ADT контракты. Реализация скрыта в `app/domain/*/impl.js`
- Result/Option pattern вместо throw для ожидаемых ошибок
- `type Did = string` — OK. `type Did = string & { _brand: 'did' }` — только если есть проверка на границе

---

## 8. State — hidden vs explicit

### Hidden state (encapsulated)
```typescript
class Counter {
  #count = 0;  // hidden
  increment() { this.#count++; }
  get value() { return this.#count; }
}
```

### Explicit state (functional)
```typescript
type Counter = { count: number };
const increment = (c: Counter): Counter => ({ count: c.count + 1 });
```

**Правило для Paxio:**
- **Предпочитай explicit state** в `app/domain/` (функциональный стиль)
- Hidden state OK в `server/infrastructure/` (DB clients, Redis connections — в них state связан с I/O)
- Canister state (`thread_local! { static STATE: RefCell<...>; }`) — hidden, но контролируемый через публичный API

### Red flags
- ❌ Глобальные mutable переменные в `app/`
- ❌ `let currentUser = ...` на module-level
- ✅ Передача state как параметр

---

## 9. Lazy evaluation

### Eager (default)
```typescript
const list = [1, 2, 3].map(expensive).filter(predicate);  // все map → все filter
```

### Lazy
```typescript
function* lazyMap(xs, f) { for (const x of xs) yield f(x); }
function* lazyFilter(xs, p) { for (const x of xs) if (p(x)) yield x; }
// only computed on demand
```

**Правило для Paxio:**
- Lazy — для **больших / бесконечных последовательностей** (crawl results, paginated APIs)
- Iterators / generators в JS. `Iterator` trait в Rust.
- **Не** используй lazy когда eager проще и всё умещается в память

### Red flags
- ❌ `Array.from(generator).map(...)` — убивает lazy, лучше map внутри generator
- ✅ `for await (const item of streamAgents())` — обрабатываем по одному

---

## 10. Declarative vs Imperative

### Imperative — КАК
```typescript
let total = 0;
for (let i = 0; i < items.length; i++) total += items[i].price;
```

### Declarative — ЧТО
```typescript
const total = items.reduce((sum, i) => sum + i.price, 0);
```

**Правило для Paxio:**
- `app/domain/` — **declarative** (функциональные комбинаторы, composition)
- `server/` — **imperative** где это естественно (setup, sequence of IO ops)
- SQL — declarative. Не склеивай SQL из кусков процедурно — используй query builder или ORM.

### Red flags
- ❌ `for` циклы с мутацией аккумулятора в domain
- ✅ `.map().filter().reduce()`

---

## 11. Recursion vs loops

### Recursion
```typescript
const sum = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs[0] + sum(xs.slice(1));
```

**Проблема JS/TS:** нет tail-call optimization в V8 → stack overflow на больших массивах.
**Rust:** есть но не гарантирована — используй iteration.

**Правило для Paxio:**
- **Loops / iterators для больших коллекций** (избегаем stack overflow)
- **Recursion для иерархических структур** (tree traversal, parse trees)
- Tree-like → recursion, list-like → loops/reduce

### Red flags
- ❌ Рекурсивный `sum`, `map`, `filter` на массивах > 1000 элементов
- ✅ Recursive AST walk

---

## 12. Generics — parametric programming

### TS
```typescript
function first<T>(xs: readonly T[]): T | undefined { return xs[0]; }
type Cache<K, V> = Map<K, V>;

// Constraints
function byId<T extends { id: string }>(xs: T[], id: string): T | undefined {
  return xs.find(x => x.id === id);
}
```

### Rust
```rust
fn first<T>(xs: &[T]) -> Option<&T> { xs.first() }

fn by_id<T: HasId>(xs: &[T], id: &str) -> Option<&T> {
  xs.iter().find(|x| x.id() == id)
}

trait HasId { fn id(&self) -> &str; }
```

**Правило для Paxio:**
- Generics с constraints (`T extends ...`, `T: Trait`) > generics без
- НЕТ `any` в generics — всегда сужай через `unknown` + narrow, либо constrain

### Red flags
- ❌ `function f<T>(x: T): T { return x as any; }` — убивает систему
- ✅ `function first<T>(xs: readonly T[]): T | undefined`

---

## 13. Coupling & cohesion

**Coupling** = насколько модули зависят друг от друга. Low = good.
**Cohesion** = насколько всё внутри модуля связано общей задачей. High = good.

### Измеряется
- Сколько импортов из других модулей? (coupling)
- Все функции в модуле работают над одной темой? (cohesion)

**Правило для Paxio:**
- `app/domain/registry/` — всё про registry, ничего про wallet (high cohesion)
- `app/domain/wallet/` не импортирует `app/domain/registry/` напрямую — через ports (low coupling)
- Shared concerns → `app/lib/`

### Red flags
- ❌ "utils.ts" с 50 несвязанных функций (low cohesion)
- ❌ `registry/` импортирует из 10 разных domain'ов (high coupling)
- ✅ `registry/` ← `lib/` ← `types/`

---

## 14. Mutable vs immutable

### Immutable (default)
```typescript
const xs = [1, 2, 3];
const ys = [...xs, 4];  // new array
```

### Mutable (когда нужна производительность)
```typescript
const arr = [];
for (let i = 0; i < 1_000_000; i++) arr.push(i);  // mutation for perf
```

**Правило для Paxio:**
- **Immutable по умолчанию** в `app/domain/`
- Mutable — ТОЛЬКО в `server/infrastructure/` (streams, buffers, DB results) или для горячих точек производительности
- `Object.freeze()` на конфигах, reference data
- Rust: `let` > `let mut`, `&` > `&mut`

### Red flags
- ❌ `function process(agent: Agent) { agent.did = 'new'; }` — мутирует argument
- ✅ `function process(agent: Agent): Agent { return { ...agent, did: 'new' }; }`

---

## 15. Idempotent operations

Идемпотентность: `f(f(x)) === f(x)`. Можно повторить без эффекта.

**Правило для Paxio:**
- **Все POST endpoints принимающие retries** должны быть идемпотентны (Idempotency-Key header)
- Payment operations — ОБЯЗАТЕЛЬНО идемпотентны (иначе double-charge при retry)
- Canister update calls — стремиться к идемпотентности

### Паттерны
- `create_if_not_exists(id)` — идемпотентно
- `upsert(key, value)` — идемпотентно
- `INSERT ... ON CONFLICT` — идемпотентно

### Red flags
- ❌ `POST /pay` без idempotency key → double-spend при network retry
- ✅ `POST /pay { idempotency_key: "uuid" }` → первый запрос платит, следующие возвращают тот же результат

---

## 16. Dependency Injection & Inversion of Control

### DI
Зависимости передаются в конструктор / функцию, не создаются внутри.

```typescript
// ❌ creates dependency internally
class Wallet {
  private db = new PostgresDB(...);  // hardcoded
}

// ✅ DI
class Wallet {
  constructor(private db: Database) {}  // injected
}
```

### IoC container
Composition root где ВСЕ зависимости собираются. В Paxio:
- Backend: `server/main.cjs` собирает клиентов (db, redis, qdrant, icp, guard), инъектирует через loader в `app/`
- Frontend: Next.js Context / Providers — IoC
- Canisters: явная передача через `configure` методы

**Правило для Paxio:**
- **НИКАКИХ `new X()` в domain коде.** Получаем через DI.
- В `app/` domain-функции получают зависимости как параметры
- Composition root — `apps/back/server/main.cjs` (backend), `apps/frontend/<app>/app/providers.tsx` (frontend — per-app Privy + React Query)

### Red flags
- ❌ `import { db } from '../server/db.cjs'` в `app/domain/`
- ❌ `new PostgresClient(...)` внутри service метода
- ✅ `export const createRegistryService = (deps: { db: Database }) => ({ ... })`

---

## 17. Concurrency & async

### Models
- **Threads + locks** (Rust, Go)
- **Single-threaded event loop + async** (Node.js — наш выбор)
- **Actors** (Erlang, Akka)
- **CSP** (Go channels)

**Paxio (Node.js):**
- `async/await` для I/O
- **НЕТ CPU-intensive работы** в main event loop — используй `worker_threads` или вынеси в отдельный сервис
- Нет shared mutable state между concurrent requests (каждый request — свой scope)

### Race conditions
```typescript
// ❌ race
let counter = 0;
async function increment() { counter = counter + 1; }
await Promise.all([increment(), increment()]);  // может быть 1, не 2

// ✅ atomic
// Используй Redis INCR, PostgreSQL SERIAL, или мьютекс из библиотеки
```

**Правило для Paxio:**
- **Все финансовые операции в transactions** (DB или canister atomic update)
- Redis для rate-limiting через `INCR` + `EXPIRE`
- Canister calls — atomic at canister level (single-threaded)

### Red flags
- ❌ `const x = await getX(); if (x) { await setX(x + 1); }` — race condition
- ❌ CPU-intensive loop блокирует event loop → все requests тормозят
- ✅ DB transaction / Redis INCR / Rust canister atomic update

---

## 18. Multiparadigm programming

Используй подходящую парадигму для задачи:

| Задача | Парадигма |
|---|---|
| Domain logic (pure) | **Functional** (pure functions, immutable data) |
| Infrastructure (I/O) | **Imperative** / **OOP-light** (classes для DB client, Redis client) |
| Stateful service | **OOP** (class с методами и state) |
| Data pipeline | **Functional** (map/filter/reduce) |
| Protocol parsing | **Declarative** (parser combinators, grammars) |
| Async coordination | **CSP-like** (async/await, streams) |

**Правило для Paxio:**
- Не насилуй ОДНУ парадигму на ВСЁ. FP для domain, OO для infra, declarative для validation (Zod)
- НЕТ `class` в `app/domain/` — функции + типы. `class` в `server/` OK для infra-клиентов

### Red flags
- ❌ "Everything is a class" (Java-стиль в TS)
- ❌ "Everything is a function" (force FP где class естественнее)
- ✅ Правильный инструмент для слоя

---

## 19. Metaprogramming — codegen + dynamic

### Code generation
Генерируем код до/во время compile:
- Candid `.did` → TS bindings (через `dfx generate`)
- Zod schema → TS type (через `z.infer`)
- OpenAPI spec → client code
- SQL schema → TS types (Prisma, kysely-codegen)

### Dynamic
Создаём код в runtime:
- `eval()`, `new Function()` — **ЗАПРЕЩЕНО** в Paxio (security.md)
- Reflection через Zod.parse — OK
- Dynamic import через `await import(...)` — OK для plugins/adapters

**Правило для Paxio:**
- **Предпочитай codegen над dynamic.** Генерация стабильнее и быстрее.
- Zod как source of truth для schema → TS типы + OpenAPI генерируются
- Candid `.did` как source of truth для canister API → TS bindings генерируются

### Red flags
- ❌ `eval(userInput)` — security hole
- ❌ `new Function('return ' + code)` — тот же eval
- ✅ `z.infer<typeof schema>` — compile-time generation

---

## 20. Platform-agnostic / framework-agnostic

Бизнес-логика не должна зависеть от конкретного framework.

```typescript
// ❌ domain coupled to Fastify
export function registerRoute(app: FastifyInstance) {
  app.post('/register', async (req, reply) => { ... });
}

// ✅ domain independent
// app/domain/registry/register.js
export const register = async (card: AgentCard, deps: RegistryDeps): Promise<Result<Did, Error>> => { ... };

// app/api/registry/register.js — wire to Fastify here
({ httpMethod: 'POST', path: '/register', method: async ({ body }) => await domain.registry.register(body, deps) });
```

**Правило для Paxio:**
- `app/domain/` ничего не знает про Fastify, Express, Next.js
- Test domain без подняия HTTP server
- Swap Fastify на Hono — только `server/` + `app/api/` меняется, domain остаётся

### Red flags
- ❌ `import { FastifyRequest } from 'fastify'` в `app/domain/`
- ❌ `import { NextRequest } from 'next/server'` в domain
- ✅ Pure функция в domain + thin adapter в api/

---

## 21. DSL / Interpreter / AST

**DSL** — мини-язык для предметной области. Две разновидности:

### Internal DSL (embedded)
Библиотека с fluent API:
```typescript
z.object({ did: z.string(), score: z.number().min(0).max(1) })  // Zod — internal DSL
```

### External DSL (parser + interpreter)
Отдельный синтаксис:
- SQL
- GraphQL
- Candid `.did`
- Regex

**AST** — абстрактное синтаксическое дерево после парсинга.

**Правило для Paxio:**
- Используем **внешние DSL через проверенные парсеры** (Candid, regex, SQL)
- Свои DSL пишем только если: а) domain требует, б) expressiveness выигрыш огромен
- Complior scanner использует AST парсеры (TS AST, Python AST) — это OK

### Red flags
- ❌ "Давайте напишем свой язык для конфигов" — 99% неправильный ответ
- ✅ JSON / YAML / Zod / TOML достаточно

---

## 22. Contract programming

Контракт = precondition + postcondition + invariant.

```typescript
interface Wallet {
  // precondition: amount > 0, to valid BTC address
  // postcondition: возвращает TxHash или Error
  // invariant: balance >= 0 всегда
  pay(to: BtcAddress, amount: Satoshi): Promise<Result<TxHash, WalletError>>;
}
```

**Правило для Paxio:**
- `app/interfaces/*.ts` содержат контракты (types + JSDoc с pre/postconditions)
- Validation на границе (Zod) = enforcement preconditions
- Tests проверяют invariants и postconditions
- Architect пишет контракты ДО реализации (contract-first)

### Red flags
- ❌ Метод без описания precondition/postcondition → неопределённое поведение на границе
- ✅ Явный Zod schema + JSDoc + типизированный Result

---

## 23. Separation of system and applied code

Metarhia-принцип. Код делится на:
- **System code** (инфраструктура, platform): file I/O, sockets, DB drivers, cryptography low-level
- **Applied code** (бизнес-логика): domain rules, user-facing features

**В Paxio:**
- `server/` + `server/infrastructure/` = system code
- `app/domain/` + `app/api/` = applied code
- `app/lib/` = shared utilities (чаще applied, может заходить в system)

**Правило:**
- System — пишут senior / специалисты (Fastify internals, canister HTTPS outcalls, threshold ECDSA)
- Applied — пишут любые dev-агенты по контрактам
- Граница **явная** (VM sandbox, interfaces, ports)

### Red flags
- ❌ Бизнес-логика в `server/infrastructure/db.cjs`
- ❌ `fs.readFile` в `app/domain/`
- ✅ `domain.registry.register(card, { db })` — applied уровень, db инъектирован

---

## 24. Language and semantics

Каждый язык имеет **семантику**:
- **TypeScript** = JavaScript semantics + type system. Все типы СТИРАЮТСЯ в runtime
- **Rust** = strict ownership, lifetimes, no GC, zero-cost abstractions
- **Python** = dynamic typing, GIL, reference semantics

**Правило для Paxio:**
- Понимай что типы TS — compile-time only. Runtime валидация ТОЛЬКО через Zod / validators
- Не путай `readonly` (compile-time) с immutability (runtime) — нужны оба
- В Rust: ownership — не "сложность", а гарантия безопасности

### Red flags (TS)
- ❌ `const x: Did = userInput as Did` — cast НЕ валидирует в runtime
- ✅ `const x = DidSchema.parse(userInput)` — реальная валидация

### Red flags (Rust)
- ❌ `.unwrap()` в production коде
- ❌ `clone()` везде чтобы "обойти borrow checker" — обычно дизайн-проблема
- ✅ `?` для propagate ошибок, `Cow<str>` для избежания лишних аллокаций

---

## 25. SOLID

| Принцип | Что | Пример в Paxio |
|---|---|---|
| **S** Single Responsibility | Модуль делает ОДНУ вещь | `app/domain/wallet/pay.js` — только pay logic |
| **O** Open-Closed | Открыт для extension, закрыт для modification | `PaymentAdapter` interface + N impl (x402, MPP, TAP) |
| **L** Liskov Substitution | Subtype взаимозаменяем с supertype | Любой `PaymentAdapter` работает в `FAPRouter` |
| **I** Interface Segregation | Много маленьких интерфейсов > один большой | `Signer` отдельно от `KeyStore` |
| **D** Dependency Inversion | Зависим от abstractions, не от concretes | Domain зависит от `Database` interface, не от `PostgresClient` |

**Правило для Paxio:**
- SRP на уровне файла: один файл = одна ответственность
- SRP на уровне функции: одна функция = одно дело (no "god functions")
- DIP через DI (см. раздел 16)

### Red flags
- ❌ "util.ts" с 30 функциями про всё (SRP violation)
- ❌ `Wallet implements Signer, KeyStore, Broadcaster, AuditLogger, ...` (ISP violation)
- ❌ `domain` импортирует `postgres-client` (DIP violation)

---

## 26. Granularity heuristics

| Уровень | Что = "one thing" |
|---|---|
| Function | Один логический шаг (можно описать одним глаголом) |
| File | Один связанный набор функций / тип / класс |
| Module | Одна бизнес-концепция (wallet, registry, fap) |
| Service | Один bounded context |
| Milestone | Один feature deliverable в Roadmap |
| Phase | Одно бизнес-достижение ($X MRR, N users, etc.) |

Paxio milestones — **feature-level**, tasks внутри — **file/function-level**.

---

## 27. Применение при review

При review PR reviewer проверяет (помимо scope):

- [ ] **Type safety**: нет `any`, нет `as X` без validation
- [ ] **Polymorphism**: нет inheritance chains, есть interface + implementations
- [ ] **Composition**: `new X(deps)` — явная composition, не internal `new`
- [ ] **Purity**: `app/domain/` функции pure (no I/O, no side-effects)
- [ ] **LoD**: нет `a.b.c.d` цепочек
- [ ] **State**: immutable default, mutation только где оправдано
- [ ] **DI**: зависимости injected, не created inside
- [ ] **Idempotency**: POST endpoints с retries — idempotent
- [ ] **Error handling**: Result pattern, нет голых throw
- [ ] **SRP**: один файл / функция = одна ответственность
- [ ] **Declarative**: `.map().filter().reduce()` > for loops (в domain)
- [ ] **Naming**: глаголы для функций, существительные для типов

---

## 28. Quick reference — где что

| Нужно | Где искать |
|---|---|
| Naming, formatting | `metaskills/js-conventions`, `code-style.md` |
| Error handling | `metaskills/error-handling`, `error-handling` skill |
| Data structures | `metaskills/js-data-structures`, `rust-data-structures` |
| GoF patterns | `metaskills/js-gof`, `rust-gof` |
| Fastify specifics | `fastify-best-practices`, `backend-architecture.md` |
| TypeScript patterns | `typescript-patterns` |
| Zod validation | `zod-validation` |
| Layer separation | `architecture.md`, `backend-architecture.md` |
| DI / IoC | `metarhia-principles`, этот файл раздел 16 |
| Contract programming | `metarhia-principles`, этот файл раздел 22 |
| Rust patterns | `rust-canister`, `rust-gof`, `rust-patterns` |
| ICP specifics | `icp-rust`, `icp-threshold-ecdsa`, `chain-fusion`, `bitcoin-icp` |
| Testing | `testing.md`, `workflow.md` |
| Security | `safety.md`, `security-ml`, `complior-security` |
| **Broader principles** (этот файл) | `engineering-principles.md` |
