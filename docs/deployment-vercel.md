# Deployment — Vercel (8 frontend apps)

Each of 8 Next.js apps in `apps/frontend/*` = separate Vercel project in **personal account**. Vercel has first-class support for Monorepo Projects.

| App | Vercel project name | Production domain |
|---|---|---|
| `apps/frontend/landing/` | `paxio-landing` | `paxio.network` (apex) + `www.paxio.network` |
| `apps/frontend/registry/` | `paxio-registry` | `registry.paxio.network` |
| `apps/frontend/pay/` | `paxio-pay` | `pay.paxio.network` |
| `apps/frontend/radar/` | `paxio-radar` | `radar.paxio.network` |
| `apps/frontend/intel/` | `paxio-intel` | `intel.paxio.network` |
| `apps/frontend/docs/` | `paxio-docs` | `docs.paxio.network` |
| `apps/frontend/wallet/` | `paxio-wallet` | `wallet.paxio.network` |
| `apps/frontend/fleet/` | `paxio-fleet` | `fleet.paxio.network` |

## Per-project setup (repeat 8 times)

In the Vercel dashboard:

1. **New Project** → Import Git Repository → `paxio-network/paxio`
2. **Root Directory:** `apps/frontend/<app>` — click "Edit" and set this
3. **Framework Preset:** Next.js (auto-detected)
4. **Build Command:** use the full workspace name with `-app` suffix (see naming rule in `.claude/rules/frontend-rules.md`):
   ```bash
   cd ../../.. && pnpm turbo run build --filter=@paxio/<app>-app
   # e.g. --filter=@paxio/landing-app, --filter=@paxio/registry-app
   ```
5. **Install Command:**
   ```bash
   cd ../../.. && pnpm install --frozen-lockfile
   ```
6. **Output Directory:** `.next` (default — leave alone)
7. **Environment Variables** (under Project Settings → Environment Variables):
   - `NEXT_PUBLIC_API_URL` = `https://api.paxio.network` (Production)
   - `NEXT_PUBLIC_API_URL` = `http://localhost:3001` (Development)
   - `NEXT_PUBLIC_PRIVY_APP_ID_<APP>` = Privy project ID (for apps that use auth)
8. **Domain:** Settings → Domains → add the target domain, verify DNS

## DNS

Each domain points to Vercel:
```
paxio.network            A     76.76.21.21            (Vercel apex)
*.paxio.network          CNAME cname.vercel-dns.com.  (all subdomains)
```

Except:
- `api.paxio.network` → Hetzner IP (backend)
- `guard.paxio.network` → a3ka-team's Guard server
- `mcp.paxio.network` → Vercel project for MCP server (optional, M05+)
- `ml.paxio.network` → Hetzner (Python Intelligence ML service)

## Automatic deploys via git webhook

Vercel listens for pushes to `main` and triggers builds for projects whose **Root Directory** contains changed files.

Example: push changing only `apps/frontend/registry/**` → only `paxio-registry` deploys. Other 7 projects are skipped (this is why Monorepo Projects scales — no wasted builds).

**Preview deploys:** every PR gets 8 preview URLs (one per project) — but Vercel only builds projects whose root dir has changes.

## GitHub Secrets (for manual deploys / E2E tests)

Usually not needed — Vercel webhook handles deploys. But for manual triggers (e.g. `deploy-frontend.yml` workflow later):

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | Personal access token from vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Personal org UUID — find at Settings → General |
| `VERCEL_PROJECT_ID_<APP>` | Per-project UUID — find in Project → Settings → General |

## Turborepo Remote Cache (recommended)

Speeds up Vercel builds by sharing build artifacts across projects:

1. Vercel dashboard → Team → Settings → Remote Cache → Enable
2. Copy the token and team slug
3. In each Vercel project, add env vars:
   - `TURBO_TOKEN` = token
   - `TURBO_TEAM` = team slug

Result: builds that only need `@paxio/ui` (already cached) skip the 20-30s pnpm install.

## Brand configuration (wallet → Bitgent optional)

`apps/frontend/wallet/app/config.ts`:
```ts
export const BRAND = process.env.NEXT_PUBLIC_BRAND ?? 'Paxio Wallet';
```

Set `NEXT_PUBLIC_BRAND=Bitgent` in Vercel env to rebrand without code changes. Assets (logo, favicon, og image) loaded from `/brands/${BRAND.toLowerCase()}/`.
