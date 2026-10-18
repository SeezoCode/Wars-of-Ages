# Training guide

Step-by-step: train the Ultimate AI from scratch, change the network, continue training an
existing model, and publish the result to GitHub. For how everything works, see
[README.md](README.md).

All `python -m wars_rl...` commands are run from the `rl/` folder.

---

## Easiest: the training dashboard

```bash
cd rl
python -m wars_rl.dashboard        # open http://localhost:8008
```

A web page for everything in this guide: start, stop and resume runs with every setting
(presets included, and an explanation for each advanced setting), live charts of win and draw
rates per opponent, the score of every finished game, CPU and memory use, evaluations, and
export to the game. Training keeps running if you close the dashboard; open it again to pick it
back up. `pip install psutil` gives more accurate CPU numbers. The rest of this guide is the same
thing on the command line.

**Changing settings while it trains.** "New training run" always starts a new model (unless you
pick "Start from weights"). To adjust a run that is already going, open it and click **Change
settings…**. Rewards (win, draw, every hint), learning rate, entropy, random moves, opponent
weights, PPO step settings, training length and save/snapshot intervals are applied by the
running trainer before its next update, with nothing lost. Settings tagged *restart* (game rules,
parallel games, threads…) are applied by saving, stopping and resuming automatically. Every
change is listed on the run page and drawn as a dashed line on the charts, so you can see what
it did.

---

## 1. One-time setup

You need **Rust** (https://rustup.rs), **Python 3.9+** and **Node.js** (only for the parity
check and for compiling `index.ts`).

```bash
cd Wars-of-Ages
python3 -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install torch numpy gymnasium maturin
pip install ./rl/engine                                 # builds the Rust engine (1–2 min)
python3 rl/parity/check.py --quick                      # optional: Rust engine == index.js (~5 min)
```

Run `pip install ./rl/engine` again whenever you change anything in `rl/engine/src`.

Quick test that everything works (one minute, writes into a throwaway folder):

```bash
cd rl
python -m wars_rl.train --run-dir runs/smoke --num-envs 16 --rollout-steps 32 --total-env-steps 20000
```

---

## 2. Train from scratch

```bash
cd rl
python -m wars_rl.train --run-dir runs/v2
```

This uses the defaults in `TrainConfig` (`wars_rl/train.py`). The model shipped in the repo was
trained with the defaults plus this opponent mix, which spends more games on the hard classic
bot:

```bash
python -m wars_rl.train --run-dir runs/v2 --total-env-steps 80000000 \
    --p-self 0.2 --p-past 0.45 --p-classic 0.15 --p-dqn 0.05 --p-random 0.15
```

### What it prints

```
[u350 5.73M] sps 1425 (9.46s+2.04s) eps 1615 len 47920 | win {'random': 1.0, 'dqn': 1.0, 'past': 0.056, 'classic': 0.0}
             draw {...} | ent 0.213 kl 0.0013 ev 0.99 | league #2(u40):0.50/99 ...
```

| field | meaning |
|-------|---------|
| `u350 5.73M` | PPO update number, total decisions trained on |
| `sps` | decisions per second (rollout time + update time) |
| `eps`, `len` | finished games, average game length in ticks (60 ticks = 1 s) |
| `win` / `draw` | rolling win / draw rate (last 300 games) per opponent type: **the numbers to watch** |
| `ent` | policy entropy. If it sits near 0 for a long time, the AI has stopped exploring |
| `kl`, `ev` | update size, and how well the critic predicts returns (close to 1 is good) |
| `league` | the hardest frozen past versions: `#id(update):score/games` |

The same data goes to `runs/v2/log.jsonl` (one JSON object per update) if you want to plot it.

### Files in the run folder

| file | what |
|------|------|
| `latest.pt` | full checkpoint incl. optimizer (~15 MB), saved every 10 updates and on Ctrl+C |
| `ultimate_model.json` | browser model, re-exported every 20 updates |
| `league/` | frozen snapshots the AI trains against |
| `log.jsonl`, `config.json` | training log and the current settings (updated by live changes) |
| `changes.jsonl` | settings changed while training: when, old → new, anything rejected |

