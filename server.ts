
if (!process.argv[2]) process.argv[2] = `8080`
if (!process.argv[4]) process.argv[4] = `false`
console.log('---', process.argv[4])
let checkForAvailMoney = process.argv[4] === 'true'

let index = require('./index')


class ServerSideGame extends index.Game {
    fps: number
    sideToFill: string
    connectedUsersCount: number
    atomicDoomPending: boolean
    constructor(player1: playerInterface, player2: playerInterface, visualize: boolean = false, DOMAccess: boolean = false,
                playerUnits1: Array<number> = [], playerUnits2: Array<number> = [], fps: number = 60) {
        super(player1, player2, visualize, DOMAccess, playerUnits1, playerUnits2);
        this.players[0].enemyBase = this.playerTwoBase
        this.players[1].enemyBase = this.playerOneBase
        this.players[0].unlockedUnits = [true, true, true, true, true, true, true, true, true, true]
        this.players[1].unlockedUnits = [true, true, true, true, true, true, true, true, true, true]
        this.fps = fps
        this.sideToFill = 'left'
        this.connectedUsersCount = 0
    }

    animation() {
        let interval = setInterval(() => {
            if (this.players[0].enemyBase.health <= 0) {
                io.emit('win', 'LEFT HAS WON')
                clearInterval(interval)
                process.exit()
            }
            if (this.players[1].enemyBase.health <= 0) {
                io.emit('win', 'RIGHT HAS WON')
                clearInterval(interval)
                process.exit()
            }

            if (this.atomicDoomPending) io.emit('atomic', true)

            this.move()
            // console.log('move')
            // console.log(this.playerOneUnits.length)
        }, 1000/60)
    }

}

// const httpServer = require("http");
// const port = 3000
// const Server = httpServer.createServer((req, res) => {
//
//     if (req.method == 'POST') {
//         let buff = '' //buffer variable to save response
//         req.on('data', function (chunk) {
//             buff += chunk; //concat each newline to the buff variable
//         })
//         req.on('end', function () {
//             console.log(buff); //print out variable content
//             res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
//             res.end("Body accepted");
//         })
//     }
// }).listen(port);

const http = require('http').createServer();

const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

let game = new ServerSideGame(new index.Player(55, 'left', checkForAvailMoney),
    new index.Player(55, 'right', checkForAvailMoney), false, false,
    [], [], 60)

io.on('connection', (socket) => {
    console.log('a user has connected, connected users: ' + (game.connectedUsersCount + 1));

    if (game.connectedUsersCount < 2) socket.emit('side', game.sideToFill, checkForAvailMoney)
    if (game.connectedUsersCount >= 2) socket.emit('side', 'Server Full')

    game.connectedUsersCount++

    setInterval(() => {
        socket.emit('game', game.playerOneBase, game.playerTwoBase, game.playerOneUnits, game.playerTwoUnits,
            game.players[0].money, game.players[1].money, game.time);
        socket.emit('getSide')
        // console.log(connectedUsersCount)
    }, 1000/60)

    socket.on('getSide', side => {
        // console.log('getSide: ', side)
        side === 'left' ? game.sideToFill = 'right' : game.sideToFill = 'left'
    })
    socket.on('AddTroop', (side, index) => {
        if (side === 'left') game.players[0].addTroop(index)
        if (side === 'right') game.players[1].addTroop(index)
    })
    socket.on('AddMoney', (side, amount) => {
        if (side === 'left') game.players[0].addFunds(amount)
        if (side === 'right') game.players[1].addFunds(amount)
    })
    socket.on('disconnect', () => {
        console.log('disconnect')
        game.connectedUsersCount--
    })
    socket.on('multiplier', side => {
        if (side === 'left') {
            if (!checkForAvailMoney || game.players[0].money >= 2000) game.players[0].multiplier *= 1.2
        }
        if (side === 'right') {
            if (!checkForAvailMoney || game.players[0].money >= 2000)  game.players[1].multiplier *= 1.2
        }
        emitMultiplayer()
    })
});
function emitMultiplayer() {
    io.emit('multiplier', game.players[0].multiplier, game.players[1].multiplier)
}
let os = require('os')
let ip
let ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function (dev) {
    ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4') {
             ip = ('http://' + details.address + ':' + process.argv[2])

        }
    });
});
http.listen(process.argv[2], () => console.log('listening on ' + ip ));