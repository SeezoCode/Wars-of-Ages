let ctx = document.querySelector('canvas')
let canvasWidth = ctx.width = 600
let canvasHeight = ctx.height = 250
console.log(ctx)
let cx = ctx.getContext('2d')

let troopArr = [
{
    name: 'Basic Troop', health: 20, damage: 4.5, attackSpeed: 40, castingTime: 1, position: 0, price: 5, color: 'green', speed: 1, span: 20, range: 0, researchPrice: 0
},
{
    name: 'Advanced Troop', health: 20, damage: 3, attackSpeed: 50, castingTime: 1.2, position: 0, price: 10, color: 'blue', speed: 1, span: 20, range: 60, researchPrice: 100
},
{
    name: 'Best Troop', health: 30, damage: 10, attackSpeed: 80, castingTime: 1.6, position: 0, price: 12, color: 'red', speed: 1, span: 20, range: 0, researchPrice: 200
}]

let baseStats = {
    health: 800, position: 0, color: 'royalblue', span: 45
}

interface trooperStatsInterface {
    range: number;
    health: number
    damage: number
    castingTime: number
    position: number
    color: string
    speed: number
    span: number
    attackSpeed: number
    name?: string
    researchPrice?: number
    price?: number
    side?: string
    targetTime?: number
    maxHealth?: number
    attack?: (enemyTroopers: Array<trooperStatsInterface>) => void
    isInFront?: (playerUnits: Array<trooperStatsInterface>, index: number) => boolean
    draw?: () => void
    timeAttack?: (time: number, enemyTroopers: Array<trooperStatsInterface>) => void
    timeAttackBase?: (time: number, base: baseInterface) => void
    drawAttack?: (time: number) => void
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
    range: number
    price: number
    attackSpeed: number
    targetTime: number
    maxHealth: number

    constructor(stats: trooperStatsInterface, side: string) {
        this.health = stats.health
        this.damage = stats.damage
        this.castingTime = stats.castingTime
        this.color = stats.color
        this.speed = stats.speed
        this.span = stats.span
        this.side = side
        this.attackSpeed = stats.attackSpeed
        this.targetTime = null
        this.maxHealth = stats.health
        this.range = stats.range
        this.price = stats.price
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

    timeAttack(time: number, enemyTroopers: Array<trooperStatsInterface>): void {
        if (this.targetTime === null) this.targetTime = time + this.attackSpeed
        else if (time === this.targetTime) {
            this.attack(enemyTroopers)
            console.log('Attack !!!!!!!!')
            this.targetTime = null
        }
    }

    isInFront(playerUnits: Array<trooperStatsInterface>, index: number): boolean {
        // takes an array and queue number to find out if one in front of him is '11' near
        if (index === 0) return false
        if (playerUnits.length === 0) return false
        if (this.side === 'left') {
            for (let i = index - 1; i >= 0; i--) {
                if (this.position < playerUnits[i].position &&
                    this.position + this.span / 2 + 12 > playerUnits[i].position) {
                    return true
                }
            }
        }
        if (this.side === 'right') {
            for (let i = index - 1; i >= 0; i--) {
                if (this.position > playerUnits[i].position &&
                    this.position - this.span / 2 - 12 < playerUnits[i].position) {
                    return true
                }
            }
        }
        return false
    }

    timeAttackBase(time: number, base: baseInterface): void {
        if (this.targetTime === null) this.targetTime = time + this.attackSpeed
        else if (time >= this.targetTime) {
            base.health -= this.damage
            console.log('Attack Base !!!!!!!!')
            this.targetTime = null
        }
    }

    draw() {
        cx.fillStyle = this.color
        cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35)
        this.drawHealth()
    }

    private drawHealth() {
        cx.fillStyle = 'lightgray'
        cx.fillRect(this.position - this.span / 2, canvasHeight - 75, this.span, 5)
        cx.fillStyle = 'red'
        cx.fillRect(this.position - this.span / 2, canvasHeight - 75, this.health / this.maxHealth * this.span, 5)
    }

    drawAttack(time: number): void {
        if (this.targetTime !== null) {
            cx.fillStyle = `rgb(${255 - (1 / (this.targetTime - time)) * 255}, ${255 - (1 / (this.targetTime - time)) * 255}, 255)`
            cx.fillRect(this.position - this.span / 2, canvasHeight - 85, this.span, 5)
        }
    }
}


interface baseInterface {
    health: number
    position: number
    color: string
    span: number
    baseExposed?: boolean
    side?: string
    draw?: () => void
}

class Base implements baseInterface {
    health: number
    position: number
    color: string
    span: number
    baseExposed: boolean = false
    maxHealth: number

