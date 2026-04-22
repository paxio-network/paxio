//! Paxio canister-shared — cross-canister Rust primitives.
//!
//! Содержит ТОЛЬКО те типы/утилиты, которые нужны ≥2 canister'ам и
//! не являются domain-специфичными. Domain-типы (AgentProfile, PaymentMethod,
//! ReputationEntry, и пр.) живут в canister-е владельце (products/*/canister/).
//!
//! Порт из bitgent/canisters/shared/src/types.rs (только `AgentId`, `TxHash`
//! newtypes — строки 1–17); всё остальное в bitgent shared было
//! domain-специфично для Registry и в paxio ему не место (FA-01 у нас в TS).

#![deny(clippy::unwrap_used)]

pub mod ids;

pub use ids::{AgentId, TxHash};

/// Версия crate (для диагностики canister upgrade compatibility).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
