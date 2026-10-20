"""Sanity check of the training rewards: scripted games, each reward term summed per side.

    python3 rl/parity/check_rewards.py

Expected: the winner gets about +win_reward plus the base-damage hint, the loser the opposite,
and a timeout costs both sides draw_reward + time_penalty.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import numpy as np, wars_engine
from wars_rl.train import TrainConfig, Trainer, WAIT
c = TrainConfig()
T = Trainer.__new__(Trainer); T.cfg = c   # only use the reward functions
def play(left_policy, right_policy, seed, max_ticks=c.max_ticks):
    v = wars_engine.VecEnv(1, decision_interval=c.decision_interval, max_ticks=max_ticks, threads=1)
    v.reset(0, 'agent', 'agent', seed)
    obs, mask = v.observe(); phi = T._potential(obs)
    tot = {k: np.zeros(2) for k in ('win', 'dmg', 'bounty', 'time', 'potential')}
    disc = np.zeros(2); g = 1.0; steps = 0
    while True:
        acts = np.array([[left_policy(mask[0, 0]), right_policy(mask[0, 1])]], dtype=np.int64)
        obs, mask, comp, done, winner, ticks = v.step(acts)
        sh = 1.0
        r_full = T._rewards(comp, done, winner, sh)[0]
        r_none = T._rewards(comp, done, winner, 0.0)[0]
        time_cost = -c.time_penalty * c.decision_interval / c.max_ticks
        tot['time'] += time_cost
        tot['win'] += r_none - time_cost
        tot['dmg'] += c.shaping_base_damage * (comp[0, :, 0] - comp[0, :, 1])
        tot['bounty'] += c.shaping_bounty * (comp[0, :, 2] - comp[0, :, 3])
        phi_next = np.where(done[:, None], 0.0, T._potential(obs))
        tot['potential'] += (c.gamma * phi_next - phi)[0]
        phi = phi_next; steps += 1
        if done[0]: break
    return winner[0], ticks[0], steps, tot
def strongest(m):  # buy the most expensive unit/research it can afford, else wait
    idx = np.flatnonzero(m[:WAIT]); return idx.max() if len(idx) else WAIT
waiter = lambda m: WAIT
for name, lp, rp in [("attacker vs idle", strongest, waiter), ("idle vs attacker", waiter, strongest), ("idle vs idle", waiter, waiter), ("attacker vs attacker", strongest, strongest)]:
    w, t, n, tot = play(lp, rp, 7)
    print(f"{name}: winner={w} ({t/3600:.1f} min, {n} decisions)")
    for side in (0, 1):
        print("   ", "left " if side == 0 else "right", " ".join(f"{k} {tot[k][side]:+.3f}" for k in tot), f"| total {sum(tot[k][side] for k in tot):+.3f}")
