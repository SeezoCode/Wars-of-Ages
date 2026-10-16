"""Export a trained actor to the JSON format `UltimateBot` loads in the browser.

    python -m wars_rl.export runs/ultimate/latest.pt ../ultimate_model.json
    python -m wars_rl.export runs/v2/latest.pt ../ultimate_model.json --checkpoint-out checkpoints/ultimate_v2.pt

Weights are stored as base64 little-endian float32. A NumPy re-implementation of
the browser forward pass is checked against PyTorch before writing.
"""
from __future__ import annotations

import argparse
import base64
import json
import os

import numpy as np
import torch
import torch.nn as nn

from .model import ActorCritic, load_model

FORMAT = "wars-ultimate-mlp"


def _b64(t: torch.Tensor) -> str:
    return base64.b64encode(t.detach().cpu().numpy().astype("<f4").tobytes()).decode("ascii")


def actor_layers(model: ActorCritic) -> list:
    layers = []
    for m in model.actor:
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


def numpy_forward(layers: list, x: np.ndarray) -> np.ndarray:
    """Same math as UltimateBot.forward() in index.ts (float32 storage, float64 sums)."""
    dec = lambda s: np.frombuffer(base64.b64decode(s), dtype="<f4")
    x = x.astype(np.float32)
    for l in layers:
        if l["type"] == "linear":
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
    return x


def export(model: ActorCritic, out_path: str, decision_interval: int = 10, meta: dict | None = None):
    layers = actor_layers(model)
    payload = {
        "format": FORMAT,
        "version": 1,
        "obs_size": model.cfg.obs_size,
        "num_actions": model.cfg.num_actions,
        "decision_interval": decision_interval,
        "meta": meta or {},
        "layers": layers,
    }
    # sanity check against torch
    x = torch.randn(8, model.cfg.obs_size)
    with torch.no_grad():
        ref = model.actor(x).numpy()
    for i in range(len(x)):
        got = numpy_forward(layers, x[i].numpy())
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
    ap.add_argument("out", nargs="?", default=os.path.join(os.path.dirname(__file__), "..", "..", "ultimate_model.json"))
    ap.add_argument("--checkpoint-out", help="also write a slim weights-only checkpoint (no optimizer state), "
                                             "small enough to commit and usable with train --init-from")
    args = ap.parse_args()
    model, ckpt = load_model(args.checkpoint)
    if args.checkpoint_out:
        keys = ["model_config", "state_dict", "update", "env_steps", "episodes", "train_config"]
        torch.save({k: ckpt[k] for k in keys if k in ckpt}, args.checkpoint_out)
        print(f"wrote {args.checkpoint_out} ({os.path.getsize(args.checkpoint_out) / 1e6:.1f} MB)")
    di = ckpt.get("train_config", {}).get("decision_interval", 10)
    meta = {"updates": ckpt.get("update"), "env_steps": ckpt.get("env_steps")}
    path = export(model, args.out, di, meta)
    print(f"wrote {path} ({os.path.getsize(path) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
