---
name: rust-error-handling
description: >
  Error handling patterns for Rust ICP canisters.
  Use when implementing error handling, Result chains, custom error types,
  or when the user mentions errors, recovery, error classification.
---

# Error Handling (Rust ICP Canisters)

## Error classification

- **Programming errors:** Bugs (unwrap on None, index out of bounds, logic errors).
  Fix the code. In tests: unwrap() is OK. In canisters: NEVER.
  In Rust: panic, unwrap on None.

- **Operational errors:** Expected failures (network timeout, invalid input, chain lookup
  failure, malformed payment proof). Handle gracefully with `Result<T, E>`.
  In Rust: return `Err(CustomError::Description)`.

## Custom error types per canister

```rust
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum RegistryError {
    AgentNotFound(String),
    DuplicateEndpoint(String),
    InvalidProfile(String),
    StorageFull,
    CrawlFailed(String),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum FacilitatorError {
    PaymentNotFound(String),
    AmountMismatch { expected: u64, actual: u64 },
    InvalidNetwork(String),
    ChainLookupFailed(String),
    SecurityCheckFailed(String),
    EscrowHoldFailed(String),
    SettlementFailed(String),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum WalletError {
    InsufficientBalance { available: u64, requested: u64 },
    InvalidAddress(String),
    SigningFailed(String),
    NetworkMismatch(String),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum SecurityError {
    InjectionDetected(String),
    SecretFound { pattern_id: usize, position: usize },
    BudgetExceeded { limit: u64, requested: u64 },
    WhitelistViolation(String),
    EscalationDetected,
}
```

## Result chain — replaces try/catch

```rust
pub fn verify_and_route(proof: PaymentProof) -> Result<RouteResult, FacilitatorError> {
    let tx = lookup_transaction(&proof.tx_hash)
        .map_err(|e| FacilitatorError::ChainLookupFailed(e.to_string()))?;
    validate_amount(tx.amount, proof.expected_amount)?;
    Ok(RouteResult { tx_hash: tx.hash, amount: tx.amount })
}
```

## Error propagation with ? operator

```rust
// Each step can fail independently — ? propagates the error
pub fn register_and_score(profile: AgentProfile) -> Result<AgentId, RegistryError> {
    validate_profile(&profile)?;           // Returns RegistryError::InvalidProfile
    let id = generate_unique_id(&profile)?; // Returns RegistryError::DuplicateEndpoint
    store_agent(&id, &profile)?;           // Returns RegistryError::StorageFull
    Ok(id)
}
```

## Conventions

- Every public canister function returns `Result<T, E>` with canister-specific error type
- Use `?` operator for propagation, not nested match blocks
- Use `map_err` when crossing error type boundaries
- NEVER use `unwrap()` in canister code — causes canister trap (panic)
- NEVER swallow errors silently — always propagate or log via ic_cdk::println!
- Custom error types implement CandidType + Deserialize for cross-canister communication
- Error messages should be actionable: include what failed and what to do about it

---

## Paxio Extensions (ported from .claude/rules/rust-error-handling.md)

> Severity-tagged conventions for Paxio canisters + Rust binaries. Reviewer Phase 0/N walks these as P0/P1 invariants.

# Rust Error Handling — Paxio canisters + Rust binaries

> Источник: ported from `/home/openclaw/complior/CODING-STANDARDS-RUST.md` §9 + `cli/src/error.rs`.
> Применяется ко всем Rust crates: `products/*/canister*/`, `platform/canister-shared/`,
> `products/*/cli/`, `products/*/http-proxy/`.

## R-Rust-EH-1: thiserror в библиотеках, anyhow ТОЛЬКО в `main()`

**Severity: P0** — type erasure убивает debugging.

```rust
// ✅ библиотека / crate с public API — concrete error enum через thiserror
#[derive(Debug, thiserror::Error)]
pub enum WalletError {
    #[error("Wallet not found: {agent_did}")]
    NotFound { agent_did: String },

    #[error("Insufficient balance: have {have}, need {need}")]
    InsufficientBalance { have: u64, need: u64 },

    #[error("Threshold ECDSA signing failed")]
    EcdsaSign(#[from] EcdsaError),
}

pub fn sign(intent: Intent) -> Result<Signature, WalletError> { /* ... */ }

// ❌ библиотека возвращает opaque anyhow — caller не может match на конкретные ошибки
pub fn sign(intent: Intent) -> anyhow::Result<Signature> { /* WRONG */ }

// ✅ binary main() — anyhow OK, потому что end-of-pipe
fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    cli.run()?;  // any error → pretty backtrace via anyhow
    Ok(())
}
```

