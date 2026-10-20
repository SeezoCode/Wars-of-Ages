"""Scripted opponents with a known strong plan, so the AI has to learn to beat them.

shield_push (the plan that beats the AI in about 4 minutes): send Shield, Range, Catapult in
turns; Shields soak the damage and push the front forward. Once the front is past the middle,
stack Shields and then fill the rest of the army with Trebuchets, which hit the base whatever is
in front of them.
"""
from __future__ import annotations

import numpy as np

import wars_engine

NT = 12                                   # troop types
R0, UPGRADE, WAIT = NT, 2 * NT, wars_engine.NUM_ACTIONS - 1
BASIC, RANGE, SHIELD, CATAPULT, TREBUCHET = 0, 2, 4, 5, 8
G, S, U = 72, 10, 20                      # obs layout (rl/engine/src/obs.rs)
CYCLE = (SHIELD, RANGE, CATAPULT)


def shield_push(obs: np.ndarray, mask: np.ndarray, state: dict) -> int:
    """One decision for one player. obs/mask: that player's observation and action mask."""
    own = obs[G:G + S * U].reshape(S, U)
    alive = own[:, 0] > 0.5
    count = lambda k: int((alive & (own[:, 1 + k] > 0.5)).sum())
    front = float((own[:, 14] * alive).max()) if alive.any() else 0.0

    def get(k):  # buy troop k, researching it first if needed; None = can't afford yet (save up)
        if mask[k]:
            return k
        if mask[R0 + k]:
            return R0 + k
        return None

    if front > 0.55 or state.get("siege"):
        state["siege"] = True               # phase 2: shields in front, then Trebuchets up to the limit
        a = get(SHIELD) if count(SHIELD) < 3 else get(TREBUCHET)
    else:
        a = get(CYCLE[state.get("i", 0) % 3])
        if a is not None and a < NT:
            state["i"] = state.get("i", 0) + 1
    if a is None and not alive.any() and mask[BASIC]:
        a = BASIC                           # never leave the base completely empty
    return WAIT if a is None else int(a)
