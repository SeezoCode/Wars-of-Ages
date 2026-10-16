//! Rust half of the parity test: plays a scenario and prints the same JSONL trace
//! as `rl/parity/run_js.js`.
//!   cargo run --release --bin parity -- scenario.json > rust.jsonl

use std::sync::Arc;

use serde::Deserialize;
use serde_json::json;

use wars_engine::classic::{ClassicState, CLASSIC_MAX_UNITS};
use wars_engine::dqn::{DqnNet, DqnState};
use wars_engine::game::{Controller, Game, Player, Side, Unit};
use wars_engine::obs::{self, ACTION_WAIT, NUM_ACTIONS, OBS_SIZE};
use wars_engine::rng::Rng;

#[derive(Deserialize)]
struct Scenario {
    seed_main: u32,
    seed_worker: u32,
    seed_script: u32,
    left: String,
    right: String,
    max_ticks: i64,
    action_prob: f64,
    worker_latency: i64,
    dqn_model: String,
    #[serde(default = "default_money")]
    start_money: f64,
}

fn default_money() -> f64 {
    55.0
}

fn unit_state(u: &Unit) -> serde_json::Value {
    json!([u.kind, if u.puppy { 1 } else { 0 }, u.position, u.health, u.target_time.unwrap_or(-1.0)])
}

fn main() {
    let path = std::env::args().nth(1).expect("usage: parity scenario.json");
    let scen: Scenario = serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
    let mut dqn: Option<Arc<DqnNet>> = None;
    let money = scen.start_money;
    let _ = money;
    let mut make = |kind: &str, side: Side| -> Player {
        match kind {
            "script" => Player::new(side, scen.start_money, true, 10, Controller::Plain),
            "classic" => Player::new(side, scen.start_money, true, CLASSIC_MAX_UNITS, Controller::Classic(Box::new(ClassicState::new()))),
            "dqn" => {
                if dqn.is_none() {
                    let p = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..").join(&scen.dqn_model);
                    dqn = Some(Arc::new(DqnNet::from_file(p.to_str().unwrap()).unwrap()));
                }
                Player::new(side, scen.start_money, true, 10, Controller::Dqn(Box::new(DqnState::new(dqn.clone().unwrap()))))
            }
            k => panic!("unknown kind {k}"),
        }
    };
    let left = make(&scen.left, Side::Left);
    let right = make(&scen.right, Side::Right);
    let mut game = Game::new(left, right, Rng::new(scen.seed_main), Rng::new(scen.seed_worker));
    game.nuke_freeze_ticks = 0;
    game.worker_latency = scen.worker_latency;
    game.worker_unit_ticks_per_frame = 0.0;
    let scripted = [scen.left == "script", scen.right == "script"];
    let mut script_rng = [Rng::new(scen.seed_script), Rng::new(scen.seed_script.wrapping_add(1))];

    let mut lines: Vec<String> = Vec::new();
    let mut obs_buf = vec![0f32; OBS_SIZE];
    loop {
        game.pre_tick();
        let mut actions = [None, None];
        for p in 0..2 {
            if scripted[p] && game.time % 10 == 0 {
                obs::observe(&game, p, &mut obs_buf);
                let side = if p == 0 { "left" } else { "right" };
                // f32 -> f64 is exact, so JSON matches JS's Float32Array -> number
                let v: Vec<f64> = obs_buf.iter().map(|&x| x as f64).collect();
                lines.push(json!({"obs": side, "t": game.time, "v": v}).to_string());
                let mut mask = [false; NUM_ACTIONS];
                obs::action_mask(&game.players[p], game.atomic_doom, &mut mask);
                let valid: Vec<usize> = (0..NUM_ACTIONS).filter(|&a| mask[a] && a != ACTION_WAIT).collect();
                let mut a = ACTION_WAIT;
                if script_rng[p].next_f64() < scen.action_prob && !valid.is_empty() {
                    a = valid[(script_rng[p].next_f64() * valid.len() as f64).floor() as usize];
                }
                actions[p] = Some(a);
            }
        }
        for p in 0..2 {
            if let Some(a) = actions[p] {
                obs::apply_action(&mut game, p, a);
            }
        }
        game.tick();
        let pl = &game.players;
        let unl = |p: &Player| p.unlocked.iter().map(|&u| if u { '1' } else { '0' }).collect::<String>();
        lines.push(
            json!({
                "t": game.time,
                "s": [pl[0].money, pl[1].money, pl[0].base.health, pl[1].base.health,
                      pl[0].multiplier, pl[1].multiplier, if game.atomic_doom { 1 } else { 0 }, unl(&pl[0]), unl(&pl[1])],
                "u0": pl[0].units.iter().map(unit_state).collect::<Vec<_>>(),
                "u1": pl[1].units.iter().map(unit_state).collect::<Vec<_>>(),
            })
            .to_string(),
        );
        if game.is_over() || game.time >= scen.max_ticks {
            break;
        }
    }
    println!("{}", lines.join("\n"));
}
