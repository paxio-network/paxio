// DID generation — deterministic from (endpoint + developer + network).
//
// Format: did:paxio:<network>:0x<first-20-bytes-of-sha256-hex>
//
// Pure function. No I/O. No side-effects.
// See FA-01 §7 and docs/sprints/M01-registry-ts-core.md.

import { createHash } from 'node:crypto';
import type { Did } from '@paxio/types';

export interface GenerateDidInput {
  readonly endpoint: string;
  readonly developer: string;
  readonly network: string;
}

const NETWORK_RE = /^[a-z0-9]+$/;

/**
 * Generate a deterministic Paxio DID from endpoint + developer + network.
 *
 * Same inputs → same DID (bit-for-bit deterministic).
 *
 * Throws (rather than returning Result) on empty endpoint, empty developer,
 * or invalid network. Rationale: these are PRECONDITION violations
 * (programming errors / contract breaks at the call site), not expected
 * domain error paths. Callers in api/ MUST validate input before invoking
 * this function — a thrown error here indicates a bug upstream, not a
 * recoverable runtime condition. See engineering-principles.md §22
 * (Contract programming) and §6 (precondition vs domain error).
 */
export const generateDid = (input: GenerateDidInput): Did => {
  const endpoint = input.endpoint.trim();
  const developer = input.developer.trim();
  const network = input.network.trim().toLowerCase();

  if (endpoint.length === 0) {
    throw new Error('generateDid: endpoint must not be empty');
  }
  if (developer.length === 0) {
    throw new Error('generateDid: developer must not be empty');
  }
  if (!NETWORK_RE.test(network)) {
    throw new Error(
      `generateDid: network "${network}" must match [a-z0-9]+`,
    );
  }

  // Canonical payload — endpoint and developer joined with a delimiter that
  // cannot appear inside either value after trim. Include network so the
  // same (endpoint, developer) on different networks yields different DIDs.
  const payload = `${network}\n${endpoint}\n${developer}`;
  const digest = createHash('sha256').update(payload, 'utf8').digest('hex');
  // Take 40 hex chars (160 bits) — enough for uniqueness, matches 0x-eth-style.
  const id = `0x${digest.slice(0, 40)}`;
  return `did:paxio:${network}:${id}`;
};
