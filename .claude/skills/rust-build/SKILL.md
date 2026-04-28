---
name: rust-build
description: >
  Paxio Rust build configuration — Cargo workspace, edition 2024, clippy pedantic+nursery,
  release profile (lto, codegen-units=1, strip, panic=abort), feature flags, cargo-deny.
  Use when configuring Cargo.toml workspace root or member crates under products/*/canister*/,
  platform/canister-shared/, products/*/cli/, products/*/http-proxy/, or when the user
  mentions clippy lint config, release profile, workspace deps, feature gating, or supply chain.
---

# Rust Build — Cargo workspace, lints, release profile

> Источник: ported from `/home/openclaw/complior/Cargo.toml` + `cli/Cargo.toml` lints + §13.7.
> Применяется ко всем Rust crates в Paxio: workspace root `Cargo.toml`, member crates
> `products/*/canister*/`, `platform/canister-shared/`, `products/*/cli/`,
> `products/*/http-proxy/`.

## R-Rust-Build-1: Edition 2024 + clippy `pedantic + nursery` warn → zero warnings

**Severity: P0** — warnings = bugs waiting to happen.

```toml
# workspace root Cargo.toml
[workspace.package]
edition = "2024"
license = "MIT OR Apache-2.0"
authors = ["Paxio Network <hello@paxio.network>"]

[workspace.lints.rust]
unsafe_code = "deny"           # safe Rust by default; explicit per-crate opt-in if needed
unused_must_use = "deny"
unreachable_pub = "warn"

[workspace.lints.clippy]
all = "warn"
pedantic = "warn"
nursery = "warn"

# Allow specific exceptions с rationale comments (track for cleanup)
module_name_repetitions = "allow"  # WalletWallet, RegistryRegistry — fine in modular files
missing_errors_doc = "allow"        # Result<_, E> already documents via E type

[workspace.lints.clippy."priority"]
# To override workspace-level "warn" with "deny" or "allow", priority = -1
unwrap_used = { level = "deny", priority = -1 }
panic = { level = "deny", priority = -1 }
```

**Member crate inheritance:**
```toml
# products/03-wallet/canister/Cargo.toml
[package]
name = "paxio-wallet-canister"
version.workspace = true
edition.workspace = true

[lints]
workspace = true   # inherit from workspace.lints
```

**Pre-commit / CI gate:**
```bash
cargo clippy --workspace --all-targets -- -D warnings
# 0 warnings → pass; any warning → fail
```

**Правило:**
- Edition `2024` (not 2021) — latest stable edition with disjoint closure capture, etc.
- Clippy `all + pedantic + nursery` warn — catch as many issues as possible
- Specific allows tracked: comment в `Cargo.toml` объясняет почему (don't suppress mid-code
  с `#[allow(...)]` без clear rationale + TODO + milestone reference)
- CI runs `cargo clippy --workspace -- -D warnings` — zero tolerance

## R-Rust-Build-2: Release profile — lto, codegen-units=1, strip, panic=abort

**Severity: P2** — smaller, faster binaries; shorter cold start.

```toml
# workspace root Cargo.toml
[profile.release]
lto = true              # link-time optimization (slower compile, faster runtime)
codegen-units = 1       # one unit = best optimization (slower parallel compile)
strip = true            # remove debug symbols → smaller binary
panic = "abort"         # no unwinding → smaller binary, no overhead
opt-level = 3           # aggressive optimization (default)
debug = false           # no debug info in release

[profile.release-with-debug]
inherits = "release"
debug = true            # keep debug symbols for production debugging
strip = false
```

**Канister-specific:**
- ICP canister WASM build использует `--release` profile by default
- `panic = "abort"` важно — ICP `wasm32-unknown-unknown` target не supports unwinding
- `lto = true` reduces WASM size (canister cycle cost)

**Build commands:**
```bash
# Production binary (CLI / HTTP proxy)
cargo build --release --bin paxio-cli

# Canister WASM
dfx build wallet  # uses release profile + canister-specific flags
```

