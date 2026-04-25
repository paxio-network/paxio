# M-L8 — Backend Deploy to Hetzner (api.paxio.network)

> Phase 1 — Landing Data Completion. M-L1/M-L4a/M-L5 produced real-data
> backend endpoints; landing's `useQuery` calls go to
> `${NEXT_PUBLIC_API_URL}` which currently has no service listening. M-L8
> stands the backend up at `https://api.paxio.network` so the Vercel
> landing renders real data instead of skeleton/empty states.

## Готово когда:

1. `bash scripts/verify_M-L8_local.sh` PASS — local Docker stack
   (Postgres + backend) boots from a clean checkout and `curl
   localhost:3001/health` returns `{status:'ok', checks:{database:'ok'}, …}`
   parseable by `ZodHealthResponse`.
2. `feature/m-l8-deploy` merged → `dev` → `main`.
3. `.github/workflows/deploy-backend.yml` triggers on `main` push, builds
   image, ssh's to Hetzner, restarts backend, runs smoke test against
   `https://api.paxio.network/health` — all green.
4. `bash scripts/verify_M-L8_smoke.sh` (run locally pointing at prod) PASS.
5. Landing on `paxio.network` renders real numbers (Hero PAEI strip,
   Network Graph nodes, Heatmap, Top Agents) — no skeleton on data-driven
   sections.

## Метод верификации (Тип 2 — интеграционный)

| Layer | How |
|---|---|
| Unit | `pnpm vitest run tests/health-endpoint.test.ts` — 8 GREEN |
| Local stack | `bash scripts/verify_M-L8_local.sh` — PASS=11 FAIL=0 |
| Production smoke | `bash scripts/verify_M-L8_smoke.sh` — PASS=6 FAIL=0 |
| E2E | manually: open https://paxio.network in browser, confirm Hero strip + NetworkGraph + Heatmap render real data (or zero, but no skeleton) |

## Зависимости

- [x] `apps/back/server/main.cjs` boots Fastify (M00 foundation)
- [x] `apps/back/server/src/http.cjs::initHealth` exists (will be widened in T-3)
- [x] `.github/workflows/deploy-backend.yml` template (M01d-cicd-bootstrap)
- [x] `packages/types/src/health.ts` ZodHealthResponse contract (T-1, this milestone)

## Архитектура

### Топология (Hetzner host)

```
Internet ─443─► Caddy (TLS, HSTS, CORS, Let's Encrypt auto-renew)
                  │ http://backend:3001
                  ▼
                Backend (Fastify) ─┬─► Postgres 16 (pgdata volume)
                  ghcr.io image    │
                                   └─► (future) Redis, Qdrant, ICP
```

### Why this pattern

