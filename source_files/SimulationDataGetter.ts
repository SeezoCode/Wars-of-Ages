// @ts-ignore
let index = require('../index')
const fs = require('fs');

console.log('Simulation', process.argv[2], 'started')
let data = []

for (let i = 0; true; i++) {
    let sim = singleSimHandler()
    data.push(sim)

    if (i >= 256) {
        console.log('datasetBatchCore' + process.argv[2] + 'batch' + i)
        fs.writeFileSync('./dataset/datasetBatchNRCore' + process.argv[2] + ' ' + Date.now(), JSON.stringify(data));
        while (data.length) data.pop()
        i = 0
    }
}


function singleSimHandler() {
    let player = [];
    let ai = [];

    let playerAvail = randomlyFillArr(player)
    let aiAvail = randomlyFillArr(ai)

    let [best, worst] = sim([player, ai, [true, true, true, true, true, true, true, true, true, true], 'right', 1000, null, false])
    return [player, playerAvail, ai, best, aiAvail]
}

function randomlyFillArr(arr: Array<number>) {
    let available = []
    for (let i = Math.floor(Math.random() * 10); i >= 0; i--) {
        available[i] = Math.random() > .5 ? 1 : 0
    }
    available[0] = 1
    // console.log(available)
    for (let i = Math.floor(Math.random() * 12); i >= 0; i--) {
        let x = Math.floor(Math.random() * 10)
        if (available[x]) arr[i] = x
        else i++
    }
    return available
}


function sim(e: any) {
    e.data = e
    // e[0] playerTroops e[1] enemyTroops e[2] unlockedUnits e[3] side e[4] money e[5] game e[6] quick compute mode
    // console.log(e);
    let bestDPM = -9999;
    let bestStats;
    let bestTroops = [];
    let worstDPM = 9999;
    let worstStats;
    let worstTroops = [];
    let numberOfUnlockedUnits = 0;
    e.data[2].forEach(function (e) {
        return e ? numberOfUnlockedUnits++ : 0;
    });
    if (numberOfUnlockedUnits >= index.troopArr.length - 2) {
        numberOfUnlockedUnits = index.troopArr.length - 2
    }
    // if (numberOfUnlockedUnits >= 4) numberOfUnlockedUnits = 4
    // let p = performance.now()
    if (!e[6]) {
        for (let i = 0; i < numberOfUnlockedUnits; i++) { // - trebuchet
            if (i === 8) continue;
            for (let j = 0; j < numberOfUnlockedUnits; j++) {
                if (j === 8 || (i === 6 && j === 6)) continue;
                for (let k = 0; k < numberOfUnlockedUnits; k++) {
                    if (((i === 6 && k === 6) || (j === 6 && k === 6))) continue;
                    let plTroops = e.data[0].slice();
                    plTroops.push(i);
                    plTroops.push(j);
                    plTroops.push(k);
                    // let p = performance.now()
                    simulationHandler(plTroops)
                }
            }
        }
    } else {
        for (let i = 0; i < numberOfUnlockedUnits; i++) { // - trebuchet
            if (i === 8) continue;
            for (let j = 0; j < numberOfUnlockedUnits; j++) {
                if (j === 8 || (i === 6 && j === 6)) continue;
                if (j === 6) continue;
                let plTroops = e.data[0].slice();
                plTroops.push(i);
                plTroops.push(j);
                simulationHandler(plTroops)
            }
        }
    }

    function simulationHandler(plTroops: Array<number>) {
        let game = simulate(plTroops, e.data[1].slice());
        let stats = getGameStats(game);
        stats.playerUnitsLength = game.players[0].playerUnits.length;
        stats.enemyUnitsLength = game.players[1].enemyUnits.length;
        if (damageCalc(stats) > bestDPM && Math.random() > .05) {
            bestDPM = damageCalc(stats);
            bestStats = stats;
            bestTroops = [plTroops[plTroops.length - 3], plTroops[plTroops.length - 2], plTroops[plTroops.length - 1]];
        }
        if (damageCalc(stats) < worstDPM && Math.random() > .05) {
            worstDPM = damageCalc(stats);
            worstStats = stats;
            worstTroops = [plTroops[plTroops.length - 3], plTroops[plTroops.length - 2], plTroops[plTroops.length - 1]];
        }
    }

    // console.log(bestDPM, bestStats, bestTroops);
    // console.log(bestTroops, damageCalc(bestStats))
    // console.log(bestTroops, 'in', performance.now() - p, 'ms')
    // document.getElementById(`dmg${this.side}`).innerText = String(bestDPM)
    function simulate(units1, units2): gameInterface {
        // console.log('simulate')
        return new index.Game(
            new index.Player(0, 'left', false),
            new index.Player(0, 'right', false),
            false, false, units1, units2);
    }

    function getGameStats(game): extendedStatsInterface {
        let stats = {
            playerSpending: null,       // 15 - 200
            playerDamage: null,         // 3 - 50
            playerUnitsLength: null,    // 3 - 7
            enemyDamage: null,          // 3 - 50
            enemyUnitsLength: null,     // 3 - 7
            time: null                  // 200 - 2000
        };
        stats.playerSpending = game.players[0].stats.spending;
        stats.playerDamage = game.players[0].stats.damageDealt;
        stats.enemyDamage = game.players[1].stats.damageDealt;
        return stats;
    }

    function damageCalc(stats): number {
        // if (stats.playerSpending > e.data[4])
        //     return 0;
        return (stats.playerDamage / stats.playerSpending);
    }

    // @ts-ignore
    return([bestTroops, worstTroops]);
}