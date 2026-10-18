//! Faithful port of the game simulation in `index.ts` (`Trooper` + subclasses,
//! `Player`, `Base`, `Game.move`).
//!
//! The goal is *bit-for-bit* agreement with the browser game, including its quirks:
//! - `checkForDeath` removes units with `splice` inside `forEach`, so the unit right
//!   after a removed one is skipped that tick.
//! - `AtomicTroop.isInFront` loses health on *every* call, so call order and
//!   short-circuiting are reproduced exactly.
//! - A front ranged unit can get `timeAttack` called twice per tick (melee + range).
//! - Atomic fallout lasts `ATOMIC_DOOM_TICKS` after the latest bomb explodes (tick-based, as in index.ts).
//!
//! `rl/parity` checks this file against the real `index.js` tick by tick.

use crate::classic::{self, ClassicState};
use crate::dqn::{self, DqnState};
use crate::rng::Rng;
use crate::troops::*;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Side {
    Left,
    Right,
}

impl Side {
    pub fn index(self) -> usize {
        match self {
            Side::Left => 0,
            Side::Right => 1,
        }
    }
}

#[derive(Clone, Debug)]
pub struct Unit {
    pub kind: usize,
    pub side: Side,
    pub health: f64,
    pub max_health: f64,
    pub damage: f64,
    pub base_damage: f64,
    pub attack_speed: f64,
    pub speed: f64,
    pub span: f64,
    pub range: f64,
    pub price: f64,
    pub position: f64,
    pub target_time: Option<f64>,
    pub puppy: bool,
    pub multiplier: f64,
}

impl Unit {
    /// `new troopers[kind](side, player, ...)`; `puppy` is decided by the caller (Doggo rule).
    pub fn new(kind: usize, side: Side, multiplier: f64, puppy: bool) -> Unit {
        let s = &TROOPS[kind];
        let mut u = Unit {
            kind,
            side,
            health: s.health * multiplier,
            max_health: s.health * multiplier,
            damage: s.damage * multiplier,
            base_damage: s.base_damage,
            attack_speed: s.attack_speed,
            speed: s.speed,
            span: s.span,
            range: s.range,
            price: s.price,
            position: if side == Side::Left { 10.0 } else { CANVAS_WIDTH - 10.0 },
            target_time: None,
            puppy: false,
            multiplier,
        };
        if kind == DOGGO && puppy {
            u.puppy = true;
            u.health = 22.0 * multiplier;
            u.max_health = 22.0 * multiplier;
            u.damage = 3.2 * multiplier;
            u.attack_speed = 10.0;
            u.speed = 2.2;
            u.span = 10.0;
        }
        u
    }

    #[inline]
    fn is_exploding(&self) -> bool {
        self.kind == BOOMER || self.kind == ATOMIC_BOMB
    }
}

#[derive(Clone, Debug)]
pub struct Base {
    pub health: f64,
    pub max_health: f64,
    /// `playerBase.level`; 0 means `undefined` (only the DQN/Http bots ever set it).
    pub level: f64,
}

impl Base {
    pub fn new() -> Base {
        Base { health: BASE_HEALTH, max_health: BASE_HEALTH, level: 0.0 }
    }
}

impl Default for Base {
    fn default() -> Self {
        Base::new()
    }
}

/// What runs in `afterMoveArmy` for a player.
#[derive(Clone)]
pub enum Controller {
    /// Plain `Player` (human, worker-simulation players). Also used for the RL agent:
    /// its decisions are applied *between* ticks (see `Game.move` hook in index.ts).
    Plain,
    /// `SimulatingBot` — the original "Player vs AI" bot.
    Classic(Box<ClassicState>),
    /// `LocalRLBot` — the existing DQN bot (`ultimate_dqn_model.json`).
    Dqn(Box<DqnState>),
}

#[derive(Clone)]
pub struct Player {
    pub side: Side,
    pub money: f64,
    pub check_money: bool,
    pub units: Vec<Unit>,
    pub base: Base,
    pub unlocked: [bool; NUM_TROOPS],
    pub max_units: usize,
    pub multiplier: f64,
    /// Base upgrades bought so far and the cap (training option; u32::MAX = unlimited like the game).
    pub upgrades: u32,
    pub max_upgrades: u32,
    /// Game time, kept in sync by `Game` so bookkeeping can timestamp events.
    pub clock: i64,
    /// What this player did during the game (for logs; never affects play).
    pub stats: PlayerStats,
    pub financial_aid: [bool; 3],
    /// `stats.damageDealt`
    pub damage_dealt: f64,
    /// `stats.spending`
    pub spending: f64,
    /// Money received for killing enemy units (not in the original; used for reward shaping).
    pub bounty_earned: f64,
    pub controller: Controller,
}

