// import * as index from './index'
let index = require('./index')

class ServerSidePlayer extends index.Player {
    constructor(money = 55, side: string, checkForAvailMoney: boolean) {
        super(money, side, checkForAvailMoney)
    }
}

class ServerSideGame extends index.Game {
    fps: number
    leftAssigned: boolean = false
    rightAssigned: boolean = false
    constructor(player1: playerInterface, player2: playerInterface, visualize: boolean = false, DOMAccess: boolean = false,
                playerUnits1: Array<number> = [], playerUnits2: Array<number> = [], fps: number = 60) {
        super(player1, player2, visualize, DOMAccess, playerUnits1, playerUnits2);
        this.players[0].unlockedUnits = [true, true, true, true, true, true, true, true, true, true]
        this.players[1].unlockedUnits = [true, true, true, true, true, true, true, true, true, true]
        this.fps = fps
    }

    animation() {
        setInterval(() => {
            this.move()
            // console.log('move')
            // console.log(this.playerOneUnits.length)
        }, 1000/60)
    }

}

let game = new ServerSideGame(new index.Player(55, 'left', false),
    new index.Player(55, 'right', false), false, false, [1,1,1,1], [0,0,0], 60)


const http = require('http').createServer();

const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

let sideToFill = 'left'
let connectedUsersCount = 0
io.on('connection', (socket) => {
    console.log('a user connected');

    if (connectedUsersCount >= 2) return
    socket.emit('side', sideToFill)
    connectedUsersCount++


    setInterval(() => {
        socket.emit('game', game.playerOneBase, game.playerTwoBase, game.playerOneUnits, game.playerTwoUnits, game.players[0].money, game.players[1].money, game.time);
        socket.emit('getSide')
        // console.log(connectedUsersCount)
    }, 1000/60)

    socket.on('getSide', side => {
        // console.log('getSide: ', side)
        side === 'left' ? sideToFill = 'right' : sideToFill = 'left'

    })

    socket.on('leftAddTroop', index => {
        console.log('leftAddTroop')
        game.players[0].addTroop(index)
    })
    socket.on('rightAddTroop', index => {
        console.log('rightAddTroop')
        game.players[1].addTroop(index)
    })
    socket.on('leftAddMoney', amount => {
        game.players[0].addFunds(amount)
    })
    socket.on('rightAddMoney', amount => {
        game.players[1].addFunds(amount)
    })
    socket.on('disconnect', () => {
        console.log('disconnect')
        connectedUsersCount--
    })
});

http.listen(8080, () => console.log('listening on http://localhost:8080') );
