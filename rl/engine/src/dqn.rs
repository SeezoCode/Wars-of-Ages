//! Port of `LocalRLBot` — the existing dueling-DQN bot that plays from
//! `ultimate_dqn_model.json`. Used as a benchmark opponent.
//!
//! Float32 rounding is reproduced where JS stores into `Float32Array`s.

use std::collections::BTreeMap;
use std::sync::Arc;

use crate::classic::{should_spawn_base_destroyer, try_to_unlock};
use crate::game::{Game, Player, Side};
use crate::troops::*;

pub const INPUT: usize = 148;
pub const H1: usize = 256;
pub const H2: usize = 128;
pub const OUT: usize = 14;
const UPGRADE_ACTION: usize = 12;
const WAIT_ACTION: usize = 13;

const META_HP: [f64; 12] = [20.0, 12.0, 20.0, 36.0, 115.0, 15.0, 1.0, 30.0, 5.0, 280.0, 5000.0, 1000.0];
const META_RANGE: [f64; 12] = [0.0, 10.0, 79.0, 0.0, 0.0, 140.0, 40.0, 0.0, 210.0, 0.0, 100.0, 0.0];

fn meta_dps(kind: usize) -> f64 {
    match kind {
        0 => 4.4 / 40.0,
        1 => 2.3 / 13.0,
        2 => 4.3 / 50.0,
        3 => 15.0 / 70.0,
        4 => 3.0 / 200.0,
        5 => 3.2 / 100.0,
        6 => 50.0 / 17.0,
        7 => 30.0 / 60.0,
        8 => 100.0 / 300.0,
        9 => 0.6 / 1.0,
        10 => 99.0,
        _ => 40.0 / 180.0,
    }
}

pub struct DqnNet {
    w1: Vec<f32>,
    b1: Vec<f32>,
    w2: Vec<f32>,
    b2: Vec<f32>,
    wv: Vec<f32>,
    bv: Vec<f32>,
    wa: Vec<f32>,
    ba: Vec<f32>,
}

impl DqnNet {
    pub fn from_json(text: &str) -> Result<DqnNet, String> {
        let v: serde_json::Value = serde_json::from_str(text).map_err(|e| e.to_string())?;
        let get = |k: &str, n: usize| -> Result<Vec<f32>, String> {
            let arr = v.get(k).and_then(|a| a.as_array()).ok_or(format!("missing {k}"))?;
            if arr.len() != n {
                return Err(format!("{k}: expected {n} values, got {}", arr.len()));
            }
            Ok(arr.iter().map(|x| x.as_f64().unwrap_or(0.0) as f32).collect())
        };
        Ok(DqnNet {
            w1: get("W1", H1 * INPUT)?,
            b1: get("b1", H1)?,
            w2: get("W2", H2 * H1)?,
            b2: get("b2", H2)?,
            wv: get("Wv", H2)?,
            bv: get("bv", 1)?,
            wa: get("Wa", OUT * H2)?,
            ba: get("ba", OUT)?,
        })
    }

    pub fn from_file(path: &str) -> Result<DqnNet, String> {
        let text = std::fs::read_to_string(path).map_err(|e| format!("{path}: {e}"))?;
        Self::from_json(&text)
    }

    /// `LocalRLBot.forwardPass` with the same f32 storage points.
    pub fn forward(&self, x: &[f32; INPUT]) -> [f32; OUT] {
        let mut h1 = [0f32; H1];
        for i in 0..H1 {
            let mut sum = self.b1[i] as f64;
            let off = i * INPUT;
            for j in 0..INPUT {
                sum += self.w1[off + j] as f64 * x[j] as f64;
            }
            h1[i] = (if sum > 0.0 { sum } else { 0.01 * sum }) as f32;
        }
        let mut h2 = [0f32; H2];
        for i in 0..H2 {
            let mut sum = self.b2[i] as f64;
            let off = i * H1;
            for j in 0..H1 {
                sum += self.w2[off + j] as f64 * h1[j] as f64;
            }
            h2[i] = (if sum > 0.0 { sum } else { 0.01 * sum }) as f32;
        }
        let mut value = self.bv[0] as f64;
        for i in 0..H2 {
            value += self.wv[i] as f64 * h2[i] as f64;
        }
        let mut adv = [0f32; OUT];
        let mut mean = 0f64;
        for a in 0..OUT {
            let mut sum = self.ba[a] as f64;
            let off = a * H2;
            for i in 0..H2 {
                sum += self.wa[off + i] as f64 * h2[i] as f64;
            }
            adv[a] = sum as f32;
            mean += sum;
        }
        mean /= OUT as f64;
        let mut out = [0f32; OUT];
        for a in 0..OUT {
            out[a] = (value + (adv[a] as f64 - mean)) as f32;
        }
        out
    }
}