#[derive(Clone, Debug)]
pub struct PlayerStats {
    /// Troops bought / lost, by troop type.
    pub spawned: [u32; NUM_TROOPS],
    pub lost: [u32; NUM_TROOPS],
    /// Game time each troop was researched (-1 = never; Basic starts unlocked at 0).
    pub researched_at: [i64; NUM_TROOPS],
    pub upgrade_times: Vec<i64>,
}

impl PlayerStats {
    pub fn new() -> PlayerStats {
        let mut researched_at = [-1; NUM_TROOPS];
        researched_at[0] = 0;
        PlayerStats { spawned: [0; NUM_TROOPS], lost: [0; NUM_TROOPS], researched_at, upgrade_times: Vec::new() }
    }
}

impl Player {
    pub fn new(side: Side, money: f64, check_money: bool, max_units: usize, controller: Controller) -> Player {
        let mut unlocked = [false; NUM_TROOPS];
        unlocked[0] = true;
        Player {
            side,
            money,
            check_money,
            units: Vec::with_capacity(16),
            base: Base::new(),
            unlocked,
            max_units,
            multiplier: 1.0,
            upgrades: 0,
            max_upgrades: u32::MAX,
            clock: 0,
            stats: PlayerStats::new(),
            financial_aid: [true; 3],
            damage_dealt: 0.0,
            spending: 0.0,
            bounty_earned: 0.0,
            controller,
        }
    }

    #[inline]
    /// Unlock troop `i` (the caller has paid).
    pub fn unlock(&mut self, i: usize) {
        self.unlocked[i] = true;
        self.stats.researched_at[i] = self.clock;
    }

    /// Bookkeeping for a bought +20% upgrade (the caller applies it).
    pub fn note_upgrade(&mut self) {
        self.upgrades += 1;
        self.stats.upgrade_times.push(self.clock);
    }

    #[inline]
    pub fn can_upgrade(&self) -> bool {
        self.upgrades < self.max_upgrades
    }

    pub fn is_enough_money(&self, amount: f64) -> bool {
        !self.check_money || self.money >= amount
    }

    /// `Player.addTroop(index)`
    pub fn add_troop(&mut self, kind: usize) {
        if kind >= NUM_TROOPS {
            return;
        }
        let price = TROOPS[kind].price;
        if self.is_enough_money(price) && self.units.len() < self.max_units {
            self.spending += price;
            self.money -= price;
            let n = self.units.len();
            let puppy = kind == DOGGO && n >= 2 && self.units[n - 1].kind == DOGGO && self.units[n - 2].kind == DOGGO;
            self.units.push(Unit::new(kind, self.side, self.multiplier, puppy));
            self.stats.spawned[kind] += 1;
        }
    }

    /// `Player.afterMoveArmy` (financial aid part).
    #[inline]
    pub fn financial_aid(&mut self) {
        for i in 0..=2 {
            if self.financial_aid[i] && self.base.health < BASE_HEALTH / 4.0 * (i as f64 + 1.0) {
                self.money += 100.0;
                self.financial_aid[i] = false;
            }
        }
    }

    pub fn doggo_combo_ready(&self) -> bool {
        let n = self.units.len();
        n >= 2 && self.units[n - 1].kind == DOGGO && self.units[n - 2].kind == DOGGO
    }
}

#[derive(Clone)]
pub struct Game {
    pub players: [Player; 2],
    pub time: i64,
    pub atomic_doom: bool,
    /// Fallout ends at the start of the move made at this time (`Game.atomicDoomUntil`).
    pub doom_until: i64,
    pub rng: Rng,
    /// The classic bot's Web Worker runs in its own JS realm with its own `Math.random`.
    pub worker_rng: Rng,
    /// Ticks the nuke animation freezes movement (`deathAnimPending`); 0 = headless.
    pub nuke_freeze_ticks: i64,
    pub freeze_until: i64,
    /// Minimum ticks between the classic bot posting to its worker and the reply.
    pub worker_latency: i64,
    /// Extra reply delay: one tick per this many unit-ticks the JS worker simulates
    /// (~60k per 16.7 ms frame measured in V8). 0 disables (parity tests).
    pub worker_unit_ticks_per_frame: f64,
}

