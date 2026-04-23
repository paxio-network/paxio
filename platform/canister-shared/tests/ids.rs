//! RED tests for canister-shared ids (M00c).
//!
//! Проверяем wire-совместимость Candid, Storable round-trip, bounded storage.
//! Должны быть GREEN после impl в src/ids.rs.

use candid::{Decode, Encode};
use canister_shared::{AgentId, TxHash, VERSION};
use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;

#[test]
fn agent_id_candid_encoding_is_bare_text() {
    // Tuple-struct AgentId(String) должен сериализоваться как bare `text` в Candid
    // wire format — иначе .did файлы с `type AgentId = text` будут несовместимы.
    let id = AgentId("did:paxio:agent-1".to_string());
    let encoded: Vec<u8> = Encode!(&id).expect("encode AgentId");
    let decoded_as_string: String = Decode!(&encoded, String).expect("decode as String");
    assert_eq!(decoded_as_string, "did:paxio:agent-1");
}

#[test]
fn agent_id_storable_roundtrip() {
    let id = AgentId("did:paxio:xyz-42".to_string());
    let bytes = id.to_bytes();
    let back = AgentId::from_bytes(bytes);
    assert_eq!(id, back);
}

#[test]
fn agent_id_bound_is_bounded_non_fixed() {
    match AgentId::BOUND {
        Bound::Bounded { max_size, is_fixed_size } => {
            assert_eq!(max_size, 512);
            assert!(!is_fixed_size, "AgentId length varies — must NOT be fixed_size");
        }
        _ => panic!("AgentId must be Bounded for StableBTreeMap use"),
    }
}

#[test]
fn tx_hash_candid_encoding_is_bare_text() {
    let h = TxHash("0xdeadbeef".to_string());
    let encoded: Vec<u8> = Encode!(&h).expect("encode TxHash");
    let decoded_as_string: String = Decode!(&encoded, String).expect("decode as String");
    assert_eq!(decoded_as_string, "0xdeadbeef");
}

#[test]
fn tx_hash_storable_roundtrip() {
    let h = TxHash("0xabc123".to_string());
    let bytes = h.to_bytes();
    let back = TxHash::from_bytes(bytes);
    assert_eq!(h, back);
}

#[test]
fn tx_hash_bound_is_bounded_max_128() {
    match TxHash::BOUND {
        Bound::Bounded { max_size, is_fixed_size } => {
            assert_eq!(max_size, 128);
            assert!(!is_fixed_size);
        }
        _ => panic!("TxHash must be Bounded"),
    }
}

#[test]
fn from_str_and_string_conversions() {
    // &str и String оба должны конвертироваться в newtype без боли
    let a1: AgentId = "did:paxio:a".into();
    let a2: AgentId = String::from("did:paxio:a").into();
    assert_eq!(a1, a2);

    let t1: TxHash = "0xabc".into();
    let t2: TxHash = String::from("0xabc").into();
    assert_eq!(t1, t2);
}

#[test]
fn as_str_returns_inner() {
    assert_eq!(AgentId("did:paxio:a".to_string()).as_str(), "did:paxio:a");
    assert_eq!(TxHash("0xabc".to_string()).as_str(), "0xabc");
}

#[test]
fn version_matches_cargo_manifest() {
    assert_eq!(VERSION, env!("CARGO_PKG_VERSION"));
    assert!(!VERSION.is_empty());
}