#[derive(Clone)]
pub struct SnapUnit {
    kind: usize,
    health: f64,
    dist: f64,
}

#[derive(Clone)]
pub struct Snapshot {
    my: Vec<SnapUnit>,
    en: Vec<SnapUnit>,
    player_base: f64,
    enemy_base: f64,
    my_level: f64,
    en_level: f64,
    can_upgrade: bool,
    fallout: bool,
}

#[derive(Clone)]
pub struct DqnState {
    pub net: Arc<DqnNet>,
    pub cooldown: i64,
    pub to_unlock: usize,
    history: BTreeMap<i64, Snapshot>,
}

impl DqnState {
    pub fn new(net: Arc<DqnNet>) -> DqnState {
        DqnState { net, cooldown: 5, to_unlock: 1, history: BTreeMap::new() }
    }
}

#[inline]
fn dist_from_base(side: Side, position: f64) -> f64 {
    match side {
        Side::Right => js_round((CANVAS_WIDTH - 10.0) - position),
        Side::Left => js_round(position - 10.0),
    }
}

fn unit_power(u: &crate::game::Unit) -> f64 {
    if u.kind == BOOMER {
        return u.damage * 1.5;
    }
    if u.kind == TREBUCHET {
        return 15.0;
    }
    let dps = u.damage / u.attack_speed.max(1.0);
    let rm = if u.range > 50.0 { 1.35 } else { 1.0 };
    u.health + dps * 60.0 * rm
}

/// `LocalRLBot.encouragement()` (power based; same as `HttpBot`).
pub fn encouragement(me: &Player, en: &Player) -> f64 {
    let my_power = me.units.iter().fold(0.0, |s, u| s + unit_power(u));
    let en_power = en.units.iter().fold(0.0, |s, u| s + unit_power(u));
    if my_power == 0.0 && en_power == 0.0 {
        return 1.0;
    }
    if my_power == 0.0 && en_power > 0.0 {
        let d = dist_from_base(me.side, en.units[0].position);
        return (2.0 * (1.0 + ((CANVAS_WIDTH - d) / CANVAS_WIDTH) * 2.0)).min(10.0);
    }
    if en_power == 0.0 {
        return if me.money > 40.0 { 0.85 } else { 0.5 };
    }
    let d = dist_from_base(me.side, en.units[0].position);
    js_round(((en_power / my_power) * (0.7 + 0.9 * (1.0 - d.min(CANVAS_WIDTH).max(0.0) / CANVAS_WIDTH))) * 100.0) / 100.0
}

fn take_snapshot(me: &Player, en: &Player, fallout: bool) -> Snapshot {
    let snap_units = |p: &Player| -> Vec<SnapUnit> {
        p.units
            .iter()
            .map(|u| SnapUnit { kind: u.kind, health: js_round(u.health), dist: dist_from_base(me.side, u.position) })
            .collect()
    };
    let level = js_or(me.base.level, 1.0);
    Snapshot {
        my: snap_units(me),
        en: snap_units(en),
        player_base: js_round(me.base.health),
        enemy_base: js_round(en.base.health),
        my_level: level,
        en_level: js_or(en.base.level, 1.0),
        can_upgrade: me.money >= 350.0 * level,
        fallout,
    }
}

fn front_dist(snap: Option<&Snapshot>, enemy: bool) -> f64 {
    match snap {
        None => {
            if enemy {
                1.0
            } else {
                0.0
            }
        }
        Some(s) => {
            let arr = if enemy { &s.en } else { &s.my };
            match arr.first() {
                Some(u) => js_or(u.dist, 0.0) / 700.0,
                None => {
                    if enemy {
                        1.0
                    } else {
                        0.0
                    }
                }
            }
        }
    }
}