pub const ATOMIC_DOOM_TICKS: i64 = 1320; // 22 s at 60 ticks/s

#[inline]
fn in_front(me: &Unit, list: &[Unit], index: usize) -> bool {
    // ExplodingTroop.isInFront: never blocked by its own side.
    if me.is_exploding() && !list.is_empty() && list[0].side == me.side {
        return false;
    }
    if index == 0 || list.is_empty() {
        return false;
    }
    match me.side {
        Side::Left => {
            for i in (0..index).rev() {
                let o = &list[i];
                if me.position <= o.position && me.position + me.span / 2.0 + 2.0 > o.position - o.span / 2.0 {
                    return true;
                }
            }
        }
        Side::Right => {
            for i in (0..index).rev() {
                let o = &list[i];
                if me.position >= o.position && me.position - me.span / 2.0 - 2.0 < o.position + o.span / 2.0 {
                    return true;
                }
            }
        }
    }
    false
}

/// `AtomicTroop.isInFront` decays health on every call, before the actual check.
#[inline]
fn atomic_decay(u: &mut Unit) {
    if u.kind == ATOMIC_TROOP {
        u.health -= (u.max_health / 8.0) / CANVAS_WIDTH;
    }
}

#[inline]
fn default_attack(u: &mut Unit, enemies: &mut [Unit], dmg: &mut f64) {
    if let Some(e) = enemies.first_mut() {
        let actual = u.damage.min(e.health.max(0.0));
        *dmg += actual;
        e.health -= u.damage;
    }
}

/// `unit.attack(enemyTroopers, stats)`
fn attack(u: &mut Unit, enemies: &mut [Unit], dmg: &mut f64, rng: &mut Rng) {
    match u.kind {
        SHIELD => {
            if let Some(e) = enemies.first() {
                if e.kind != SHIELD {
                    u.damage = TROOPS[SHIELD].damage * u.multiplier;
                }
            }
            default_attack(u, enemies, dmg);
        }
        CATAPULT => {
            let blast = 60.0;
            for t in enemies.iter_mut() {
                let hit = match u.side {
                    Side::Left => u.position + u.range > t.position && u.position + u.range - blast < t.position,
                    Side::Right => u.position - u.range < t.position && u.position - u.range + blast > t.position,
                };
                if hit {
                    let actual = u.damage.min(t.health.max(0.0));
                    *dmg += actual;
                    t.health -= u.damage;
                }
            }
        }
        BOOMER => {
            if let Some(e) = enemies.first_mut() {
                let actual = u.damage.min(e.health.max(0.0));
                *dmg += actual;
                e.health -= u.damage;
            }
            u.health = 0.0;
        }
        ATOMIC_BOMB => {
            u.health = 0.0;
        }
        DOGGO => {
            if u.puppy {
                u.damage = rng.next_f64() * 6.0 * u.multiplier;
            }
            default_attack(u, enemies, dmg);
        }
        _ => default_attack(u, enemies, dmg),
    }
}

/// `unit.attackBase(base, stats)`
#[inline]
fn attack_base_hit(u: &mut Unit, base: &mut Base, dmg: &mut f64) {
    if u.is_exploding() {
        u.health = 0.0;
    }
    let actual = u.base_damage.min(base.health.max(0.0));
    *dmg += actual;
    base.health -= u.base_damage;
}

/// `unit.timeAttackBase(time, base, stats)` (Trooper / ExplodingTroop versions).
#[inline]
fn time_attack_base(u: &mut Unit, time: f64, base: &mut Base, dmg: &mut f64) {
    match u.target_time {
        None => u.target_time = Some(time + u.attack_speed),
        Some(t) => {
            if time >= t {
                attack_base_hit(u, base, dmg);
                u.target_time = None;
            }
        }
    }
}

