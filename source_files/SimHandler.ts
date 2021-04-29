// @ts-ignore
const { fork } = require('child_process');

for (let i = 0; i < Number.parseInt(process.argv[2]); i++) {
    fork('SimulationDataGetter.js', [i]) // config
}