**Правило:**
- Каждый crate в `products/*/canister*/`, `platform/canister-shared/` экспортирует `pub enum *Error: thiserror::Error`
- `#[from]` для auto-`From<UpstreamError>` propagation через `?`
- `anyhow` разрешён ТОЛЬКО в `bin.rs` / `main.rs` / в инструментах, не в library code

## R-Rust-EH-2: NO `unwrap()` / `panic!()` в production paths

**Severity: P0** — panic crashes canister / daemon.

```rust
// ❌ запрещено в production
let value = map.get("key").unwrap();          // panics if missing
let n: u64 = string.parse().unwrap();         // panics on parse error
panic!("should not happen");                  // straight panic

// ✅ propagate через `?`
let value = map.get("key").ok_or(MyError::MissingKey)?;
let n: u64 = string.parse()?;

// ✅ `.expect("message")` ТОЛЬКО если код logically asserts инвариант
let port: u16 = config.port.expect("port set after validation in CliBuilder::build");
// ↑ explanation в expect() обязательна — что именно гарантирует не-None

// ✅ default fallback где разумно
let timeout = config.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS);
let log_level = env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string());
```

**Clippy enforcement:**
```toml
# Cargo.toml
[lints.clippy]
unwrap_used = "deny"           # error on .unwrap()
panic = "deny"                 # error on panic!()
expect_used = "warn"           # expect() requires explanation comment
```

**Исключения:**
- Tests (`#[cfg(test)]`) — `.unwrap()` / `panic!` OK для test fixtures
- `unreachable!()` в exhaustive pattern matches — OK с rationale
- Pre-conditions checked at canister `init()` — `.expect("init invariant")` OK

## R-Rust-EH-3: `#[from]` derive для auto error propagation

**Severity: P1** — reduces boilerplate, makes `?` ergonomic.

```rust
#[derive(Debug, thiserror::Error)]
pub enum CrawlerError {
    #[error("HTTP fetch: {0}")]
    Http(#[from] reqwest::Error),         // auto From<reqwest::Error>

    #[error("JSON parse: {0}")]
    Json(#[from] serde_json::Error),      // auto From<serde_json::Error>

    #[error("Database: {0}")]
    Db(#[from] sqlx::Error),              // auto From<sqlx::Error>

    #[error("Adapter not found for source: {source}")]
    UnknownSource { source: String },     // domain error, no #[from]
}

// Usage — `?` propagates с auto conversion
async fn fetch_agents(url: &str) -> Result<Vec<Agent>, CrawlerError> {
    let response = reqwest::get(url).await?;       // reqwest::Error → CrawlerError::Http
    let agents: Vec<Agent> = response.json().await?; // serde_json::Error → CrawlerError::Json
    Ok(agents)
}
```

**Правило:** для каждой external library error, которая пересекает crate boundary, добавь
`#[from]` variant. Domain errors (concrete state, not external propagation) — без `#[from]`.

## R-Rust-EH-4: `wrap_err()` для context-rich errors через `color_eyre`

**Severity: P1** — bare error chains не отвечают «что именно failed и почему».

```rust
use color_eyre::eyre::{eyre, Context, Result};

// ❌ bare propagation — caller видит «io: not found», не знает контекст
async fn load_config() -> Result<Config> {
    let bytes = tokio::fs::read("config.toml").await?;
    let config: Config = toml::from_slice(&bytes)?;
    Ok(config)
}

// ✅ wrap_err с конкретным контекстом
async fn load_config(path: &Path) -> Result<Config> {
    let bytes = tokio::fs::read(path)
        .await
        .wrap_err_with(|| format!("reading config file at {}", path.display()))?;
    let config: Config = toml::from_slice(&bytes)
        .wrap_err("parsing config TOML — check schema")?;
    Ok(config)
}
```

**Правило:**
- Library code → `thiserror` enum с structured fields (machine-readable)
- Binary code (`main.rs`, CLI handlers) → `color_eyre::eyre` + `wrap_err` (human-readable)
- На границе binary→library — convert: `library_fn().wrap_err("context")?`

**Setup в `main.rs`:**
```rust
fn main() -> color_eyre::Result<()> {
    color_eyre::install()?;  // pretty panic backtraces + suggestions
    // ...
}
```