/// `unit.timeAttack(time, enemyTroopers, stats)`
fn time_attack(
    u: &mut Unit,
    time: f64,
    enemies: &mut [Unit],
    enemy_base: &mut Base,
    dmg: &mut f64,
    rng: &mut Rng,
) {
    if u.kind == TREBUCHET {
        let in_range = match u.side {
            Side::Left => CANVAS_WIDTH - u.position - 55.0 < u.range,
            Side::Right => u.position - u.range - 55.0 < 0.0,
        };
        if in_range {
            time_attack_base(u, time, enemy_base, dmg);
        } else if let Some(e) = enemies.first() {
            // anti-stalemate decay against blocking trebuchets/catapults
            if e.kind == TREBUCHET || e.kind == CATAPULT {
                let distance = (u.position - e.position).abs();
                let collision = u.span / 2.0 + e.span / 2.0 + 5.0;
                if distance <= collision {
                    u.health -= 0.01;
                }
            }
        }
        return;
    }
    match u.target_time {
        None => u.target_time = Some(time + u.attack_speed),
        Some(t) => {
            if time >= t {
                attack(u, enemies, dmg, rng);
                u.target_time = None;
            }
        }
    }
}

impl Game {
    pub fn new(left: Player, right: Player, rng: Rng, worker_rng: Rng) -> Game {
        Game {
            players: [left, right],
            time: 0,
            atomic_doom: false,
            doom_until: 0,
            rng,
            worker_rng,
            nuke_freeze_ticks: 0,
            freeze_until: i64::MIN / 2,
            worker_latency: 1,
            worker_unit_ticks_per_frame: 0.0,
        }
    }

    #[inline]
    fn split(players: &mut [Player; 2], p: usize) -> (&mut Player, &mut Player) {
        let (a, b) = players.split_at_mut(1);
        if p == 0 {
            (&mut a[0], &mut b[0])
        } else {
            (&mut b[0], &mut a[0])
        }
    }

    #[inline]
    pub fn frozen(&self) -> bool {
        self.time <= self.freeze_until
    }

    #[inline]
    fn trigger_nuke_anim(&mut self) {
        if self.nuke_freeze_ticks > 0 {
            self.freeze_until = self.freeze_until.max(self.time + self.nuke_freeze_ticks);
        }
    }

    pub fn is_over(&self) -> bool {
        self.players[0].base.health <= 0.0 || self.players[1].base.health <= 0.0
    }

    #[inline]
    fn expire_fallout(&mut self) {
        if self.atomic_doom && self.time >= self.doom_until {
            self.atomic_doom = false;
        }
    }

    /// Work that happens between animation frames: fallout expiry and worker
    /// replies. Call once before each `tick` (the env and the parity harness do).
    pub fn pre_tick(&mut self) {
        for pl in self.players.iter_mut() {
            pl.clock = self.time;
        }
        self.expire_fallout();
        for p in 0..2 {
            if let Controller::Classic(_) = self.players[p].controller {
                classic::deliver_worker_reply(self, p);
            }
        }
    }

    /// `Game.move()` (minus drawing).
    pub fn tick(&mut self) {
        self.expire_fallout(); // start of Game.move (also covers worker simulations, which skip pre_tick)
        self.time += 1;
        for pl in self.players.iter_mut() {
            pl.clock = self.time;
        }
        self.move_army(0);
        self.move_army(1);

        if self.is_enemy_in_front(0) {
            self.attack_enemy_troop(0);
        }
        if self.is_enemy_in_front(1) {
            self.attack_enemy_troop(1);
        }
        if self.players[0].units.is_empty() {
            self.attack_base(1);
        }
        if self.players[1].units.is_empty() {
            self.attack_base(0);
        }
        if !self.players[0].units.is_empty() {
            self.handle_range_attack(1);
        }
        if !self.players[1].units.is_empty() {
            self.handle_range_attack(0);
        }
        self.check_for_death(0);
        self.check_for_death(1);
    }

