# Models for the game's model picker

Every exported model `.json` in this folder appears in the model dropdown of the match picker
(locally and on GitHub Pages once pushed). Add one from the training dashboard (**Export model** →
"Add to the model picker") or with:

```bash
cd rl && python -m wars_rl.export runs/v2/latest.pt ../models/v2.json --note "short description"
```

`index.json` is generated (by exports, the dashboard, `python3 rl/wars_rl/model_index.py` and the
Pages workflow) and not committed. See `rl/TRAINING.md`, section 6.
