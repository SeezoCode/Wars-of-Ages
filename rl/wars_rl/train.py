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
import time
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
from .league import League
from .model import ActorCritic, ModelConfig, save_checkpoint

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))

CTRL_LEARNER = 0
CTRL_BUILTIN = -1
CTRL_RANDOM = -2
WAIT = wars_engine.NUM_ACTIONS - 1
OPPONENT_KINDS = ["self", "past", "classic", "dqn", "random"]


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

    # environment (see EnvConfig in rl/engine/src/env.rs)
    decision_interval: int = 15
    max_ticks: int = 54_000             # 15 minutes; then a draw
    nuke_freeze_ticks: int = 45
    start_money: float = 55.0
    agent_max_units: int = 10
    classic_max_units: int = 7
    dqn_max_units: int = 10
    worker_latency: int = 1
    worker_unit_ticks_per_frame: float = 60_000.0
    dqn_model: str = os.path.join(REPO, "ultimate_dqn_model.json")

    # network
    actor_hidden: List[int] = field(default_factory=lambda: [512, 512, 256])
    critic_hidden: List[int] = field(default_factory=lambda: [512, 512, 256])
    activation: str = "relu"
    layernorm: bool = True

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
    draw_reward: float = -0.5
    shaping_base_damage: float = 2.0   # x (enemy base damage - own base damage) / 800
    shaping_bounty: float = 0.03       # x (bounty earned - bounty given) / 100
    shaping_front: float = 1.0         # potential-based: gamma*phi(s') - phi(s), phi = own front - enemy front
    shaping_siege: float = 1.0         # potential-based: own Trebuchets advancing into base-hitting range
    shaping_anneal_frac: float = 0.8   # shaping fades to 0 over this fraction of training

    # opponent mix (normalized)
    p_self: float = 0.25
    p_past: float = 0.4
    p_classic: float = 0.05   # expensive (brute-force worker search)
    p_dqn: float = 0.15
    p_random: float = 0.15
    # random opponents act on only a fraction of their decisions, drawn per episode as
    # U(0,1)**random_activity_power: a curriculum from near-idle to full spam
    random_activity_power: float = 2.0

    # league / bookkeeping
    snapshot_every: int = 20
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
    "ent_coef_final", "vf_coef", "max_grad_norm", "target_kl", "explore_eps", "explore_anneal_frac", "win_reward",
    "draw_reward", "shaping_base_damage", "shaping_bounty", "shaping_front", "shaping_siege", "shaping_anneal_frac",
    "p_self", "p_past", "p_classic", "p_dqn", "p_random", "random_activity_power", "snapshot_every", "max_snapshots",
    "save_every", "export_every", "torch_threads", "rollout_torch_threads",
}
POSITIVE_INT = {"total_env_steps", "epochs", "minibatch_size", "snapshot_every", "max_snapshots", "save_every",
                "export_every", "torch_threads", "rollout_torch_threads"}


