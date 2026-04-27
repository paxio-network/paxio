# M-L1-expansion — Real Crawler Adapters (FA-01)

> **Цель:** заменить stub'ы на реальные `fetchAgents()` HTTP-implementations для 4 источников: ERC-8004, A2A, Fetch.ai, Virtuals. После M-L1-launch (PR #39) MCP уже crawl'ится — этот milestone расширяет coverage до 5/5 sources.
>
> Pre-state: `products/01-registry/app/domain/sources/{erc8004,a2a,fetch-ai,virtuals}.ts` существуют как stubs — `fetchAgents()` возвращает пустую AsyncIterable, `toCanonical()` реальный (Zod проекция). После M-L1-expansion: все 4 adapter'а делают real HTTP к публичным registry/RPC endpoints.

## Готово когда

- 4 adapter'а реализуют `fetchAgents()` через injected `HttpClient` (тот же port что в `mcp.ts`):
  - **ERC-8004**: EVM RPC через `eth_getLogs` для `AgentRegistered` events на Base + Mainnet (curated registry contract addresses в `app/data/erc8004-registries.json`)
  - **A2A**: HTTP GET `https://<host>/.well-known/agent.json` для curated agent host list (config-driven seeds в `app/data/a2a-seeds.json`) — recursive discovery follows `peers[]` field
  - **Fetch.ai**: HTTP GET `https://agentverse.ai/v1/search/agents?offset=N&limit=100`, paginated до empty page
  - **Virtuals**: HTTP POST `https://api.virtuals.io/graphql` с paginated query
- Каждый adapter имеет SAFETY_MAX_PAGES (200, как в mcp.ts) — не runaway
- 429/5xx/ECONNRESET → graceful generator termination (ловится `runCrawler` как `sourceErrors`)
- Per-adapter unit tests с fake HttpClient (тот же pattern как `mcp-adapter.test.ts`):
  - `tests/erc8004-adapter.test.ts` (10 RED)
  - `tests/a2a-adapter.test.ts` (8 RED)
  - `tests/fetch-ai-adapter.test.ts` (10 RED)
  - `tests/virtuals-adapter.test.ts` (10 RED)
- Reference data в `app/data/`:
  - `erc8004-registries.json` — список curated contracts с chainId + address + RPC URL
  - `a2a-seeds.json` — initial well-known hosts для A2A discovery
- `bash scripts/verify_M-L1-expansion.sh` PASS=N FAIL=0 (per-adapter smoke с моком + drift-guard tests GREEN)
- После production deploy: GitHub Actions scheduled-crawl.yml дополняется matrix per source — все 5 sources получают cron tick раз в 6h

## Метод верификации (Тип 1 + Тип 2)

### Тип 1: Unit tests (RED → GREEN)

Каждый из 4 файлов тестов следует mcp-adapter.test.ts pattern:

**`products/01-registry/tests/erc8004-adapter.test.ts`** — 10 RED:
- factory `createErc8004Adapter(deps)` returns frozen with `sourceName='erc8004'`, `fetchAgents`, `toCanonical`
- `fetchAgents()` calls `httpClient.fetch` with JSON-RPC `eth_getLogs` payload (verify body shape)
- Iterates curated registry list (each registry yields its events)
- Decodes `AgentRegistered` log topic = keccak('AgentRegistered(address,string,string,bytes32,uint256)')
- Yields one Erc8004Record per log with chainId/contractAddress/agentAddress/name/serviceEndpoint/capabilityHash/registeredAt
- Stops on RPC error (5xx/timeout) — generator returns, doesn't throw
- Bounds via SAFETY_MAX_PAGES (per-registry blockRange iteration)
- Real `toCanonical` already validates via ZodErc8004Record (covered in existing stub-adapters.test.ts)

**`products/01-registry/tests/a2a-adapter.test.ts`** — 8 RED:
- factory shape
- `fetchAgents()` GET `<host>/.well-known/agent.json` for each seed
- Follows `peers[]` field for transitive discovery (BFS, max depth 3)
- Skips host on 404/timeout (graceful)
- Yields `A2aRecord` per host (one record per discovered agent.json)
- Idempotent: same host visited twice → emit once (de-dup by URL)
- Respects SAFETY_MAX_HOSTS=500 (Roadmap target ~10-50K A2A agents far future)
- Stops on connection storm (>20 consecutive timeouts → generator returns)

