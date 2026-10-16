//! Speed / sanity benchmark:
//!   cargo run --release --bin bench -- [games] [dqn_model.json]
//! Plays random-agent vs classic, random-agent vs dqn and classic vs dqn.

use std::sync::Arc;
use std::time::Instant;

use wars_engine::dqn::DqnNet;
use wars_engine::env::{Env, EnvConfig, Kind, NUM_REWARD_COMPONENTS};
use wars_engine::obs::{NUM_ACTIONS, OBS_SIZE};
use wars_engine::rng::Rng;

fn play(env: &mut Env, rng: &mut Rng) -> (i8, i64, u64) {
    let mut obs = vec![0f32; 2 * OBS_SIZE];
    let mut mask = vec![false; 2 * NUM_ACTIONS];
    let mut rew = [[0f32; NUM_REWARD_COMPONENTS]; 2];
    let mut decisions = 0u64;
    while !env.done {
        env.observe(&mut obs, &mut mask);
        let mut acts = [25usize; 2];
        for p in 0..2 {
            // random valid action, but wait 70% of the time
            if rng.next_f64() < 0.3 {
                let valid: Vec<usize> = (0..NUM_ACTIONS).filter(|&a| mask[p * NUM_ACTIONS + a]).collect();
                acts[p] = valid[rng.below(valid.len())];
            }
        }
        env.step(acts, &mut rew);
        decisions += 1;
    }
    (env.winner, env.game.time, decisions)
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let games: usize = args.get(1).and_then(|s| s.parse().ok()).unwrap_or(20);
    let model = args.get(2).cloned().unwrap_or("../../ultimate_dqn_model.json".into());
    let dqn = DqnNet::from_file(&model).ok().map(Arc::new);
    if dqn.is_none() {
        eprintln!("(no dqn model at {model}; skipping dqn matchups)");
    }
    let cfg = Arc::new(EnvConfig::default());
    let mut rng = Rng::new(12345);
    let mut matchups = vec![(Kind::Agent, Kind::Agent), (Kind::Agent, Kind::Classic)];
    if dqn.is_some() {
        matchups.push((Kind::Agent, Kind::Dqn));
        matchups.push((Kind::Classic, Kind::Dqn));
        matchups.push((Kind::Dqn, Kind::Classic));
    }
    for (l, r) in matchups {
        let mut env = Env::new(cfg.clone(), dqn.clone());
        let t0 = Instant::now();
        let mut ticks = 0i64;
        let mut decisions = 0u64;
        let mut wins = [0usize; 3];
        for g in 0..games {
            env.reset(g as u64 * 7919 + 1, l, r).unwrap();
            let (w, t, d) = play(&mut env, &mut rng);
            ticks += t;
            decisions += d;
            wins[if w == 0 { 0 } else if w == 1 { 1 } else { 2 }] += 1;
        }
        let dt = t0.elapsed().as_secs_f64();
        println!(
            "{:?} vs {:?}: L {} / R {} / draw {} | avg {:.0} ticks | {:.0} ticks/s, {:.0} decisions/s, {:.2} s/game",
            l,
            r,
            wins[0],
            wins[1],
            wins[2],
            ticks as f64 / games as f64,
            ticks as f64 / dt,
            decisions as f64 / dt,
            dt / games as f64
        );
    }
}
