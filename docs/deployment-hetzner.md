# Deployment — Hetzner (Backend)

Hetzner = `api.paxio.network` (Fastify + Postgres + Redis + Qdrant).
Mirror of `/home/openclaw/PROJECT` deployment pattern.

## One-time server setup

```bash
ssh <user>@<hetzner-host>

# System prep
sudo apt update && sudo apt install -y curl git ca-certificates

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# re-login for group to apply

# Create deploy directory
mkdir -p ~/paxio-prod/{data/postgres,data/redis,data/qdrant,caddy}
cd ~/paxio-prod

# Secrets (0600, owned by you only)
touch .env
chmod 600 .env
# populate from local .env.example — see docs/secrets.md

# Login to ghcr.io (needs GitHub PAT with packages:read scope)
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
```

## `docker-compose.yml`

Lives at `~/paxio-prod/docker-compose.yml`:

```yaml
services:
  backend:
    image: ghcr.io/paxio-network/paxio-backend:latest
    container_name: paxio-backend
    restart: unless-stopped
    env_file: .env
    ports:
      - "127.0.0.1:3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s
      timeout: 3s
      retries: 5

  postgres:
    image: postgres:16-alpine
    container_name: paxio-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: paxio
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "${POSTGRES_USER}"]
      interval: 10s

  redis:
    image: redis:7-alpine
    container_name: paxio-redis
    restart: unless-stopped
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  qdrant:
    image: qdrant/qdrant:v1.10.1
    container_name: paxio-qdrant
    restart: unless-stopped
    ports:
      - "127.0.0.1:6333:6333"
    volumes:
      - ./data/qdrant:/qdrant/storage

  caddy:
    image: caddy:2-alpine
    container_name: paxio-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile
      - ./caddy/data:/data
      - ./caddy/config:/config
```

## `caddy/Caddyfile`

```
api.paxio.network {
  reverse_proxy localhost:3001
  encode gzip zstd
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}
```

Point DNS A-record `api.paxio.network` → Hetzner IP. Caddy auto-renews Let's Encrypt cert on startup.

## First deploy

```bash
# Pull image from ghcr (after first `deploy-backend.yml` run)
docker pull ghcr.io/paxio-network/paxio-backend:latest

# Start stack
docker compose up -d

# Wait for healthy
docker compose ps
# backend should be "healthy"

# Verify
curl https://api.paxio.network/health
# → 200 OK
```

## GitHub Secrets required

Per `docs/secrets.md`:

| Secret | Value |
|---|---|
| `HETZNER_HOST` | Server DNS name or IP |
| `HETZNER_USER` | SSH user (owns `~/paxio-prod/`) |
| `HETZNER_SSH_KEY` | Private key, PEM-encoded, for above user. Public key must be in `~/.ssh/authorized_keys` on server. |

## SSH key provisioning

Generate a **dedicated deploy key** (not a personal key):

```bash
# Locally
ssh-keygen -t ed25519 -C "paxio-deploy" -f ~/.ssh/paxio_deploy -N ""

# Public key → Hetzner server authorized_keys
ssh-copy-id -i ~/.ssh/paxio_deploy.pub <user>@<host>

# Private key → GitHub Secret HETZNER_SSH_KEY
cat ~/.ssh/paxio_deploy | gh secret set HETZNER_SSH_KEY -R paxio-network/paxio
```

## Rollback

`deploy-backend.yml` has automatic rollback on failed healthcheck (see workflow). Manual rollback:

```bash
ssh <user>@<host>
cd ~/paxio-prod

# List available tags
docker images ghcr.io/paxio-network/paxio-backend

# Tag a previous SHA as latest
docker tag ghcr.io/paxio-network/paxio-backend:<prev-sha> \
           ghcr.io/paxio-network/paxio-backend:latest

# Restart
docker compose up -d --no-deps backend
```

## Monitoring

Minimum (Phase 0):
- `curl https://api.paxio.network/health` every minute from uptimerobot.com
- `docker logs paxio-backend` on alert

Phase 1+:
- Grafana + Prometheus sidecar in docker-compose
- Sentry error tracking
- Canister telemetry ingestion
