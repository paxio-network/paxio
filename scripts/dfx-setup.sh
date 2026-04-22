#!/usr/bin/env bash
# Paxio — per-agent dfx replica helper.
#
# Ported from bitgent/scripts/dfx-env.sh with Paxio agent naming.
# See docs/paxio-dev-environment.md for full flow.
#
# Each dev agent gets its own dfx replica on a unique port so parallel
# worktree work doesn't conflict:
#
#   architect:    4943  (default)
#   registry-dev: 4950
#   icp-dev:      4951
#   backend-dev:  4952
#   frontend-dev: 4953
#   test-runner:  4954
#   reviewer:     4955
#
# Usage (in acceptance scripts OR interactive shell):
#   source scripts/dfx-setup.sh
#   dfx_start        # boots replica on agent's port
#   dfx_deploy       # builds + deploys canisters registered in dfx.json
#   dfx_stop         # stops replica
#
# Override explicitly:
#   AGENT_NAME=icp-dev source scripts/dfx-setup.sh

set -euo pipefail
PATH="$HOME/.local/share/dfx/bin:$PATH"

case "${AGENT_NAME:-architect}" in
  architect)    DFX_PORT=4943 ;;
  registry-dev) DFX_PORT=4950 ;;
  icp-dev)      DFX_PORT=4951 ;;
  backend-dev)  DFX_PORT=4952 ;;
  frontend-dev) DFX_PORT=4953 ;;
  test-runner)  DFX_PORT=4954 ;;
  reviewer)     DFX_PORT=4955 ;;
  *)            DFX_PORT="${DFX_PORT:-4943}" ;;
esac

export DFX_PORT
export DFX_NETWORK="local"

dfx_start() {
  echo "=== Starting dfx replica on 127.0.0.1:${DFX_PORT} (AGENT_NAME=${AGENT_NAME:-architect}) ==="
  dfx stop 2>/dev/null || true
  dfx start --background --host "127.0.0.1:${DFX_PORT}" --clean >/dev/null 2>&1
  sleep 2
  echo "dfx replica UP on 127.0.0.1:${DFX_PORT}"
}

dfx_deploy() {
  echo "=== Building + deploying canisters ==="
  dfx build 2>&1 | tail -5
  echo "yes" | dfx deploy 2>&1 | tail -10
  echo "Canisters deployed on port ${DFX_PORT}"
}

dfx_stop() {
  echo "=== Stopping dfx replica ==="
  dfx stop 2>/dev/null || true
  echo "dfx stopped"
}

export -f dfx_start dfx_deploy dfx_stop
