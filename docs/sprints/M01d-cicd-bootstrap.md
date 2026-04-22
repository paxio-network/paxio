# M01d — CI/CD + GitHub Org Bootstrap

**Owner:** architect (infra), user (secrets + remote creation)
**Branch:** `feature/m01d-cicd`
**Depends on:** M01b ✅ (frontend bootstrap — needs 8 apps to exist)
**Parallel with:** M01c (landing implementation)
**Estimate:** 2–3 days

## Готово когда:
- [ ] `github.com/paxio-network/paxio` remote создан, `dev` и `main` запушены
- [ ] 9 GitHub workflow файлов в `.github/workflows/` — каждый с path-filter
- [ ] GitHub repo Secrets заполнены (см. `docs/secrets.md` §2)
- [ ] Vercel — 8 проектов созданы (personal account), каждый указывает на `apps/frontend/<app>` root
- [ ] Hetzner сервер подготовлен (Docker + ghcr.io access + `paxio-prod/` директория)
- [ ] Первый push в `main` → `deploy-backend.yml` успешно деплоит → `https://api.paxio.network/health` отвечает 200
- [ ] Первый tag `v0.1.0-alpha.0` → `release-tools.yml` публикует `paxio-sdk` на PyPI (next version после placeholder) + placeholders на npm + JSR + crates.io
- [ ] `bash scripts/verify_m01d_cicd.sh` — PASS

## Scope

### 9 GitHub Actions workflows

Структура копирует референсы:
- `complior-saas-front/.github/workflows/ci.yml` → frontend patterns
- `PROJECT/.github/workflows/{ci,deploy}.yml` → backend patterns
- `complior/.github/workflows/{ci,release}.yml` → multiplatform tools

| File | Trigger | Jobs |
|---|---|---|
| `ci-frontend-landing.yml` | PR/push on `apps/frontend/landing/**` + shared pkgs | lint, typecheck, build, security |
| `ci-frontend-registry.yml` | `apps/frontend/registry/**` | same |
| `ci-frontend-pay.yml` | `apps/frontend/pay/**` | same |
| `ci-frontend-radar.yml` | `apps/frontend/radar/**` | same |
| `ci-frontend-intel.yml` | `apps/frontend/intel/**` | same |
| `ci-frontend-docs.yml` | `apps/frontend/docs/**` | same |
| `ci-frontend-wallet.yml` | `apps/frontend/wallet/**` | same |
| `ci-frontend-fleet.yml` | `apps/frontend/fleet/**` | same |
| `ci-backend.yml` | `apps/back/**` + `products/*/app/**` + `packages/**` | lint, vitest + postgres service, security |
| `ci-canisters.yml` | `products/*/canister(s)/**` + `Cargo.{toml,lock}` | cargo fmt, clippy, test (workspace), security audit, wasm cdylib build |
| `deploy-backend.yml` | push to `main` + backend paths | Docker build → ghcr.io → SSH Hetzner → healthcheck → rollback |
| `release-tools.yml` | tag `v*` | Multiplatform binaries (5 targets), verify versions match tag, GitHub Release, publish to npm + JSR + crates.io + PyPI, smoke test |

**Optional:** consolidate 8 frontend workflows into `ci-frontend.yml` with matrix strategy — but keep separate for initial simplicity and per-app logs.

### Repository setup

1. **Create remote:**
   ```bash
   # (user) create empty repo github.com/paxio-network/paxio
   git remote add origin git@github.com:paxio-network/paxio.git
   git push -u origin dev
   git push -u origin main
   ```

2. **Branch protection rules** (GitHub Settings → Branches):
   - `main`: require PR, require 1 approval, require status checks `ci-backend / status-check`, `ci-canisters / status-check`, require linear history
   - `dev`: require status checks, allow force-push by admins only

