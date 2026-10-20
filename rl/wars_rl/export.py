"""Export a trained actor to the JSON format `UltimateBot` loads in the browser.

    python -m wars_rl.export runs/ultimate/latest.pt ../ultimate_model.json
    python -m wars_rl.export runs/v2/latest.pt ../ultimate_model.json --checkpoint-out checkpoints/ultimate_v2.pt
    python -m wars_rl.export runs/v2/latest.pt ../models/v2.json --note "beats DQN 100%"   # adds it to the game's model picker

Weights are stored as base64 little-endian float32. A NumPy re-implementation of
the browser forward pass is checked against PyTorch before writing.

A network with memory (TrainConfig.recurrent) has one "gru" layer between the hidden layers
and the action layer: {"type": "gru", "in", "size", "weight_ih" (3*size x in), "weight_hh"
(3*size x size), "bias_ih", "bias_hh"}, gates in PyTorch's order (reset, update, new). Its state
starts at zeros each game and is carried from one decision to the next.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import time

import numpy as np
import torch
import torch.nn as nn

from .model import ActorCritic, RecurrentActor, load_model

FORMAT = "wars-ultimate-mlp"


def _b64(t: torch.Tensor) -> str:
    return base64.b64encode(t.detach().cpu().numpy().astype("<f4").tobytes()).decode("ascii")


def actor_layers(model: ActorCritic) -> list:
    actor = model.actor
    if isinstance(actor, RecurrentActor):
        g = actor.gru
        return _layers(actor.enc) + [{"type": "gru", "in": g.input_size, "size": g.hidden_size,
                                      "weight_ih": _b64(g.weight_ih), "weight_hh": _b64(g.weight_hh),
                                      "bias_ih": _b64(g.bias_ih), "bias_hh": _b64(g.bias_hh)}] + _layers([actor.head])
    return _layers(actor)


def _layers(mods) -> list:
    layers = []
    for m in mods:
        if isinstance(m, nn.Linear):
            layers.append({"type": "linear", "in": m.in_features, "out": m.out_features,
                           "weight": _b64(m.weight), "bias": _b64(m.bias)})
        elif isinstance(m, nn.LayerNorm):
            layers.append({"type": "layernorm", "size": m.normalized_shape[0], "eps": m.eps,
                           "weight": _b64(m.weight), "bias": _b64(m.bias)})
        elif isinstance(m, nn.ReLU):
            layers.append({"type": "relu"})
        elif isinstance(m, nn.Tanh):
            layers.append({"type": "tanh"})
        elif isinstance(m, nn.SiLU):
            layers.append({"type": "silu"})
        else:
            raise ValueError(f"layer {m} cannot be exported to the browser format")
    return layers


def memory_size(layers: list) -> int:
    return sum(l["size"] for l in layers if l["type"] == "gru")


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def numpy_forward(layers: list, x: np.ndarray, h: np.ndarray | None = None):
    """Same math as UltimateBot.forward() in index.ts (float32 storage, float64 sums).

    Returns the logits, or (logits, new memory) when h is given (networks with a gru layer)."""
    dec = lambda s: np.frombuffer(base64.b64decode(s), dtype="<f4")
    x = x.astype(np.float32)
    h_new = None
    for l in layers:
        if l["type"] == "gru":
            n = l["size"]
            gi = dec(l["weight_ih"]).reshape(3 * n, l["in"]).astype(np.float64) @ x.astype(np.float64) + dec(l["bias_ih"])
            gh = dec(l["weight_hh"]).reshape(3 * n, n).astype(np.float64) @ h.astype(np.float64) + dec(l["bias_hh"])
            r = _sigmoid(gi[:n] + gh[:n])
            z = _sigmoid(gi[n:2 * n] + gh[n:2 * n])
            c = np.tanh(gi[2 * n:] + r * gh[2 * n:])
            x = h_new = ((1 - z) * c + z * h).astype(np.float32)
        elif l["type"] == "linear":
            w = dec(l["weight"]).reshape(l["out"], l["in"]).astype(np.float64)
            x = (w @ x.astype(np.float64) + dec(l["bias"])).astype(np.float32)
        elif l["type"] == "layernorm":
            xd = x.astype(np.float64)
            mean = xd.mean()
            var = ((xd - mean) ** 2).mean()
            x = ((xd - mean) / np.sqrt(var + l["eps"]) * dec(l["weight"]) + dec(l["bias"])).astype(np.float32)
        elif l["type"] == "relu":
            x = np.maximum(x, 0)
        elif l["type"] == "tanh":
            x = np.tanh(x)
        elif l["type"] == "silu":
            x = (x / (1 + np.exp(-x.astype(np.float64)))).astype(np.float32)
    return x if h is None else (x, h_new)


def export(model: ActorCritic, out_path: str, decision_interval: int = 10, meta: dict | None = None):
    layers = actor_layers(model)
    payload = {
        "format": FORMAT,
        "version": 2 if model.cfg.recurrent else 1,  # 2: has a gru layer (needs a game version that knows it)
        "obs_size": model.cfg.obs_size,
        "num_actions": model.cfg.num_actions,
        "decision_interval": decision_interval,
        "meta": {"exported": time.strftime("%Y-%m-%d %H:%M"), **(meta or {})},
        "layers": layers,
    }
    # sanity check against torch (for a network with memory: one sequence of 8 decisions)
    x = torch.randn(8, model.cfg.obs_size)
    n = model.cfg.recurrent
    with torch.no_grad():
        if n:
            hs, ht = [], torch.zeros(1, n)
            for i in range(len(x)):
                lg, ht = model.actor(x[i:i + 1], ht)
                hs.append(lg[0])
            ref = torch.stack(hs).numpy()
        else:
            ref = model.actor(x).numpy()
    h = np.zeros(n, dtype=np.float32) if n else None
    for i in range(len(x)):
        got = numpy_forward(layers, x[i].numpy(), h)
        if n:
            got, h = got
        err = np.abs(got - ref[i]).max()
        if err > 1e-3 * max(1.0, np.abs(ref[i]).max()):
            raise RuntimeError(f"export check failed: max abs error {err}")
    tmp = out_path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(payload, f, separators=(",", ":"))
    os.replace(tmp, out_path)
    return out_path


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("checkpoint")
    ap.add_argument("out", nargs="*", help="one or more output files (default: ultimate_model.json in the repo root, "
                                           "which the game plays by default; files in models/ appear in the game's picker)")
    ap.add_argument("--note", default="", help="short description shown in the game's model picker")
    ap.add_argument("--checkpoint-out", help="also write a slim weights-only checkpoint (no optimizer state), "
                                             "small enough to commit and usable with train --init-from")
    args = ap.parse_args()
    model, ckpt = load_model(args.checkpoint)
    if args.checkpoint_out:
        keys = ["model_config", "state_dict", "update", "env_steps", "episodes", "train_config"]
        torch.save({k: ckpt[k] for k in keys if k in ckpt}, args.checkpoint_out)
        print(f"wrote {args.checkpoint_out} ({os.path.getsize(args.checkpoint_out) / 1e6:.1f} MB)")
    di = ckpt.get("train_config", {}).get("decision_interval", 10)
    meta = {"updates": ckpt.get("update"), "env_steps": ckpt.get("env_steps"),
            "max_upgrades": ckpt.get("train_config", {}).get("max_upgrades", -1)}
    if args.note:
        meta["note"] = args.note
    outs = args.out or [os.path.join(os.path.dirname(__file__), "..", "..", "ultimate_model.json")]
    for out in outs:
        if os.path.dirname(out):
            os.makedirs(os.path.dirname(out), exist_ok=True)
        path = export(model, out, di, meta)
        print(f"wrote {path} ({os.path.getsize(path) / 1e6:.1f} MB)")
    from . import model_index
    print(f"updated the game's model list ({len(model_index.write())} models)")


if __name__ == "__main__":
    main()
