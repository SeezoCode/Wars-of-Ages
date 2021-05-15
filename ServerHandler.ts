
// node SeverHandler false (launch without http-server)

const httpServer = require("http");
const { fork } = require('child_process');
let tcpPortUsed = require('tcp-port-used');

const express = require('express');
const app = express();

let connectedUsersThisSession = 0
const port = 8083                   // port for Server Handler, Also change in index.ts on line 1513!
let nextServerPort: number = 8085   // starting port for server

setInterval(() => {nextServerPort = 8085}, 43200000) // every 12h resets

// exec('npx http-server', [], (err, output, stderr) => {
//     if (err) {
//         console.log(err)
//     }
// })


let connected = {

}

setInterval(() => {connected = {}}, 60000)

function checkConnectionForSpam(ip: string, increaseBy: number) {
    if (!connected[ip]) connected[ip] = 0
    connected[ip] += increaseBy
    console.log(connected)
    return connected[ip] > 5;
}


httpServer.createServer((req, res) => {
    console.log(req.connection.remoteAddress, 'connected. Spamming:', checkConnectionForSpam(req.headers.origin, 0))
    console.log('Page views:', ++connectedUsersThisSession)

    if (req.method == 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'})
        res.end(JSON.stringify(`Available`));
    }

    if (req.method == 'POST') {
        if (checkConnectionForSpam(req.headers.origin, 1)) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify(`Too many requests`));
            return
        }
        let buff = ''
        req.on('data', function (chunk) {
            buff += chunk;
        })
        req.on('end', function () {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            setAvailablePort()
            fork('server.js', [nextServerPort - 1, true, true]) // config
            res.end(JSON.stringify(`${nextServerPort - 1}`));

        })
    }
}).listen(port);

try {
    app.use("/", express.static('.'));
    app.listen(8080, () => console.log(`listening on port ${8080}!`))
}
catch (e) {
    console.log('Could not start http server')
}

function setAvailablePort() {
    if (nextServerPort > 65000) nextServerPort = 8085
    nextServerPort++
    tcpPortUsed.check(nextServerPort, 'localhost')
        .then(function(inUse) {
            if (!inUse) {
                return nextServerPort
            }
            else {
                setAvailablePort()
            }
        }, function(err) {
            console.error('Error on check:', err.message);
        });
}