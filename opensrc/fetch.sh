#!/usr/bin/env bash
# opensrc/fetch.sh — clone all external repos listed in sources.json
# Idempotent: skips repos already cloned. Updates existing ones with `git pull`.
#
# Usage:
#   bash opensrc/fetch.sh                 # clone all
#   bash opensrc/fetch.sh --update        # git pull for existing
#   bash opensrc/fetch.sh --depth=1       # shallow clone (faster, less disk)
#   bash opensrc/fetch.sh --category=icp  # only icp_examples + rust_packages

set -euo pipefail

cd "$(dirname "$0")"

DEPTH=""
UPDATE=false
CATEGORY=""

for arg in "$@"; do
  case "$arg" in
    --depth=*)    DEPTH="--depth=${arg#*=}";;
    --update)     UPDATE=true;;
    --category=*) CATEGORY="${arg#*=}";;
    *) echo "Unknown arg: $arg"; exit 1;;
  esac
done

# repo_url, dest_path
clone_or_update() {
  local url="$1"
  local dest="$2"
  if [ -d "$dest/.git" ]; then
    if $UPDATE; then
      echo "  ↻ updating $dest"
      git -C "$dest" pull --ff-only --quiet || echo "    (skipped — diverged or detached)"
    else
      echo "  ✓ exists $dest"
    fi
  else
    echo "  ↓ cloning $url → $dest"
    mkdir -p "$(dirname "$dest")"
    git clone $DEPTH --quiet "$url" "$dest" || echo "    (failed — check URL or network)"
  fi
}

echo "=== Rust packages (ICP + Bitcoin) ==="
if [ -z "$CATEGORY" ] || [ "$CATEGORY" = "rust" ] || [ "$CATEGORY" = "icp" ]; then
  clone_or_update https://github.com/dfinity/cdk-rs.git              repos/github.com/dfinity/cdk-rs
  clone_or_update https://github.com/dfinity/stable-structures.git   repos/github.com/dfinity/stable-structures
  clone_or_update https://github.com/dfinity/candid.git              repos/github.com/dfinity/candid
  clone_or_update https://github.com/rust-bitcoin/rust-bitcoin.git   repos/github.com/rust-bitcoin/rust-bitcoin
fi

echo ""
echo "=== TS packages (backend + frontend) ==="
if [ -z "$CATEGORY" ] || [ "$CATEGORY" = "ts" ]; then
  clone_or_update https://github.com/fastify/fastify.git                          repos/github.com/fastify/fastify
  clone_or_update https://github.com/fastify/fastify-websocket.git                repos/github.com/fastify/fastify-websocket
  clone_or_update https://github.com/fastify/fastify-rate-limit.git               repos/github.com/fastify/fastify-rate-limit
  clone_or_update https://github.com/fastify/fastify-helmet.git                   repos/github.com/fastify/fastify-helmet
  clone_or_update https://github.com/colinhacks/zod.git                           repos/github.com/colinhacks/zod
  clone_or_update https://github.com/pinojs/pino.git                              repos/github.com/pinojs/pino
  clone_or_update https://github.com/dfinity/agent-js.git                         repos/github.com/dfinity/agent-js
  clone_or_update https://github.com/vercel/next.js.git                           repos/github.com/vercel/next.js
  clone_or_update https://github.com/facebook/react.git                           repos/github.com/facebook/react
  clone_or_update https://github.com/TanStack/query.git                           repos/github.com/TanStack/query
  clone_or_update https://github.com/radix-ui/primitives.git                      repos/github.com/radix-ui/primitives
  clone_or_update https://github.com/tailwindlabs/tailwindcss.git                 repos/github.com/tailwindlabs/tailwindcss
  clone_or_update https://github.com/framer/motion.git                            repos/github.com/framer/motion
  # Privy SDK source is private; we clone their public wagmi demo instead (reference integration)
  clone_or_update https://github.com/privy-io/wagmi-demo.git                      repos/github.com/privy-io/wagmi-demo
  clone_or_update https://github.com/recharts/recharts.git                        repos/github.com/recharts/recharts
  clone_or_update https://github.com/modelcontextprotocol/typescript-sdk.git      repos/github.com/modelcontextprotocol/typescript-sdk
fi

echo ""
echo "=== Protocol specs (read for understanding) ==="
if [ -z "$CATEGORY" ] || [ "$CATEGORY" = "protocols" ]; then
  clone_or_update https://github.com/coinbase/x402.git                            repos/github.com/coinbase/x402
  clone_or_update https://github.com/x402-rs/x402-rs.git                          repos/github.com/x402-rs/x402-rs
  clone_or_update https://github.com/a2aproject/A2A.git                           repos/github.com/a2aproject/A2A
  clone_or_update https://github.com/sudeepb02/awesome-erc8004.git                repos/github.com/sudeepb02/awesome-erc8004
  clone_or_update https://github.com/modelcontextprotocol/specification.git       repos/github.com/modelcontextprotocol/specification
  clone_or_update https://github.com/bitcoin/bips.git                             repos/github.com/bitcoin/bips
fi

echo ""
echo "=== ICP examples + agent frameworks ==="
if [ -z "$CATEGORY" ] || [ "$CATEGORY" = "icp" ]; then
  clone_or_update https://github.com/dfinity/examples.git                         repos/github.com/dfinity/examples
  clone_or_update https://github.com/ldclabs/anda-cloud.git                       repos/github.com/ldclabs/anda-cloud
  clone_or_update https://github.com/kristoferlund/ic-eliza-eth-wallet-agent.git  repos/github.com/kristoferlund/ic-eliza-eth-wallet-agent
  # dfinity/ic — huge (~2GB). Only fetch with --category=icp-full
  if [ "$CATEGORY" = "icp-full" ]; then
    clone_or_update https://github.com/dfinity/ic.git                             repos/github.com/dfinity/ic
  fi
fi

echo ""
echo "=== Crypto refs ==="
if [ -z "$CATEGORY" ] || [ "$CATEGORY" = "crypto" ]; then
  clone_or_update https://github.com/jedisct1/libsodium.git                       repos/github.com/jedisct1/libsodium
fi

echo ""
echo "Done. Update sources.json fetchedAt timestamps after fetch."
echo "Disk usage:  du -sh opensrc/repos/"