def parse_config() -> TrainConfig:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", help="JSON file with TrainConfig fields")
    for f in dataclasses.fields(TrainConfig):
        name = "--" + f.name.replace("_", "-")
        if f.type in ("bool", bool):
            ap.add_argument(name, dest=f.name, action=argparse.BooleanOptionalAction, default=None)
        elif "List" in str(f.type):
            ap.add_argument(name, dest=f.name, type=lambda s: [int(x) for x in s.split(",")], default=None)
        else:
            typ = {"int": int, "float": float, "str": str}.get(str(f.type), str)
            ap.add_argument(name, dest=f.name, type=typ, default=None)
    args = ap.parse_args()
    cfg = TrainConfig()
    if args.config:
        with open(args.config) as fh:
            for k, v in json.load(fh).items():
                if not hasattr(cfg, k):
                    raise SystemExit(f"unknown config key: {k}")
                setattr(cfg, k, v)
    for f in dataclasses.fields(TrainConfig):
        v = getattr(args, f.name)
        if v is not None:
            setattr(cfg, f.name, v)
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
            start_money=cfg.start_money, agent_max_units=cfg.agent_max_units,
            classic_max_units=cfg.classic_max_units, dqn_max_units=cfg.dqn_max_units,
            worker_latency=cfg.worker_latency, dqn_model=dqn_path, threads=cfg.env_threads)
        mcfg = ModelConfig(wars_engine.OBS_SIZE, wars_engine.NUM_ACTIONS, list(cfg.actor_hidden),
                           list(cfg.critic_hidden), cfg.activation, cfg.layernorm)
        self.model = ActorCritic(mcfg)
        self.opt = torch.optim.Adam(self.model.parameters(), lr=cfg.lr, eps=1e-5)
        self.league = League(os.path.join(cfg.run_dir, "league"), mcfg, cfg.max_snapshots)
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
        p = np.array([c.p_self, c.p_past, c.p_classic, c.p_dqn if self.has_dqn else 0.0, c.p_random], dtype=float)
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
                if ckpt["model_config"] != self.model.cfg.to_dict():
                    raise SystemExit(f"{self.cfg.init_from} has a different architecture than this config")
                self.model.load_state_dict(ckpt["state_dict"])
                print(f"initialized weights from {self.cfg.init_from} (update {ckpt.get('update')})")
            return
        ckpt = torch.load(path, map_location="cpu", weights_only=False)
        if ckpt["model_config"] != self.model.cfg.to_dict():
            raise SystemExit(f"{path} has a different architecture; use another --run-dir or --no-resume")
        self.model.load_state_dict(ckpt["state_dict"])
        self.opt.load_state_dict(ckpt["optimizer"])
        self.update = ckpt["update"]
        self.env_steps = ckpt["env_steps"]
        self.episodes = ckpt.get("episodes", 0)
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
        self.venv.reset(i, kinds[0], kinds[1], self._next_seed())
        self.ctrl[i] = ctrl
        self.kind[i] = kind

    def _record_episode(self, i: int, winner: int, ticks: int):
        self.episodes += 1
        self.ep_ticks.append(ticks)
        kind = self.kind[i]
        info = self.venv.info(i)
        side = 0 if kind == "self" or self.ctrl[i, 0] == CTRL_LEARNER else 1
        me, en = ("left", "right") if side == 0 else ("right", "left")
        rec = {"time": round(time.time(), 1), "update": self.update, "opponent": kind, "side": me,
               "ticks": ticks, "own_base": round(info[me]["base_health"]), "enemy_base": round(info[en]["base_health"]),
               "result": "W" if winner == side else ("L" if winner == 1 - side else "D")}
        if kind == "past":
            rec["opponent_id"] = int(self.ctrl[i, 1 - side])
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
    def _rewards(self, comp: np.ndarray, done: np.ndarray, winner: np.ndarray, shaping: float) -> np.ndarray:
        c = self.cfg
        r = shaping * (c.shaping_base_damage * (comp[..., 0] - comp[..., 1]) +
                       c.shaping_bounty * (comp[..., 2] - comp[..., 3]))
        for s in range(2):
            out = np.where(winner == s, c.win_reward, np.where(winner == 1 - s, -c.win_reward,
                                                                np.where(winner == 2, c.draw_reward, 0.0)))
            r[:, s] += np.where(done, out, 0.0)
        return r.astype(np.float32)

    def _potential(self, obs: np.ndarray) -> np.ndarray:
        """Potential for shaping (gamma*phi(s') - phi(s) keeps the optimal policy unchanged).

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
        return self.cfg.shaping_front * (own_front - en_depth) + self.cfg.shaping_siege * siege

    # --------------------------------------------------------------- rollout
    def _opponent_actions(self, obs: np.ndarray, mask: np.ndarray, actions: np.ndarray):
        for sid in np.unique(self.ctrl[self.ctrl > 0]):
            idx = np.nonzero(self.ctrl == sid)
            a, _, _ = self.league.model(int(sid)).act(torch.from_numpy(obs[idx]), torch.from_numpy(mask[idx]),
                                                      with_value=False)
            actions[idx] = a.numpy()
        ridx = np.nonzero(self.ctrl == CTRL_RANDOM)
        for e, s in zip(*ridx):
            if self.rng.random() < self.activity[e]:
                actions[e, s] = self.rng.choice(np.flatnonzero(mask[e, s]))

    @torch.no_grad()
    def _explore(self, obs: torch.Tensor, mask: torch.Tensor, a: torch.Tensor, lp: torch.Tensor, eps: float):
        """Replace a random eps-fraction of actions by uniform valid non-wait actions (in place)."""
        m = mask.clone()
        m[:, WAIT] = False
        pick = (torch.rand(len(a)) < eps) & m.any(1)
        if not pick.any():
            return
        idx = pick.nonzero().squeeze(1)
        new = torch.multinomial(m[idx].float(), 1).squeeze(1)
        logp = torch.log_softmax(self.model.logits(obs[idx], mask[idx]), -1)
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
        obs, mask = self.venv.observe()
        phi = self._potential(obs)
        for t in range(T):
            learn = self.ctrl == CTRL_LEARNER
            li = np.nonzero(learn)
            lt = tuple(torch.from_numpy(x) for x in li)
            actions = np.full((N, 2), WAIT, dtype=np.int64)
            o_t, m_t = torch.from_numpy(obs), torch.from_numpy(mask)
            a, lp, v = self.model.act(o_t[lt], m_t[lt])
            if eps > 0:
                self._explore(o_t[lt], m_t[lt], a, lp, eps)
            actions[li] = a.numpy()
            self._opponent_actions(obs, mask, actions)
            b_obs[t], b_mask[t] = o_t, m_t
            b_act[t][lt], b_logp[t][lt], b_val[t][lt] = a, lp, v
            b_learn[t] = learn

            obs, mask, comp, done, winner, ticks = self.venv.step(actions)
            b_rew[t] = self._rewards(comp, done, winner, shaping)
            phi_next = np.where(done[:, None], 0.0, self._potential(obs))
            b_rew[t] += shaping * (c.gamma * phi_next - phi)
            b_done[t] = done
            if done.any():
                for i in np.flatnonzero(done):
                    self._record_episode(int(i), int(winner[i]), int(ticks[i]))
                    self._reset_env(int(i))
                obs, mask = self.venv.observe()
            phi = self._potential(obs)
        self.env_steps += N * T
        with torch.no_grad():
            last_v = self.model.value(torch.from_numpy(obs)).numpy() * (self.ctrl == CTRL_LEARNER)

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
        sel = torch.from_numpy(b_learn.reshape(-1))
        flat = lambda x, *shape: x.reshape(T * N * 2, *shape)[sel]
        return dict(obs=flat(b_obs, O), mask=flat(b_mask, A), act=flat(b_act), logp=flat(b_logp),
                    val=flat(b_val), adv=flat(torch.from_numpy(adv)), ret=flat(torch.from_numpy(ret)))

    # ---------------------------------------------------------------- update
    def ppo_update(self, batch: dict, progress: float) -> dict:
        c = self.cfg
        lr = c.lr + (c.lr_final - c.lr) * progress
        ent_coef = c.ent_coef + (c.ent_coef_final - c.ent_coef) * progress
        for g in self.opt.param_groups:
            g["lr"] = lr
        n = batch["obs"].shape[0]
        stats = defaultdict(list)
        stop = False
        n_mb = max(1, round(n / c.minibatch_size))
        skipped = 0
        for _ in range(c.epochs):
            # near-equal minibatches: a 1-sample remainder would make adv.std() NaN
            for mb in torch.randperm(n).tensor_split(n_mb):
                logp, ent, v = self.model.evaluate(batch["obs"][mb], batch["mask"][mb], batch["act"][mb])
                ratio = (logp - batch["logp"][mb]).exp()
                adv = batch["adv"][mb]
                adv = (adv - adv.mean()) / (adv.std() + 1e-8)
                pg = -torch.min(ratio * adv, ratio.clamp(1 - c.clip, 1 + c.clip) * adv).mean()
                vf = 0.5 * (v - batch["ret"][mb]).pow(2).mean()
                loss = pg + c.vf_coef * vf - ent_coef * ent.mean()
                self.opt.zero_grad()
                loss.backward()
                grad_norm = nn.utils.clip_grad_norm_(self.model.parameters(), c.max_grad_norm)
                if not (torch.isfinite(loss) and torch.isfinite(grad_norm)):
                    skipped += 1  # never let one bad minibatch poison the weights
                    continue
                self.opt.step()
                with torch.no_grad():
                    kl = ((ratio - 1) - (logp - batch["logp"][mb])).mean().item()
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
        y, p = batch["ret"].numpy(), batch["val"].numpy()
        out["explained_var"] = float(1 - np.var(y - p) / (np.var(y) + 1e-8))
        out.update(lr=lr, ent_coef=ent_coef, samples=n, early_stop=stop, skipped_minibatches=skipped)
        return out

    # ------------------------------------------------------------------ main
    def save(self):
        path = os.path.join(self.cfg.run_dir, "latest.pt")
        save_checkpoint(path + ".tmp", self.model, optimizer=self.opt.state_dict(), update=self.update,
                        env_steps=self.env_steps, episodes=self.episodes, train_config=dataclasses.asdict(self.cfg))
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
            if self.update % c.snapshot_every == 0:
                self.league.add(self.model, self.update)
            self.league.save_index()
            if self.update % c.save_every == 0:
                self.save()
            if self.update % c.export_every == 0:
                export(self.model, os.path.join(c.run_dir, "ultimate_model.json"), c.decision_interval,
                       {"update": self.update, "env_steps": self.env_steps})
            win = {k: round(float(np.mean(np.array(v) == 1.0)), 3) for k, v in self.results.items() if len(v)}
            draw = {k: round(float(np.mean(np.array(v) == 0.5)), 3) for k, v in self.results.items() if len(v)}
            games = {k: len(v) for k, v in self.results.items()}
            rec = dict(update=self.update, env_steps=self.env_steps, episodes=self.episodes,
                       sps=round(c.num_envs * c.rollout_steps / (t2 - t0)), rollout_s=round(t1 - t0, 2),
                       update_s=round(t2 - t1, 2), win=win, draw=draw, games=games,
                       ep_ticks=round(float(np.mean(self.ep_ticks))) if self.ep_ticks else None,
                       hints_now=round(max(0.0, 1.0 - progress / max(c.shaping_anneal_frac, 1e-9)), 4),
                       explore_now=round(c.explore_eps * max(0.0, 1.0 - progress / max(c.explore_anneal_frac, 1e-9)), 5),
                       **stats)
            with open(os.path.join(c.run_dir, "log.jsonl"), "a") as fh:
                fh.write(json.dumps(rec) + "\n")
            print(f"[u{self.update} {self.env_steps / 1e6:.2f}M] sps {rec['sps']} ({rec['rollout_s']}s+{rec['update_s']}s) "
                  f"eps {self.episodes} len {rec['ep_ticks']} | win {win} draw {draw} | ent {stats['entropy']:.3f} "
                  f"kl {stats['approx_kl']:.4f} ev {stats['explained_var']:.2f} | league {self.league.summary(3)}",
                  flush=True)
        self.save()
        export(self.model, os.path.join(c.run_dir, "ultimate_model.json"), c.decision_interval,
               {"update": self.update, "env_steps": self.env_steps})


def _interrupt(*_):
    raise KeyboardInterrupt


def main():
    # Ctrl+C, a dashboard "Stop" (SIGTERM / Ctrl+Break on Windows): save, then exit. SIGINT is set
    # explicitly because processes started in the background inherit an *ignored* SIGINT.
    for name in ("SIGINT", "SIGTERM", "SIGBREAK"):
        if hasattr(signal, name):
            signal.signal(getattr(signal, name), _interrupt)
    trainer = Trainer(parse_config())
    try:
        trainer.train()
    except KeyboardInterrupt:
        print("\ninterrupted: saving latest.pt (resume by running the same command again)")
        trainer.save()


if __name__ == "__main__":
    main()
