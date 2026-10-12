//! Unit table — must stay identical to `troopArr` in `index.ts`.

pub const CANVAS_WIDTH: f64 = 700.0;
pub const BASE_HEALTH: f64 = 800.0;
pub const BASE_SPAN: f64 = 45.0;
pub const NUM_TROOPS: usize = 12;
pub const UPGRADE_COST: f64 = 1500.0;
pub const UPGRADE_FACTOR: f64 = 1.2;

pub const BASIC: usize = 0;
pub const FAST: usize = 1;
pub const RANGE: usize = 2;
pub const ADVANCED: usize = 3;
pub const SHIELD: usize = 4;
pub const CATAPULT: usize = 5;
pub const BOOMER: usize = 6;
pub const DOGGO: usize = 7;
pub const TREBUCHET: usize = 8;
pub const ATOMIC_TROOP: usize = 9;
pub const ATOMIC_BOMB: usize = 10;
pub const BOSS: usize = 11;

#[derive(Clone, Copy, Debug)]
pub struct TroopStats {
    pub name: &'static str,
    pub health: f64,
    pub damage: f64,
    pub base_damage: f64,
    pub attack_speed: f64,
    pub price: f64,
    pub speed: f64,
    pub span: f64,
    pub range: f64,
    pub research_price: f64,
}

macro_rules! troop {
    ($name:expr, $h:expr, $d:expr, $bd:expr, $as:expr, $p:expr, $sp:expr, $span:expr, $r:expr, $rp:expr) => {
        TroopStats {
            name: $name,
            health: $h,
            damage: $d,
            base_damage: $bd,
            attack_speed: $as,
            price: $p,
            speed: $sp,
            span: $span,
            range: $r,
            research_price: $rp,
        }
    };
}

pub static TROOPS: [TroopStats; NUM_TROOPS] = [
    troop!("Basic Troop", 20.0, 4.4, 4.0, 40.0, 5.0, 1.0, 20.0, 0.0, 0.0),
    troop!("Fast Troop", 12.0, 2.3, 0.8, 13.0, 5.0, 2.5, 15.0, 10.0, 60.0),
    troop!("Range Troop", 20.0, 4.3, 3.0, 50.0, 8.0, 1.0, 20.0, 79.0, 100.0),
    troop!("Advanced Troop", 36.0, 15.0, 10.0, 70.0, 10.0, 1.0, 20.0, 0.0, 120.0),
    troop!("Shield Troop", 115.0, 3.0, 1.75, 200.0, 12.0, 1.0, 20.0, 0.0, 150.0),
    troop!("Catapult", 15.0, 3.2, 12.0, 100.0, 20.0, 0.9, 32.0, 140.0, 140.0),
    troop!("Boomer Troop", 1.0, 50.0, 30.0, 17.0, 20.0, 2.0, 20.0, 40.0, 140.0),
    troop!("Doggo", 30.0, 30.0, 2.0, 60.0, 20.0, 1.8, 15.0, 0.0, 175.0),
    troop!("Trebuchet", 5.0, 1.0, 100.0, 300.0, 45.0, 0.65, 50.0, 210.0, 250.0),
    troop!("Atomic Troop", 280.0, 0.6, 0.75, 1.0, 40.0, 0.8, 18.0, 0.0, 250.0),
    troop!("Atomic Bomb", 5000.0, 9999.0, 0.0, 1.0, 250.0, 3.0, 28.0, 100.0, 800.0),
    troop!("Boss", 1000.0, 40.0, 10.0, 180.0, 5000.0, 0.3, 35.0, 0.0, 10000.0),
];

/// JavaScript `Math.round`: nearest integer, ties toward +infinity.
#[inline]
pub fn js_round(x: f64) -> f64 {
    let f = x.floor();
    if x - f >= 0.5 {
        f + 1.0
    } else {
        f
    }
}

/// JavaScript `x || fallback` for numbers (0 and NaN are falsy).
#[inline]
pub fn js_or(x: f64, fallback: f64) -> f64 {
    if x == 0.0 || x.is_nan() {
        fallback
    } else {
        x
    }
}
