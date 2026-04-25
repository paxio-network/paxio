# M-L8.3 — TD-26: Service Wiring Layer (factory → service in main.cjs)

> Hot-fix milestone. Closes TD-26.
> Discovered during M-L8 deploy validation (2026-04-25): every business-logic
> route returns 500 because handlers reach `domain['<product>'].<service>.method()`
> but loader only exposes raw factory modules.

## What is broken

VM-loader (`apps/back/server/src/loader.cjs:179`) returns:

```
sandbox.domain['07-intelligence']['landing-stats'] = { createLandingStats }
sandbox.domain['02-facilitator']['fap-router']     = { createFapRouter }
```

API handlers expect:

```js
// products/07-intelligence/app/api/landing-hero.js
await domain['07-intelligence'].landing.getHero();   // ← .landing undefined

// products/02-facilitator/app/api/fap-rails.js
await domain['02-facilitator'].fap.getRails();       // ← .fap undefined
```

Production manifestation (verified against live `api.paxio.network` 2026-04-25):

```
GET /api/landing/hero  → 500
container log:
  TypeError: Cannot read properties of undefined (reading 'getHero')
    at evalmachine.<anonymous>:6:60
    at Object.<anonymous> (/app/apps/back/server/src/http.cjs:184:32)
```

`/health` works because that route is registered directly by `main.cjs`,
not via VM sandbox. **Every** other route is broken.

## Готово когда:

- `scripts/verify_td26_routing.sh` PASS=7 FAIL=0
- `tests/_specs/main-cjs-service-wiring.test.ts` 6/6 GREEN
- Live `https://api.paxio.network/api/landing/hero` returns 200 + HeroState body
- Live `https://api.paxio.network/api/fap/rails` returns 200

## Метод верификации (Тип 2 — интеграционный)

Acceptance script boots `main.cjs` with `DATABASE_URL=''` (no Postgres
needed — landing-stats has zero-fallbacks for all upstream calls) and
hits both broken endpoints. Pre-fix: 500. Post-fix: 200.

## Зависимости

- M-L8.2 (TD-25) closed — esbuild IIFE bundle for VM modules. Without
  this, factories can't be loaded into the sandbox in the first place.
- TD-27 NOT a dependency — landing-stats works fine without DB
  (`checks.database='skipped'` is acceptable here).

## Архитектура

### Текущая loader логика

```
apps/back/server/src/loader.cjs:loadApplication(appPath, sandbox)
  → loads each .js file in app/lib, app/domain, app/api into sandbox
  → returns Object.freeze({ lib, domain, api, config })
  → main.cjs calls registerSandboxRoutes(server, appSandbox.api)
```

`domain` is `{ '<product>': Object.freeze({ '<file-stem>': moduleExports }) }`.
File `landing-stats.ts` exports `{ createLandingStats }`. After loader:
`domain['07-intelligence']['landing-stats'] = { createLandingStats }`.

### Two design options for the wiring layer

**Option A — Per-product wiring file in `apps/back/server/wiring/`** (recommended).

Each product has a CJS wiring file living in the server (composition root),
not in app/ (VM sandbox):

```js
// apps/back/server/wiring/07-intelligence.cjs
module.exports = (rawDomain, deps) => {
  const landing = rawDomain['landing-stats'].createLandingStats({
    agentStorage: deps.agentStorage,
    clock: () => Date.now(),
    // upstream callbacks zero-fallback when absent — see landing-stats.ts:225
    getRegistryCount: deps.registryClient?.count ?? (() => Promise.resolve({ ok: true, value: 0 })),
    getAuditCount24h: deps.auditClient?.count24h ?? (() => Promise.resolve({ ok: true, value: 0 })),
    getGuardAttacks24h: deps.guardClient?.attacks24h ?? (() => Promise.resolve({ ok: true, value: 0 })),
  });
  return { landing };
};
```

```js
// apps/back/server/wiring/02-facilitator.cjs
module.exports = (rawDomain, _deps) => ({
  fap: rawDomain['fap-router'].createFapRouter({}),
});
```

