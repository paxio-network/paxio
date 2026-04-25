# M-L8.4 — TD-27: Infrastructure ESM bundle (postgres-storage @paxio/types resolution)

> Hot-fix milestone. Closes TD-27.
> Discovered during M-L8 deploy validation (2026-04-25): `/health` returns
> `checks.database='skipped'` because `postgres-storage.js` can't resolve
> its `@paxio/types` import in the production Docker image.

## What is broken

`apps/back/server/infrastructure/db.cjs:36-40`:

```js
const { createPostgresStorage } = await import(
  /* webpackIgnore: true */
  '../../../../dist/products/01-registry/app/infra/postgres-storage.js'
);
```

The compiled file (`dist/products/01-registry/app/infra/postgres-storage.js:30`):

```js
import { ZodAgentCard, ok, err, CRAWLER_SOURCES, } from '@paxio/types';
```

Production Docker container startup log (verified 2026-04-25):

```
{"level":40,"err":"Cannot find package '@paxio/types' imported from
 /app/dist/products/01-registry/app/infra/postgres-storage.js",
 "msg":"createDbClient failed — using no-op"}
```

`db.cjs:23` catches the error → returns `NOOP_STORAGE` →
`main.cjs:135-137` injects `db: { ping: () => dbClient.pool.query('SELECT 1') }`
guarded behind `dbClient._isNoop`, so `initHealth` doesn't even register a
DB probe → `/health` returns `checks.database='skipped'`.

Postgres IS reachable from the container (paxio-backend joined to the
paxio bridge network with paxio-postgres). The break is purely at the
ESM resolution layer.

## Why pnpm workspace doesn't save us

Locally `@paxio/types` is a pnpm symlink: `node_modules/@paxio/types →
packages/types`. In the production multi-stage `Dockerfile.production`,
the `node_modules` layout is rebuilt from `pnpm-lock.yaml` at deploy
time — but only **runtime** dependencies are kept. Workspace packages
are typically copied as `dist/` only, without preserving the symlink
chain that lets a sibling `dist/products/01-registry/.../postgres-storage.js`
resolve `@paxio/types` upward through ancestor directories.

Even when the symlink IS preserved, the `.js` file lives **inside `dist/`**
which is OUTSIDE the workspace boundary that `pnpm` set up — so Node's
ESM resolver looking for `@paxio/types` from `/app/dist/products/...`
walks UP to `/app/dist/` and `/app/`, neither of which has
`node_modules/@paxio/types`.

## Готово когда:

- `tests/_specs/postgres-storage-bundle.test.ts` 7/7 GREEN
- `bash scripts/verify_td27_db_health.sh` PASS=8 FAIL=0
- Live `https://api.paxio.network/health` returns `checks.database='ok'`
- `scripts/verify_M-L8_smoke.sh` step 6 flipped back to strict 'ok' assertion

## Метод верификации (Тип 2 — интеграционный)

Acceptance script:
1. Builds (must include the new bundling step)
2. Asserts dist `postgres-storage.js` has zero top-level `@paxio/*` imports
3. Boots a fresh Postgres 16 container on port 5439
4. Boots `main.cjs` with a real `DATABASE_URL` pointing at it
5. Hits `/health`, asserts `checks.database='ok'`
6. Asserts the server log has NO `createDbClient failed` line

Pre-fix: step 2 fails (top-level imports still present) → exit 1.
Post-fix: PASS=8.

## Зависимости

- M-L8.2 (TD-25) closed — esbuild bundle pipeline already exists for
  VM-loader modules. M-L8.4 extends that pipeline (or adds a sibling
  pipeline) for `dist/products/01-registry/app/infra/**`.
- M-L8.3 (TD-26) — INDEPENDENT. M-L8.4 fixes the DB layer,
  M-L8.3 fixes the API wiring. Either can land first; both
  are needed for fully-functional production.

## Архитектура

### Three options for backend-dev

**Option A — Extend `scripts/bundle-vm-modules.mjs` (recommended).**

The existing bundle script already handles VM-loaded modules via
esbuild IIFE. Add a second pass that bundles
`dist/products/01-registry/app/infra/postgres-storage.js` with
`@paxio/types`, `@paxio/interfaces`, `@paxio/errors` set as
**internal** (inlined) — not external. Output:

```
dist/products/01-registry/app/infra/postgres-storage.js   ← workspace imports inlined
```

