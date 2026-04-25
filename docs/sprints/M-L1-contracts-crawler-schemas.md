# M-L1-contracts — Crawler Contracts (per-source schemas + adapter port + storage migration)

**Owner:** architect (contracts, tests, schema design)
**Branch:** `feature/m-l1-contracts`
**Depends on:** M01 ✅ (Registry in-memory), M01c-backend ✅ (landing-stats uses Registry)
**Estimate:** 2 дня
**Status:** 🟡 IN PROGRESS

## Зачем

Чтобы M-L1-impl (registry-dev) мог реализовать 5 адаптеров (ERC-8004, A2A, MCP, Fetch.ai, Virtuals), ему нужны:
1. **Per-source Zod схемы** — у каждой экосистемы свой формат ответа. Нужна типизированная валидация на границе.
2. **Canonical AgentCard** — он уже есть в `packages/types/src/agent.ts`, но нужно дорасширить поля (source, external_id, etc.)
3. **`AgentSourceAdapter<S>` port** — единый интерфейс для всех 5 источников. Даёт swap-ability + test-ability.
4. **Postgres schema migration** — in-memory Map не держит 500K+ агентов. Storage layer обязателен.

После M-L1-contracts → registry-dev читает эти типы/интерфейсы/SQL и реализует по ним. Контракт — его ТЗ.

## Готово когда:

- [ ] `packages/types/src/sources/erc8004.ts` — Zod schema ERC-8004 on-chain agent registration event
- [ ] `packages/types/src/sources/a2a.ts` — Zod schema A2A Agent Card (Google AgentToAgent)
- [ ] `packages/types/src/sources/mcp.ts` — Zod schema MCP Server descriptor (Smithery + Anthropic registry)
- [ ] `packages/types/src/sources/fetch-ai.ts` — Zod schema Fetch.ai Agentverse API response
- [ ] `packages/types/src/sources/virtuals.ts` — Zod schema Virtuals Protocol ACP registry
- [ ] `packages/types/src/sources/index.ts` — re-exports + `SourceSchema` discriminated union
- [ ] `packages/types/src/agent.ts` — расширение `AgentCard` полями `source`, `externalId`, `crawledAt`, `sourceUrl` (обратная совместимость)
- [ ] `packages/interfaces/src/agent-source-adapter.ts` — `AgentSourceAdapter<S>` port
- [ ] `packages/interfaces/src/agent-storage.ts` — `AgentStorage` port (persistence boundary)
- [ ] `packages/contracts/sql/001_agent_cards.sql` — Postgres DDL (table + indexes + triggers)
- [ ] `tests/registry-source-adapters.test.ts` — **RED** unit тесты per-source validation
- [ ] `tests/registry-crawler-contract.test.ts` — **RED** contract tests (`AgentSourceAdapter`, `AgentStorage`)
- [ ] `tests/agent-card-extension.test.ts` — **RED** тесты расширения `AgentCard` (backward compat + new fields)

## Метод верификации:

- [ ] **unit tests** — `pnpm test -- --run tests/registry-source-adapters.test.ts tests/registry-crawler-contract.test.ts tests/agent-card-extension.test.ts` — все RED (падают как спецификации)
- [ ] **typecheck** — `pnpm typecheck` clean
- [ ] **контракт-ревью** — architect убеждается что пять per-source схем покрывают all fields которые будут в crawler'е

## Scope (architect — ONLY contracts, NO implementation)

### `packages/types/src/sources/` — 5 новых файлов + index

| File | Что описывает | Referenced API |
|---|---|---|
| `erc8004.ts` | On-chain agent registration event (ERC-8004 proposed standard) | Ethereum log → parsed fields |
| `a2a.ts` | Google A2A Agent Card JSON | `https://agent.example.com/.well-known/agent.json` |
| `mcp.ts` | MCP server descriptor from Smithery.ai + Anthropic MCP registry | Smithery REST API |
| `fetch-ai.ts` | Fetch.ai Agentverse agent card | Agentverse public API |
| `virtuals.ts` | Virtuals Protocol ACP registry entry | Virtuals.io GraphQL |
| `index.ts` | Re-exports + `SourceSchema` discriminated union |

### `packages/types/src/agent.ts` — extend `AgentCard`

Добавляем поля (optional, обратная совместимость с in-memory registrations):

```typescript
export const ZodAgentCard = z.object({
  // ... existing fields (did, name, description, capabilities, reputation, createdAt) ...
  source: z.enum(['erc8004', 'a2a', 'mcp', 'fetch-ai', 'virtuals', 'native']).default('native'),
  externalId: z.string().optional(),       // original ID in source system (contract addr / API id)
  sourceUrl: z.string().url().optional(),  // where this was crawled from
  crawledAt: z.string().datetime().optional(), // ISO timestamp
});
```

Existing `native` agents (зарегистрированные через `/registry/register`) получат `source: 'native'` по default.

### `packages/interfaces/src/agent-source-adapter.ts`

```typescript
import type { Result, AgentCard, AgentSource } from '@paxio/types';

export type SourceAdapterError =
  | { code: 'source_unavailable'; message: string }
  | { code: 'parse_error'; message: string; raw: unknown }
  | { code: 'rate_limit'; message: string; retryAfterMs: number };

export interface AgentSourceAdapter<TRaw> {
  readonly sourceName: AgentSource;

  /** Stream raw records from external source. Lazy iteration for memory safety. */
  fetchAgents(): AsyncIterable<TRaw>;

  /** Validate + normalize raw record to canonical AgentCard. */
  toCanonical(raw: TRaw): Result<AgentCard, SourceAdapterError>;
}
```

