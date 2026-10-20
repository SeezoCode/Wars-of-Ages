"""PPO + league self-play training for Wars of Ages.

    cd rl
    python -m wars_rl.train                                  # defaults (see TrainConfig)
    python -m wars_rl.train --config configs/ultimate.json   # JSON config
    python -m wars_rl.train --num-envs 64 --actor-hidden 1024,512,256 --p-classic 0.3

Every field of `TrainConfig` is a CLI flag (underscores -> dashes). Resumes
automatically from `<run_dir>/latest.pt` unless `--no-resume`.

Each episode the learner plays one side against an opponent drawn from:
  self     — the current policy on the other side (both sides produce training data)
  past     — a frozen snapshot from the league (PFSP-weighted, see league.py)
  classic  — the original SimulatingBot ("Player vs AI")
  dqn      — the existing LocalRLBot (ultimate_dqn_model.json)
  random   — random valid actions on a random fraction of decisions (curriculum: idle .. spam)
"""
from __future__ import annotations

import argparse
import dataclasses
import json
import os
import signal
import subprocess
import sys
import time
import traceback
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import List

import numpy as np

# Torch's OpenMP threads spin after each op and fight the Rust env threads for cores.
os.environ.setdefault("OMP_WAIT_POLICY", "PASSIVE")

import torch  # noqa: E402
import torch.nn as nn  # noqa: E402

import wars_engine

from .export import export
from .pool import Pool
from .scripted import shield_push
from .search import search as search_moves
from .league import League
from .model import ActorCritic, ModelConfig, same_architecture, save_checkpoint

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))

CTRL_LEARNER = 0
CTRL_BUILTIN = -1
CTRL_RANDOM = -2
CTRL_SCRIPT = -3
CTRL_POOL = -100  # pool member k plays as CTRL_POOL - k
WAIT = wars_engine.NUM_ACTIONS - 1
REWARD_PARTS = ("outcome", "base_dealt", "base_taken", "kill_earned", "kill_given", "front", "trebuchet", "time")
CURVE_EVERY = 300  # ticks (5 s of game time) between samples of a game's reward history
OPPONENT_KINDS = ["self", "past", "classic", "dqn", "random", "script", "pool"]


@dataclass
class TrainConfig:
    run_dir: str = "runs/ultimate"
    seed: int = 1
    total_env_steps: int = 50_000_000
    num_envs: int = 128
    rollout_steps: int = 128
    env_threads: int = 4
    torch_threads: int = 4          # for the PPO update
    rollout_torch_threads: int = 1  # small inference batches are faster single-threaded
    prevent_sleep: bool = True      # macOS: keep the computer awake while training (caffeinate)

    # environment (see EnvConfig in rl/engine/src/env.rs)
    decision_interval: int = 15
    max_ticks: int = 54_000             # 15 minutes; then a draw
    nuke_freeze_ticks: int = 45
    start_money: float = 55.0
    agent_max_units: int = 10
    classic_max_units: int = 7
    dqn_max_units: int = 10
    max_upgrades: int = -1              # base upgrades per player: -1 = unlimited (the game), 0 = none
    worker_latency: int = 1
    worker_unit_ticks_per_frame: float = 60_000.0
    dqn_model: str = os.path.join(REPO, "ultimate_dqn_model.json")

    # network
    actor_hidden: List[int] = field(default_factory=lambda: [512, 512, 256])
    critic_hidden: List[int] = field(default_factory=lambda: [512, 512, 256])
    activation: str = "relu"
    layernorm: bool = True
    # memory: a GRU with this many numbers of state between the actor's hidden layers and its action
    # layer, carried through each game, so the network can remember what happened (0 = no memory)
    recurrent: int = 0
    seq_len: int = 64                   # memory networks learn from stretches of this many consecutive decisions

    # PPO
    lr: float = 3e-4
    lr_final: float = 3e-5
    gamma: float = 0.999
    gae_lambda: float = 0.95
    clip: float = 0.2
    epochs: int = 3
    minibatch_size: int = 4096
    ent_coef: float = 0.02
    ent_coef_final: float = 0.002
    vf_coef: float = 0.5
    max_grad_norm: float = 0.5
    target_kl: float = 0.03
    # exploration: with prob explore_eps a learner decision becomes a random valid non-wait
    # action (logged with its log-prob under the policy), annealed to 0 by explore_anneal_frac
    explore_eps: float = 0.03
    explore_anneal_frac: float = 0.6

    # rewards: outcome + annealed shaping
    win_reward: float = 1.0
    loss_reward: float = -1.0           # if a config sets only win_reward, this becomes -win_reward
    # games that hit the time limit: draw_reward + timeout_tiebreak x (own base - enemy base) / 800 (+ army term),
    # clipped to +-timeout_tiebreak, so a draw where it is ahead is better than one where it is behind
    timeout_tiebreak: float = 1.0
    tiebreak_army: float = 0.0          # also count the troops' total health (own - enemy, /3000) in the tie-break
    draw_reward: float = -0.5
    time_penalty: float = 0.5           # total cost of a game that lasts the full max_ticks, spread evenly
                                        # over its decisions (not annealed): makes stalling cost something
    shaping_base_damage: float = 2.0   # x (enemy base damage - own base damage) / 800
    shaping_bounty: float = 0.03       # x (bounty earned - bounty given) / 100
    shaping_front: float = 1.0         # potential-based: gamma*phi(s') - phi(s), phi = own front - enemy front
    shaping_siege: float = 0.0         # potential-based: own Trebuchets advancing into base-hitting range
                                       # (taken back in one hit when one dies; in practice that teaches "Trebuchets are bad")
    shaping_siege_progress: float = 1.0  # pays for Trebuchets advancing towards range, never taken back
    shaping_anneal_frac: float = 0.8   # shaping fades to 0 over this fraction of training

    # opponent mix (normalized)
    p_self: float = 0.25
    p_past: float = 0.4
    p_classic: float = 0.05   # expensive (brute-force worker search)
    p_dqn: float = 0.15
    p_random: float = 0.15
    p_script: float = 0.1               # scripted Shield push (wars_rl/scripted.py)
    # fixed opponent pool (wars_rl/pool.py): trained networks that never change
    p_pool: float = 0.0                 # share of games against the pool (ignored while it is empty)
    pool_models: List[str] = field(default_factory=list)  # .pt / .json paths, relative to rl/ or absolute
    pool_target: float = 0.95           # a member counts as mastered at this win rate (or score)
    pool_window: int = 100              # games per member the rate is measured over
    pool_min_games: int = 50            # games against a member before it can count as mastered
    pool_use_score: bool = False        # count draws as half a win (useful against peak copies of itself)
    pool_auto: bool = False             # add the learner as a new peak when every member is mastered
    pool_marinate: int = 50             # ...after staying ahead of all of them for this many more updates
    # random opponents act on only a fraction of their decisions, drawn per episode as
    # U(0,1)**random_activity_power: a curriculum from near-idle to full spam
    random_activity_power: float = 2.0

    # league / bookkeeping
    snapshot_every: int = 20
    milestone_every: int = 50
    # AlphaZero-style search (wars_rl/search.py): on this fraction of the learner's decisions, try the most
    # likely moves in copies of the game and train the policy towards the moves that did better. 0 = off.
    search_frac: float = 0.0
    search_candidates: int = 6          # moves tried per searched decision ("wait" + the 5 most likely)
    search_rollouts: int = 2            # copies per move (different luck)
    search_horizon: int = 40            # decisions each copy plays ahead (40 = 10 s at 4 per second)
    search_strength: float = 2.0        # how far the target moves from the network's policy towards better moves
    search_coef: float = 1.0            # weight of "copy the search" in the training loss
    search_every: int = 16              # search in batches every this many rollout steps (efficiency)
    # review: after each batch, go back to the decisions that turned out worst compared with what the critic
    # expected, try other moves there in copies of that exact moment (same search settings) and learn from it
    review_frac: float = 0.0           # keep a small permanent copy of the actor (milestones/) for strength tests
    max_snapshots: int = 40
    save_every: int = 10
    export_every: int = 20
    resume: bool = True
    init_from: str = ""                 # warm-start weights from a checkpoint (e.g. checkpoints/ultimate_v1.pt)


