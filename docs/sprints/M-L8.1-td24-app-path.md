# M-L8.1 — Hotfix: TD-24 APPLICATION_PATH (sandbox routing)

> Hotfix milestone after M-L8 backend deploy. Without this fix, M-L8 puts
> Fastify on api.paxio.network successfully (`/health` 200) but every
> `/api/landing/*`, `/api/registry/*`, `/api/fap/*` returns 404 — landing
> still shows skeleton. M-L8 + Hetzner orchestration are wasted until this
> lands.

## Готово когда:

1. `tests/_specs/main-cjs-app-path.test.ts` 4/4 GREEN (currently 2/4 — drift
   guard locks the literal correctness).
2. `bash scripts/verify_td24_sandbox_routing.sh` PASS=6 FAIL=0 (currently
   4/6 — log still references buggy `/apps/dist/products`).
3. `apps/back/server/main.cjs:40` literal updated to climb 3 levels (one
   extra `..`).
4. Full vitest baseline preserved (568/568 GREEN; TD-11 robustness test
   count drops by 1 because the new script uses `/tmp/` instead of
   `$HOME/tmp/` — `/tmp/` always exists on Linux/Mac so no mkdir guard
   needed; TD-11 invariant only applies to `$HOME/tmp/` paths).
5. Merged `feature/m-l8.1-td24-fix` → `dev` (architect autonomous, gate-1).

## Out of scope — TD-25 follow-up

