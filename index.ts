let ctx = document.querySelector('canvas')
let canvasWidth = ctx.width = 600
let canvasHeight = ctx.height = 250
console.log(ctx)
let cx = ctx.getContext('2d')
let explosionIMG = new Image(68, 55)
explosionIMG.src = 'explosion.png'

const troopArr = [
    {
        name: 'Basic Troop', health: 20, damage: 4.5, baseDamage: 4, attackSpeed: 40, castingTime: 1, price: 5, color: 'limegreen', speed: 1, span: 20, range: 0, researchPrice: 0
    },
    {
        name: 'Fast Troop', health: 18, damage: 1.5, baseDamage: .8, attackSpeed: 15, castingTime: 1.6, price: 5, color: 'lightpink', speed: 2.5, span: 15, range: 10, researchPrice: 100
    },
    {
        name: 'Range Troop', health: 20, damage: 3, baseDamage: 3, attackSpeed: 50, castingTime: 1.2, price: 10, color: 'blue', speed: 1, span: 20, range: 79, researchPrice: 200
    },
    {
        name: 'Advanced Troop', health: 30, damage: 10, baseDamage: 5, attackSpeed: 80, castingTime: 1.6, price: 12, color: 'darkgreen', speed: 1, span: 20, range: 0, researchPrice: 400
    },
    {
        name: 'Base Destroyer Troop', health: 50, damage: 2, baseDamage: 35, attackSpeed: 140, castingTime: 3, price: 50, color: 'yellow', speed: .5, span: 45, range: 0, researchPrice: 800
    },
    {
        name: 'Kamikaze Troop', health: 1, damage: 49, baseDamage: 75, attackSpeed: 17, castingTime: 1.6, price: 12, color: 'red', speed: 1, span: 20, range: 21, researchPrice: 500
    },
    {
        name: 'Shield Troop', health: 98, damage: .5, baseDamage: 1, attackSpeed: 50, castingTime: 3, price: 30, color: 'cadetblue', speed: 1, span: 20, range: 0, researchPrice: 500
    },
    {
        name: 'Healer Troop', health: 5, damage: 10, baseDamage: 0, attackSpeed: 60, castingTime: 1, price: 25, color: 'hotpink', speed: 1.5, span: 20, range: 100, researchPrice: 500
    },
    {
        name: 'Trebuchet Troop', health: 5, damage: 0, baseDamage: 100, attackSpeed: 250, castingTime: 3, price: 50, color: 'brown', speed: .3, span: 50, range: 125, researchPrice: 10000
    },
    {
        name: 'Sneaky Troop', health: 1, damage: 49, baseDamage: 75, attackSpeed: 17, castingTime: 1.6, price: 12, color: 'darkgray', speed: 1, span: 20, range: 0, researchPrice: 500
    },
    {
        name: 'Plane Troop', health: 1, damage: 49, baseDamage: 75, attackSpeed: 17, castingTime: 1.6, price: 12, color: 'steelblue', speed: 1, span: 20, range: 0, researchPrice: 500
    },
    ]

let baseStats = {
    health: 800, position: 0, color: 'royalblue', span: 45
}

interface trooperStatsInterface {
    range: number;
    health: number
    damage: number
    castingTime: number
    position?: number
    color: string
    speed: number
    span: number
    attackSpeed: number
    baseDamage: number
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
    deleteAnim?: () => void
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
    baseDamage: number

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
        this.baseDamage = stats.baseDamage
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
                    this.position + this.span / 2 + 2 > playerUnits[i].position - playerUnits[i].span / 2) {
                    return true
                }
            }
        }
        if (this.side === 'right') {
            for (let i = index - 1; i >= 0; i--) {
                if (this.position > playerUnits[i].position &&
                    this.position - this.span / 2 - 2 < playerUnits[i].position + playerUnits[i].span / 2) {
                    return true
                }
            }
        }
        return false
    }

    timeAttackBase(time: number, base: baseInterface): void {
        if (this.targetTime === null) this.targetTime = time + this.attackSpeed
        else if (time >= this.targetTime) {
            this.attackBase(base)
            console.log('Attack Base !!!!!!!!')
            this.targetTime = null
        }
    }

    attackBase(base: baseInterface): void {
        base.health -= this.baseDamage
    }

    draw() {
        cx.fillStyle = this.color
        cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35)
        this.drawHealth()
    }

    protected drawHealth() {
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

    deleteAnim() {

    }
}

class BasicTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[0], side);
    }
}
class FastTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[1], side);
    }
}
class RangeTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[2], side);
    }
}
class AdvancedTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[3], side);
    }
}
class BaseDestroyerTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[4], side);
    }
    drawAttack(time: number): void {
        if (this.targetTime !== null) {
            cx.fillStyle = `rgb(${255 - (1 / (this.targetTime - time)) * 255}, ${255 - (1 / (this.targetTime - time)) * 255}, 255)`
            cx.fillRect(this.position - this.span / 2, canvasHeight - 85, this.span, 5)
            cx.fillStyle = 'orangered'
            cx.fillRect(this.position - (this.side === 'left' ? this.span / 4 : -this.span / 4), canvasHeight - 45,
                this.side === 'left' ? (1 / (this.targetTime - time)) * this.span : -(1 / (this.targetTime - time)) * this.span, 5)
        }
    }
}
class ExplodingTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[5], side);
    }
    attack(enemyTroopers: Array<trooperStatsInterface>) {
        console.log('attacked enemy BOOM: ', enemyTroopers)
        enemyTroopers[0].health -= this.damage
        this.health = -1
    }

    timeAttack(time: number, enemyTroopers: Array<trooperStatsInterface>) {
        this.deleteAnim()
        super.timeAttack(time, enemyTroopers);
    }

    timeAttackBase(time: number, base: baseInterface) {
        this.deleteAnim()
        super.timeAttackBase(time, base);
    }
    attackBase(base: baseInterface) {
        this.health = -1
        super.attackBase(base);
    }

    isInFront(playerUnits: Array<trooperStatsInterface>, index: number): boolean {
        if (playerUnits.length) {
            if ((this.side === 'left' && playerUnits[0].side === 'left') ||
                (this.side === 'right' && playerUnits[0].side === 'right')) return false
        }
        return super.isInFront(playerUnits, index);
    }

    deleteAnim() {
        cx.fillStyle = 'red'
        cx.beginPath();
        cx.arc(this.position, canvasHeight - 65, 20, 0, 2 * Math.PI);
        cx.fill()
        cx.drawImage(explosionIMG, this.position - this.span / 2 - 34, canvasHeight - 65 - 35 / 2 );
    }
}
class ShieldTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[6], side);
    }
    draw() {
        cx.fillStyle = this.color
        cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35)
        cx.fillStyle = 'brown'
        cx.fillRect(this.position - (this.side === 'left' ? 0 : this.span) + this.span / 2 - 3, canvasHeight - 65, 3, 35)
        this.drawHealth()
    }
}
class HealerTroop extends Trooper {
    index: number
    player: playerInterface

    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[7], side);
        this.index = null
        this.player = player
    }
    isInFront(playerUnits: Array<trooperStatsInterface>, index: number): boolean {
        this.index = index
        return super.isInFront(playerUnits, index);
    }
    attack(enemyTroopers: Array<trooperStatsInterface>) {
        this.heal()
    }
    attackBase(base: baseInterface) {
        this.heal()
    }
    private heal() {
        let unitInFront = this.player.playerUnits[this.index - 1]
        if (this.player.playerUnits.length > 1) this.player.playerUnits[this.index - 1].health +=
            unitInFront.maxHealth - unitInFront.health < this.damage ? unitInFront.maxHealth - unitInFront.health : this.damage
    }
}
class TrebuchetTroop extends Trooper { // trebuchet could also attack other trebuchets
    player: playerInterface
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[8], side);
        this.player = player
    }
    timeAttack(time: number, enemyTroopers: Array<trooperStatsInterface>) {
        super.timeAttackBase(time, this.player.enemyBase)
    }
    drawAttack(time: number) {
        super.drawAttack(time);
        cx.fillStyle = 'silver'
        cx.beginPath()
        cx.arc(this.position + (this.side === 'left' ? (1 / (this.targetTime - time)) * this.span :
            -(1 / (this.targetTime - time)) * this.range), canvasHeight - 100, 10, 0, 2 * Math.PI);
        cx.fill()
    }
}
class SneakyTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[9], side);
    }
}
class PlaneTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[10], side);
    }
}


