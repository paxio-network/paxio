---
name: icp-rust
description: ICP canister development in Rust. Use when writing or reviewing canister code, working with ic-cdk 0.13+, stable memory, HTTPS outcalls, or threshold ECDSA.
---

# ICP Rust Canister Development

## Canister structure

```rust
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpMethod,
};
use ic_stable_structures::{StableBTreeMap, DefaultMemoryImpl};
use candid::{CandidType, Deserialize};

// State — ONLY through thread_local + RefCell
thread_local! {
    static REGISTRY: RefCell<StableBTreeMap<AgentId, AgentProfile, Memory>> =
        RefCell::new(StableBTreeMap::init(get_memory()));
}

// Query (read-only, fast, free)
#[ic_cdk::query]
pub fn get_agent(id: AgentId) -> Option<AgentProfile> {
    REGISTRY.with(|r| r.borrow().get(&id))
}

// Update (modifies state, costs cycles)
#[ic_cdk::update]
pub fn register_agent(profile: AgentProfile) -> Result<AgentId, String> {
    validate_profile(&profile)?;
    let id = generate_id(&profile.endpoint);
    REGISTRY.with(|r| r.borrow_mut().insert(id.clone(), profile));
    Ok(id)
}
```

## ICP SDK versions (Paxio uses)
- ic-cdk: 0.13+
- ic-stable-structures: 0.13+
- candid: 0.10+

## HTTPS Outcall (for Chain Fusion, BTC price feeds)

```rust
#[ic_cdk::update]
async fn fetch_btc_price() -> Result<u64, String> {
    let request = CanisterHttpRequestArgument {
        url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd".to_string(),
        method: HttpMethod::GET,
        headers: vec![],
        body: None,
        max_response_bytes: Some(1_000),
        transform: None,
    };

    let (response,) = http_request(request, 5_000_000_000)
        .await
        .map_err(|(code, msg)| format!("HTTPS outcall failed: {:?} {}", code, msg))?;

    let price: serde_json::Value = serde_json::from_slice(&response.body)
        .map_err(|e| format!("Parse error: {}", e))?;
    Ok(price["bitcoin"]["usd"].as_u64().unwrap_or(0))
}
```

## Threshold ECDSA (non-custodial BTC)

```rust
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaPublicKeyArgument, SignWithEcdsaArgument,
};

// Get Bitcoin address for agent (deterministic from principal)
async fn get_bitcoin_address(agent_principal: Principal) -> String {
    let key_name = "dfx_test_key".to_string();  // "key_1" on mainnet
    let derivation_path = vec![agent_principal.as_slice().to_vec()];

    let (public_key_result,) = ecdsa_public_key(EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path,
        key_id: EcdsaKeyId { curve: EcdsaCurve::Secp256k1, name: key_name },
    }).await.unwrap();

    bitcoin_address_from_public_key(&public_key_result.public_key)
}
```

## Common mistakes (gotchas)

- `unwrap()` in canister → panic → canister trap. Always use `?` or `match`
- Don't use `std::time::SystemTime` — not in WASM. Use `ic_cdk::api::time()`
- `async` functions in canisters require `#[ic_cdk::update]` or `#[ic_cdk::query(composite = true)]`
- StableBTreeMap has no Iterator in old versions — use range() or iter()
- dfx deploy creates canister ID — save in dfx.json for cross-canister calls
- Use `ic-cdk::print` or `ic_cdk::println` for debug — not `eprintln`

## DFX environment per agent (Paxio pattern)

Each agent runs its own dfx replica on dedicated port:
- architect: 4943
- registry-dev: 4950
- facilitator-dev: 4951
- security-dev: 4952

```bash
# ~/.bashrc per agent
export DFX_CONFIG_ROOT="$HOME/.dfx/registry-dev"
dfx start --port 4950 --clean  # registry-dev
```
