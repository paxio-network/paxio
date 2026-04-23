---
description: Backend code style — FP-first, naming, purity, immutability for VM-sandbox app/ + server/ infrastructure
globs: ["apps/back/**/*.{cjs,js,ts}", "products/**/app/**/*.{js,ts}", "packages/utils/**/*.ts"]
---

# Backend Code Style — Paxio

## Functional Programming — обязательно для `app/`

### NO classes в `app/` (VM sandbox layer)

- **ЗАПРЕЩЕНО**: `class WalletManager { ... }`, `class FAPRouter { ... }`
- **РАЗРЕШЕНО**: plain objects + free functions + factory functions с closures
- **Исключение**: Error subclasses в `packages/errors/` + CJS mirror в `apps/back/server/lib/errors.cjs` (единственное место)

```javascript
// ✅ ПРАВИЛЬНО — функции + factory
const cache = new Map();
const calculateFee = (amount, rateSchedule) => { /* ... */ };
const getQuote = (assetPair) => cache.get(assetPair) ?? null;

({ calculateFee, getQuote })

// ❌ НЕПРАВИЛЬНО — класс
class FeeCalculator {
  constructor() { this.cache = new Map(); }
  calculate(amount) { ... }
}
```

### Pure functions в `domain/`

- `app/domain/` модули — чистая логика (engineering-principles §6)
- Все inputs через аргументы, все outputs через return
- Побочные эффекты (DB queries, ICP calls, HTTP fetches, LLM calls) — **только в `app/api/` или `apps/back/server/`** через injected deps
- State (Map, Set) допустим внутри модуля (sandbox изолирует)
- **Никогда `Date.now()` / `new Date()` / `Math.random()` напрямую** — используй injected `clock`/`prng`

```javascript
// ✅ ПРАВИЛЬНО — pure
const calculateFee = (amount, schedule, clock) => {
  const tier = schedule.tiers.find(t => amount >= t.min);
  return { fee: amount * tier.rate, calculatedAt: clock() };
};

// ❌ НЕПРАВИЛЬНО — hidden deps + impurity
const calculateFee = async (amount) => {
  const schedule = await db.query('SELECT ...'); // I/O в domain!
  return { fee: amount * 0.003, at: Date.now() }; // hardcoded + impure
};
```

### Immutability

- `Object.freeze()` на sandbox context — enforcement на уровне VM loader
- Spread для обновлений: `{ ...existing, status: 'paid' }`
- НЕ мутируй входные аргументы — создавай новый объект
- Arrays: `.slice()`, `.filter()`, `.map()`, `.toSorted()` вместо `.splice()`, `.push()`, `.sort()` на чужих данных
- Factory results — обернуть в `Object.freeze({ method1, method2 })` чтобы dev не мог мутировать

```javascript
// ✅ Factory pattern — frozen result
const createWalletService = (deps) => {
  const sign = async (intent) => { /* ... */ };
  const balance = async (did) => { /* ... */ };
  return Object.freeze({ sign, balance });
};
```

## Naming — backend

| Что | Стиль | Пример |
|---|---|---|
| Файлы `server/` | `kebab-case.cjs` | `guard-client.cjs`, `icp-actor.cjs` |
| Файлы `app/api/` | `kebab-case.js` | `register.js`, `landing-hero.js` |
| Файлы `app/domain/` | `kebab-case.ts` | `risk-scorer.ts`, `fap-router.ts` |
| Каталоги | `kebab-case` | `products/02-facilitator/app/domain/` |
| Функции | `camelCase` | `calculateFee()`, `routePayment()` |
| Factory functions | `create` prefix | `createWalletService()`, `createFAPRouter()` |
| Переменные | `camelCase` | `agentDid`, `transactionHash` |
| Booleans | `is`/`has`/`can` prefix | `isAuthenticated`, `hasPermission`, `canRoute` |
| Константы | `UPPER_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT_MS` |
| Error classes | `PascalCase` | `AppError`, `ValidationError`, `NotFoundError` |
| API paths | `kebab-case` | `/api/registry/find`, `/api/wallet/sign-transaction` |
| Zod schemas | `Zod` prefix + `PascalCase` | `ZodAgentCard`, `ZodSignRequest` |
| TypeScript types | `PascalCase` | `AgentCard`, `WalletState` |

