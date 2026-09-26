import fs from "node:fs";

// ============================================================================
// 1. TRAINING CONFIGURATION
// ============================================================================
const TARGET_STEPS = 100_000;        // Total RL decisions to train
const LOAD_FROM_MEMORY = true;       // true = resume from ultimate_dqn_model.json | false = fresh brain
const MODEL_FILE = "./ultimate_dqn_model.json";
const MAX_TICKS_PER_MATCH = 18_000;  // 5 minutes max match duration (at 60 ticks/s) before draw reset

// Reward & Penalty Weights (Identical to rl.js)
const TROOP_DMG_WEIGHT = 1.0;        // +1.0 per troop damage dealt
const BASE_DMG_WEIGHT = 16.0;        // +16.0 per enemy base damage dealt
const OWN_BASE_LOSS_PENALTY = 3.5;   // -3.5 per own base health lost
const SPEND_PENALTY_FACTOR = 1.35;   // Linear cost penalty: -1.35 per 1 gold spent
const WIN_BONUS = 400.0;             // Bonus for destroying the enemy base

// Network Hyperparameters (144 -> 256 -> 128 -> Dueling Value + Advantage)
const INPUT_SIZE = 144;
const HIDDEN_1 = 256;
const HIDDEN_2 = 128;
const ACTIONS = [
    "Basic Troop", "Fast Troop", "Range Troop", "Advanced Troop",
    "Shield Troop", "Catapult", "Boomer Troop", "Doggo",
    "Trebuchet", "Atomic Troop", "Atomic Bomb", "Boss", "wait"
];
const OUTPUT_SIZE = ACTIONS.length;

const N_STEPS = 4;
const GAMMA = 0.94;
const TAU = 0.005;
const BATCH_SIZE = 24;
const TRAIN_EVERY_N_STEPS = 2;       // Run mini-batch backprop every 2 decisions for fast throughput
const REPLAY_CAPACITY = 30_000;
const PER_ALPHA = 0.6;

const LR_INITIAL = 0.0008;
const LR_MIN = 0.00015;
const ADAM_BETA1 = 0.9;
const ADAM_BETA2 = 0.999;
const ADAM_EPS = 1e-8;
const WEIGHT_DECAY = 1e-5;

let EPSILON = 0.30;                  // Starts at 30% exploration and decays to 3% over 100k steps
const EPSILON_MIN = 0.03;
const EPSILON_DECAY = 0.999975;

const canvasWidth = 700;
const baseStats = { health: 800, position: 0, span: 45 };

const troopArr = [
    { name: "Basic Troop",    health: 20,   damage: 4.4,  baseDamage: 4,    attackSpeed: 40,  price: 5,    speed: 1,   span: 20, range: 0,   researchPrice: 0 },
    { name: "Fast Troop",     health: 12,   damage: 2.3,  baseDamage: 0.8,  attackSpeed: 13,  price: 5,    speed: 2.5, span: 15, range: 10,  researchPrice: 60 },
    { name: "Range Troop",    health: 20,   damage: 4.3,  baseDamage: 3,    attackSpeed: 50,  price: 8,    speed: 1,   span: 20, range: 79,  researchPrice: 100 },
    { name: "Advanced Troop", health: 36,   damage: 15,   baseDamage: 10,   attackSpeed: 70,  price: 10,   speed: 1,   span: 20, range: 0,   researchPrice: 120 },
    { name: "Shield Troop",   health: 115,  damage: 3,    baseDamage: 1.75, attackSpeed: 200, price: 12,   speed: 1,   span: 20, range: 0,   researchPrice: 150 },
    { name: "Catapult",       health: 15,   damage: 3.2,  baseDamage: 12,   attackSpeed: 100, price: 20,   speed: 0.9, span: 32, range: 140, researchPrice: 140 },
    { name: "Boomer Troop",   health: 1,    damage: 50,   baseDamage: 30,   attackSpeed: 17,  price: 20,   speed: 2,   span: 20, range: 40,  researchPrice: 140 },
    { name: "Doggo",          health: 30,   damage: 30,   baseDamage: 2,    attackSpeed: 60,  price: 20,   speed: 1.8, span: 15, range: 0,   researchPrice: 175 },
    { name: "Trebuchet",      health: 5,    damage: 0,    baseDamage: 100,  attackSpeed: 300, price: 45,   speed: 0.5, span: 50, range: 210, researchPrice: 250 },
    { name: "Atomic Troop",   health: 280,  damage: 0.6,  baseDamage: 0.75, attackSpeed: 1,   price: 40,   speed: 0.8, span: 18, range: 0,   researchPrice: 250 },
    { name: "Atomic Bomb",    health: 5000, damage: 9999, baseDamage: 0,    attackSpeed: 1,   price: 250,  speed: 3,   span: 28, range: 100, researchPrice: 800 },
    { name: "Boss",           health: 1000, damage: 40,   baseDamage: 10,   attackSpeed: 180, price: 5000, speed: 0.3, span: 35, range: 0,   researchPrice: 10000 },
];

const UNIT_META = {
    "Basic Troop":    { id: 0,  price: 5,    hp: 20,   dps: 4.4 / 40, range: 0   },
    "Fast Troop":     { id: 1,  price: 5,    hp: 12,   dps: 2.3 / 13, range: 10  },
    "Range Troop":    { id: 2,  price: 8,    hp: 20,   dps: 4.3 / 50, range: 79  },
    "Advanced Troop": { id: 3,  price: 10,   hp: 36,   dps: 15 / 70,  range: 0   },
    "Shield Troop":   { id: 4,  price: 12,   hp: 115,  dps: 3 / 200,  range: 0   },
    "Catapult":       { id: 5,  price: 20,   hp: 15,   dps: 3.2 / 100,range: 140 },
    "Boomer Troop":   { id: 6,  price: 20,   hp: 1,    dps: 50 / 17,  range: 40  },
    "Doggo":          { id: 7,  price: 20,   hp: 30,   dps: 30 / 60,  range: 0   },
    "Trebuchet":      { id: 8,  price: 45,   hp: 5,    dps: 100 / 300,range: 210 },
    "Atomic Troop":   { id: 9,  price: 40,   hp: 280,  dps: 0.6 / 1,  range: 0   },
    "Atomic Bomb":    { id: 10, price: 250,  hp: 5000, dps: 99,       range: 100 },
    "Boss":           { id: 11, price: 5000, hp: 1000, dps: 40 / 180, range: 0   },
    "wait":           { id: 12, price: 0,    hp: 0,    dps: 0,        range: 0   },
};

