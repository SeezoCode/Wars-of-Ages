var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
if (!process.argv[2])
    process.argv[2] = "8085";
if (!process.argv[4])
    process.argv[4] = "true"; // check for overdraft, doesn't include server-side reasearch and other things
if (!process.argv[5])
    process.argv[5] = "true"; // autopause
var checkForAvailMoney = process.argv[4] === 'true';
var pause = process.argv[5] === 'true';
var initialMoney = 55;
console.log('\n---', 'port: ', process.argv[2], '\n    ' +
    'check for money:', process.argv[4], '\n    ' +
    'automatic game pause:', process.argv[5]);
var index = require('./index');
var ServerSideGame = /** @class */ (function (_super) {
    __extends(ServerSideGame, _super);
    function ServerSideGame(player1, player2, visualize, DOMAccess, playerUnits1, playerUnits2, fps) {
        if (visualize === void 0) { visualize = false; }
        if (DOMAccess === void 0) { DOMAccess = false; }
        if (playerUnits1 === void 0) { playerUnits1 = []; }
        if (playerUnits2 === void 0) { playerUnits2 = []; }
        if (fps === void 0) { fps = 60; }
        var _this = _super.call(this, player1, player2, visualize, DOMAccess, playerUnits1, playerUnits2) || this;
        _this.wasPaused = false;
        _this.leftID = '';
        _this.rightID = '';
        _this.players[0].enemyBase = _this.playerTwoBase;
        _this.players[1].enemyBase = _this.playerOneBase;
        _this.players[0].money = initialMoney;
        _this.players[1].money = initialMoney;
        _this.players[0].unlockedUnits = [true, false, false, false, false, false, false, false, false, false];
        _this.players[1].unlockedUnits = [true, false, false, false, false, false, false, false, false, false];
        _this.fps = fps;
        _this.connectedUsersCount = 0;
        return _this;
    }
    ServerSideGame.prototype.boomerDoomer = function (position) {
        io.emit('boomer', position);
    };
    ServerSideGame.prototype.animation = function () {
        var _this = this;
        setInterval(function () {
            if (_this.connectedUsersCount === 0) {
                console.log("Port", process.argv[2], ": Game was forcibly closed due to inactivity");
                process.exit();
            }
        }, 60000);
        var interval = setInterval(function () {
            if (pause) {
                if (!_this.leftID || !_this.rightID) {
                    io.emit('message', 'Waiting for opponent to join, code: ' + process.argv[2]);
                    _this.wasPaused = true;
                    return;
                }
                else if (_this.wasPaused) {
                    io.emit('message', '');
                    _this.wasPaused = false;
                }
            }
            if (_this.players[0].enemyBase.health <= 0) {
                io.emit('win', 'LEFT HAS WON');
                setTimeout(function () {
                    clearInterval(interval);
                    process.exit();
                }, 3000);
            }
            if (_this.players[1].enemyBase.health <= 0) {
                io.emit('win', 'RIGHT HAS WON');
                setTimeout(function () {
                    clearInterval(interval);
                    process.exit();
                }, 3000);
            }
            io.emit('game', game.playerOneBase, game.playerTwoBase, game.playerOneUnits, game.playerTwoUnits, game.players[0].money, game.players[1].money, game.time);
            if (_this.atomicDoomPending)
                io.emit('atomic', true);
            _this.move();
            // console.log('move')
            // console.log(this.playerOneUnits.length)
        }, 1000 / 60);
    };
    return ServerSideGame;
}(index.Game));
var http = require('http').createServer();
var io = require('socket.io')(http, {
    cors: { origin: "*" }
});
var game = new ServerSideGame(new index.Player(55, 'left', checkForAvailMoney), new index.Player(55, 'right', checkForAvailMoney), false, false, [], [], 60);
io.on('connection', function (socket) {
    if (game.connectedUsersCount > 20) {
        socket.emit('message', 'Connections Full');
        return;
    }
    game.connectedUsersCount++;
    console.log("Port", process.argv[2], ': A user has connected. Connected users: ' + (game.connectedUsersCount));
    if (!game.leftID) {
        game.leftID = socket.id;
        socket.emit('side', 'left', checkForAvailMoney, game.players[0].unlockedUnits);
    }
    else if (!game.rightID) {
        game.rightID = socket.id;
        socket.emit('side', 'right', checkForAvailMoney, game.players[1].unlockedUnits);
    }
    else {
        console.log("Port", process.argv[2], ': A spectator has connected. Connected users: ' + (game.connectedUsersCount));
        socket.emit('side', 'Server Full');
    }
    socket.on('AddTroop', function (side, index) {
        if (socket.id === game.leftID || socket.id === game.rightID) { // so that playing only can send troops
            if (index === 10 && game.atomicDoomPending)
                return;
            if (side === 'left' && game.players[0].unlockedUnits[index])
                game.players[0].addTroop(index);
            if (side === 'right' && game.players[1].unlockedUnits[index])
                game.players[1].addTroop(index);
        }
    });
    socket.on('AddMoney', function (side, amount) {
        if (socket.id === game.leftID || socket.id === game.rightID) {
            if (side === 'left')
                game.players[0].addFunds(amount);
            if (side === 'right')
                game.players[1].addFunds(amount);
        }
    });
    socket.on('disconnect', function () {
        game.connectedUsersCount--;
        if (socket.id === game.leftID) {
            game.leftID = '';
            // console.log('left disconnect')
        }
        else if (socket.id === game.rightID) {
            game.rightID = '';
            // console.log('right disconnect')
        }
        else {
            console.log("Port", process.argv[2], ': Spectator has disconnected. Connected users:', game.connectedUsersCount);
            return;
        }
        console.log("Port", process.argv[2], ': A user has disconnected. Connected users:', game.connectedUsersCount);
    });
    socket.on('unlockTroop', function (side, i) {
        if (socket.id === game.leftID || socket.id === game.rightID) {
            if (game.players[side === 'left' ? 0 : 1].money >= index.troopArr[i].researchPrice) {
                game.players[side === 'left' ? 0 : 1].unlockedUnits[i] = true;
                game.players[side === 'left' ? 0 : 1].money -= index.troopArr[i].researchPrice;
            }
        }
    });
    socket.on('multiplier', function (side) {
        if (socket.id === game.leftID || socket.id === game.rightID) {
            if (!checkForAvailMoney || game.players[side === 'left' ? 0 : 1].money >= 1500) {
                game.players[side === 'left' ? 0 : 1].multiplier *= 1.2;
                game.players[side === 'left' ? 0 : 1].money -= 1500;
            }
            emitMultiplayer();
        }
    });
});
function emitMultiplayer() {
    io.emit('multiplier', game.players[0].multiplier, game.players[1].multiplier);
}
var os = require('os');
var ip;
var ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function (dev) {
    ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4') {
            ip = ('http://' + details.address + ':' + process.argv[2]);
        }
    });
});
http.listen(process.argv[2], function () { return console.log('listening on ' + ip + '\n'); });
//# sourceMappingURL=server.js.map