## R-Rust-EH-5: `#[serde(deny_unknown_fields)]` + `TryFrom<RawConfig>` validation

**Severity: P1** — typos в config silently ignored = bugs.

```rust
// ✅ deny_unknown_fields catches typos
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct RawConfig {
    pub port: u16,
    pub jurisdiction: String,
    #[serde(default)]
    pub log_level: Option<String>,
}

// ✅ validation через TryFrom — boundary между raw deserialized и domain
#[derive(Debug)]
pub struct Config {
    pub port: Port,                    // newtype, valid range
    pub jurisdiction: Jurisdiction,    // enum, valid value
    pub log_level: LogLevel,           // enum, default applied
}

impl TryFrom<RawConfig> for Config {
    type Error = ConfigError;

    fn try_from(raw: RawConfig) -> Result<Self, Self::Error> {
        Ok(Config {
            port: Port::new(raw.port)
                .ok_or(ConfigError::InvalidPort { value: raw.port })?,
            jurisdiction: raw.jurisdiction.parse()
                .map_err(|_| ConfigError::InvalidJurisdiction { value: raw.jurisdiction })?,
            log_level: raw.log_level
                .as_deref()
                .map(|s| s.parse())
                .transpose()?
                .unwrap_or(LogLevel::Info),
        })
    }
}
```

**Правило:**
- Raw deserialized struct (`RawX`) — derive Deserialize с `deny_unknown_fields` + `rename_all`
- Domain struct (`X`) — построен через `TryFrom<RawX>` с full validation
- Boundary: `let config: Config = toml::from_str(s).map(Config::try_from)?;`

## R-Rust-EH-6: Panic-free CLI / canister — graceful error handling

**Severity: P1** — daemon must not die on user input.

```rust
// ❌ panic kills daemon
fn handle_command(cmd: Command) {
    let parsed: Intent = serde_json::from_str(&cmd.payload).unwrap();
    process(parsed).unwrap();
}

// ✅ all errors → Result → diagnostic event, no abort
async fn handle_command(cmd: Command) -> Result<Response, CommandError> {
    let parsed: Intent = serde_json::from_str(&cmd.payload)
        .map_err(|e| CommandError::ParseFailed { reason: e.to_string() })?;
    let result = process(parsed).await?;
    Ok(Response::Ok(result))
}

// at top of event loop
match handle_command(cmd).await {
    Ok(resp) => send_response(resp),
    Err(e) => send_diagnostic_event(e),  // graceful: client sees error, daemon lives
}
```

**Canister-specific:**
```rust
#[ic_cdk::update]
fn sign_intent(intent: Intent) -> Result<Signature, WalletError> {
    // NEVER panic! — propagate errors
    let caller = ic_cdk::caller();
    let wallet = WALLETS.with(|w| {
        w.borrow().get(&caller).ok_or(WalletError::NotFound { caller })
    })?;
    wallet.sign(&intent).map_err(WalletError::from)
}
```

**Правило для canister'ов:**
- Все public `#[ic_cdk::update]` / `#[ic_cdk::query]` методы возвращают `Result<T, ConcreteError>`
- `panic!` в canister kills the call (rolls back state) — это catastrophic, не graceful
- Pre-conditions check at `init()` / `pre_upgrade()` — там panic OK (system errors)
- Inter-canister calls — match on `CallResult`, never `.unwrap()`

## Quick checklist (для reviewer Phase 0)

- [ ] Все public errors через `thiserror::Error` derive (не `Box<dyn Error>`, не `String`)
- [ ] `anyhow` ТОЛЬКО в `main.rs` / `bin.rs`, не в library
- [ ] Нет `.unwrap()` / `.expect("")` без rationale comment в production paths
- [ ] `#[from]` для каждой external error на crate boundary
- [ ] Domain errors (`InvalidPort`, `NotFound`) без `#[from]` — semantic
- [ ] Config structs: `#[serde(deny_unknown_fields)]` + `TryFrom<Raw>` validation
- [ ] Public canister methods возвращают `Result<T, _>`, не panic'ят
- [ ] CI enforces: `cargo clippy -- -D unwrap_used -D panic`

## See also

- `code-style.md` — naming, file organization
- `safety.md` — `R117 panic-free CLI/canister`, security audit
- `engineering-principles.md` §22 «Contract programming»
- `coding-standards-checklist.md` — C8, C24, C28, C29, C30 (Phase 0/N reviewer walks)
