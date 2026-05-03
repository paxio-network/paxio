# TD-FE-transpile — Next.js apps must transpile @paxio/* workspace packages

**Status:** RED → GREEN gate
**Owner:** frontend-dev
**Branch:** `feature/TD-FE-transpile`

## Why

`packages/types/src/index.ts` uses `.js` extension imports (TypeScript NodeNext convention required for ESM). Next.js webpack does NOT transpile workspace packages by default — it tries to resolve `./agent-category.js` literally and fails because actual file is `agent-category.ts`.

Broke at commit `120988e` (M-L1-taxonomy merge, ~April 30) which added new `@paxio/types` exports (`agent-category.ts`, `agent-source.ts`, etc). Last successful landing CI: `f4cefcf` (April 30). Subsequent landing CI runs RED, but path-filtered workflow doesn't trigger on backend-only PRs — silent infrastructure debt for 3 days.

PR #99 (M-L10.7.3) is first PR touching landing since breakage → CI fails → exposes baseline issue. PR #99 cannot merge until this fix lands.

Also affects all 8 frontend apps' Vercel deploys (likely silently failing if Vercel watches push events on apps/frontend/*/).

## Готово когда

1. All 8 frontend apps' `next.config.ts` include `transpilePackages: ['@paxio/types', '@paxio/ui', '@paxio/hooks', '@paxio/api-client', '@paxio/auth']`.
2. `pnpm --filter @paxio/landing-app build` succeeds.
3. `bash scripts/verify_TD-FE-transpile.sh` PASS (17/17 checks).
4. Other 7 apps build (smoke check optional — same config, same workspace packages).

## Architecture Requirements

- **Same array in all 8 apps.** Cleaner: extract to `packages/ui/next-config-shared.ts` exporting `const PAXIO_WORKSPACE_PACKAGES = [...]` and import. But that requires architect contract (new shared package). For TD scope: inline duplication acceptable, file as separate cleanup TD if becomes recurring.
- **Order in array doesn't matter** — Next.js applies all matchers.
- **Don't touch unrelated next.config keys** — only add/extend `transpilePackages` field.

## Tasks

| # | Task | Agent | Directory | Verification | Architecture Requirements |
|---|------|-------|-----------|-------------|--------------------------|
| T-1 | Add `transpilePackages: ['@paxio/types', '@paxio/ui', '@paxio/hooks', '@paxio/api-client', '@paxio/auth']` to all 8 frontend apps' next.config.ts | frontend-dev | `apps/frontend/{landing,registry,pay,radar,intel,docs,wallet,fleet}/next.config.ts` | `bash scripts/verify_TD-FE-transpile.sh` PASS=17 FAIL=0 | Inline duplication OK for TD scope; preserve other next.config keys |

## Skills доступны on-demand

(none beyond agent's always-on allowlist — `paxio-frontend` covers Next.js config patterns)

## Slim spec for frontend-dev session

```
You are frontend-dev. Task: add `transpilePackages` to all 8 next.config.ts
to fix workspace package resolution (broken since M-L1-taxonomy merge).

Setup:
  cd /home/nous/paxio
  git worktree add /tmp/paxio-fd-transpile -B feature/TD-FE-transpile origin/feature/TD-FE-transpile
  cd /tmp/paxio-fd-transpile
  git config user.name frontend-dev
  git config user.email frontend-dev@paxio.network
  pnpm install

Read ONLY (1 файл):
  scripts/verify_TD-FE-transpile.sh   (RED spec — sacred)

Implement в КАЖДОМ из 8 файлов:
  apps/frontend/landing/next.config.ts
  apps/frontend/registry/next.config.ts
  apps/frontend/pay/next.config.ts
  apps/frontend/radar/next.config.ts
  apps/frontend/intel/next.config.ts
  apps/frontend/docs/next.config.ts
  apps/frontend/wallet/next.config.ts
  apps/frontend/fleet/next.config.ts

Add field в const nextConfig: NextConfig = { ... }:
  transpilePackages: [
    '@paxio/types',
    '@paxio/ui',
    '@paxio/hooks',
    '@paxio/api-client',
    '@paxio/auth',
  ],

Preserve all OTHER existing keys (output, experimental, etc.). Don't reformat.

Verify (3 команды):
  bash scripts/verify_TD-FE-transpile.sh                      # 17/17 PASS
  pnpm --filter @paxio/landing-app build                       # success (was failing)
  pnpm typecheck                                                # clean

Commit message:
  fix(TD-FE-transpile): add transpilePackages to 8 next.config.ts

  packages/types/src/index.ts uses .js extension imports (TS NodeNext).
  Next.js webpack doesn't transpile workspace packages by default →
  fails to resolve './agent-category.js' (actual file: agent-category.ts).
  Broke at M-L1-taxonomy merge (commit 120988e); silent for 3 days
  because landing CI path-filtered and not triggered by backend PRs.

  Fix: each app's next.config.ts now lists @paxio/{types,ui,hooks,
  api-client,auth} in transpilePackages.

  17/17 acceptance script PASS, landing-app build succeeds, all 8 apps
  use identical workspace packages list.

Reply «готово» + worktree path + commit sha + acceptance result.
NO git push, NO gh pr — architect handles publication.

Skills доступны on-demand: (none beyond frontend-dev's always-on allowlist —
paxio-frontend covers Next.js config patterns).
```
