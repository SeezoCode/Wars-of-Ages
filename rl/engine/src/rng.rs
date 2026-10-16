//! Mulberry32 PRNG.
//!
//! The browser game uses `Math.random()`. For training any decent PRNG would do,
//! but the parity harness (`rl/parity/run_js.js`) replaces `Math.random` with this
//! exact generator so that the JS game and the Rust port consume identical random
//! streams and can be compared tick by tick.

#[derive(Clone, Copy, Debug)]
pub struct Rng {
    state: u32,
}

impl Rng {
    pub fn new(seed: u32) -> Self {
        Rng { state: seed }
    }

    /// Uniform in [0, 1), bit-identical to the JS `mulberry32` in the parity harness.
    #[inline]
    pub fn next_f64(&mut self) -> f64 {
        self.state = self.state.wrapping_add(0x6D2B_79F5);
        let a = self.state;
        let mut t = (a ^ (a >> 15)).wrapping_mul(1 | a);
        t = (t.wrapping_add((t ^ (t >> 7)).wrapping_mul(61 | t))) ^ t;
        ((t ^ (t >> 14)) as f64) / 4_294_967_296.0
    }

    #[inline]
    pub fn next_u32(&mut self) -> u32 {
        (self.next_f64() * 4_294_967_296.0) as u32
    }

    /// Uniform integer in [0, n).
    #[inline]
    pub fn below(&mut self, n: usize) -> usize {
        ((self.next_f64() * n as f64) as usize).min(n.saturating_sub(1))
    }
}

/// splitmix32-style seed scrambler, used to derive independent streams from one seed.
pub fn derive_seed(seed: u64, stream: u64) -> u32 {
    let mut z = seed
        .wrapping_add(stream.wrapping_mul(0x9E37_79B9_7F4A_7C15))
        .wrapping_add(0x9E37_79B9_7F4A_7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    (z ^ (z >> 31)) as u32
}
