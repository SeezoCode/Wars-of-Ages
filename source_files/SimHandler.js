// @ts-ignore
var fork = require('child_process').fork;
for (var i = 0; i < Number.parseInt(process.argv[2]); i++) {
    fork('SimulationDataGetter.js', [i]); // config
}
//# sourceMappingURL=SimHandler.js.map