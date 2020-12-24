console.log('hello world')

let ctx = document.querySelector('canvas')
let canvasWidth = ctx.width = 1000
let canvasHeight = ctx.height = 250
console.log(ctx)
let cx = ctx.getContext('2d')

let basicTroop = {
    health: 100, damage: 10, castingTime: 1, position: 0, price: 50, color: 'green', speed: 1, span: 20
}
let advancedTroop = {
    health: 150, damage: 15, castingTime: 1.2, position: 0, price: 75, color: 'blue', speed: 1, span: 20
}
let bestTroop = {
    health: 220, damage: 20, castingTime: 1.6, position: 0, price: 100, color: 'red', speed: 1, span: 20
}

interface trooperStatsInterface {
    health: number
    damage: number
    castingTime: number
    position: number
    color: string
    speed: number
    span: number
}

class Trooper implements trooperStatsInterface{
    health: number
    damage: number
    castingTime: number
    position: number
    color: string
    speed: number
    span: number

    constructor(stats: trooperStatsInterface, side: string) {
        this.health = stats.health
        this.damage = stats.damage
        this.castingTime = stats.castingTime
        this.color = stats.color
        this.speed = stats.speed
        this.span = stats.span
        if (side === 'left') this.position = 20
        if (side === 'right') this.position = canvasWidth - 20
    }

    attack(enemyTrooper: Array<trooperStatsInterface>): void {
        enemyTrooper[0].health -= this.damage
        if (enemyTrooper[0].health <= 0) enemyTrooper.shift()
    }
}


class Game {
    playerOneUnits: Array<trooperStatsInterface>
    playerTwoUnits: Array<trooperStatsInterface>
    // money: number
    // score: number

    constructor() {
        this.playerOneUnits = [new Trooper(bestTroop, 'left'), new Trooper(basicTroop, 'left')]
        this.playerTwoUnits = [new Trooper(basicTroop, 'right'), new Trooper(basicTroop, 'right')]
    }

    move(players: Array<playerInterface>) {
        for (let player of players) {
            if (player.side === 'left') {
                player.playerUnits.forEach(troop => {troop.position += 1})
            }
            if (player.side === 'right') {
                player.playerUnits.forEach(troop => {troop.position -= 1})
            }
        }
    }

    display() {

    }
}

interface playerInterface {
    money: number
    score: number
    side: string
    playerUnits: Array<trooperStatsInterface>
    enemyUnits: Array<trooperStatsInterface>
}

class Player implements playerInterface{
    money: number
    score: number
    side: string
    playerUnits: Array<trooperStatsInterface>
    enemyUnits: Array<trooperStatsInterface>

    constructor(money = 0, side: string, playerUnits: Array<trooperStatsInterface>, enemyUnits: Array<trooperStatsInterface>) {
        this.money = money
        this.side = side
        this.score = 0
        this.playerUnits = playerUnits
        this.enemyUnits = enemyUnits
    }

    addTroop(stats: trooperStatsInterface) {
        this.playerUnits.push(new Trooper(stats, this.side))
    }

    attackEnemyTroop() {
        // @ts-ignore
        this.playerUnits[0].attack(this.enemyUnits)
    }
}



let game = new Game()
console.log(game.playerOneUnits)
let players = [new Player(0, 'left', game.playerOneUnits, game.playerTwoUnits),
    new Player(0, 'right', game.playerTwoUnits, game.playerOneUnits)]

players[0].addTroop(bestTroop)

for (let i = 0; i < 6; i++){
    players[0].attackEnemyTroop()
    game.move(players)
    console.log(players[0])
}



