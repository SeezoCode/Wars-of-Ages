//! RL environment on top of the engine.
//!
//! Timing contract (mirrors the `decide`/`applyAction` hook at the start of
//! `Game.move()` in index.ts): agent players decide *between* ticks, whenever
//! `game.time % decision_interval == 0`, from the same state, and actions are
//! applied left player first. Built-in bots (classic / dqn) act inside their own
//! `afterMoveArmy` every tick, exactly as in the browser.

use std::sync::Arc;

use rayon::prelude::*;

use crate::classic::{ClassicState, CLASSIC_MAX_UNITS};
use crate::dqn::{DqnNet, DqnState};
use crate::game::{Controller, Game, Player, Side};
use crate::obs::{self, NUM_ACTIONS, OBS_SIZE};
use crate::rng::{derive_seed, Rng};
use crate::troops::BASE_HEALTH;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Kind {
    /// Controlled from outside (the RL agent or a policy opponent).
    Agent,
    /// The original `SimulatingBot`.
    Classic,
    /// The existing DQN `LocalRLBot`.
    Dqn,
}

impl Kind {
    pub fn parse(s: &str) -> Result<Kind, String> {
        match s {
            "agent" => Ok(Kind::Agent),
            "classic" => Ok(Kind::Classic),
            "dqn" => Ok(Kind::Dqn),
            _ => Err(format!("unknown player kind '{s}' (expected agent|classic|dqn)")),
        }
    }
}

#[derive(Clone, Debug)]
pub struct EnvConfig {
    pub decision_interval: i64,
    /// Episode is a draw after this many ticks.
    pub max_ticks: i64,
    pub start_money: f64,
    pub agent_max_units: usize,
    pub classic_max_units: usize,
    pub dqn_max_units: usize,
    /// Movement freeze during the nuke animation in the browser (0 = headless/parity).
    pub nuke_freeze_ticks: i64,
    /// Classic bot worker reply delay: `worker_latency + js_work / worker_unit_ticks_per_frame` ticks.
    pub worker_latency: i64,
    pub worker_unit_ticks_per_frame: f64,
}

impl Default for EnvConfig {
    fn default() -> Self {
        EnvConfig {
            decision_interval: 10,
            max_ticks: 36_000,
            start_money: 55.0,
            agent_max_units: 10,
            classic_max_units: CLASSIC_MAX_UNITS,
            dqn_max_units: 10,
            nuke_freeze_ticks: 45,
            worker_latency: 1,
            worker_unit_ticks_per_frame: 60_000.0,
        }
    }
}

/// Per-side reward components of the last step (raw, unweighted).
pub const NUM_REWARD_COMPONENTS: usize = 4;
// [enemy base damage / 800, own base damage / 800, bounty earned / 100, bounty given / 100]

pub const WINNER_NONE: i8 = -1;
pub const WINNER_DRAW: i8 = 2;

pub struct Env {
    pub game: Game,
    pub kinds: [Kind; 2],
    pub done: bool,
    pub winner: i8,
    cfg: Arc<EnvConfig>,
    dqn: Option<Arc<DqnNet>>,
}

fn make_player(side: Side, kind: Kind, cfg: &EnvConfig, dqn: &Option<Arc<DqnNet>>) -> Result<Player, String> {
    Ok(match kind {
        Kind::Agent => Player::new(side, cfg.start_money, true, cfg.agent_max_units, Controller::Plain),
        Kind::Classic => Player::new(
            side,
            cfg.start_money,
            true,
            cfg.classic_max_units,
            Controller::Classic(Box::new(ClassicState::new())),
        ),
        Kind::Dqn => {
            let net = dqn.clone().ok_or("dqn opponent requested but no dqn_model was loaded")?;
            Player::new(side, cfg.start_money, true, cfg.dqn_max_units, Controller::Dqn(Box::new(DqnState::new(net))))
        }
    })
}

impl Env {
    pub fn new(cfg: Arc<EnvConfig>, dqn: Option<Arc<DqnNet>>) -> Env {
        let left = Player::new(Side::Left, cfg.start_money, true, cfg.agent_max_units, Controller::Plain);
        let right = Player::new(Side::Right, cfg.start_money, true, cfg.agent_max_units, Controller::Plain);
        Env {
            game: Game::new(left, right, Rng::new(1), Rng::new(2)),
            kinds: [Kind::Agent, Kind::Agent],
            done: true,
            winner: WINNER_NONE,
            cfg,
            dqn,
        }
    }

    pub fn reset(&mut self, seed: u64, left: Kind, right: Kind) -> Result<(), String> {
        let l = make_player(Side::Left, left, &self.cfg, &self.dqn)?;
        let r = make_player(Side::Right, right, &self.cfg, &self.dqn)?;
        let mut g = Game::new(l, r, Rng::new(derive_seed(seed, 0)), Rng::new(derive_seed(seed, 1)));
        g.nuke_freeze_ticks = self.cfg.nuke_freeze_ticks;
        g.worker_latency = self.cfg.worker_latency;
        g.worker_unit_ticks_per_frame = self.cfg.worker_unit_ticks_per_frame;
        self.game = g;
        self.kinds = [left, right];
        self.done = false;
        self.winner = WINNER_NONE;
        self.advance();
        Ok(())
    }

