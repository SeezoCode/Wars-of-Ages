
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

        this.players[0].money = 50
        this.players[1].money = 50

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
                    io.emit('message', 'Waiting for opponent to join, code: ' + process.argv[2])
                    this.wasPaused = true
                    return
                } else if (this.wasPaused) {
                    io.emit('message', '')
                    this.wasPaused = false
                }
            }
            if (this.players[0].enemyBase.health <= 0) {
                io.emit('win', 'LEFT HAS WON')
                setTimeout(() => {
                    clearInterval(interval)
                    process.exit()
                }, 3000)
            }
            if (this.players[1].enemyBase.health <= 0) {
                io.emit('win', 'RIGHT HAS WON')
                setTimeout(() => {
                    clearInterval(interval)
                    process.exit()
                }, 3000)
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
        socket.emit('side', game.sideToFill, checkForAvailMoney,
            game.sideToFill === 'left' ? game.players[0].unlockedUnits : game.players[1].unlockedUnits)
    }
    if (game.connectedUsersCount >= 2) {
        return
        // console.log(`Port`, process.argv[2], `: A spectator has connected. Connected users: ` + (game.connectedUsersCount))
        // socket.emit('side', 'Server Full')
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
        if (index === 10 && game.atomicDoomPending) return
        if (side === 'left' && game.players[0].unlockedUnits[index]) game.players[0].addTroop(index)
        if (side === 'right' && game.players[1].unlockedUnits[index]) game.players[1].addTroop(index)
    })
    socket.on('AddMoney', (side, amount) => {
        if (side === 'left') game.players[0].addFunds(amount)
        if (side === 'right') game.players[1].addFunds(amount)
    })
    socket.on('disconnect', () => {
        // if (this.spectator) {
        //     console.log(`Port`, process.argv[2], `: Spectator has disconnected. Connected users:`, game.connectedUsersCount - 1)
        //     return
        // }
        game.connectedUsersCount--
        console.log(`Port`, process.argv[2], `: A user has disconnected. Connected users:`, game.connectedUsersCount)
    })
    socket.on('unlockTroop', (side, i) => {
        if (game.players[side === 'left' ? 0 : 1].money >= index.troopArr[i].researchPrice) {
            game.players[side === 'left' ? 0 : 1].unlockedUnits[i] = true
            game.players[side === 'left' ? 0 : 1].money -= index.troopArr[i].researchPrice
        }
    })
    socket.on('multiplier', side => {
        if (!checkForAvailMoney || game.players[side === 'left' ? 0 : 1].money >= 1500) {
            game.players[side === 'left' ? 0 : 1].multiplier *= 1.2
            game.players[side === 'left' ? 0 : 1].money -= 1500
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