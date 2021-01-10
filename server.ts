
if (!process.argv[2]) process.argv[2] = `8080`
if (!process.argv[4]) process.argv[4] = `true`
if (!process.argv[5]) process.argv[5] = `true`
let checkForAvailMoney = process.argv[4] === 'true'
let pause = process.argv[5] === 'true'

console.log('\n---', 'port: ', process.argv[2], '\n    ' +
    'check for money:', process.argv[4], '\n    ' +
    'automatic game pause:', process.argv[5])
let index = require('./index')

class ServerSideGame extends index.Game {
    fps: number
    sideToFill: string
    connectedUsersCount: number
    atomicDoomPending: boolean
    wasPaused: boolean = false

    constructor(player1: playerInterface, player2: playerInterface, visualize: boolean = false, DOMAccess: boolean = false,
                playerUnits1: Array<number> = [], playerUnits2: Array<number> = [], fps: number = 60) {
        super(player1, player2, visualize, DOMAccess, playerUnits1, playerUnits2);
        this.players[0].enemyBase = this.playerTwoBase
        this.players[1].enemyBase = this.playerOneBase
        this.players[0].unlockedUnits = [true, false, false, false, false, false, false, false, false, false]
        this.players[1].unlockedUnits = [true, false, false, false, false, false, false, false, false, false]
        this.fps = fps
        this.sideToFill = 'left'
        this.connectedUsersCount = 0
    }

    animation() {
        setInterval(() => {
            if (this.connectedUsersCount === 0) {
                console.log(`Port`, process.argv[2], `: Game was forcibly closed due to inactivity`)
                process.exit()
            }
        }, 60000)
        let interval = setInterval(() => {
            if (pause) {
                if (this.connectedUsersCount < 2) {
                    io.emit('message', 'Pause')
                    this.wasPaused = true
                    return
                } else if (this.wasPaused) {
                    io.emit('message', '')
                    this.wasPaused = false
                }
            }
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


const http = require('http').createServer();

const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

let game = new ServerSideGame(new index.Player(55, 'left', checkForAvailMoney),
    new index.Player(55, 'right', checkForAvailMoney), false, false,
    [], [], 60)

io.on('connection', (socket) => {
    console.log(`Port`, process.argv[2], `: A user has connected. Connected users: ` + (game.connectedUsersCount + 1));

    if (game.connectedUsersCount < 2) {
        socket.emit('side', game.sideToFill, checkForAvailMoney)
    }
    if (game.connectedUsersCount >= 2) {
        socket.emit('side', 'Server Full')
    }
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
        game.connectedUsersCount--
        console.log(`Port`, process.argv[2], `: A user has disconnected. Connected users:`, game.connectedUsersCount)
    })
    socket.on('multiplier', side => {
        if (side === 'left') {
            if (!checkForAvailMoney || game.players[0].money >= 2500) {
                game.players[0].multiplier *= 1.2
                game.players[0].money -= 2500
            }
        }
        if (side === 'right') {
            if (!checkForAvailMoney || game.players[0].money >= 2500)  {
                game.players[1].multiplier *= 1.2
                game.players[1].money -= 2500
            }
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
http.listen(process.argv[2], () => console.log('listening on ' + ip + '\n'));