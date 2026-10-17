"""Local web dashboard for training the Ultimate AI.

    cd rl
    python -m wars_rl.dashboard            # then open http://localhost:8008
    python -m wars_rl.dashboard --port 9000 --host 0.0.0.0   # reachable from other machines (no auth!)

Start / stop / resume training runs with every setting, watch scores and charts live,
check CPU and memory, evaluate models and export them to the game. Uses only the
Python standard library (plus the training stack itself); `pip install psutil` adds
better CPU/memory numbers.

Everything lives in rl/runs/<name>/: the trainer's own files (latest.pt, log.jsonl,
episodes.jsonl, league/) plus train.out (console output), trainer.pid and evals.jsonl.
Runs keep going if the dashboard is closed; reopening it picks them up again.
"""
from __future__ import annotations

import argparse
import dataclasses
import json
import os
import re
import signal
import subprocess
import sys
import threading
import time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .train import TrainConfig

HERE = os.path.dirname(os.path.abspath(__file__))
RL_DIR = os.path.abspath(os.path.join(HERE, ".."))
REPO = os.path.abspath(os.path.join(RL_DIR, ".."))
RUNS = os.path.join(RL_DIR, "runs")
NAME_RE = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")

try:
    import psutil  # optional
except ImportError:  # pragma: no cover
    psutil = None

# --------------------------------------------------------------------------- settings catalogue
# section -> (advanced?, intro shown above the fields)
SECTIONS = [
    ("Run", False, ""),
    ("Opponents", False, "Who the AI plays against during training. The numbers are relative weights "
                         "(they don't need to add up to 1). Give more weight to whatever it is weakest against."),
    ("Game", False, "The rules of the training games. Most match the browser game; change them to experiment."),
    ("Computer", False, "How much of your machine training uses. Set the thread counts to your number of CPU cores."),
    ("Network", True, "The neural network. The actor chooses actions and is what runs in the browser; the critic "
                      "only exists during training and estimates how good a situation is. Each number is one hidden "
                      "layer's width, so 512,512,256 means three layers. Bigger networks can learn more but train "
                      "slower and usually need more games. Changing the network needs a new run."),
    ("Learning (PPO)", True, "PPO collects a batch of games, then nudges the network a small, limited step towards "
                             "the actions that worked better than expected. These settings control how big and how "
                             "careful those steps are. The defaults are sensible; change one thing at a time."),
    ("Exploration", True, "An AI that always plays its current favourite move never discovers better ones. "
                          "Entropy keeps its choices a bit random; epsilon occasionally forces a random move. Both "
                          "fade out over training."),
    ("Rewards", True, "What the AI is told is good. Winning (+) and losing (-) is all that really matters; the "
                      "\"hints\" give small extra rewards for progress (damaging the base, pushing the front, getting "
                      "Trebuchets in range, earning kill money) so it learns faster early on. They fade out over "
                      "training so the final AI optimises for winning only."),
    ("League & saving", True, "The league is a pool of frozen past versions of the AI. Playing against them keeps it "
                              "from forgetting how to beat old strategies."),
]

