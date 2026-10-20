"""Fixed opponent pool: trained networks that never change, picked by the user (or added
automatically as "peaks"). The learner plays them often; each member keeps its own record over
the last `window` games, and counts as *mastered* once the learner beats it at least `target`
of the time. Members it struggles with are played more; mastered ones keep a small share so a
regression would show up.

Any trained network works: an exported model (.json), a full checkpoint (.pt with the whole
model), or an actor-only file (strength copies in milestones/, league snapshots, peaks).
"""
from __future__ import annotations

import base64
import json
import os
from collections import deque

import numpy as np
import torch
import torch.nn as nn

from .model import MASK_VALUE, FrozenActor, ModelConfig, load_model

RL_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
MASTERED_WEIGHT = 0.02   # share weight of a mastered member (enough to notice if the learner slips)


def resolve(path: str) -> str:
    return os.path.abspath(path if os.path.isabs(path) else os.path.join(RL_DIR, path))


class _JsonActor(nn.Module):
    """An exported browser model (ultimate_model.json format) as a torch policy with step()."""

    def __init__(self, data: dict):
        super().__init__()
        dec = lambda s: torch.from_numpy(np.frombuffer(base64.b64decode(s), dtype="<f4").copy())
        mods, self.gru, self.recurrent = [], None, 0
        for l in data["layers"]:
            t = l["type"]
            if t == "gru":
                g = nn.GRUCell(l["in"], l["size"])
                n = l["size"]
                g.weight_ih.data = dec(l["weight_ih"]).reshape(3 * n, l["in"])
                g.weight_hh.data = dec(l["weight_hh"]).reshape(3 * n, n)
                g.bias_ih.data, g.bias_hh.data = dec(l["bias_ih"]), dec(l["bias_hh"])
                self.enc, self.gru, self.recurrent, mods = nn.Sequential(*mods), g, n, []
                continue
            if t == "linear":
                m = nn.Linear(l["in"], l["out"])
                m.weight.data = dec(l["weight"]).reshape(l["out"], l["in"])
                m.bias.data = dec(l["bias"])
            elif t == "layernorm":
                m = nn.LayerNorm(l["size"], eps=l["eps"])
                m.weight.data, m.bias.data = dec(l["weight"]), dec(l["bias"])
            else:
                m = {"relu": nn.ReLU(), "tanh": nn.Tanh(), "silu": nn.SiLU()}[t]
            mods.append(m)
        self.head = nn.Sequential(*mods)  # everything after the gru layer (the whole network without one)
        self.eval()

    @torch.no_grad()
    def step(self, obs: torch.Tensor, mask: torch.Tensor, h=None):
        if self.gru is not None:
            h = self.gru(self.enc(obs), torch.zeros(obs.shape[0], self.recurrent) if h is None else h)
            x = h
        else:
            x = obs
        return self.head(x).masked_fill(~mask, MASK_VALUE), h


def load_actor(path: str) -> tuple[nn.Module, dict]:
    """(policy with .recurrent and step(obs, mask, h) -> (logits, h), info) for any saved network."""
    full = resolve(path)
    if full.endswith(".json"):
        with open(full) as fh:
            data = json.load(fh)
        return _JsonActor(data), {"decision_interval": data.get("decision_interval")}
    ckpt = torch.load(full, map_location="cpu", weights_only=False)
    info = {"decision_interval": ckpt.get("train_config", {}).get("decision_interval")}
    if "actor" in ckpt:
        return FrozenActor(ModelConfig(**ckpt["model_config"]), ckpt["actor"]), info
    model, _ = load_model(full)
    return model, info


