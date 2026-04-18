---
name: x402-protocol
description: x402 payment protocol for AI agents. Use when implementing payment verification, building facilitators, or handling x402 payment flows with USDC/BTC.
---

# x402 Protocol — Payment for AI Agents

## What is x402
HTTP-based payment protocol. Agent gets 402 → pays on-chain → retries request.
Linux Foundation standard (April 2026). Participants: Visa, Google, Stripe, Coinbase, etc.
Main repo: github.com/coinbase/x402

## Payment flow (4 steps)

```
1. GET /agent/service
   ← HTTP 402 + payment_required:
     { "accepts": [{ "scheme":"exact", "network":"base",
                     "asset":"USDC", "amount":"0.010",
                     "address":"0x742d..." }] }

2. Buyer pays on-chain → gets tx_hash

3. GET /agent/service
   Authorization: x402 <payment_proof_base64>
   (proof = { tx_hash, network, amount, timestamp })

4. ← 200 OK + result
```

## Paxio Meta-Facilitator (FA-02)
Coinbase Facilitator: free, USDC on Base only.
Paxio Facilitator: free for USDC, + Bitcoin L1, + cross-chain routing, + security checkpoint.
Don't compete on price — compete through value-add.

## Rust verification (via Chain Fusion)

```rust
use x402_rs::{PaymentProof, verify_payment_proof};

pub fn verify_x402_payment(
    proof: &PaymentProof,
    expected_amount: u64,
    expected_network: &str,
) -> Result<VerifiedPayment, X402Error> {
    // Verify on-chain via EVM RPC (Chain Fusion)
    verify_payment_proof(proof, expected_amount, expected_network)
}
```

## ICP Costs
- Normal USDC routing: ~$0.000055 compute cost
- Bitcoin threshold ECDSA: ~$0.026 per signature → minimum $0.03 fee from user
- HTTPS Outcall (verify): ~$0.000049