# field -> (section, label, help)
FIELDS = {
    "total_env_steps": ("Run", "Training length (decisions)",
                        "Total AI decisions to train on. 10 million is about 2-3 hours on 4 cores. Learning rate, "
                        "exploration and reward hints fade out relative to this."),
    "init_from": ("Run", "Start from weights",
                  "Continue from an existing model instead of a random network. The network settings must match it."),
    "seed": ("Run", "Random seed", "Change it to get a different run with otherwise identical settings."),

    "p_self": ("Opponents", "Itself (mirror)", "The current AI on both sides. Both sides produce training data."),
    "p_past": ("Opponents", "Past versions (league)", "Frozen earlier versions; the ones it beats least are picked most."),
    "p_classic": ("Opponents", "Classic AI (Player vs AI bot)",
                  "The original brute-force bot. The slowest opponent to simulate, but the hardest one."),
    "p_dqn": ("Opponents", "Old reinforcement AI (DQN)", "Your previous model, ultimate_dqn_model.json."),
    "p_random": ("Opponents", "Random player", "Random moves; a warm-up curriculum from nearly idle to full spam."),
    "random_activity_power": ("Opponents", "Random player laziness",
                              "Each game the random player acts on a fraction U^power of its turns. Higher = lazier "
                              "(easier) random opponents on average."),

    "max_ticks": ("Game", "Game time limit (ticks)",
                  "60 ticks = 1 second; 54000 = 15 minutes. When the time runs out the game is a draw. Longer games "
                  "show slow losses (e.g. getting out-upgraded) instead of hiding them as draws, but train slower."),
    "start_money": ("Game", "Starting money", "Money each side starts with (the game uses 55)."),
    "agent_max_units": ("Game", "AI max troops", "Troop limit for the AI being trained (the game's human limit is 10). "
                                                 "The AI can only see 10 of its own troops."),
    "classic_max_units": ("Game", "Classic AI max troops", "The classic bot uses 7 in the game."),
    "dqn_max_units": ("Game", "Old RL AI max troops", "The old reinforcement bot uses 10 against humans."),
    "decision_interval": ("Game", "Decision interval (ticks)",
                          "The AI decides every N ticks (15 = 4 times per second). Lower reacts faster but every "
                          "game costs more compute. Saved into the model; the browser uses the same value."),
    "nuke_freeze_ticks": ("Game", "Nuke animation freeze (ticks)",
                          "In the browser everything pauses ~45 ticks while the nuke explodes; 0 turns it off."),
    "worker_latency": ("Game", "Classic AI thinking delay (min ticks)",
                       "The classic bot thinks in a background worker; its answer arrives at least this many ticks later."),
    "worker_unit_ticks_per_frame": ("Game", "Classic AI thinking speed",
                                    "How fast the browser runs the classic bot's simulations (units x ticks per frame). "
                                    "Lower = slower thinking = weaker classic bot."),
    "dqn_model": ("Game", "Old RL AI model file", "Path to the DQN weights used for the 'Old reinforcement AI' opponent."),

    "num_envs": ("Computer", "Parallel games", "Games simulated at once. More = smoother learning and more RAM."),
    "rollout_steps": ("Computer", "Steps per update",
                      "Decisions per game collected before each learning step. Parallel games x steps = batch size."),
    "env_threads": ("Computer", "Game threads", "CPU threads simulating games (Rust)."),
    "torch_threads": ("Computer", "Learning threads", "CPU threads for the network update (PyTorch)."),
    "rollout_torch_threads": ("Computer", "Inference threads",
                              "Threads for choosing moves while playing. 1 is usually fastest for these small batches."),

    "actor_hidden": ("Network", "Actor layers", "Hidden layer widths of the policy network, e.g. 512,512,256."),
    "critic_hidden": ("Network", "Critic layers", "Hidden layer widths of the value network (training only)."),
    "activation": ("Network", "Activation", "relu, tanh or silu (all supported by the browser)."),
    "layernorm": ("Network", "LayerNorm", "Normalises each layer; keeps training stable with raw game numbers."),

    "lr": ("Learning (PPO)", "Learning rate (start)", "Step size of each update. Too high = unstable, too low = slow."),
    "lr_final": ("Learning (PPO)", "Learning rate (end)", "The learning rate shrinks linearly to this by the end."),
    "gamma": ("Learning (PPO)", "Discount (gamma)",
              "How much future rewards count. 0.999 looks ~1000 decisions (~4 minutes) ahead."),
    "gae_lambda": ("Learning (PPO)", "GAE lambda",
                   "Balance between trusting the critic (lower) and actual game outcomes (higher) when crediting moves."),
    "clip": ("Learning (PPO)", "Clip range", "Max change of each action's probability per update (0.2 = 20%)."),
    "epochs": ("Learning (PPO)", "Epochs per batch", "How many passes over each batch of games."),
    "minibatch_size": ("Learning (PPO)", "Minibatch size", "Samples per gradient step."),
    "vf_coef": ("Learning (PPO)", "Value loss weight", "How much the critic's error counts in the loss."),
    "max_grad_norm": ("Learning (PPO)", "Gradient clipping", "Caps the size of one gradient step."),
    "target_kl": ("Learning (PPO)", "Target KL",
                  "Stops an update early if the policy changed more than this (a safety brake). 0 disables it."),

    "ent_coef": ("Exploration", "Entropy bonus (start)", "Reward for keeping move choices varied."),
    "ent_coef_final": ("Exploration", "Entropy bonus (end)", "Value reached at the end of training."),
    "explore_eps": ("Exploration", "Random move chance",
                    "Probability that a decision is replaced by a random valid (non-wait) move, e.g. 0.03 = 3%."),
    "explore_anneal_frac": ("Exploration", "Random moves fade over",
                            "Fraction of training over which the random-move chance fades to zero."),

    "win_reward": ("Rewards", "Win / loss reward", "+this for a win, -this for a loss."),
    "draw_reward": ("Rewards", "Draw reward", "Usually negative so stalling isn't a safe option."),
    "shaping_base_damage": ("Rewards", "Hint: base damage", "x (damage dealt - damage taken) / 800 base HP."),
    "shaping_bounty": ("Rewards", "Hint: kill money", "x (money earned from kills - money given) / 100."),
    "shaping_front": ("Rewards", "Hint: front line", "Reward for pushing the front line forward."),
    "shaping_siege": ("Rewards", "Hint: Trebuchets in range",
                      "Reward for moving Trebuchets to where they can hit the enemy base. Game-specific knowledge; "
                      "set 0 for a purer learner."),
    "shaping_anneal_frac": ("Rewards", "Hints fade over", "Fraction of training over which all hints fade to zero."),

    "snapshot_every": ("League & saving", "Snapshot every (updates)", "How often a frozen copy joins the league."),
    "max_snapshots": ("League & saving", "League size", "Most snapshots kept; the easiest ones are dropped first."),
    "save_every": ("League & saving", "Save every (updates)", "How often latest.pt is written."),
    "export_every": ("League & saving", "Export every (updates)",
                     "How often the run's ultimate_model.json (browser model) is refreshed."),
}
HIDDEN = {"run_dir", "resume"}

