console.log('hello world')

// let ctx = document.querySelector('canvas')
// let canvasWidth = ctx.width = 1000
// let canvasHeight = ctx.height = 250
// console.log(ctx)
// let cx = ctx.getContext('2d')


class Trooper{
    health: number
    damage: number
    castingTime: number
    position: number
    color: string
    speed: number
    span: number

    constructor(health = 100, damage = 10, castingTime = 1, position = 20,
                color = 'green', speed = 1, span = 20) {
        this.health = health
        this.damage = damage
        this.castingTime = castingTime
        this.position = position
        this.color = color
        this.speed = speed
        this.span = span
    }

    attack(enemyTrooper: Array<object>): void {
        // @ts-ignore
        enemyTrooper[0].health -= this.damage
        // @ts-ignore
        if (enemyTrooper[0].health <= 0) enemyTrooper.shift()
    }
}


class Game {
    playerOneUnits: Array<object>
    playerTwoUnits: Array<object>
    // money: number
    // score: number

    constructor() {
        this.playerOneUnits = [new Trooper, new Trooper]
        this.playerTwoUnits = [new Trooper, new Trooper]
    }

    move() {

    }

    display() {

    }
}


class Player {
    money: number
    score: number
    playerUnits: Array<object>
    enemyUnits: Array<object>

    constructor(money = 0, playerUnits: Array<object>, enemyUnits: Array<object>) {
        this.money = money
        this.score = 0
        this.playerUnits = playerUnits
        this.enemyUnits = enemyUnits
    }

    addTroop(stats: object) {
        this.playerUnits.push(new Trooper())
    }

    attackEnemyTroop() {
        // @ts-ignore
        this.playerUnits[0].attack(this.enemyUnits)
    }
}



let game = new Game()
let player1 = new Player(0, game.playerOneUnits, game.playerTwoUnits)
let player2 = new Player(0, game.playerTwoUnits, game.playerOneUnits)

player1.addTroop({})

// for (let i = 0; i < 15; i++){
//     player1.attackEnemyTroop()
//     console.log(player1)
// }
// player2.addTroop({})

console.log(player1)


