# M-L8.2 — Hotfix: TD-25 ESM-vs-VM gap (loader can't eval compiled .ts)

> Continuation of M-L8.1. After TD-24 path fix, `loadApplication` reaches
> the right `dist/products/` directory but can't evaluate the compiled
> `.js` files because they contain top-level `import`/`export` statements
> (`tsconfig.base.json::module = "ESNext"`) that `vm.Script` cannot parse.
> Result: SyntaxError → empty-sandbox fallback → every `/api/*` returns
> 404. M-L8 + Hetzner orchestration are inert until this lands.

## Готово когда:

1. `tests/_specs/loader-esm-handling.test.ts` 11/11 GREEN (currently 8 RED + 3 GREEN — 3 file-existence checks pass, 8 evaluation checks fail).
2. `bash scripts/verify_td25_routing.sh` PASS=11+ FAIL=0 (currently PASS=5 FAIL=11; the variable count is because step 3 iterates over every domain `.js` and asserts each is import-free).
3. Compiled `.js` files in `dist/products/<fa>/app/domain/**` have **no top-level `import` or `export` statements**.
4. `/api/landing/hero` returns 200 or 500 (route mounted) — never 404.
5. `apps/back/server/main.cjs` startup log does NOT contain «Cannot use import statement» or «Application path … not found or empty».
6. Full vitest baseline preserved (≥568/568 GREEN).
7. Merged `feature/m-l8.2-td25-loader-esm` → `dev` (architect autonomous, gate-1).

## Метод верификации (Тип 2)

| Layer | How |
|---|---|
| Unit (vm.Script eval) | `pnpm test:specs tests/_specs/loader-esm-handling.test.ts` — 11 GREEN |
| Acceptance (real boot) | `bash scripts/verify_td25_routing.sh` — PASS=11+ FAIL=0 |
| Baseline | `pnpm vitest run` — 568+ GREEN |

## Зависимости

