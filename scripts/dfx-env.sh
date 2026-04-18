#!/bin/bash
# DFX Environment Helper — used by dev agents in worktrees
#
# Each dev agent gets its own dfx replica on a unique port:
#   architect:        4943
#   registry-dev:     4950
#   facilitator-dev:  4951
#   security-dev:     4952
#   wallet-dev:       4953
#   guard-dev:        4954
#
# Usage in acceptance scripts:
#   source scripts/dfx-env.sh
#   dfx_start        # starts replica on agent's port
#   dfx_deploy       # builds and deploys all canisters
#   dfx_stop         # stops replica
#
# Usage by dev agent directly:
#   source scripts/dfx-env.sh
#   dfx_start
#   bash scripts/verify_xxx.sh
#   dfx_stop

set -euo pipefail
PATH="$HOME/.local/share/dfx/bin:$PATH"

# Detect agent by AGENT_NAME env var, fallback to default port
case "${AGENT_NAME:-default}" in
    architect)        DFX_PORT=4943 ;;
    registry-dev)     DFX_PORT=4950 ;;
    facilitator-dev)  DFX_PORT=4951 ;;
    security-dev)     DFX_PORT=4952 ;;
    wallet-dev)       DFX_PORT=4953 ;;
    guard-dev)        DFX_PORT=4954 ;;
    icp-dev)          DFX_PORT=4950 ;;  # icp-dev maps to registry-dev port
    test-runner)      DFX_PORT=4953 ;;
    reviewer)         DFX_PORT=4954 ;;
    *)                DFX_PORT="${DFX_PORT:-4943}" ;;
esac

export DFX_PORT
export DFX_NETWORK="local"

dfx_start() {
    echo "=== Starting dfx replica on port ${DFX_PORT} ==="
    # Stop any existing replica on this port
    dfx stop 2>/dev/null || true
    dfx start --background --host "127.0.0.1:${DFX_PORT}" --clean >/dev/null 2>&1
    sleep 2  # wait for replica to initialize
    echo "DFX replica running on 127.0.0.1:${DFX_PORT}"
}

dfx_deploy() {
    echo "=== Building and deploying all canisters ==="
    cd canisters
    dfx build 2>&1 | tail -5
    echo "yes" | dfx deploy 2>&1 | tail -10
    cd ..
    echo "All canisters deployed on port ${DFX_PORT}"
}

dfx_configure() {
    echo "=== Configuring inter-canister IDs ==="
    local REGISTRY_ID=$(dfx canister id registry 2>/dev/null)
    local WALLET_ID=$(dfx canister id wallet 2>/dev/null)
    local SECURITY_ID=$(dfx canister id security_sidecar 2>/dev/null)
    local AUDIT_ID=$(dfx canister id audit_log 2>/dev/null)
    local REPUTATION_ID=$(dfx canister id reputation 2>/dev/null)
    local CALLER=$(dfx identity get-principal 2>/dev/null)

    dfx canister call wallet configure_canisters "(record {
        registry_canister_id = \"${REGISTRY_ID}\";
        security_canister_id = \"${SECURITY_ID}\";
        audit_log_canister_id = \"${AUDIT_ID}\";
        owner = \"${CALLER}\"
    })" 2>&1 | tail -3

    dfx canister call reputation configure "(record {
        registry_canister_id = \"${REGISTRY_ID}\";
    })" 2>&1 | tail -3

    echo "Canisters configured. Owner: ${CALLER}"
}

dfx_stop() {
    echo "=== Stopping dfx replica ==="
    dfx stop 2>/dev/null || true
    echo "DFX stopped"
}

# Export functions for use in sourced scripts
export -f dfx_start dfx_deploy dfx_configure dfx_stop
