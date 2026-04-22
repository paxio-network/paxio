# Secrets Registry — Paxio

**Last audit:** 2026-04-22 · **Owner:** user · **Committed:** yes (meta only — never actual values)

This document is the **source of truth for WHICH secrets exist, WHO owns them, HOW to rotate, and WHAT breaks if they expire**. Actual values live in:

- **Dev machine:** `/home/nous/paxio/.env` (gitignored, never commit)
- **CI (GitHub Actions):** repo Settings → Secrets and variables → Actions
- **Vercel:** each project → Settings → Environment Variables
- **Hetzner production:** `/home/<user>/paxio-prod/.env` on the server, Docker env_file

Template: [`.env.example`](../.env.example) — copy, fill, never commit.

---

## Secret inventory

| Name | Scope | Used by | Owner | Rotation | If expires |
|---|---|---|---|---|---|
| `PYPI_TOKEN` | PyPI `paxio-sdk` project | `release-tools.yml` | user | 180d | Python SDK release fails. Users still `pip install` old version. |
| `NPM_TOKEN` | npm org `paxio` | `release-tools.yml` | user | 180d | TS SDK / MCP / proxy / CLI publish fails. |
| `CARGO_TOKEN` | crates.io account | `release-tools.yml` | user | 365d | `paxio-cli` publish fails. |
| `HETZNER_HOST` | Production server DNS/IP | `deploy-backend.yml` | user | static | Backend deploy SSH fails. |
| `HETZNER_USER` | SSH user on prod | `deploy-backend.yml` | user | static | Backend deploy SSH fails. |
| `HETZNER_SSH_KEY` | SSH private key for deploy user | `deploy-backend.yml` | user | 365d | Backend deploy SSH fails. Requires manual rekey via console. |
| `VERCEL_TOKEN` | Personal Vercel account | `deploy-frontend-*.yml` (if manual deploy) | user | 180d | Frontend manual deploy fails. Automatic deploys via git webhook still work. |
| `VERCEL_ORG_ID` | Personal Vercel org UUID | `deploy-frontend-*.yml` | user | static | — |
| `VERCEL_PROJECT_ID_*` (×8) | Per-app Vercel project UUIDs | `deploy-frontend-*.yml` | user | static | Specific app deploy fails. |
| `DATABASE_URL` | PostgreSQL connection | Fastify backend | user | when rotating pg password | Backend cannot read/write agent metadata. |
| `REDIS_URL` | Redis connection | Fastify backend | user | when rotating redis password | Rate limits off, cache miss, slower API. |
| `QDRANT_URL` | Qdrant vector DB endpoint | Fastify backend | user | static | Registry semantic search falls back to BM25 only. |
| `GUARD_API_KEY` | External Guard ML service | Fastify backend | user (coordinated with a3ka team) | 90d | Guard HTTP calls return 401; Security Sidecar falls back to deterministic-only verdict. |
| `NEXT_PUBLIC_PRIVY_APP_ID_*` (×6) | Privy app IDs per frontend | Per Vercel project env | user | on Privy app re-creation | Auth broken on that app. |
| `ICP_IDENTITY_PEM` | dfx identity for canister deploy | `deploy-canisters.yml` (when added) | user | on key compromise | Canister upgrades fail. |
| `DOCKERHUB_TOKEN` (optional) | Docker Hub publish | `release-cli.yml` docker job | user | 365d | Docker image tag doesn't get pushed — binaries still released via GitHub Releases. |

---

## Where to set secrets

### 1. Developer machine (local dev)
```bash
cp .env.example .env
# edit .env — fill values. Never commit.
```

### 2. GitHub Actions (CI/CD)

Settings → Secrets and variables → Actions → Repository secrets:

Minimum required for `main` branch (current Phase 0):
- `HETZNER_HOST`, `HETZNER_USER`, `HETZNER_SSH_KEY` — backend deploy
- `PYPI_TOKEN`, `NPM_TOKEN`, `CARGO_TOKEN` — SDK publish
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_MARKETING` — frontend deploy (only marketing in P0)

Can be added later:
- Remaining `VERCEL_PROJECT_ID_*` (as each frontend app reaches deploy-ready)
- `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (optional)

### 3. Vercel per-project

Dashboard → Project → Settings → Environment Variables. Scope: Production + Preview + Development (or whichever subset).

Minimum for each frontend:
- `NEXT_PUBLIC_API_URL` = `https://api.paxio.network` (prod) or `http://localhost:3001` (dev)
- `NEXT_PUBLIC_PRIVY_APP_ID` = per-app Privy ID

### 4. Hetzner production (Docker)

Mirror of `complior` pattern:
```bash
# On server at /home/<user>/paxio-prod/.env — 0600 perms, owned by deploy user
ssh <user>@<host>
cd /home/<user>/paxio-prod
chmod 600 .env
```

Docker Compose reads `.env` via `env_file:` directive.

---

## Rotation procedure

For any secret with expiration:

1. Generate new value at the provider (PyPI, npm, etc.).
2. Update `/home/nous/paxio/.env` locally.
3. Update GitHub repo secret.
4. Update Vercel project env (if applicable).
5. Update Hetzner server `.env` via SSH.
6. Trigger a CI run to verify: `gh workflow run ci-backend.yml`.
7. Revoke the old token at the provider.
8. Note the rotation date in this file's row.

---

## Emergency — leaked secret

If a token lands in git history or public channel:

1. **Immediately** revoke at the provider.
2. Generate new token, update all 4 places (see "Where to set secrets").
3. Force-push removal from git history: `git filter-repo --invert-paths --path .env` (only if the leak is recent and solo).
4. Check for unauthorised usage: npm audit log, PyPI download spike, crates.io versions.
5. Post-mortem: how did it leak? Update `.gitignore`, add pre-commit check (`gitleaks`).

---

## Current status

- ✅ `PYPI_TOKEN` — set in `.env`, uploaded placeholder `paxio-sdk` 0.0.1a0 on 2026-04-22.
- ⬜ All other secrets — pending setup when corresponding infrastructure comes online (GitHub remote, Vercel projects, Hetzner server).