const PARAM_KEYS = ["W1", "b1", "W2", "b2", "Wv", "bv", "Wa", "ba"];

// ============================================================================
// 2. DUELING DOUBLE-DQN & ADAMW ENGINE
// ============================================================================
function createDuelingNetwork() {
    const s1 = Math.sqrt(2 / INPUT_SIZE);
    const s2 = Math.sqrt(2 / HIDDEN_1);
    const s3 = Math.sqrt(2 / HIDDEN_2);
    const randArr = (len, scale) =>
        Float32Array.from({ length: len }, () => (Math.random() * 2 - 1) * scale);

    return {
        W1: randArr(HIDDEN_1 * INPUT_SIZE, s1),
        b1: new Float32Array(HIDDEN_1),
        W2: randArr(HIDDEN_2 * HIDDEN_1, s2),
        b2: new Float32Array(HIDDEN_2),
        Wv: randArr(HIDDEN_2, s3),
        bv: new Float32Array(1),
        Wa: randArr(OUTPUT_SIZE * HIDDEN_2, s3),
        ba: new Float32Array(OUTPUT_SIZE),
    };
}

function cloneNetwork(src) {
    const copy = {};
    for (const k of PARAM_KEYS) copy[k] = new Float32Array(src[k]);
    return copy;
}

function createZeroGrads(template) {
    const grads = {};
    for (const k of PARAM_KEYS) grads[k] = new Float32Array(template[k].length);
    return grads;
}

let onlineNet = createDuelingNetwork();
let targetNet = cloneNetwork(onlineNet);
let adamM = createZeroGrads(onlineNet);
let adamV = createZeroGrads(onlineNet);
let stepCounter = 0;
let updateCounter = 0;

if (LOAD_FROM_MEMORY && fs.existsSync(MODEL_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(MODEL_FILE, "utf8"));
        if (saved.b1?.length === HIDDEN_1 && saved.b2?.length === HIDDEN_2 && saved.Wv) {
            for (const k of PARAM_KEYS) onlineNet[k] = new Float32Array(saved[k]);
            targetNet = cloneNetwork(onlineNet);
            stepCounter = saved.stepCounter || 0;
            if (typeof saved.epsilon === "number") EPSILON = Math.max(EPSILON_MIN, saved.epsilon);
            console.log(`[LOADED] Resuming from ${MODEL_FILE} at step ${stepCounter} (Eps: ${EPSILON.toFixed(4)})`);
        }
    } catch (e) {
        console.log("[NEW] Could not parse existing model, starting fresh.");
    }
} else {
    console.log("[NEW] Created fresh Dueling Double-DQN model.");
}

