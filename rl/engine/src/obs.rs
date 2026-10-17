//! Observation, action mask and action semantics for the new "Ultimate" agent.
//!
//! IMPORTANT: `UltimateBot.observe()` / `actionMask()` / `applyAction()` in
//! `index.ts` implement exactly the same thing for the browser. If you change
//! anything here, change it there too and re-run `rl/parity/check.sh`.
//!
//! Everything is ego-centric: "own" is the deciding player, and x positions are
//! mirrored so that the own base is always at 0 and the enemy base at 1.

use crate::game::{Game, Player, Side, Unit};
use crate::troops::*;

/// Actions: 0..12 spawn troop i, 12..24 research troop i, 24 upgrade (+20% stats), 25 wait.
pub const NUM_ACTIONS: usize = 26;
pub const ACTION_RESEARCH0: usize = 12;
pub const ACTION_UPGRADE: usize = 24;
pub const ACTION_WAIT: usize = 25;

pub const MAX_SLOTS: usize = 10;
pub const GLOBAL_FEATURES: usize = 72;
pub const UNIT_FEATURES: usize = 20;
pub const OBS_SIZE: usize = GLOBAL_FEATURES + 2 * MAX_SLOTS * UNIT_FEATURES; // 472

/// Time scale used for the `time` feature (10 minutes at 60 ticks/s).
pub const TIME_SCALE: f64 = 36_000.0;

pub fn action_mask(me: &Player, atomic_doom: bool, mask: &mut [bool]) {
    debug_assert!(mask.len() >= NUM_ACTIONS);
    let room = me.units.len() < me.max_units;
    for i in 0..NUM_TROOPS {
        mask[i] = me.unlocked[i] && me.money >= TROOPS[i].price && room && !(i == ATOMIC_BOMB && atomic_doom);
        mask[ACTION_RESEARCH0 + i] = !me.unlocked[i] && me.money >= TROOPS[i].research_price;
    }
    mask[ACTION_UPGRADE] = me.money >= UPGRADE_COST && me.can_upgrade();
    mask[ACTION_WAIT] = true;
}

/// `UltimateBot.applyAction(a)`. Invalid actions are ignored (treated as wait).
pub fn apply_action(game: &mut Game, p: usize, action: usize) {
    let doom = game.atomic_doom;
    let me = &mut game.players[p];
    let mut mask = [false; NUM_ACTIONS];
    action_mask(me, doom, &mut mask);
    if action >= NUM_ACTIONS || !mask[action] {
        return;
    }
    if action < NUM_TROOPS {
        me.add_troop(action);
    } else if action < ACTION_UPGRADE {
        let i = action - ACTION_RESEARCH0;
        me.money -= TROOPS[i].research_price;
        me.unlocked[i] = true;
    } else if action == ACTION_UPGRADE {
        me.multiplier *= UPGRADE_FACTOR;
        me.money -= UPGRADE_COST;
        me.upgrades += 1;
    }
}

#[inline]
fn ego_x(side: Side, position: f64) -> f64 {
    match side {
        Side::Left => position / CANVAS_WIDTH,
        Side::Right => (CANVAS_WIDTH - position) / CANVAS_WIDTH,
    }
}

#[inline]
fn b(x: bool) -> f64 {
    if x {
        1.0
    } else {
        0.0
    }
}

fn money_features(m: f64) -> [f64; 2] {
    [m.min(200.0) / 200.0, (1.0 + m.max(0.0)).ln() / 8.0]
}

fn unit_features(u: &Unit, side: Side, time: f64, out: &mut [f64]) {
    out[0] = 1.0;
    out[1 + u.kind] = 1.0;
    out[13] = b(u.puppy);
    out[14] = ego_x(side, u.position);
    out[15] = (u.health / u.max_health).max(0.0).min(1.0);
    out[16] = (u.health.max(0.0) / 200.0).min(5.0);
    if let Some(t) = u.target_time {
        out[17] = 1.0;
        out[18] = ((t - time) / u.attack_speed).max(0.0).min(1.0);
    }
    out[19] = (1.0 + u.damage.max(0.0)).ln() / 5.0;
}

/// Write the observation of player `p` into `out` (length `OBS_SIZE`).
pub fn observe(game: &Game, p: usize, out: &mut [f32]) {
    debug_assert_eq!(out.len(), OBS_SIZE);
    let me = &game.players[p];
    let en = &game.players[1 - p];
    let time = game.time as f64;
    let mut g = [0f64; OBS_SIZE];

    let mut k = 0;
    let mut push = |g: &mut [f64; OBS_SIZE], v: f64| {
        g[k] = v;
        k += 1;
    };
    for v in money_features(me.money) {
        push(&mut g, v);
    }
    for v in money_features(en.money) {
        push(&mut g, v);
    }
    push(&mut g, me.base.health.max(0.0) / BASE_HEALTH);
    push(&mut g, en.base.health.max(0.0) / BASE_HEALTH);
    push(&mut g, me.multiplier.ln() / UPGRADE_FACTOR.ln() / 10.0);
    push(&mut g, en.multiplier.ln() / UPGRADE_FACTOR.ln() / 10.0);
    push(&mut g, me.units.len() as f64 / MAX_SLOTS as f64);
    push(&mut g, en.units.len() as f64 / MAX_SLOTS as f64);
    push(&mut g, b(game.atomic_doom));
    for i in 0..3 {
        push(&mut g, b(me.financial_aid[i]));
    }
    for i in 0..3 {
        push(&mut g, b(en.financial_aid[i]));
    }
    for i in 0..NUM_TROOPS {
        push(&mut g, b(me.unlocked[i]));
    }
    for i in 0..NUM_TROOPS {
        push(&mut g, b(en.unlocked[i]));
    }
    let mut mask = [false; NUM_ACTIONS];
    action_mask(me, game.atomic_doom, &mut mask);
    for m in mask {
        push(&mut g, b(m));
    }
    push(&mut g, (time / TIME_SCALE).min(1.0));
    push(&mut g, b(me.doggo_combo_ready()));
    push(&mut g, b(en.doggo_combo_ready()));
    let hp_sum = |p: &Player| p.units.iter().fold(0.0, |s, u| s + u.health.max(0.0));
    push(&mut g, (hp_sum(me) / 1000.0).min(3.0));
    push(&mut g, (hp_sum(en) / 1000.0).min(3.0));
    debug_assert_eq!(k, GLOBAL_FEATURES);

    for (slot_base, player) in [(GLOBAL_FEATURES, me), (GLOBAL_FEATURES + MAX_SLOTS * UNIT_FEATURES, en)] {
        for (s, u) in player.units.iter().take(MAX_SLOTS).enumerate() {
            let off = slot_base + s * UNIT_FEATURES;
            unit_features(u, me.side, time, &mut g[off..off + UNIT_FEATURES]);
        }
    }
    for (o, v) in out.iter_mut().zip(g.iter()) {
        *o = *v as f32;
    }
}
