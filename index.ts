console.log('hello world')

let ctx = document.querySelector('canvas')
let canvasWidth = ctx.width = 1000
let canvasHeight = ctx.height = 250
console.log(ctx)
let cx = ctx.getContext('2d')

let basicTroop = {
    health: 100, damage: 10, attackSpeed: 60, castingTime: 1, position: 0, price: 50, color: 'green', speed: 1, span: 20
}
let advancedTroop = {
    health: 150, damage: 15, attackSpeed: 60, castingTime: 1.2, position: 0, price: 75, color: 'blue', speed: 1, span: 20
}
let bestTroop = {
    health: 220, damage: 20, attackSpeed: 90, castingTime: 1.6, position: 0, price: 100, color: 'red', speed: 1, span: 20
}
let baseStats = {
    health: 5000, position: 0, color: 'royalblue', span: 45
}

interface trooperStatsInterface {
    health: number
    damage: number
    castingTime: number
    position: number
    color: string
    speed: number
    span: number
    attack?: (enemyTroopers: Array<trooperStatsInterface>) => void
    isInFront?: (playerUnits: Array<trooperStatsInterface>, index: number) => boolean
    draw?: () => void
}

class Trooper implements trooperStatsInterface{
    health: number
    damage: number
    castingTime: number
    position: number
    color: string
    speed: number
    span: number
    side: string

    constructor(stats: trooperStatsInterface, side: string) {
        this.health = stats.health
        this.damage = stats.damage
        this.castingTime = stats.castingTime
        this.color = stats.color
        this.speed = stats.speed
        this.span = stats.span
        this.side = side
        if (side === 'left') this.position = 20
        if (side === 'right') this.position = canvasWidth - 20
    }

    attack(enemyTroopers: Array<trooperStatsInterface>): void {
        console.log('attacked enemy: ', enemyTroopers)
        enemyTroopers[0].health -= this.damage
        // if (enemyTroopers[0].health <= 0) {
        //     console.log('enemy', enemyTroopers[0], 'died')
        //     enemyTroopers.shift()
        // }
    }

    isInFront(playerUnits: Array<trooperStatsInterface>, index: number): boolean {
        // takes an array and queue number to find out if one in front of him is '11' near
        // maps if troop has enough space around itself
        // has to check units only in front of him
        // checks players own, then enemy's, then returns false
        if (index === 0) return false
        if (playerUnits.length === 0) return false
        if (this.side === 'left') {
            for (let i = index - 1; i >= 0; i--) {
                if (this.position < playerUnits[i].position && this.position + this.span / 2 + 12 > playerUnits[i].position) {
                    return true
                }
            }
        }
        if (this.side === 'right') {
            for (let i = index - 1; i >= 0; i--) {
                if (this.position > playerUnits[i].position && this.position - this.span / 2 - 12 < playerUnits[i].position) {
                    return true
                }
            }
        }
        return false
    }

    draw() {
        cx.fillStyle = this.color
        cx.fillRect(this.position - this.span / 2, 35, this.span, 35)
    }
}


interface baseInterface {
    health: number
    position: number
    color: string
    span: number
    side?: string
    draw?: () => void
}

class Base implements baseInterface {
    health: number
    position: number
    color: string
    span: number

    constructor(stats: baseInterface, side: string) {
        this.health = stats.health
        this.position = stats.position
        this.color = stats.color
        this.span = stats.span
        if (side === 'left') this.position = 5
        if (side === 'right') this.position = canvasWidth - 80
    }

    attack() {}
    isInFront() {}
    draw(): void {
        cx.fillStyle = this.color
        cx.fillRect(this.position - this.span / 2, 75, this.span, 75)
    }
}




class Game {
    playerOneUnits: Array<trooperStatsInterface>
    playerTwoUnits: Array<trooperStatsInterface>
    time: number = 0
    // money: number
    // score: number

