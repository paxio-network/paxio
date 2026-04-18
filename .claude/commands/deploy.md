# Deploy commands for Paxio

## ICP canister deployment

```bash
# Local network
dfx deploy registry           # FA-01 (registry-dev)
dfx deploy wallet             # FA-03 (icp-dev)
dfx deploy audit_log          # FA-06 (icp-dev)
dfx deploy reputation         # FA-01 (icp-dev)
dfx deploy security_sidecar   # FA-04 (icp-dev)
dfx deploy bitcoin_agent      # FA-05 (icp-dev)

# Check canister IDs
dfx canister id registry
dfx canister id wallet
dfx canister id audit_log
```

## Deploy to testnet (requires cycle tokens)

```bash
dfx deploy --network ic registry
dfx deploy --network ic wallet
dfx deploy --network ic audit_log
dfx deploy --network ic reputation
dfx deploy --network ic security_sidecar
dfx deploy --network ic bitcoin_agent
```

## Frontend deployment (Vercel)

```bash
cd packages/frontend/landing && vercel --prod    # paxio.network
cd packages/frontend/app && vercel --prod        # app.paxio.network
cd packages/frontend/docs && vercel --prod       # docs.paxio.network
```

## Backend deployment (Fastify)

Backend разворачивается как standard Node.js сервис:

```bash
# production start
NODE_ENV=production node server/main.cjs
```

## External services (NOT deployed from this repo)

- **Guard Agent** (`guard.paxio.network`): отдельный Python/FastAPI репо `/home/openclaw/guard/`, деплой на Hetzner GX11.

## Environment variables

```bash
# Load before deployment
export $(grep -v '^#' .env | xargs)

# Verify critical vars
echo $ICP_GATEWAY
echo $DATABASE_URL
```

## Post-deploy verification

```bash
# Verify wallet canister is responsive
dfx canister call wallet greet "test"

# Verify all canisters
dfx canister call audit_log get_log '(record { count = 10 })'
```

Report: success/failure, canister IDs, deployed versions.