### `packages/interfaces/src/agent-storage.ts`

```typescript
import type { Result, AgentCard, Did, FindQuery, FindResult } from '@paxio/types';

export type StorageError =
  | { code: 'db_unavailable'; message: string }
  | { code: 'duplicate_did'; did: Did }
  | { code: 'not_found'; did: Did };

export interface AgentStorage {
  upsert(card: AgentCard): Promise<Result<void, StorageError>>;
  resolve(did: Did): Promise<Result<AgentCard, StorageError>>;
  find(query: FindQuery): Promise<Result<FindResult, StorageError>>;
  count(): Promise<Result<number, StorageError>>;
  countBySource(): Promise<Result<Record<AgentSource, number>, StorageError>>;
}
```

### `packages/contracts/sql/001_agent_cards.sql`

```sql
CREATE TABLE IF NOT EXISTS agent_cards (
  did            TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  capabilities   JSONB NOT NULL DEFAULT '[]'::jsonb,
  reputation     REAL NOT NULL DEFAULT 0,
  source         TEXT NOT NULL DEFAULT 'native',
  external_id    TEXT,
  source_url     TEXT,
  crawled_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload    JSONB
);

CREATE INDEX idx_agent_cards_source ON agent_cards(source);
CREATE INDEX idx_agent_cards_external_id ON agent_cards(source, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_agent_cards_capabilities_gin ON agent_cards USING gin(capabilities);
CREATE INDEX idx_agent_cards_reputation_desc ON agent_cards(reputation DESC);
CREATE INDEX idx_agent_cards_name_trgm ON agent_cards USING gin(name gin_trgm_ops);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON agent_cards
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
```

## Архитектурные требования (в тестах)

- **Zod validation на boundary** — `toCanonical()` принимает `unknown`, возвращает `Result<AgentCard, SourceAdapterError>`, никогда не бросает
- **AsyncIterable для streams** — `fetchAgents()` не загружает всё в память сразу (memory safety для 500K+)
- **Pure translator** — `toCanonical(raw)` — чистая функция (without I/O), детерминированная
- **Factory pattern** — `createErc8004Adapter(deps)` → frozen adapter
- **Contract programming** — JSDoc precondition/postcondition/invariants на каждом port method
- **Error discrimination** — `SourceAdapterError` / `StorageError` — sum types, exhaustive handling

## RED тесты (что пишу)

### `tests/registry-source-adapters.test.ts`
Per-source schema validation — 5 × 6 = 30 assertions:
- valid fixture → passes
- missing required field → fails with `parse_error`
- extra field → passes (forward compat)
- invalid type → fails
- deterministic (same raw → same AgentCard)
- frozen result (Object.isFrozen)

### `tests/registry-crawler-contract.test.ts`
Port-level contract tests — не зависят от реализации:
- `AgentSourceAdapter.fetchAgents()` — is AsyncIterable (protocol conformance)
- `AgentSourceAdapter.toCanonical()` — returns Result<AgentCard, SourceAdapterError>
- `AgentSourceAdapter.sourceName` — immutable
- `AgentStorage.upsert()` — idempotent (call twice = one row)
- `AgentStorage.count()` — returns number
- `AgentStorage.countBySource()` — returns full enum map

### `tests/agent-card-extension.test.ts`
Обратная совместимость + новые поля:
- native agent без `source` → после parse `source === 'native'`
- crawled agent с `source: 'erc8004'` + `externalId` → parsed correctly
- `sourceUrl` валидируется как URL
- `crawledAt` валидируется как ISO datetime

## Таблица задач

| # | Задача | Агент | Метод верификации | Архитектурные требования | Файлы |
|---|---|---|---|---|---|
| 1 | Per-source Zod схемы (5 файлов) | architect | `tests/registry-source-adapters.test.ts` RED | Zod boundary, discriminated union, forward compat | `packages/types/src/sources/*.ts` |
| 2 | Extend `AgentCard` | architect | `tests/agent-card-extension.test.ts` RED | Backward compat default `'native'` | `packages/types/src/agent.ts` |
| 3 | `AgentSourceAdapter<S>` port | architect | `tests/registry-crawler-contract.test.ts` RED | AsyncIterable, Result, contract JSDoc | `packages/interfaces/src/agent-source-adapter.ts` |
| 4 | `AgentStorage` port | architect | `tests/registry-crawler-contract.test.ts` RED | Idempotent upsert, Result pattern | `packages/interfaces/src/agent-storage.ts` |
| 5 | Postgres DDL + indexes | architect | SQL lint passes | ACID, idempotent migration | `packages/contracts/sql/001_agent_cards.sql` |

## Что НЕ делаем в M-L1-contracts (это идёт в M-L1-impl)

- ❌ Реализации 5 адаптеров (будет в registry-dev)
- ❌ Postgres подключение / pool (backend-dev infra)
- ❌ Crawler scheduler (registry-dev)
- ❌ Качественное покрытие E2E (будет в M-L1-impl)

Architect пишет **только контракты + RED тесты**. Implementation — следующий milestone.
