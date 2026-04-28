# opensrc/INDEX — per-agent reference map

External upstream sources for research. **Live OUTSIDE project tree** at
`~/paxio-opensrc/repos/github.com/<org>/<repo>/` (symlinked via
`opensrc/repos`). This keeps Paxio dirs at ~211 (not 18,064).

**Когда нужно — Read конкретный файл напрямую.** Не делай `Glob` или `Grep`
по `opensrc/repos/**/*` — это walk по 53K файлов = context overflow.

## По агентам

### frontend-dev (apps/frontend/, packages/{ui,hooks,api-client,auth}/)

| Repo | Why | Path |
|---|---|---|
| `vercel/next.js` | Next.js 15 source/docs | `~/paxio-opensrc/repos/github.com/vercel/next.js/` |
| `facebook/react` | React 19 source | `~/paxio-opensrc/repos/github.com/facebook/react/` |
| `TanStack/query` | React Query (used in @paxio/api-client) | `~/paxio-opensrc/repos/github.com/TanStack/query/` |
| `radix-ui/primitives` | Radix primitives (base for @paxio/ui) | `~/paxio-opensrc/repos/github.com/radix-ui/primitives/` |
| `tailwindlabs/tailwindcss` | Tailwind 4 source | `~/paxio-opensrc/repos/github.com/tailwindlabs/tailwindcss/` |
| `framer/motion` | Framer Motion | `~/paxio-opensrc/repos/github.com/framer/motion/` |
| `recharts/recharts` | Charts | `~/paxio-opensrc/repos/github.com/recharts/recharts/` |
| `privy-io/wagmi-demo` | Privy + wagmi reference | `~/paxio-opensrc/repos/github.com/privy-io/wagmi-demo/` |

### backend-dev (apps/back/server/, products/*/app/, SDK/MCP)

| Repo | Why | Path |
|---|---|---|
| `fastify/fastify` | Fastify 5 source | `~/paxio-opensrc/repos/github.com/fastify/fastify/` |
| `fastify/fastify-helmet` | Security headers plugin | `~/paxio-opensrc/repos/github.com/fastify/fastify-helmet/` |
| `fastify/fastify-rate-limit` | Rate limiting plugin | `~/paxio-opensrc/repos/github.com/fastify/fastify-rate-limit/` |
| `pinojs/pino` | Logger | `~/paxio-opensrc/repos/github.com/pinojs/pino/` |
| `colinhacks/zod` | Zod (used in @paxio/types) | `~/paxio-opensrc/repos/github.com/colinhacks/zod/` |
| `modelcontextprotocol/specification` | MCP spec | `~/paxio-opensrc/repos/github.com/modelcontextprotocol/specification/` |
| `modelcontextprotocol/typescript-sdk` | MCP SDK | `~/paxio-opensrc/repos/github.com/modelcontextprotocol/typescript-sdk/` |
| `coinbase/x402` | x402 payment protocol | `~/paxio-opensrc/repos/github.com/coinbase/x402/` |
| `x402-rs/x402-rs` | x402 Rust impl | `~/paxio-opensrc/repos/github.com/x402-rs/x402-rs/` |

### registry-dev (FA-01: products/01-registry/)

| Repo | Why | Path |
|---|---|---|
| `a2aproject/A2A` | Agent2Agent protocol spec | `~/paxio-opensrc/repos/github.com/a2aproject/A2A/` |
| `sudeepb02/awesome-erc8004` | ERC-8004 reference list | `~/paxio-opensrc/repos/github.com/sudeepb02/awesome-erc8004/` |
| `colinhacks/zod` | Zod (Agent Card schemas) | (shared with backend-dev) |

### icp-dev (products/*/canister*/, platform/canister-shared/)

| Repo | Why | Path |
|---|---|---|
| `dfinity/cdk-rs` | ic-cdk Rust SDK | `~/paxio-opensrc/repos/github.com/dfinity/cdk-rs/` |
| `dfinity/agent-js` | ICP HTTP agent (TS) | `~/paxio-opensrc/repos/github.com/dfinity/agent-js/` |
| `dfinity/candid` | Candid IDL | `~/paxio-opensrc/repos/github.com/dfinity/candid/` |
| `bitcoin/bips` | Bitcoin BIPs (BIP32/BIP340/BIP86) | `~/paxio-opensrc/repos/github.com/bitcoin/bips/` |
| `rust-bitcoin/rust-bitcoin` | Rust Bitcoin lib | `~/paxio-opensrc/repos/github.com/rust-bitcoin/rust-bitcoin/` |
| `kristoferlund/ic-eliza-eth-wallet-agent` | ICP wallet agent example | `~/paxio-opensrc/repos/github.com/kristoferlund/ic-eliza-eth-wallet-agent/` |
| `ldclabs/anda-cloud` | ICP Anda framework | `~/paxio-opensrc/repos/github.com/ldclabs/anda-cloud/` |

### Security / crypto (architect when designing)

| Repo | Why | Path |
|---|---|---|
| `jedisct1/libsodium` | Crypto primitives reference | `~/paxio-opensrc/repos/github.com/jedisct1/libsodium/` |

## Use pattern

```bash
# ✅ Read конкретный файл
Read ~/paxio-opensrc/repos/github.com/fastify/fastify/lib/server.js

# ✅ Поиск в ОДНОМ репо (узкий scope)
grep -r "schemaCompiler" ~/paxio-opensrc/repos/github.com/fastify/fastify/lib/

# ❌ НЕ ДЕЛАЙ — walk по всем репам
grep -r "anything" /home/nous/paxio/opensrc/repos/

# ❌ НЕ ДЕЛАЙ — glob по всему
Glob "opensrc/repos/**/*.ts"
```

## Update repos

```bash
bash /home/nous/paxio/opensrc/fetch.sh --update    # git pull all
bash /home/nous/paxio/opensrc/fetch.sh             # clone missing
```

`fetch.sh` работает через симлинк, действует на `~/paxio-opensrc/repos/`.