    constructor(stats: baseInterface, side: string) {
        this.health = stats.health
        this.position = stats.position
        this.color = stats.color
        this.span = stats.span
        this.maxHealth = stats.health
        if (side === 'left') this.position = 5
        if (side === 'right') this.position = canvasWidth - 50
    }

    draw(): void {
        cx.fillStyle = this.color
        cx.fillRect(this.position, canvasHeight - 105, this.span, 75)
        this.drawHealth()
    }

    private drawHealth() {
        cx.fillStyle = 'lightgray'
        cx.fillRect(this.position, canvasHeight - 115, this.span, 5)
        cx.fillStyle = 'red'
        cx.fillRect(this.position, canvasHeight - 115, this.health / this.maxHealth * this.span, 5)
    }
}




class Game {
    playerOneUnits: Array<trooperStatsInterface>
    playerTwoUnits: Array<trooperStatsInterface>
    playerOneBase: baseInterface
    playerTwoBase: baseInterface
    players: Array<playerInterface>
    time: number = 0
    // money: number
    // score: number

    constructor() {
        this.playerOneUnits = []
        this.playerTwoUnits = []
        //new Trooper(advancedTroop, 'right'), new Trooper(bestTroop, 'right')
        this.playerOneBase = new Base(baseStats, 'left')
        this.playerTwoBase = new Base(baseStats, 'right')

        this.players = [new Player(50, 'left', this.playerOneUnits, this.playerTwoUnits),
            new Player(50, 'right', this.playerTwoUnits, this.playerOneUnits)]
    }

    move() {
        this.time += 1
        // console.log(this.time, '---Move---')
        this.movement()

        // if (this.players[0].isEnemyInFront()) console.log('-------enemy in front of player 1',
        //     game.playerOneUnits[0].position, game.playerTwoUnits[0].position)
        // if (this.players[1].isEnemyInFront()) console.log('-------enemy in front of player 2',
        //     game.playerTwoUnits[0].position, game.playerOneUnits[0].position)

        if (this.players[0].isEnemyInFront()) this.players[0].attackEnemyTroop(this.time)
        if (this.players[1].isEnemyInFront()) this.players[1].attackEnemyTroop(this.time)

        if (!this.players[0].checkForTroops()) {this.players[1].attackBase(this.time, this.playerOneBase)}
        if (!this.players[1].checkForTroops()) {this.players[0].attackBase(this.time, this.playerTwoBase)}

        if (this.players[0].checkForTroops()) this.players[1].handleRangeAttack(this.time)
        if (this.players[1].checkForTroops()) this.players[0].handleRangeAttack(this.time)

        this.players[0].checkForDeath(this.players[1])
        this.players[1].checkForDeath(this.players[0])

        this.display()
    }

    movement(): void {
        for (let player of this.players) {
            if (player.side === 'left') {
                player.playerUnits.forEach((troop, i) => {
                    if (!troop.isInFront(player.playerUnits, i) && !troop.isInFront(this.playerTwoUnits, 1) &&
                        troop.position < canvasWidth - baseStats.span - 10) {
                        // console.log('moved to right', troop.position)
                        troop.position += 1
                    }
                    // else console.log('no movement to right', troop.position)
                })
            }
            if (player.side === 'right') {
                player.playerUnits.forEach((troop, i) => {
                    if (!troop.isInFront(player.playerUnits, i) && !troop.isInFront(this.playerOneUnits, 1) &&
                        troop.position > baseStats.span + 10) {
                        // console.log('moved to left', troop.position)
                        troop.position -= 1
                    }
                    // else console.log('no movement to left', troop.position)
                })
            }
        }
    }

    displayMoney() {
        document.getElementById('pLeft').innerHTML = `money: ${this.players[0].money}`
        document.getElementById('pRight').innerHTML = `money: ${this.players[1].money}`
    }

    display() {
        cx.clearRect(0, 0, canvasWidth, canvasHeight)
        this.playerOneBase.draw()
        this.playerTwoBase.draw()
        for (let unit of this.playerOneUnits) {
            unit.draw()
            unit.drawAttack(this.time)
        }
        for (let unit of this.playerTwoUnits) {
            unit.draw()
            unit.drawAttack(this.time)
        }
    }

    animation(): void {
        requestAnimationFrame(hold)
        function hold(): void {
            game.move()
            game.display()
            requestAnimationFrame(hold)
        }
    }
}






interface playerInterface {
    money: number
    score: number
    side: string
    exp: number
    unlockedUnits: Array<boolean>
    playerUnits: Array<trooperStatsInterface>
    enemyUnits: Array<trooperStatsInterface>
    isEnemyInFront: () => boolean
    attackEnemyTroop: (time: number) => void
    addTroop: (stats: trooperStatsInterface) => void
    checkForDeath: (enemy: playerInterface) => void
    handleRangeAttack: (time: number) => void
    checkForTroops: () => boolean
    attackBase: (time: number, enemyBase: baseInterface) => void
    addFunds: (amount: number) => void
    // unlockUnits: () => void
    // addTroopTimed: (stats: trooperStatsInterface) => void

}