fn historical<'a>(st: &'a DqnState, time: i64, seconds_ago: i64) -> Option<&'a Snapshot> {
    let target = (time - seconds_ago * 60) as f64;
    let key = (target / 30.0).floor() as i64 * 30;
    st.history.get(&key)
}

fn extract_features(st: &DqnState, me: &Player, en: &Player, field: &Snapshot, time: i64) -> [f32; INPUT] {
    let mut f: Vec<f64> = Vec::with_capacity(INPUT);
    let mut my_counts = [0f64; 12];
    let mut en_counts = [0f64; 12];
    for u in &field.my {
        my_counts[u.kind] += 1.0 / 7.0;
    }
    for u in &field.en {
        en_counts[u.kind] += 1.0 / 7.0;
    }
    f.extend_from_slice(&my_counts);
    f.extend_from_slice(&en_counts);
    for i in 0..12 {
        f.push(if me.unlocked[i] { 1.0 } else { 0.0 });
    }

    #[derive(Default, Clone, Copy)]
    struct Zone {
        my_hp: f64,
        my_dps: f64,
        en_hp: f64,
        en_dps: f64,
        en_count: f64,
    }
    let mut zones = [Zone::default(); 7];
    for u in &field.my {
        let z = ((js_or(u.dist, 0.0) / 100.0).floor()).min(6.0).max(0.0) as usize;
        zones[z].my_hp += js_or(u.health, 0.0) / 200.0;
        zones[z].my_dps += js_or(meta_dps(u.kind), 0.0);
    }
    for u in &field.en {
        let z = ((js_or(u.dist, 700.0) / 100.0).floor()).min(6.0).max(0.0) as usize;
        zones[z].en_hp += js_or(u.health, 0.0) / 200.0;
        zones[z].en_dps += js_or(meta_dps(u.kind), 0.0);
        zones[z].en_count += 1.0 / 5.0;
    }
    for z in &zones {
        f.push(js_or(z.my_hp, 0.0).min(2.5));
        f.push(js_or(z.my_dps, 0.0).min(2.5));
        f.push(js_or(z.en_hp, 0.0).min(2.5));
        f.push(js_or(z.en_dps, 0.0).min(2.5));
        f.push(js_or(z.en_count, 0.0).min(2.5));
    }
    for i in 0..6 {
        if let Some(u) = field.my.get(i) {
            let hp = META_HP[u.kind];
            f.push(1.0);
            f.push(js_or(u.dist, 0.0) / 700.0);
            f.push((js_or(u.health, hp) / hp).min(2.0));
            f.push(js_or(META_RANGE[u.kind], 0.0) / 210.0);
        } else {
            f.extend_from_slice(&[0.0, 0.0, 0.0, 0.0]);
        }
    }
    for i in 0..6 {
        if let Some(u) = field.en.get(i) {
            let hp = META_HP[u.kind];
            f.push(1.0);
            f.push(js_or(u.dist, 700.0) / 700.0);
            f.push((js_or(u.health, hp) / hp).min(2.0));
            f.push(js_or(META_RANGE[u.kind], 0.0) / 210.0);
            f.push(if u.kind == SHIELD { 1.0 } else { 0.0 });
        } else {
            f.extend_from_slice(&[0.0, 1.0, 0.0, 0.0, 0.0]);
        }
    }
    let hist = |s: i64| historical(st, time, s);
    let my_now = front_dist(Some(field), false);
    let mys = [1, 2, 5, 10, 20].map(|s| front_dist(hist(s), false));
    let en_now = front_dist(Some(field), true);
    let ens = [1, 2, 5, 10, 20].map(|s| front_dist(hist(s), true));
    let gap = (en_now - my_now).min(1.0).max(-1.0);
    let money_norm = (js_or(me.money, 0.0) / 50.0).min(2.5);
    let enc_norm = (js_or(encouragement(me, en), 1.0) / 3.0).min(2.5);
    let my_base = (js_or(field.player_base, 800.0) / 2000.0).min(2.5);
    let en_base = (js_or(field.enemy_base, 800.0) / 2000.0).min(2.5);
    let cap = field.my.len() as f64 / 7.0;
    let n = field.my.len();
    let doggo = if n >= 2 && field.my[n - 1].kind == DOGGO && field.my[n - 2].kind == DOGGO { 1.0 } else { 0.0 };
    f.push(my_now);
    f.extend_from_slice(&mys);
    f.push(en_now);
    f.extend_from_slice(&ens);
    f.extend_from_slice(&[
        gap,
        money_norm,
        enc_norm,
        my_base,
        en_base,
        cap,
        doggo,
        (js_or(field.my_level, 1.0) / 5.0).min(2.0),
        (js_or(field.en_level, 1.0) / 5.0).min(2.0),
        if field.can_upgrade { 1.0 } else { 0.0 },
        if field.fallout { 1.0 } else { 0.0 },
    ]);
    debug_assert_eq!(f.len(), INPUT);
    let mut out = [0f32; INPUT];
    for (o, v) in out.iter_mut().zip(f.iter()) {
        *o = if v.is_nan() { 0.0 } else { *v as f32 };
    }
    out
}

