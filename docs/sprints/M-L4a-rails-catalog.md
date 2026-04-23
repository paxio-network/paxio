# M-L4a — Rails Catalog + Stub Router

**Owner:** backend-dev
**Branch:** `feature/m-l4a-rails-catalog`
**Depends on:** M01c-backend ✅ (landing-stats factory готов)
**Estimate:** 1 день
**Status:** ⬜ READY TO START

## Зачем

`FAPDiagram` и `Rails ticker` на landing должны показывать **какие rails Paxio поддерживает**, даже когда трафика ещё нет (share_pct = 0). Сейчас `/api/landing/rails` возвращает пустой массив → пустая диаграмма → секция скрыта Progressive Reveal.

**M-L4a = честный каталог без реального роутинга.** 4 rail-node'а на FAPDiagram: x402, MPP, TAP, BTC L1. Каждый с описанием, категорией, share_pct=0. Это **не заглушка** — это реальный список того, что Paxio планирует/уже поддерживает. Полный роутинг + on-chain verify = M-L4b позже.

## Готово когда:
- [ ] `products/02-facilitator/app/data/rails-catalog.json` — 4 rails с полями {id, name, category, description, status}
- [ ] `products/02-facilitator/app/domain/fap-router.ts` — `createFapRouter(deps)` factory с методом `getRails(): Promise<Result<RailInfo[], FapError>>`
- [ ] `products/02-facilitator/app/api/fap-rails.js` — `GET /api/fap/rails` возвращает каталог
- [ ] `products/07-intelligence/app/domain/landing-stats.ts` — зависимость `getRailsCatalog` инжектится в `createLandingStats`
- [ ] `/api/landing/rails` возвращает реальные 4 rails из каталога (с share_pct=0 пока)
- [ ] Unit tests GREEN (12+ assertions)

## Метод верификации:
- [ ] **unit test** — `pnpm test -- --run tests/fap-rails-catalog.test.ts` → GREEN
- [ ] **acceptance** — `curl localhost:8000/api/landing/rails | jq` → 4 объекта rails
- [ ] **visual** — FAPDiagram на landing рисует 4 node с названиями и описаниями

## Scope (backend-dev)

| File | Purpose |
|---|---|
| `products/02-facilitator/app/data/rails-catalog.json` | Static JSON с 4 rails |
| `products/02-facilitator/app/domain/fap-router.ts` | `createFapRouter(deps)` factory → `FapRouter` port impl; метод `getRails()` читает из JSON |
| `products/02-facilitator/app/api/fap-rails.js` | `GET /api/fap/rails` → `RailInfo[]` |
| `products/07-intelligence/app/domain/landing-stats.ts` | Update: `LandingStatsDeps.getRailsCatalog` injected, used in `getRails()` |

## Контракт (architect готовит перед стартом)

### `packages/types/src/rails.ts`

```typescript
import { z } from 'zod';

export const ZodRailInfo = z.object({
  id: z.string(),                       // 'x402', 'mpp', 'tap', 'btc-l1'
  name: z.string(),                     // 'x402 (HTTP 402 micropayments)'
  category: z.enum(['http', 'onchain-evm', 'onchain-btc', 'offchain']),
  description: z.string(),              // 1-line marketing desc
  status: z.enum(['supported', 'planned', 'beta']),
  share_pct: z.number().min(0).max(100),// 0 на старте
});
export type RailInfo = z.infer<typeof ZodRailInfo>;
```

### `packages/interfaces/src/fap.ts`

```typescript
import type { Result, RailInfo } from '@paxio/types';

export type FapError =
  | { code: 'catalog_unavailable'; message: string };

export interface FapRouter {
  getRails(): Promise<Result<readonly RailInfo[], FapError>>;
}
```

## Архитектурные требования

- **Factory pattern** — `createFapRouter(deps)` возвращает `Object.freeze({ getRails })`
- **Pure function** — `getRails()` читает JSON, не делает I/O внутри domain (JSON — это reference data, импорт допустим)
- **Data externalization** — 4 rails ТОЛЬКО в JSON, никакого хардкода в `fap-router.ts`
- **Zod validation** — `rails-catalog.json` валидируется через `z.array(ZodRailInfo).parse(data)` при загрузке
- **Result<T, E>** pattern — без throw
- **multi-tenant filter не применим** (каталог публичный)

## RED тест (architect написал)

`tests/fap-rails-catalog.test.ts`:

```typescript
import { createFapRouter } from '../products/02-facilitator/app/domain/fap-router.js';
import { ZodRailInfo } from '@paxio/types';

describe('createFapRouter.getRails', () => {
  it('factory returns frozen service', () => {
    const router = createFapRouter({});
    expect(Object.isFrozen(router)).toBe(true);
  });

  it('returns exactly 4 rails from catalog', async () => {
    const router = createFapRouter({});
    const result = await router.getRails();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.length).toBe(4);
  });

  it('each rail validates against ZodRailInfo', async () => {
    const router = createFapRouter({});
    const result = await router.getRails();
    if (result.ok) {
      for (const rail of result.value) {
        expect(() => ZodRailInfo.parse(rail)).not.toThrow();
      }
    }
  });

  it('includes x402, mpp, tap, btc-l1', async () => {
    const router = createFapRouter({});
    const result = await router.getRails();
    if (result.ok) {
      const ids = result.value.map(r => r.id).sort();
      expect(ids).toEqual(['btc-l1', 'mpp', 'tap', 'x402']);
    }
  });

  it('initial share_pct is 0 for all', async () => {
    const router = createFapRouter({});
    const result = await router.getRails();
    if (result.ok) {
      expect(result.value.every(r => r.share_pct === 0)).toBe(true);
    }
  });

  it('is deterministic (same call → same result)', async () => {
    const router = createFapRouter({});
    const r1 = await router.getRails();
    const r2 = await router.getRails();
    expect(r1).toStrictEqual(r2);
  });

  it('is pure (no fetch/fs/setInterval)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const router = createFapRouter({});
    await router.getRails();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
```

## Таблица задач

| # | Задача | Агент | Метод верификации | Архитектурные требования | Файлы |
|---|---|---|---|---|---|
| 1 | Rails catalog JSON | backend-dev | manual check file format | 4 rails, все поля | `products/02-facilitator/app/data/rails-catalog.json` |
| 2 | `createFapRouter` factory | backend-dev | `tests/fap-rails-catalog.test.ts` GREEN | Factory, frozen, pure | `products/02-facilitator/app/domain/fap-router.ts` |
| 3 | `GET /api/fap/rails` handler | backend-dev | `curl` returns 4 rails | Result pattern | `products/02-facilitator/app/api/fap-rails.js` |
| 4 | Wire `getRailsCatalog` into `createLandingStats` deps | backend-dev | `/api/landing/rails` returns 4 rails | DI | `products/07-intelligence/app/domain/landing-stats.ts` |
