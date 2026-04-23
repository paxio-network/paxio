# Opensrc — Pinned External References

External code we **read** alongside our own — not consumed via package managers.
This directory holds full clones of the libraries / protocols / examples that
inform Paxio's design. Single source of truth: `sources.json`.

## Why a separate `opensrc/`?

1. **Read source, not just `import`.** When debugging Fastify routing or
   `ic-stable-structures` upgrade behaviour, we read their source. Local
   clone makes `grep` / `Read` instant — no `npm view` round-trips.
2. **Pinned for audit.** `sources.json` records which version we studied.
   When a dep bumps a major version, we re-read the diff before updating.
3. **Protocol specs not on npm/crates.io** (x402, A2A, ERC-8004, MCP, BIPs).
4. **Reference implementations** for hard areas — threshold ECDSA, Bitcoin
   integration on ICP, Chain Fusion, agent frameworks.
5. **Architect uses these for milestone planning** — when designing FA-03
   Wallet, architect reads `dfinity/examples/threshold-ecdsa-wallet/` to
   understand what canister APIs are realistic.

## Structure

```
opensrc/
├── repos/                        # full clones (gitignored — heavy)
│   └── github.com/<owner>/<repo>/
├── sources.json                  # ★ pinned versions + purpose (source of truth)
├── fetch.sh                      # one-shot clone/update script
├── settings.json                 # opensrc local settings
├── .gitignore                    # ignore repos/* (don't commit clones)
└── README.md
```

## Fetch — one command

```bash
# Full clone (~2-3 GB — full history of all repos)
bash opensrc/fetch.sh

# Faster: shallow clones (~500 MB)
bash opensrc/fetch.sh --depth=1

# Only ICP-related (Rust + examples)
bash opensrc/fetch.sh --category=icp

# Only TS frontend deps
bash opensrc/fetch.sh --category=ts

# Update existing clones (git pull)
bash opensrc/fetch.sh --update

# Including the huge dfinity/ic replica source (~2GB by itself)
bash opensrc/fetch.sh --category=icp-full
```

## What lives where (high level — see `sources.json` for full list)

### Rust packages we use directly (Cargo.toml workspace deps)

| Repo | Path | Used by |
|---|---|---|
| `dfinity/cdk-rs` | `repos/github.com/dfinity/cdk-rs` | All canisters (`#[update]`, `#[query]`, `ic_cdk::*`) |
| `dfinity/stable-structures` | `repos/github.com/dfinity/stable-structures` | StableBTreeMap, StableCell, VirtualMemory |
| `dfinity/candid` | `repos/github.com/dfinity/candid` | CandidType derive, .did wire format |
| `rust-bitcoin/rust-bitcoin` | `repos/github.com/rust-bitcoin/rust-bitcoin` | FA-05 Bitcoin Agent (address parsing, types) |

### TS packages we use directly (package.json deps)

| Repo | Used by |
|---|---|
| `fastify/fastify` | `apps/back/server/` HTTP layer |
| `fastify/fastify-websocket` | `apps/back/server/src/ws.cjs` |
| `fastify/fastify-rate-limit` | Rate-limiting public APIs |
| `fastify/fastify-helmet` | Security headers |
| `colinhacks/zod` | `packages/types/` — single source of truth for schemas |
| `pinojs/pino` | Logger injected as `console` in VM sandbox |
| `dfinity/agent-js` | `apps/back/server/infrastructure/icp.cjs` |
| `vercel/next.js` | 8 frontend apps |
| `facebook/react` | React 19 (used with RSC streaming) |
| `TanStack/query` | Real-data fetching invariant (frontend-rules.md) |
| `radix-ui/primitives` | Base of `@paxio/ui` (Dialog, Popover, Tabs, …) |
| `tailwindlabs/tailwindcss` | v4 styling (per-app accent via CSS vars) |
| `framer/motion` | Animations (page transitions, chart reveals) |
| `privy-io/privy-js` | Auth (per-app Privy project) |
| `recharts/recharts` | Dashboard charts in `@paxio/ui` |
| `modelcontextprotocol/typescript-sdk` | `products/03-wallet/mcp-server/` |

### Protocol specs (read for understanding, no `import`)

| Repo | Why |
|---|---|
| `coinbase/x402` | Primary FA-02 Facilitator route |
| `x402-rs/x402-rs` | Rust ref impl — adapt for canister flow |
| `a2aproject/A2A` | Google Agent-to-Agent — alt FA-02 route |
| `sudeepb02/awesome-erc8004` | ERC-8004 trust standard for FA-01 ingestion |
| `modelcontextprotocol/specification` | MCP spec → mcp.paxio.network |
| `bitcoin/bips` | BIP-340 Schnorr, BIP-341 Taproot for ckBTC |

### ICP examples — patterns we copy

| Repo | Reference for |
|---|---|
| `dfinity/examples` | Threshold ECDSA wallet, Bitcoin integration, HTTPS outcalls, Chain Fusion |
| `dfinity/ic` (heavy) | Replica internals, management canister API |
| `ldclabs/anda-cloud` | ICP-based agent framework — patterns for non-custodial wallet |
| `kristoferlund/ic-eliza-eth-wallet-agent` | Threshold ECDSA wallet pattern (FA-03) |

### Crypto

| Repo | Why |
|---|---|
| `jedisct1/libsodium` | Reference for chacha20/blake2/ed25519 (we don't link directly — read API) |
| `rust-bitcoin/rust-bitcoin` | Bitcoin protocol types (FA-05) |

## Update workflow

When you bump a package version in `Cargo.toml` / `package.json`:

```bash
# 1. Update local clone
cd opensrc/repos/github.com/dfinity/cdk-rs
git fetch --tags
git checkout 0.14.0    # new version

# 2. Read CHANGELOG / breaking changes
less CHANGELOG.md

# 3. Update sources.json
# Find the entry, bump "version" + add today's date in note

# 4. Architect reviews if breaking changes affect contracts
```

## Conventions

- **Never commit `repos/*` content** — `.gitignore` excludes it. Each developer
  fetches locally. CI doesn't need it (CI uses npm/crates registries).
- **Pinned references in `sources.json` are the source of truth** — they record
  what we studied, what version, why.
- **Add new dep here when:** you find yourself reading its source repeatedly,
  it's a protocol spec, or it's a reference impl we partially copy.
- **Don't add transitive deps** — only direct deps that we actively study.

## Related projects (for cross-comparison)

Same pattern in sibling projects:

- `/home/nous/bitgent/opensrc/` — bitgent's pinned deps (smaller, BTC focus)
- `/home/openclaw/PROJECT/` — sibling Fastify+VM project (no opensrc, smaller scope)
- `/home/openclaw/complior/` — earlier project (no opensrc, monolith)