# Settings a running trainer picks up between updates: the dashboard (or you) writes
# {"lr": 1e-4, ...} to <run_dir>/live.json. Everything else (network, parallel games, game rules)
# needs a restart. Scheduled values (lr, entropy, exploration, reward hints) keep fading relative to
# the new start/end values and total_env_steps.
LIVE_FIELDS = {
    "total_env_steps", "lr", "lr_final", "gamma", "gae_lambda", "clip", "epochs", "minibatch_size", "ent_coef",
    "ent_coef_final", "vf_coef", "max_grad_norm", "target_kl", "explore_eps", "explore_anneal_frac", "win_reward", "loss_reward", "timeout_tiebreak", "tiebreak_army",
    "draw_reward", "time_penalty", "shaping_base_damage", "shaping_bounty", "shaping_front", "shaping_siege", "shaping_siege_progress",
    "shaping_anneal_frac",
    "p_self", "p_past", "p_classic", "p_dqn", "p_random", "p_script", "p_pool", "pool_models", "pool_target", "pool_window",
    "pool_min_games", "pool_use_score", "pool_auto", "pool_marinate", "random_activity_power", "snapshot_every", "milestone_every",
    "search_frac", "search_candidates", "search_rollouts", "search_horizon", "search_strength", "search_coef",
    "search_every", "review_frac", "seq_len",
    "max_snapshots",
    "save_every", "export_every", "torch_threads", "rollout_torch_threads",
}
POSITIVE_INT = {"total_env_steps", "epochs", "minibatch_size", "snapshot_every", "milestone_every", "max_snapshots",
                "search_candidates", "search_rollouts", "search_horizon", "search_every", "save_every", "seq_len",
                "export_every", "torch_threads", "rollout_torch_threads"}


def parse_config() -> TrainConfig:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", help="JSON file with TrainConfig fields")
    for f in dataclasses.fields(TrainConfig):
        name = "--" + f.name.replace("_", "-")
        if f.type in ("bool", bool):
            ap.add_argument(name, dest=f.name, action=argparse.BooleanOptionalAction, default=None)
        elif "List[str]" in str(f.type):
            ap.add_argument(name, dest=f.name, type=lambda s: [x for x in s.split(",") if x], default=None)
        elif "List" in str(f.type):
            ap.add_argument(name, dest=f.name, type=lambda s: [int(x) for x in s.split(",")], default=None)
        else:
            typ = {"int": int, "float": float, "str": str}.get(str(f.type), str)
            ap.add_argument(name, dest=f.name, type=typ, default=None)
    args = ap.parse_args()
    cfg = TrainConfig()
    given = set()
    if args.config:
        with open(args.config) as fh:
            for k, v in json.load(fh).items():
                if not hasattr(cfg, k):
                    raise SystemExit(f"unknown config key: {k}")
                setattr(cfg, k, v)
                given.add(k)
    for f in dataclasses.fields(TrainConfig):
        v = getattr(args, f.name)
        if v is not None:
            setattr(cfg, f.name, v)
            given.add(f.name)
    if "loss_reward" not in given:  # older configs had one symmetric win/loss reward
        cfg.loss_reward = -cfg.win_reward
    return cfg


