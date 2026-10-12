# Wars of Ages — Ultimate AI training

This folder trains a policy for the browser game with **PPO + league self-play** on a
**Rust port of the game engine**. The trained policy plays in the browser as `UltimateBot`
(menu: *Player vs Ultimate AI*).

```
rl/
  engine/            Rust crate `wars_engine` (engine + bots + RL env + Python bindings)
    src/game.rs        faithful port of Game / Player / troop classes from index.ts
    src/classic.rs     SimulatingBot ("Player vs AI") incl. its Web Worker brute-force search
    src/dqn.rs         LocalRLBot (the existing DQN, ultimate_dqn_model.json)
    src/obs.rs         observation / action-mask / action spec of the new agent
    src/env.rs         episodes, decision timing, reward components, parallel VecEnv
    src/python.rs      PyO3 module: wars_engine.VecEnv
  wars_rl/           Python package (PyTorch)
    train.py           PPO + league self-play trainer (every setting is a CLI flag)
    model.py           actor-critic (any depth/width; actor is browser-exportable)
    league.py          snapshot pool with prioritized fictitious self-play
    evaluate.py        win rates vs classic / dqn / random / other policies
    export.py          checkpoint -> ultimate_model.json for the browser
    gym_env.py         Gymnasium wrapper (single agent vs a built-in bot)
  parity/            proves the Rust port == the real index.js, tick for tick
  configs/           example training config
```

## Setup

```bash
# Rust (https://rustup.rs) and Python 3.9+
pip install torch numpy gymnasium maturin
pip install ./rl/engine          # builds the Rust engine as the `wars_engine` Python module
```

Re-run `pip install ./rl/engine` whenever you change Rust code.

## Train

```bash
cd rl
python -m wars_rl.train                                    # defaults
python -m wars_rl.train --config configs/ultimate.json     # or a JSON config
python -m wars_rl.train --actor-hidden 1024,1024,512 --critic-hidden 1024,1024,512 --run-dir runs/big
```

* Resumes automatically from `<run_dir>/latest.pt` (pass `--no-resume` to start over).
* Progress goes to stdout and `<run_dir>/log.jsonl`: rolling win/draw rate per opponent type,
  entropy, KL, explained variance, and a league summary.
* Every `--export-every` updates it writes `<run_dir>/ultimate_model.json` (the browser model).

### Opponents

Each episode the learner gets a random side and an opponent drawn from (`--p-*` flags):

| kind      | what it is |
|-----------|------------|
| `self`    | the current policy on the other side (both sides produce training data) |
| `past`    | a frozen snapshot from the league, chosen by PFSP: opponents it beats less often are played more often |
| `classic` | the original `SimulatingBot`, ported exactly (including its worker search) |
| `dqn`     | your existing `LocalRLBot` with `ultimate_dqn_model.json` |
| `random`  | uniformly random valid actions |

### Reward

`win_reward` (±1) at the end of the game, `draw_reward` for timeouts (default −0.5, so stalling
is not a "safe" result), plus shaping that fades to zero over the first `shaping_anneal_frac`
of training: base damage dealt minus taken, and kill bounty earned minus given. The Rust env
returns the raw components, so changing the reward is a few lines in `Trainer._rewards`.

## Evaluate

```bash
cd rl
python -m wars_rl.evaluate runs/ultimate/latest.pt --games 200          # vs classic, dqn, random
python -m wars_rl.evaluate ../ultimate_model.json --opponents classic   # the exported browser model
python -m wars_rl.evaluate runs/a/latest.pt --opponents runs/b/latest.pt
```

Games are split evenly between left and right. The output includes a 95% confidence interval.

## Use it in the game

```bash
cd rl && python -m wars_rl.export runs/ultimate/latest.pt ../ultimate_model.json
```

Then open the game and choose **Player vs Ultimate AI** (or *old bot vs Ultimate AI* /
*local reinforcement AI vs Ultimate AI*). `UltimateBot` runs the exported MLP in plain
TypeScript, so there is no extra dependency. Pass `greedy = true` to its constructor to always
play the arg-max action instead of sampling.

## What the agent sees and does

Decisions happen every `decision_interval` ticks (10 = 6 per second), *between* ticks, via a hook
at the start of `Game.move()`. The hook doesn't affect human players or the old bots.

* **Actions (26):** spawn troop *i* (12), research troop *i* in any order (12), upgrade
  (+20% stats for 1500), wait. Invalid actions are masked.
* **Observation (472 floats, ego-centric, mirrored so its own base is always at x=0):** money,
  base HP, upgrades, unit counts, fallout, financial-aid flags, both sides' unlocks, the action
  mask, time, doggo-combo flags, plus 10 slots per side × 20 features per unit (type, puppy,
  position, HP, attack timer, damage).

The spec is implemented twice, in `rl/engine/src/obs.rs` and `UltimateBot` in `index.ts`.
**If you change one, change the other and re-run the parity check.**

## Parity: is the Rust engine really the same game?

```bash
python3 rl/parity/check.py --quick     # ~2 min
python3 rl/parity/check.py             # longer games + rich starts (all unit types, nukes, puppies)
```

`run_js.js` loads the real `index.js` in Node, makes it deterministic (seeded `Math.random`,
`setTimeout` on game ticks, a synchronous fake Web Worker for the classic bot), and plays
scripted/classic/dqn matchups. The Rust binary plays the same scenarios, and `check.py` compares
every tick (money, bases, upgrades, unlocks, every unit's position/HP/attack timer) and every
agent observation. The port keeps the original quirks on purpose: units skipped after `splice`
inside `forEach`, Atomic Troop losing HP on every `isInFront` call, double `timeAttack` calls for
front ranged units, the always-true "quick mode" check in the worker, and so on.

Two browser-only effects are modelled approximately (both are off in the parity runs):

* **Nuke animation freeze** (`deathAnimPending`): movement pauses ~45 ticks after an Atomic Bomb (`nuke_freeze_ticks`).
* **Classic bot worker latency:** in the browser its brute-force search runs in a Web Worker and
  answers after however long the JS takes. The env delays the reply by
  `1 + simulated_unit_ticks / 60000` ticks, about V8's speed (`worker_unit_ticks_per_frame`).

## Speed

On 4 CPU cores: ~2.6M game ticks/s for agent-vs-agent games (≈260k decisions/s); the DQN bot
runs ~350k ticks/s. The classic bot is the slow one (a few thousand ticks/s), because every
decision simulates up to ~400 full battles, just like the original. Its Rust worker stops
battles that can provably never progress, e.g. Catapult vs Catapult (identical result, far less work).

## Using another RL library

`wars_rl.gym_env.WarsOfAgesEnv` is a standard Gymnasium env (one agent vs `classic` or `dqn`)
with `action_masks()`, so it works with e.g. sb3-contrib's `MaskablePPO`. For serious training,
use `wars_rl.train`: it batches 128 games through Rust in parallel and does league self-play,
which single-agent wrappers can't.