3. **Secrets** (GitHub Settings → Secrets and variables → Actions):
   Per `docs/secrets.md` §2 minimum for Phase 0 merge:
   - `HETZNER_HOST`, `HETZNER_USER`, `HETZNER_SSH_KEY`
   - `PYPI_TOKEN` (уже у нас в `.env`)
   - `NPM_TOKEN` (user создаёт через npm)
   - `CARGO_TOKEN` (user создаёт через crates.io)
   - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_LANDING` (for 1st frontend project)

4. **JSR OIDC** (no token — но репо должен быть привязан):
   - `jsr.io/@paxio` scope → Settings → linked repo: `paxio-network/paxio`
   - Workflow permissions: `id-token: write`, `contents: read`

### Vercel setup (user, via Vercel dashboard)

Для каждого из 8 apps:
1. New Project → Import `paxio-network/paxio`
2. Root Directory: `apps/frontend/<app>`
3. Framework: Next.js
4. Build Command: `cd ../../.. && pnpm turbo run build --filter=<app>`
5. Install Command: `cd ../../.. && pnpm install --frozen-lockfile`
6. Output Directory: `.next`
7. Domain: `<app>.paxio.network` (apex for landing)
8. Environment Variables: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PRIVY_APP_ID_*`
9. Copy Project ID → GitHub Secret `VERCEL_PROJECT_ID_<APP>`

### Hetzner setup (user, via SSH)

Mirror PROJECT structure:
```
/home/<user>/paxio-prod/
├── .env                    # secrets (0600)
├── docker-compose.yml      # backend + postgres + redis + qdrant
├── data/                   # postgres volume, redis persistence
└── caddy/                  # reverse proxy → api.paxio.network
```

Подробная инструкция в `docs/deployment-hetzner.md` (пишется в рамках M01d).

## Files to create

### `.github/workflows/` (×12)
Все 9 workflow files перечисленные выше.

### Docs
- `docs/deployment-hetzner.md` — step-by-step Hetzner setup
- `docs/deployment-vercel.md` — per-app Vercel project creation
- `docs/release-process.md` — semver policy + changeset flow + tag procedure

### Verify script
- `scripts/verify_m01d_cicd.sh`:
  1. 9 workflow files exist, YAML valid
  2. All secrets documented in `docs/secrets.md` appear in at least one workflow (cross-ref check)
  3. `gh workflow list` shows all 9 (requires auth)
  4. Backend deploy smoke: `curl https://api.paxio.network/health` → 200

## Таблица задач

| # | Задача | Агент | Метод верификации | Архитектурные требования |
|---|---|---|---|---|
| 1 | 8 frontend CI workflows | architect | YAML validates, `gh workflow list` | Path filters via `dorny/paths-filter@v3`, Node 22, pnpm cache, independent jobs |
| 2 | backend CI workflow (ci-backend.yml) | architect | postgres service starts, vitest passes | Mirror `PROJECT/ci.yml`; services.postgres, DB_URL env, node 22 |
| 3 | canisters CI workflow (ci-canisters.yml) | architect | cargo workspace tests + wasm32 build | Mirror `complior/ci.yml` rust jobs; Swatinem/rust-cache, cargo-deny |
| 4 | backend deploy workflow | architect | SSH smoke deploy to test env | Mirror `PROJECT/deploy.yml`; Docker → ghcr.io → SSH → healthcheck → rollback on fail |
| 5 | release workflow (multiplatform) | architect | tag `v0.1.0-alpha.0` → artifacts uploaded | Mirror `complior/release.yml`; matrix 5 targets; GitHub Release; publish npm + JSR + PyPI + crates.io |
| 6 | Remote create + first push | user | `gh repo view paxio-network/paxio` returns repo | — |
| 7 | Secrets population in GitHub | user | Secrets listed in repo settings | Min set from `docs/secrets.md` §2 |
| 8 | Vercel 8 projects | user | Each domain resolves | Root Directory correct, env vars set |
| 9 | Hetzner server prep | user | `ssh hetzner 'docker ps'` shows postgres+redis | docker-compose.yml from `docs/deployment-hetzner.md` |

## Dependencies

- **M01b** must be merged for `apps/frontend/<app>/package.json` to exist (path filters need files).
- No runtime dependency on Phase 0 canisters — CI validates code, not canister deploy. Canister deploy is separate M05+ milestone.

## Статус: ЖДЁТ USER'А на параметры Hetzner + Vercel; architect готовит workflow YAML-скелеты
