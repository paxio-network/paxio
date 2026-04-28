---
name: rust-error-handling
description: Rust error handling for Paxio canisters + binaries — thiserror in libraries, anyhow only in main(), no unwrap/panic in production, Result<T, ConcreteError> contracts, #[from] propagation, color_eyre wrap_err for context, deny_unknown_fields config validation.
---

# Rust Error Handling (Paxio)

> See also: `rust-canister`, `rust-build`, `icp-rust`, `error-handling` (TS counterpart).

## Classification

- **Programming errors**: bugs (`unwrap` on None, index OOB, logic). Fix the code. Tests OK; canister NEVER.
- **Operational errors**: expected failures (network timeout, invalid input, parse failure). Handle via `Result<T, E>`.

## R-EH-1: thiserror in libraries, anyhow only in `main()` (P0)

```rust
// ✅ library — concrete enum via thiserror
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

// ❌ library returns opaque anyhow — caller can't match concrete cases
pub fn sign(intent: Intent) -> anyhow::Result<Signature> { /* WRONG */ }

// ✅ binary main() — anyhow OK at end-of-pipe
fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    cli.run()?;
    Ok(())
}
```

- Every crate exports a concrete `pub enum *Error: thiserror::Error`
- `#[from]` for auto `From<UpstreamError>` propagation through `?`
- `anyhow` allowed only in `bin.rs` / `main.rs`

## R-EH-2: NO `unwrap()` / `panic!()` in production (P0)

```rust
// ❌ banned in production
let value = map.get("key").unwrap();
let n: u64 = string.parse().unwrap();
panic!("should not happen");

// ✅ propagate via ?
let value = map.get("key").ok_or(MyError::MissingKey)?;
let n: u64 = string.parse()?;

// ✅ .expect("…") only when invariant assertion is logically proven
let port: u16 = config.port.expect("port set after CliBuilder::build validation");

// ✅ default fallback
let timeout = config.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS);
```

Clippy gate (in workspace `Cargo.toml`):
```toml
[lints.clippy]
unwrap_used = "deny"
panic = "deny"
expect_used = "warn"
```

Exceptions:
- Tests (`#[cfg(test)]`) — `.unwrap()` / `panic!` OK for fixtures
- `unreachable!()` in exhaustive pattern matches — OK with rationale
- Pre-conditions checked at canister `init()` — `.expect("init invariant")` OK

## R-EH-3: `#[from]` derive for auto propagation (P1)

```rust
#[derive(Debug, thiserror::Error)]
pub enum CrawlerError {
    #[error("HTTP fetch: {0}")]
    Http(#[from] reqwest::Error),

    #[error("JSON parse: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Database: {0}")]
    Db(#[from] sqlx::Error),

    #[error("Adapter not found for source: {source}")]
    UnknownSource { source: String },     // domain — no #[from]
}

async fn fetch_agents(url: &str) -> Result<Vec<Agent>, CrawlerError> {
    let response = reqwest::get(url).await?;          // reqwest::Error → CrawlerError::Http
    let agents: Vec<Agent> = response.json().await?;  // serde_json::Error → CrawlerError::Json
    Ok(agents)
}
```

Rule: every external library error crossing crate boundary gets a `#[from]` variant. Domain errors (concrete state, not external propagation) — no `#[from]`.

## R-EH-4: `wrap_err` for context-rich errors (P1)

Library code → structured `thiserror` enum (machine-readable). Binary code → `color_eyre::eyre` + `wrap_err` (human-readable). Convert at the boundary.

```rust
use color_eyre::eyre::{Context, Result};

// ❌ bare propagation — caller sees "io: not found" without context
async fn load_config() -> Result<Config> {
    let bytes = tokio::fs::read("config.toml").await?;
    let config: Config = toml::from_slice(&bytes)?;
    Ok(config)
}

// ✅ wrap_err with concrete context
async fn load_config(path: &Path) -> Result<Config> {
    let bytes = tokio::fs::read(path).await
        .wrap_err_with(|| format!("reading config file at {}", path.display()))?;
    let config: Config = toml::from_slice(&bytes)
        .wrap_err("parsing config TOML — check schema")?;
    Ok(config)
}
```