    constructor() {
        this.playerOneUnits = [new Trooper(bestTroop, 'left'), new Trooper(basicTroop, 'left')]
        this.playerTwoUnits = [new Trooper(advancedTroop, 'right'), new Trooper(bestTroop, 'right')]
    }

    move(players: Array<playerInterface>) {
        this.time += 1
        console.log(this.time, '---Move---')
        this.movement()

        if (players[0].isEnemyInFront()) console.log('-------enemy in front of player 1', game.playerOneUnits[0].position, game.playerTwoUnits[0].position)
        if (players[1].isEnemyInFront()) console.log('-------enemy in front of player 2', game.playerTwoUnits[0].position, game.playerOneUnits[0].position)

        if (players[0].isEnemyInFront()) players[0].attackEnemyTroop()
        if (players[1].isEnemyInFront()) players[1].attackEnemyTroop()

        players[0].checkForDeath()
        players[1].checkForDeath()

        this.display()
    }

    movement(): void {
        for (let player of players) {
            if (player.playerUnits.length === 0) continue
            if (player.side === 'left') {
                player.playerUnits.forEach((troop, i) => {
                    if (!troop.isInFront(player.playerUnits, i) && !troop.isInFront(this.playerTwoUnits, 1)) {
                        console.log('moved to right', troop.position)
                        troop.position += 1
                    }
                    else console.log('no movement right', troop.position)
                })
            }
            if (player.side === 'right') {
                player.playerUnits.forEach((troop, i) => {
                    if (!troop.isInFront(player.playerUnits, i) && !troop.isInFront(this.playerOneUnits, 1)) {
                        console.log('moved to left', troop.position)
                        troop.position -= 1
                    }
                    else console.log('no movement left', troop.position)
                })
            }
        }
    }

    // attack(players: Array<playerInterface>) {
    //     console.log(this.time, 'Attack')
    // }

    private timeAttack(player: playerInterface) {

    }

    display() {
        cx.clearRect(0, 0, canvasWidth, canvasHeight)
        for (let unit of this.playerOneUnits) {
            unit.draw()
        }
        for (let unit of this.playerTwoUnits) {
            unit.draw()
        }
    }

    animation(): void {
        requestAnimationFrame(hold)
        function hold(): void {
            game.move(players)
            game.display()
            requestAnimationFrame(hold)
        }
    }
}

interface playerInterface {
    money: number
    score: number
    side: string
    playerUnits: Array<trooperStatsInterface>
    enemyUnits: Array<trooperStatsInterface>
    isEnemyInFront: () => boolean
    attackEnemyTroop: () => void
    addTroop: (stats: trooperStatsInterface) => void
    checkForDeath: () => void

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

    addTroop(stats: trooperStatsInterface): void {
        this.playerUnits.push(new Trooper(stats, this.side))
    }

    attackEnemyTroop(): void {
        this.playerUnits[0].attack(this.enemyUnits)
    }

    isEnemyInFront(): boolean {
        if (this.playerUnits.length === 0) return false
        return this.playerUnits[0].isInFront(this.enemyUnits, 1)
    }

    checkForDeath(): void {
        if (this.playerUnits[0].health <= 0) {
            console.log(this.side, 'died', this.playerUnits[0])
            this.playerUnits.shift()
        }
    }
}



let game = new Game()
console.log(game.playerOneUnits)
let players = [new Player(0, 'left', game.playerOneUnits, game.playerTwoUnits),
    new Player(0, 'right', game.playerTwoUnits, game.playerOneUnits)]

// players[0].addTroop(bestTroop)

for (let i = 0; i < 464; i++){
    // players[0].attackEnemyTroop()
    // players[1].attackEnemyTroop()
    game.move(players)
    // if (players[0].isEnemyInFront()) console.log('-------enemy in front of me', game.playerOneUnits[0].position, game.playerTwoUnits[0].position)
    console.log(players[0])
    game.display()
}
// game.animation()


