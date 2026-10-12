//! Port of `SimulatingBot` (the "Player vs AI" bot) including its Web Worker,
//! which brute-forces 3-unit combinations by simulating whole battles.

use crate::game::{Controller, Game, Player, Side};
use crate::rng::Rng;
use crate::troops::*;

pub struct PendingReply {
    pub deliver_at: i64,
    pub troops: Vec<usize>,
    /// `enc` captured by the `onmessage` closure when the request was posted.
    pub enc: f64,
}

pub struct ClassicState {
    pub cooldown: i64,
    pub to_unlock: usize,
    pub rounds_at_opponents_half: i64,
    pub working: bool,
    pub pending: Option<PendingReply>,
}

impl ClassicState {
    pub fn new() -> ClassicState {
        ClassicState { cooldown: 100, to_unlock: 1, rounds_at_opponents_half: 0, working: false, pending: None }
    }
}

impl Default for ClassicState {
    fn default() -> Self {
        ClassicState::new()
    }
}

pub const CLASSIC_MAX_UNITS: usize = 7;

/// `SimulatingBot.encouragement()`
pub fn encouragement(me: &Player, en: &Player) -> f64 {
    let pd: f64 = me.units.iter().fold(0.0, |s, u| s + u.damage);
    let ed: f64 = en.units.iter().fold(0.0, |s, u| s + u.damage);
    let pl = me.units.len() as f64;
    let el = en.units.len() as f64;
    if pl != 0.0 && ed != 0.0 {
        ((el / pl) / (pd / ed)).sqrt()
    } else if el == 0.0 {
        0.0
    } else {
        10.0
    }
}

/// `SimulatingBot.shouldPull(increase, enc)`
pub fn should_pull(rounds: &mut i64, me: &Player, increase: i64, enc: f64) -> bool {
    if enc >= 10.0 {
        return false;
    }
    let Some(front) = me.units.first() else { return false };
    let half = CANVAS_WIDTH / 2.0;
    let own_half = if me.side == Side::Left { front.position < half } else { front.position > half };
    if own_half {
        *rounds = 0;
        return false;
    }
    let their_half = if me.side == Side::Left { front.position > half } else { front.position < half };
    if their_half {
        *rounds += increase;
        if *rounds > 2700 {
            return true;
        }
    }
    false
}

/// `SimulatingBot.tryToUnlock()` (also used by `LocalRLBot`).
pub fn try_to_unlock(to_unlock: &mut usize, me: &mut Player) {
    if !me.unlocked[NUM_TROOPS - 1] && me.money > TROOPS[*to_unlock].research_price * 1.25 {
        let rp = TROOPS[*to_unlock].research_price;
        if me.is_enough_money(rp) {
            me.money -= rp;
            me.unlocked[*to_unlock] = true;
        }
        *to_unlock += 1;
    }
}

/// `SimulatingBot.shouldSpawnBaseDestroyer(enc)` (also used by `LocalRLBot`).
pub fn should_spawn_base_destroyer(cooldown: &mut i64, me: &mut Player, mut enc: f64, rng: &mut Rng) {
    for u in &me.units {
        if u.kind == SHIELD || u.kind == TREBUCHET {
            enc = 1.0;
        }
    }
    if enc <= 0.4 {
        if me.money > 200.0 && rng.next_f64() < 0.2 {
            me.add_troop(CATAPULT);
        }
        if rng.next_f64() < 0.8 && me.unlocked[TREBUCHET] && me.unlocked[BOOMER] && me.unlocked[RANGE] {
            if me.is_enough_money(TROOPS[BOOMER].price + TROOPS[RANGE].price + TROOPS[TREBUCHET].price) {
                me.add_troop(BOOMER);
                me.add_troop(RANGE);
                me.add_troop(TREBUCHET);
                *cooldown = 300;
            }
        } else if me.unlocked[SHIELD] && enc <= 0.1 && me.unlocked[ADVANCED] {
            me.add_troop(ADVANCED);
            me.add_troop(SHIELD);
            *cooldown = 250;
        }
    }
}

pub fn after_move_army(game: &mut Game, p: usize, st: &mut ClassicState) {
    let time = game.time;
    let latency = game.worker_latency;
    let unit_ticks_per_frame = game.worker_unit_ticks_per_frame;
    let Game { players, rng, worker_rng, .. } = game;
    let (a, b) = players.split_at_mut(1);
    let (me, en) = if p == 0 { (&mut a[0], &mut b[0]) } else { (&mut b[0], &mut a[0]) };

    me.financial_aid();
    if me.money > 1800.0 {
        me.multiplier *= UPGRADE_FACTOR;
        me.money -= UPGRADE_COST;
    }
    let enc = encouragement(me, en);
    if enc > 50.0 && me.units.len() <= 1 {
        me.add_troop(BASIC);
    }
    // The "Mode:" label calls shouldPull(0, enc) when not in panic (side effect: resets counter).
    if !(enc > 2.0) {
        should_pull(&mut st.rounds_at_opponents_half, me, 0, enc);
    }
    if st.cooldown <= 0 && !should_pull(&mut st.rounds_at_opponents_half, me, 1, enc) {
        if enc >= 0.8 && !st.working && me.units.len() < me.max_units {
            st.working = true;
            let own: Vec<usize> = me.units.iter().map(|u| u.kind).collect();
            let enemy: Vec<usize> = en.units.iter().map(|u| u.kind).collect();
            let (troops, work) = worker_compute(&own, &enemy, &me.unlocked, worker_rng);
            let delay = latency + if unit_ticks_per_frame > 0.0 { (work / unit_ticks_per_frame).floor() as i64 } else { 0 };
            st.pending = Some(PendingReply { deliver_at: time - 1 + delay, troops, enc });
            st.cooldown = 10;
        }
        if !me.units.is_empty() {
            let front = me.units[0].position;
            let close = if me.side == Side::Left { front > CANVAS_WIDTH - 300.0 } else { front < 300.0 };
            if me.money > 1000.0 && close {
                should_spawn_base_destroyer(&mut st.cooldown, me, enc, rng);
            }
        }
        try_to_unlock(&mut st.to_unlock, me);
    }
    st.cooldown -= 1;
}