class Trainer:
    def __init__(self, cfg: TrainConfig):
        self.cfg = cfg
        os.makedirs(cfg.run_dir, exist_ok=True)
        torch.set_num_threads(cfg.torch_threads)
        torch.manual_seed(cfg.seed)
        self.rng = np.random.default_rng(cfg.seed)
        self.N = cfg.num_envs
        dqn_path = cfg.dqn_model if os.path.exists(cfg.dqn_model) else None
        self.has_dqn = dqn_path is not None
        self.venv = wars_engine.VecEnv(
            cfg.num_envs, decision_interval=cfg.decision_interval, max_ticks=cfg.max_ticks,
            nuke_freeze_ticks=cfg.nuke_freeze_ticks, worker_unit_ticks_per_frame=cfg.worker_unit_ticks_per_frame,
            start_money=cfg.start_money, agent_max_units=cfg.agent_max_units, max_upgrades=cfg.max_upgrades,
            classic_max_units=cfg.classic_max_units, dqn_max_units=cfg.dqn_max_units,
            worker_latency=cfg.worker_latency, dqn_model=dqn_path, threads=cfg.env_threads)
        mcfg = ModelConfig(wars_engine.OBS_SIZE, wars_engine.NUM_ACTIONS, list(cfg.actor_hidden),
                           list(cfg.critic_hidden), cfg.activation, cfg.layernorm, cfg.recurrent)
        self.model = ActorCritic(mcfg)
        # memories (before the next decision) of the learner per (game, side), and of each memory
        # network among the opponents (league snapshot id / pool code -> (N, 2, size)); zeroed at each new game
        self.h = torch.zeros(self.N, 2, cfg.recurrent)
        self.opp_h: dict = {}
        self.opt = torch.optim.Adam(self.model.parameters(), lr=cfg.lr, eps=1e-5)
        self.league = League(os.path.join(cfg.run_dir, "league"), mcfg, cfg.max_snapshots)
        self.pool = Pool(cfg, cfg.run_dir)
        for p in set(cfg.pool_models) - {m.path for m in self.pool.active()}:
            print(f"pool: could not load {p}")
        self.update = 0
        self.env_steps = 0
        self.episodes = 0
        self.results = defaultdict(lambda: deque(maxlen=300))  # opponent kind -> learner scores
        self.ep_ticks = deque(maxlen=300)
        self.seed_counter = cfg.seed * 1_000_003
        self.episode_log = open(os.path.join(cfg.run_dir, "episodes.jsonl"), "a")  # one line per finished game
        self.ctrl = np.zeros((self.N, 2), dtype=np.int64)
        self.activity = np.ones(self.N)
        self.kind = [""] * self.N
        self.script_state = [{} for _ in range(self.N)]
        # reward the learner actually received this game, by source (REWARD_PARTS), plus the running
        # total sampled at every minute of game time (for the dashboard's reward charts)
        self.ep_rew = np.zeros((self.N, 2, len(REWARD_PARTS)))
        self.ep_sample = np.zeros(self.N, dtype=np.int64)
        self.ep_curve = [[] for _ in range(self.N)]
        self.ep_state = [[] for _ in range(self.N)]  # per 5 s: both sides' money, base, multiplier, army
        os.makedirs(os.path.join(cfg.run_dir, "curves"), exist_ok=True)
        self._maybe_resume()
        self.opp_probs = self._opponent_probs()
        for i in range(self.N):
            self._reset_env(i)
        self.log_path = os.path.join(cfg.run_dir, "log.jsonl")
        with open(os.path.join(cfg.run_dir, "config.json"), "w") as fh:
            json.dump(dataclasses.asdict(cfg), fh, indent=2)
        n_params = sum(p.numel() for p in self.model.parameters())
        print(f"model: actor {cfg.actor_hidden} critic {cfg.critic_hidden} ({n_params / 1e6:.2f}M params) | "
              f"envs {self.N} x {cfg.rollout_steps} steps | opponents {dict(zip(OPPONENT_KINDS, self.opp_probs.round(3)))}")

    def _opponent_probs(self) -> np.ndarray:
        c = self.cfg
        p = np.array([c.p_self, c.p_past, c.p_classic, c.p_dqn if self.has_dqn else 0.0, c.p_random, c.p_script,
                      c.p_pool if self.pool.active() else 0.0], dtype=float)
        if not (np.all(p >= 0) and p.sum() > 0):
            raise ValueError("opponent weights must be >= 0 and not all zero")
        return p / p.sum()

    def _apply_live_changes(self):
        """Apply <run_dir>/live.json (written by the dashboard) between updates."""
        path = os.path.join(self.cfg.run_dir, "live.json")
        if not os.path.exists(path):
            return
        try:
            with open(path) as fh:
                changes = json.load(fh)
            os.remove(path)
        except (OSError, ValueError):
            return  # half-written; try again next update
        applied, rejected = {}, {}
        backup = dataclasses.asdict(self.cfg)
        for k, v in changes.items():
            old = getattr(self.cfg, k, None)
            if k not in LIVE_FIELDS:
                rejected[k] = "needs a restart"
                continue
            if k == "pool_models":
                if not (isinstance(v, list) and all(isinstance(x, str) for x in v)):
                    rejected[k] = "expected a list of model paths"
                    continue
                errors = self.pool.set_models(v)
                ok = [p for p in v if not any(e.startswith(p + ":") for e in errors)]
                if errors:
                    rejected[k] = "; ".join(errors)
                if ok != list(old):
                    self.cfg.pool_models = ok
                    applied[k] = [old, ok]
                continue
            if isinstance(old, bool):
                if bool(v) != old:
                    setattr(self.cfg, k, bool(v))
                    applied[k] = [old, bool(v)]
                continue
            try:
                new = int(v) if isinstance(old, int) else float(v)
                if not np.isfinite(new) or (k in POSITIVE_INT and new < 1) or (k.startswith("p_") and new < 0):
                    raise ValueError
            except (TypeError, ValueError):
                rejected[k] = f"invalid value {v!r}"
                continue
            if new != old:
                setattr(self.cfg, k, new)
                applied[k] = [old, new]
        try:
            self.opp_probs = self._opponent_probs()
        except ValueError as e:
            for k in list(applied):
                if k.startswith("p_"):
                    setattr(self.cfg, k, backup[k])
                    rejected[k] = str(e)
                    applied.pop(k)
        self.league.max_snapshots = self.cfg.max_snapshots
        if applied:
            with open(os.path.join(self.cfg.run_dir, "config.json"), "w") as fh:
                json.dump(dataclasses.asdict(self.cfg), fh, indent=2)
        rec = {"time": round(time.time(), 1), "update": self.update, "env_steps": self.env_steps,
               "applied": applied, "rejected": rejected}
        with open(os.path.join(self.cfg.run_dir, "changes.jsonl"), "a") as fh:
            fh.write(json.dumps(rec) + "\n")
        print(f"[live change at update {self.update}] applied {applied}" + (f" rejected {rejected}" if rejected else ""),
              flush=True)

    # ------------------------------------------------------------------ setup
    def _maybe_resume(self):
        path = os.path.join(self.cfg.run_dir, "latest.pt")
        if not (self.cfg.resume and os.path.exists(path)):
            if self.cfg.init_from:
                ckpt = torch.load(self.cfg.init_from, map_location="cpu", weights_only=False)
                if not same_architecture(ckpt["model_config"], self.model.cfg.to_dict()):
                    raise SystemExit(f"{self.cfg.init_from} has a different architecture than this config")
                self.model.load_state_dict(ckpt["state_dict"])
                print(f"initialized weights from {self.cfg.init_from} (update {ckpt.get('update')})")
            return
        ckpt = torch.load(path, map_location="cpu", weights_only=False)
        if not same_architecture(ckpt["model_config"], self.model.cfg.to_dict()):
            raise SystemExit(f"{path} has a different architecture; use another --run-dir or --no-resume")
        self.model.load_state_dict(ckpt["state_dict"])
        self.opt.load_state_dict(ckpt["optimizer"])
        self.update = ckpt["update"]
        self.env_steps = ckpt["env_steps"]
        self.episodes = ckpt.get("episodes", 0)
        for k, v in ckpt.get("results", {}).items():  # rolling win rates continue instead of restarting empty
            self.results[k].extend(v)
        self.ep_ticks.extend(ckpt.get("ep_ticks", []))
        print(f"resumed from {path}: update {self.update}, {self.env_steps:,} env steps")

    def _next_seed(self) -> int:
        self.seed_counter += 1
        return self.seed_counter

    def _reset_env(self, i: int):
        kind = OPPONENT_KINDS[self.rng.choice(len(OPPONENT_KINDS), p=self.opp_probs)]
        sid = None
        if kind == "past":
            sid = self.league.sample(self.rng)
            if sid is None:
                kind = "self"
        side = int(self.rng.integers(2))
        kinds = ["agent", "agent"]
        ctrl = [CTRL_LEARNER, CTRL_LEARNER]
        if kind == "past":
            ctrl[1 - side] = sid
        elif kind in ("classic", "dqn"):
            kinds[1 - side] = kind
            ctrl[1 - side] = CTRL_BUILTIN
        elif kind == "random":
            ctrl[1 - side] = CTRL_RANDOM
            self.activity[i] = self.rng.random() ** self.cfg.random_activity_power
        elif kind == "script":
            ctrl[1 - side] = CTRL_SCRIPT
            self.script_state[i] = {}
        elif kind == "pool":
            ctrl[1 - side] = CTRL_POOL - self.pool.sample(self.rng).id
        self.venv.reset(i, kinds[0], kinds[1], self._next_seed())
        self.h[i] = 0.0
        for mem in self.opp_h.values():
            mem[i] = 0.0
        self.ctrl[i] = ctrl
        self.kind[i] = kind

    def _record_episode(self, i: int, winner: int, ticks: int):
        self.episodes += 1
        side_ = 0 if self.kind[i] == "self" or self.ctrl[i, 0] == CTRL_LEARNER else 1
        parts = self.ep_rew[i, side_]
        fine = [[round(float(x), 4) for x in row[side_]] for row in self.ep_curve[i]] + \
               [[round(float(x), 4) for x in parts]]
        per_min = 3600 // CURVE_EVERY
        curve = fine[per_min - 1:-1:per_min] + fine[-1:]  # per game minute, for the averages
        # the full 5-second history goes to its own file; only the latest games are kept
        cdir = os.path.join(self.cfg.run_dir, "curves")
        info = self.venv.info(i)
        me_, en_ = ("left", "right") if side_ == 0 else ("right", "left")

        def compact(snap):  # [money, base, multiplier, troop counts...] -> ints where possible
            return [round(snap[0]), round(snap[1]), round(snap[2], 3)] + [int(x) for x in snap[3:]]

        def details(pl):
            return {k: pl[k] for k in ("spawned", "lost", "researched_at", "upgrade_times", "upgrades")} | {
                "money": round(pl["money"]), "base": round(pl["base_health"]), "multiplier": round(pl["multiplier"], 3),
                "damage_dealt": round(pl["damage_dealt"]), "kill_money": round(pl["bounty_earned"]),
                "army": [u[0] for u in pl["units"]]}
        try:
            with open(os.path.join(cdir, f"{self.episodes}.json"), "w") as fh:
                json.dump({"every": CURVE_EVERY, "ticks": ticks, "parts": REWARD_PARTS, "curve": fine,
                           "troops": wars_engine.TROOP_NAMES,
                           # per sample: [AI side, opponent side], each [money, base, multiplier, troops alive by type]
                           "state": [[compact(st[side_]), compact(st[1 - side_])] for st in self.ep_state[i]],
                           "players": {"ai": details(info[me_]), "opponent": details(info[en_])}}, fh,
                          separators=(",", ":"))
            old = os.path.join(cdir, f"{self.episodes - 300}.json")
            if os.path.exists(old):
                os.remove(old)
        except OSError:
            pass
        self.ep_ticks.append(ticks)
        kind = self.kind[i]
        info = self.venv.info(i)
        side = 0 if kind == "self" or self.ctrl[i, 0] == CTRL_LEARNER else 1
        me, en = ("left", "right") if side == 0 else ("right", "left")
        rec = {"time": round(time.time(), 1), "update": self.update, "opponent": kind, "side": me,
               "ticks": ticks, "own_base": round(info[me]["base_health"]), "enemy_base": round(info[en]["base_health"]),
               "result": "W" if winner == side else ("L" if winner == 1 - side else "D"),
               "env_steps": self.env_steps, "episode": self.episodes,
               "rewards": {k: round(float(v), 4) for k, v in zip(REWARD_PARTS, parts)},
               "reward_curve": curve}  # cumulative REWARD_PARTS at the end of each game minute, then at the end
        if kind == "past":
            rec["opponent_id"] = int(self.ctrl[i, 1 - side])
        if kind == "pool":
            member = self.pool.members[int(CTRL_POOL - self.ctrl[i, 1 - side])]
            rec["opponent_id"] = member.name
            member.results.append(rec["result"])
            member.games += 1
        if kind == "random":
            rec["activity"] = round(float(self.activity[i]), 3)
        self.episode_log.write(json.dumps(rec) + "\n")
        self.episode_log.flush()
        if kind == "self":
            return
        score = 1.0 if winner == side else (0.0 if winner == 1 - side else 0.5)
        self.results[kind].append(score)
        if kind == "past":
            self.league.record(int(self.ctrl[i, 1 - side]), score)

    # --------------------------------------------------------------- rewards
    def _rewards(self, comp: np.ndarray, done: np.ndarray, winner: np.ndarray, shaping: float,
                 obs: np.ndarray | None = None) -> np.ndarray:
        """obs: the observation after this step (needed for the timeout tie-break)."""
        c = self.cfg
        r = shaping * (c.shaping_base_damage * (comp[..., 0] - comp[..., 1]) +
                       c.shaping_bounty * (comp[..., 2] - comp[..., 3]))
        tb = np.zeros(r.shape)
        if obs is not None and c.timeout_tiebreak:
            # obs.rs global features: [4] own base / 800, [5] enemy base / 800, [70]/[71] troops' health / 1000
            ahead = obs[..., 4] - obs[..., 5] + c.tiebreak_army * (obs[..., 70] - obs[..., 71]) / 3.0
            tb = c.timeout_tiebreak * np.clip(ahead, -1.0, 1.0)
        for s in range(2):
            out = np.where(winner == s, c.win_reward, np.where(winner == 1 - s, c.loss_reward,
                                                                np.where(winner == 2, c.draw_reward + tb[:, s], 0.0)))
            r[:, s] += np.where(done, out, 0.0)
        r -= c.time_penalty * c.decision_interval / c.max_ticks  # every decision costs a little time
        return r.astype(np.float32)

    def _track_rewards(self, comp, done, shaping, pot, total, ticks):
        """Split this step's reward into REWARD_PARTS (only bookkeeping; training uses `total`).

        pot: (N, 2, 2) shaped potential differences, [front, trebuchet]."""
        c = self.cfg
        parts = np.zeros((self.N, 2, len(REWARD_PARTS)))
        parts[..., 1] = shaping * c.shaping_base_damage * comp[..., 0]
        parts[..., 2] = -shaping * c.shaping_base_damage * comp[..., 1]
        parts[..., 3] = shaping * c.shaping_bounty * comp[..., 2]
        parts[..., 4] = -shaping * c.shaping_bounty * comp[..., 3]
        parts[..., 5:7] = pot
        parts[..., 7] = -c.time_penalty * c.decision_interval / c.max_ticks
        parts[..., 0] = total - parts[..., 1:].sum(-1)  # what is left is the win / loss / draw reward
        self.ep_rew += parts
        sample = np.asarray(ticks) // CURVE_EVERY
        for i in np.flatnonzero((sample > self.ep_sample) & ~done):
            self.ep_curve[i].append(self.ep_rew[i].copy())
            self.ep_state[i].append(self.venv.snapshot(int(i)))
            self.ep_sample[i] = sample[i]

    def _review(self, adv, learn, b_obs, b_mask, b_act, b_h, hist_kinds, shaping):
        """Hindsight: search again at the learner's decisions with the most negative advantage."""
        c = self.cfg
        T, N = adv.shape[:2]
        t_idx, e_idx, s_idx = np.nonzero(learn)
        n = min(len(t_idx), max(1, int(round(c.review_frac * len(t_idx)))), 512)
        worst = np.argsort(adv[t_idx, e_idx, s_idx])[:n]
        t_idx, e_idx, s_idx = t_idx[worst], e_idx[worst], s_idx[worst]
        obs = b_obs.numpy()[t_idx, e_idx, s_idx]
        mask = b_mask.numpy()[t_idx, e_idx, s_idx]
        root_h = b_h[torch.from_numpy(t_idx), torch.from_numpy(e_idx)] if b_h is not None else None
        t0 = time.time()
        torch.set_num_threads(c.torch_threads)
        target, stats = search_moves(self, t_idx * N + e_idx, s_idx, obs, mask, shaping, self.rng,
                                     src=self.hist, kinds=[hist_kinds[t][e] for t, e in zip(t_idx, e_idx)],
                                     root_h=root_h)
        torch.set_num_threads(c.rollout_torch_threads)
        played = b_act.numpy()[t_idx, e_idx, s_idx]
        best = stats["_cand"][np.arange(n), np.nan_to_num(stats["_q"], nan=-np.inf).argmax(1)]
        self.review_stats = dict(review_n=n, review_s=time.time() - t0,
                                 review_changed=float(np.mean(best != played)),  # a better move was found
                                 review_adv=float(adv[t_idx, e_idx, s_idx].mean()))
        self.search_data.append((obs, mask, target,
                                 None if root_h is None else root_h[torch.arange(n), torch.from_numpy(s_idx)]))

    def _pool_step(self):
        """Automatic peaks: once every pool member has been mastered for pool_marinate updates, freeze the
        learner into <run_dir>/peaks/ and add it to the pool. Always writes pool.json for the dashboard."""
        c, pool = self.cfg, self.pool
        if c.pool_auto and pool.all_mastered():
            if pool.mastered_since is None:
                pool.mastered_since = self.update
                print(f"[pool] every member mastered at update {self.update}; adding a peak after "
                      f"{c.pool_marinate} more updates", flush=True)
            elif self.update - pool.mastered_since >= c.pool_marinate:
                d = os.path.join(c.run_dir, "peaks")
                os.makedirs(d, exist_ok=True)
                path = os.path.join(d, f"peak{pool.peaks_added + 1}_u{self.update}.pt")
                torch.save({"model_config": self.model.cfg.to_dict(), "actor": self.model.actor.state_dict(),
                            "update": self.update, "env_steps": self.env_steps,
                            "train_config": {"decision_interval": c.decision_interval}}, path)
                rl_dir = os.path.join(REPO, "rl")  # pool paths are relative to rl/ when the run lives there
                rel = os.path.relpath(path, rl_dir) if os.path.abspath(path).startswith(rl_dir + os.sep) else path
                c.pool_models = list(c.pool_models) + [rel]
                pool.set_models(c.pool_models)
                pool.peaks_added += 1
                pool.mastered_since = None
                self.opp_probs = self._opponent_probs()
                with open(os.path.join(c.run_dir, "config.json"), "w") as fh:
                    json.dump(dataclasses.asdict(c), fh, indent=2)
                with open(os.path.join(c.run_dir, "changes.jsonl"), "a") as fh:
                    fh.write(json.dumps({"time": round(time.time(), 1), "update": self.update,
                                         "env_steps": self.env_steps, "applied": {"pool peak added": [None, rel]},
                                         "rejected": {}}) + "\n")
                print(f"[pool] added peak {rel}", flush=True)
        else:
            pool.mastered_since = None
        pool.save(self.update)

    def _search_some(self, li, obs, mask, shaping):
        """Search a random share of the learner's current decisions; keep (obs, mask, target) for the update."""
        c = self.cfg
        n = min(len(li[0]), max(1, int(round(c.search_frac * len(li[0]) * c.search_every))), 256)
        pick = self.rng.choice(len(li[0]), size=n, replace=False)
        roots, sides = li[0][pick], li[1][pick]
        t0 = time.time()
        torch.set_num_threads(c.torch_threads)
        rec = self.cfg.recurrent
        root_h = self.h[torch.from_numpy(roots)].clone() if rec else None
        target, stats = search_moves(self, roots, sides, obs[roots, sides], mask[roots, sides], shaping, self.rng,
                                     root_h=root_h)
        torch.set_num_threads(c.rollout_torch_threads)
        stats["search_s"] = time.time() - t0
        self.search_data.append((obs[roots, sides].copy(), mask[roots, sides].copy(), target,
                                 root_h[torch.arange(n), torch.from_numpy(sides)] if rec else None))
        self.search_stats.append(stats)

    def _shaped_reward(self, comp, done, winner, shaping, phi, obs_next):
        """Full per-step reward (outcome, hints, time cost, potential terms) for both sides.

        phi: _potential_parts of the previous observation. Returns (reward (N, 2), parts of obs_next)."""
        r, pot, parts_next = self._shaped_parts(comp, done, winner, shaping, phi, obs_next)
        return r + pot.sum(-1), parts_next

    def _shaped_parts(self, comp, done, winner, shaping, phi, obs_next):
        c = self.cfg
        r = self._rewards(comp, done, winner, shaping, obs_next)
        parts_next = self._potential_parts(obs_next)
        phi_next = np.where(done[:, None, None], 0.0, parts_next[..., :2])
        pot = shaping * (c.gamma * phi_next - phi[..., :2])
        # Trebuchet progress: pay for any increase of the raw score, never charge for decreases (deaths)
        pot[..., 1] += np.where(done[:, None], 0.0, shaping * c.shaping_siege_progress *
                                np.maximum(0.0, parts_next[..., 2] - phi[..., 2]))
        return r, pot, parts_next

    def _potential(self, obs: np.ndarray) -> np.ndarray:
        return self._potential_parts(obs)[..., :2].sum(-1)

    def _potential_parts(self, obs: np.ndarray) -> np.ndarray:
        """Potential for shaping, [..., 0] front line and [..., 1] Trebuchets (weighted), [..., 2] raw Trebuchet score (gamma*phi(s') - phi(s) keeps the optimal policy unchanged).

        front: how far my frontmost unit has pushed minus how far the enemy's has.
        siege: my Trebuchets moving up to the position where they can hit the enemy base
               (they are the only units that damage a base while it still has defenders).
        """
        G, S, U = 72, 10, 20  # GLOBAL_FEATURES, MAX_SLOTS, UNIT_FEATURES (rl/engine/src/obs.rs)
        own = obs[..., G:G + S * U].reshape(*obs.shape[:-1], S, U)
        en = obs[..., G + S * U:G + 2 * S * U].reshape(*obs.shape[:-1], S, U)
        own_front = (own[..., 14] * own[..., 0]).max(-1)
        en_depth = ((1.0 - en[..., 14]) * en[..., 0]).max(-1)
        treb = own[..., 1 + 8] > 0.5
        in_range_x = (700 - 55 - 210) / 700  # Trebuchet reaches the base from here
        ramp = np.clip((own[..., 14] - 0.3) / (in_range_x - 0.3), 0.0, 1.0)
        siege = np.minimum((ramp * treb).sum(-1) / 2.0, 1.5)
        return np.stack([self.cfg.shaping_front * (own_front - en_depth), self.cfg.shaping_siege * siege, siege], -1)

    # --------------------------------------------------------------- rollout
    @torch.no_grad()
    def _net_actions(self, code: int, net, obs: np.ndarray, mask: np.ndarray, actions: np.ndarray):
        """Sample the moves of opponent network `net` (league snapshot or pool member) wherever it plays."""
        idx = np.nonzero(self.ctrl == code)
        ti = tuple(torch.from_numpy(x) for x in idx)
        n = getattr(net, "recurrent", 0)
        mem = None
        if n:
            mem = self.opp_h.get(code)
            if mem is None or mem.shape[-1] != n:
                mem = self.opp_h[code] = torch.zeros(self.N, 2, n)
        logits, h = net.step(torch.from_numpy(obs[idx]), torch.from_numpy(mask[idx]), mem[ti] if n else None)
        if n:
            mem[ti] = h
        actions[idx] = torch.distributions.Categorical(logits=logits).sample().numpy()

    def _opponent_actions(self, obs: np.ndarray, mask: np.ndarray, actions: np.ndarray):
        codes = set()
        for sid in np.unique(self.ctrl[self.ctrl > 0]):
            self._net_actions(int(sid), self.league.model(int(sid)), obs, mask, actions)
            codes.add(int(sid))
        for code in np.unique(self.ctrl[self.ctrl <= CTRL_POOL]):
            self._net_actions(int(code), self.pool.members[int(CTRL_POOL - code)], obs, mask, actions)
            codes.add(int(code))
        for k in set(self.opp_h) - codes:  # nobody plays as that network any more
            del self.opp_h[k]
        for e, s in zip(*np.nonzero(self.ctrl == CTRL_SCRIPT)):
            actions[e, s] = shield_push(obs[e, s], mask[e, s], self.script_state[e])
        ridx = np.nonzero(self.ctrl == CTRL_RANDOM)
        for e, s in zip(*ridx):
            if self.rng.random() < self.activity[e]:
                actions[e, s] = self.rng.choice(np.flatnonzero(mask[e, s]))

    @torch.no_grad()
    def _explore(self, logits: torch.Tensor, mask: torch.Tensor, a: torch.Tensor, lp: torch.Tensor, eps: float):
        """Replace a random eps-fraction of actions by uniform valid non-wait actions (in place).

        logits: the policy's masked logits for these decisions."""
        m = mask.clone()
        m[:, WAIT] = False
        pick = (torch.rand(len(a)) < eps) & m.any(1)
        if not pick.any():
            return
        idx = pick.nonzero().squeeze(1)
        new = torch.multinomial(m[idx].float(), 1).squeeze(1)
        logp = torch.log_softmax(logits[idx], -1)
        a[idx] = new
        lp[idx] = logp.gather(1, new[:, None]).squeeze(1)

    def rollout(self, progress: float):
        c, N, T = self.cfg, self.N, self.cfg.rollout_steps
        O, A = wars_engine.OBS_SIZE, wars_engine.NUM_ACTIONS
        shaping = max(0.0, 1.0 - progress / max(c.shaping_anneal_frac, 1e-9))
        eps = c.explore_eps * max(0.0, 1.0 - progress / max(c.explore_anneal_frac, 1e-9))
        b_obs = torch.zeros(T, N, 2, O)
        b_mask = torch.zeros(T, N, 2, A, dtype=torch.bool)
        b_act = torch.zeros(T, N, 2, dtype=torch.long)
        b_logp = torch.zeros(T, N, 2)
        b_val = torch.zeros(T, N, 2)
        b_rew = np.zeros((T, N, 2), dtype=np.float32)
        b_done = np.zeros((T, N), dtype=np.float32)
        b_learn = np.zeros((T, N, 2), dtype=bool)
        rec = c.recurrent
        b_h = torch.zeros(T, N, 2, rec) if rec else None  # memory before each decision
        obs, mask = self.venv.observe()
        phi = self._potential_parts(obs)  # (N, 2, 3): front line, Trebuchets, raw Trebuchet score
        self.idle = [0, 0]  # learner decisions that waited although something was affordable / all decisions
        self.search_data, self.search_stats, self.review_stats = [], [], {}
        review = c.review_frac > 0
        if review and (getattr(self, "hist", None) is None or self.hist.num_envs != N * T):
            self.hist = wars_engine.VecEnv(N * T, threads=c.env_threads)  # every decision's game state
        hist_kinds = []
        for t in range(T):
            learn = self.ctrl == CTRL_LEARNER
            li = np.nonzero(learn)
            if review:
                self.hist.copy_from(list(range(t * N, (t + 1) * N)), self.venv, list(range(N)), [-1] * N, [0] * N)
                hist_kinds.append(list(self.kind))
            if c.search_frac > 0 and t % c.search_every == 0 and len(li[0]):
                self._search_some(li, obs, mask, shaping)
            lt = tuple(torch.from_numpy(x) for x in li)
            actions = np.full((N, 2), WAIT, dtype=np.int64)
            o_t, m_t = torch.from_numpy(obs), torch.from_numpy(mask)
            if rec:
                b_h[t] = self.h
            a, lp, v, h_new, logits = self.model.act(o_t[lt], m_t[lt], h=self.h[lt] if rec else None)
            if rec:
                self.h[lt] = h_new
            if eps > 0:
                self._explore(logits, m_t[lt], a, lp, eps)
            actions[li] = a.numpy()
            could_act = mask[li][:, :WAIT].any(axis=1)
            self.idle[0] += int(((actions[li] == WAIT) & could_act).sum())
            self.idle[1] += len(could_act)
            self._opponent_actions(obs, mask, actions)
            b_obs[t], b_mask[t] = o_t, m_t
            b_act[t][lt], b_logp[t][lt], b_val[t][lt] = a, lp, v
            b_learn[t] = learn

            obs, mask, comp, done, winner, ticks = self.venv.step(actions)
            b_rew[t], pot, _ = self._shaped_parts(comp, done, winner, shaping, phi, obs)
            b_rew[t] += pot.sum(-1)
            b_done[t] = done
            self._track_rewards(comp, done, shaping, pot, b_rew[t], ticks)
            if done.any():
                for i in np.flatnonzero(done):
                    self._record_episode(int(i), int(winner[i]), int(ticks[i]))
                    self._reset_env(int(i))
                    self.ep_rew[i] = 0.0
                    self.ep_sample[i] = 0
                    self.ep_curve[i] = []
                    self.ep_state[i] = []
                obs, mask = self.venv.observe()
            phi = self._potential_parts(obs)
        self.env_steps += N * T
        with torch.no_grad():
            o_t, m_t = torch.from_numpy(obs), torch.from_numpy(mask)
            if rec:  # the memory after seeing the last observation (the next rollout recomputes it the same way)
                h_last = self.model.step(o_t.reshape(N * 2, O), m_t.reshape(N * 2, A), self.h.reshape(N * 2, rec))[1]
                last_v = self.model.value(o_t.reshape(N * 2, O), h_last).reshape(N, 2).numpy()
            else:
                last_v = self.model.value(o_t).numpy()
            last_v = last_v * (self.ctrl == CTRL_LEARNER)

        # GAE per (env, side) slot; controllers only change at episode boundaries
        vals = b_val.numpy()
        adv = np.zeros_like(b_rew)
        gae = np.zeros((N, 2), dtype=np.float32)
        for t in reversed(range(T)):
            next_v = last_v if t == T - 1 else vals[t + 1]
            nonterm = (1.0 - b_done[t])[:, None]
            delta = b_rew[t] + c.gamma * next_v * nonterm - vals[t]
            gae = delta + c.gamma * c.gae_lambda * nonterm * gae
            adv[t] = gae
        ret = adv + vals
        if review:
            self._review(adv, b_learn, b_obs, b_mask, b_act, b_h, hist_kinds, shaping)
        if rec:
            return self._sequences(b_obs, b_mask, b_act, b_logp, b_val, adv, ret, b_learn, b_done, b_h)
        sel = torch.from_numpy(b_learn.reshape(-1))
        flat = lambda x, *shape: x.reshape(T * N * 2, *shape)[sel]
        return dict(obs=flat(b_obs, O), mask=flat(b_mask, A), act=flat(b_act), logp=flat(b_logp),
                    val=flat(b_val), adv=flat(torch.from_numpy(adv)), ret=flat(torch.from_numpy(ret)))

    def _sequences(self, b_obs, b_mask, b_act, b_logp, b_val, adv, ret, b_learn, b_done, b_h) -> dict:
        """Cut the rollout into stretches of seq_len consecutive decisions per (game, side) for a memory
        network: (L, S, ...) tensors, the memory at the start of each stretch (S, memory), where a new
        game starts inside it, and which steps are the learner's (only those count in the losses)."""
        T, N = b_learn.shape[:2]
        L = min(self.cfg.seq_len, T)
        pad = (-T) % L
        reset = np.zeros((T, N), dtype=bool)
        reset[1:] = b_done[:-1] > 0
        def seq(x):
            x = torch.as_tensor(x)
            if pad:
                x = torch.cat([x, torch.zeros(pad, *x.shape[1:], dtype=x.dtype)])
            x = x.reshape(-1, L, *x.shape[1:]).transpose(0, 1)  # (L, chunks, N, ...)
            if x.dim() == 3:  # per game (reset): the same for both sides
                x = x[..., None].expand(-1, -1, -1, 2)
            return x.reshape(L, -1, *x.shape[4:])  # (L, chunks * N * 2, ...)
        learn = seq(b_learn)
        keep = learn.any(0)
        out = {k: seq(v)[:, keep] for k, v in dict(obs=b_obs, mask=b_mask, act=b_act, logp=b_logp, val=b_val,
                                                   adv=adv, ret=ret, reset=reset).items()}
        out["learn"] = learn[:, keep]
        out["h0"] = b_h[::L].reshape(-1, b_h.shape[-1])[keep]
        out["reset"][0] = False  # h0 already is the memory at the stretch's first decision
        return out

    # ---------------------------------------------------------------- update
    def ppo_update(self, batch: dict, progress: float) -> dict:
        c = self.cfg
        lr = c.lr + (c.lr_final - c.lr) * progress
        ent_coef = c.ent_coef + (c.ent_coef_final - c.ent_coef) * progress
        for g in self.opt.param_groups:
            g["lr"] = lr
        seqs = "h0" in batch  # memory network: minibatches of whole stretches (see _sequences)
        if seqs:
            n = batch["obs"].shape[1]
            n_samples = int(batch["learn"].sum())
            n_mb = max(1, min(n, round(n_samples / c.minibatch_size)))
        else:
            n = n_samples = batch["obs"].shape[0]
            n_mb = max(1, round(n / c.minibatch_size))
        stats = defaultdict(list)
        stop = False
        skipped = 0
        # AlphaZero-style targets from the search: spread over the minibatches, once per epoch
        sd = getattr(self, "search_data", []) if c.search_coef > 0 else []
        if sd:
            s_obs = torch.from_numpy(np.concatenate([x[0] for x in sd]))
            s_mask = torch.from_numpy(np.concatenate([x[1] for x in sd]))
            s_tgt = torch.from_numpy(np.concatenate([x[2] for x in sd]))
            s_h = torch.cat([x[3] for x in sd]) if self.model.recurrent else None
            t_ent = float(-(s_tgt * torch.log(s_tgt.clamp_min(1e-12))).sum(-1).mean())
        for _ in range(c.epochs):
            s_chunks = torch.randperm(len(s_obs)).tensor_split(n_mb) if sd else [None] * n_mb
            # near-equal minibatches: a 1-sample remainder would make adv.std() NaN
            for mb, sc in zip(torch.randperm(n).tensor_split(n_mb), s_chunks):
                if seqs:
                    w = batch["learn"][:, mb]
                    logp, ent, v = self.model.evaluate_seq(batch["obs"][:, mb], batch["mask"][:, mb],
                                                           batch["act"][:, mb], batch["h0"][mb], batch["reset"][:, mb])
                    logp, ent, v = logp[w], ent[w], v[w]
                    old_logp, adv, ret = (batch[k][:, mb][w] for k in ("logp", "adv", "ret"))
                    if len(logp) < 2:
                        continue
                else:
                    logp, ent, v = self.model.evaluate(batch["obs"][mb], batch["mask"][mb], batch["act"][mb])
                    old_logp, adv, ret = batch["logp"][mb], batch["adv"][mb], batch["ret"][mb]
                ratio = (logp - old_logp).exp()
                adv = (adv - adv.mean()) / (adv.std() + 1e-8)
                pg = -torch.min(ratio * adv, ratio.clamp(1 - c.clip, 1 + c.clip) * adv).mean()
                vf = 0.5 * (v - ret).pow(2).mean()
                loss = pg + c.vf_coef * vf - ent_coef * ent.mean()
                if sc is not None and len(sc):
                    lp_all = torch.log_softmax(self.model.logits(s_obs[sc], s_mask[sc], s_h[sc] if s_h is not None else None),
                                               -1).masked_fill(~s_mask[sc], 0.0)
                    ce = -(s_tgt[sc] * lp_all).sum(-1).mean()
                    loss = loss + c.search_coef * ce
                    stats["search_kl"].append(ce.item() - t_ent)  # KL(search target || policy)
                self.opt.zero_grad()
                loss.backward()
                grad_norm = nn.utils.clip_grad_norm_(self.model.parameters(), c.max_grad_norm)
                if not (torch.isfinite(loss) and torch.isfinite(grad_norm)):
                    skipped += 1  # never let one bad minibatch poison the weights
                    continue
                self.opt.step()
                with torch.no_grad():
                    kl = ((ratio - 1) - (logp - old_logp)).mean().item()
                stats["pg_loss"].append(pg.item())
                stats["vf_loss"].append(vf.item())
                stats["entropy"].append(ent.mean().item())
                stats["approx_kl"].append(kl)
                stats["clipfrac"].append(((ratio - 1).abs() > c.clip).float().mean().item())
                if c.target_kl and kl > 1.5 * c.target_kl:
                    stop = True
                    break
            if stop:
                break
        out = {k: float(np.mean(v)) for k, v in stats.items()}
        y, p = batch["ret"], batch["val"]
        if seqs:
            y, p = y[batch["learn"]], p[batch["learn"]]
        y, p = y.numpy(), p.numpy()
        out["explained_var"] = float(1 - np.var(y - p) / (np.var(y) + 1e-8))
        out.update(lr=lr, ent_coef=ent_coef, samples=n_samples, early_stop=stop, skipped_minibatches=skipped)
        for k in ("search_roots", "search_copies", "search_s"):
            if getattr(self, "search_stats", None):
                out[k] = float(sum(s[k] for s in self.search_stats))
        out.update(getattr(self, "review_stats", {}))
        for k in ("search_agree", "search_q_spread"):
            if getattr(self, "search_stats", None):
                out[k] = float(np.mean([s[k] for s in self.search_stats]))
        return out

    # ------------------------------------------------------------------ main
    def save_milestone(self):
        """Actor-only copy that is never deleted, so strength can be measured over the whole run."""
        d = os.path.join(self.cfg.run_dir, "milestones")
        os.makedirs(d, exist_ok=True)
        torch.save({"model_config": self.model.cfg.to_dict(), "actor": self.model.actor.state_dict(),
                    "update": self.update, "env_steps": self.env_steps,
                    "train_config": {"decision_interval": self.cfg.decision_interval,
                                     "max_upgrades": self.cfg.max_upgrades}},
                   os.path.join(d, f"u{self.update:06d}.pt"))

    def save(self):
        path = os.path.join(self.cfg.run_dir, "latest.pt")
        save_checkpoint(path + ".tmp", self.model, optimizer=self.opt.state_dict(), update=self.update,
                        env_steps=self.env_steps, episodes=self.episodes, train_config=dataclasses.asdict(self.cfg),
                        results={k: list(v) for k, v in self.results.items()}, ep_ticks=list(self.ep_ticks))
        os.replace(path + ".tmp", path)

    def train(self):
        c = self.cfg
        while True:
            self._apply_live_changes()
            if self.env_steps >= c.total_env_steps:
                break
            t0 = time.time()
            progress = self.env_steps / c.total_env_steps
            torch.set_num_threads(c.rollout_torch_threads)
            batch = self.rollout(progress)
            t1 = time.time()
            torch.set_num_threads(c.torch_threads)
            stats = self.ppo_update(batch, progress)
            t2 = time.time()
            self.update += 1
            if self.update % c.milestone_every == 0:
                self.save_milestone()
            if self.update % c.snapshot_every == 0:
                self.league.add(self.model, self.update, in_use=np.unique(self.ctrl[self.ctrl > 0]))
            self.league.save_index()
            if self.update % c.save_every == 0:
                self.save()
            if self.update % c.export_every == 0:
                export(self.model, os.path.join(c.run_dir, "ultimate_model.json"), c.decision_interval,
                       {"update": self.update, "env_steps": self.env_steps, "max_upgrades": c.max_upgrades})
            win = {k: round(float(np.mean(np.array(v) == 1.0)), 3) for k, v in self.results.items() if len(v)}
            draw = {k: round(float(np.mean(np.array(v) == 0.5)), 3) for k, v in self.results.items() if len(v)}
            games = {k: len(v) for k, v in self.results.items()}
            rec = dict(update=self.update, env_steps=self.env_steps, episodes=self.episodes,
                       sps=round(c.num_envs * c.rollout_steps / (t2 - t0)), rollout_s=round(t1 - t0, 2),
                       update_s=round(t2 - t1, 2), win=win, draw=draw, games=games,
                       ep_ticks=round(float(np.mean(self.ep_ticks))) if self.ep_ticks else None,
                       hints_now=round(max(0.0, 1.0 - progress / max(c.shaping_anneal_frac, 1e-9)), 4),
                       idle_wait=round(self.idle[0] / max(1, self.idle[1]), 4),
                       explore_now=round(c.explore_eps * max(0.0, 1.0 - progress / max(c.explore_anneal_frac, 1e-9)), 5),
                       **stats)
            self._pool_step()
            with open(os.path.join(c.run_dir, "log.jsonl"), "a") as fh:
                fh.write(json.dumps(rec) + "\n")
            print(f"[u{self.update} {self.env_steps / 1e6:.2f}M] sps {rec['sps']} ({rec['rollout_s']}s+{rec['update_s']}s) "
                  f"eps {self.episodes} len {rec['ep_ticks']} | win {win} draw {draw} | ent {stats['entropy']:.3f} "
                  f"kl {stats['approx_kl']:.4f} ev {stats['explained_var']:.2f} | league {self.league.summary(3)}",
                  flush=True)
        self.save()
        export(self.model, os.path.join(c.run_dir, "ultimate_model.json"), c.decision_interval,
               {"update": self.update, "env_steps": self.env_steps, "max_upgrades": c.max_upgrades})