`runs/` is in `.gitignore`. Nothing in it gets committed by accident.

### Stopping and resuming

* **Ctrl+C** saves `latest.pt` and exits.
* Run **the same command again** to resume (same `--run-dir`). Model, optimizer, schedules and
  league all continue where they left off. Use `--no-resume` to overwrite instead.
* Long runs survive closing the terminal with
  `nohup python -m wars_rl.train --run-dir runs/v2 > runs/v2.log 2>&1 &` (or use `tmux`/`screen`).
  Then `tail -f runs/v2.log` to watch.
* **Change settings without stopping:** write the new values into `<run_dir>/live.json`, e.g.
  `echo '{"lr": 1e-4, "lr_final": 1e-4, "draw_reward": -1}' > runs/v2/live.json`. The trainer
  applies them before its next update, deletes the file, prints `[live change at update N] …`
  and logs it to `changes.jsonl`. Allowed: rewards, learning rate and the other PPO settings,
  exploration, opponent weights, `total_env_steps` and the save/snapshot intervals (`LIVE_FIELDS`
  in `train.py`). Learning rate and entropy slide from start to end over the run, so set both
  ends to the same value to pin them. When resuming from the command line later, pass
  `--config runs/v2/config.json` to keep the changed values.

### Why did it stop?

The run page says why the last session ended: **finished**, **stopped** (Stop button, Ctrl+C,
closed terminal), **crashed** (with the error) or **killed** (it vanished without a word: force
quit, out of memory, a power loss or restart). The trainer writes this to `<run_dir>/sessions.jsonl`.
Crashed and killed runs resume from the last save, at most `save_every` updates back.

Sleep doesn't stop training, it only pauses it. On macOS the trainer keeps the computer awake by
itself (`prevent_sleep`, using `caffeinate`), except when you close the lid on battery.

After a resume every game starts over from the beginning, so for a few updates the finished games
are mostly the quick ones (fast wins against weak opponents). Game length, win rates and entropy
jump around at that point. It is a measuring effect, not the AI getting worse. The charts mark each
resume with a dashed line, and the rolling win rates are now saved in the checkpoint, so they
carry on across a resume.

### How long does it take?

On 4 CPU cores: about 1,200–2,500 decisions/s, so **10M decisions ≈ 2–3 hours**. The included
model is 10M. More cores help almost linearly: set `--env-threads` and `--torch-threads` to your
core count. Training runs on the CPU (the networks are small, and the bottleneck is simulating
games, not the GPU).

---

## 3. Changing the model size and layers

The policy (actor) and the value network (critic) are separate MLPs. Each hidden layer is
`Linear → LayerNorm → activation`.

| flag | default | meaning |
|------|---------|---------|
| `--actor-hidden 512,512,256` | 3 layers | width of each hidden layer of the policy, comma-separated; the number of values = number of layers |
| `--critic-hidden 512,512,256` | 3 layers | same for the value network (training only, not exported) |
| `--activation relu` | `relu` | `relu`, `tanh` or `silu` |
| `--layernorm` / `--no-layernorm` | on | LayerNorm after each hidden layer |

Examples:

```bash
# small and fast: 2 layers of 256
python -m wars_rl.train --run-dir runs/small --actor-hidden 256,256 --critic-hidden 256,256

# bigger: 4 layers
python -m wars_rl.train --run-dir runs/big --actor-hidden 1024,1024,512,256 --critic-hidden 1024,1024,512,256

# big critic, browser-friendly actor (the critic never ships to the browser)
python -m wars_rl.train --run-dir runs/bigcritic --actor-hidden 512,256 --critic-hidden 1024,1024,512
```

Rules and tips:

* **Use a new `--run-dir` for every architecture.** Resuming or `--init-from` with a different
  architecture is refused; the shapes don't fit.
* Cost grows with width²: doubling all widths makes each step ~3–4× slower. Deeper/wider nets
  usually need **more training**, not less, before they beat a smaller one.
