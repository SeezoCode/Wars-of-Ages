"""Actor-critic networks.

The actor is a plain MLP (Linear / LayerNorm / activation) so that it can be
exported to JSON and run by `UltimateBot.forward()` in the browser. The critic is
only used during training, so it can be anything — make it as fancy as you like.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import List

import torch
import torch.nn as nn
from torch.distributions import Categorical

ACTIVATIONS = {"relu": nn.ReLU, "tanh": nn.Tanh, "silu": nn.SiLU}
MASK_VALUE = -1e9


@dataclass
class ModelConfig:
    obs_size: int
    num_actions: int
    actor_hidden: List[int] = field(default_factory=lambda: [512, 512, 256])
    critic_hidden: List[int] = field(default_factory=lambda: [512, 512, 256])
    activation: str = "relu"
    layernorm: bool = True

    def to_dict(self):
        return asdict(self)


def mlp(in_dim: int, hidden: List[int], out_dim: int, activation: str, layernorm: bool) -> nn.Sequential:
    layers: List[nn.Module] = []
    d = in_dim
    for h in hidden:
        layers.append(nn.Linear(d, h))
        if layernorm:
            layers.append(nn.LayerNorm(h))
        layers.append(ACTIVATIONS[activation]())
        d = h
    layers.append(nn.Linear(d, out_dim))
    return nn.Sequential(*layers)


def _init(seq: nn.Sequential, last_gain: float):
    linears = [m for m in seq if isinstance(m, nn.Linear)]
    for m in linears:
        nn.init.orthogonal_(m.weight, gain=2 ** 0.5)
        nn.init.zeros_(m.bias)
    nn.init.orthogonal_(linears[-1].weight, gain=last_gain)


class ActorCritic(nn.Module):
    def __init__(self, cfg: ModelConfig):
        super().__init__()
        self.cfg = cfg
        self.actor = mlp(cfg.obs_size, cfg.actor_hidden, cfg.num_actions, cfg.activation, cfg.layernorm)
        self.critic = mlp(cfg.obs_size, cfg.critic_hidden, 1, cfg.activation, cfg.layernorm)
        _init(self.actor, 0.01)
        _init(self.critic, 1.0)

    def logits(self, obs: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        return self.actor(obs).masked_fill(~mask, MASK_VALUE)

    def value(self, obs: torch.Tensor) -> torch.Tensor:
        return self.critic(obs).squeeze(-1)

    @torch.no_grad()
    def act(self, obs: torch.Tensor, mask: torch.Tensor, deterministic: bool = False, with_value: bool = True):
        logits = self.logits(obs, mask)
        dist = Categorical(logits=logits)
        action = logits.argmax(-1) if deterministic else dist.sample()
        value = self.value(obs) if with_value else None
        return action, dist.log_prob(action), value

    def evaluate(self, obs: torch.Tensor, mask: torch.Tensor, actions: torch.Tensor):
        dist = Categorical(logits=self.logits(obs, mask))
        return dist.log_prob(actions), dist.entropy(), self.value(obs)


def save_checkpoint(path: str, model: ActorCritic, **extra):
    torch.save({"model_config": model.cfg.to_dict(), "state_dict": model.state_dict(), **extra}, path)


def load_model(path: str, map_location="cpu") -> tuple[ActorCritic, dict]:
    ckpt = torch.load(path, map_location=map_location, weights_only=False)
    model = ActorCritic(ModelConfig(**ckpt["model_config"]))
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    return model, ckpt
