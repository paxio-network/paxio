---
name: rust-canister
description: >
  Rust canister development for Paxio ICP integration.
  Use when building canisters in canisters/src/.
---

# Rust Canister Patterns

## Project structure

```
canisters/
├── Cargo.toml
└── src/
    ├── wallet/
    │   ├── lib.rs
    │   └── wallet.rs
    ├── audit_log/
    │   ├── lib.rs
    │   └── log.rs
    ├── reputation/
    │   ├── lib.rs
    │   └── engine.rs
    └── security_sidecar/
        ├── lib.rs
        └── intent.rs
```

## Cargo.toml

```toml
[package]
name = "wallet_canister"
version = "0.1.0"
edition = "2021"

[dependencies]
ic-cdk = "0.12"
ic-cdk-timers = "0.6"
serde = { version = "1.0", features = ["derive"] }
thiserror = "1.0"
```

## Basic canister

```rust
#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

#[ic_cdk::update]
fn set_greeting(greeting: String) {
    GreetStorage.with(|g| {
        let mut storage = g.borrow_mut();
        storage.greeting = greeting;
    })
}

thread_local! {
    static GreetStorage: RefCell<GreetStorage> = RefCell::default();
}

#[derive(Default)]
struct GreetStorage {
    greeting: String,
}
```

## Error handling with thiserror

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum WalletError {
    #[error("zero amount not allowed")]
    ZeroAmount,

    #[error("insufficient balance: got {got}, need {need}")]
    InsufficientBalance { got: u64, need: u64 },

    #[error("invalid BTC address: {0}")]
    InvalidAddress(String),

    #[error("transfer failed: {0}")]
    TransferFailed(String),
}

#[derive(Serialize, Deserialize)]
pub enum WalletResult {
    Ok(String),  // tx hash
    Err(WalletError),
}
```

## Input validation

```rust
#[update]
pub fn send_bitcoin(to: String, amount: u64) -> Result<String, WalletError> {
    // Validate inputs at boundary
    if amount == 0 {
        return Err(WalletError::ZeroAmount);
    }
    if !is_valid_btc_address(&to) {
        return Err(WalletError::InvalidAddress(to));
    }

    // Internal logic after validation
    do_transfer(to, amount)
}

fn is_valid_btc_address(addr: &str) -> bool {
    // Basic validation: starts with bc1 and has correct length
    addr.starts_with("bc1") && addr.len() >= 26 && addr.len() <= 62
}
```

## State management

```rust
use ic_cdk::storage;

#[derive(Default)]
struct CanisterState {
    balances: std::collections::HashMap<String, u64>,
    transactions: Vec<Transaction>,
}

#[query]
fn get_state() -> CanisterState {
    CanisterState::default() // Be careful — don't expose sensitive state
}

// For persistent state:
fn get_state() -> &'static mut CanisterState {
    storage::get_mut()
}
```

## Inter-canister call

```rust
use ic_cdk::api::call::*;

#[update]
async fn call_audit_log(action: String) -> Result<(), String> {
    let audit_canister: canister_id = "aaaaa-cccc.ddd".parse().unwrap();

    let (result,): (Result<(), String>,) = call(audit_canister, "log", (action,))
        .await
        .map_err(|e| format!("call failed: {:?}", e))?;

    result.map_err(|e| format!("audit log error: {}", e))
}
```

## Threshold ECDSA (wallet canister)

```rust
#[update]
pub async fn sign_message(message: Vec<u8>) -> Result<Vec<u8>, WalletError> {
    // Get the public key
    let public_key = ic_cdk::api::management_canister::ecdsa::ecdsa_public_key(
        ic_cdk::api::management_canister::ecdsa::EcdsaKeyIds::TestKeyOfSize256,
        None,
    ).await
    .map_err(|e| WalletError::CryptoError(format!("{:?}", e)))?;

    // Sign using threshold ECDSA
    let (signature,): (Vec<u8>,) = ic_cdk::api::management_canister::ecdsa::sign_with_ecdsa(
        ic_cdk::api::management_canister::ecdsa::SignWithEcdsaArgs {
            message_hash: sha256(&message),
            ..
        },
    ).await
    .map_err(|e| WalletError::CryptoError(format!("{:?}", e)))?;

    Ok(signature)
}
```

## Certified variables (for browser queries)

```rust
#[derive(Default)]
struct CertifiedData {
    data: Vec<u8>,
    certificate: Vec<u8>,
}

#[query]
fn get_certified_data() -> (Vec<u8>, Vec<u8>) {
    let state = CertifiedData::default();
    (state.data, state.certificate)
}

#[update]
fn update_data(new_data: Vec<u8>) {
    CertifiedData::with(|s| {
        s.data = new_data;
        // Recertify for browsers
    });
}
```

## No secrets in canister state

```rust
// BAD: API key in canister
struct CanisterState {
    api_key: String, // NEVER do this
}

// GOOD: Use management canister calls for secrets
// Or read from environment at init
#[init]
fn init() {
    // Read from environment, not hardcoded
}
```