    fn has_agent(&self) -> bool {
        self.kinds[0] == Kind::Agent || self.kinds[1] == Kind::Agent
    }

    fn check_done(&mut self) -> bool {
        let l = self.game.players[0].base.health <= 0.0;
        let r = self.game.players[1].base.health <= 0.0;
        if l || r {
            self.done = true;
            self.winner = if l && r {
                WINNER_DRAW
            } else if r {
                0
            } else {
                1
            };
        } else if self.game.time >= self.cfg.max_ticks {
            self.done = true;
            self.winner = WINNER_DRAW;
        }
        self.done
    }

    /// Run ticks until an agent must decide (pre_tick of that tick already done) or the game ends.
    fn advance(&mut self) {
        let k = self.cfg.decision_interval.max(1);
        let agent = self.has_agent();
        loop {
            self.game.pre_tick();
            if agent && self.game.time % k == 0 {
                return;
            }
            self.game.tick();
            if self.check_done() {
                return;
            }
        }
    }

    /// Apply agent actions (ignored for non-agent sides), then advance to the next decision.
    pub fn step(&mut self, actions: [usize; 2], rew: &mut [[f32; NUM_REWARD_COMPONENTS]; 2]) {
        *rew = [[0.0; NUM_REWARD_COMPONENTS]; 2];
        if self.done {
            return;
        }
        let hp0 = [self.game.players[0].base.health.max(0.0), self.game.players[1].base.health.max(0.0)];
        let bounty0 = [self.game.players[0].bounty_earned, self.game.players[1].bounty_earned];
        for p in 0..2 {
            if self.kinds[p] == Kind::Agent {
                obs::apply_action(&mut self.game, p, actions[p]);
            }
        }
        self.game.tick();
        if !self.check_done() {
            self.advance();
        }
        let hp1 = [self.game.players[0].base.health.max(0.0), self.game.players[1].base.health.max(0.0)];
        let bounty1 = [self.game.players[0].bounty_earned, self.game.players[1].bounty_earned];
        for p in 0..2 {
            let e = 1 - p;
            rew[p][0] = ((hp0[e] - hp1[e]) / BASE_HEALTH) as f32;
            rew[p][1] = ((hp0[p] - hp1[p]) / BASE_HEALTH) as f32;
            rew[p][2] = ((bounty1[p] - bounty0[p]) / 100.0) as f32;
            rew[p][3] = ((bounty1[e] - bounty0[e]) / 100.0) as f32;
        }
    }

    pub fn observe(&self, obs_out: &mut [f32], mask_out: &mut [bool]) {
        for p in 0..2 {
            obs::observe(&self.game, p, &mut obs_out[p * OBS_SIZE..(p + 1) * OBS_SIZE]);
            let m = &mut mask_out[p * NUM_ACTIONS..(p + 1) * NUM_ACTIONS];
            if self.kinds[p] == Kind::Agent && !self.done {
                obs::action_mask(&self.game.players[p], self.game.atomic_doom, m);
            } else {
                m.fill(false);
                m[obs::ACTION_WAIT] = true;
            }
        }
    }
}

/// A batch of independent environments stepped in parallel.
pub struct VecEnv {
    pub envs: Vec<Env>,
    pub obs: Vec<f32>,
    pub mask: Vec<bool>,
    pub rew: Vec<[[f32; NUM_REWARD_COMPONENTS]; 2]>,
    pool: rayon::ThreadPool,
}

impl VecEnv {
    pub fn new(n: usize, cfg: EnvConfig, dqn: Option<Arc<DqnNet>>, threads: usize) -> VecEnv {
        let cfg = Arc::new(cfg);
        let pool = rayon::ThreadPoolBuilder::new().num_threads(threads).build().expect("thread pool");
        VecEnv {
            envs: (0..n).map(|_| Env::new(cfg.clone(), dqn.clone())).collect(),
            obs: vec![0.0; n * 2 * OBS_SIZE],
            mask: vec![false; n * 2 * NUM_ACTIONS],
            rew: vec![[[0.0; NUM_REWARD_COMPONENTS]; 2]; n],
            pool,
        }
    }

    pub fn observe_all(&mut self) {
        let envs = &self.envs;
        let obs = &mut self.obs;
        let mask = &mut self.mask;
        self.pool.install(|| {
            obs.par_chunks_mut(2 * OBS_SIZE)
                .zip(mask.par_chunks_mut(2 * NUM_ACTIONS))
                .zip(envs.par_iter())
                .for_each(|((o, m), e)| e.observe(o, m));
        });
    }

    pub fn step(&mut self, actions: &[[usize; 2]]) {
        assert_eq!(actions.len(), self.envs.len());
        let envs = &mut self.envs;
        let rew = &mut self.rew;
        self.pool.install(|| {
            envs.par_iter_mut()
                .zip(rew.par_iter_mut())
                .zip(actions.par_iter())
                .for_each(|((e, r), a)| e.step(*a, r));
        });
        self.observe_all();
    }
}