**`products/01-registry/tests/fetch-ai-adapter.test.ts`** — 10 RED:
- factory shape
- `fetchAgents()` GET `agentverse.ai/v1/search/agents?offset=N&limit=100`
- Increments offset by `limit` until response array empty
- Yields `FetchAiAgent` per item, validated via ZodFetchAiAgent before yield (skips invalid with warn)
- Handles 429 with Retry-After header (waits up to 30s once, then aborts)
- Handles 5xx with single retry
- Bounds via SAFETY_MAX_PAGES=200 (max 20K agents per crawl)
- Stops on consecutive auth failures (401/403)
- Empty response (`{"agents": []}`) terminates iteration
- HTTP timeout per request: 10s

**`products/01-registry/tests/virtuals-adapter.test.ts`** — 10 RED:
- factory shape
- `fetchAgents()` POST `api.virtuals.io/graphql` with paginated query (after-cursor pattern)
- GraphQL response: `{ data: { agents: { nodes: [...], pageInfo: { hasNextPage, endCursor } } } }`
- Stops when `hasNextPage=false` or empty `nodes`
- Validates each node via `ZodVirtualsAgent` — skips invalid
- Handles GraphQL errors array (returns warn + terminates if global error)
- Handles HTTP 5xx with single retry
- Yields `VirtualsAgent` per node
- SAFETY_MAX_PAGES=200
- Empty `nodes[]` array → generator returns

### Тип 2: Acceptance script `scripts/verify_M-L1-expansion.sh`

Smoke verification per adapter с моком HTTP responses (no live network):
1. Build OK
2. Reference data files `app/data/{erc8004-registries,a2a-seeds}.json` valid JSON + match Zod schemas
3. Drift-guard tests GREEN (38 tests across 4 files)
4. Per-adapter dry-run: factory creation does not throw with mock HttpClient
5. Per-adapter mock-driven crawl: 1 paginated response → expected number of records yielded

## Зависимости

- ✅ M-L1-launch merged (cron infrastructure + admin endpoint готовы)
- ✅ M-L1-impl MVP merged (HttpClient port + runCrawler exists)
- ⚠️ Production network: registry endpoints должны быть reachable от Hetzner host (Smithery, Agentverse, EVM RPC, Virtuals — все public)
- ⚠️ Может потребоваться API key для некоторых sources (Fetch.ai возможно бесплатный, но rate-limited; EVM RPC via public Infura/Alchemy могут быть rate-limited без key) — TD candidate

## Архитектура

### HttpClient port — уже существует (mcp.ts)

```typescript
// products/01-registry/app/domain/sources/mcp.ts:39-50
export interface HttpClient {
  fetch(req: HttpRequest): Promise<HttpResponse>;
}
```

Все 4 новых adapter'а используют тот же port. Production wiring: одна shared `httpClient` instance в `wiring/01-registry.cjs` инжектится во все 5 adapters.

### Reference data в `app/data/`

```json
// products/01-registry/app/data/erc8004-registries.json
[
  {
    "chainId": 8453,
    "name": "Base mainnet — Coinbase agent registry",
    "contractAddress": "0x...",
    "rpcUrl": "https://mainnet.base.org",
    "fromBlock": 12000000
  },
  {
    "chainId": 1,
    "name": "Ethereum mainnet — ENS agents",
    "contractAddress": "0x...",
    "rpcUrl": "https://eth.llamarpc.com",
    "fromBlock": 19000000
  }
]
```

```json
// products/01-registry/app/data/a2a-seeds.json
{
  "seeds": [
    "https://api.openai.com/.well-known/agent.json",
    "https://agents.google.com/.well-known/agent.json"
  ],
  "maxDepth": 3,
  "maxHosts": 500
}
```

### Wiring (T-2 registry-dev)

`apps/back/server/wiring/01-registry.cjs` (M-L1-launch создаёт base) расширяется — все 5 adapters wired:

```javascript
const adapters = {
  mcp: createMcpSmitheryAdapter({ httpClient }),
  erc8004: createErc8004Adapter({ httpClient, registries: erc8004Registries }),
  a2a: createA2aAdapter({ httpClient, seeds: a2aSeeds }),
  'fetch-ai': createFetchAiAdapter({ httpClient }),
  virtuals: createVirtualsAdapter({ httpClient }),
};
```

