// node SeverHandler false (launch without http-server)
var httpServer = require("http");
var fork = require('child_process').fork;
var tcpPortUsed = require('tcp-port-used');
var express = require('express');
var app = express();
var connectedUsersThisSession = 0;
var port = 8083; // port for Server Handler, Also change in index.ts on line 1513!
var nextServerPort = 8085; // starting port for server
setInterval(function () { nextServerPort = 8085; }, 43200000); // every 12h resets
// exec('npx http-server', [], (err, output, stderr) => {
//     if (err) {
//         console.log(err)
//     }
// })
var connected = {};
setInterval(function () { connected = {}; }, 60000);
function checkConnectionForSpam(ip, increaseBy) {
    if (!connected[ip])
        connected[ip] = 0;
    connected[ip] += increaseBy;
    console.log(connected);
    return connected[ip] > 5;
}
httpServer.createServer(function (req, res) {
    console.log(req.connection.remoteAddress, 'connected. Spamming:', checkConnectionForSpam(req.headers.origin, 0));
    console.log('Page views:', ++connectedUsersThisSession);
    if (req.method == 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify("Available"));
    }
    if (req.method == 'POST') {
        if (checkConnectionForSpam(req.headers.origin, 1)) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify("Too many requests"));
            return;
        }
        var buff_1 = '';
        req.on('data', function (chunk) {
            buff_1 += chunk;
        });
        req.on('end', function () {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            setAvailablePort();
            fork('server.js', [nextServerPort - 1, true, true]); // config
            res.end(JSON.stringify("" + (nextServerPort - 1)));
        });
    }
}).listen(port);
try {
    app.use("/", express.static('.'));
    app.listen(8080, function () { return console.log("listening on port " + 8080 + "!"); });
}
catch (e) {
    console.log('Could not start http server');
}
function setAvailablePort() {
    if (nextServerPort > 65000)
        nextServerPort = 8085;
    nextServerPort++;
    tcpPortUsed.check(nextServerPort, 'localhost')
        .then(function (inUse) {
        if (!inUse) {
            return nextServerPort;
        }
        else {
            setAvailablePort();
        }
    }, function (err) {
        console.error('Error on check:', err.message);
    });
}
//# sourceMappingURL=ServerHandler.js.map