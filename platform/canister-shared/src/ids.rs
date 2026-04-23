//! Identifier newtypes — shared across canisters для type-safety и wire-compat.
//!
//! CandidType derive на tuple-struct `AgentId(String)` сериализуется в Candid
//! как bare `text` — это матчится с `type AgentId = text;` в .did файлах.
//! То же для `TxHash`.

use candid::CandidType;
use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

// ───────────────────────────────────────────────────────────────────────────
// AgentId — universal agent identifier (DID string)
// ───────────────────────────────────────────────────────────────────────────

/// Unique agent identifier across Paxio (typically a DID string).
///
/// Wire-compatible with `type AgentId = text` in .did files.
/// Used by Wallet, Reputation, Audit Log, Bitcoin Agent canisters.
#[derive(
    CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash,
)]
pub struct AgentId(pub String);

impl AgentId {
    /// Maximum size in bytes for StableBTreeMap bounded storage.
    /// 512 bytes accommodates all realistic DID forms (did:paxio:*, did:key:*, etc.).
    pub const MAX_SIZE_BYTES: u32 = 512;

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl From<String> for AgentId {
    fn from(s: String) -> Self {
        Self(s)
    }
}

impl From<&str> for AgentId {
    fn from(s: &str) -> Self {
        Self(s.to_string())
    }
}

impl Storable for AgentId {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        // `expect` here is acceptable: bytes come from our own serialization,
        // which only writes valid UTF-8. A bug would be a deserialization of
        // foreign bytes — panic surfaces that immediately.
        Self(
            String::from_utf8(bytes.into_owned()).expect("AgentId: invalid UTF-8 in stable memory"),
        )
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: Self::MAX_SIZE_BYTES,
        is_fixed_size: false,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// TxHash — transaction hash across any chain (BTC, ETH, ICP)
// ───────────────────────────────────────────────────────────────────────────

/// Transaction hash (hex string).
///
/// Wire-compatible with `type TxHash = text` in .did files.
/// Used by Wallet, Audit Log, Bitcoin Agent canisters.
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, Hash)]
pub struct TxHash(pub String);

impl TxHash {
    /// Max 128 bytes covers all chains: BTC (64 hex = 32 bytes), ETH (66), ICP txid.
    pub const MAX_SIZE_BYTES: u32 = 128;

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl From<String> for TxHash {
    fn from(s: String) -> Self {
        Self(s)
    }
}

impl From<&str> for TxHash {
    fn from(s: &str) -> Self {
        Self(s.to_string())
    }
}

impl Storable for TxHash {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(String::from_utf8(bytes.into_owned()).expect("TxHash: invalid UTF-8 in stable memory"))
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: Self::MAX_SIZE_BYTES,
        is_fixed_size: false,
    };
}
