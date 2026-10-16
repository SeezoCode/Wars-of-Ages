// Speed of the original JS engine (index.js) on the same workload as the Rust benchmark
// (rl/engine/src/bin/bench.rs): agents observe every 10 ticks and act randomly 30% of the
// time, games end at 36 000 ticks or when a base falls.
//   node rl/parity/bench_js.js [games]
const path = require('path')
global.document = {getElementById: () => ({style: {}}), querySelector: () => null,
    querySelectorAll: () => [], getElementsByClassName: () => []}
global.location = {reload() {}}
global.fetch = () => new Promise(() => {})
global.setTimeout = () => 0
console.log = () => {}
const replies = []
global.Worker = class {  // the classic bot's worker, run synchronously (in the browser it's another thread)
    postMessage(data) {
        let result
        global.postMessage = r => { result = r }
        global.onmessage({data: JSON.parse(JSON.stringify(data))})
        replies.push({worker: this, data: result})
    }
    terminate() {}
}
const idx = require(path.resolve(__dirname, '../../index.js'))
const dqn = require(path.resolve(__dirname, '../../ultimate_dqn_model.json'))
const out = (...a) => process.stdout.write(a.join(' ') + '\n')

class RandomAgent extends idx.UltimateBot {
    constructor(side) { super(55, side, true, '') }
    decide(time) {
        if (time % 10 !== 0) return undefined
        this.observe()
        const mask = this.actionMask()
        if (Math.random() >= 0.3) return 25
        const valid = []
        mask.forEach((m, a) => { if (m) valid.push(a) })
        return valid[Math.floor(Math.random() * valid.length)]
    }
}
function make(kind, side) {
    if (kind === 'agent') return new RandomAgent(side)
    if (kind === 'classic') return new idx.SimulatingBot(55, side, true)
    const b = new idx.LocalRLBot(55, side, true, 'unused', 10)
    b.net = {}
    for (const k of ['W1', 'b1', 'W2', 'b2', 'Wv', 'bv', 'Wa', 'ba']) b.net[k] = new Float32Array(dqn[k])
    b.modelLoaded = true
    return b
}
const games = +(process.argv[2] || 6)
for (const [l, r] of [['agent', 'agent'], ['agent', 'classic'], ['agent', 'dqn']]) {
    const t0 = performance.now()
    let ticks = 0
    for (let g = 0; g < games; g++) {
        const game = new idx.Game(make(l, 'left'), make(r, 'right'), false, false, [], [])
        while (game.time < 36000 && game.playerOneBase.health > 0 && game.playerTwoBase.health > 0) {
            while (replies.length) { const x = replies.shift(); x.worker.onmessage({data: x.data}) }
            game.move()
        }
        ticks += game.time
    }
    const dt = (performance.now() - t0) / 1000
    out(`JS   ${l} vs ${r}: ${Math.round(ticks / dt)} ticks/s (${games} games, ${dt.toFixed(1)} s)`)
}