pub fn after_move_army(game: &mut Game, p: usize, st: &mut DqnState) {
    let time = game.time;
    let fallout = game.atomic_doom;
    let Game { players, rng, .. } = game;
    let (a, b) = players.split_at_mut(1);
    let (me, en) = if p == 0 { (&mut a[0], &mut b[0]) } else { (&mut b[0], &mut a[0]) };

    for i in 0..=2 {
        let max_h = js_or(me.base.max_health, BASE_HEALTH);
        if me.financial_aid[i] && me.base.health < max_h / 4.0 * (i as f64 + 1.0) {
            me.money += 100.0;
            me.financial_aid[i] = false;
        }
    }

    if time % 30 == 0 {
        st.history.insert(time, take_snapshot(me, en, fallout));
        let oldest = time - 25 * 60;
        st.history.retain(|&k, _| k >= oldest);
    }

    let enc = encouragement(me, en);
    let mut allowed: Vec<usize> = Vec::with_capacity(OUT);
    if me.units.len() < me.max_units {
        for i in 0..NUM_TROOPS {
            if me.unlocked[i] && me.money >= TROOPS[i].price {
                allowed.push(i);
            }
        }
    }
    if me.money >= UPGRADE_COST && me.can_upgrade() {
        allowed.push(UPGRADE_ACTION);
    }
    if allowed.is_empty() || !me.units.is_empty() {
        allowed.push(WAIT_ACTION);
    }

    if st.cooldown <= 0 && !allowed.is_empty() {
        let field = take_snapshot(me, en, fallout);
        let x = extract_features(st, me, en, &field, time);
        let q = st.net.forward(&x);
        if q[0].is_nan() {
            st.cooldown = 100;
            return;
        }
        let mut max_q = f64::NEG_INFINITY;
        let mut min_q = f64::INFINITY;
        for &i in &allowed {
            let v = q[i] as f64;
            if v > max_q {
                max_q = v;
            }
            if v < min_q {
                min_q = v;
            }
        }
        let range = (max_q - min_q) + 1e-8;
        const TEMPERATURE: f64 = 0.1;
        let mut sum = 0.0;
        let mut exps: Vec<(usize, f64)> = Vec::with_capacity(allowed.len());
        for &i in &allowed {
            let nq = (q[i] as f64 - min_q) / range;
            let val = (nq / TEMPERATURE).exp();
            exps.push((i, val));
            sum += val;
        }
        let mut r = rng.next_f64() * sum;
        let mut chosen = allowed[0];
        for &(i, val) in &exps {
            r -= val;
            if r <= 0.0 {
                chosen = i;
                break;
            }
        }
        if chosen == UPGRADE_ACTION {
            if me.money >= UPGRADE_COST && rng.next_f64() > 0.5 {
                me.multiplier *= UPGRADE_FACTOR;
                me.money -= UPGRADE_COST;
                me.base.level = js_or(me.base.level, 1.0) + 1.0;
                me.spending += UPGRADE_COST;
                me.note_upgrade();
            }
        } else if chosen != WAIT_ACTION && me.unlocked[chosen] && !(chosen == ATOMIC_BOMB && fallout) {
            me.add_troop(chosen);
        }
        st.cooldown = if enc > 2.0 {
            15
        } else if enc >= 0.8 {
            25
        } else {
            40
        };
    }

    try_to_unlock(&mut st.to_unlock, me);
    if st.cooldown <= 0 {
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
