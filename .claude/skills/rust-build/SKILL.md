---
name: rust-build
description: Paxio Rust build configuration — Cargo workspace, edition 2024, clippy pedantic+nursery, release profile (lto, codegen-units=1, strip, panic=abort), feature flags, cargo-deny supply chain. Use when configuring Cargo.toml in workspace root or member crates under products/*/canister*/, platform/canister-shared/, products/*/cli/, products/*/http-proxy/, or when the user mentions clippy lint, release profile, workspace deps, feature gating, license, supply chain.
---

# Rust Build (Paxio)

> See also: `rust-canister`, `rust-error-handling`, `icp-rust`.

## R-Build-1: Edition 2024 + clippy pedantic+nursery → zero warnings (P0)

```toml
# workspace root Cargo.toml
[workspace.package]
edition = "2024"
license = "MIT OR Apache-2.0"
authors = ["Paxio Network <hello@paxio.network>"]

[workspace.lints.rust]
unsafe_code = "deny"
unused_must_use = "deny"
unreachable_pub = "warn"

[workspace.lints.clippy]
all = "warn"
pedantic = "warn"
nursery = "warn"

# Documented exceptions only:
module_name_repetitions = "allow"  # WalletWallet etc. fine
missing_errors_doc = "allow"        # E type already documents

# P0 enforcement:
unwrap_used = { level = "deny", priority = -1 }
panic = { level = "deny", priority = -1 }
```

Member crate inherits:
```toml
[package]
edition.workspace = true
[lints]
workspace = true
```

CI gate: `cargo clippy --workspace --all-targets -- -D warnings` — any warning fails.

## R-Build-2: Release profile — small + fast WASM (P2)

```toml
[profile.release]
lto = true              # link-time optimization
codegen-units = 1       # one unit = best optimization
strip = true            # remove debug symbols
panic = "abort"         # required for wasm32-unknown-unknown — no unwinding
opt-level = 3
debug = false

[profile.release-with-debug]
inherits = "release"
debug = true
strip = false
```

`panic = "abort"` is mandatory for ICP canister WASM (target doesn't support unwinding).

## R-Build-3: Workspace structure (P1)

Single root `Cargo.toml`, members listed:

```toml
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
ic-cdk = "0.13"
ic-stable-structures = "0.6"
candid = "0.10"
serde = { version = "1.0", features = ["derive"] }
thiserror = "1.0"
tokio = { version = "1.40", features = ["full"] }
sha2 = "0.10"
hex = "0.4"
```

Members inherit via `name.workspace = true`.

## R-Build-4: Module visibility — `pub(crate)` for internals (P2)

```rust
// products/03-wallet/canister/src/lib.rs
pub mod api;        // public surface
mod domain;         // crate-private
mod storage;
mod ecdsa;

pub use api::{sign_intent, get_balance};
pub use domain::error::WalletError;
```

- `mod x` — module-private default
- `pub(crate) mod x` — crate-internal helpers, refactor-safe
- `pub mod x` — only public API
- Re-exports control what leaks

## R-Build-5: Feature flags — default `[]`, opt-in (P2)

```toml
[features]
default = []                         # minimal
mock-ecdsa = []                      # tests
http-client = ["dep:reqwest"]        # HTTP transport
tracing-logs = ["dep:tracing"]
all = ["mock-ecdsa", "http-client", "tracing-logs"]

[dependencies]
reqwest = { version = "0.12", optional = true }
tracing = { version = "0.1", optional = true }
```

Each optional dep behind `#[cfg(feature = "x")]`. `cargo build --no-default-features` must compile (smoke check).

## R-Build-6: Documented clippy exceptions (P2)

Each `clippy::* = "allow"` carries a comment with rationale + (if temporary) milestone reference + tech-debt entry. Inline `#[allow(...)]` only with TODO + reason.

## R-Build-7: License declared in workspace.package (P1)

`license = "MIT OR Apache-2.0"` in `[workspace.package]`, `LICENSE` file in repo root. Audit deps via `cargo-deny`.

## R-Build-8: cargo-deny — supply chain (P2)

`deny.toml` in repo root, version-controlled:

```toml
[advisories]
vulnerability = "deny"
unmaintained = "warn"
yanked = "deny"

[licenses]
unlicensed = "deny"
allow = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "Unicode-DFS-2016"]
copyleft = "deny"

[bans]
multiple-versions = "warn"
deny = [
    { name = "openssl-sys" },   # use rustls
]

[sources]
unknown-registry = "warn"
unknown-git = "warn"
```

CI: `cargo deny check` on every Rust-touching PR.

## Reviewer Phase 0 checklist

- [ ] workspace `edition = "2024"` + strict clippy
- [ ] member Cargo.toml inherits via `workspace = true`
- [ ] `cargo clippy --workspace -- -D warnings` clean
- [ ] release profile: `lto + codegen-units=1 + strip + panic=abort`
- [ ] `pub(crate)` for internals, `pub` only for public API
- [ ] default features `[]`, optionals behind `#[cfg(feature = "x")]`
- [ ] clippy exceptions documented with rationale
- [ ] license + LICENSE file present
- [ ] `cargo deny check` passes
