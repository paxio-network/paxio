// Wallet port (FA-03) — TS side (SDK, proxy, MCP consume this).
// Concrete implementation wraps ICP canister via @dfinity/agent in
// apps/back/server/infrastructure/icp.cjs.

import type {
  Result,
  Did,
  Asset,
  BtcAddress,
  EvmAddress,
  BalanceResponse,
  TransactionIntent,
  SignTransactionResponse,
  TxRecord,
} from '@paxio/types';

export interface WalletError {
  readonly code:
    | 'validation_error'
    | 'not_found'
    | 'insufficient_balance'
    | 'canister_error'
    | 'signing_failed';
  readonly message: string;
}

export interface Wallet {
  /** Derive the BTC bech32 address for the given agent DID (threshold ECDSA). */
  deriveBtcAddress(did: Did): Promise<Result<BtcAddress, WalletError>>;

  /** Derive the EVM 0x-address for the given agent DID. */
  deriveEvmAddress(did: Did): Promise<Result<EvmAddress, WalletError>>;

  /** Query current balance across assets. */
  getBalance(did: Did): Promise<Result<BalanceResponse, WalletError>>;

  /** Sign a transaction via threshold ECDSA. Security Sidecar MUST approve first. */
  signTransaction(
    intent: TransactionIntent,
  ): Promise<Result<SignTransactionResponse, WalletError>>;

  /** Paginated tx history for an agent. */
  getTxHistory(
    did: Did,
    asset: Asset,
    limit: number,
  ): Promise<Result<readonly TxRecord[], WalletError>>;
}
