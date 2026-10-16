//! Wars of Ages — headless engine + RL environment.
//!
//! * `game`    — faithful port of the browser game loop (index.ts)
//! * `classic` — the original `SimulatingBot` (+ its worker search)
//! * `dqn`     — the existing `LocalRLBot` DQN bot
//! * `obs`     — observation / action spec for the new agent (mirrored by `UltimateBot` in index.ts)
//! * `env`     — episode logic and a parallel `VecEnv`
//! * `python`  — PyO3 bindings (feature `python`, built by maturin)

pub mod classic;
pub mod dqn;
pub mod env;
pub mod game;
pub mod obs;
pub mod rng;
pub mod troops;

#[cfg(feature = "python")]
mod python;