`main.rs`:
```rust
fn main() -> color_eyre::Result<()> {
    color_eyre::install()?;   // pretty backtraces + suggestions
    // ...
}
```

## R-EH-5: `#[serde(deny_unknown_fields)]` + TryFrom validation (P1)

```rust
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct RawConfig {
    pub port: u16,
    pub jurisdiction: String,
    #[serde(default)]
    pub log_level: Option<String>,
}

#[derive(Debug)]
pub struct Config {
    pub port: Port,                    // newtype
    pub jurisdiction: Jurisdiction,    // enum
    pub log_level: LogLevel,
}

impl TryFrom<RawConfig> for Config {
    type Error = ConfigError;
    fn try_from(raw: RawConfig) -> Result<Self, Self::Error> {
        Ok(Config {
            port: Port::new(raw.port).ok_or(ConfigError::InvalidPort { value: raw.port })?,
            jurisdiction: raw.jurisdiction.parse()
                .map_err(|_| ConfigError::InvalidJurisdiction { value: raw.jurisdiction })?,
            log_level: raw.log_level.as_deref().map(|s| s.parse()).transpose()?
                .unwrap_or(LogLevel::Info),
        })
    }
}
```

- Raw deserialized struct (`RawX`) — Deserialize with `deny_unknown_fields` + `rename_all`
- Domain struct (`X`) — built via `TryFrom<RawX>` with full validation
- Boundary: `let config: Config = toml::from_str(s).map(Config::try_from)?;`

## R-EH-6: Panic-free CLI / canister (P1)

```rust
// ❌ panic kills daemon / rolls back canister state
fn handle(cmd: Command) {
    let parsed: Intent = serde_json::from_str(&cmd.payload).unwrap();
    process(parsed).unwrap();
}

// ✅ all errors → Result → diagnostic event, no abort
async fn handle(cmd: Command) -> Result<Response, CommandError> {
    let parsed: Intent = serde_json::from_str(&cmd.payload)
        .map_err(|e| CommandError::ParseFailed { reason: e.to_string() })?;
    let result = process(parsed).await?;
    Ok(Response::Ok(result))
}

// at top of event loop
match handle(cmd).await {
    Ok(resp) => send_response(resp),
    Err(e) => send_diagnostic_event(e),  // graceful — daemon lives, client sees error
}
```

Canister-specific:
```rust
#[ic_cdk::update]
fn sign_intent(intent: Intent) -> Result<Signature, WalletError> {
    let caller = ic_cdk::caller();
    let wallet = WALLETS.with(|w| {
        w.borrow().get(&caller).ok_or(WalletError::NotFound { caller })
    })?;
    wallet.sign(&intent).map_err(WalletError::from)
}
```

- Public `#[ic_cdk::update]` / `#[ic_cdk::query]` always return `Result<T, ConcreteError>`
- `panic!` in canister kills the call + rolls back state — catastrophic, not graceful
- Init / pre_upgrade panics OK (system errors halt upgrade)
- Inter-canister calls — `match` on `CallResult`, never `.unwrap()`

## Reviewer Phase 0 checklist

- [ ] Public errors via `thiserror::Error` derive — no `Box<dyn Error>`, no `String`
- [ ] `anyhow` only in `main.rs` / `bin.rs`
- [ ] No `.unwrap()` / `.expect("")` without rationale comment in production paths
- [ ] `#[from]` for each external error on crate boundary
- [ ] Domain errors (`InvalidPort`, `NotFound`) without `#[from]`
- [ ] Config: `#[serde(deny_unknown_fields)]` + `TryFrom<Raw>` validation
- [ ] Public canister methods return `Result<T, _>` — never panic
- [ ] CI gate: `cargo clippy -- -D unwrap_used -D panic`
