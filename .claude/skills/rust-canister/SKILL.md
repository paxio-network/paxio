---
name: rust-canister
description: Rust canister development for Paxio ICP integration. Use when building canisters in products/*/canister*/, platform/canister-shared/, designing stable storage, inter-canister calls, threshold ECDSA, or async patterns in CLI/proxy binaries (tokio::fs, Arc<RwLock>, lock duration).
---

# Rust Canister (Paxio)

> See also: `rust-error-handling`, `rust-build`, `rust-data-structures`, `icp-rust`, `icp-threshold-ecdsa`, `bitcoin-icp`, `chain-fusion`.

## Canister structure

```
products/<fa>/canister/
├── Cargo.toml
├── canister.did     # Candid interface
└── src/
    ├── lib.rs       # entry, public methods
    ├── domain/      # business logic, pure
    ├── storage/     # StableBTreeMap wrappers
    └── ecdsa/       # threshold ECDSA (if applicable)
```

## State — stable storage survives upgrades

```rust
use ic_stable_structures::{StableBTreeMap, memory_manager::*, DefaultMemoryImpl};

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static AGENTS: RefCell<StableBTreeMap<Principal, AgentRecord, _>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        ));
}
```

- One `MemoryId` per stable structure — never reuse
- `Storable` impl with `BOUND = Bounded { max_size, ... }` for stable BTree (test pins `max_size > 0`)
- Avoid in-memory `HashMap` for state that must survive upgrade

## Public method patterns

```rust
#[ic_cdk::query]
fn get_agent(did: String) -> Result<AgentRecord, RegistryError> {
    AGENTS.with(|m| m.borrow().get(&did).ok_or(RegistryError::NotFound))
}

#[ic_cdk::update]
fn register(input: RegisterInput) -> Result<Did, RegistryError> {
    let caller = ic_cdk::caller();      // identity from runtime, never argument
    domain::registry::register(caller, input)
}
```

- All public methods return `Result<T, ConcreteError>` — never panic, never `unwrap`
- `ic_cdk::caller()` for identity (see `paxio-backend-architecture::Multi-Tenancy`)
- Validate inputs at canister boundary; domain assumes clean inputs

## Inter-canister calls

```rust
use ic_cdk::call;

#[ic_cdk::update]
async fn cross_call(target: Principal, args: MyArgs) -> Result<MyResp, MyError> {
    let (resp,): (MyResp,) = call(target, "method_name", (args,))
        .await
        .map_err(|(code, msg)| MyError::CanisterCall { code: code as i32, msg })?;
    Ok(resp)
}
```

- Always `match` on `CallResult`, never `.unwrap()`
- Idempotency: if call may retry, design messages with `idempotency_key` field, track in state

## serde + Candid wire format

```rust
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]   // ← required for TS↔Rust interop
pub struct AgentRecord {
    pub agent_did: String,            // wire: agentDid
    pub registered_at: u64,           // wire: registeredAt
    pub capabilities: Vec<String>,
}
```

P1 invariant: `#[serde(rename_all = "camelCase")]` on every wire struct shared with TS.

## Init / pre/post upgrade

```rust
#[ic_cdk::init]
fn init() {
    // pre-conditions checked here — .expect() OK with rationale
    let cycles = ic_cdk::api::canister_balance();
    assert!(cycles > 1_000_000_000_000, "init cycles below threshold");
}

#[ic_cdk::pre_upgrade]
fn pre_upgrade() {
    // serialize non-stable state if any
}

#[ic_cdk::post_upgrade]
fn post_upgrade() {
    // restore non-stable state
}
```

`panic` in `init` / `pre_upgrade` is acceptable (system error, halts upgrade); in normal methods → propagate as `Result`.

## Async patterns (CLI / proxy binaries — NOT canisters)

Canisters use `ic_cdk` async; the rules below apply to off-chain Rust binaries (`products/*/cli/`, `products/*/http-proxy/`).

### `tokio::fs`, never `std::fs` in async

```rust
// ❌ blocks runtime thread
async fn load_config(path: &Path) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)?;
    Ok(toml::from_str(&content)?)
}

// ✅ non-blocking
use tokio::fs;
async fn load_config(path: &Path) -> Result<Config, ConfigError> {
    let content = fs::read_to_string(path).await?;
    Ok(toml::from_str(&content)?)
}
```

