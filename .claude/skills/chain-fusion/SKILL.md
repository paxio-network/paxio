---
name: chain-fusion
description: ICP Chain Fusion for cross-chain EVM RPC calls and on-chain verification. Use when implementing cross-chain payment verification, EVM RPC calls from ICP canisters, or Base/ETH integration.
---

# ICP Chain Fusion — Cross-Chain Integration

## What is Chain Fusion
ICP Chain Fusion enables canisters to directly call EVM smart contracts on Ethereum, Base,
and other EVM chains without external oracles or bridges. This is critical for Paxio's
payment verification — we verify USDC transfers on Base directly from the canister.

## EVM RPC Canister

```rust
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpMethod,
};

// Call EVM RPC to verify a transaction on Base
async fn verify_base_transaction(tx_hash: &str) -> Result<TransactionReceipt, String> {
    let rpc_url = "https://mainnet.base.org";
    let body = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_getTransactionReceipt",
        "params": [tx_hash],
        "id": 1
    });

    let request = CanisterHttpRequestArgument {
        url: rpc_url.to_string(),
        method: HttpMethod::POST,
        headers: vec![HttpHeader {
            name: "Content-Type".to_string(),
            value: "application/json".to_string(),
        }],
        body: Some(serde_json::to_vec(&body).map_err(|e| e.to_string())?),
        max_response_bytes: Some(10_000),
        transform: None,
    };

    let (response,) = http_request(request, 10_000_000_000)
        .await
        .map_err(|(code, msg)| format!("EVM RPC failed: {:?} {}", code, msg))?;

    parse_transaction_receipt(&response.body)
}
```

## Supported chains
- **Base** (primary): USDC payments, lowest fees
- **Ethereum mainnet**: high-value transactions
- **Arbitrum/Optimism**: future expansion

## Key patterns

### On-chain verification without oracles
```rust
// Verify USDC transfer amount and recipient directly on-chain
pub async fn verify_usdc_transfer(
    tx_hash: &str,
    expected_recipient: &str,
    expected_amount: u64,
) -> Result<bool, VerificationError> {
    let receipt = verify_base_transaction(tx_hash).await?;

    // Parse USDC Transfer event from logs
    let transfer = parse_erc20_transfer(&receipt.logs)?;

    Ok(transfer.to == expected_recipient && transfer.amount >= expected_amount)
}
```

### Cost considerations
- HTTPS Outcall (EVM RPC): ~$0.000049 per call
- Consensus cost for response: ~$0.000002
- Total verification cost: < $0.0001 per transaction
- Always use HTTPS Outcalls, never external oracle services

## Gotchas
- HTTPS Outcalls require `#[ic_cdk::update]` (not query)
- Response must be deterministic across replicas — use transform function
- max_response_bytes must be set to avoid excessive cycle costs
- Base RPC may rate-limit — implement retry with backoff
- Transaction finality on Base: ~2 seconds, but wait for receipt confirmation