## Модуль = один файл

- Один domain concept = один файл (`fap-router.ts`, `wallet-orchestrator.ts`, `intent-validator.ts`)
- НЕ дроби на отдельные файлы per function
- НЕ создавай `index.js` в `app/api/` — VM loader загружает все файлы из каталога автоматически
- В `app/domain/` тоже flat structure — loader подхватывает

## Config — нет hardcode

- Server config: `process.env` в `apps/back/server/main.cjs` → инжектируется как `config` в sandbox
- App код: только `config.section.value` — **никогда** `process.env`
- Пороги/timeouts: константы в начале файла с `UPPER_SNAKE_CASE`
- Магические числа: только `0`, `1`, `-1` допустимы без имени

```javascript
// ✅ ПРАВИЛЬНО
const MAX_INVOICE_AGE_MS = 30 * 60 * 1000;  // 30 min
const DEFAULT_FAP_TIMEOUT_MS = 5_000;
if (Date.now() - invoice.createdAt > MAX_INVOICE_AGE_MS) { /* ... */ }

// ❌ НЕПРАВИЛЬНО
if (Date.now() - invoice.createdAt > 1800000) { /* ... */ }
```

## Data Externalization — JSON, не hardcode

- Все справочные данные (fee schedules, routing rules, agent sources, threat patterns) в `apps/back/app/data/*.json` или `products/<fa>/app/data/*.json`
- Импорт: `import data from '../../../app/data/x.json' with { type: 'json' };`
- Backend наполняет JSON, **architect** определяет схему (Zod в `packages/types/`)

Примеры:
- `apps/back/app/data/protocol-fees.json` — fee schedules для x402/MPP/TAP/BTC
- `products/02-facilitator/app/data/routing-rules.json` — protocol routing decisions
- `products/01-registry/app/data/agent-sources.json` — ERC-8004, A2A, MCP, FetchAi, Virtuals

## No dead code

- НЕ оставляй закомментированный код
- НЕ оставляй stub функций без TODO + milestone reference (`// TODO M07-3: real impl after Bitcoin Agent`)
- Если функционал будущий — напиши минимальный stub с явным комментарием
- `console.log` в production = WARNING (используй inject'ed `console` который — Pino logger)

## Domain Purity — `app/domain/`

- **ZERO I/O** — domain/ НЕ делает DB queries, HTTP calls, file reads, ICP calls
- **ZERO side effects** — no logging (кроме `console.error` для unexpected branches), no broadcasting, no mutations
- domain/ = чистая математика: входные данные → результат
- Если нужен I/O — это задача `app/api/` слоя или `apps/back/server/infrastructure/`

```javascript
// ✅ domain/risk-scorer.ts — ПРАВИЛЬНО
const scoreRisk = (intent, weights) => {
  const score = weights.reduce((sum, w) => sum + w.value * intent[w.field], 0);
  return { riskLevel: score > 60 ? 'high' : 'low', score };
};

// ❌ domain/risk-scorer.ts — НЕПРАВИЛЬНО
const scoreRisk = async (intentId) => {
  const intent = await db.query('...'); // I/O в domain!
  return { riskLevel: 'high', score: 100 };
};
```

## Async / Concurrency

- `async/await` everywhere — никаких callbacks, no Deferred pattern
- **NO middleware pattern** (Express-style `app.use()`) — все логика explicit в handler
- **NO swallowed errors** — `catch {}` запрещено, минимум `console.error`
- AppError hierarchy для бизнес-ошибок: `ValidationError`, `NotFoundError`, `ForbiddenError`, `ConflictError`, `ProtocolError`, `InternalError`
- НЕ generic `throw new Error(...)` — только `throw new errors.SubclassError('msg')` (с `new`!)
- `Promise.allSettled()` для batch operations где partial failure ОК
- AbortSignal для cancellable operations с timeouts

## V8 Optimization

- **NO `for...in`** — `Object.keys()` + `for...of`
- **NO `delete obj.prop`** — spread `const { removed, ...rest } = obj`
- No holey arrays `[1, , 3]`
- No multi-type arrays `[1, 'a', {}]` — отдельные typed
- Monomorphic objects — consistent shape, all fields initialized
- `map`/`filter`/`reduce` over `forEach` с outer mutation