    fn move_army(&mut self, p: usize) {
        if self.frozen() {
            return; // deathAnimPending
        }
        let doom = self.atomic_doom;
        {
            let (me, en) = Self::split(&mut self.players, p);
            let limit_left = CANVAS_WIDTH - BASE_SPAN - 10.0;
            let limit_right = BASE_SPAN + 10.0;
            for _ in 0..2 {
                for i in 0..me.units.len() {
                    atomic_decay(&mut me.units[i]);
                    if in_front(&me.units[i], &me.units, i) {
                        continue;
                    }
                    atomic_decay(&mut me.units[i]);
                    if in_front(&me.units[i], &en.units, 1) {
                        continue;
                    }
                    let u = &mut me.units[i];
                    match me.side {
                        Side::Left => {
                            if u.position < limit_left {
                                u.position += u.speed / 2.0;
                            }
                        }
                        Side::Right => {
                            if u.position > limit_right {
                                u.position -= u.speed / 2.0;
                            }
                        }
                    }
                }
            }
            if doom {
                for u in me.units.iter_mut() {
                    u.health -= 0.04;
                }
            }
        }
        self.after_move_army(p);
    }

    fn after_move_army(&mut self, p: usize) {
        let ctrl = std::mem::replace(&mut self.players[p].controller, Controller::Plain);
        let ctrl = match ctrl {
            Controller::Plain => {
                self.players[p].financial_aid();
                Controller::Plain
            }
            Controller::Classic(mut st) => {
                classic::after_move_army(self, p, &mut st);
                Controller::Classic(st)
            }
            Controller::Dqn(mut st) => {
                dqn::after_move_army(self, p, &mut st);
                Controller::Dqn(st)
            }
        };
        self.players[p].controller = ctrl;
    }

    fn is_enemy_in_front(&mut self, p: usize) -> bool {
        let (me, en) = Self::split(&mut self.players, p);
        if me.units.is_empty() {
            return false;
        }
        atomic_decay(&mut me.units[0]);
        in_front(&me.units[0], &en.units, 1)
    }

    fn attack_enemy_troop(&mut self, p: usize) {
        let time = self.time as f64;
        let Game { players, rng, .. } = self;
        let (me, en) = Self::split(players, p);
        let Player { units, damage_dealt, .. } = me;
        time_attack(&mut units[0], time, &mut en.units, &mut en.base, damage_dealt, rng);
    }

    fn handle_range_attack(&mut self, p: usize) {
        let time = self.time as f64;
        {
            let Game { players, rng, .. } = self;
            let (me, en) = Self::split(players, p);
            let side = me.side;
            let Player { units, damage_dealt, .. } = me;
            for u in units.iter_mut() {
                if u.range > 0.0 {
                    let front = en.units[0].position;
                    let ok = match side {
                        Side::Left => u.position + u.range >= front,
                        Side::Right => u.position - u.range <= front,
                    };
                    if ok {
                        time_attack(u, time, &mut en.units, &mut en.base, damage_dealt, rng);
                    }
                }
            }
        }
    }

    fn attack_base(&mut self, p: usize) {
        let time = self.time as f64;
        {
            let (me, en) = Self::split(&mut self.players, p);
            let side = me.side;
            let Player { units, damage_dealt, .. } = me;
            for u in units.iter_mut() {
                let ok = match side {
                    Side::Left => u.position >= CANVAS_WIDTH - 55.0 - u.range,
                    Side::Right => u.position <= 55.0 + u.range,
                };
                if ok {
                    time_attack_base(u, time, &mut en.base, damage_dealt);
                }
            }
        }
    }

    fn check_for_death(&mut self, p: usize) {
        let mut i = 0;
        let mut bombs_died = 0;
        {
            let (me, en) = Self::split(&mut self.players, p);
            // forEach + splice: the element after a removed one is skipped this tick.
            while i < me.units.len() {
                if me.units[i].health <= 0.0 {
                    let u = me.units.remove(i);
                    me.stats.lost[u.kind] += 1;
                    if u.kind == ATOMIC_BOMB {
                        bombs_died += 1;
                    } else {
                        let bounty = if u.kind == BOOMER {
                            u.price * 2.5
                        } else if u.kind == DOGGO && u.puppy {
                            u.price * 2.0
                        } else {
                            u.price * 3.0
                        };
                        en.money += bounty;
                        en.bounty_earned += bounty;
                    }
                }
                i += 1;
            }
        }
        if bombs_died > 0 {
            // explosion animation (movement freeze) + fallout for ATOMIC_DOOM_TICKS after the latest bomb
            self.trigger_nuke_anim();
            self.atomic_doom = true;
            self.doom_until = self.doom_until.max(self.time + ATOMIC_DOOM_TICKS);
        }
    }
}