* Browser model size ≈ 5.4 bytes × actor parameters. 512-512-256 → 3.4 MB; 1024-1024-512-256 →
  ~12 MB. The browser runs it in plain JavaScript once per decision; models up to ~15 MB load and run fine.
* `--layernorm` stabilises training with these unnormalised game features. Keep it on unless
  you're experimenting.
* Anything fancier (attention over units, residual blocks) goes in `wars_rl/model.py`. Only the
  **actor** must stay a plain `Linear/LayerNorm/relu/tanh/silu` stack so `export.py` and
  `UltimateBot.forward()` in `index.ts` can run it. The critic can be any PyTorch module.
* Changing **what the AI sees** (observation) or **its actions** is a bigger change: edit
  `rl/engine/src/obs.rs` *and* `UltimateBot` in `index.ts` identically, then
  `pip install ./rl/engine` and `python3 rl/parity/check.py --quick` to prove they match.

---

## 4. Other settings worth tuning

Every field of `TrainConfig` is a flag (`snake_case` → `--kebab-case`). You can also put them in
a JSON file: `python -m wars_rl.train --config configs/ultimate.json` (flags override the file).

| setting | default | when to change it |
|---------|---------|-------------------|
| `--total-env-steps` | 50M | training length. It also sets the schedules: learning rate, entropy, exploration and reward shaping all fade out relative to it |
| `--num-envs`, `--rollout-steps` | 128, 128 | games in parallel × steps per update. More envs = smoother updates, more RAM |
| `--env-threads`, `--torch-threads` | 4, 4 | set to your CPU core count |
| `--p-self/past/classic/dqn/random` | .25/.4/.05/.15/.15 | opponent mix (normalised). Give more to whatever it's weakest against. `classic` games are the slow ones |
| `--lr` | 3e-4 | lower (1e-4) if training is unstable or when fine-tuning |
| `--ent-coef`, `--explore-eps` | 0.02, 0.03 | raise if entropy collapses and it stops trying new units |
| `--draw-reward` | −0.5 | draws are common here; a penalty pushes it to actually finish games |
| `--shaping-*`, `--shaping-anneal-frac` | see README | reward hints (base damage, front line, trebuchets) that fade out over training. `0` disables a hint |
| `--decision-interval` | 15 | ticks between decisions (15 = 4 per second). Saved into the exported model; the browser bot uses the same value |
| `--max-ticks` | 54000 | game length limit (15 min) before it counts as a draw |
| `--seed` | 1 | change to get a different run with the same settings |

### Is it really getting better?

The "past versions" win rate is relative: those opponents improve too, so the number can fall while
the AI gets stronger. The trainer saves a small copy of the AI every `milestone_every` updates
(default 50) in `<run_dir>/milestones/`. On the run page, **Real strength → Measure strength**
plays a spread of those copies against opponents that never change (the old RL AI and/or the
classic bot) and charts win and draw rate across the run. Measuring again only plays copies and
settings not measured yet. From the command line:
`python -m wars_rl.evaluate runs/v2/milestones/u000500.pt runs/v2/milestones/u001000.pt --opponents dqn`.

### What is the AI actually rewarded with?

The run page's **Reward signals** section shows the reward from finished games, split by source:
win/loss/draw, base damage dealt and taken, kill money earned and given, front line, Trebuchets
in range and time cost, plus the total. **show** in Recent games opens one game's full history,
sampled every 5 seconds of game time, plus the game's details for both sides. The details are
what each side researched and when, troops bought and lost by type, upgrades, damage, kill
money, the army at the end, and charts of each army's make-up, base health, money and upgrade
multiplier over the game. The last 300 games are kept in `<run_dir>/curves/`. Hints are shown at their faded strength, exactly as the AI received
them. It has three parts, each filterable by opponent:

* **Reward per game, over training:** is the outcome term moving up, or only the hints?
* **Reward during a game:** the average running total by game minute. A long flat stretch with
  only the time cost falling is a stalemate.