### Cron расширение (T-6 architect, follow-up)

После реализации T-2..T-5 — `.github/workflows/scheduled-crawl.yml` matrix:

```yaml
jobs:
  crawl:
    strategy:
      matrix:
        source: [mcp, erc8004, a2a, fetch-ai, virtuals]
      max-parallel: 1   # sequential — DB write contention
    # ... POST /api/admin/crawl?source=${{ matrix.source }}
```

## Tasks

| # | Кто | Что | Где | Verification | Architecture Requirements |
|---|-----|-----|-----|---|---|
| T-1 | architect | Milestone + 4 RED test files + acceptance script + reference data schemas | этот файл, `products/01-registry/tests/{erc8004,a2a,fetch-ai,virtuals}-adapter.test.ts`, `scripts/verify_M-L1-expansion.sh`, `packages/types/src/sources/{erc8004-registry,a2a-seeds}.ts` (config schemas) | this PR | Zod validation, RED tests fail until impl |
| T-2 | registry-dev | Real `createErc8004Adapter(deps)` — EVM RPC `eth_getLogs` + topic decoding + curated registry list | `products/01-registry/app/domain/sources/erc8004.ts` (replace stub), `products/01-registry/app/data/erc8004-registries.json` | `erc8004-adapter.test.ts` 10/10 GREEN | Pure `toCanonical`, frozen factory, SAFETY_MAX_PAGES, graceful 5xx |
| T-3 | registry-dev | Real `createA2aAdapter(deps)` — well-known agent.json + peers[] BFS discovery | `products/01-registry/app/domain/sources/a2a.ts`, `products/01-registry/app/data/a2a-seeds.json` | `a2a-adapter.test.ts` 8/8 GREEN | De-dup by URL, max depth + max hosts bounds |
| T-4 | registry-dev | Real `createFetchAiAdapter(deps)` — Agentverse REST pagination | `products/01-registry/app/domain/sources/fetch-ai.ts` | `fetch-ai-adapter.test.ts` 10/10 GREEN | Retry-After respect, single 5xx retry, SAFETY_MAX_PAGES |
| T-5 | registry-dev | Real `createVirtualsAdapter(deps)` — GraphQL after-cursor pagination | `products/01-registry/app/domain/sources/virtuals.ts` | `virtuals-adapter.test.ts` 10/10 GREEN | GraphQL error handling, hasNextPage termination |
| T-6 | architect | Cron workflow matrix expansion + wiring update spec | `.github/workflows/scheduled-crawl.yml`, M-L1-expansion follow-up commit | manual: workflow runs all 5 sources sequentially every 6h post-merge | sequential matrix, no parallel writes |

T-2..T-5 могут идти параллельно или phased — registry-dev решает последовательность по доступности данных от каждого endpoint. T-6 после T-2..T-5 merged.

## Предусловия среды

- [x] M-L1-impl MVP merged
- [x] M-L1-launch merged (PR #39 — provides cron infrastructure)
- [ ] Production HttpClient instance wired в `wiring/01-registry.cjs` через M-L1-launch T-2
- [ ] Optional: EVM RPC API keys (если public endpoints rate-limit) — записать в TD если нужно

## Не делаем в M-L1-expansion

- Real-time event streaming (WebSocket/EventSource) — все 4 adapter'а pull-based polling
- Capability hash resolution для ERC-8004 (off-chain enrichment) — отдельный milestone M-L1-enrichment
- Inter-source de-dup (один agent в нескольких registries → один AgentCard) — postgres-storage уже handles via UNIQUE(source, externalId) per-source; cross-source это M-L1-dedup
- Backfill historical events — initial crawl idёт `fromBlock` и forward; история не глубже config
- Per-source quotas / API key rotation — пока статично

## Tech debt expected

- TD candidate: API rate-limits для public endpoints без ключей. Если Fetch.ai/Virtuals начнут 429-ить — нужны API keys + secret rotation
- TD candidate: ERC-8004 standard ещё draft (2026-04). Если schema изменится — обновлять `ZodErc8004Record` + tests
- TD candidate: A2A `peers[]` discovery может зацикливаться (peer A → peer B → peer A). Visited set должен handle, но гранатить с reachability отдельно
- TD candidate: Virtuals GraphQL endpoint не-versioned URL — если они break compatibility, мониторить через cron failure rate
