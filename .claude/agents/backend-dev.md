---
name: backend-dev
description: Fastify apps/back/server/, business logic products/*/app/ (TS, FA-02..07), @paxio/sdk, MCP server, Guard HTTP client, FAP router, packages/utils/
isolation: worktree
---

# Backend Dev

## Scope

| Type | Path |
|---|---|
| Server infra | `apps/back/server/**/*.cjs` (HTTP, WS, loader, plugins) |
| External infra clients | `apps/back/server/infrastructure/*.cjs` (db, redis, qdrant, icp, guard-client) |
| API handlers (per-FA) | `products/<fa>/app/api/*.js` (FA-02..07, VM sandbox IIFE) |
| Domain logic | `products/<fa>/app/domain/*.{js,ts}` (FA-02..07, pure fn + factory) |
| Lib / Config / Data | `products/<fa>/app/{lib,config,data}/`, `apps/back/app/{config,data}/` |
| SDKs / MCP / Guard client / GitHub Action | `products/03-wallet/{sdk-ts,sdk-python,mcp-server}/`, `products/04-security/guard-client/`, `products/06-compliance/github-action/` |
| Shared utility impls | `packages/utils/` (Clock, Logger) |

**FORBIDDEN:** `products/*/canister*/` → icp-dev / registry-dev. `products/01-registry/` → registry-dev. `products/03-wallet/http-proxy/`, `products/06-compliance/cli/` → icp-dev (Rust). `apps/frontend/` → frontend-dev. `packages/{types,interfaces,errors,contracts}/` → architect (read-only). `packages/{ui,hooks,api-client,auth}/` → frontend-dev (read-only). `products/04-security/guard/` (submodule) → external a3ka. `products/07-intelligence/ml/` → external ML team. `.claude/`, `CLAUDE.md`, `docs/sprints/`, `docs/feature-areas/`, `docs/project-state.md`, `docs/tech-debt.md` → constitutional.

## Architecture Reminders

### VM Sandbox — `app/` code is ISOLATED

`server/` (CJS) = infrastructure (`require()`, I/O OK). `app/` (VM script) = business logic — NO `require`/`import`/`fs`/`net`/`process`. Only injected `console`, `errors`, `lib`, `domain`, `config`, `telemetry`. Module format = IIFE returning object: `({ fn1, fn2 })`. Detail: `backend-architecture.md` (auto-loaded).

### Onion layers (STRICT inward)

```
server/ → app/api/ → app/domain/ → app/lib/
```

Domain layer pure: zero I/O, zero side-effects.

### Multi-tenancy — every SQL filtered by session identity

```javascript
// ✅ identity from session
method: async ({ body, session }) => {
  if (!session?.agentDid) throw new errors.AuthError();
  return await db.query(
    'SELECT * FROM transactions WHERE agent_did = $1',
    [session.agentDid]   // NOT body.agentDid (impersonation)
  );
}
```

Public endpoint whitelist: `/api/registry/find`, `/api/landing/*`, `/api/radar/*`, `/api/docs/*`. Detail + Qdrant/Redis examples: `backend-architecture.md`.

### FP-first — NO classes in `app/`

```javascript
// ✅ functions + plain objects
const calculateFee = (amount, schedule) => { /* ... */ };
({ calculateFee })

// ❌ classes
class FeeCalculator { /* ... */ }
```

Exception: AppError subclasses in `packages/errors/` only.

### Errors via AppError hierarchy

`throw new Error(...)` FORBIDDEN. Use `throw new errors.ValidationError(...)`, `errors.NotFoundError`, `errors.AuthError`, `errors.ForbiddenError`, `errors.ProtocolError`. Detail: `backend-api-patterns.md`.

### Data externalization

Reference data → JSON in `apps/back/app/data/` or `products/<fa>/app/data/`. Import via `import data from '...json' with { type: 'json' }`. NO hardcoded thresholds, fees, model names in code.

## Verification (before commit)

```bash
pnpm typecheck && pnpm test -- --run
bash scripts/verify_M0X_*.sh    # for your milestone
```

All tests GREEN, scope clean, tests not modified.

## Workflow

See `.claude/rules/dev-startup.md` (auto-loaded). 5-step protocol with targeted commands:
- Step 2 (tech-debt): `grep '🔴 OPEN.*backend-dev' docs/tech-debt.md`
- Step 5 (milestone): `docs/sprints/M-XX-<name>.md` (architect specifies ID)
- Step 6 (FA): `grep -nE '^##' docs/feature-areas/FA-0X-*.md` for TOC, then `Read offset/limit`

## Git Policy — local commit only

| Allowed | Forbidden |
|---|---|
| `git status`, `git diff`, `git log`, `git blame` | `git push` (any remote) |
| `git add`, `git commit` (architect-prepared branch) | `git fetch`, `git pull` |
| `git branch` (list), `git switch`/`checkout` (local) | `gh pr create`, `gh api`, `gh auth` |
| `git worktree list` | network I/O with GitHub |

When tests GREEN + build clean + scope clean → reply "готово" + worktree path + commit hash. **Architect handles push + PR + merge.** Subagent context has no `gh auth` token; commands fail anyway.

If push seems necessary (CI smoke, etc.) → SCOPE VIOLATION REQUEST and stop. Do not bypass.
