// @ts-ignore
var index = require('../index');
var fs = require('fs');
console.log('Simulation', process.argv[2], 'started');
var data = [];
for (var i = 0; true; i++) {
    var sim_1 = singleSimHandler();
    data.push(sim_1);
    if (i >= 256) {
        console.log('datasetBatchCore' + process.argv[2] + 'batch' + i);
        fs.writeFileSync('./dataset/datasetBatchNRCore' + process.argv[2] + ' ' + Date.now(), JSON.stringify(data));
        while (data.length)
            data.pop();
        i = 0;
    }
}
function singleSimHandler() {
    var player = [];
    var ai = [];
    var playerAvail = randomlyFillArr(player);
    var aiAvail = randomlyFillArr(ai);
    var _a = sim([player, ai, [true, true, true, true, true, true, true, true, true, true], 'right', 1000, null, false]), best = _a[0], worst = _a[1];
    return [player, playerAvail, ai, best, aiAvail];
}
function randomlyFillArr(arr) {
    var available = [];
    for (var i = Math.floor(Math.random() * 10); i >= 0; i--) {
        available[i] = Math.random() > .5 ? 1 : 0;
    }
    available[0] = 1;
    // console.log(available)
    for (var i = Math.floor(Math.random() * 12); i >= 0; i--) {
        var x = Math.floor(Math.random() * 10);
        if (available[x])
            arr[i] = x;
        else
            i++;
    }
    return available;
}
function sim(e) {
    e.data = e;
    // e[0] playerTroops e[1] enemyTroops e[2] unlockedUnits e[3] side e[4] money e[5] game e[6] quick compute mode
    // console.log(e);
    var bestDPM = -9999;
    var bestStats;
    var bestTroops = [];
    var worstDPM = 9999;
    var worstStats;
    var worstTroops = [];
    var numberOfUnlockedUnits = 0;
    e.data[2].forEach(function (e) {
        return e ? numberOfUnlockedUnits++ : 0;
    });
    if (numberOfUnlockedUnits >= index.troopArr.length - 2) {
        numberOfUnlockedUnits = index.troopArr.length - 2;
    }
    // if (numberOfUnlockedUnits >= 4) numberOfUnlockedUnits = 4
    // let p = performance.now()
    if (!e[6]) {
        for (var i = 0; i < numberOfUnlockedUnits; i++) { // - trebuchet
            if (i === 8)
                continue;
            for (var j = 0; j < numberOfUnlockedUnits; j++) {
                if (j === 8 || (i === 6 && j === 6))
                    continue;
                for (var k = 0; k < numberOfUnlockedUnits; k++) {
                    if (((i === 6 && k === 6) || (j === 6 && k === 6)))
                        continue;
                    var plTroops = e.data[0].slice();
                    plTroops.push(i);
                    plTroops.push(j);
                    plTroops.push(k);
                    // let p = performance.now()
                    simulationHandler(plTroops);
                }
            }
        }
    }
    else {
        for (var i = 0; i < numberOfUnlockedUnits; i++) { // - trebuchet
            if (i === 8)
                continue;
            for (var j = 0; j < numberOfUnlockedUnits; j++) {
                if (j === 8 || (i === 6 && j === 6))
                    continue;
                if (j === 6)
                    continue;
                var plTroops = e.data[0].slice();
                plTroops.push(i);
                plTroops.push(j);
                simulationHandler(plTroops);
            }
        }
    }
    function simulationHandler(plTroops) {
        var game = simulate(plTroops, e.data[1].slice());
        var stats = getGameStats(game);
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
    function simulate(units1, units2) {
        // console.log('simulate')
        return new index.Game(new index.Player(0, 'left', false), new index.Player(0, 'right', false), false, false, units1, units2);
    }
    function getGameStats(game) {
        var stats = {
            playerSpending: null,
            playerDamage: null,
            playerUnitsLength: null,
            enemyDamage: null,
            enemyUnitsLength: null,
            time: null // 200 - 2000
        };
        stats.playerSpending = game.players[0].stats.spending;
        stats.playerDamage = game.players[0].stats.damageDealt;
        stats.enemyDamage = game.players[1].stats.damageDealt;
        return stats;
    }
    function damageCalc(stats) {
        // if (stats.playerSpending > e.data[4])
        //     return 0;
        return (stats.playerDamage / stats.playerSpending);
    }
    // @ts-ignore
    return ([bestTroops, worstTroops]);
}
//# sourceMappingURL=SimulationDataGetter.js.map