* **Average per game by result:** the reward for a win, a draw and a loss. If a draw scores
  about the same as a win, the AI has no reason to take risks.

`python3 rl/parity/check_rewards.py` plays scripted games and prints each term per side, to check
the reward code itself.

### Stalling: time cost

`time_penalty` (dashboard: Rewards → *Time cost*, default 0.5) charges a small cost on every
decision, adding up to that value for a game that lasts the whole time limit. Unlike the reward
hints it never fades, and it can't be gamed: spamming troops doesn't avoid it, only ending the
game does. It is live-changeable. The *Waiting with money* chart shows how often the AI waits
although it could afford something. Some waiting is fine (saving up for a Trebuchet), but a
high or rising share means it is stalling.

### Training without base upgrades

`--max-upgrades 0` (dashboard: Game → *Max base upgrades*) turns off the +20% base upgrade for
every player in training games: the AI, the classic bot, the DQN bot and random players. Games
are then decided by troops and tactics, not by who out-upgrades whom. `-1` is unlimited, as in
the game, and any other number is a cap. It needs a restart, not a live change, because it is a
rule of the game.

The limit is saved in the exported model, and `UltimateBot` respects it in the browser: a model
trained without upgrades never upgrades there either. Otherwise it would pick an action it never
learned. Its opponents still can, unless you set **Max upgrades** in the match picker, which
applies to both sides. Evaluate under the same rules with `--max-upgrades 0` (or the field in the
dashboard's Evaluate panel). A practical plan is to train without upgrades first, then continue
with Start from weights and upgrades back on, so it learns when upgrading is worth it.

### Tips

* **Watch `win`/`draw` per opponent, not the total.** Beating random and the DQN is easy; the
  classic bot is the real test. If one opponent's numbers stall, raise its `--p-*`.
* **Evaluate properly now and then** (the training numbers are a noisy rolling window):
  `python -m wars_rl.evaluate runs/v2/latest.pt --games 100`. Games vs classic take ~13 min per
  100 on 4 cores.
* **Watch a game** in the browser after exporting (section 6). You'll spot strategy holes much
  faster than in the numbers. Against the classic bot, the key to winning is Trebuchets kept close
  behind a short front line (see "Why games stalemate" in README.md).
* **If entropy goes to ~0 and win rates stop moving**, it has settled on one plan. Resume with
  more exploration: `--ent-coef 0.03 --explore-eps 0.05`.
* **If a run diverges** (sudden NaN errors, or `kl` jumping above ~0.1 every update), resume
  with a lower `--lr`.
* Keep old run folders until the new model actually evaluates better.

---

## 5. Continue training an existing model

### a) Continue your own run (same computer)

Just rerun the command with the same `--run-dir`. It resumes from `runs/<name>/latest.pt`,
including optimizer, schedules and league.

To train **longer than planned**, raise `--total-env-steps` when resuming. Note that the
schedules are relative to it: going from 50M to 100M at step 40M moves the learning rate,
entropy and shaping back up from the "80% done" values to the "40% done" values.

### b) Continue from the model in the repo (or any slim checkpoint)

`rl/checkpoints/ultimate_v1.pt` holds the weights only (no optimizer or league), so it starts a
**new run initialised with those weights**:

```bash
cd rl
python -m wars_rl.train --run-dir runs/v2 --init-from checkpoints/ultimate_v1.pt \
    --total-env-steps 30000000 --lr 1e-4 \
    --p-self 0.2 --p-past 0.45 --p-classic 0.15 --p-dqn 0.05 --p-random 0.15
```

Things to know:

* The architecture flags must match the checkpoint (the included one uses the defaults).
* Step counters, schedules and the league start fresh: exploration and reward shaping are at
  full strength again. Use a lower `--lr` (e.g. `1e-4`) so it refines rather than relearns. If
  you don't want the hints back, use `--shaping-anneal-frac 0.1`.
* The league starts empty, so for the first ~20 updates the "past" games are self-play.
* After the first save it's a normal run: resume it with the same command (`--init-from` is
  ignored once `runs/v2/latest.pt` exists).

