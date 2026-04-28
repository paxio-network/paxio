---
description: Rust async — tokio::fs over std::fs, minimize lock duration across .await, Arc<RwLock<T>> for shared async state, newtype for domain types
globs: ["products/**/*.rs", "platform/**/*.rs"]
---

# Rust Async — Paxio canisters + Rust binaries

> Источник: ported from `/home/openclaw/complior/CODING-STANDARDS-RUST.md` §10 + §15.
> Применяется ко всем Rust async code: `products/*/canister*/`, `products/*/cli/`,
> `products/*/http-proxy/`, `platform/canister-shared/`.
>
> **ICP canister specific:** canister calls inherently async (cross-canister). Tokio
> runtime НЕ используется внутри canister'а — `ic_cdk` имеет свой `await`. Эти правила
> применяются для CLI / proxy / off-chain Rust binaries.

## R-Rust-Async-1: `tokio::fs` not `std::fs` в async context

**Severity: P1** — `std::fs` blocks runtime threads, kills concurrent throughput.

```rust
// ❌ blocks tokio runtime thread
async fn load_config(path: &Path) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)?;  // BLOCKS thread
    Ok(toml::from_str(&content)?)
}

// ✅ tokio::fs — non-blocking
use tokio::fs;
async fn load_config(path: &Path) -> Result<Config, ConfigError> {
    let content = fs::read_to_string(path).await?;  // yields if blocked
    Ok(toml::from_str(&content)?)
}
```

**Правило:**
- В любом `async fn` использовать `tokio::fs`, `tokio::process::Command`, `tokio::net`
- Sync `std::fs` / `std::process` — ТОЛЬКО в sync code (build scripts, CLI parsing
  before runtime starts)
- Канareечка: `tokio::task::spawn_blocking()` для CPU-intensive work чтобы не блокировать
  main runtime threads

**Common imports:**
```rust
use tokio::fs;                    // file I/O
use tokio::sync::{Mutex, RwLock, mpsc, oneshot, watch};  // sync primitives
use tokio::time::{sleep, timeout, interval};             // timers
use tokio::net::{TcpListener, TcpStream};                // network
```

## R-Rust-Async-2: Минимизировать lock duration через `.await` boundaries

**Severity: P1** — long-held lock blocks all readers/writers, causes deadlocks.

```rust
// ❌ holds lock across .await — другие tasks blocked
async fn process_intent(state: &Arc<RwLock<State>>, intent: Intent) -> Result<()> {
    let mut s = state.write().await;
    let validation = validate_remote(&intent).await?;  // ← AWAIT с зажатым lock
    s.apply(validation);
    Ok(())
}

// ✅ release lock перед .await, re-acquire после
async fn process_intent(state: &Arc<RwLock<State>>, intent: Intent) -> Result<()> {
    // Read minimum data with lock held
    let snapshot = {
        let s = state.read().await;
        s.snapshot_for(&intent)
    };  // lock released here
    
    // Long-running async work — no lock held
    let validation = validate_remote(&snapshot, &intent).await?;
    
    // Re-acquire lock for short write
    {
        let mut s = state.write().await;
        s.apply(validation);
    }
    Ok(())
}
```

**Правило:**
- Lock guard scope = ровно столько кода, сколько needs to read/write state
- НИКОГДА не держи lock across `.await` если operation external (network, disk)
- Используй `{ ... }` block to make scope explicit
- Для read-heavy workload: `RwLock` > `Mutex`

## R-Rust-Async-3: `Arc<RwLock<T>>` для shared async state, не `Rc<RefCell<T>>`

**Severity: P1** — `Rc` + `RefCell` not `Send`, panics across thread boundaries.

```rust
// ❌ Rc<RefCell<T>> — single-threaded only, не работает с tokio::spawn
let state = Rc::new(RefCell::new(State::default()));
tokio::spawn(async move {
    state.borrow_mut().mutate();  // PANIC если runtime multi-threaded
});

// ✅ Arc<RwLock<T>> для shared async state
let state = Arc::new(RwLock::new(State::default()));
tokio::spawn(async move {
    let mut s = state.write().await;
    s.mutate();
});

// ✅ Arc<Mutex<T>> когда нет read-heavy pattern
let counter = Arc::new(Mutex::new(0u64));
```

**Правило:**
- Multi-tasked / multi-threaded shared state → `Arc<RwLock<T>>` или `Arc<Mutex<T>>`
- Single-task ownership → `Box<T>` или просто owned `T`
- НИКОГДА `Rc<T>` в async runtime (compile error в Send context, panic в runtime)
- НИКОГДА `static mut` (UB, racy, replaced by `OnceCell` / `LazyLock` или `Arc<Mutex>`)

**Tokio-specific:**
- `tokio::sync::Mutex` (async) ≠ `std::sync::Mutex` (sync). Async version yields on contention.
- `parking_lot::Mutex` для tight CPU loops где await не нужен — faster than `std::sync::Mutex`.

## R-Rust-Async-4: `tokio::join!` / `try_join!` для concurrent operations

**Severity: P2** — sequential awaits = wasted concurrency.

```rust
// ❌ sequential — total time = sum of individual times
async fn fetch_all(urls: &[String]) -> Vec<Result<Body, Error>> {
    let mut results = Vec::new();
    for url in urls {
        results.push(fetch(url).await);
    }
    results
}

// ✅ concurrent — total time = max of individual times
async fn fetch_all(urls: &[String]) -> Result<(Body, Body, Body), Error> {
    let (a, b, c) = tokio::try_join!(
        fetch(&urls[0]),
        fetch(&urls[1]),
        fetch(&urls[2]),
    )?;
    Ok((a, b, c))
}

// ✅ concurrent with N items — futures::stream::buffered
use futures::stream::{self, StreamExt};
async fn fetch_all(urls: &[String]) -> Vec<Result<Body, Error>> {
    stream::iter(urls)
        .map(|url| fetch(url))
        .buffer_unordered(10)  // up to 10 concurrent
        .collect()
        .await
}
```

