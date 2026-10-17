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

**Step-by-step guide (train from scratch, change model size, continue training, publish to GitHub): [TRAINING.md](TRAINING.md)**

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

### Why games stalemate (and what the agent has to learn)

Both sides are capped at 10 units and respawn instantly, so the middle of the map turns into a
wall. Crucially, `Player.attackBase` only runs when the defender has **no units at all**, so
ordinary troops almost never touch a base while the opponent is alive and spending. Ways
through: **Trebuchets** (hit the base for 100 every 300 ticks from 210 px, whatever is in front;
eight hits kill a base), wiping the whole enemy army at once (e.g. an Atomic Bomb), and
out-scaling the enemy with upgrades. A scripted "push, then park trebuchets" bot already beats
the DQN bot about half the time, while pure troop spam draws forever. That is why the trainer
uses base-damage shaping, front-line shaping, a 15-minute game limit, and a penalty for draws.

## Evaluate

```bash
cd rl
python -m wars_rl.evaluate runs/ultimate/latest.pt --games 200          # vs classic, dqn, random
python -m wars_rl.evaluate ../ultimate_model.json --opponents classic   # the exported browser model
python -m wars_rl.evaluate runs/a/latest.pt --opponents runs/b/latest.pt
```

Games are split evenly between left and right. The output includes a 95% confidence interval.

## Results of the included model

`ultimate_model.json` (repo root) / `rl/checkpoints/ultimate_v1.pt`: 620 PPO updates, 10.2M
decisions (~2,900 games), about 3.5 hours on 4 CPU cores, default config. Evaluated with
`python -m wars_rl.evaluate`, 100 games per opponent, both sides, sampled actions:

| opponent | wins | draws | losses |
|----------|------|-------|--------|
| `LocalRLBot` (your DQN, `ultimate_dqn_model.json`) | **100** | 0 | 0 |
| random spam (acts every decision) | **100** | 0 | 0 |
| `SimulatingBot` ("Player vs AI") | 0 | **100** | 0 |

It never loses, but it cannot break the classic bot yet. That bot defends right at its base and
answers every army with a brute-force-searched counter, so the only way through is Trebuchets.
The agent pushes all the way to the classic bot's base, but still fills the unit cap with Range
Troops instead of keeping a short line with Trebuchets close behind it in range. To get there:

* **More compute.** This run is small by RL standards. Resume from the included weights with
  `python -m wars_rl.train --init-from checkpoints/ultimate_v1.pt --run-dir runs/v2`, and raise
  `--p-classic` (classic games are the expensive ones), `--explore-eps`, or `--ent-coef`.
* **Demonstrations:** a scripted "short line + Trebuchets" bot already hurts the classic bot.
  Behaviour-cloning the actor on its games before PPO is the classic fix for hard exploration.
* **Bigger/longer:** `--actor-hidden 1024,1024,512`, more envs, a longer `--total-env-steps`.

Shaping terms are annealed (`shaping_anneal_frac`) and potential-based, so they can't change the
optimal policy in theory. The siege term is still game-specific knowledge: turn it off with
`--shaping-siege 0` if you prefer a purer learner.

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

`python3 rl/parity/check_model.py ultimate_model.json [checkpoint.pt]` checks the last link:
it plays the exported model with the real `UltimateBot` in Node and compares its logits with
NumPy/PyTorch.

Two browser-only effects are modelled approximately (both are off in the parity runs):

* **Nuke animation freeze** (`deathAnimPending`): movement pauses ~45 ticks after an Atomic Bomb (`nuke_freeze_ticks`).
* **Classic bot worker latency:** in the browser its brute-force search runs in a Web Worker and
  answers after however long the JS takes. The env delays the reply by
  `1 + simulated_unit_ticks / 60000` ticks, about V8's speed (`worker_unit_ticks_per_frame`).

## Speed

Measured on 4 CPU cores. Reproduce with `node rl/parity/bench_js.js 4 150` and
`RAYON_NUM_THREADS=1 rl/engine/target/release/bench 4`.

**Game engine, single thread, same workload** (random agents observing every 10 ticks):

| matchup | JS (`index.js`, Node/V8) | Rust | speed-up |
|---------|--------------------------|------|----------|
| agent vs agent | 100k ticks/s | 3.1M ticks/s | ~31× |
| agent vs DQN bot | 49k ticks/s | 264k ticks/s | ~5× (both spend most time in the DQN forward pass) |
| classic bot's battle simulations | 0.27–0.66M sim-ticks/s | 7–9M sim-ticks/s | ~19–27× |

Rust also runs the classic bot's ~400 battle simulations per decision in parallel, and runs
many games at once: the Python `VecEnv` does 2.5M ticks/s (250k decisions/s) on 4 threads.
Both engines stop battles that can provably never progress (e.g. Catapult vs Catapult) early,
with an identical result. In JS that made those simulations ~80× faster.

**Training throughput:** the old JS DQN trainers (`train_headless.js`, `ai_training/headless.js`)
do ~100 decisions/s with a ~73k-parameter network, slowing down as the replay buffer fills.
`wars_rl.train` does 1,200–2,500 decisions/s with a 1.28M-parameter network (~15–25× more
decisions and ~400× more network compute per second).

## Using another RL library

`wars_rl.gym_env.WarsOfAgesEnv` is a standard Gymnasium env (one agent vs `classic` or `dqn`)
with `action_masks()`, so it works with e.g. sb3-contrib's `MaskablePPO`. For serious training,
use `wars_rl.train`: it batches 128 games through Rust in parallel and does league self-play,
which single-agent wrappers can't.
