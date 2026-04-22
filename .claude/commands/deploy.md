# Deploy commands for Paxio

## ICP canister deployment (local)

```bash
source scripts/dfx-setup.sh     # per-agent port scheme (M00c)
dfx_start

# Canonical locations (Cargo workspace root):
dfx deploy wallet               # products/03-wallet/canister/          (icp-dev)
dfx deploy security             # products/04-security/canister/        (icp-dev)
dfx deploy audit-log            # products/06-compliance/canisters/audit-log/ (icp-dev)
dfx deploy reputation           # products/01-registry/canister/        (registry-dev)
dfx deploy bitcoin-agent        # products/05-bitcoin-agent/canisters/* (icp-dev)

# Check canister IDs
dfx canister id wallet
dfx canister id audit-log
```

## Deploy to ICP mainnet (requires cycle tokens)

```bash
dfx deploy --network ic wallet
dfx deploy --network ic security
dfx deploy --network ic audit-log
dfx deploy --network ic reputation
```

## Frontend deployment (Vercel — 8 projects)

Каждый app деплоится в свой Vercel project (Monorepo Projects pattern).
CI-триггер: push в `main` → path-filter (`.github/workflows/ci-frontend-<app>.yml`) → Vercel git-webhook autodeploy.

Manual deploy (если нужен прямой push):

```bash
cd apps/frontend/landing  && vercel --prod   # paxio.network
cd apps/frontend/registry && vercel --prod   # registry.paxio.network
cd apps/frontend/pay      && vercel --prod   # pay.paxio.network
cd apps/frontend/radar    && vercel --prod   # radar.paxio.network
cd apps/frontend/intel    && vercel --prod   # intel.paxio.network
cd apps/frontend/docs     && vercel --prod   # docs.paxio.network
cd apps/frontend/wallet   && vercel --prod   # wallet.paxio.network
cd apps/frontend/fleet    && vercel --prod   # fleet.paxio.network
```

## Backend deployment (Hetzner Docker)

См. `docs/deployment-hetzner.md`. CI: `.github/workflows/deploy-backend.yml`:
Docker build → ghcr.io → SSH Hetzner → healthcheck → rollback.

```bash
# Manual production start (NOT the CI flow)
NODE_ENV=production node apps/back/server/main.cjs
```

## External services (NOT deployed from this repo)

- **Guard Agent** (`guard.paxio.network`): отдельный Python/FastAPI репо `/home/openclaw/guard/`, деплой на Hetzner GX11. Подключён как git submodule в `products/04-security/guard/`.

## Environment variables

```bash
# Load before deployment
export $(grep -v '^#' .env | xargs)

# Verify critical vars (см. docs/secrets.md для полного списка)
echo $ICP_GATEWAY
echo $DATABASE_URL
echo $HETZNER_HOST
```

## Post-deploy verification

```bash
# Verify wallet canister is responsive
dfx canister call wallet greet "test"

# Verify audit log canister
dfx canister call audit-log get_log '(record { count = 10 })'

# Verify backend health
curl https://api.paxio.network/health
```

Report: success/failure, canister IDs, deployed versions, Vercel deployment URLs.
