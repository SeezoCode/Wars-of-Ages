# Wars of Ages
The Ultimate Fighting Strategy 3000

## [Play Right Now](http://testerislus.web.app) with Multiplayer

## How to compile and run the server
You can also run the server locally.
Make sure you have [Node.js](https://nodejs.org/en/) installed on your computer

Then navigate to the directory in terminal and type:
- "npm i"
- "npx tsc"
- "node ServerHandler.js"
  

After that open the IP address in your browser and play

## Ultimate AI (reinforcement learning)
`rl/` has a Rust port of the game engine (checked tick-for-tick against `index.js`) and a
PyTorch PPO trainer with league self-play. The trained bot plays in the browser as
the **Ultimate AI** (pick it on the start screen) and loads `ultimate_model.json`. See [rl/README.md](rl/README.md).