The output stays ESM (db.cjs uses `await import()`), and Node ESM
resolver never has to look up `@paxio/types` because the symbols are
inlined into the file.

esbuild config sketch (added to bundle-vm-modules.mjs):

```js
await esbuild.build({
  entryPoints: ['dist/products/01-registry/app/infra/postgres-storage.js'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: 'dist/products/01-registry/app/infra/postgres-storage.js',
  allowOverwrite: true,
  external: ['pg'],   // pg stays external (native binding)
  // workspace packages (@paxio/*) are NOT in `external` → they get inlined
});
```

Fast: ~50ms per file; doesn't change build time meaningfully.

**Option B — Fix Dockerfile.production to preserve workspace symlinks.**

Use `pnpm deploy --prod` (instead of `pnpm install --prod`) which
flattens workspace deps into a self-contained node_modules. Or
manually `cp -r packages/types/dist /app/node_modules/@paxio/types/dist`
in the runtime stage. Fragile, breaks when packages list changes,
fights pnpm's design.

**Option C — Compile postgres-storage to CJS (pre-tsup or rollup).**

Change `tsconfig` for `01-registry` to emit CJS instead of ESM.
db.cjs then `require()`s instead of `await import()`. Cascading change
across the registry package's downstream consumers. Loses the strict
ESM-everywhere invariant.

**Decision: Option A.**

Reasons:
- Reuses existing infrastructure (M-L8.2 esbuild pipeline) — minimal
  new surface area
- One file change, one build-script extension; no Dockerfile edit
- Matches the M-L8.2 mental model (workspace deps inlined for runtime
  resolvability)
- ESM-everywhere stays intact

### Multi-tenant invariant

PostgresStorage already implements per-tenant filtering via `agentDid`
columns (M-L1 contract). M-L8.4 only changes how the FILE is bundled —
not its behaviour. Multi-tenant tests already in
`products/01-registry/tests/postgres-storage.test.ts` continue to
guard the runtime behaviour.

## Tasks

| # | Кто | Что | Где | Verification | Architecture Requirements |
|---|---|---|---|---|---|
| T-1 | architect | RED drift-guard test | `tests/_specs/postgres-storage-bundle.test.ts` | 4/7 RED → 7/7 GREEN after T-3 (3 GREEN initially: file existence, factory export, Zod reference all already present) | reads bundled file as text, regex check for top-level `@paxio/*` imports must be 0 |
| T-2 | architect | Acceptance script | `scripts/verify_td27_db_health.sh` | FAIL pre-T-3, PASS post-T-3 | spins up Postgres 16-alpine on 5439, runs main.cjs with real DATABASE_URL, asserts `/health` shows `checks.database='ok'`, no `createDbClient failed` in log |
| T-3 | backend-dev | Extend bundle script — bundle postgres-storage.js with @paxio/* inlined | `scripts/bundle-vm-modules.mjs` (or a sibling `scripts/bundle-infra-modules.mjs`) | T-1 + T-2 GREEN | esbuild bundle pass after tsc, `format:esm`, `pg` external, `@paxio/*` inlined (NOT in external list), allowOverwrite, sourcemaps preserved |
| T-4 | architect | Flip smoke step 6 back to strict | `scripts/verify_M-L8_smoke.sh` step 6 | new smoke run shows ✅ on strict-only `'ok'` | revert the soft-accept block to single-branch `if "$BODY" grep -q '"database":"ok"'; then ok else bad fi` |

## Предусловия среды

- [x] M-L8.2 GREEN (TD-25 closed) — esbuild pipeline exists
- [x] Docker daemon running (for Postgres 16-alpine in T-2)
- [x] `pnpm typecheck` clean

## Не делаем в M-L8.4 (out of scope)

- Reputation canister TD bundling (FA-01 canister stays Rust-native)
- Other infra files like `qdrant.cjs`, `redis.cjs` — defer to M-L9 when
  those infra layers are wired
- Cross-product wiring (covered in M-L8.3 separately)

## Tech debt expected from this milestone

- If we discover other dist/ files importing `@paxio/*` (likely: any
  other product's `app/infra/*.ts`), the bundle script's entry-point
  list grows. Track as "bundle entry list maintenance" once the second
  file appears.
- The `@paxio/types` Zod schemas may grow large; inlining them into
  every infra file = duplicated bundle bytes. Optimisation opportunity
  if final bundle size > 5 MB.
