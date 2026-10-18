"""One-step lookahead search for AlphaZero-style policy improvement.

At a decision of the learner, the game is copied once per (candidate move, rollout). Each copy
plays the candidate move, then `horizon` more decisions with the current network on every
network-controlled side (the classic bot's side is handed to the network as well, because its
brute-force worker search is far too slow to run inside thousands of copies). The learner's
reward over those decisions plus the critic's value of the final state, discounted exactly as in
training, scores the move (Q). Every candidate's i-th rollout uses the same random numbers
(common random numbers), so the moves are compared on the same luck.

Candidates are "wait" plus moves drawn from the policy without replacement (Gumbel top-k).
The improved policy (Gumbel MuZero style, Danihelka et al. 2022) is
    pi'(a) ~ prior(a) * exp(strength * q(a)),
q = (Q - V(root)) scaled to [-1, 1] per root; moves that were not searched get the prior-weighted
mean q of the searched ones. The trainer adds a loss that pulls the network towards pi'.
"""
from __future__ import annotations

import numpy as np
import torch

import wars_engine

WAIT = wars_engine.NUM_ACTIONS - 1


def _sample(logits: np.ndarray, u: np.ndarray) -> np.ndarray:
    """Sample one action per row from masked logits with given uniforms (common random numbers)."""
    z = logits - logits.max(-1, keepdims=True)
    p = np.exp(z)
    p /= p.sum(-1, keepdims=True)
    return np.minimum((p.cumsum(-1) < u[:, None]).sum(-1), p.shape[-1] - 1)


@torch.no_grad()
def search(trainer, roots: np.ndarray, sides: np.ndarray, obs: np.ndarray, mask: np.ndarray, shaping: float,
           rng: np.random.Generator) -> tuple[np.ndarray, dict]:
    """Improved policies for the learner at `trainer.venv` envs `roots`, sides `sides`.

    obs, mask: (n, OBS) / (n, A) of those roots. Returns ((n, A) target probabilities, stats)."""
    c = trainer.cfg
    model = trainer.model
    n, A = len(roots), mask.shape[-1]
    K, R, H = max(2, c.search_candidates), max(1, c.search_rollouts), max(1, c.search_horizon)

    logits = model.logits(torch.from_numpy(obs), torch.from_numpy(mask)).numpy()
    prior = torch.softmax(torch.from_numpy(logits), -1).numpy()
    v_root = model.value(torch.from_numpy(obs)).numpy()

    # candidates: "wait" plus K-1 valid moves drawn without replacement in proportion to the policy
    # (Gumbel top-k, as in Gumbel AlphaZero): likely moves usually get tried, unlikely ones sometimes
    cand = np.full((n, K), -1, dtype=np.int64)
    gumbel = logits - np.log(-np.log(rng.random(logits.shape)))
    for i in range(n):
        order = [a for a in np.argsort(-gumbel[i]) if mask[i, a] and a != WAIT][:K - 1]
        cand[i, :len(order) + 1] = order + [WAIT]
    valid_c = cand >= 0

    # one copy per (root, candidate, rollout)
    ri, ki, rr = np.nonzero(np.broadcast_to(valid_c[:, :, None], (n, K, R)))
    S = len(ri)
    sv = wars_engine.VecEnv(S, threads=c.env_threads)
    base = int(rng.integers(1 << 40))
    kinds = [trainer.kind[r] for r in roots]
    # hand the classic bot to the network inside the copies; keep cheap built-ins (dqn) as they are
    agent_sides = [3 if kinds[i] == "classic" else 0 for i in ri]
    sv.copy_from([int(x) for x in range(S)], trainer.venv, [int(roots[i]) for i in ri],
                 [base + int(roots[i]) * 1000 + int(r) for i, r in zip(ri, rr)], agent_sides)
    me = sides[ri]
    net_side = np.zeros((S, 2), dtype=bool)  # sides whose moves come from the network in the copies
    for s in range(S):
        k = kinds[ri[s]]
        net_side[s, me[s]] = True
        net_side[s, 1 - me[s]] = k in ("self", "past", "classic")
    # the same uniforms for every candidate of a (root, rollout): differences come from the move only
    u = rng.random((n, R, H + 1, 2))
    so, sm = sv.observe()
    phi = trainer._potential_parts(so)
    ret = np.zeros(S)
    disc = np.ones(S)
    alive = np.ones(S, dtype=bool)
    for t in range(H + 1):
        act = np.full((S, 2), WAIT, dtype=np.int64)
        for p in (0, 1):
            idx = np.flatnonzero(net_side[:, p] & alive)
            if len(idx):
                lg = model.logits(torch.from_numpy(so[idx, p]), torch.from_numpy(sm[idx, p])).numpy()
                act[idx, p] = _sample(lg, u[ri[idx], rr[idx], t, p])
        if t == 0:  # the move being evaluated
            act[np.arange(S), me] = cand[ri, ki]
        so, sm, comp, done, winner, _ = sv.step(act)
        r, phi = trainer._shaped_reward(comp, done, winner, shaping, phi, so)
        ret += alive * disc * r[np.arange(S), me]
        disc *= c.gamma
        alive &= ~done
    ret += alive * disc * model.value(torch.from_numpy(so[np.arange(S), me])).numpy()

    sums = np.zeros((n, K))
    cnt = np.zeros((n, K))
    np.add.at(sums, (ri, ki), ret)
    np.add.at(cnt, (ri, ki), 1)
    Q = np.where(cnt > 0, sums / np.maximum(cnt, 1), np.nan)

    adv = Q - v_root[:, None]
    scale = np.nanmax(np.abs(adv), axis=1, keepdims=True) + 1e-6
    q = np.nan_to_num(adv / scale)  # [-1, 1] per root
    q_full = np.zeros((n, A))
    pc = np.where(valid_c, np.take_along_axis(prior, np.maximum(cand, 0), 1), 0.0)
    q_rest = (pc * q).sum(1) / np.maximum(pc.sum(1), 1e-9)  # moves that were not searched
    q_full[:] = q_rest[:, None]
    for i in range(n):
        for j in range(K):
            if valid_c[i, j]:
                q_full[i, cand[i, j]] = q[i, j]
    target_logits = np.where(mask, np.log(np.maximum(prior, 1e-12)) + c.search_strength * q_full, -np.inf)
    target = torch.softmax(torch.from_numpy(target_logits), -1).numpy()
    best = np.where(valid_c, np.nan_to_num(Q, nan=-np.inf), -np.inf).argmax(1)
    stats = dict(search_roots=n, search_copies=S,
                 search_agree=float(np.mean(cand[np.arange(n), best] == prior.argmax(1))),
                 search_q_spread=float(np.nanmean(np.nanmax(Q, 1) - np.nanmin(Q, 1))))
    stats["_q"], stats["_cand"], stats["_v"] = Q, cand, v_root  # per-move detail (not logged)
    return target.astype(np.float32), stats