function saveModelSafely() {
    const payload = { stepCounter, epsilon: EPSILON };
    for (const k of PARAM_KEYS) payload[k] = Array.from(onlineNet[k]);
    const tmp = `${MODEL_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload));
    fs.renameSync(tmp, MODEL_FILE);
}

process.on("SIGINT", () => {
    console.log("\nInterrupted — saving model safely...");
    saveModelSafely();
    console.log(`Saved at step ${stepCounter}.`);
    process.exit(0);
});

function forward(net, x) {
    const h1 = new Float32Array(HIDDEN_1);
    for (let i = 0; i < HIDDEN_1; i++) {
        let sum = net.b1[i];
        const off = i * INPUT_SIZE;
        for (let j = 0; j < INPUT_SIZE; j++) sum += net.W1[off + j] * x[j];
        h1[i] = sum > 0 ? sum : 0.01 * sum;
    }

    const h2 = new Float32Array(HIDDEN_2);
    for (let i = 0; i < HIDDEN_2; i++) {
        let sum = net.b2[i];
        const off = i * HIDDEN_1;
        for (let j = 0; j < HIDDEN_1; j++) sum += net.W2[off + j] * h1[j];
        h2[i] = sum > 0 ? sum : 0.01 * sum;
    }

    let value = net.bv[0];
    for (let i = 0; i < HIDDEN_2; i++) value += net.Wv[i] * h2[i];

    const adv = new Float32Array(OUTPUT_SIZE);
    let meanAdv = 0;
    for (let a = 0; a < OUTPUT_SIZE; a++) {
        let sum = net.ba[a];
        const off = a * HIDDEN_2;
        for (let i = 0; i < HIDDEN_2; i++) sum += net.Wa[off + i] * h2[i];
        adv[a] = sum;
        meanAdv += sum;
    }
    meanAdv /= OUTPUT_SIZE;

    const out = new Float32Array(OUTPUT_SIZE);
    for (let a = 0; a < OUTPUT_SIZE; a++) out[a] = value + (adv[a] - meanAdv);
    return { h1, h2, out };
}

function accumulateSampleGradients(x, actionIdx, targetQ, isWeight, grads) {
    const { h1, h2, out } = forward(onlineNet, x);
    const tdError = out[actionIdx] - targetQ;
    const clippedGrad = Math.max(-12, Math.min(12, tdError)) * isWeight;

    const dH2 = new Float32Array(HIDDEN_2);

    grads.bv[0] += clippedGrad;
    for (let i = 0; i < HIDDEN_2; i++) {
        grads.Wv[i] += clippedGrad * h2[i];
        dH2[i] += onlineNet.Wv[i] * clippedGrad;
    }

    const invOut = 1 / OUTPUT_SIZE;
    for (let a = 0; a < OUTPUT_SIZE; a++) {
        const dAdv = clippedGrad * ((a === actionIdx ? 1 : 0) - invOut);
        grads.ba[a] += dAdv;
        const off = a * HIDDEN_2;
        for (let i = 0; i < HIDDEN_2; i++) {
            grads.Wa[off + i] += dAdv * h2[i];
            dH2[i] += onlineNet.Wa[off + i] * dAdv;
        }
    }

    for (let i = 0; i < HIDDEN_2; i++) dH2[i] *= h2[i] > 0 ? 1 : 0.01;

    const dH1 = new Float32Array(HIDDEN_1);
    for (let i = 0; i < HIDDEN_2; i++) {
        const g2 = dH2[i];
        if (g2 === 0) continue;
        grads.b2[i] += g2;
        const off = i * HIDDEN_1;
        for (let j = 0; j < HIDDEN_1; j++) {
            grads.W2[off + j] += g2 * h1[j];
            dH1[j] += onlineNet.W2[off + j] * g2;
        }
    }

    for (let j = 0; j < HIDDEN_1; j++) {
        const g1 = dH1[j] * (h1[j] > 0 ? 1 : 0.01);
        if (g1 === 0) continue;
        grads.b1[j] += g1;
        const off = j * INPUT_SIZE;
        for (let k = 0; k < INPUT_SIZE; k++) {
            if (x[k] !== 0) grads.W1[off + k] += g1 * x[k];
        }
    }

    return Math.abs(tdError);
}

function applyAdamUpdate(grads, batchCount, step) {
    const lr = Math.max(LR_MIN, LR_INITIAL * Math.pow(0.99995, step));
    const biasCorr1 = 1 - Math.pow(ADAM_BETA1, step);
    const biasCorr2 = 1 - Math.pow(ADAM_BETA2, step);
    const invBatch = 1 / batchCount;

    for (const k of PARAM_KEYS) {
        const param = onlineNet[k];
        const gArr = grads[k];
        const mArr = adamM[k];
        const vArr = adamV[k];
        const isWeight = k.startsWith("W");

        for (let i = 0; i < param.length; i++) {
            const g = gArr[i] * invBatch;
            mArr[i] = ADAM_BETA1 * mArr[i] + (1 - ADAM_BETA1) * g;
            vArr[i] = ADAM_BETA2 * vArr[i] + (1 - ADAM_BETA2) * g * g;
            const mHat = mArr[i] / biasCorr1;
            const vHat = vArr[i] / biasCorr2;
            if (isWeight) param[i] *= 1 - lr * WEIGHT_DECAY;
            param[i] -= lr * (mHat / (Math.sqrt(vHat) + ADAM_EPS));
            gArr[i] = 0;
        }
    }
}

function softUpdateTargetNetwork() {
    for (const k of PARAM_KEYS) {
        const tArr = targetNet[k];
        const oArr = onlineNet[k];
        for (let i = 0; i < tArr.length; i++) tArr[i] = (1 - TAU) * tArr[i] + TAU * oArr[i];
    }
}

function extractFeatures(payload) {
    const field = payload.currentField || {};
    const myUnits = field.myUnits || [];
    const enemyUnits = field.enemyUnits || [];
    const unlocked = payload.unlockedUnits || [];
    const features = [];

    const myCounts = new Array(12).fill(0);
    const enemyCounts = new Array(12).fill(0);
    for (const u of myUnits) {
        const m = UNIT_META[u.name];
        if (m && m.id < 12) myCounts[m.id] += 1 / 7;
    }
    for (const u of enemyUnits) {
        const m = UNIT_META[u.name];
        if (m && m.id < 12) enemyCounts[m.id] += 1 / 7;
    }
    const unlockedFlags = Array.from({ length: 12 }, (_, i) => (unlocked[i] ? 1.0 : 0.0));
    features.push(...myCounts, ...enemyCounts, ...unlockedFlags);

    const zones = Array.from({ length: 7 }, () => ({ myHP: 0, myDPS: 0, enHP: 0, enDPS: 0, enCount: 0 }));
    for (const u of myUnits) {
        const z = Math.max(0, Math.min(6, Math.floor((u.distanceToMyBase || 0) / 100)));
        const m = UNIT_META[u.name] || UNIT_META["Basic Troop"];
        zones[z].myHP += (u.health || 0) / 200;
        zones[z].myDPS += m.dps;
    }
    for (const u of enemyUnits) {
        const z = Math.max(0, Math.min(6, Math.floor((u.distanceToMyBase || 700) / 100)));
        const m = UNIT_META[u.name] || UNIT_META["Basic Troop"];
        zones[z].enHP += (u.health || 0) / 200;
        zones[z].enDPS += m.dps;
        zones[z].enCount += 1 / 5;
    }
    for (const z of zones) {
        features.push(
            Math.min(2.5, z.myHP), Math.min(2.5, z.myDPS),
            Math.min(2.5, z.enHP), Math.min(2.5, z.enDPS), Math.min(2.5, z.enCount)
        );
    }

    for (let i = 0; i < 6; i++) {
        const u = myUnits[i];
        if (u) {
            const m = UNIT_META[u.name] || UNIT_META["Basic Troop"];
            features.push(1.0, (u.distanceToMyBase ?? 0) / 700, Math.min(2, (u.health ?? m.hp) / m.hp), m.range / 210);
        } else features.push(0, 0, 0, 0);
    }

    for (let i = 0; i < 6; i++) {
        const u = enemyUnits[i];
        if (u) {
            const m = UNIT_META[u.name] || UNIT_META["Basic Troop"];
            features.push(
                1.0, (u.distanceToMyBase ?? 700) / 700, Math.min(2, (u.health ?? m.hp) / m.hp),
                m.range / 210, u.name === "Shield Troop" ? 1.0 : 0.0
            );
        } else features.push(0, 1.0, 0, 0, 0);
    }

    const getFrontDist = (snap, isEnemy) => {
        if (!snap || typeof snap !== "object") return isEnemy ? 1.0 : 0.0;
        const arr = isEnemy ? snap.enemyUnits : snap.myUnits;
        return arr?.[0] ? arr[0].distanceToMyBase / 700 : (isEnemy ? 1.0 : 0.0);
    };

    const hist = payload.fieldHistory || {};
    const myFrontNow = getFrontDist(field, false);
    const myFront1s  = getFrontDist(hist["1s_ago"], false);
    const myFront2s  = getFrontDist(hist["2s_ago"], false);
    const myFront5s  = getFrontDist(hist["5s_ago"], false);
    const myFront10s = getFrontDist(hist["10s_ago"], false);
    const myFront20s = getFrontDist(hist["20s_ago"], false);

    const enFrontNow = getFrontDist(field, true);
    const enFront1s  = getFrontDist(hist["1s_ago"], true);
    const enFront2s  = getFrontDist(hist["2s_ago"], true);
    const enFront5s  = getFrontDist(hist["5s_ago"], true);
    const enFront10s = getFrontDist(hist["10s_ago"], true);
    const enFront20s = getFrontDist(hist["20s_ago"], true);

    const frontlineGap = Math.max(-1, Math.min(1, enFrontNow - myFrontNow));
    const moneyNorm = Math.min(2.5, (payload.money || 0) / 50);
    const encNorm = Math.min(2.5, (payload.encouragement || 1) / 3);
    const myBaseNorm = (field.playerBaseHealth ?? 800) / 800;
    const enemyBaseNorm = (field.enemyBaseHealth ?? 800) / 800;
    const myCapRatio = myUnits.length / 7;

    const len = myUnits.length;
    const doggoComboReady =
        len >= 2 && myUnits[len - 1]?.name === "Doggo" && myUnits[len - 2]?.name === "Doggo" ? 1.0 : 0.0;

    features.push(
        myFrontNow, myFront1s, myFront2s, myFront5s, myFront10s, myFront20s,
        enFrontNow, enFront1s, enFront2s, enFront5s, enFront10s, enFront20s,
        frontlineGap, moneyNorm, encNorm, myBaseNorm, enemyBaseNorm, myCapRatio, doggoComboReady
    );

    return Float32Array.from(features);
}

const replayBuffer = [];
let maxPriority = 1.0;

function addExperience(s, a, rN, sNth, allowedNth, gammaPow) {
    replayBuffer.push({ s, a, rN, sNth, allowedNth, gammaPow, priority: maxPriority });
    if (replayBuffer.length > REPLAY_CAPACITY) replayBuffer.shift();
}

function samplePrioritizedBatch(batchSize) {
    const len = replayBuffer.length;
    const weights = new Float32Array(len);
    let sumWeights = 0;
    for (let i = 0; i < len; i++) {
        const w = Math.pow(replayBuffer[i].priority + 1e-5, PER_ALPHA);
        weights[i] = w;
        sumWeights += w;
    }
    const samples = [];
    const segment = sumWeights / batchSize;
    for (let b = 0; b < batchSize; b++) {
        const target = (b + Math.random()) * segment;
        let cumulative = 0;
        let chosenIdx = len - 1;
        for (let i = 0; i < len; i++) {
            cumulative += weights[i];
            if (cumulative >= target) {
                chosenIdx = i;
                break;
            }
        }
        const prob = weights[chosenIdx] / sumWeights;
        const isWeight = Math.min(1.0, Math.pow(len * prob, -0.4));
        samples.push({ exp: replayBuffer[chosenIdx], isWeight });
    }
    return samples;
}

const botMemory = new Map();
const gradAccumulator = createZeroGrads(onlineNet);

function stepRLSync(payload) {
    const botKey = payload.side;
    if (!botMemory.has(botKey)) {
        botMemory.set(botKey, {
            nStepQueue: [],
            lastDamage: 0,
            lastEnemyBaseHP: 800,
            lastMyBaseHP: 800,
            lastTick: 0,
        });
    }
    const mem = botMemory.get(botKey);

    const currentTick = payload.currentField.time;
    const currentDamage = payload.currentField.troopDamageDealt;
    const currentEnemyBaseHP = payload.currentField.enemyBaseHealth;
    const currentMyBaseHP = payload.currentField.playerBaseHealth;

    if (currentTick < mem.lastTick) {
        while (mem.nStepQueue.length > 0) {
            let R = 0, g = 1;
            for (const item of mem.nStepQueue) { R += g * item.r; g *= GAMMA; }
            const oldest = mem.nStepQueue.shift();
            const last = mem.nStepQueue[mem.nStepQueue.length - 1] || oldest;
            addExperience(oldest.s, oldest.a, R, last.s, last.allowed, g);
        }
        mem.nStepQueue = [];
        mem.lastDamage = 0;
        mem.lastEnemyBaseHP = 800;
        mem.lastMyBaseHP = 800;
    }
    mem.lastTick = currentTick;

    const currentVec = extractFeatures(payload);
    const allowedNames = payload.availableUnits.map(u => u.name);
    if (payload.currentField.myUnits.length > 0 || allowedNames.length === 0) {
        allowedNames.push("wait");
    }
    const allowedIndices = allowedNames.map(n => ACTIONS.indexOf(n)).filter(i => i !== -1);

    if (mem.nStepQueue.length > 0) {
        const prevTransition = mem.nStepQueue[mem.nStepQueue.length - 1];
        const troopDmgDelta = Math.max(0, currentDamage - mem.lastDamage);
        const enemyBaseDmgDelta = Math.max(0, mem.lastEnemyBaseHP - currentEnemyBaseHP);
        const myBaseLossDelta = Math.max(0, mem.lastMyBaseHP - currentMyBaseHP);

        const actionName = ACTIONS[prevTransition.a];
        const unitPrice = UNIT_META[actionName]?.price || 0;
        const spendPenalty = unitPrice * SPEND_PENALTY_FACTOR;
        const winBonus = currentEnemyBaseHP <= 0 && mem.lastEnemyBaseHP > 0 ? WIN_BONUS : 0;

        const rawReward =
            (troopDmgDelta * TROOP_DMG_WEIGHT) +
            (enemyBaseDmgDelta * BASE_DMG_WEIGHT) +
            winBonus -
            (myBaseLossDelta * OWN_BASE_LOSS_PENALTY) -
            spendPenalty;

        prevTransition.r = rawReward / 10;

        if (mem.nStepQueue.length >= N_STEPS) {
            let nStepReward = 0, gammaPow = 1;
            for (let i = 0; i < N_STEPS; i++) {
                nStepReward += gammaPow * mem.nStepQueue[i].r;
                gammaPow *= GAMMA;
            }
            const oldest = mem.nStepQueue.shift();
            addExperience(oldest.s, oldest.a, nStepReward, currentVec, allowedIndices, gammaPow);
        }

        stepCounter++;
        EPSILON = Math.max(EPSILON_MIN, EPSILON * EPSILON_DECAY);

        if (replayBuffer.length >= BATCH_SIZE && stepCounter % TRAIN_EVERY_N_STEPS === 0) {
            const batch = samplePrioritizedBatch(BATCH_SIZE);
            for (const { exp, isWeight } of batch) {
                const onlineNextQ = forward(onlineNet, exp.sNth).out;
                let bestNextAction = exp.allowedNth[0] ?? 12;
                let bestOnlineScore = -Infinity;
                for (const idx of exp.allowedNth) {
                    if (onlineNextQ[idx] > bestOnlineScore) {
                        bestOnlineScore = onlineNextQ[idx];
                        bestNextAction = idx;
                    }
                }
                const targetNextQ = forward(targetNet, exp.sNth).out;
                const targetQ = exp.rN + exp.gammaPow * (targetNextQ[bestNextAction] || 0);
                const absError = accumulateSampleGradients(exp.s, exp.a, targetQ, isWeight, gradAccumulator);
                exp.priority = Math.min(50, Math.max(0.05, absError));
                if (exp.priority > maxPriority) maxPriority = exp.priority;
            }
            updateCounter++;
            applyAdamUpdate(gradAccumulator, BATCH_SIZE, updateCounter);
            softUpdateTargetNetwork();
        }
    }

    let chosenIdx = allowedIndices[0];
    if (Math.random() < EPSILON) {
        chosenIdx = allowedIndices[Math.floor(Math.random() * allowedIndices.length)];
    } else {
        const qValues = forward(onlineNet, currentVec).out;
        let bestQ = -Infinity;
        for (const idx of allowedIndices) {
            if (qValues[idx] > bestQ) {
                bestQ = qValues[idx];
                chosenIdx = idx;
            }
        }
    }

    mem.nStepQueue.push({ s: currentVec, a: chosenIdx, r: 0, allowed: allowedIndices });
    mem.lastDamage = currentDamage;
    mem.lastEnemyBaseHP = currentEnemyBaseHP;
    mem.lastMyBaseHP = currentMyBaseHP;

    return ACTIONS[chosenIdx];
}

// ============================================================================
// 3. HEADLESS GAME ENGINE (EXACT PHYSICS FROM YOUR CODE)
// ============================================================================
class Trooper {
    constructor(stats, side, multiplier = 1) {
        this.health = stats.health * multiplier;
        this.damage = stats.damage * multiplier;
        this.speed = stats.speed;
        this.span = stats.span;
        this.side = side;
        this.attackSpeed = stats.attackSpeed;
        this.targetTime = null;
        this.maxHealth = stats.health * multiplier;
        this.range = stats.range;
        this.price = stats.price;
        this.baseDamage = stats.baseDamage;
        this.name = stats.name;
        this.position = side === "left" ? 10 : canvasWidth - 10;
    }

    attack(enemyTroopers, stats) {
        if (enemyTroopers.length) {
            stats.damageDealt += this.damage;
            enemyTroopers[0].health -= this.damage;
        }
    }

    timeAttack(time, enemyTroopers, stats) {
        if (this.targetTime === null) this.targetTime = time + this.attackSpeed;
        else if (time >= this.targetTime) {
            this.attack(enemyTroopers, stats);
            this.targetTime = null;
        }
    }

    isInFront(playerUnits, index) {
        if (index === 0 || playerUnits.length === 0) return false;
        if (this.side === "left") {
            for (let i = index - 1; i >= 0; i--) {
                if (
                    this.position <= playerUnits[i].position &&
                    this.position + this.span / 2 + 2 > playerUnits[i].position - playerUnits[i].span / 2
                ) return true;
            }
        } else {
            for (let i = index - 1; i >= 0; i--) {
                if (
                    this.position >= playerUnits[i].position &&
                    this.position - this.span / 2 - 2 < playerUnits[i].position + playerUnits[i].span / 2
                ) return true;
            }
        }
        return false;
    }

    timeAttackBase(time, base, stats) {
        if (this.targetTime === null) this.targetTime = time + this.attackSpeed;
        else if (time >= this.targetTime) {
            this.attackBase(base, stats);
            this.targetTime = null;
        }
    }

    attackBase(base, stats) {
        base.health -= this.baseDamage;
        stats.damageDealt += this.baseDamage;
    }
}

class ShieldTroop extends Trooper {
    constructor(side, player, enemy, multiplier) {
        super(troopArr[4], side, multiplier);
        this.multiplier = multiplier;
    }
    attack(enemyTroopers, stats) {
        if (enemyTroopers[0]?.name === troopArr[4].name) {
            this.damage = troopArr[4].damage * 20 * this.multiplier;
        } else {
            this.damage = troopArr[4].damage * this.multiplier;
        }
        super.attack(enemyTroopers, stats);
    }
}

class CatapultTroop extends Trooper {
    constructor(side, player, enemy, multiplier) {
        super(troopArr[5], side, multiplier);
        this.blast = 60;
    }
    attack(enemyTroopers, stats) {
        for (const troop of enemyTroopers) {
            if (
                this.side === "left" &&
                this.position + this.range > troop.position &&
                this.position + this.range - this.blast < troop.position
            ) {
                troop.health -= this.damage;
                stats.damageDealt += this.damage;
            } else if (
                this.side === "right" &&
                this.position - this.range < troop.position &&
                this.position - this.range + this.blast > troop.position
            ) {
                troop.health -= this.damage;
                stats.damageDealt += this.damage;
            }
        }
    }
}

class ExplodingTroop extends Trooper {
    constructor(side, player, enemy, multiplier, troopStats = troopArr[6]) {
        super(troopStats, side, multiplier);
    }
    attack(enemyTroopers, stats) {
        if (enemyTroopers[0]) {
            enemyTroopers[0].health -= this.damage;
            stats.damageDealt += this.damage;
        }
        this.health = 0;
    }
    attackBase(base, stats) {
        this.health = 0;
        super.attackBase(base, stats);
    }
    isInFront(playerUnits, index) {
        if (playerUnits.length && this.side === playerUnits[0].side) return false;
        return super.isInFront(playerUnits, index);
    }
}

class DoggoTroop extends Trooper {
    constructor(side, player, enemy, multiplier) {
        super(troopArr[7], side, multiplier);
        this.puppy = false;
        this.multiplier = multiplier;
        if (player.playerUnits.length >= 2) {
            const u1 = player.playerUnits[player.playerUnits.length - 1];
            const u2 = player.playerUnits[player.playerUnits.length - 2];
            if (u1.name === troopArr[7].name && u2.name === troopArr[7].name) {
                this.puppy = true;
            }
        }
        if (this.puppy) {
            this.health = 22 * multiplier;
            this.maxHealth = this.health * multiplier;
            this.damage = 3.2 * multiplier;
            this.attackSpeed = 10;
            this.speed = 2.2;
            this.span = 10;
        }
    }
    attack(enemyTroopers, stats) {
        if (this.puppy) this.damage = Math.random() * 6 * this.multiplier;
        super.attack(enemyTroopers, stats);
    }
}

class TrebuchetTroop extends Trooper {
    constructor(side, player, enemy, multiplier) {
        super(troopArr[8], side, multiplier);
        this.enemyBase = player.enemyBase;
    }
    timeAttack(time, enemyTroopers, stats) {
        if (this.side === "left" && canvasWidth - this.position - 55 < this.range) {
            super.timeAttackBase(time, this.enemyBase, stats);
        } else if (this.side === "right" && this.position - this.range - 55 < 0) {
            super.timeAttackBase(time, this.enemyBase, stats);
        }
    }
}

class AtomicTroop extends Trooper {
    constructor(side, player, enemy, multiplier) {
        super(troopArr[9], side, multiplier);
    }
    isInFront(playerUnits, index) {
        this.health -= (this.maxHealth / 8) / canvasWidth;
        return super.isInFront(playerUnits, index);
    }
}

class AtomicBomb extends ExplodingTroop {
    constructor(side, player, enemy, multiplier) {
        super(side, player, enemy, multiplier, troopArr[10]);
    }
    attack() {
        this.health = 0;
    }
}

function createTroopInstance(index, side, player, enemy, multiplier) {
    switch (index) {
        case 4: return new ShieldTroop(side, player, enemy, multiplier);
        case 5: return new CatapultTroop(side, player, enemy, multiplier);
        case 6: return new ExplodingTroop(side, player, enemy, multiplier);
        case 7: return new DoggoTroop(side, player, enemy, multiplier);
        case 8: return new TrebuchetTroop(side, player, enemy, multiplier);
        case 9: return new AtomicTroop(side, player, enemy, multiplier);
        case 10: return new AtomicBomb(side, player, enemy, multiplier);
        default: return new Trooper(troopArr[index], side, multiplier);
    }
}

class HeadlessRLBot {
    constructor(money, side) {
        this.money = money;
        this.side = side;
        this.financialAid = [true, true, true];
        this.unlockedUnits = [true, false, false, false, false, false, false, false, false, false, false, false];
        this.maxUnits = 7;
        this.multiplier = 1;
        this.cooldown = 5;
        this.toUnlockUnit = 1;
        this.historyBuffer = new Map();
        this.stats = { damageDealt: 0, spending: 0 };
    }

    map(enemy, playerUnits, enemyUnits, enemyBase, playerBase, game) {
        this.enemy = enemy;
        this.playerUnits = playerUnits;
        this.enemyUnits = enemyUnits;
        this.enemyBase = enemyBase;
        this.playerBase = playerBase;
        this.game = game;
    }

    addFunds(amount) {
        this.money += amount;
    }

    isEnoughMoney(amount) {
        return this.money >= amount;
    }

    addTroop(index) {
        if (index === undefined || index < 0) return;
        if (this.isEnoughMoney(troopArr[index].price) && this.playerUnits.length < this.maxUnits) {
            this.stats.spending += troopArr[index].price;
            this.addFunds(-troopArr[index].price);
            this.playerUnits.push(createTroopInstance(index, this.side, this, this.enemy, this.multiplier));
        }
    }

    getDistanceFromOurBase(position) {
        return this.side === "right" ? Math.round(canvasWidth - 10 - position) : Math.round(position - 10);
    }

    getUnitPower(unit) {
        if (unit.name === "Boomer Troop") return unit.damage * 1.5;
        if (unit.name === "Trebuchet") return 15;
        const dps = unit.damage / Math.max(1, unit.attackSpeed);
        const rangeMult = unit.range > 50 ? 1.35 : 1.0;
        return unit.health + dps * 60 * rangeMult;
    }

    encouragement() {
        const myPower = this.playerUnits.reduce((s, u) => s + this.getUnitPower(u), 0);
        const enemyPower = this.enemyUnits.reduce((s, u) => s + this.getUnitPower(u), 0);
        if (myPower === 0 && enemyPower === 0) return 1.0;
        if (myPower === 0 && enemyPower > 0) {
            const dist = this.getDistanceFromOurBase(this.enemyUnits[0].position);
            return Math.min(10, 2.0 * (1 + ((canvasWidth - dist) / canvasWidth) * 2));
        }
        if (enemyPower === 0) return this.money > 40 ? 0.85 : 0.5;
        const ratio = enemyPower / myPower;
        const frontDist = this.getDistanceFromOurBase(this.enemyUnits[0].position);
        const prox = 0.7 + 0.9 * (1 - Math.max(0, Math.min(canvasWidth, frontDist)) / canvasWidth);
        return Math.round(ratio * prox * 100) / 100;
    }

    takeSnapshot() {
        const myUnits = this.playerUnits.map(u => ({
            name: u.name,
            health: Math.round(u.health),
            distanceToMyBase: this.getDistanceFromOurBase(u.position),
        }));
        const enemyUnits = this.enemyUnits.map(u => ({
            name: u.name,
            health: Math.round(u.health),
            distanceToMyBase: this.getDistanceFromOurBase(u.position),
        }));
        const baseDmg = baseStats.health - this.enemyBase.health;
        const troopDmg = Math.max(0, Math.round((this.stats.damageDealt - baseDmg) * 10) / 10);
        return {
            time: this.game.time,
            money: Math.round(this.money),
            troopDamageDealt: troopDmg,
            playerBaseHealth: Math.round(this.playerBase.health),
            enemyBaseHealth: Math.round(this.enemyBase.health),
            myUnits,
            enemyUnits,
        };
    }

    getHistoricalSnapshot(secondsAgo) {
        const targetTick = this.game.time - secondsAgo * 60;
        const roundedTick = Math.floor(targetTick / 30) * 30;
        return this.historyBuffer.get(roundedTick) || "Game had not reached this point yet.";
    }

    tryToUnlock() {
        if (!this.unlockedUnits[this.unlockedUnits.length - 1] && this.money > troopArr[this.toUnlockUnit].researchPrice * 1.25) {
            this.money -= troopArr[this.toUnlockUnit].researchPrice;
            this.unlockedUnits[this.toUnlockUnit] = true;
            this.toUnlockUnit++;
        }
    }

    shouldSpawnBaseDestroyer(enc) {
        this.playerUnits.forEach(e => {
            if (e.name === troopArr[4].name || e.name === troopArr[8].name) enc = 1;
        });
        if (enc <= 0.4) {
            if (this.money > 200 && Math.random() < 0.2) this.addTroop(5);
            if (Math.random() < 0.8 && this.unlockedUnits[8] && this.unlockedUnits[6] && this.unlockedUnits[2]) {
                if (this.isEnoughMoney(troopArr[6].price + troopArr[2].price + troopArr[8].price)) {
                    this.addTroop(6);
                    this.addTroop(2);
                    this.addTroop(8);
                    this.cooldown = 300;
                }
            } else if (this.unlockedUnits[4] && enc <= 0.1 && this.unlockedUnits[3]) {
                this.addTroop(3);
                this.addTroop(4);
                this.cooldown = 250;
            }
        }
    }

    moveArmy() {
        for (let step = 0; step < 2; step++) {
            this.playerUnits.forEach((troop, i) => {
                if (this.side === "left") {
                    if (
                        !troop.isInFront(this.playerUnits, i) &&
                        !troop.isInFront(this.enemyUnits, 1) &&
                        troop.position < canvasWidth - baseStats.span - 10
                    ) {
                        troop.position += troop.speed / 2;
                    }
                } else {
                    if (
                        !troop.isInFront(this.playerUnits, i) &&
                        !troop.isInFront(this.enemyUnits, 1) &&
                        troop.position > baseStats.span + 10
                    ) {
                        troop.position -= troop.speed / 2;
                    }
                }
            });
        }

        if (this.game.atomicDoomPending) {
            for (const troop of this.playerUnits) troop.health -= 0.04;
        }

        for (let i = 0; i <= 2; i++) {
            if (this.financialAid[i] && this.playerBase.health < (baseStats.health / 4) * (i + 1)) {
                this.addFunds(100);
                this.financialAid[i] = false;
            }
        }

        if (this.game.time % 30 === 0) {
            this.historyBuffer.set(this.game.time, this.takeSnapshot());
            const oldest = this.game.time - 25 * 60;
            for (const k of this.historyBuffer.keys()) {
                if (k < oldest) this.historyBuffer.delete(k);
            }
        }

        if (this.money > 1800) {
            this.multiplier *= 1.2;
            this.addFunds(-1500);
        }

        const enc = this.encouragement();

        if (this.cooldown <= 0 && this.playerUnits.length < this.maxUnits && this.money >= troopArr[0].price) {
            const availableUnits = troopArr
                .map((t, index) => ({ index, name: t.name, price: t.price }))
                .filter((t, index) => this.unlockedUnits[index] && this.money >= t.price);

            const payload = {
                side: this.side,
                money: Math.round(this.money),
                encouragement: enc,
                unlockedUnits: this.unlockedUnits,
                availableUnits,
                currentField: this.takeSnapshot(),
                fieldHistory: {
                    "20s_ago": this.getHistoricalSnapshot(20),
                    "10s_ago": this.getHistoricalSnapshot(10),
                    "5s_ago": this.getHistoricalSnapshot(5),
                    "2s_ago": this.getHistoricalSnapshot(2),
                    "1s_ago": this.getHistoricalSnapshot(1),
                },
            };

            const chosenName = stepRLSync(payload);
            let troopIndex = troopArr.findIndex(t => t.name === chosenName);
            if (troopIndex === -1 && this.playerUnits.length === 0) troopIndex = 0;
            if (troopIndex !== -1 && this.unlockedUnits[troopIndex]) {
                this.addTroop(troopIndex);
            }

            this.cooldown = enc > 2.0 ? 15 : enc >= 0.8 ? 25 : 40;
        }

        if (this.cooldown <= 0) {
            if (
                this.playerUnits.length &&
                this.money > 1000 &&
                (this.side === "left" ? this.playerUnits[0].position > canvasWidth - 300 : this.playerUnits[0].position < 300)
            ) {
                this.shouldSpawnBaseDestroyer(enc);
            }
            this.tryToUnlock();
        }

        this.cooldown--;
    }

    isEnemyInFront() {
        if (this.playerUnits.length === 0) return false;
        return this.playerUnits[0].isInFront(this.enemyUnits, 1);
    }

    attackEnemyTroop(time) {
        this.playerUnits[0].timeAttack(time, this.enemyUnits, this.stats);
    }

    handleRangeAttack(time) {
        for (const unit of this.playerUnits) {
            if (unit.range > 0) {
                if (this.side === "left" && unit.position + unit.range >= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits, this.stats);
                } else if (this.side === "right" && unit.position - unit.range <= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits, this.stats);
                }
            }
        }
    }

    attackBase(time, enemyBase) {
        for (const unit of this.playerUnits) {
            if (this.side === "left" && unit.position >= canvasWidth - 55 - unit.range) {
                unit.timeAttackBase(time, enemyBase, this.stats);
            } else if (this.side === "right" && unit.position <= 55 + unit.range) {
                unit.timeAttackBase(time, enemyBase, this.stats);
            }
        }
    }

    checkForDeath(enemy) {
        if (!this.playerUnits.length) return;
        this.playerUnits.forEach((playerUnit, i) => {
            if (playerUnit.health <= 0) {
                if (playerUnit.name === troopArr[10].name) {
                    this.game.atomicDoomPending = true;
                    this.game.atomicDoomEndTick = this.game.time + 1320; // 22s in game ticks
                } else if (playerUnit.name === troopArr[6].name) {
                    enemy.addFunds(playerUnit.price * 2.5);
                } else if (playerUnit.name === troopArr[7].name && playerUnit.puppy) {
                    enemy.addFunds(playerUnit.price * 2);
                } else {
                    enemy.addFunds(playerUnit.price * 3);
                }
                this.playerUnits.splice(i, 1);
            }
        });
    }
}

class HeadlessGame {
    constructor() {
        this.time = 0;
        this.atomicDoomPending = false;
        this.atomicDoomEndTick = 0;
        this.playerOneUnits = [];
        this.playerTwoUnits = [];
        this.playerOneBase = { health: baseStats.health, position: 5, span: baseStats.span };
        this.playerTwoBase = { health: baseStats.health, position: canvasWidth - 50, span: baseStats.span };

        this.players = [new HeadlessRLBot(55, "left"), new HeadlessRLBot(55, "right")];
        this.players[0].map(this.players[1], this.playerOneUnits, this.playerTwoUnits, this.playerTwoBase, this.playerOneBase, this);
        this.players[1].map(this.players[0], this.playerTwoUnits, this.playerOneUnits, this.playerOneBase, this.playerTwoBase, this);
    }

    move() {
        this.time += 1;
        if (this.atomicDoomPending && this.time >= this.atomicDoomEndTick) {
            this.atomicDoomPending = false;
        }

        this.players[0].moveArmy();
        this.players[1].moveArmy();

        if (this.players[0].isEnemyInFront()) this.players[0].attackEnemyTroop(this.time);
        if (this.players[1].isEnemyInFront()) this.players[1].attackEnemyTroop(this.time);

        if (this.playerOneUnits.length === 0) this.players[1].attackBase(this.time, this.playerOneBase);
        if (this.playerTwoUnits.length === 0) this.players[0].attackBase(this.time, this.playerTwoBase);

        if (this.playerOneUnits.length > 0) this.players[1].handleRangeAttack(this.time);
        if (this.playerTwoUnits.length > 0) this.players[0].handleRangeAttack(this.time);

        this.players[0].checkForDeath(this.players[1]);
        this.players[1].checkForDeath(this.players[0]);
    }
}

// ============================================================================
// 4. HIGH-SPEED SYNCHRONOUS TRAINING LOOP
// ============================================================================
console.log(`Starting Headless Training toward ${TARGET_STEPS.toLocaleString()} steps...`);
const startTime = performance.now();
let lastLogStep = stepCounter;
let matchesPlayed = 0;
let leftWins = 0;
let rightWins = 0;
let draws = 0;

while (stepCounter < TARGET_STEPS) {
    const game = new HeadlessGame();

    while (
        game.playerOneBase.health > 0 &&
        game.playerTwoBase.health > 0 &&
        game.time < MAX_TICKS_PER_MATCH &&
        stepCounter < TARGET_STEPS
        ) {
        game.move();

        if (stepCounter - lastLogStep >= 2000) {
            lastLogStep = stepCounter;
            const elapsedSec = (performance.now() - startTime) / 1000;
            const stepsPerSec = Math.round(stepCounter / Math.max(0.1, elapsedSec));
            saveModelSafely();
            console.log(
                `[Step ${stepCounter.toLocaleString()}/${TARGET_STEPS.toLocaleString()}] ` +
                `Speed: ${stepsPerSec} steps/s | Matches: ${matchesPlayed} (L:${leftWins} R:${rightWins} D:${draws}) | ` +
                `Eps: ${EPSILON.toFixed(3)} | Replay: ${replayBuffer.length}`
            );
        }
    }

    matchesPlayed++;
    if (game.playerTwoBase.health <= 0) leftWins++;
    else if (game.playerOneBase.health <= 0) rightWins++;
    else draws++;
}

saveModelSafely();
const totalSec = ((performance.now() - startTime) / 1000).toFixed(1);
console.log(`\n✅ Completed ${stepCounter.toLocaleString()} steps across ${matchesPlayed} matches in ${totalSec}s!`);
console.log(`Saved trained weights to ${MODEL_FILE}`);