```js
// apps/back/server/wiring/index.cjs
module.exports = {
  '02-facilitator': require('./02-facilitator.cjs'),
  '07-intelligence': require('./07-intelligence.cjs'),
};
```

main.cjs after `loadApplication`:

```js
const wiring = require('./wiring');
const wiredDomain = {};
for (const [product, raw] of Object.entries(appSandbox.domain)) {
  wiredDomain[product] = wiring[product]
    ? Object.freeze({ ...raw, ...wiring[product](raw, deps) })
    : raw;
}
appSandbox = Object.freeze({
  ...appSandbox,
  domain: Object.freeze(wiredDomain),
});
```

Note we keep `raw` (factory exports) accessible too — handlers that prefer
`createXxx` form still work; new convention uses the wired service slot.

**Option B — Convention-based factory auto-construction.**

Loader detects exports matching `/^create[A-Z]/`, calls them with sandbox,
mounts as `service[lowercase-suffix]`. Problem: handler-expected names
don't match factory names (`createLandingStats` → service slot `.landing`,
not `.landingStats`). Need a rename hint per factory; ends up uglier
than Option A.

**Decision: Option A.**

Reasons:
- Composition root pattern (engineering-principles §16) — explicit DI live
  in `server/`, not magic in loader
- Naming control — handler-expected slot is product-decision, not loader-rule
- Keeps loader logic small (loader stays a pure module-loader)
- Each product owns its wiring file → scope-clear (backend-dev edits only
  per-product wiring, not central main.cjs every time a new product ships)

### Multi-tenant invariant (engineering-principles §17, scope-guard)

Wiring deps **must** thread `deps.agentStorage` (per-tenant); inter-product
service calls (none yet) must propagate the tenant identity, never read
from request body. Current TD-26 fix is identity-neutral (only landing
stats which are public-by-design and FAP rails which are global config),
but the wiring shape **must support** future tenant-scoped services
without refactor.

## Tasks

| # | Кто | Что | Где | Verification | Architecture Requirements |
|---|---|---|---|---|---|
| T-1 | architect | RED drift-guard test | `tests/_specs/main-cjs-service-wiring.test.ts` | 6/6 RED → GREEN after T-3 | reads main.cjs as text; no execution; covers wiring presence + ordering |
| T-2 | architect | Acceptance script | `scripts/verify_td26_routing.sh` | FAIL pre-T-3, PASS post-T-3 | bash `set -euo pipefail`, `/tmp/` log per TD-11, traps cleanup; tests `/api/landing/hero` + `/api/fap/rails` |
| T-3 | backend-dev | Per-product wiring (option A) | `apps/back/server/wiring/{index,02-facilitator,07-intelligence}.cjs` + `apps/back/server/main.cjs` | T-1 + T-2 GREEN | CJS files (no ESM in server/), pure functions (deps in, services out), `Object.freeze` results, no `new`, no class, agentStorage threaded |

## Предусловия среды

- [x] M-L8.2 GREEN (TD-25 closed) — esbuild bundle pipeline works
- [x] `pnpm typecheck` clean
- [x] `pnpm test -- --run tests/_specs/main-cjs-service-wiring.test.ts` 6 RED (proves spec)
- [x] `bash scripts/verify_td26_routing.sh` FAIL=2 (steps 4 + 7 — current production bug)

## Не делаем в M-L8.3 (out of scope)

- TD-27 (db.cjs ESM resolution) — separate milestone M-L8.4
- New product wiring (only the 2 currently broken endpoints fixed)
- Reputation canister wiring (FA-01 separate domain)
- Any ICP canister calls (deferred to FA-04/05 milestones)

## Tech debt expected

- Wiring file boilerplate per new product. If we end up with 7+ products
  each needing wiring, consider:
  - Extracting a `createWireRegistry()` helper
  - OR moving back to convention-based with explicit hint exports
  Track as TD candidate after 3+ product wirings exist.