- [x] M-L8 merged → `dev` (PR #17, Fastify + Dockerfile)
- [x] M-L8.1 merged → `dev` (PR #20, APPLICATION_PATH path correctness)
- [x] PR #18 merged → `dev` (gate-1 architect autonomous merge active)
- [x] TD-17 build pipeline copies handlers to `dist/products/`

## Архитектура — корневая причина

### The bug

`apps/back/server/src/loader.cjs:19-28`:

```javascript
const load = async (filePath, sandbox) => {
  const src = await fsp.readFile(filePath, 'utf8');
  const code = `'use strict';\n{\n${src}\n}`;          // ← block-wrap
  const script = new vm.Script(code, ...);              // ← sync, CJS-only
  const context = vm.createContext(Object.freeze({ ...sandbox }));
  return script.runInContext(context, OPTIONS);
};
```

`tsconfig.base.json::module = "ESNext"` causes `tsc` to emit:

```javascript
// dist/products/07-intelligence/app/domain/landing-stats.js (current)
import { HEAT_ROWS, HEAT_COLS } from '@paxio/types';
import { buildNetworkSnapshot } from './network-snapshot-builder.js';
const zeroHeatmap = () => ({ rows: [...HEAT_ROWS], ... });
// ...
export const createLandingStats = (deps) => Object.freeze({ ... });
```

Two structural blockers for `vm.Script`:

1. **Top-level `import`** is illegal inside a block (`'use strict'; { import ... }` doesn't parse).
2. **Top-level `export`** has no value to surface — `vm.Script.runInContext` returns the value of the last *expression statement*, but `export const X = ...` is a *declaration*, not an expression. Result is `undefined`.

Effect: `vm.Script` constructor throws `SyntaxError: Cannot use import statement outside a module`. `loadDir` lets it bubble; `loadApplication` catches it; `main.cjs:118-126` falls back to empty sandbox; `registerSandboxRoutes(server, appSandbox.api)` mounts zero routes; every `/api/*` returns 404.

### Hand-written API handlers work, compiled domain doesn't

`products/<fa>/app/api/*.js` are **hand-written plain JavaScript**, copied by `scripts/copy-api-handlers.mjs` (TD-17). They follow the IIFE convention from the eOlympus VM-sandbox tradition:

```javascript
// landing-hero.js — last expression IS the export
({
  httpMethod: 'GET',
  path: '/api/landing/hero',
  method: async () => {
    const result = await domain['07-intelligence'].landing.getHero();
    if (!result.ok) throw new errors.InternalError(result.error.message);
    return result.value;
  },
});
```

`vm.Script` evaluates this: runs the block, returns the object literal at
the end. Loader receives the object, indexes it under the file's basename.

The mismatch: hand-written `.js` is IIFE-style; compiled `.ts` is ES module style. The fix must reconcile them.

---

## Fix options analysis (3 paths)

### Option A — Per-product `tsconfig` with `module: "commonjs"`

Override `tsconfig.app.json::module` to `"commonjs"`. Output:

```javascript
// landing-stats.js (CommonJS emit)
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLandingStats = void 0;
const types_1 = require("@paxio/types");
const network_snapshot_builder_js_1 = require("./network-snapshot-builder.js");
const zeroHeatmap = () => ({ rows: [...types_1.HEAT_ROWS], ... });
exports.createLandingStats = (deps) => Object.freeze({ ... });
```

**Pros**:
- One-line tsconfig change.
- `tsc` is already in build pipeline.
- `require()` calls aren't a syntactic block-wrap problem (they're function calls, legal anywhere).

**Cons**:
- VM sandbox has NO `require` injection. `require("@paxio/types")` throws `ReferenceError: require is not defined`.
- Loader.cjs has no concept of `exports` either — would need to inject `module = { exports: {} }` and read it back, plus a custom `require` shim that maps `@paxio/types` → sandbox-injected constants and `./network-snapshot-builder.js` → already-loaded sibling modules.
- Heavy custom shim work; brittle when import paths or names change.
- ❌ Not recommended — too much custom plumbing.

### Option B — Loader uses `vm.SourceTextModule` (Node experimental)

Replace `vm.Script` with `vm.SourceTextModule` + linker callback.

**Pros**:
- Native ESM support. Compiled output stays as-is.
- `tsconfig` stays at `module: "ESNext"`.

**Cons**:
- Requires `--experimental-vm-modules` Node flag at every server boot. Affects Dockerfile, dev workflow, CI.
- API marked unstable (Node ≤ 22; could change). Risk of future Node upgrade breaking us.
- Async + linker callback rewrite of `loader.cjs` — every `loadDir`/`loadDeepDir` call becomes async-graph-aware. ≈ 80-line rewrite plus dependency-resolution logic.
- Linker must resolve `'@paxio/types'` to a synthetic ESM module exposing the actual constants. Custom resolver code.
- Loses the `Object.freeze(sandbox)` security model unless we manually freeze every linked module.
- ❌ Not recommended — high risk, ongoing maintenance burden.

### Option C — esbuild bundle post-`tsc`, IIFE format

Add a post-build step that bundles each compiled domain `.js` with `esbuild` in IIFE format. Inputs are the `tsc`-emitted ESM files; outputs replace those files in-place with self-contained IIFEs that have no `import`/`export`.

```javascript
// scripts/bundle-vm-modules.mjs (sketch)
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'glob';

const files = await glob('dist/products/*/app/domain/**/*.js', { absolute: true });
const externalSandboxModules = ['@paxio/types', '@paxio/interfaces', '@paxio/errors'];

for (const file of files) {
  await build({
    entryPoints: [file],
    bundle: true,
    format: 'iife',
    globalName: '__paxio_module',
    platform: 'node',
    outfile: file,
    allowOverwrite: true,
    write: true,
    // Inline @paxio/* deps so VM sandbox doesn't need to provide them.
    // Mark fastify/pino external — won't be reached at runtime in domain.
    external: ['fastify', 'pino', 'pg', 'pino-pretty'],
    minify: false,
    sourcemap: false,
  });
}
```

esbuild output shape:

```javascript
// landing-stats.js (after esbuild IIFE bundle)
"use strict";
var __paxio_module = (() => {
  var __defProp = Object.defineProperty;
  // ... esbuild prelude ...
  // Inlined @paxio/types HEAT_ROWS / HEAT_COLS:
  var HEAT_ROWS = ['…', '…', '…'];
  var HEAT_COLS = ['…', '…', '…'];
  // Inlined ./network-snapshot-builder.js:
  var buildNetworkSnapshot = (cards) => { /* ... */ };
  // Original landing-stats body:
  var zeroHeatmap = () => ({ rows: [...HEAT_ROWS], ... });
  var createLandingStats = (deps) => Object.freeze({ ... });
  return { createLandingStats };
})();
```

`vm.Script` evaluates this: assigns to context's `__paxio_module` global. Loader reads `context.__paxio_module` after `runInContext`.

`loader.cjs::load` change (≈ 8 lines):

```javascript
const load = async (filePath, sandbox) => {
  const src = await fsp.readFile(filePath, 'utf8');
  const code = `'use strict';\n${src}\n;__paxio_module;`;  // ← suffix to surface result
  const script = new vm.Script(code, { ...OPTIONS, lineOffset: -1 });
  const sandboxWithSlot = { ...sandbox, __paxio_module: undefined };
  const context = vm.createContext(sandboxWithSlot);
  const result = script.runInContext(context, OPTIONS);
  // For hand-written api/*.js (IIFE returning literal): result is the literal.
  // For esbuild-bundled domain/*.js: result is __paxio_module (read from context).
  return result ?? sandboxWithSlot.__paxio_module;
};
```

This handles BOTH conventions:
- Hand-written `api/*.js` (IIFE last-expression) → returned directly.
- Compiled `domain/*.js` (esbuild IIFE assigning to `__paxio_module`) → read from context.

**Pros**:
- esbuild bundling is fast (~50 ms total for all domain files combined).
- esbuild ≥ v0.21 already in `.pnpm` store transitively (via vitest); add as direct devDep.
- Single post-build script (~30 lines). No custom resolver, no Node experimental flags.
- Compiled output is self-contained — no need for VM to inject `@paxio/*` runtime values.
- Source `.ts` files stay normal — type-safe imports, normal author DX.
- Loader change is ~8 lines, backward-compatible (hand-written api/*.js still works).
- Sourcemaps optional (off in production for smaller files; on in dev for debugging).

**Cons**:
- Bundles every `@paxio/*` dep into every domain file → output size grows. For ~5 KB source `landing-stats.ts` with `@paxio/types` deps the bundled output is ~15-20 KB. Acceptable.
- esbuild is a build dependency. Adds ~10 MB to `node_modules`. Already present transitively, so net new footprint ≈ 0.
- Custom `external: [...]` list must be maintained as new deps emerge.

**Recommended** ✅ — This is the cleanest path. Backend-dev implements this in T-5.

---

## Tasks

| # | Кто | Что | Где | Verification | Architecture Requirements |
|---|---|---|---|---|---|
| T-1 | architect | RED test for loader ESM handling | `tests/_specs/loader-esm-handling.test.ts` | 11 tests, 8 RED + 3 GREEN initially, all GREEN after T-5 | reads source as text, then evaluates via `Script + createContext` matching loader.cjs's wrap exactly; minimal sandbox stub; assertion = factory function or object exposing `createLandingStats` |
| T-2 | architect | Acceptance script for sandbox routing | `scripts/verify_td25_routing.sh` | 8 steps, PASS=5 FAIL=11 pre-fix, PASS=11+ FAIL=0 post-fix | `set -euo pipefail`, `/tmp/` log path (TD-11), per-domain-file import/export grep loop, server boot on port 3402, route assertion accepts 200 OR 500 (NOT 404), log scan for `SyntaxError`/`Cannot use import statement` |
| T-3 | architect | Hotfix milestone doc with 3-options analysis | `docs/sprints/M-L8.2-td25-loader-esm.md` | this file | Type 2 hotfix; recommend Option C; explicit pros/cons of A/B/C |
| T-4 | architect | Branch + commit + push + PR | `feature/m-l8.2-td25-loader-esm` from `dev` | PR opened to `dev` | architect commits T-1, T-2, T-3 only |
| T-5 | backend-dev | Implement Option C | `package.json` (add esbuild devDep), NEW `scripts/bundle-vm-modules.mjs`, edit `package.json::scripts.build`, edit `apps/back/server/src/loader.cjs::load` | T-1 11/11 GREEN, T-2 PASS=11+ FAIL=0, baseline 568+/568+ GREEN | esbuild via `import { build } from 'esbuild'`; iterate `dist/products/*/app/domain/**/*.js`; `bundle: true, format: 'iife', globalName: '__paxio_module'`; loader.cjs::load reads `__paxio_module` from context after runInContext, falls back to script return value (preserves hand-written api/*.js behavior); no changes to tsconfig (Option A path NOT taken); no changes to source `.ts` files |
| T-6 | architect | Auto-merge → dev | PR | gh pr merge N --merge after reviewer APPROVED + CI green | gate-1 autonomous |

## Предусловия среды

- [x] `pnpm install` clean
- [x] `pnpm run build` succeeds + writes to `<repo>/dist/products/`
- [x] Vitest baseline 568/568 GREEN on `dev`
- [x] esbuild already in `.pnpm` store (transitive via vitest); backend-dev adds as direct devDep
- [x] `dist/products/07-intelligence/app/domain/landing-stats.js` exists post-build (verified)

## Не делаем

- НЕ трогаем `tsconfig.app.json::module` (Option A rejected).
- НЕ переходим на `vm.SourceTextModule` (Option B rejected — experimental + custom resolver burden).
- НЕ рефакторим `.ts` source файлы. Build pipeline reconciles output, source DX stays normal.
- НЕ дублируем `@paxio/*` runtime values в sandbox config (esbuild inlines them; no need).
- НЕ меняем `scripts/copy-api-handlers.mjs` — hand-written api/*.js stay as-is.

## После merge

После merge `feature/m-l8.2-td25-loader-esm → dev`:

1. `dev` ветка имеет полный backend production-readiness:
   - M-L8: Fastify + /health + Dockerfile + compose stack
   - M-L8.1: APPLICATION_PATH points at correct dir
   - M-L8.2: VM sandbox loader evaluates compiled domain files
   - PR #20 wired agentStorage end-to-end via M-L5 fix
2. user OK на `dev → main` → `deploy-backend.yml` запускает build + push ghcr.io + ssh deploy
3. `verify_M-L8_smoke.sh` против `https://api.paxio.network` — `/health` 200 + `/api/landing/hero` 200 (или 500 если DB не ready, но НЕ 404)
4. user делает Hetzner bootstrap (см. `infra/paxio-prod/README.md`)
5. user ставит Vercel env `NEXT_PUBLIC_API_URL=https://api.paxio.network` × 8 apps + redeploy
6. paxio.network landing рендерит реальные числа (Hero PAEI / NetworkGraph nodes / Heatmap)

## Tech debt expected from this milestone

- **TD candidate (LOW)**: bundled domain `.js` files duplicate `@paxio/*` runtime values across multiple FAs. Could deduplicate by extracting a shared sandbox-injected `paxioTypes` global. Defer — current overhead is ≈ 10-20 KB total per FA.
- **TD candidate (LOW)**: `external: [...]` list in `bundle-vm-modules.mjs` is hand-maintained. If a new domain `.ts` imports from a new package not on the list, esbuild errors at build. Acceptable — caught in CI; backend-dev adds package to list when domain takes a new dep.