PRESETS = {
    "Default": {},
    "Quick test (~2 min)": {"num_envs": 16, "rollout_steps": 64, "total_env_steps": 200_000, "snapshot_every": 5,
                            "save_every": 5, "export_every": 5},
    "Beat the classic bot (continue v1)": {
        "init_from": "checkpoints/ultimate_v1.pt", "lr": 1e-4, "total_env_steps": 30_000_000, "max_ticks": 108_000,
        "draw_reward": -0.8, "p_self": 0.15, "p_past": 0.4, "p_classic": 0.3, "p_dqn": 0.05, "p_random": 0.1,
        "explore_eps": 0.05, "ent_coef": 0.03},
    "Big network": {"actor_hidden": [1024, 1024, 512, 256], "critic_hidden": [1024, 1024, 512, 256]},
    "Small & fast network": {"actor_hidden": [256, 256], "critic_hidden": [256, 256]},
}


def schema() -> dict:
    defaults = TrainConfig()
    fields = {}
    for f in dataclasses.fields(TrainConfig):
        if f.name in HIDDEN:
            continue
        section, label, help_ = FIELDS.get(f.name, ("Other", f.name, ""))
        v = getattr(defaults, f.name)
        typ = "bool" if isinstance(v, bool) else "list" if isinstance(v, list) else \
            "int" if isinstance(v, int) else "float" if isinstance(v, float) else "str"
        if f.name == "dqn_model":
            v = os.path.relpath(v, RL_DIR)
        fields.setdefault(section, []).append({"name": f.name, "label": label, "help": help_, "type": typ,
                                               "default": v})
    sections = [{"name": n, "advanced": adv, "intro": intro, "fields": fields.get(n, [])} for n, adv, intro in SECTIONS]
    if "Other" in fields:
        sections.append({"name": "Other", "advanced": True, "intro": "", "fields": fields["Other"]})
    return {"sections": sections, "presets": PRESETS}


# --------------------------------------------------------------------------- run bookkeeping
def run_path(name: str) -> str:
    if not NAME_RE.match(name or ""):
        raise ValueError("run name: letters, digits, '-', '_' and '.' only")
    return os.path.join(RUNS, name)


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if psutil:
        return psutil.pid_exists(pid) and psutil.Process(pid).status() != psutil.STATUS_ZOMBIE
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    try:  # zombie check on Linux
        with open(f"/proc/{pid}/stat") as fh:
            return fh.read().split(")")[-1].split()[0] != "Z"
    except OSError:
        return True


