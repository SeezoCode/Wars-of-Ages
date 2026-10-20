"""Actor-critic networks.

The actor is a plain MLP (Linear / LayerNorm / activation) so that it can be
exported to JSON and run by `UltimateBot.forward()` in the browser. The critic is
only used during training, so it can be anything — make it as fancy as you like.

With `recurrent` > 0 the actor has memory: its hidden layers feed a GRU cell with that
many numbers of state, carried from one decision to the next within a game (reset to
zeros at the start of each game), and the action layer reads the GRU's output. The
critic stays a plain MLP but also reads the actor's memory (detached), so its value
estimate can use what the actor remembers. Every policy exposes
`step(obs, mask, h) -> (logits, h_new)`; for memoryless ones `h` is None.
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
    recurrent: int = 0          # GRU memory size; 0 = no memory (a plain MLP)

    def to_dict(self):
        return asdict(self)


def mlp(in_dim: int, hidden: List[int], out_dim: int | None, activation: str, layernorm: bool) -> nn.Sequential:
    """Hidden layers (Linear, optional LayerNorm, activation) and, unless out_dim is None, an output layer."""
    layers: List[nn.Module] = []
    d = in_dim
    for h in hidden:
        layers.append(nn.Linear(d, h))
        if layernorm:
            layers.append(nn.LayerNorm(h))
        layers.append(ACTIVATIONS[activation]())
        d = h
    if out_dim is not None:
        layers.append(nn.Linear(d, out_dim))
    return nn.Sequential(*layers)


class RecurrentActor(nn.Module):
    """Hidden layers -> GRU cell (memory) -> action layer."""

    def __init__(self, cfg: "ModelConfig"):
        super().__init__()
        self.enc = mlp(cfg.obs_size, cfg.actor_hidden, None, cfg.activation, cfg.layernorm)
        d = cfg.actor_hidden[-1] if cfg.actor_hidden else cfg.obs_size
        self.gru = nn.GRUCell(d, cfg.recurrent)
        self.head = nn.Linear(cfg.recurrent, cfg.num_actions)

    def forward(self, obs: torch.Tensor, h: torch.Tensor):
        h = self.gru(self.enc(obs), h)
        return self.head(h), h


def make_actor(cfg: "ModelConfig") -> nn.Module:
    return RecurrentActor(cfg) if cfg.recurrent else mlp(cfg.obs_size, cfg.actor_hidden, cfg.num_actions,
                                                         cfg.activation, cfg.layernorm)


def _step(actor: nn.Module, recurrent: int, obs: torch.Tensor, mask: torch.Tensor, h):
    if recurrent:
        if h is None:
            h = torch.zeros(obs.shape[0], recurrent)
        logits, h = actor(obs, h)
    else:
        logits = actor(obs)
    return logits.masked_fill(~mask, MASK_VALUE), h


def _init(seq: nn.Module, last_gain: float):
    linears = [m for m in seq.modules() if isinstance(m, nn.Linear)]
    for m in linears:
        nn.init.orthogonal_(m.weight, gain=2 ** 0.5)
        nn.init.zeros_(m.bias)
    nn.init.orthogonal_(linears[-1].weight, gain=last_gain)


class ActorCritic(nn.Module):
    def __init__(self, cfg: ModelConfig):
        super().__init__()
        self.cfg = cfg
        self.recurrent = cfg.recurrent
        self.actor = make_actor(cfg)
        self.critic = mlp(cfg.obs_size + cfg.recurrent, cfg.critic_hidden, 1, cfg.activation, cfg.layernorm)
        _init(self.actor, 0.01)
        _init(self.critic, 1.0)

    def initial_state(self, n: int):
        return torch.zeros(n, self.recurrent) if self.recurrent else None

    def step(self, obs: torch.Tensor, mask: torch.Tensor, h=None):
        """(masked logits, new memory); memory is None for a memoryless network."""
        return _step(self.actor, self.recurrent, obs, mask, h)

    def logits(self, obs: torch.Tensor, mask: torch.Tensor, h=None) -> torch.Tensor:
        return self.step(obs, mask, h)[0]

    def value(self, obs: torch.Tensor, h=None) -> torch.Tensor:
        """h: the memory *after* this observation (what step() returned)."""
        if self.recurrent:
            obs = torch.cat([obs, (h if h is not None else torch.zeros(obs.shape[0], self.recurrent)).detach()], -1)
        return self.critic(obs).squeeze(-1)

    @torch.no_grad()
    def act(self, obs: torch.Tensor, mask: torch.Tensor, deterministic: bool = False, with_value: bool = True,
            h=None):
        """(action, log-prob, value, new memory, logits)."""
        logits, h = self.step(obs, mask, h)
        dist = Categorical(logits=logits)
        action = logits.argmax(-1) if deterministic else dist.sample()
        value = self.value(obs, h) if with_value else None
        return action, dist.log_prob(action), value, h, logits

    def evaluate(self, obs: torch.Tensor, mask: torch.Tensor, actions: torch.Tensor):
        dist = Categorical(logits=self.logits(obs, mask))
        return dist.log_prob(actions), dist.entropy(), self.value(obs)

    def evaluate_seq(self, obs, mask, actions, h0, reset):
        """Replay stretches of consecutive decisions (L, B, ...) from memories h0 (B, n).

        reset (L, B): a new game starts at this step, so the memory goes back to zeros first."""
        L, B = obs.shape[:2]
        x = self.actor.enc(obs.reshape(L * B, -1)).reshape(L, B, -1)  # only the GRU has to go step by step
        h, hs = h0, []
        for t in range(L):
            h = self.actor.gru(x[t], torch.where(reset[t, :, None], torch.zeros_like(h), h))
            hs.append(h)
        hs = torch.stack(hs)
        dist = Categorical(logits=self.actor.head(hs).masked_fill(~mask, MASK_VALUE))
        vals = self.value(obs.reshape(L * B, -1), hs.reshape(L * B, -1)).reshape(L, B)
        return dist.log_prob(actions), dist.entropy(), vals


class FrozenActor(nn.Module):
    """Inference-only policy for league opponents (no critic, no init cost)."""

    def __init__(self, cfg: ModelConfig, actor_state: dict):
        super().__init__()
        self.recurrent = cfg.recurrent
        self.actor = make_actor(cfg)
        self.actor.load_state_dict(actor_state)
        self.eval()

    @torch.no_grad()
    def step(self, obs: torch.Tensor, mask: torch.Tensor, h=None):
        return _step(self.actor, self.recurrent, obs, mask, h)

    @torch.no_grad()
    def act(self, obs: torch.Tensor, mask: torch.Tensor, deterministic: bool = False, with_value: bool = False,
            h=None):
        """(action, log-prob, None, new memory)."""
        logits, h = self.step(obs, mask, h)
        dist = Categorical(logits=logits)
        action = logits.argmax(-1) if deterministic else dist.sample()
        return action, dist.log_prob(action), None, h


def save_checkpoint(path: str, model: ActorCritic, **extra):
    torch.save({"model_config": model.cfg.to_dict(), "state_dict": model.state_dict(), **extra}, path)


def same_architecture(a: dict, b: dict) -> bool:
    """Compare model configs, treating keys added later (e.g. recurrent) as their defaults."""
    return ModelConfig(**a).to_dict() == ModelConfig(**b).to_dict()


def load_model(path: str, map_location="cpu") -> tuple[ActorCritic, dict]:
    ckpt = torch.load(path, map_location=map_location, weights_only=False)
    model = ActorCritic(ModelConfig(**ckpt["model_config"]))
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    return model, ckpt
