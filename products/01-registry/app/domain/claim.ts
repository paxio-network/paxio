// Claim flow — challenge/response with secp256k1 ECDSA signatures.
//
// The server hands the client a nonce; the client signs SHA-256(nonce) with
// its secp256k1 private key and submits (nonce, signature, publicKey).
// We verify here.
//
// Encoding accepted:
//   signature: hex (64-byte compact r||s, optional 0x prefix)
//   publicKey: hex (33-byte compressed 02/03||x or 65-byte uncompressed 04||x||y)

import { createHash } from 'node:crypto';
import * as secp256k1 from '@noble/secp256k1';

const HEX_RE = /^(0x)?[0-9a-fA-F]+$/;

const stripHexPrefix = (s: string): string =>
  s.startsWith('0x') || s.startsWith('0X') ? s.slice(2) : s;

const hexToBytes = (hex: string): Uint8Array | null => {
  if (!HEX_RE.test(hex)) return null;
  const stripped = stripHexPrefix(hex);
  if (stripped.length === 0 || stripped.length % 2 !== 0) return null;
  const out = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

/**
 * Verify that `signature` is a valid secp256k1 ECDSA signature of
 * SHA-256(nonce) by `publicKey`. Returns false on any decoding or
 * verification error — never throws.
 */
export const verifySignature = (params: {
  readonly nonce: string;
  readonly signature: string;
  readonly publicKey: string;
}): boolean => {
  const sigBytes = hexToBytes(params.signature);
  const pubBytes = hexToBytes(params.publicKey);
  if (!sigBytes || !pubBytes) return false;
  // Compact secp256k1 signatures are exactly 64 bytes (r||s).
  if (sigBytes.length !== 64) return false;
  // Compressed pubkey = 33 bytes, uncompressed = 65 bytes.
  if (pubBytes.length !== 33 && pubBytes.length !== 65) return false;

  const msgHash = createHash('sha256').update(params.nonce, 'utf8').digest();

  try {
    return secp256k1.verify(sigBytes, msgHash, pubBytes, {
      prehash: false,
      format: 'compact',
    });
  } catch {
    return false;
  }
};
