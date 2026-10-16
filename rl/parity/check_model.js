// Plays the exported model with the real browser UltimateBot (index.js) and dumps
// observations + logits, so check_model.py can confirm the browser forward pass
// matches PyTorch.
//   node rl/parity/check_model.js ultimate_model.json > dump.jsonl
const fs = require('fs')
const path = require('path')

global.document = {getElementById: () => ({style: {}}), querySelector: () => null,
    querySelectorAll: () => [], getElementsByClassName: () => []}
global.location = {reload() {}}
global.fetch = () => new Promise(() => {})
global.Worker = class { postMessage() {} terminate() {} }
global.setTimeout = () => 0
console.log = (...a) => process.stderr.write(a.join(' ') + '\n')

const idx = require(path.resolve(__dirname, '../../index.js'))
const model = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const dqn = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../ultimate_dqn_model.json'), 'utf8'))

const out = []
class DumpingBot extends idx.UltimateBot {
    decide(time) {
        if (time % this.decisionInterval !== 0) return undefined
        const obs = this.observe()
        out.push(JSON.stringify({obs: Array.from(obs), logits: Array.from(this.forward(obs)), mask: this.actionMask()}))
        return super.decide(time)
    }
}
const ult = new DumpingBot(55, 'right', true, '', true)
ult.setModel(model)
const opp = new idx.LocalRLBot(55, 'left', true, 'unused', 10)
opp.net = {}
for (const k of ['W1', 'b1', 'W2', 'b2', 'Wv', 'bv', 'Wa', 'ba']) opp.net[k] = new Float32Array(dqn[k])
opp.modelLoaded = true
const game = new idx.Game(opp, ult, false, false, [], [])
const maxTicks = +(process.argv[3] || 12000)
while (game.time < maxTicks && game.playerOneBase.health > 0 && game.playerTwoBase.health > 0) game.move()
process.stderr.write(`ticks ${game.time} base hp left ${game.playerOneBase.health} right ${game.playerTwoBase.health}\n`)
process.stdout.write(out.join('\n') + '\n')