---

## 6. Evaluate, export, and try it in the browser

```bash
cd rl
python -m wars_rl.evaluate runs/v2/latest.pt --games 100              # vs classic, dqn, random
python -m wars_rl.evaluate runs/v2/latest.pt --opponents checkpoints/ultimate_v1.pt   # new vs old
```

Export the browser model **and** a slim checkpoint (small enough to commit):

```bash
python -m wars_rl.export runs/v2/latest.pt ../ultimate_model.json --checkpoint-out checkpoints/ultimate_v2.pt
python3 parity/check_model.py ../ultimate_model.json checkpoints/ultimate_v2.pt   # browser == PyTorch
```

### Which models the game can play

The game is a static web page, so it can only load model files that its web server serves. It
can't read `.pt` checkpoints, only exported `.json` models. Where a model lives decides where you can play it:

| where | how it gets there | on your computer | on GitHub Pages |
|-------|-------------------|------------------|-----------------|
| `ultimate_model.json`, `ultimate_dqn_model.json` (repo root) | export "make it the default" | yes (the defaults) | yes, once pushed |
| `models/<name>.json` | export "add to the model picker", or `python -m wars_rl.export runs/v2/latest.pt ../models/v2.json --note "…"` | yes | yes, once pushed |
| `rl/runs/<run>/ultimate_model.json` | written by the trainer every `export_every` updates | yes | no (`rl/runs/` isn't committed) |
| any `.json` model on your disk | "or file:" in the picker | yes | yes (read by your browser, never uploaded) |

The model dropdown in the match picker is built from `models/index.json`, a list of all of the
above. Nobody edits it by hand:
`python3 rl/wars_rl/model_index.py` writes it, and so does every export, the training dashboard
every 2 minutes and the GitHub Pages workflow before each deploy (without the local runs). It is
in `.gitignore` because your local copy lists runs that only exist on your computer. A picked
checkpoint (`.pt`) needs exporting first: dashboard **Export model**, or `wars_rl.export`.

Try it: the game loads the model with `fetch`, so serve the folder over HTTP instead of opening
the file directly:

```bash
cd ..                      # repo root
python3 -m http.server 8000
# open http://localhost:8000/ and pick the players (e.g. Human vs Ultimate AI), then a model from
# the dropdown: the defaults, models/, and your training runs (latest export of each).
# Links work too: http://localhost:8000/?mode=custom&left=classic&right=ultimate&speed=5
```

`index.js` already contains `UltimateBot`. You only need `npx tsc` if you edit `index.ts`.

---

## 7. Commit it to GitHub

What to commit:

| file | size | why |
|------|------|-----|
| `ultimate_model.json` (repo root) | ~3.4 MB | the default Ultimate AI in the browser |
| `models/<name>.json` | ~3.4 MB each | extra models in the game's model dropdown |
| `rl/checkpoints/ultimate_vN.pt` | ~5 MB | weights to continue from later (`--init-from`) |
| any code/config you changed | | so the run is reproducible |

**Don't** commit `rl/runs/` (big, and ignored by `.gitignore` anyway). GitHub rejects files over
100 MB and warns above 50 MB; the default model sizes are far below that.

```bash
cd Wars-of-Ages
git checkout -b new-ultimate-model          # or stay on your branch
git add ultimate_model.json models/v2.json rl/checkpoints/ultimate_v2.pt   # whichever you made
git add -u                                  # plus any tracked files you edited
git status                                  # check nothing unexpected (no rl/runs/!)
git commit -m "Ultimate AI v2: <win rates from wars_rl.evaluate>"
git push -u origin new-ultimate-model
```

Then open a pull request into `master` on GitHub, or push to `master` directly if that's how
you work. **Pushing to `master` deploys the site** (`.github/workflows/static.yml` publishes the
repo to GitHub Pages), so the new default model goes live for everyone who picks *Ultimate AI*,
and every model in `models/` shows up in the dropdown there.

Tip: put the evaluation results in the commit message or the README's results table, so you
can tell later which model was better.
