"""Gymnasium wrapper: one agent vs a built-in bot, for use with other RL libraries.

    from wars_rl.gym_env import WarsOfAgesEnv
    env = WarsOfAgesEnv(opponent="classic")
    obs, info = env.reset(seed=0)
    obs, reward, terminated, truncated, info = env.step(env.action_space.sample(mask=info["action_mask"]))

`action_masks()` makes it work with sb3-contrib's MaskablePPO. The built-in PPO
trainer (wars_rl.train) is much faster (batched, league self-play), but this is
handy for experimenting with other algorithms.
"""
from __future__ import annotations

import os

import gymnasium as gym
import numpy as np

import wars_engine

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class WarsOfAgesEnv(gym.Env):
    metadata = {"render_modes": []}

    def __init__(self, opponent: str = "classic", side: str = "random", win_reward: float = 1.0,
                 shaping_base_damage: float = 0.5, dqn_model: str | None = None, **env_kwargs):
        assert opponent in ("classic", "dqn")
        self.opponent = opponent
        self.side_mode = side
        self.win_reward = win_reward
        self.shaping = shaping_base_damage
        if dqn_model is None and opponent == "dqn":
            dqn_model = os.path.join(REPO, "ultimate_dqn_model.json")
        self.venv = wars_engine.VecEnv(1, dqn_model=dqn_model, threads=1, **env_kwargs)
        self.observation_space = gym.spaces.Box(-10.0, 10.0, (wars_engine.OBS_SIZE,), np.float32)
        self.action_space = gym.spaces.Discrete(wars_engine.NUM_ACTIONS)
        self.side = 0
        self._mask = np.ones(wars_engine.NUM_ACTIONS, dtype=bool)

    def action_masks(self) -> np.ndarray:
        return self._mask

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.side = int(self.np_random.integers(2)) if self.side_mode == "random" else (0 if self.side_mode == "left" else 1)
        kinds = ["agent", "agent"]
        kinds[1 - self.side] = self.opponent
        self.venv.reset(0, kinds[0], kinds[1], int(self.np_random.integers(2 ** 62)))
        obs, mask = self.venv.observe()
        self._mask = mask[0, self.side].copy()
        return obs[0, self.side].copy(), {"action_mask": self._mask}

    def step(self, action):
        actions = np.full((1, 2), wars_engine.NUM_ACTIONS - 1, dtype=np.int64)
        actions[0, self.side] = int(action)
        obs, mask, comp, done, winner, t = self.venv.step(actions)
        s = self.side
        reward = self.shaping * float(comp[0, s, 0] - comp[0, s, 1])
        terminated = truncated = False
        if done[0]:
            if winner[0] == s:
                reward += self.win_reward
            elif winner[0] == 1 - s:
                reward -= self.win_reward
            terminated = winner[0] != 2
            truncated = winner[0] == 2
        self._mask = mask[0, s].copy()
        return obs[0, s].copy(), reward, terminated, truncated, {"action_mask": self._mask, "winner": int(winner[0]),
                                                                  "ticks": int(t[0])}
