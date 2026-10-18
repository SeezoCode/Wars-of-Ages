"""Evaluate a policy against the built-in bots or another policy.

    cd rl
    python -m wars_rl.evaluate runs/ultimate/latest.pt                       # vs classic, dqn, random
    python -m wars_rl.evaluate ../ultimate_model.json --opponents classic --games 200
    python -m wars_rl.evaluate runs/a/latest.pt --opponents runs/b/latest.pt --greedy

Half of the games are played on each side. `--greedy` takes the arg-max action
(the browser bot samples by default, like training).
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import os
import time

import numpy as np
import torch

import wars_engine

from .model import MASK_VALUE, FrozenActor, ModelConfig, load_model

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
WAIT = wars_engine.NUM_ACTIONS - 1


class TorchPolicy:
    def __init__(self, path: str):
        ckpt = torch.load(path, map_location="cpu", weights_only=False)
        if "actor" in ckpt:  # actor-only file: a milestone or league snapshot
            self.actor = FrozenActor(ModelConfig(**ckpt["model_config"]), ckpt["actor"]).actor
        else:
            model, ckpt = load_model(path)
            self.actor = model.actor
        self.decision_interval = ckpt.get("train_config", {}).get("decision_interval", 10)
        self.update, self.env_steps = ckpt.get("update"), ckpt.get("env_steps")

    def logits(self, obs: np.ndarray, mask: np.ndarray) -> np.ndarray:
        with torch.no_grad():
            return self.actor(torch.from_numpy(obs)).masked_fill(~torch.from_numpy(mask), MASK_VALUE).numpy()


class JsonPolicy:
    """Runs an exported browser model (same math as UltimateBot.forward)."""

    def __init__(self, path: str):
        with open(path) as f:
            data = json.load(f)
        self.decision_interval = data.get("decision_interval", 10)
        dec = lambda s: np.frombuffer(base64.b64decode(s), dtype="<f4")
        self.layers = []
        for l in data["layers"]:
            l = dict(l)
            if "weight" in l:
                l["weight"] = dec(l["weight"])
                l["bias"] = dec(l["bias"])
                if l["type"] == "linear":
                    l["weight"] = l["weight"].reshape(l["out"], l["in"])
            self.layers.append(l)

    def logits(self, obs: np.ndarray, mask: np.ndarray) -> np.ndarray:
        x = obs.astype(np.float32)
        for l in self.layers:
            t = l["type"]
            if t == "linear":
                x = (x.astype(np.float64) @ l["weight"].T.astype(np.float64) + l["bias"]).astype(np.float32)
            elif t == "layernorm":
                xd = x.astype(np.float64)
                m = xd.mean(-1, keepdims=True)
                v = ((xd - m) ** 2).mean(-1, keepdims=True)
                x = ((xd - m) / np.sqrt(v + l["eps"]) * l["weight"] + l["bias"]).astype(np.float32)
            elif t == "relu":
                x = np.maximum(x, 0)
            elif t == "tanh":
                x = np.tanh(x)
            elif t == "silu":
                x = (x / (1 + np.exp(-x.astype(np.float64)))).astype(np.float32)
        return np.where(mask, x, -1e9)


class RandomPolicy:
    decision_interval = None

    def logits(self, obs, mask):
        return np.where(mask, 0.0, -1e9)


def load_policy(spec: str):
    if spec == "random":
        return RandomPolicy()
    if spec.endswith(".json"):
        return JsonPolicy(spec)
    return TorchPolicy(spec)


def choose(logits: np.ndarray, greedy: bool, rng: np.random.Generator) -> np.ndarray:
    if greedy:
        return logits.argmax(-1)
    z = logits - logits.max(-1, keepdims=True)
    p = np.exp(z)
    p /= p.sum(-1, keepdims=True)
    u = rng.random((len(p), 1))
    return np.minimum((p.cumsum(-1) < u).sum(-1), p.shape[-1] - 1)


def wilson(wins: float, n: int, z: float = 1.96):
    if n == 0:
        return 0.0, 0.0
    p = wins / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return max(0.0, c - h), min(1.0, c + h)


def evaluate(policy, opponent: str, games: int, envs: int, greedy: bool, seed: int, dqn_model: str | None,
             threads: int = 4, **env_kwargs):
    builtin = opponent in ("classic", "dqn")
    opp_policy = None if builtin else load_policy(opponent)
    di = env_kwargs.pop("decision_interval", None) or getattr(policy, "decision_interval", None) or 10
    opp_di = getattr(opp_policy, "decision_interval", None)
    if opp_di and opp_di != di:
        print(f"  warning: opponent was trained with decision_interval {opp_di}, playing at {di}")
    env_kwargs["decision_interval"] = di
    n_envs = min(envs, games)
    venv = wars_engine.VecEnv(n_envs, dqn_model=dqn_model, threads=threads, **env_kwargs)
    rng = np.random.default_rng(seed)
    started = 0
    side = np.zeros(n_envs, dtype=np.int64)
    active = np.zeros(n_envs, dtype=bool)
    w = d = l = 0
    ticks = []

    def start(i):
        nonlocal started
        s = started % 2
        kinds = ["agent", "agent"]
        if builtin:
            kinds[1 - s] = opponent
        venv.reset(i, kinds[0], kinds[1], seed * 100_003 + started)
        side[i] = s
        active[i] = True
        started += 1

    for i in range(n_envs):
        start(i)
    obs, mask = venv.observe()
    while active.any():
        actions = np.full((n_envs, 2), WAIT, dtype=np.int64)
        idx = np.arange(n_envs)
        actions[idx, side] = choose(policy.logits(obs[idx, side], mask[idx, side]), greedy, rng)
        if opp_policy is not None:
            actions[idx, 1 - side] = choose(opp_policy.logits(obs[idx, 1 - side], mask[idx, 1 - side]), greedy, rng)
        obs, mask, _, done, winner, t = venv.step(actions)
        if done.any():
            for i in np.flatnonzero(done & active):
                ticks.append(int(t[i]))
                if winner[i] == side[i]:
                    w += 1
                elif winner[i] == 1 - side[i]:
                    l += 1
                else:
                    d += 1
                active[i] = False
                if started < games:
                    start(int(i))
            obs, mask = venv.observe()
    return dict(wins=w, draws=d, losses=l, games=w + d + l, avg_seconds=float(np.mean(ticks)) / 60 if ticks else 0.0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("policy", nargs="+", help=".pt checkpoint(s), exported .json, or 'random'; several are "
                                              "evaluated one after another (e.g. a run's milestones/*.pt)")
    ap.add_argument("--opponents", default="classic,dqn,random",
                    help="comma list of: classic, dqn, random, or a .pt/.json policy path")
    ap.add_argument("--games", type=int, default=100)
    ap.add_argument("--envs", type=int, default=50)
    ap.add_argument("--greedy", action="store_true")
    ap.add_argument("--seed", type=int, default=12345)
    ap.add_argument("--decision-interval", type=int, default=None,
                    help="defaults to the checkpoint's training value (exported models: 'decision_interval')")
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--max-ticks", type=int, default=54000)
    ap.add_argument("--max-upgrades", type=int, default=-1, help="base upgrades per player (-1 = unlimited, 0 = none)")
    ap.add_argument("--dqn-model", default=os.path.join(REPO, "ultimate_dqn_model.json"))
    ap.add_argument("--json", action="store_true", help="also print one JSON line per opponent (for the dashboard)")
    args = ap.parse_args()
    for spec in args.policy:
        run_one(args, spec)


def run_one(args, spec: str):
    policy = load_policy(spec)
    print(f"{spec} ({'greedy' if args.greedy else 'sampled'}), {args.games} games per opponent")
    for opp in args.opponents.split(","):
        t0 = time.time()
        r = evaluate(policy, opp, args.games, args.envs, args.greedy, args.seed, args.dqn_model, args.threads,
                     max_ticks=args.max_ticks, decision_interval=args.decision_interval,
                     max_upgrades=args.max_upgrades)
        lo, hi = wilson(r["wins"], r["games"])
        print(f"  vs {opp:<10} W {r['wins']:4d}  D {r['draws']:4d}  L {r['losses']:4d}  "
              f"win {100 * r['wins'] / max(1, r['games']):5.1f}% (95% CI {100 * lo:.1f}-{100 * hi:.1f})  "
              f"avg game {r['avg_seconds']:.0f}s  [{time.time() - t0:.0f}s]", flush=True)
        if args.json:
            print("JSON " + json.dumps({"opponent": opp, **r, "ci_low": lo, "ci_high": hi,
                                        "greedy": args.greedy, "max_ticks": args.max_ticks,
                                        "max_upgrades": args.max_upgrades, "policy_path": spec,
                                        "update": getattr(policy, "update", None),
                                        "env_steps": getattr(policy, "env_steps", None)}), flush=True)


if __name__ == "__main__":
    main()