CPU-intensive work → `tokio::task::spawn_blocking()`.

### Lock guards never held across `.await` (P1)

```rust
// ❌ holds lock during external call — deadlock risk
async fn process(state: &Arc<RwLock<State>>, intent: Intent) -> Result<()> {
    let mut s = state.write().await;
    let validation = validate_remote(&intent).await?;  // ← lock held
    s.apply(validation);
    Ok(())
}

// ✅ snapshot → release → external work → re-acquire for short write
async fn process(state: &Arc<RwLock<State>>, intent: Intent) -> Result<()> {
    let snapshot = { let s = state.read().await; s.snapshot_for(&intent) };
    let validation = validate_remote(&snapshot, &intent).await?;
    { let mut s = state.write().await; s.apply(validation); }
    Ok(())
}
```

### Shared async state — `Arc<RwLock<T>>`, never `Rc<RefCell<T>>`

`Rc<RefCell>` is not `Send` → panics across thread boundaries. Use `Arc<RwLock>` (read-heavy) or `Arc<Mutex>` (otherwise). Use `tokio::sync::Mutex` (yields on contention), not `std::sync::Mutex`, in async paths.

### Concurrent operations — `tokio::join!` / `try_join!`

```rust
// ❌ sequential
for url in urls { results.push(fetch(url).await); }

// ✅ fixed N
let (a, b, c) = tokio::try_join!(fetch(&urls[0]), fetch(&urls[1]), fetch(&urls[2]))?;

// ✅ variable N with rate limit
use futures::stream::{self, StreamExt};
let results: Vec<_> = stream::iter(urls)
    .map(|url| fetch(url))
    .buffer_unordered(10)
    .collect()
    .await;
```

### Iterator chains — lazy, no intermediate collect

```rust
// ❌ extra alloc
let result: Vec<String> = items.iter().filter(|x| x.is_valid()).collect::<Vec<_>>().iter().map(|x| x.to_string()).collect();

// ✅ chained
let result: Vec<String> = items.iter().filter(|x| x.is_valid()).map(|x| x.to_string()).collect();

// ✅ filter_map for Option-returning
let result: Vec<String> = items.iter().filter_map(|x| x.is_valid().then(|| x.to_string())).collect();
```

### String types — `&str` < `String` < `Cow<'a, str>`

- `&str` for read-only parameters
- `String` for owned / stored
- `Cow<'_, str>` when may-be-modified (avoids alloc when not modified)
- ❌ `&String` parameter — useless, always `&str`
- ❌ `String` parameter when no ownership transfer needed → `&str`

### Newtype for domain types (P2)

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Satoshi(pub u64);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Did(pub String);

fn transfer(amount: Satoshi, from: Did, to: Did, fee: Satoshi) -> Result<TxId, _> {
    // compiler prevents swap of fee/amount or from/to
}
```

Use for: `Did`, `Satoshi`, `Nonce`, `BtcAddress`, `WalletId`, `IntentId`, `TxHash`. ICP `Principal` already serves as canister-side identity.

## Exhaustive match on enums (P1)

```rust
// ❌ catch-all hides new variant
match status { Status::Active => ..., _ => default }

// ✅ explicit per variant
match status {
    Status::Active => ...,
    Status::Pending => ...,
    Status::Closed => ...,
}
```

If new variant added later, compiler fails — find every site to update.

## Reviewer Phase 0 quick checklist

- [ ] Public methods return `Result<T, ConcreteError>` — no panic
- [ ] `ic_cdk::caller()` for identity, not argument
- [ ] `#[serde(rename_all = "camelCase")]` on wire structs
- [ ] `Storable` bound is `Bounded { max_size > 0 }` for stable BTree
- [ ] No `unwrap()` / `panic!` in production paths (`expect("invariant")` only with rationale)
- [ ] Async fn use `tokio::fs`, not `std::fs`
- [ ] No lock guard held across `.await` for external operations
- [ ] Shared state via `Arc<RwLock<T>>` / `Arc<Mutex<T>>`
- [ ] Iterator chains without intermediate `.collect()`
- [ ] Function arguments: `&str` for read-only, `String` for ownership transfer
- [ ] Domain types via newtype on API boundaries
- [ ] Exhaustive `match` on enums
