# Paxio Dev Environment

Pipeline guide для локальной разработки на Paxio: установка инструментов, per-agent dfx-flow, worktree-паттерн, тесты.

## Prerequisites

| Tool | Version | Install | Используется для |
|---|---|---|---|
| **Node.js** | 22.x LTS | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo -E bash - && sudo apt install nodejs` | Backend (Fastify), frontend (Next.js 15) |
| **pnpm** | 10.33+ | `curl -fsSL https://get.pnpm.io/install.sh \| sh -` | Monorepo package manager |
| **Rust** | 1.80+ (stable) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | Canisters (`products/*/canister/`, `platform/canister-shared/`) |
| **dfx** | 0.24+ | `DFX_VERSION=0.24.0 sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"` | ICP local replica, canister deploy |
| **uv** | 0.11+ | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | Python ML service (`products/07-intelligence/ml/`) |
| **cargo-audit** | latest | `cargo install cargo-audit` | Security scan в CI |
| **yamllint** | latest | `pip install yamllint` (или `apt install yamllint`) | CI workflow validation |

Проверка установки:
```bash
node --version   # v22.x.x
pnpm --version   # 10.33.x
rustc --version  # rustc 1.80+
dfx --version    # dfx 0.24+
uv --version     # uv 0.11+
```

## First-time setup

```bash
git clone git@github.com:paxio-network/paxio.git
cd paxio
pnpm install                    # auto-initializes git submodules (products/04-security/guard)
cargo fetch                     # warms Rust dependency cache
pnpm typecheck                  # baseline TS check
cargo check --workspace         # baseline Rust check
```

**Env-переменные:**
```bash
cp .env.example .env
# Заполни ключи (см. docs/secrets.md для полного списка)
```

## Per-agent dfx flow

Paxio дев-агенты работают параллельно в worktree-ях. Чтобы их dfx-реплики не конфликтовали по порту, каждому агенту назначен свой порт через `scripts/dfx-setup.sh`:

| Agent | DFX_PORT |
|---|---|
| architect (default) | 4943 |
| registry-dev | 4950 |
| icp-dev | 4951 |
| backend-dev | 4952 |
| frontend-dev | 4953 |
| test-runner | 4954 |
| reviewer | 4955 |

**Базовый flow:**
```bash
AGENT_NAME=icp-dev source scripts/dfx-setup.sh
dfx_start                        # replica up на 127.0.0.1:4951
dfx_deploy                       # build + deploy всех canisters из dfx.json
# ... работаем ...
bash scripts/verify_m02_wallet.sh
dfx_stop
```

Функции `dfx_start`/`dfx_deploy`/`dfx_stop` экспортируются в shell — их можно звать из acceptance scripts после `source`.

## Worktree pattern

Phase-0 и все последующие milestones используют git worktrees для параллельной разработки:

```bash
# architect создаёт feature-ветку + worktree
git worktree add /home/nous/paxio-worktrees/m05-bitcoin-agent feature/m05-bitcoin-agent

# dev-agent работает в worktree (unique branch, unique dfx port)
cd /home/nous/paxio-worktrees/m05-bitcoin-agent
AGENT_NAME=icp-dev source scripts/dfx-setup.sh
# ... реализация + unit tests ...

# По готовности — PR
git push -u origin feature/m05-bitcoin-agent
gh pr create --base dev

# После merge — worktree и ветка чистятся
cd /home/nous/paxio
git worktree remove /home/nous/paxio-worktrees/m05-bitcoin-agent
git branch -d feature/m05-bitcoin-agent
```

Актуальные worktrees: `git worktree list`.

## Running tests locally

| Layer | Command | Scope |
|---|---|---|
| TS unit | `pnpm test -- --run` | `tests/` + `products/*/tests/` + `packages/*/tests/` |
| TS typecheck | `pnpm typecheck` | `tsc --noEmit` for all workspaces |
| TS integration | `pnpm test:integration` | отмечено `*.integration.ts` |
| Rust unit | `cargo test --workspace` | все canister crates + `canister-shared` |
| Rust clippy | `cargo clippy --workspace -- -D warnings` | lints as errors |
| Acceptance | `bash scripts/verify_m0X_xxx.sh` | E2E для конкретного milestone |
| Frontend (per app) | `pnpm --filter @paxio/landing-app test` | smoke tests |
| Frontend (all) | `pnpm turbo run test --filter='./apps/frontend/*'` | 8 apps parallel |

Pre-commit checklist (dev-agent перед PR):
```bash
pnpm typecheck && pnpm test -- --run && cargo test --workspace && bash scripts/verify_m0X_xxx.sh
```

## Troubleshooting

### `dfx start` fails: "port already in use"
Другая реплика держит порт. Либо `dfx_stop` в нужном AGENT_NAME, либо явно:
```bash
lsof -iTCP -sTCP:LISTEN -P | grep 4951      # найти процесс
kill -9 <pid>
```

### `dfx deploy` fails: stale state after upgrade
Полная перезагрузка:
```bash
dfx_stop
rm -rf .dfx/
dfx_start                                    # replica с чистым state
dfx_deploy
```

### `cargo build` fails: workspace conflict
Если видишь `error: current package believes it's in a workspace when it's not` — это значит где-то остался легаси `Cargo.toml` с собственным `[workspace]` (было при миграции со старой `canisters/` структуры). Проверь:
```bash
find . -name Cargo.toml -not -path './target/*' -not -path '*/node_modules/*' -exec grep -l '^\[workspace\]' {} \;
```
Должен быть ровно один — `./Cargo.toml`.

### `pnpm install` hangs on submodule init
`products/04-security/guard` — git submodule. Если репо `github.com/a3ka/guard` приватный и нет доступа:
```bash
git config --global url."git@github.com:".insteadOf "https://github.com/"
pnpm install
```

### Vercel deploy fails at first time
Первый deploy падает когда `apps/frontend/<app>/` ещё не скаффолжен (M01b не пройден). Это ожидается — Vercel project создаётся заранее, код приезжает позже. См. `docs/deployment-vercel.md`.

### `cargo test` on `canister-shared` fails `expect`-on-panic test
`ic-stable-structures` Storable impl для AgentId/TxHash использует `.expect()` в `from_bytes` — это by design: bytes приходят из нашей собственной сериализации, и panic = immediate bug surface. Если тест падает на `expect` — значит что-то пишет не-UTF8 в stable memory, и это реальная проблема, а не артефакт теста.

## Links

- `CLAUDE.md` — master rules + проект layout
- `docs/secrets.md` — env-переменные и их owners
- `docs/deployment-hetzner.md` — backend production
- `docs/deployment-vercel.md` — frontend production
- `docs/release-process.md` — release/semver policy
- `docs/sprints/` — активные milestones
