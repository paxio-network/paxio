import { z } from 'zod';

// ERC-8004 — Draft EVM standard for on-chain agent registries.
// See https://eips.ethereum.org/EIPS/eip-8004 (still draft as of 2026-04).
//
// The adapter crawls the registry contract's `AgentRegistered(address indexed
// agent, string name, string serviceEndpoint, bytes32 capabilityHash, uint256
// registeredAt)` event logs, decodes them, and yields one `Erc8004Record`
// per log. This schema describes the decoded shape — raw RPC log decoding
// is the adapter's job; the schema validates the projection.
//
// Why this shape:
// - `chainId` identifies L1 vs L2 (Base = 8453, Mainnet = 1, Optimism = 10)
// - `contractAddress` pins which registry contract emitted the event
//   (multiple registries may coexist — adapter may crawl a curated set)
// - `agentAddress` is the agent's EVM address; its lowercased hex form
//   becomes the `externalId` in the canonical AgentCard
// - `capabilityHash` is a keccak256 of the agent's off-chain capability
//   descriptor JSON. The adapter does NOT attempt to resolve it here —
//   that's a future enrichment pass.

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX_HASH_32 = /^0x[0-9a-fA-F]{64}$/;

export const ZodErc8004Record = z.object({
  // EIP-155 chain ID — non-negative integer.
  chainId: z.number().int().nonnegative(),

  // Registry contract address (hex, 20 bytes). Case preserved here;
  // the adapter lowercases before use.
  contractAddress: z.string().regex(HEX_ADDRESS, 'invalid EVM address'),

  // Agent's EVM address (hex, 20 bytes).
  agentAddress: z.string().regex(HEX_ADDRESS, 'invalid EVM address'),

  // Human-readable name from the registration event.
  name: z.string().min(1).max(200),

  // HTTPS endpoint (optional — some on-chain registries allow agents to
  // register without a public endpoint).
  serviceEndpoint: z.string().url().optional(),

  // keccak256 of the off-chain capability JSON. Stored raw; an enrichment
  // pass fetches the JSON and projects to Paxio's `Capability` enum.
  capabilityHash: z.string().regex(HEX_HASH_32, 'invalid keccak256 hash'),

  // Block number the event landed in (monotonic within a chain).
  blockNumber: z.number().int().nonnegative(),

  // Transaction hash of the registration. Lets us dedupe on re-crawl.
  transactionHash: z.string().regex(HEX_HASH_32, 'invalid tx hash'),

  // `uint256 registeredAt` from event — seconds since Unix epoch.
  registeredAt: z.number().int().nonnegative(),
});

export type Erc8004Record = z.infer<typeof ZodErc8004Record>;
