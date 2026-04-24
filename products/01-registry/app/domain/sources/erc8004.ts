// ERC-8004 crawler adapter — STUB (FA-01, M-L1-impl).
//
// Real implementation requires:
//   1. EVM RPC client (Base L2 + Mainnet) via viem or ethers
//   2. Decoding of `AgentRegistered(address,string,string,bytes32,uint256)`
//      event logs from a curated set of registry contracts
//   3. Off-chain capability JSON resolution (separate enrichment pass)
//
// This stub provides the contract surface for `runCrawler` to call without
// breaking — it yields nothing and returns parse_error on toCanonical so
// downstream code can be wired and tested. Real impl tracked for next M-L1
// iteration.

import {
  ZodErc8004Record,
  type Erc8004Record,
  type AgentCard,
  type CrawlerSource,
  type Did,
  type Result,
  ok,
  err,
} from '@paxio/types';
import type {
  CrawlerSourceAdapter,
  SourceAdapterError,
} from '@paxio/interfaces';

const did = (chainId: number, agentAddress: string): Did =>
  `did:paxio:erc8004:${chainId}-${agentAddress.toLowerCase()}` as Did;

export const createErc8004Adapter = (): CrawlerSourceAdapter<Erc8004Record> => {
  const sourceName: CrawlerSource = 'erc8004';

  // Empty stream — no real crawler yet. Async generator with no yield is
  // a valid AsyncIterable that completes immediately.
  // eslint-disable-next-line require-yield
  async function* fetchAgents(): AsyncIterable<Erc8004Record> {
    return;
  }

  const toCanonical = (
    raw: Erc8004Record,
  ): Result<AgentCard, SourceAdapterError> => {
    const parsed = ZodErc8004Record.safeParse(raw);
    if (!parsed.success) {
      return err({
        code: 'parse_error',
        message: parsed.error.issues[0]?.message ?? 'invalid record',
        raw,
      });
    }
    const r = parsed.data;
    const card: AgentCard = {
      did: did(r.chainId, r.agentAddress),
      name: r.name,
      capability: 'INTELLIGENCE',
      ...(r.serviceEndpoint !== undefined
        ? { endpoint: r.serviceEndpoint }
        : {}),
      version: '0.0.1',
      createdAt: new Date(r.registeredAt * 1000).toISOString(),
      source: sourceName,
      externalId: r.agentAddress.toLowerCase(),
      sourceUrl: `https://basescan.org/address/${r.agentAddress}`,
    };
    return ok(card);
  };

  return Object.freeze({
    sourceName,
    fetchAgents,
    toCanonical,
  });
};
