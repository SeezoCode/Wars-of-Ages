#!/usr/bin/env python3
"""Check that the browser UltimateBot computes the same policy as PyTorch.

    python3 rl/parity/check_model.py ultimate_model.json [checkpoint.pt] [ticks]

Runs check_model.js (real index.js, exported JSON model) and compares its logits with
the NumPy re-implementation (and, if given, the PyTorch checkpoint). The decisions come from one
game in order, so a model with memory is replayed decision by decision.
"""
import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from wars_rl.evaluate import JsonPolicy, TorchPolicy  # noqa: E402


def logits(policy, obs, mask):
    if not policy.recurrent:
        return policy.logits(obs, mask)
    return np.concatenate([policy.logits(obs[i:i + 1], mask[i:i + 1]) for i in range(len(obs))])


def main():
    model = sys.argv[1]
    ckpt = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].endswith(".pt") else None
    ticks = sys.argv[-1] if sys.argv[-1].isdigit() else "9000"
    res = subprocess.run(["node", os.path.join(HERE, "check_model.js"), model, ticks], capture_output=True, text=True,
                         check=True)
    print(res.stderr.strip())
    rows = [json.loads(x) for x in res.stdout.splitlines() if x.strip()]
    obs = np.array([r["obs"] for r in rows], dtype=np.float32)
    mask = np.array([r["mask"] for r in rows], dtype=bool)
    js = np.array([r["logits"] for r in rows], dtype=np.float64)
    ref = logits(JsonPolicy(model), obs, np.ones_like(mask))
    err = np.abs(js - ref).max()
    same_argmax = (np.where(mask, js, -1e9).argmax(1) == np.where(mask, ref, -1e9).argmax(1)).mean()
    print(f"{len(rows)} decisions | max |js - numpy| logit error {err:.2e} | same greedy action {100 * same_argmax:.1f}%")
    ok = err < 1e-3
    if ckpt:
        t = logits(TorchPolicy(ckpt), obs, np.ones_like(mask))
        terr = np.abs(js - t).max()
        print(f"max |js - torch| logit error {terr:.2e}")
        ok &= terr < 1e-2
    print("OK" if ok else "MISMATCH")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
