// Address derivation helpers (FA-03 §1).
//
// MVP scope:
// - `derive_btc_address_from_pubkey` — produces a bech32-charset string starting
//   with `bc1` from the threshold-ECDSA-derived public key. For production we
//   will use `rust-bitcoin::Address::p2wpkh(&pubkey, Network::Bitcoin)` once the
//   canister talks to real `ecdsa_public_key`. For M02 we synthesize an address
//   that satisfies the bech32 mainnet shape (`^bc1[a-z0-9]{39,59}$`) so that
//   downstream parsers (and the contract regex in `packages/types/src/wallet.ts`)
//   accept it.
//
// - `derive_evm_address_from_pubkey` — last 20 bytes of keccak256(pubkey[1..])
//   formatted as `0x` + 40 hex chars (EIP-55 lowercase form for MVP).
//
// - `is_valid_btc_address` / `is_valid_evm_address` — input validators used by
//   `sign_transaction` to reject malformed `to` fields before any cycles are
//   spent on threshold ECDSA.

use sha2::{Digest, Sha256};

/// bech32 charset (BIP-173): 32 lowercase digits/letters, excludes `1bio`.
const BECH32_CHARSET: &[u8] = b"qpzry9x8gf2tvdw0s3jn54khce6mua7l";

/// MVP BTC address: `bc1` + 39 bech32 charset chars derived from pubkey hash.
///
/// Total length = 42 (matches the canonical P2WPKH `bc1q...` length).
/// Deterministic: same pubkey → same address.
pub fn derive_btc_address_from_pubkey(pubkey: &[u8]) -> String {
    // Two-round SHA-256 to spread bits like Bitcoin's HASH256, then map each
    // resulting byte (mod 32) to the bech32 charset. We need 39 chars — one
    // SHA-256 output gives 32 bytes, so do a second pass for the rest.
    let first = Sha256::digest(pubkey);
    let second = Sha256::digest(first);

    let mut chars = String::with_capacity(42);
    chars.push_str("bc1");

    let mut emitted = 0usize;
    let pools: [&[u8]; 2] = [first.as_slice(), second.as_slice()];
    'outer: for pool in pools {
        for byte in pool {
            chars.push(BECH32_CHARSET[(*byte as usize) & 0x1F] as char);
            emitted += 1;
            if emitted == 39 {
                break 'outer;
            }
        }
    }

    debug_assert_eq!(chars.len(), 42, "bech32 address must be 42 chars");
    chars
}

/// MVP EVM address: keccak256-style hash of pubkey, last 20 bytes hex.
///
/// We approximate keccak256 with double SHA-256 for the M02 mock. The resulting
/// string is `0x` + 40 lowercase hex chars and passes the `^0x[a-fA-F0-9]{40}$`
/// check enforced by `packages/types/src/wallet.ts`. Real keccak lands when we
/// integrate with `ethers-rs` in M59.
pub fn derive_evm_address_from_pubkey(pubkey: &[u8]) -> String {
    // Drop the leading 0x02/0x03 byte of a compressed key for parity with
    // standard EVM derivation which hashes the *uncompressed* pubkey body.
    let body: &[u8] = if pubkey.len() == 33 {
        &pubkey[1..]
    } else {
        pubkey
    };

    let first = Sha256::digest(body);
    let second = Sha256::digest(first);
    let last20 = &second[12..32];

    let mut out = String::with_capacity(42);
    out.push_str("0x");
    for byte in last20 {
        out.push_str(&format!("{:02x}", byte));
    }
    debug_assert_eq!(out.len(), 42);
    out
}

/// Cheap structural validator for bech32 mainnet BTC addresses.
///
/// Mirrors `BTC_ADDR_REGEX = /^bc1[a-z0-9]{39,59}$/` from
/// `packages/types/src/wallet.ts`. We do NOT check the bech32 checksum here —
/// invalid checksums fail later when `rust-bitcoin` parses the address.
pub fn is_valid_btc_address(addr: &str) -> bool {
    if !addr.starts_with("bc1") {
        return false;
    }
    let tail = &addr[3..];
    let len = tail.len();
    if !(39..=59).contains(&len) {
        return false;
    }
    tail.bytes()
        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit())
}

/// Structural validator for EVM addresses: `0x` + 40 hex chars.
pub fn is_valid_evm_address(addr: &str) -> bool {
    if !addr.starts_with("0x") || addr.len() != 42 {
        return false;
    }
    addr[2..].bytes().all(|b| b.is_ascii_hexdigit())
}

/// Structural DID validator. We accept anything matching `did:<method>:<rest>`
/// where method and rest are non-empty. Stricter validation lives in FA-01.
pub fn is_valid_did(did: &str) -> bool {
    let mut parts = did.split(':');
    let prefix = parts.next();
    let method = parts.next();
    let rest = parts.next();
    matches!(prefix, Some("did"))
        && method.map(|m| !m.is_empty()).unwrap_or(false)
        && rest.map(|r| !r.is_empty()).unwrap_or(false)
}