/// `botWorker.onmessage` — runs between frames once the worker has answered.
pub fn deliver_worker_reply(game: &mut Game, p: usize) {
    let now = game.time;
    let player = &mut game.players[p];
    let Controller::Classic(st) = &mut player.controller else { return };
    let due = matches!(&st.pending, Some(r) if r.deliver_at <= now);
    if !due {
        return;
    }
    let reply = st.pending.take().unwrap();
    st.working = false;
    let d = reply.troops;
    if !d.is_empty() {
        player.add_troop(d[0]);
    }
    if reply.enc > 1.8 {
        if let Some(&k) = d.get(1) {
            player.add_troop(k);
        }
    }
    if reply.enc > 2.8 {
        if let Some(&k) = d.get(2) {
            player.add_troop(k);
        }
    }
}

/// The worker's `onmessage`: try (almost) every 3-unit combo appended to our army,
/// simulate the battle and pick the best damage-per-gold.
///
/// Returns the chosen troops and the amount of work (unit-ticks) the *JS* worker
/// would have done, which the caller turns into a reply latency.
///
/// Note: the original checks `e[5]` (always undefined) for "quick mode", so the
/// 3-unit branch is always taken.
pub fn worker_compute(own: &[usize], enemy: &[usize], unlocked: &[bool; NUM_TROOPS], rng: &mut Rng) -> (Vec<usize>, f64) {
    let mut n = unlocked.iter().filter(|&&u| u).count();
    if n >= NUM_TROOPS - 2 {
        n = NUM_TROOPS - 2;
    }
    let mut best = -9999.0f64;
    let mut best_troops: Vec<usize> = Vec::new();
    let mut work = 0.0;
    let mut pl: Vec<usize> = Vec::with_capacity(own.len() + 3);
    for i in 0..n {
        if i >= 8 {
            continue;
        }
        for j in 0..n {
            if j >= 8 || (i == 6 && j == 6) {
                continue;
            }
            for k in 0..n {
                if k >= 8 || (i == 6 && k == 6) || (j == 6 && k == 6) {
                    continue;
                }
                pl.clear();
                pl.extend_from_slice(own);
                pl.push(i);
                pl.push(j);
                pl.push(k);
                let r = simulate(&pl, enemy, rng);
                work += r.js_unit_ticks;
                let score = r.damage / r.spending;
                if score > best && rng.next_f64() > 0.2 {
                    best = score;
                    best_troops = vec![i, j, k];
                }
            }
        }
    }
    (best_troops, work)
}

pub struct SimResult {
    pub damage: f64,
    pub spending: f64,
    /// Sum over ticks of living units, as the JS worker would have simulated (no early exit).
    pub js_unit_ticks: f64,
}

const SIM_MAX_TICKS: i64 = 120_000;
/// Longer than two full attack cycles of the slowest unit (Trebuchet: 300).
const STALL_WINDOW: i64 = 610;

/// `simulate(units1, units2)` in the worker: a headless `Game` between two plain
/// players with unlimited money, run until one side has no units.
///
/// Exact early exit: positions only move forward and health only goes down, so if
/// nothing changed over a window longer than any attack cycle, nothing ever will
/// (e.g. Catapult vs Catapult can never hit each other). The result and the random
/// stream are identical to running all 120 000 ticks.
pub fn simulate(units_left: &[usize], units_right: &[usize], rng: &mut Rng) -> SimResult {
    let mut left = Player::new(Side::Left, 0.0, false, 10, Controller::Plain);
    let mut right = Player::new(Side::Right, 0.0, false, 10, Controller::Plain);
    for &k in units_left {
        left.add_troop(k);
    }
    for &k in units_right {
        right.add_troop(k);
    }
    let mut g = Game::new(left, right, *rng, Rng::new(0));
    g.sim = true;
    let mut work = 0.0;
    let mut checkpoint: Vec<f64> = Vec::new();
    let mut scratch: Vec<f64> = Vec::new();
    while !g.is_over() && !g.players[0].units.is_empty() && !g.players[1].units.is_empty() && g.time < SIM_MAX_TICKS {
        g.tick();
        let alive = (g.players[0].units.len() + g.players[1].units.len()) as f64;
        work += alive;
        if g.time % STALL_WINDOW == 0 {
            scratch.clear();
            for p in &g.players {
                scratch.push(p.base.health);
                scratch.push(p.units.len() as f64);
                for u in &p.units {
                    scratch.push(u.position);
                    scratch.push(u.health);
                }
            }
            if !g.atomic_doom && scratch == checkpoint && !g.is_over() {
                work += alive * (SIM_MAX_TICKS - g.time) as f64;
                break;
            }
            std::mem::swap(&mut checkpoint, &mut scratch);
        }
    }
    *rng = g.rng;
    SimResult { damage: g.players[0].damage_dealt, spending: g.players[0].spending, js_unit_ticks: work }
}