class Member:
    def __init__(self, mid: int, path: str, window: int):
        self.id, self.path = mid, path
        self.name = os.path.splitext(os.path.basename(path))[0]
        if self.name in ("latest", "ultimate_model"):
            self.name = os.path.basename(os.path.dirname(resolve(path))) + "/" + self.name
        self.module, self.info = load_actor(path)
        self.results: deque = deque(maxlen=window)  # "W" / "D" / "L" from the learner's point of view
        self.active = True
        self.games = 0

    @property
    def recurrent(self) -> int:
        return getattr(self.module, "recurrent", 0)

    @torch.no_grad()
    def step(self, obs: torch.Tensor, mask: torch.Tensor, h=None):
        return self.module.step(obs, mask, h)

    def perf(self, use_score: bool) -> float:
        """Win rate (or score: win 1, draw 0.5) with a weak 50% prior so new members aren't 'mastered' at once."""
        n = len(self.results)
        w = sum(r == "W" for r in self.results)
        d = sum(r == "D" for r in self.results)
        good = w + (0.5 * d if use_score else 0.0)
        return (good + 2.0) / (n + 4.0)

    def mastered(self, cfg) -> bool:
        return len(self.results) >= cfg.pool_min_games and self.perf(cfg.pool_use_score) >= cfg.pool_target


class Pool:
    def __init__(self, cfg, run_dir: str):
        self.cfg, self.run_dir = cfg, run_dir
        self.members: dict[int, Member] = {}
        self.next_id = 0
        self.saved: dict[str, list] = {}  # path -> results restored from pool.json
        self.mastered_since = None        # update at which every member was first mastered (auto mode)
        self.peaks_added = 0
        try:
            with open(os.path.join(run_dir, "pool.json")) as fh:
                data = json.load(fh)
            self.saved = {m["path"]: m.get("results", []) for m in data.get("members", [])}
            self.mastered_since = data.get("mastered_since")
            self.peaks_added = data.get("peaks_added", 0)
        except (OSError, ValueError, KeyError, TypeError):
            pass
        self.set_models(list(cfg.pool_models))

    def set_models(self, paths: list) -> list:
        """Make exactly these paths the active members; returns errors for paths that failed to load."""
        errors = []
        wanted = list(dict.fromkeys(paths))
        for m in self.members.values():
            m.active = m.path in wanted
        have = {m.path for m in self.members.values()}
        for p in wanted:
            if p in have:
                continue
            try:
                m = Member(self.next_id, p, self.cfg.pool_window)
            except Exception as e:  # noqa: BLE001 - report and skip a broken file
                errors.append(f"{p}: {e}")
                continue
            m.results.extend(self.saved.get(p, []))
            self.members[m.id] = m
            self.next_id += 1
        return errors

    def active(self) -> list:
        return [m for m in self.members.values() if m.active]

    def sample(self, rng: np.random.Generator) -> Member | None:
        act = self.active()
        if not act:
            return None
        w = np.array([MASTERED_WEIGHT if m.mastered(self.cfg) else (1.0 - m.perf(self.cfg.pool_use_score)) ** 2 + 0.05
                      for m in act])
        return act[rng.choice(len(act), p=w / w.sum())]

    def all_mastered(self) -> bool:
        act = self.active()
        return bool(act) and all(m.mastered(self.cfg) for m in act)

    def save(self, update: int):
        c = self.cfg
        rows = []
        for m in self.members.values():
            n = len(m.results)
            rows.append({"path": m.path, "name": m.name, "active": m.active, "games": m.games, "recent": n,
                         "W": m.results.count("W"), "D": m.results.count("D"), "L": m.results.count("L"),
                         "perf": round(m.perf(c.pool_use_score), 4), "mastered": m.mastered(c),
                         "rate": round((m.results.count("W") + (0.5 * m.results.count("D") if c.pool_use_score else 0))
                                       / max(1, n), 4),
                         "results": list(m.results)})
        data = {"update": update, "members": rows, "mastered_since": self.mastered_since,
                "peaks_added": self.peaks_added, "auto": c.pool_auto, "target": c.pool_target,
                "marinate": c.pool_marinate, "use_score": c.pool_use_score}
        tmp = os.path.join(self.run_dir, "pool.json.tmp")
        with open(tmp, "w") as fh:
            json.dump(data, fh)
        os.replace(tmp, os.path.join(self.run_dir, "pool.json"))