## R-Rust-Build-3: Workspace structure — single root Cargo.toml + member crates

**Severity: P1** — proper workspace setup enables cross-crate refactoring + shared deps.

```toml
# Cargo.toml (workspace root в /home/nous/paxio/)
[workspace]
resolver = "2"
members = [
    "platform/canister-shared",
    "products/01-registry/canister",
    "products/02-facilitator/canisters/*",
    "products/03-wallet/canister",
    "products/03-wallet/http-proxy",
    "products/04-security/canister",
    "products/05-bitcoin-agent/canisters/*",
    "products/06-compliance/canisters/*",
    "products/06-compliance/cli",
    "products/07-intelligence/canister",
]

[workspace.dependencies]
# Shared dependency versions — all member crates inherit
ic-cdk = "0.13"
ic-stable-structures = "0.6"
candid = "0.10"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "1.0"
tokio = { version = "1.40", features = ["full"] }
sha2 = "0.10"
hex = "0.4"

[profile.release]
lto = true
codegen-units = 1
strip = true
panic = "abort"
```

**Member crate:**
```toml
# products/03-wallet/canister/Cargo.toml
[package]
name = "paxio-wallet-canister"
version = "0.1.0"
edition.workspace = true

[dependencies]
ic-cdk.workspace = true              # inherit version from workspace
ic-stable-structures.workspace = true
candid.workspace = true
serde.workspace = true
thiserror.workspace = true

# Crate-specific deps
sha2.workspace = true

[lib]
crate-type = ["cdylib"]               # canister WASM
```

**Правило:**
- One workspace root `Cargo.toml` в repo root
- All Rust crates listed in `[workspace] members`
- Common dep versions в `[workspace.dependencies]` — member crates inherit via
  `name.workspace = true`
- Per-crate local deps OK (если specific to that crate)

## R-Rust-Build-4: Module visibility — `pub(crate)` for internal helpers

**Severity: P2** — explicit API boundary, prevents accidental public exposure.

```rust
// products/03-wallet/canister/src/lib.rs
pub mod api;        // public — exported types, public functions
mod domain;         // private — only accessible within crate
mod storage;        // private
mod ecdsa;          // private

// Re-export public surface explicitly
pub use api::{sign_intent, get_balance, register_wallet};
pub use domain::error::WalletError;

// products/03-wallet/canister/src/domain/mod.rs
pub(crate) mod state;       // visible to other modules in this crate, NOT public
pub(crate) mod validators;
mod helpers;                // strictly module-private

pub use error::WalletError; // re-export error type to crate root
```

**Правило:**
- Default = private (no modifier on `mod x`)
- `pub(crate)` для cross-module helpers внутри одного crate — разрешает refactoring без
  breaking external API
- `pub` ТОЛЬКО для items на публичной границе crate (exports)
- В `lib.rs` / `mod.rs` — explicit `pub use` re-exports controlling что leaks

## R-Rust-Build-5: Feature flags — default `[]`, optional behind opt-in

**Severity: P2** — keeps binaries lean for minimal use cases.

```toml
# products/03-wallet/sdk-rust/Cargo.toml (hypothetical example)
[features]
default = []                            # minimal — no extras

# Opt-in features
mock-ecdsa = []                          # enable mock signing for tests
http-client = ["dep:reqwest"]            # enable HTTP transport
tracing-logs = ["dep:tracing"]           # enable structured logging
all = ["mock-ecdsa", "http-client", "tracing-logs"]

[dependencies]
ic-cdk.workspace = true
serde.workspace = true

# Optional dependencies — only pulled in if feature enabled
reqwest = { version = "0.12", optional = true }
tracing = { version = "0.1", optional = true }
```

**Правило:**
- `default = []` для library crates — caller opts into features
- Каждый optional dep behind `#[cfg(feature = "x")]` gate в коде
- `cargo build --features mock-ecdsa` для test runs
- `cargo build --no-default-features` should always compile (smoke check)