Mirrors `/home/openclaw/complior-prod/` proven for ≈ 6 months:
zero deploy failures last 30 deploys, <1s downtime per deploy (Caddy
holds connections, single-service `up -d --no-deps` doesn't restart proxy),
Let's Encrypt auto-issue, no manual cert management. No reason to invent.

### Deploy flow (CI-driven, after one-time bootstrap)

```
git push main → .github/workflows/deploy-backend.yml:
  build job:
    - docker buildx build -f Dockerfile.production
    - push ghcr.io/paxio-network/paxio-backend:<sha> + :latest
  deploy job (needs: build):
    - actions/checkout@v4 (so smoke script is in workspace)
    - appleboy/ssh-action@v1:
        ssh user@hetzner →
        cd /home/user/paxio-prod →
        docker pull ghcr.io/.../paxio-backend:<sha> →
        docker tag :<sha> :latest →
        docker compose up -d --no-deps backend →
        wait healthcheck 90s
    - smoke step: bash scripts/verify_M-L8_smoke.sh (curl prod /health)
    - rollback step (if failure): retag previous, restart
```

## Tasks

| # | Кто | Что | Где | Verification | Architecture Requirements |
|---|---|---|---|---|---|
| T-1 | architect | Health Zod contract | `packages/types/src/health.ts` + barrel export | contract test in landing-contracts.test.ts auto-runs | Zod schema, `.catchall(ZodHealthCheckStatus)` for extensibility, no class, infer types via `z.infer` |
| T-2 | architect | Acceptance scripts | `scripts/verify_M-L8_local.sh`, `scripts/verify_M-L8_smoke.sh` | scripts FAIL pre-impl, PASS post-impl | bash `set -euo pipefail`, `mkdir -p $HOME/tmp` per TD-11 lesson, trap cleanup, exit codes correct |
| T-3 | backend-dev | Widen `initHealth(server, deps)` | `apps/back/server/src/http.cjs` | `tests/health-endpoint.test.ts` 8 GREEN | injected `deps.db.ping()`, async/await, no try/catch swallowing, ISO 8601 timestamp, version from `pkg.version`, status='degraded' iff any check='error', skipped probes don't degrade |
| T-4 | backend-dev | `Dockerfile.production` + `.dockerignore` | repo root | `docker build -f Dockerfile.production .` succeeds | multi-stage (deps→build→runtime), pnpm via corepack, `--frozen-lockfile`, distroless or alpine, non-root user, EXPOSE 3001, HEALTHCHECK wget /health, CMD `node apps/back/server/main.cjs`, no secrets in layers, `.dockerignore` excludes node_modules + .git + .env* + *.md + tmp + .next + opensrc |
| T-5 | backend-dev | `docker-compose.yml` (dev) + `docker-compose.production.yml` (host-side reference) | repo root | `bash scripts/verify_M-L8_local.sh` step 4 PASS | services: backend + postgres:16-alpine; named volumes; healthchecks for both; `depends_on: { postgres: { condition: service_healthy } }`; networks: bridge; production version uses `image: ghcr.io/...:latest` not `build:` |
| T-6 | architect | `infra/paxio-prod/` host template | `infra/paxio-prod/{docker-compose.yml,caddy/Caddyfile,.env.production.example,secrets/.gitkeep,.gitignore,README.md}` | scp-copyable to Hetzner, README runbook complete | Caddy 2-alpine, HSTS preload, `flush_interval -1` for SSE, OPTIONS preflight handler, `secrets:` directive for Postgres pw, no real secrets committed |
| T-7 | architect | M-L8 milestone doc + verify deploy-backend.yml paths | `docs/sprints/M-L8-backend-deploy.md`, `.github/workflows/deploy-backend.yml` | this file + workflow runs cleanly on `main` push | path filter includes `infra/paxio-prod/**`, `docker-compose.production.yml`; `actions/checkout@v4` added to deploy job so smoke-script is in workspace |
| T-8 | architect | Run E2E acceptance | `bash scripts/verify_M-L8_local.sh` | PASS=11 FAIL=0 | local stack boot under 90s, idempotent (re-runs work) |
| T-9 | architect | Commit + branch + handoff | `feature/m-l8-deploy` | branch pushed; PR opened after backend-dev T-3..T-5 done | architect commits T-1, T-2, T-6, T-7 only; backend-dev commits T-3, T-4, T-5 to same branch |

## Предусловия среды (architect обеспечивает ДО запуска backend-dev)

- [x] `pnpm install` clean
- [x] `pnpm typecheck` clean
- [x] `pnpm vitest run tests/health-endpoint.test.ts` — 5 RED, 3 GREEN (RED state proves spec)
- [x] Docker daemon running locally (for backend-dev T-4 verification)
- [x] `.github/workflows/deploy-backend.yml` exists with HETZNER_* secret refs

## User actions (orchestration only — separate from milestone closure)

These are **not** agent deliverables. After M-L8 merges to `main`,
user does:

1. Provision Hetzner CX22 (or reuse existing complior box if disk allows).
2. `scp -r infra/paxio-prod/ user@hetzner:~/paxio-prod/` (one-time).
3. `ssh hetzner` → write real `secrets/db_password.txt` + `.env.production`
   per `infra/paxio-prod/README.md`.
4. DNS A-record `api.paxio.network` → Hetzner IP (Cloudflare proxy OFF).
5. GitHub repo Secrets: `HETZNER_HOST`, `HETZNER_USER`, `HETZNER_SSH_KEY`.
6. Vercel env `NEXT_PUBLIC_API_URL=https://api.paxio.network` × 8 apps,
   trigger redeploy.

After step 6, landing `paxio.network` renders real numbers from
`api.paxio.network` and M-L8 is **ВЫПОЛНЕН**.

## Не делаем в M-L8 (явный non-scope)

- Redis container — не нужен пока no caching layer used (M-L9+).
- Qdrant container — не нужен пока no vector search used (Intelligence FA).
- ICP local replica — production talks to mainnet IC; replica is dev-only.
- Migrations — Postgres schema bootstraps via on-boot SQL; full migration
  framework deferred to M17 (persistence milestone, see TD-M01-2).
- Multi-region/HA — single Hetzner box for v0.1; no LB, no failover. Acceptable
  for current product stage (pre-PMF).
- Staging environment — only prod for now. Staging in M-L8.5+ if user wants.

## Tech debt expected from this milestone

- **TD candidate**: `Dockerfile.production` builds entire monorepo into image;
  could be smaller with `--filter @paxio/back...` deploy. Optimize later if
  image > 500 MB or build time > 5 min.
- **TD candidate**: `docker-compose.production.yml` lives in repo root AND
  `infra/paxio-prod/docker-compose.yml` exists — two compose files. Document
  in README which is "source of truth"; DRY later.
