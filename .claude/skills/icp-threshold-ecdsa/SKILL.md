---
name: icp-threshold-ecdsa
description: >
  ICP threshold ECDSA patterns for Paxio non-custodial wallet.
  Use when implementing BTC address derivation, UTXO ops, or transaction signing.
---

# ICP Threshold ECDSA

## Key principle: Keys NEVER in one place

Threshold ECDSA distributes signing across 13+ ICP nodes.
No single node has the full private key. This is the security foundation.

## Key derivation

```typescript
// engine/core/src/blockchain/icp.ts
import { ecdsaPublicKey, signWithEcdsa } from 'ic0';

export async function deriveBtcAddress(
  canisterId: string,
  derivationPath: Uint8Array[]
): Promise<string> {
  const { publicKey } = await ecdsaPublicKey({
    canisterId,
    derivationPath,
    keyId: { name: 'dfx_test_key', curve: { secp256k1: null } },
  });

  // Derive bc1... address from public key (Bitcoin Script)
  return bittools.publicKeyToBtcAddress(publicKey);
}
```

## Signing flow

```typescript
// NEVER sign on frontend — only through canister
export async function signTransaction(
  canisterId: string,
  tx: BitcoinTransaction
): Promise<string> {
  // 1. Build transaction
  const txHex = buildTransaction(tx);

  // 2. Send to wallet canister — threshold sign across ICP nodes
  const { signature } = await signWithEcdsa({
    canisterId,
    message: sha256(hexToBytes(txHex)),
    derivationPath: tx.derivationPath,
    keyId: { name: 'dfx_test_key', curve: { secp256k1: null } },
  });

  // 3. Combine signature + transaction for broadcast
  return combineSignature(txHex, signature);
}
```

## UTXO management

```typescript
// engine/core/src/blockchain/utxo.ts
export interface Utxo {
  txid: string;
  vout: number;
  value: number;
  script: string;
}

export async function getUtxos(btcAddress: string): Promise<Utxo[]> {
  // Call Bitcoin canister — icrc3_canister_call
  const { utxos } = await bitcoin.canister.get_utxos({ address: btcAddress });
  return utxos;
}

export async function selectUtxos(
  utxos: Utxo[],
  amount: bigint
): Promise<Utxo[]> {
  // Coin selection: prioritize newer, larger UTXOs
  const sorted = [...utxos].sort((a, b) => b.value - a.value);
  const selected: Utxo[] = [];
  let total = 0n;

  for (const utxo of sorted) {
    selected.push(utxo);
    total += BigInt(utxo.value);
    if (total >= amount) break;
  }

  return selected;
}
```

## Bitcoin address validation

```typescript
// engine/core/src/blockchain/btc.ts
export function isValidBtcAddress(addr: string): boolean {
  // Legacy (P2PKH): starts with 1
  if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr)) return true;
  // Native SegWit (P2WSH): starts with bc1
  if (/^bc1[ac-hj-np-zAC-HJ-NP-Z02-9]{11,71}$/.test(addr)) return true;
  // Nested SegWit (P2SH-P2WSH): starts with 3
  if (/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr)) return true;
  return false;
}
```

## Non-custodial withdrawal flow

```
User Request (web wallet)
    ↓ (HTTPS to Paxio API)
Backend (Fastify)
    ↓ (ICP canister call — signed by threshold ECDSA)
Wallet Canister (13+ nodes, each holds key share)
    ↓ (threshold ECDSA signature, no single node has full key)
Signed BTC Transaction
    ↓ (broadcast to Bitcoin network)
Bitcoin L1 (confirmed in ~10 min for mempool, 6 confirmations for finality)
```

## ckBTC mint/redeem

```typescript
// ckBTC — Chain-Key BTC, directly on ICP
// Mint: BTC locked on L1 → ckBTC minted on ICP
// Redeem: ckBTC burned on ICP → BTC released on L1

import { minter } from 'icp-wallet';

export async function mintCkBtc(
  proof: UtxoProof,  // Merkle proof of BTC deposit
  amount: bigint
): Promise<string> {
  // Verify BTC L1 transaction is confirmed
  const confirmed = await verifyMerkleProof(proof);
  if (!confirmed) throw new Error('Invalid proof');

  // Mint ckBTC on ICP
  const ckBtcAmount = await minter.mint(proof.depositAddress, amount);
  return ckBtcAmount;
}
```

## Security invariants

```typescript
// INVARIANT: Private key NEVER leaves ICP network
// INVARIANT: Each signing node only sees its key share
// INVARIANT: Threshold — need 10 of 13 signatures to sign

// FRONTEND MUST NEVER CALL signWithEcdsa DIRECTLY
// All signing goes through wallet canister
```