_signal_name = "Ctrl+C"


def _interrupt(signum, _frame):
    global _signal_name
    _signal_name = signal.Signals(signum).name
    raise KeyboardInterrupt


def _session_event(run_dir: str, trainer, **rec):
    """<run_dir>/sessions.jsonl: one line when training starts and one when it ends (and why)."""
    rec = {"time": round(time.time(), 1), "pid": os.getpid(), **rec}
    if trainer is not None:
        rec.update(update=trainer.update, env_steps=trainer.env_steps)
    try:
        with open(os.path.join(run_dir, "sessions.jsonl"), "a") as fh:
            fh.write(json.dumps(rec) + "\n")
    except OSError:
        pass


def _keep_awake(cfg: TrainConfig):
    # macOS puts the computer to sleep when idle, which pauses training. caffeinate -i -s prevents
    # idle sleep (and, on power, system sleep) until this process exits. Closing the lid still sleeps.
    if sys.platform == "darwin" and cfg.prevent_sleep:
        try:
            subprocess.Popen(["caffeinate", "-i", "-s", "-w", str(os.getpid())], stdin=subprocess.DEVNULL,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError:
            pass


def main():
    # Ctrl+C, a dashboard "Stop" (SIGTERM / Ctrl+Break on Windows): save, then exit. SIGINT is set
    # explicitly because processes started in the background inherit an *ignored* SIGINT.
    for name in ("SIGINT", "SIGTERM", "SIGBREAK", "SIGHUP"):
        if hasattr(signal, name):
            signal.signal(getattr(signal, name), _interrupt)
    cfg = parse_config()
    os.makedirs(cfg.run_dir, exist_ok=True)
    trainer = None
    try:
        trainer = Trainer(cfg)
        _session_event(cfg.run_dir, trainer, event="start")
        _keep_awake(cfg)
        trainer.train()
        _session_event(cfg.run_dir, trainer, event="end", state="finished", reason="reached the training length")
    except KeyboardInterrupt:
        if trainer is None:
            _session_event(cfg.run_dir, None, event="end", state="stopped", reason=f"{_signal_name} while starting")
            raise SystemExit(1)
        print(f"\ninterrupted ({_signal_name}): saving latest.pt (resume by running the same command again)")
        trainer.save()
        _session_event(cfg.run_dir, trainer, event="end", state="stopped",
                       reason={"SIGTERM": "stopped (Stop button or kill)", "SIGINT": "stopped with Ctrl+C",
                               "Ctrl+C": "stopped with Ctrl+C", "SIGHUP": "its terminal was closed",
                               "SIGBREAK": "stopped (Stop button or Ctrl+Break)"}.get(_signal_name, _signal_name))
    except BaseException as e:
        tb = traceback.format_exc()
        _session_event(cfg.run_dir, trainer, event="end", state="crashed",
                       reason=f"{type(e).__name__}: {e}"[:300], error=tb[-4000:])
        if trainer is not None and not isinstance(e, MemoryError) and \
                all(torch.isfinite(p).all() for p in trainer.model.parameters()):
            try:  # keep the progress since the last save if the model itself is fine
                trainer.save()
                print("crashed: saved latest.pt first", flush=True)
            except BaseException:
                pass
        raise


if __name__ == "__main__":
    main()
