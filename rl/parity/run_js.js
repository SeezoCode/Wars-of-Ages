// Runs a scenario on the REAL browser game code (index.js) and prints a JSONL trace.
//   node rl/parity/run_js.js scenario.json > js.jsonl
//
// Makes the browser code deterministic and headless:
//  - Math.random -> mulberry32 (separate stream inside the classic bot's Web Worker)
//  - setTimeout  -> fires on game ticks (60 ticks per second)
//  - Worker      -> runs the worker's onmessage synchronously, replies after N ticks
//  - document/fetch/location -> inert stubs
// The Rust side (rl/engine/src/bin/parity.rs) does the same scenario; check.py diffs them.

const fs = require('fs')
const path = require('path')

const scen = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))

function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0
        let t = Math.imul(a ^ a >>> 15, 1 | a)
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
        return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
}

const mainRng = mulberry32(scen.seed_main)
const workerRng = mulberry32(scen.seed_worker)
let activeRng = mainRng
Math.random = () => activeRng()

let tickIndex = 0
const timers = []
global.setTimeout = (fn, ms) => {
    timers.push({at: tickIndex + Math.ceil((ms || 0) * 60 / 1000 - 1e-9), fn})
    return timers.length
}
const dummyEl = () => ({style: {}, innerText: '', innerHTML: '', disabled: false})
global.document = {
    getElementById: dummyEl,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementsByClassName: () => [],
}
global.location = {reload() {}}
console.log = (...a) => process.stderr.write(a.join(' ') + '\n')  // keep stdout for the trace
global.fetch = () => new Promise(() => {})

const replies = []
global.Worker = class {
    postMessage(data) {
        const cloned = JSON.parse(JSON.stringify(data))
        let result
        global.postMessage = r => { result = r }
        activeRng = workerRng
        try { global.onmessage({data: cloned}) } finally { activeRng = mainRng }
        replies.push({at: tickIndex + scen.worker_latency, worker: this, data: result})
    }
    terminate() {}
}

const idx = require(path.resolve(__dirname, '../../index.js'))
if (typeof global.onmessage !== 'function') throw new Error('worker onmessage not found in index.js')

const trace = []
const out = (obj) => trace.push(JSON.stringify(obj))

class ScriptedUltimate extends idx.UltimateBot {
    constructor(money, side, seed) {
        super(money, side, true, '')
        this.scriptRng = mulberry32(seed)
    }

    decide(time) {
        if (time % 10 !== 0) return undefined
        const obs = this.observe()
        const mask = this.actionMask()
        out({obs: this.side, t: time, v: Array.from(obs)})
        const valid = []
        mask.forEach((m, a) => { if (m && a !== 25) valid.push(a) })
        let a = 25
        if (this.scriptRng() < scen.action_prob && valid.length) a = valid[Math.floor(this.scriptRng() * valid.length)]
        return a
    }
}

let dqnWeights = null
function makePlayer(kind, side, seedOffset) {
    const money = scen.start_money ?? 55
    if (kind === 'script') return new ScriptedUltimate(money, side, scen.seed_script + seedOffset)
    if (kind === 'classic') return new idx.SimulatingBot(money, side, true)
    if (kind === 'dqn') {
        const bot = new idx.LocalRLBot(money, side, true, 'unused', 10)
        if (!dqnWeights) dqnWeights = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../..', scen.dqn_model), 'utf8'))
        bot.net = {}
        for (const k of ['W1', 'b1', 'W2', 'b2', 'Wv', 'bv', 'Wa', 'ba']) bot.net[k] = new Float32Array(dqnWeights[k])
        bot.modelLoaded = true
        return bot
    }
    throw new Error('unknown kind ' + kind)
}

const left = makePlayer(scen.left, 'left', 0)
const right = makePlayer(scen.right, 'right', 1)
const game = new idx.Game(left, right, false, false, [], [])

function unitState(u) {
    return [idx.troopArr.findIndex(t => t.name === u.name), u.puppy ? 1 : 0, u.position, u.health,
        u.targetTime === null || u.targetTime === undefined ? -1 : u.targetTime]
}

for (tickIndex = 0; ; tickIndex++) {
    // between frames: timers, then worker replies
    for (let i = 0; i < timers.length;) {
        if (timers[i].at <= tickIndex) { const t = timers.splice(i, 1)[0]; t.fn() } else i++
    }
    for (let i = 0; i < replies.length;) {
        if (replies[i].at <= tickIndex) {
            const r = replies.splice(i, 1)[0]
            r.worker.onmessage({data: r.data})
        } else i++
    }
    game.move()
    const p = game.players
    out({t: game.time, s: [p[0].money, p[1].money, game.playerOneBase.health, game.playerTwoBase.health,
            p[0].multiplier, p[1].multiplier, game.atomicDoomPending ? 1 : 0,
            p[0].unlockedUnits.map(x => x ? 1 : 0).join(''), p[1].unlockedUnits.map(x => x ? 1 : 0).join('')],
        u0: game.playerOneUnits.map(unitState), u1: game.playerTwoUnits.map(unitState)})
    if (game.playerOneBase.health <= 0 || game.playerTwoBase.health <= 0 || game.time >= scen.max_ticks) break
}
process.stdout.write(trace.join('\n') + '\n')
