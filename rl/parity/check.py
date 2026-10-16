#!/usr/bin/env python3
"""Run parity scenarios on the real JS game and the Rust port and diff the traces.

    python3 rl/parity/check.py            # default scenario set
    python3 rl/parity/check.py --quick    # fewer / shorter scenarios

Exit code 0 only if every scenario matches tick for tick (state and agent observations).
"""
import argparse
import json
import math
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ENGINE = os.path.join(ROOT, "rl", "engine")


def build_rust():
    subprocess.run(["cargo", "build", "--release", "--bin", "parity", "-q"], cwd=ENGINE, check=True)
    return os.path.join(ENGINE, "target", "release", "parity")


def close(a, b, tol):
    if isinstance(a, str) or isinstance(b, str):
        return a == b
    if isinstance(a, list) or isinstance(b, list):
        return isinstance(a, list) and isinstance(b, list) and len(a) == len(b) and all(close(x, y, tol) for x, y in zip(a, b))
    if a == b:
        return True
    return math.isfinite(a) and math.isfinite(b) and abs(a - b) <= tol * max(1.0, abs(a), abs(b))


def first_diff(a, b, tol, path=""):
    if isinstance(a, dict):
        for k in a:
            d = first_diff(a[k], b.get(k), tol, f"{path}.{k}")
            if d:
                return d
        return None
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        for i, (x, y) in enumerate(zip(a, b)):
            d = first_diff(x, y, tol, f"{path}[{i}]")
            if d:
                return d
        return None
    return None if close(a, b, tol) else f"{path}: js={a} rust={b}"


def run(scen, rust_bin, tol):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(scen, f)
        path = f.name
    try:
        js = subprocess.run(["node", os.path.join(HERE, "run_js.js"), path], capture_output=True, text=True, check=True).stdout
        rs = subprocess.run([rust_bin, path], capture_output=True, text=True, check=True).stdout
    finally:
        os.unlink(path)
    jl = [json.loads(x) for x in js.splitlines() if x.strip()]
    rl = [json.loads(x) for x in rs.splitlines() if x.strip()]
    ticks = sum(1 for x in jl if "s" in x)
    obs_count = sum(1 for x in jl if "obs" in x)
    for i, (a, b) in enumerate(zip(jl, rl)):
        d = first_diff(a, b, tol)
        if d:
            t = a.get("t")
            return False, f"line {i} (tick {t}): {d}", ticks, obs_count
    if len(jl) != len(rl):
        return False, f"length differs: js {len(jl)} lines, rust {len(rl)} lines", ticks, obs_count
    kinds, puppies, doom, base_hit = set(), False, False, False
    for x in jl:
        if "s" in x:
            for u in x["u0"] + x["u1"]:
                kinds.add(u[0])
                puppies |= u[1] == 1
            doom |= x["s"][6] == 1
            base_hit |= x["s"][2] < 800 or x["s"][3] < 800
    COVERAGE.update(kinds)
    COVERAGE_FLAGS["puppy"] |= puppies
    COVERAGE_FLAGS["atomic fallout"] |= doom
    COVERAGE_FLAGS["base damage"] |= base_hit
    last = jl[-1]["s"]
    return True, f"base hp {last[2]:.0f}/{last[3]:.0f}, kinds {sorted(kinds)}{' doom' if doom else ''}", ticks, obs_count


COVERAGE = set()
COVERAGE_FLAGS = {"puppy": False, "atomic fallout": False, "base damage": False}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--tol", type=float, default=1e-9, help="relative tolerance for floats")
    args = ap.parse_args()
    rust_bin = build_rust()
    max_ticks = 6000 if args.quick else 12000
    seeds = range(3) if args.quick else range(4)
    matchups = [("script", "script"), ("script", "classic"), ("classic", "script"), ("script", "dqn"),
                ("dqn", "script"), ("classic", "dqn"), ("dqn", "classic")]
    failures = 0
    scenarios = []
    for left, right in matchups:
        for s in seeds:
            scenarios.append(dict(seed_main=1000 + s, seed_worker=2000 + s, seed_script=3000 + s * 7, left=left,
                                  right=right, max_ticks=max_ticks, action_prob=0.25 + 0.1 * (s % 4),
                                  worker_latency=1 + s % 3, dqn_model="ultimate_dqn_model.json", start_money=55))
    # rich starts exercise expensive units: trebuchets, atomic bombs, upgrades, puppies
    for left, right in matchups:
        for s in seeds[:2]:
            scenarios.append(dict(seed_main=5000 + s, seed_worker=6000 + s, seed_script=7000 + s, left=left, right=right,
                                  max_ticks=max_ticks, action_prob=0.5, worker_latency=2,
                                  dqn_model="ultimate_dqn_model.json", start_money=2500 + 1500 * s))
    for scen in scenarios:
        left, right, s = scen["left"], scen["right"], scen["seed_main"]
        ok, msg, ticks, n_obs = run(scen, rust_bin, args.tol)
        failures += not ok
        print(f"{'OK  ' if ok else 'FAIL'} {left:>7} vs {right:<7} seed {s} money {scen['start_money']:>4}: "
              f"{ticks:6d} ticks, {n_obs:5d} obs  {msg}", flush=True)
    print("unit kinds covered:", sorted(COVERAGE), "| flags:", COVERAGE_FLAGS)
    print("ALL MATCH" if failures == 0 else f"{failures} scenario(s) differ")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
