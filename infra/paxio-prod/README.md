# Paxio Production Host — Hetzner Runbook

Mirror of `/home/openclaw/complior-prod/` pattern. This directory is
**copied to the Hetzner server once** during initial bootstrap, then
operated by `.github/workflows/deploy-backend.yml`.

## Topology

```
                  ┌────────────────────────────────┐
   Internet ──443─┤  Caddy (TLS, HSTS, CORS)        │
                  │  api.paxio.network              │
                  └──────────────┬─────────────────┘
                                 │ http://backend:3001
                  ┌──────────────▼─────────────────┐
                  │  Backend container             │
                  │  ghcr.io/paxio-network/        │
                  │     paxio-backend:latest       │
                  │  Fastify on :3001 + /health    │
                  └──────────────┬─────────────────┘
                                 │ postgres:5432
                  ┌──────────────▼─────────────────┐
                  │  Postgres 16 (pgdata volume)   │
                  └────────────────────────────────┘
```

## Initial bootstrap (one-time, manual)

Done **once** on a fresh Hetzner CX22 box. After this, all updates
flow through CI.

1. **Provision** Hetzner CX22 (≈ €5/mo, 2 vCPU, 4 GB RAM) Ubuntu 22.04.
2. **Install Docker + Compose plugin**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```
3. **Add deploy SSH key** to `~/.ssh/authorized_keys` (the public half of
   the key pair stored in GitHub repo secrets as `HETZNER_SSH_KEY`).
4. **Copy this directory** onto the host:
   ```bash
   scp -r infra/paxio-prod/ user@<hetzner-ip>:/home/user/paxio-prod/
   ```
5. **Create real secrets on host** (NEVER commit):
   ```bash
   ssh user@<hetzner-ip>
   cd ~/paxio-prod
   openssl rand -hex 16 > secrets/db_password.txt
   chmod 600 secrets/db_password.txt
   cp .env.production.example .env.production
   # Edit .env.production:
   #   - replace CHANGEME with the same value from secrets/db_password.txt
   #     in BOTH DB_PASSWORD and DATABASE_URL
   #   - leave optional REDIS_URL/QDRANT_URL empty for now
   chmod 600 .env.production
   ```
6. **DNS** — point `api.paxio.network` (A-record) → Hetzner public IP.
   Cloudflare proxy MUST be OFF (grey cloud) so Caddy can issue Let's
   Encrypt cert directly. Caddy auto-renews; nothing else to do.
7. **First boot**:
   ```bash
   docker compose pull          # backend image from ghcr.io
   docker compose up -d         # postgres, backend, caddy
   docker compose ps            # all healthy?
   curl https://api.paxio.network/health   # → 200 + valid body
   ```
8. **GitHub repo secrets** (Settings → Secrets and variables → Actions):
   - `HETZNER_HOST` = Hetzner public IP or DNS name
   - `HETZNER_USER` = the SSH user (e.g. `ubuntu`)
   - `HETZNER_SSH_KEY` = the private half of the deploy key (PEM)
9. **Vercel env**:
   - For each of 8 frontend apps, in Vercel project settings →
     Environment Variables, add `NEXT_PUBLIC_API_URL=https://api.paxio.network`
     for Production. Trigger redeploy.

## Routine deploys (CI-driven)

After bootstrap, **never SSH manually**. Workflow triggers on `main`:

```
git push main → .github/workflows/deploy-backend.yml runs:
  1. Build Dockerfile.production → push ghcr.io/paxio-network/paxio-backend:<sha>
  2. SSH to Hetzner: cd paxio-prod && docker pull && docker compose up -d --no-deps backend
  3. Wait healthcheck (90s)
  4. Smoke: curl https://api.paxio.network/health → 200
  5. On failure: rollback to previous tag
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `curl /health` hangs | DNS not propagated OR Cloudflare orange-cloud blocking Let's Encrypt | check `dig api.paxio.network` + Cloudflare proxy off |
| `502 Bad Gateway` from Caddy | backend container unhealthy | `docker logs paxio-backend --tail=50` |
| `checks.database='error'` in /health | Postgres password mismatch between `secrets/db_password.txt` and `DATABASE_URL` in `.env.production` | regenerate both, restart `docker compose up -d` |
| Cert renewal fails | Caddy can't reach `:80` (firewall) | check `iptables -L`, ensure 80 + 443 + 443/udp open |
| Image pull denied | ghcr.io package set to private + no token | make package public OR add `docker login ghcr.io` with PAT |

## Files in this directory

| Path | Committed? | Purpose |
|---|---|---|
| `docker-compose.yml` | ✅ yes | runtime stack definition |
| `caddy/Caddyfile` | ✅ yes | reverse-proxy + TLS config |
| `.env.production.example` | ✅ yes | env template |
| `.env.production` | ❌ NO (gitignored) | real env on host |
| `secrets/db_password.txt` | ❌ NO (gitignored) | Postgres pw on host |
| `README.md` | ✅ yes | this file |

## Why mirror complior-prod pattern

Same pattern is used in production for `/home/openclaw/complior-prod/`
on the same Hetzner box. Proven for ≈ 6 months: zero TLS issues, zero
deploy failures (last 30 deploys all green), <1s downtime per deploy
(Caddy holds connections, single-service `up -d --no-deps` doesn't
restart the proxy). No reason to invent a different pipeline here.