After T-5 lands, `APPLICATION_PATH` resolves correctly, but
`/api/landing/*` still returns 404. Reason: the compiled `.js` files in
`dist/products/` (e.g. `landing-stats.js`) start with top-level ESM
`import` statements because `tsconfig.base.json` sets `"module":
"ESNext"`. `apps/back/server/src/loader.cjs` uses synchronous
`vm.Script` which can't evaluate ESM — throws `SyntaxError: Cannot use
import statement outside a module`, gets caught at `main.cjs:118-126`,
falls back to empty sandbox.

This is **TD-25 (ESM-vs-VM gap)** — separate milestone (probably
M-L8.2). Reviewer will record TD-25 row when they review M-L8.1. Fix
options: (a) emit CJS for products with `tsconfig.app.json::module =
"commonjs"`, (b) loader uses `vm.SourceTextModule` (experimental)
instead of `vm.Script`, (c) author domain `.ts` files such that
compiled `.js` has no top-level imports (heavy refactor; types must
come via `import type` only).

M-L8.1 lands the path-correctness change as a permanent drift-guard
foundation. TD-25 is the actual unblock for landing real-data display.

## Метод верификации (Тип 2)

| Layer | How |
|---|---|
| Unit drift guard | `pnpm test:specs tests/_specs/main-cjs-app-path.test.ts` — 4 GREEN |
| Acceptance | `bash scripts/verify_td24_sandbox_routing.sh` — PASS=6 FAIL=0 |
| Baseline | `pnpm vitest run` — 566/566 GREEN unchanged |

## Зависимости

- [x] M-L8 merged → `dev` (PR #17, M-L8 contracts/Dockerfile/compose live)
- [x] PR #18 merged → `dev` (gate-1 architect autonomous merge active)
- [x] TD-17 build pipeline copies handlers to `dist/products/` (committed
      already)
- [x] `dist/products/` actually exists at repo root (verified: 01-registry,
      02-facilitator, 07-intelligence subdirs)

## Архитектура

### The bug

`apps/back/server/main.cjs:40`:

```javascript
const APPLICATION_PATH = path.join(__dirname, '..', '..', 'dist', 'products');
```

`__dirname` here = `<repo>/apps/back/server/`. Climbing 2× `..` reaches
`<repo>/apps/`, so the literal resolves to **`<repo>/apps/dist/products`**
— a directory that does NOT exist. The compiled handlers live at
**`<repo>/dist/products`** per `tsconfig.app.json::outDir = "./dist"`.

### Effect

`loadApplication(APPLICATION_PATH, ...)` (`apps/back/server/src/loader.cjs`)
walks the directory and silently returns an empty sandbox when the dir is
missing. No throw, no warning. Server boots happily, `/health` works
(registered directly in `http.cjs::initHealth`, not via VM sandbox), but
`registerSandboxRoutes(server, appSandbox.api)` mounts ZERO routes because
`appSandbox.api` is `{}`.

Knock-on: PR #17's M-L5 fix `466f12d` correctly wires `agentStorage`
end-to-end through `loadApplication({ agentStorage })` → VM `globalThis`
→ `landing-stats.ts`, but the wiring never executes because
`loadApplication` returns empty before reaching the injection step.

### The fix

One literal correction in `apps/back/server/main.cjs:40`:

```diff
-const APPLICATION_PATH = path.join(__dirname, '..', '..', 'dist', 'products');
+const APPLICATION_PATH = path.join(__dirname, '..', '..', '..', 'dist', 'products');
```

3× `..` from `<repo>/apps/back/server/` reaches `<repo>/`, then `dist/products`
is the correct subdirectory. After this change:

- `pnpm run build` writes handlers to `dist/products/`
- `loadApplication(APPLICATION_PATH, ...)` finds them
- VM sandbox loads `lib/`, `domain/`, `api/` from real `.js` files
- `registerSandboxRoutes` mounts every handler under its declared `path`
- `/api/landing/hero` (and all 12 other handlers) returns 200

## Tasks

| # | Кто | Что | Где | Verification | Architecture Requirements |
|---|---|---|---|---|---|
| T-1 | architect | Drift-guard test for APPLICATION_PATH literal | `tests/_specs/main-cjs-app-path.test.ts` | 4 tests, 2 RED initially, all GREEN after fix | regex extracts segments + `path.resolve()` math, no execution of main.cjs (avoids pg-pool side-effects), assertion against repo-root dist/products + negative assertion against apps/dist/products |
| T-2 | architect | Acceptance script for sandbox routing | `scripts/verify_td24_sandbox_routing.sh` | 6 steps, step 5 FAIL pre-fix, all PASS post-fix | bash `set -euo pipefail`, server PID trap cleanup, 20s bind wait, port 3401 to avoid 3001/8000 clashes, accepts 200 OR 500 on /api/landing/hero (500=route mounted but handler error without DB — routing assertion is what matters) |
| T-3 | architect | Hotfix milestone doc | `docs/sprints/M-L8.1-td24-app-path.md` | this file | Type 2 hotfix, single-task, explicit dependency on M-L8 merge order |
| T-4 | architect | Branch + commit + push + PR | `feature/m-l8.1-td24-fix` from `dev` | PR opened to `dev` | architect commits T-1, T-2, T-3 only; backend-dev commits T-5 to same branch |
| T-5 | backend-dev | One-line literal fix in main.cjs:40 | `apps/back/server/main.cjs` | T-1 4/4 GREEN, T-2 PASS=6 FAIL=0, baseline 566/566 GREEN | minimal diff (literal only), no other restructuring, no NODE_PATH bootstrap touches, no try/catch changes |
| T-6 | architect | Auto-merge → dev | PR | gh pr merge N --merge after reviewer APPROVED + CI green | gate-1 (feature/* → dev autonomous, no user OK needed per `scope-guard.md::GIT & MERGE`) |

## Предусловия среды

- [x] `pnpm install` clean
- [x] `pnpm run build` succeeds + writes to `<repo>/dist/products/`
- [x] vitest baseline 566/566 GREEN on `dev` HEAD
- [x] Docker not required (acceptance script boots server directly via node)
- [x] `dist/products/07-intelligence/app/api/landing-hero.js` present (per
      TD-17 `verify_build_handlers.sh`)

## Не делаем

- НЕ удаляем try/catch fallback в `main.cjs:118-126` — он остаётся защитой
  на случай если кто-то снова сломает path.
- НЕ переписываем `loadApplication` — bug в caller (path), не в callee.
- НЕ трогаем сам `loader.cjs` (TD-24 в main.cjs).
- НЕ добавляем тест в default suite — keep в `tests/_specs/` per `vitest.specs.config.ts` контракту (если впоследствии правило «specs становятся регулярными после CLOSE» —
  отдельный milestone). Сейчас drift guard живёт в `_specs/` и
  выполняется через `pnpm test:specs`.

## After merge

После merge `feature/m-l8.1-td24-fix → dev`:

1. `dev` ветка готова к user-OK на `dev → main`
2. Когда user скажет «merge dev → main» — architect выполняет
   `gh pr merge N --merge`
3. `deploy-backend.yml` триггерится, билдит image, пушит в ghcr.io,
   ssh'ит в Hetzner, рестартит backend, прогоняет smoke
4. Когда user сделал Hetzner bootstrap (см. `infra/paxio-prod/README.md`)
   + Vercel `NEXT_PUBLIC_API_URL` — landing on `paxio.network` показывает
   реальные данные (Hero PAEI / NetworkGraph / Heatmap)