## R-Rust-Build-6: Clippy exceptions documented в Cargo.toml + tracked для cleanup

**Severity: P2** — exceptions без context = unmaintainable workarounds.

```toml
[lints.clippy]
# Workspace lints inherit; here override specific cases с rationale:

# OK: WalletWallet, IntentIntent — these names are actually fine in modular code
module_name_repetitions = "allow"

# OK: Result<T, E> already documents errors via E type
missing_errors_doc = "allow"

# TODO(M-Q3-cleanup): too many false positives in current code, fix incrementally
# Track in tech-debt.md TD-N (architect to file)
format_push_string = "allow"
cast_precision_loss = "allow"
similar_names = "allow"
```

**Правило:**
- Каждое `clippy::* = "allow"` имеет comment объясняющий ПОЧЕМУ
- Temporary exceptions → comment с TODO + milestone reference + tech-debt entry
- Прежде чем добавить exception — сначала try fix; allow только когда fix expensive
- Inline `#[allow(clippy::x)]` ТОЛЬКО temporary, ВСЕГДА с TODO + reason

## R-Rust-Build-7: License header — AGPL-3.0-only / MIT / Apache-2.0 в `Cargo.toml`

**Severity: P1** — legal compliance.

```toml
[workspace.package]
license = "MIT OR Apache-2.0"          # dual-license OSS standard
authors = ["Paxio Network <hello@paxio.network>"]
homepage = "https://paxio.network"
repository = "https://github.com/paxio-network/paxio"

# OR for specific subprojects:
# license = "AGPL-3.0-only"            # if AGPL chosen для compliance reasons
```

**Правило:**
- License declared в `[workspace.package]` — inherited by all members
- LICENSE file в repo root
- Audit dependency licenses через `cargo-deny` (см. ниже)
- НЕ mix incompatible licenses (GPL v2 incompatible с Apache 2.0 в same crate)

## R-Rust-Build-8: `cargo-deny` для supply chain security

**Severity: P2** — block unmaintained / vulnerable / license-conflict deps.

```toml
# deny.toml в repo root
[advisories]
db-path = "~/.cargo/advisory-db"
db-urls = ["https://github.com/rustsec/advisory-db"]
vulnerability = "deny"
unmaintained = "warn"
yanked = "deny"
notice = "warn"

[licenses]
unlicensed = "deny"
allow = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "Unicode-DFS-2016"]
copyleft = "deny"
allow-osi-fsf-free = "neither"

[bans]
multiple-versions = "warn"
deny = [
    { name = "openssl-sys" },           # use rustls instead
]

[sources]
unknown-registry = "warn"
unknown-git = "warn"
```

**CI step:**
```yaml
- name: cargo-deny check
  run: |
    cargo install cargo-deny --locked || true
    cargo deny check
```

**Правило:**
- `deny.toml` в repo root, version-controlled
- CI runs `cargo deny check` на каждом PR который touches Rust
- Vulnerability db updated weekly (cron job)

## Quick checklist (для reviewer Phase 0)

- [ ] `Cargo.toml` workspace root has `edition = "2024"` + `[workspace.lints.clippy]` strict
- [ ] Member crate Cargo.toml inherits via `workspace = true` (deps + lints)
- [ ] `cargo clippy --workspace -- -D warnings` clean (zero warnings)
- [ ] Release profile: `lto + codegen-units=1 + strip + panic=abort`
- [ ] Module visibility: `pub(crate)` для internal, `pub` only for public API
- [ ] Default feature flags `[]`; optional behind `#[cfg(feature = "x")]`
- [ ] Clippy exceptions в `Cargo.toml` documented с rationale comment
- [ ] License declared в `[workspace.package]`, LICENSE file present
- [ ] `cargo deny check` passes (если deny.toml configured)

## See also

- `rust-error-handling.md` — error types + propagation
- `rust-async.md` — tokio runtime + async patterns
- `safety.md` — security audit, supply chain
- `coding-standards-checklist.md` — C7, C83, C88, C89 (Phase 0/N walks)