let troopers = [BasicTroop, FastTroop, RangeTroop, AdvancedTroop, BaseDestroyerTroop, ExplodingTroop, ShieldTroop, HealerTroop, TrebuchetTroop, SneakyTroop, PlaneTroop]

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

        this.players[0].map(this.players[1], this.playerTwoBase)
        this.players[1].map(this.players[0], this.playerOneBase)
    }

    move() {
        cx.clearRect(0, 0, canvasWidth, canvasHeight)

        this.time += 1
        // console.log(this.time, '---Move---')
        this.players[0].moveArmy()
        this.players[1].moveArmy()

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

    display() {
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
    enemy: playerInterface
    enemyBase: baseInterface
    unlockedUnits: Array<boolean>
    playerUnits: Array<trooperStatsInterface>
    enemyUnits: Array<trooperStatsInterface>
    isEnemyInFront: () => boolean
    attackEnemyTroop: (time: number) => void
    addTroop: (index: number) => void
    checkForDeath: (enemy: playerInterface) => void
    handleRangeAttack: (time: number) => void
    checkForTroops: () => boolean
    attackBase: (time: number, enemyBase: baseInterface) => void
    addFunds: (amount: number) => void
    moveArmy: () => void
    purchasableUnits?: Array<trooperStatsInterface>
    map: (enemy: playerInterface, enemyBase: baseInterface) => void
    // unlockUnits: () => void
    // addTroopTimed: (stats: trooperStatsInterface) => void

}

class Player implements playerInterface{
    money: number
    score: number
    side: string
    exp: number
    enemy: playerInterface
    enemyBase: baseInterface
    unlockedUnits: Array<boolean>
    playerUnits: Array<trooperStatsInterface>
    enemyUnits: Array<trooperStatsInterface>

    constructor(money = 0, side: string, playerUnits: Array<trooperStatsInterface>,
                enemyUnits: Array<trooperStatsInterface>) {
        this.money = money
        this.side = side
        this.score = 0
        this.exp = 0
        this.playerUnits = playerUnits
        this.enemyUnits = enemyUnits
        this.unlockedUnits = [true, false, false]
        this.unlockUnits()
    }

    map(enemy: playerInterface, enemyBase: baseInterface) {
        this.enemy = enemy
        this.enemyBase = enemyBase
    }

    addTroop(index: number): void {
        this.money -= troopArr[index].price
        // @ts-ignore
        this.playerUnits.push(new troopers[index](this.side, this, this.enemy))
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
                this.playerUnits[0].deleteAnim()
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

    moveArmy() {
        if (this.side === 'left') {
            this.playerUnits.forEach((troop, i) => {
                if (!troop.isInFront(this.playerUnits, i) && !troop.isInFront(this.enemyUnits, 1) &&
                    troop.position < canvasWidth - baseStats.span - 10) {
                    // console.log('moved to right', troop.position)
                    troop.position += troop.speed
                }
                // else console.log('no movement to right', troop.position)
            })
        }
        if (this.side === 'right') {
            this.playerUnits.forEach((troop, i) => {
                if (!troop.isInFront(this.playerUnits, i) && !troop.isInFront(this.enemyUnits, 1) &&
                    troop.position > baseStats.span + 10) {
                    // console.log('moved to left', troop.position)
                    troop.position -= troop.speed
                }
                // else console.log('no movement to left', troop.position)
            })
        }
        }

    private unlockUnits() {
        // needs to create buttons for the length of troopArr
        let div = document.getElementById(this.side)
        troopArr.forEach((stat, i) => {
            let button = document.createElement('button')
            button.innerHTML = `${stat.name}: ${stat.price}`
            div.appendChild(button)
            div.appendChild(document.createElement('br'))
            if (!this.unlockedUnits[i]) button.innerHTML = `Purchase for ${troopArr[i].researchPrice}`
            button.addEventListener('click', () => {
                if (this.unlockedUnits[i]) this.addTroop(i)
                else this.purchaseUnit(i, button)
                document.getElementById(`${this.side}Money`).innerHTML = `Money: ${Math.round(this.money)}`
            })

        })

        // let elements = document.querySelectorAll(`.${this.side}`)
        // elements.forEach((elem, i) => {
        //     if (!this.unlockedUnits[i]) elem.setAttribute( "disabled", 'true' )
            // if (!this.unlockedUnits[i]) elem.innerHTML = `Purchase for ${troopArr[i].researchPrice}`
            // elem.addEventListener('mousedown', () => {
            //     if (this.unlockedUnits[i]) this.addTroop(troopArr[i])
            //     else this.purchaseUnit(i)
            //     document.getElementById(`${this.side}Money`).innerHTML = `Money: ${Math.round(this.money)}`
            // })
        // })
    }

    private purchaseUnit(index: number, element: object) {
        // if (this.money)age
        this.money -= troopArr[index].researchPrice
        this.unlockedUnits[index] = true
        // @ts-ignore
        element.innerHTML = `${troopArr[index].name}: ${troopArr[index].price}`
        // document.querySelectorAll(`.${this.side}`)[index].removeAttribute('disabled')
    }
}





interface botInterface extends playerInterface {

}

class Bot extends Player implements botInterface{
    constructor(money = 0, side: string, playerUnits: Array<trooperStatsInterface>,
                enemyUnits: Array<trooperStatsInterface>, enemy: playerInterface) {
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