**Правило:**
- Independent async operations → `tokio::join!` / `try_join!` для fixed N
- Variable N → `futures::stream::buffer_unordered(MAX_CONCURRENT)` с rate limit
- Fail-fast (abort other tasks on first error) → `try_join!`
- Collect-all (run all to completion regardless) → `tokio::join!` или `JoinSet`

## R-Rust-Async-5: Iterator chains lazy, no intermediate `.collect()`

**Severity: P2** — extra allocations, slower.

```rust
// ❌ intermediate collect — allocates Vec<u32>, then iterates again
let result: Vec<String> = items
    .iter()
    .filter(|x| x.is_valid())
    .collect::<Vec<_>>()  // allocates
    .iter()
    .map(|x| x.to_string())
    .collect();

// ✅ chained, lazy — single pass, single allocation
let result: Vec<String> = items
    .iter()
    .filter(|x| x.is_valid())
    .map(|x| x.to_string())
    .collect();

// ✅ filter_map — combine filter + map
let result: Vec<String> = items
    .iter()
    .filter_map(|x| x.is_valid().then(|| x.to_string()))
    .collect();
```

**Правило:**
- Chain `.iter().filter().map().collect()` без intermediate `.collect()`
- `.filter_map()` для Option-returning transformations
- `.fold()` / `.reduce()` для aggregations (without intermediate Vec)
- В async context: `.into_stream().filter().map().collect::<Vec<_>>().await`

## R-Rust-Async-6: String types — `&str` < `String` < `Cow<'a, str>`

**Severity: P2** — choosing wrong type wastes allocations.

```rust
// ✅ &str для read-only access
fn parse_did(did: &str) -> Result<Did, ParseError> {
    if !did.starts_with("did:paxio:") {
        return Err(ParseError::InvalidPrefix);
    }
    Ok(Did(did.to_string()))  // own only at boundary
}

// ✅ String для owned/stored strings
struct Agent {
    did: String,           // owned, lives for Agent's lifetime
    name: String,
}

// ✅ Cow<'a, str> когда «may-be-modified» — avoids alloc если no modification
fn normalize_name(name: &str) -> Cow<'_, str> {
    if name.contains(' ') {
        Cow::Owned(name.replace(' ', "_"))  // alloc only if needed
    } else {
        Cow::Borrowed(name)  // no alloc — passes through
    }
}

// ❌ String аргумент когда не нужен ownership — forces caller to clone
fn parse_did(did: String) -> Result<Did, ParseError> { /* WRONG */ }

// ❌ &String — useless, всегда use &str
fn parse_did(did: &String) -> Result<Did, ParseError> { /* WRONG */ }
```

**Decision tree:**
- Function accepts string for read-only → `&str`
- Function accepts string and stores it → `impl Into<String>` или `String`
- Function returns string that MAY be borrowed → `Cow<'_, str>`
- Struct field stored → `String` (owned, simple lifetime)

## R-Rust-Async-7: Newtype для domain types (DID, Satoshi, Nonce)

**Severity: P2** — type safety на boundaries, prevents argument confusion.

```rust
// ❌ primitive obsession — easy to swap arguments
fn transfer(amount: u64, from: String, to: String, fee: u64) -> Result<TxId, _> {
    // caller may swap from/to or amount/fee — compiles but wrong
}

// ✅ newtype — compiler catches misuse
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Satoshi(pub u64);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Did(pub String);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TxId(pub [u8; 32]);

fn transfer(amount: Satoshi, from: Did, to: Did, fee: Satoshi) -> Result<TxId, _> {
    // compiler ensures Satoshi can't be passed as Did, fee can't be swapped с amount
}

// ✅ implement common conversions
impl From<u64> for Satoshi {
    fn from(n: u64) -> Self { Satoshi(n) }
}

impl Display for Did {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
```

**Применять в Paxio:**
- `Did` (`struct Did(String)`)
- `Satoshi` (`struct Satoshi(u64)`)
- `Nonce` (`struct Nonce(u64)`)
- `BtcAddress` (`struct BtcAddress(String)`)
- `IcpPrincipal` (already provided by `ic_cdk::Principal`)
- `WalletId`, `IntentId`, `TxHash` etc.

## Quick checklist (для reviewer Phase 0)

- [ ] Все async fn используют `tokio::fs`, не `std::fs`
- [ ] Lock guards не зажаты across `.await` для external operations
- [ ] Shared async state через `Arc<RwLock<T>>` / `Arc<Mutex<T>>`, не `Rc<RefCell<T>>`
- [ ] Independent operations через `tokio::join!` / `try_join!` / `buffer_unordered`
- [ ] Iterator chains без intermediate `.collect()` где возможно
- [ ] Function arguments: `&str` для read-only, `String` для ownership transfer
- [ ] Domain types через newtype (`struct Did(String)`, etc.) на API boundaries

## See also

- `rust-error-handling.md` — Result vs panic
- `rust-build.md` — release profile, clippy lints
- `engineering-principles.md` §17 «Concurrency & async»
- `coding-standards-checklist.md` — C25, C80, C82, C84, C85 (Phase 0/N walks)
