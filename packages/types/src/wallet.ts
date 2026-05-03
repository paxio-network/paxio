// Wallet canister contracts (FA-03).
// Mirrors Candid interface of products/03-wallet/canister. TS side uses these for
// @paxio/sdk + http-proxy + MCP server. Keep names in sync with the .did file.

import { z } from 'zod';
import { ZodDid } from './did';

// --- Asset enum ---

export const ASSETS = ['btc', 'eth', 'usdc'] as const;
export const ZodAsset = z.enum(ASSETS);
export type Asset = z.infer<typeof ZodAsset>;

// --- Addresses ---

// Bitcoin bech32 mainnet address. Testnet/regtest out of scope for M02.
const BTC_ADDR_REGEX = /^bc1[a-z0-9]{39,59}$/;
export const ZodBtcAddress = z
  .string()
  .regex(BTC_ADDR_REGEX, 'invalid BTC bech32 address');
export type BtcAddress = z.infer<typeof ZodBtcAddress>;

// EVM 0x-prefixed 20-byte hex.
const EVM_ADDR_REGEX = /^0x[a-fA-F0-9]{40}$/;
export const ZodEvmAddress = z
  .string()
  .regex(EVM_ADDR_REGEX, 'invalid EVM address');
export type EvmAddress = z.infer<typeof ZodEvmAddress>;

// --- Transaction intent (inputs to sign_transaction / verify_intent) ---

export const ZodTransactionIntent = z.object({
  from: ZodDid,
  to: z.string().min(1),            // BTC or EVM address (asset-dependent)
  asset: ZodAsset,
  amount: z.bigint().nonnegative(), // satoshis for BTC, wei for ETH, 6-decimal micro for USDC
  nonce: z.string().min(1),         // idempotency key (see engineering-principles §15)
  createdAt: z.string().datetime(),
});
export type TransactionIntent = z.infer<typeof ZodTransactionIntent>;

// --- Wallet responses ---

export const ZodBalanceResponse = z.object({
  btc: z.bigint().nonnegative(),     // satoshis
  eth: z.bigint().nonnegative(),     // wei
  usdc: z.bigint().nonnegative(),    // micro-USDC (6 decimals)
});
export type BalanceResponse = z.infer<typeof ZodBalanceResponse>;

export const ZodSignTransactionResponse = z.object({
  signature: z.string().min(1),      // hex-encoded ECDSA signature (64 bytes → 128 hex chars)
  publicKey: z.string().min(1),      // hex-encoded compressed pubkey (33 bytes → 66 hex chars)
});
export type SignTransactionResponse = z.infer<typeof ZodSignTransactionResponse>;

export const ZodTxRecord = z.object({
  txId: z.string().min(1),
  asset: ZodAsset,
  amount: z.bigint().nonnegative(),
  counterparty: z.string(),
  direction: z.enum(['in', 'out']),
  status: z.enum(['pending', 'confirmed', 'failed']),
  timestamp: z.string().datetime(),
});
export type TxRecord = z.infer<typeof ZodTxRecord>;