class Runs:
    """Owns trainer processes and incremental readers of each run's log files."""

    def __init__(self):
        self.procs: dict[str, subprocess.Popen] = {}
        self.cache: dict[str, dict] = {}
        self.lock = threading.Lock()

    def trainer_pid(self, name: str) -> int:
        p = self.procs.get(name)
        if p is not None:
            if p.poll() is None:
                return p.pid
            self.procs.pop(name, None)
        try:
            with open(os.path.join(run_path(name), "trainer.pid")) as fh:
                pid = int(fh.read().strip() or 0)
            return pid if pid_alive(pid) else 0
        except (OSError, ValueError):
            return 0

    def list(self) -> list:
        out = []
        if not os.path.isdir(RUNS):
            return out
        for name in sorted(os.listdir(RUNS)):
            d = os.path.join(RUNS, name)
            if not (os.path.isdir(d) and NAME_RE.match(name)):
                continue
            if not any(os.path.exists(os.path.join(d, f)) for f in ("config.json", "log.jsonl", "train.out")):
                continue
            last = self._last_log(d)
            out.append({"name": name, "running": bool(self.trainer_pid(name)), "update": last.get("update"),
                        "env_steps": last.get("env_steps"), "modified": os.path.getmtime(d)})
        out.sort(key=lambda r: -r["modified"])
        return out

    @staticmethod
    def _last_log(d: str) -> dict:
        path = os.path.join(d, "log.jsonl")
        try:
            with open(path, "rb") as fh:
                fh.seek(max(0, os.path.getsize(path) - 8192))
                lines = fh.read().decode("utf-8", "replace").strip().splitlines()
            return json.loads(lines[-1]) if lines else {}
        except (OSError, ValueError):
            return {}

    def _cached(self, name: str) -> dict:
        c = self.cache.get(name)
        if c is None:
            c = self.cache[name] = {"log_pos": 0, "log": [], "ep_pos": 0, "scores": {}, "recent": deque(maxlen=200),
                                    "last100": {}}
        return c

    def _read_new(self, path: str, pos: int):
        try:
            size = os.path.getsize(path)
        except OSError:
            return pos, []
        if size < pos:  # file was replaced
            pos = 0
        with open(path, "rb") as fh:
            fh.seek(pos)
            data = fh.read()
        end = data.rfind(b"\n") + 1  # only complete lines
        rows = []
        for line in data[:end].decode("utf-8", "replace").splitlines():
            try:
                rows.append(json.loads(line))
            except ValueError:
                pass
        return pos + end, rows

    def detail(self, name: str) -> dict:
        d = run_path(name)
        with self.lock:
            c = self._cached(name)
            c["log_pos"], rows = self._read_new(os.path.join(d, "log.jsonl"), c["log_pos"])
            keep = ("update", "env_steps", "episodes", "sps", "win", "draw", "games", "entropy", "explained_var",
                    "approx_kl", "ep_ticks", "lr", "rollout_s", "update_s")
            c["log"].extend({k: r.get(k) for k in keep} for r in rows)
            c["ep_pos"], eps = self._read_new(os.path.join(d, "episodes.jsonl"), c["ep_pos"])
            for e in eps:
                opp = e.get("opponent", "?")
                s = c["scores"].setdefault(opp, {"W": 0, "D": 0, "L": 0, "ticks": 0, "enemy_base": 0, "games": 0})
                s[e.get("result", "D")] += 1
                s["games"] += 1
                s["ticks"] += e.get("ticks", 0)
                s["enemy_base"] += e.get("enemy_base", 0)
                last = c["last100"].setdefault(opp, deque(maxlen=100))
                last.append(e.get("result", "D"))
                c["recent"].append(e)
            log = c["log"]
            step = max(1, len(log) // 400)
            series = log[::step] + ([log[-1]] if log and (len(log) - 1) % step else [])
            scores = {}
            for opp, s in c["scores"].items():
                last = list(c["last100"][opp])
                scores[opp] = {"W": s["W"], "D": s["D"], "L": s["L"], "games": s["games"],
                               "avg_minutes": s["ticks"] / max(1, s["games"]) / 3600,
                               "avg_enemy_base": s["enemy_base"] / max(1, s["games"]),
                               "last100": {k: last.count(k) for k in "WDL"}, "last100_n": len(last)}
            recent = list(c["recent"])[-60:][::-1]
        config = {}
        try:
            with open(os.path.join(d, "config.json")) as fh:
                config = json.load(fh)
        except (OSError, ValueError):
            pass
        evals = []
        try:
            with open(os.path.join(d, "evals.jsonl")) as fh:
                evals = [json.loads(x) for x in fh if x.strip()][-40:][::-1]
        except (OSError, ValueError):
            pass
        pid = self.trainer_pid(name)
        return {"name": name, "running": bool(pid), "pid": pid, "config": config, "series": series,
                "latest": log[-1] if log else None, "scores": scores, "recent": recent, "evals": evals,
                "output": tail(os.path.join(d, "train.out"), 80),
                "has_checkpoint": os.path.exists(os.path.join(d, "latest.pt"))}

    def start(self, name: str, config: dict, resume: bool) -> dict:
        d = run_path(name)
        if self.trainer_pid(name):
            raise ValueError(f"{name} is already training")
        exists = os.path.exists(os.path.join(d, "latest.pt"))
        if exists and not resume:
            raise ValueError(f"run '{name}' already exists: resume it or choose a new name")
        os.makedirs(d, exist_ok=True)
        valid = {f.name for f in dataclasses.fields(TrainConfig)}
        cfg = {k: v for k, v in config.items() if k in valid and k not in HIDDEN}
        for k in ("init_from", "dqn_model"):
            if cfg.get(k):
                cfg[k] = os.path.abspath(os.path.join(RL_DIR, cfg[k]))
        cfg["run_dir"] = d
        cfg["resume"] = True
        cfg_path = os.path.join(d, "dashboard_config.json")
        with open(cfg_path, "w") as fh:
            json.dump(cfg, fh, indent=2)
        out = open(os.path.join(d, "train.out"), "a")
        out.write(f"\n===== {time.strftime('%Y-%m-%d %H:%M:%S')} {'resume' if exists else 'start'} from dashboard =====\n")
        out.flush()
        kwargs = {}
        if os.name == "nt":
            kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        else:
            kwargs["start_new_session"] = True  # keeps training if the dashboard is stopped with Ctrl+C
        p = subprocess.Popen([sys.executable, "-u", "-m", "wars_rl.train", "--config", cfg_path], cwd=RL_DIR,
                             stdout=out, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, **kwargs)
        self.procs[name] = p
        with open(os.path.join(d, "trainer.pid"), "w") as fh:
            fh.write(str(p.pid))
        self.cache.pop(name, None)
        return {"pid": p.pid}

    def stop(self, name: str) -> dict:
        pid = self.trainer_pid(name)
        if not pid:
            raise ValueError(f"{name} is not training")
        if os.name == "nt":
            os.kill(pid, signal.CTRL_BREAK_EVENT)
        else:
            os.kill(pid, signal.SIGTERM)  # the trainer saves latest.pt, then exits
        return {"stopping": pid}


def tail(path: str, n: int) -> list:
    try:
        with open(path, "rb") as fh:
            fh.seek(max(0, os.path.getsize(path) - 64 * 1024))
            lines = fh.read().decode("utf-8", "replace").splitlines()
        return lines[-n:]
    except OSError:
        return []


# --------------------------------------------------------------------------- background jobs (evaluate / export)
class Jobs:
    def __init__(self):
        self.jobs: list[dict] = []
        self.lock = threading.Lock()

    def submit(self, kind: str, title: str, cmd: list, on_line=None, on_done=None) -> dict:
        job = {"id": len(self.jobs) + 1, "kind": kind, "title": title, "status": "running", "output": [],
               "started": time.time(), "ended": None}
        with self.lock:
            self.jobs.append(job)

        def work():
            try:
                p = subprocess.Popen(cmd, cwd=RL_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                                     bufsize=1)
                for line in p.stdout:
                    line = line.rstrip("\n")
                    if on_line:
                        on_line(line)
                    if not line.startswith("JSON "):
                        job["output"].append(line)
                        del job["output"][:-200]
                code = p.wait()
                job["status"] = "done" if code == 0 else f"failed (exit {code})"
            except Exception as e:  # noqa: BLE001
                job["status"] = f"failed: {e}"
            job["ended"] = time.time()
            if on_done:
                on_done(job)

        threading.Thread(target=work, daemon=True).start()
        return job

    def list(self) -> list:
        return [dict(j, output=j["output"][-30:]) for j in self.jobs[-20:]][::-1]


def policies() -> list:
    """Models that can be evaluated or used as opponents."""
    out = []
    for name in sorted(os.listdir(RUNS)) if os.path.isdir(RUNS) else []:
        p = os.path.join(RUNS, name, "latest.pt")
        if os.path.exists(p):
            out.append({"label": f"run: {name}", "path": os.path.relpath(p, RL_DIR)})
    ck = os.path.join(RL_DIR, "checkpoints")
    for f in sorted(os.listdir(ck)) if os.path.isdir(ck) else []:
        if f.endswith(".pt"):
            out.append({"label": f"checkpoint: {f}", "path": os.path.join("checkpoints", f)})
    if os.path.exists(os.path.join(REPO, "ultimate_model.json")):
        out.append({"label": "game model: ultimate_model.json", "path": os.path.relpath(
            os.path.join(REPO, "ultimate_model.json"), RL_DIR)})
    return out


def safe_policy(path: str) -> str:
    full = os.path.abspath(os.path.join(RL_DIR, path))
    if not (full.startswith(REPO + os.sep) and full.endswith((".pt", ".json")) and os.path.exists(full)):
        raise ValueError(f"unknown model: {path}")
    return full


# --------------------------------------------------------------------------- system usage
_prev_cpu = {"t": None}


def system_usage(runs: Runs) -> dict:
    info = {"cores": os.cpu_count(), "psutil": bool(psutil)}
    trainers = [{"run": r["name"], "pid": runs.trainer_pid(r["name"])} for r in runs.list() if r["running"]]
    if psutil:
        info["cpu_percent"] = psutil.cpu_percent(interval=None)
        info["per_core"] = psutil.cpu_percent(interval=None, percpu=True)
        vm = psutil.virtual_memory()
        info["mem_used_gb"], info["mem_total_gb"] = (vm.total - vm.available) / 1e9, vm.total / 1e9
        for t in trainers:
            try:
                pr = psutil.Process(t["pid"])
                procs = [pr] + pr.children(recursive=True)
                t["cpu_percent"] = sum(p.cpu_percent(interval=None) for p in procs)
                t["mem_gb"] = sum(p.memory_info().rss for p in procs) / 1e9
            except psutil.Error:
                pass
    else:
        try:
            with open("/proc/stat") as fh:
                parts = [int(x) for x in fh.readline().split()[1:]]
            idle, total = parts[3] + parts[4], sum(parts)
            prev = _prev_cpu["t"]
            _prev_cpu["t"] = (idle, total)
            if prev and total > prev[1]:
                info["cpu_percent"] = 100.0 * (1 - (idle - prev[0]) / (total - prev[1]))
            mem = {}
            with open("/proc/meminfo") as fh:
                for line in fh:
                    k, v = line.split(":")
                    mem[k] = int(v.split()[0]) * 1024
            info["mem_used_gb"] = (mem["MemTotal"] - mem.get("MemAvailable", mem["MemFree"])) / 1e9
            info["mem_total_gb"] = mem["MemTotal"] / 1e9
        except (OSError, ValueError, KeyError, IndexError):
            pass
        if hasattr(os, "getloadavg"):
            info["load"] = os.getloadavg()
        for t in trainers:
            try:  # works on Linux and macOS
                out = subprocess.run(["ps", "-o", "%cpu=,rss=", "-p", str(t["pid"])], capture_output=True, text=True,
                                     timeout=2).stdout.split()
                t["cpu_percent"], t["mem_gb"] = float(out[0]), int(out[1]) * 1024 / 1e9
            except (OSError, ValueError, IndexError, subprocess.SubprocessError):
                pass
    info["trainers"] = trainers
    return info


# --------------------------------------------------------------------------- HTTP
RUNS_STATE = Runs()
JOBS = Jobs()


def evaluate_job(body: dict) -> dict:
    name = body.get("run")
    policy = safe_policy(body["policy"])
    opps = []
    for o in body.get("opponents", []):
        opps.append(o if o in ("classic", "dqn", "random") else safe_policy(o))
    if not opps:
        raise ValueError("pick at least one opponent")
    games = max(2, min(2000, int(body.get("games", 100))))
    max_ticks = max(600, int(float(body.get("max_minutes", 15)) * 3600))
    threads = max(1, min(os.cpu_count() or 4, int(body.get("threads", 4))))
    cmd = [sys.executable, "-u", "-m", "wars_rl.evaluate", policy, "--opponents", ",".join(opps), "--games",
           str(games), "--max-ticks", str(max_ticks), "--threads", str(threads), "--envs", str(min(games, 50)),
           "--json"]
    if body.get("greedy"):
        cmd.append("--greedy")
    out_file = os.path.join(run_path(name), "evals.jsonl") if name else None
    label = os.path.relpath(policy, REPO)

    def on_line(line):
        if line.startswith("JSON ") and out_file:
            rec = json.loads(line[5:])
            rec.update(policy=label, time=time.time(),
                       opponent=os.path.relpath(rec["opponent"], REPO) if os.sep in rec["opponent"] else rec["opponent"])
            with open(out_file, "a") as fh:
                fh.write(json.dumps(rec) + "\n")

    return JOBS.submit("evaluate", f"evaluate {label} vs {', '.join(os.path.basename(o) for o in opps)}", cmd, on_line)


def export_job(body: dict) -> dict:
    name = body["run"]
    src = os.path.join(run_path(name), "latest.pt")
    if not os.path.exists(src):
        raise ValueError("this run has no checkpoint yet")
    target = os.path.join(REPO, "ultimate_model.json") if body.get("to_game") else \
        os.path.join(run_path(name), "ultimate_model.json")
    cmd = [sys.executable, "-u", "-m", "wars_rl.export", src, target]
    if body.get("checkpoint_name"):
        ck = body["checkpoint_name"]
        if not NAME_RE.match(ck):
            raise ValueError("checkpoint name: letters, digits, '-', '_' and '.' only")
        os.makedirs(os.path.join(RL_DIR, "checkpoints"), exist_ok=True)
        cmd += ["--checkpoint-out", os.path.join(RL_DIR, "checkpoints", ck if ck.endswith(".pt") else ck + ".pt")]
    return JOBS.submit("export", f"export {name} → {os.path.relpath(target, REPO)}", cmd)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # keep the console quiet
        pass

    def _send(self, code: int, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        try:
            if url.path in ("/", "/index.html"):
                with open(os.path.join(HERE, "dashboard.html"), "rb") as fh:
                    return self._send(200, fh.read(), "text/html; charset=utf-8")
            if url.path == "/api/schema":
                return self._send(200, schema())
            if url.path == "/api/runs":
                return self._send(200, RUNS_STATE.list())
            if url.path == "/api/run":
                return self._send(200, RUNS_STATE.detail(q.get("name", "")))
            if url.path == "/api/system":
                return self._send(200, system_usage(RUNS_STATE))
            if url.path == "/api/jobs":
                return self._send(200, JOBS.list())
            if url.path == "/api/policies":
                return self._send(200, policies())
            return self._send(404, {"error": "not found"})
        except ValueError as e:
            return self._send(400, {"error": str(e)})

    def do_POST(self):
        url = urlparse(self.path)
        try:
            n = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(n) or b"{}")
            if url.path == "/api/train":
                return self._send(200, RUNS_STATE.start(body["name"], body.get("config", {}), bool(body.get("resume"))))
            if url.path == "/api/stop":
                return self._send(200, RUNS_STATE.stop(body["name"]))
            if url.path == "/api/evaluate":
                return self._send(200, evaluate_job(body))
            if url.path == "/api/export":
                return self._send(200, export_job(body))
            return self._send(404, {"error": "not found"})
        except (ValueError, KeyError, TypeError) as e:
            return self._send(400, {"error": str(e)})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8008)
    ap.add_argument("--host", default="127.0.0.1", help="127.0.0.1 = only this computer (recommended)")
    args = ap.parse_args()
    os.makedirs(RUNS, exist_ok=True)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Wars of Ages training dashboard: http://{'localhost' if args.host in ('127.0.0.1', '0.0.0.0') else args.host}:{args.port}")
    print("Ctrl+C stops the dashboard; training runs keep going in the background.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