class Player implements playerInterface{
    money: number
    score: number
    side: string
    exp: number
    unlockedUnits: Array<boolean>
    playerUnits: Array<trooperStatsInterface>
    enemyUnits: Array<trooperStatsInterface>

    constructor(money = 0, side: string, playerUnits: Array<trooperStatsInterface>, enemyUnits: Array<trooperStatsInterface>) {
        this.money = money
        this.side = side
        this.score = 0
        this.exp = 0
        this.playerUnits = playerUnits
        this.enemyUnits = enemyUnits
        this.unlockedUnits = [true, false, false]
        this.unlockUnits()
    }

    addTroop(stats: trooperStatsInterface): void {
        this.money -= stats.price
        this.playerUnits.push(new Trooper(stats, this.side))
    }

    // addTroopTimed(stats: trooperStatsInterface): void {
    //
    // }

    attackEnemyTroop(time: number): void {
        this.playerUnits[0].timeAttack(time, this.enemyUnits)
    }

    handleRangeAttack(time: number): void {
        for (let unit of this.playerUnits) {
            if (unit.range) {
                if (this.side === 'left' && unit.position + unit.range >= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits)
                }
            }
            if (unit.range) {
                if (this.side === 'right' && unit.position - unit.range <= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits)
                }
            }
        }
    }

    isEnemyInFront(): boolean {
        if (this.playerUnits.length === 0) return false
        return this.playerUnits[0].isInFront(this.enemyUnits, 1)
    }

    checkForDeath(enemy: playerInterface): void {
        if (this.playerUnits.length) {
            if (this.playerUnits[0].health <= 0) {
                console.log(this.side, 'died', this.playerUnits[0])
                enemy.addFunds(this.playerUnits[0].price * 1.2)
                this.playerUnits.shift()
            }
        }
    }

    addFunds(amount: number): void {
        this.money += amount
        document.getElementById(`${this.side}Money`).innerHTML = `Money: ${Math.round(this.money)}`
    }

    checkForTroops(): boolean {
        return Boolean(this.playerUnits.length)
    }

    attackBase(time: number, enemyBase: baseInterface): void {
        if (this.playerUnits.length) {
            for (let unit of this.playerUnits) {
                if (this.side === 'left' && unit.position >= canvasWidth - 55 - unit.range) {unit.timeAttackBase(time, enemyBase)}
                if (this.side === 'right' && unit.position <= 55 + unit.range) unit.timeAttackBase(time, enemyBase)
            }
        }
    }

    inferMenace() {
        let troopAttackPerRound = 0
        for (let unit of this.playerUnits) {
            troopAttackPerRound += unit.damage / unit.attackSpeed
        }
    }

    private unlockUnits() {
        let elements = document.querySelectorAll(`.${this.side}`)
        elements.forEach((elem, i) => {
            // if (!this.unlockedUnits[i]) elem.setAttribute( "disabled", 'true' )
            if (!this.unlockedUnits[i]) elem.innerHTML = `Purchase for ${troopArr[i].researchPrice}`
            elem.addEventListener('mousedown', () => {
                if (this.unlockedUnits[i]) this.addTroop(troopArr[i])
                else this.purchaseUnit(i)
                document.getElementById(`${this.side}Money`).innerHTML = `Money: ${Math.round(this.money)}`
            })
        })
    }

    private purchaseUnit(index: number) {
        // if (this.money)age
        this.money -= troopArr[index].researchPrice
        this.unlockedUnits[index] = true
        document.querySelectorAll(`.${this.side}`)[index].innerHTML = troopArr[index].name
        // document.querySelectorAll(`.${this.side}`)[index].removeAttribute('disabled')
    }
}





interface botInterface extends playerInterface {

}

class Bot extends Player implements botInterface{
    constructor(money = 0, side: string, playerUnits: Array<trooperStatsInterface>, enemyUnits: Array<trooperStatsInterface>) {
        super(money, side, playerUnits, enemyUnits);
    }


}



let game = new Game()
console.log(game.playerOneUnits)

// players[0].addTroop(bestTroop)

    // players[0].attackEnemyTroop()
    // players[1].attackEnemyTroop()
    // if (players[0].isEnemyInFront()) console.log('-------enemy in front of me', game.playerOneUnits[0].position, game.playerTwoUnits[0].position)

// for (let i = 0; i < 704; i++){
//     game.move(players)
//     console.log(players[0])
//     game.display()
// }
game.animation()


