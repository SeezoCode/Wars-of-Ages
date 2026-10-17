"""Build models/index.json: the list of models the game's match picker offers.

    python3 rl/wars_rl/model_index.py            # from the repo root (only needs the standard library)

Lists the default models in the repo root, every model JSON in models/ (committed models, which
GitHub Pages also serves), and each training run's auto-exported rl/runs/<run>/ultimate_model.json
(those exist only on your computer, so they're marked "local"). The GitHub Pages workflow runs this
before deploying, and the training dashboard re-runs it after exports, so you rarely need to call it.
"""
from __future__ import annotations

import glob
import json
import os
import time

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
INDEX = os.path.join(REPO, "models", "index.json")
ROOT_MODELS = ["ultimate_model.json", "ultimate_dqn_model.json"]


def describe(path: str) -> dict | None:
    """Kind and metadata of one model file, or None if it isn't a model."""
    try:
        with open(path) as fh:
            d = json.load(fh)
    except (OSError, ValueError):
        return None
    if not isinstance(d, dict):
        return None
    if d.get("format") == "wars-ultimate-mlp":
        meta = d.get("meta") or {}
        return {"kind": "ultimate", "hidden": [l["out"] for l in d.get("layers", []) if l.get("type") == "linear"][:-1],
                "updates": meta.get("updates", meta.get("update")), "env_steps": meta.get("env_steps"), "note": meta.get("note", ""),
                "exported": meta.get("exported")}
    if all(k in d for k in ("W1", "W2", "Wa")):
        return {"kind": "dqn", "hidden": [len(d["b1"]), len(d["b2"])]}
    return None


def build(include_runs: bool = True) -> list:
    try:
        with open(INDEX) as fh:
            old = {e["file"]: e for e in json.load(fh)}
    except (OSError, ValueError, KeyError, TypeError):
        old = {}
    files = [os.path.join(REPO, f) for f in ROOT_MODELS]
    files += sorted(glob.glob(os.path.join(REPO, "models", "**", "*.json"), recursive=True))
    if include_runs:
        files += sorted(glob.glob(os.path.join(REPO, "rl", "runs", "*", "ultimate_model.json")))
    out = []
    for path in files:
        if not os.path.isfile(path) or os.path.abspath(path) == INDEX:
            continue
        rel = os.path.relpath(path, REPO).replace(os.sep, "/")
        st = os.stat(path)
        prev = old.get(rel)
        if prev and prev.get("mtime") == int(st.st_mtime) and prev.get("bytes") == st.st_size:
            out.append(prev)  # unchanged: skip re-reading a multi-MB file
            continue
        info = describe(path)
        if info is None:
            continue
        if rel.startswith("rl/runs/"):
            name, source = rel.split("/")[2], "run"
        elif rel.startswith("models/"):
            name, source = rel[len("models/"):-len(".json")], "models"
        else:
            name, source = rel[:-len(".json")], "default"
        out.append({"file": rel, "name": name, "source": source, "bytes": st.st_size, "mtime": int(st.st_mtime),
                    **{k: v for k, v in info.items() if v not in (None, "")}})
    order = {"default": 0, "models": 1, "run": 2}
    out.sort(key=lambda e: (order[e["source"]], -e["mtime"] if e["source"] == "run" else 0, e["name"].lower()))
    return out


def write(include_runs: bool = True) -> list:
    entries = build(include_runs)
    os.makedirs(os.path.dirname(INDEX), exist_ok=True)
    tmp = INDEX + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(entries, fh, indent=1)
    os.replace(tmp, INDEX)
    return entries


def main():
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--no-runs", action="store_true", help="leave out rl/runs/* (they only exist locally)")
    args = ap.parse_args()
    t = time.time()
    entries = write(not args.no_runs)
    for e in entries:
        print(f"  {e['kind']:8} {e['source']:8} {e['file']}")
    print(f"wrote {os.path.relpath(INDEX, REPO)} ({len(entries)} models, {time.time() - t:.1f}s)")


if __name__ == "__main__":
    main()
