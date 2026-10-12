"""Opponent league: frozen snapshots of the learner + built-in bots.

Snapshots are sampled with prioritized fictitious self-play (PFSP): opponents the
learner beats less often are played more often, so it keeps fixing its weaknesses
instead of overfitting to its latest self.
"""
from __future__ import annotations

import json
import os
from collections import OrderedDict, deque
from dataclasses import dataclass, field

import numpy as np
import torch

from .model import ActorCritic, ModelConfig


@dataclass
class Snapshot:
    id: int
    path: str
    update: int
    results: deque = field(default_factory=lambda: deque(maxlen=200))  # learner score: 1 win, 0.5 draw, 0 loss

    def win_rate(self, prior: float = 0.5, prior_games: int = 4) -> float:
        return (sum(self.results) + prior * prior_games) / (len(self.results) + prior_games)


class League:
    def __init__(self, directory: str, model_config: ModelConfig, max_snapshots: int = 40, cache_models: int = 12,
                 pfsp_power: float = 2.0):
        self.dir = directory
        os.makedirs(directory, exist_ok=True)
        self.model_config = model_config
        self.max_snapshots = max_snapshots
        self.cache_models = cache_models
        self.pfsp_power = pfsp_power
        self.snapshots: dict[int, Snapshot] = {}
        self.next_id = 1
        self._cache: OrderedDict[int, ActorCritic] = OrderedDict()
        self._load_index()

    # ---- persistence -------------------------------------------------------
    def _index_path(self):
        return os.path.join(self.dir, "league.json")

    def _load_index(self):
        if not os.path.exists(self._index_path()):
            return
        with open(self._index_path()) as f:
            idx = json.load(f)
        self.next_id = idx["next_id"]
        for s in idx["snapshots"]:
            if os.path.exists(s["path"]):
                snap = Snapshot(s["id"], s["path"], s["update"])
                snap.results.extend(s.get("results", []))
                self.snapshots[snap.id] = snap

    def save_index(self):
        idx = {"next_id": self.next_id, "snapshots": [
            {"id": s.id, "path": s.path, "update": s.update, "results": list(s.results)} for s in self.snapshots.values()]}
        tmp = self._index_path() + ".tmp"
        with open(tmp, "w") as f:
            json.dump(idx, f)
        os.replace(tmp, self._index_path())

    # ---- snapshots ---------------------------------------------------------
    def add(self, model: ActorCritic, update: int) -> int:
        sid = self.next_id
        self.next_id += 1
        path = os.path.join(self.dir, f"snapshot_{sid:05d}.pt")
        torch.save({"model_config": model.cfg.to_dict(), "actor": model.actor.state_dict(), "update": update}, path)
        self.snapshots[sid] = Snapshot(sid, path, update)
        while len(self.snapshots) > self.max_snapshots:
            # drop the snapshot we beat most reliably (keep the newest one always)
            newest = max(self.snapshots)
            victim = max((s for s in self.snapshots.values() if s.id != newest), key=lambda s: s.win_rate())
            self.snapshots.pop(victim.id)
            self._cache.pop(victim.id, None)
            try:
                os.remove(victim.path)
            except OSError:
                pass
        self.save_index()
        return sid

    def sample(self, rng: np.random.Generator) -> int | None:
        if not self.snapshots:
            return None
        snaps = list(self.snapshots.values())
        w = np.array([(1.0 - s.win_rate()) ** self.pfsp_power + 0.02 for s in snaps])
        return snaps[rng.choice(len(snaps), p=w / w.sum())].id

    def model(self, sid: int) -> ActorCritic:
        if sid in self._cache:
            self._cache.move_to_end(sid)
            return self._cache[sid]
        snap = self.snapshots[sid]
        data = torch.load(snap.path, map_location="cpu", weights_only=False)
        m = ActorCritic(ModelConfig(**data["model_config"]))
        m.actor.load_state_dict(data["actor"])
        m.eval()
        self._cache[sid] = m
        while len(self._cache) > self.cache_models:
            self._cache.popitem(last=False)
        return m

    def record(self, sid: int, learner_score: float):
        if sid in self.snapshots:
            self.snapshots[sid].results.append(learner_score)

    def summary(self, top: int = 5) -> str:
        snaps = sorted(self.snapshots.values(), key=lambda s: s.win_rate())[:top]
        return ", ".join(f"#{s.id}(u{s.update}):{s.win_rate():.2f}/{len(s.results)}" for s in snaps)
