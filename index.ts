let canvasWidth, canvasHeight, cx, explosionIMG
try {
    console.log('Running in Browser')
    let ctx = document.querySelector('canvas')
    canvasWidth = ctx.width = 600
    canvasHeight = ctx.height = 250
    console.log(ctx)
    cx = ctx.getContext('2d')
    explosionIMG = new Image(68, 55)
    explosionIMG.src = 'explosion.png'
}
catch (e) {
    console.log('Running node.js huh?')
    canvasWidth = 600
    canvasHeight = 250
}

const troopArr = [
    {
        name: 'Basic Troop', health: 20, damage: 4.5, baseDamage: 4, attackSpeed: 40, castingTime: 1, price: 5, color: 'limegreen', speed: 1, span: 20, range: 0, researchPrice: 0
    },
    {
        name: 'Fast Troop', health: 18, damage: 1.5, baseDamage: .8, attackSpeed: 15, castingTime: 1.6, price: 5, color: 'lightpink', speed: 2.5, span: 15, range: 10, researchPrice: 60
    },
    {
        name: 'Range Troop', health: 20, damage: 3, baseDamage: 3, attackSpeed: 50, castingTime: 1.2, price: 10, color: 'blue', speed: 1, span: 20, range: 79, researchPrice: 100
    },
    {
        name: 'Advanced Troop', health: 30, damage: 10, baseDamage: 5, attackSpeed: 80, castingTime: 1.6, price: 10, color: 'darkgreen', speed: 1, span: 20, range: 0, researchPrice: 250
    },
    {
        name: 'Base Destroyer Troop', health: 50, damage: 2, baseDamage: 35, attackSpeed: 140, castingTime: 3, price: 50, color: 'yellow', speed: .5, span: 45, range: 0, researchPrice: 400
    },
    {
        name: 'Boomer Troop', health: 1, damage: 49, baseDamage: 30, attackSpeed: 17, castingTime: 1.6, price: 40, color: 'red', speed: 1, span: 20, range: 21, researchPrice: 550
    },
    {
        name: 'Shield Troop', health: 98, damage: .5, baseDamage: 1, attackSpeed: 50, castingTime: 3, price: 30, color: 'cadetblue', speed: 1, span: 20, range: 0, researchPrice: 550
    },
    {
        name: 'Healer Troop', health: 4, damage: 5, baseDamage: 0, attackSpeed: 60, castingTime: 1, price: 25, color: 'hotpink', speed: 1.5, span: 20, range: 100, researchPrice: 800
    },
    {
        name: 'Trebuchet Troop', health: 5, damage: 0, baseDamage: 100, attackSpeed: 300, castingTime: 3, price: 50, color: 'brown', speed: .3, span: 50, range: 200, researchPrice: 2000
    },
    // {
    //     name: 'Sneaky Troop', health: 1, damage: 49, baseDamage: 75, attackSpeed: 17, castingTime: 1.6, price: 12, color: 'darkgray', speed: 1, span: 20, range: 0, researchPrice: 500
    // },
    // {
    //     name: 'Plane Troop', health: 1, damage: 49, baseDamage: 75, attackSpeed: 17, castingTime: 1.6, price: 12, color: 'steelblue', speed: 1, span: 20, range: 0, researchPrice: 500
    // },
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
    attack?: (enemyTroopers: Array<trooperStatsInterface>, stats: object) => void
    isInFront?: (playerUnits: Array<trooperStatsInterface>, index: number) => boolean
    draw?: () => void
    timeAttack?: (time: number, enemyTroopers: Array<trooperStatsInterface>, stats: object) => void
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
    name: string
    attackSpeed: number
    targetTime: number
    maxHealth: number
    baseDamage: number
    visualize: boolean

    constructor(stats: trooperStatsInterface, side: string, visualize: boolean) {
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
        this.visualize = visualize
        this.name = stats.name
        if (side === 'left') this.position = 20
        if (side === 'right') this.position = canvasWidth - 20
    }

    attack(enemyTroopers: Array<trooperStatsInterface>, stats: statsInterface): void {
        // console.log('attacked enemy: ', enemyTroopers)
        if (enemyTroopers.length) {
            stats.damageDealt += enemyTroopers[0].health < 0 ? 0 :
                enemyTroopers[0].health < this.damage ?
                enemyTroopers[0].health : this.damage
            enemyTroopers[0].health -= this.damage
        }
    }

    timeAttack(time: number, enemyTroopers: Array<trooperStatsInterface>, stats: statsInterface): void {
        // if (this.visualize) {
        if (this.targetTime === null) this.targetTime = time + this.attackSpeed
        else if (time === this.targetTime) {
            this.attack(enemyTroopers, stats)
            this.targetTime = null
        }
        // }
        // else this.attack(enemyTroopers, stats) // This is a shortcut, may not be as precise!
    }

    isInFront(playerUnits: Array<trooperStatsInterface>, index: number): boolean {
        // takes an array and queue number to find out if one in front of him is '11' near
        if (index === 0) return false
        // if (!this.visualize) return true // increases performance thrice, but isn't very precise, shortcut
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
        if (this.visualize) {
            if (this.targetTime === null) this.targetTime = time + this.attackSpeed
            else if (time >= this.targetTime) {
                this.attackBase(base)
                // console.log('Attack Base !!!!!!!!')
                this.targetTime = null
            }
        }
        else this.attackBase(base) // This is a shortcut, may not be as precise!
    }

    attackBase(base: baseInterface): void {
        base.health -= this.baseDamage
    }

    draw() {
        if (this.visualize) {
            cx.fillStyle = this.color
            cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35)
            this.drawHealth()
        }
    }

    protected drawHealth() {
        cx.fillStyle = 'lightgray'
        cx.fillRect(this.position - this.span / 2, canvasHeight - 75, this.span, 5)
        cx.fillStyle = 'red'
        cx.fillRect(this.position - this.span / 2, canvasHeight - 75, this.health / this.maxHealth * this.span, 5)
    }

    drawAttack(time: number): void {
        if (this.visualize) {
            if (this.targetTime !== null) {
                cx.fillStyle = `rgb(${255 - (1 / (this.targetTime - time)) * 255}, ${255 - (1 / (this.targetTime - time)) * 255}, 255)`
                cx.fillRect(this.position - this.span / 2, canvasHeight - 85, this.span, 5)
            }
        }
    }

    deleteAnim() {

    }
}

class BasicTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[0], side, player.visualize);
    }
}
class FastTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[1], side, player.visualize);
    }
}
class RangeTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[2], side, player.visualize);
    }
}
class AdvancedTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[3], side, player.visualize);
    }
}
class BaseDestroyerTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[4], side, player.visualize);
    }
    drawAttack(time: number): void {
        if (this.targetTime !== null && this.visualize) {
            super.drawAttack(time)
            cx.fillStyle = 'orangered'
            cx.fillRect(this.position - (this.side === 'left' ? this.span / 4 : -this.span / 4), canvasHeight - 45,
                this.side === 'left' ? (1 / (this.targetTime - time)) * this.span : -(1 / (this.targetTime - time)) * this.span, 5)
        }
    }
}
class ExplodingTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[5], side, player.visualize);
    }
    attack(enemyTroopers: Array<trooperStatsInterface>) {
        // console.log('attacked enemy BOOM: ', enemyTroopers)
        enemyTroopers[0].health -= this.damage
        this.health = 0
    }

    timeAttack(time: number, enemyTroopers: Array<trooperStatsInterface>, stats: statsInterface) {
        this.deleteAnim()
        super.timeAttack(time, enemyTroopers, stats);
    }

    timeAttackBase(time: number, base: baseInterface) {
        this.deleteAnim()
        super.timeAttackBase(time, base);
    }
    attackBase(base: baseInterface) {
        this.health = 0
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
        if (this.visualize) {
            cx.fillStyle = 'red'
            cx.beginPath();
            cx.arc(this.position, canvasHeight - 65, 20, 0, 2 * Math.PI);
            cx.fill()
            cx.drawImage(explosionIMG, this.position - this.span / 2 - 34, canvasHeight - 65 - 35 / 2);
        }
    }
}
class ShieldTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[6], side, player.visualize);
    }
    draw() {
        if (this.visualize) {
            cx.fillStyle = this.color
            cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35)
            cx.fillStyle = 'brown'
            cx.fillRect(this.position - (this.side === 'left' ? 0 : this.span) + this.span / 2 - 3, canvasHeight - 65, 3, 35)
            this.drawHealth()
        }
    }
}
class HealerTroop extends Trooper {
    index: number
    player: playerInterface

    constructor(side: string, player: playerInterface, enemy: playerInterface) {
        super(troopArr[7], side, player.visualize);
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
        super(troopArr[8], side, player.visualize);
        this.player = player
    }
    timeAttack(time: number, enemyTroopers: Array<trooperStatsInterface>) {
        super.timeAttackBase(time, this.player.enemyBase)
    }
    drawAttack(time: number) {
        if (this.visualize) {
            super.drawAttack(time);
            cx.fillStyle = 'silver'
            // could shoot in a curve
            cx.beginPath()
            cx.arc(this.position + (this.side === 'left' ? (1 / (this.targetTime - time)) * this.span :
                -(1 / (this.targetTime - time)) * this.range), canvasHeight - 100, 10, 0, 2 * Math.PI);
            cx.fill()
        }
    }
}
// class PlaneTroop extends Trooper {
//     constructor(side: string, player: playerInterface, enemy: playerInterface) {
//         super(troopArr[9], side, player.visualize);
//     }
// }


let troopers = [BasicTroop, FastTroop, RangeTroop, AdvancedTroop, BaseDestroyerTroop, ExplodingTroop, ShieldTroop, HealerTroop, TrebuchetTroop]

interface baseInterface {
    health: number
    position: number
    color: string
    span: number
    visualize?: boolean
    baseExposed?: boolean
    side?: string
    draw?: () => void
}

class Base implements baseInterface {
    health: number
    position: number
    color: string
    span: number
    visualize: boolean
    baseExposed: boolean = false
    maxHealth: number

    constructor(stats: baseInterface, side: string, visualize: boolean = true) {
        this.health = stats.health
        this.position = stats.position
        this.color = stats.color
        this.span = stats.span
        this.maxHealth = stats.health
        this.visualize = visualize
        if (side === 'left') this.position = 5
        if (side === 'right') this.position = canvasWidth - 50
    }

    draw(): void {
        if (this.visualize) {
            cx.fillStyle = this.color
            cx.fillRect(this.position, canvasHeight - 105, this.span, 75)
            this.drawHealth()
        }
    }

    private drawHealth() {
        cx.fillStyle = 'lightgray'
        cx.fillRect(this.position, canvasHeight - 115, this.span, 5)
        cx.fillStyle = 'red'
        cx.fillRect(this.position, canvasHeight - 115, this.health / this.maxHealth * this.span, 5)
    }
}




interface gameInterface {
    playerOneUnits: Array<trooperStatsInterface>
    playerTwoUnits: Array<trooperStatsInterface>
    playerOneBase: baseInterface
    playerTwoBase: baseInterface
    players: Array<playerInterface>
    time: number
    msTime: number
    visualize: boolean
}

class Game implements gameInterface{
    playerOneUnits: Array<trooperStatsInterface>
    playerTwoUnits: Array<trooperStatsInterface>
    playerOneBase: baseInterface
    playerTwoBase: baseInterface
    players: Array<playerInterface>
    time: number = 0
    msTime: number
    visualize: boolean
    // money: number
    // score: number

    constructor(player1: playerInterface, player2: playerInterface, visualize: boolean,
                playerUnits1: Array<number> = [], playerUnits2: Array<number> = []) {
        this.msTime = performance.now()

        this.playerOneUnits = []
        this.playerTwoUnits = []

        this.visualize = visualize
        //new Trooper(advancedTroop, 'right'), new Trooper(bestTroop, 'right')
        this.playerOneBase = new Base(baseStats, 'left', this.visualize)
        this.playerTwoBase = new Base(baseStats, 'right', this.visualize)

        this.players = [player1, player2]
            // new Player(55, 'right', this.playerTwoUnits, this.playerOneUnits)

        this.players[0].map(this.players[1], visualize, this.playerOneUnits, playerUnits1, this.playerTwoUnits, this.playerTwoBase, this.playerOneBase)
        this.players[1].map(this.players[0], visualize, this.playerTwoUnits, playerUnits2, this.playerOneUnits, this.playerOneBase, this.playerTwoBase)

        this.animation()
    }

    move() {
        if (this.visualize) cx.clearRect(0, 0, canvasWidth, canvasHeight)

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

        // this.players[0].doesBaseHaveHealth()
        // this.players[1].doesBaseHaveHealth()

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
        let move = () => {this.move()}
        let aliveBases = () => {
            return this.players[0].doesBaseHaveHealth() && this.players[1].doesBaseHaveHealth()
        }
        if (this.visualize) requestAnimationFrame(hold)
        else {
            while (aliveBases() && this.playerOneUnits.length && this.playerTwoUnits.length && this.time < 10000) { //
                move()
            }
            // console.log('Game ended,',
            //     (!this.playerOneUnits.length && !this.playerTwoUnits.length ? 'nobody' : (this.playerOneUnits.length ? 'left' : 'right')), 'won',
            //     ', took:', this.time, 'rounds, in', performance.now() - this.msTime, 'ms\n', 'Left player damage:', this.players[0].stats.damageDealt,
            //     'Right player damage:', this.players[1].stats.damageDealt)

        }
        function hold(): void {
            move()
            if (aliveBases()) requestAnimationFrame(hold)
        }
    }
}






interface statsInterface {
    damageDealt: number
    spending: number
}

interface extendedStatsInterface {
    playerSpending: number
    playerDamage: number,
    playerUnitsLength: number,
    enemyDamage: number,
    enemyUnitsLength: number
}

interface playerInterface {
    money: number
    score: number
    side: string
    exp: number
    visualize: boolean
    playerBase: baseInterface
    checkForMoneyAvail: boolean
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
    map: (enemy: playerInterface, visualize: boolean, playerUnits: Array<trooperStatsInterface>, startingPlayerUnits: Array<number>,
          enemyUnits: Array<trooperStatsInterface>, enemyBase: baseInterface, playerBase: baseInterface) => void
    isEnoughMoney: (amount: number) => boolean
    doesBaseHaveHealth: () => boolean
    stats: statsInterface
    // unlockUnits: () => void
    // addTroopTimed: (stats: trooperStatsInterface) => void

}

class Player implements playerInterface{
    money: number
    score: number
    side: string
    exp: number
    checkForMoneyAvail: boolean
    visualize: boolean
    stats: statsInterface
    enemy: playerInterface
    enemyBase: baseInterface
    unlockedUnits: Array<boolean>
    playerUnits: Array<trooperStatsInterface>
    enemyUnits: Array<trooperStatsInterface>
    playerBase: baseInterface

    constructor(money = 0, side: string, checkForAvailMoney: boolean) {
        this.money = money
        this.side = side
        this.score = 0
        this.exp = 0
        this.checkForMoneyAvail = checkForAvailMoney
        // this.playerUnits = playerUnits
        // this.enemyUnits = enemyUnits
        this.unlockedUnits = [true, false, false]
        this.stats = {
            damageDealt: 0,
            spending: 0
        }
    }

    map(enemy: playerInterface, visualize:boolean, playerUnits: Array<trooperStatsInterface>, startingPlayerUnits: Array<number>,
        enemyUnits: Array<trooperStatsInterface>, enemyBase: baseInterface, playerBase: baseInterface) {
        this.enemy = enemy
        this.visualize = visualize
        this.enemyBase = enemyBase
        this.playerBase = playerBase
        this.playerUnits = playerUnits
        if (startingPlayerUnits.length > 0) {
            startingPlayerUnits.forEach(i => this.addTroop(i))
        }
        this.enemyUnits = enemyUnits
        this.unlockUnits()
    }

    addTroop(index: number): void {
        if (this.isEnoughMoney(troopArr[index].price)) {
            this.stats.spending += troopArr[index].price
            this.addFunds(-troopArr[index].price)
            this.playerUnits.push(new troopers[index](this.side, this, this.enemy))
        }
    }

    // addTroopTimed(stats: trooperStatsInterface): void {
    //
    // }

    doesBaseHaveHealth(): boolean {
        if (this.playerBase.health <= 0) {
            console.log('Base destroyed: ', this.playerBase)
            return false
        }
        return true
    }

    attackEnemyTroop(time: number): void {
        this.playerUnits[0].timeAttack(time, this.enemyUnits, this.stats)
    }

    handleRangeAttack(time: number): void {
        for (let unit of this.playerUnits) {
            if (unit.range) {
                if (this.side === 'left' && unit.position + unit.range >= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits, this.stats)
                }
            }
            if (unit.range) {
                if (this.side === 'right' && unit.position - unit.range <= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits, this.stats)
                }
            }
        }
    }

    isEnemyInFront(): boolean {
        if (this.playerUnits.length === 0) return false
        return this.playerUnits[0].isInFront(this.enemyUnits, 1)
    }

    checkForDeath(enemy: playerInterface): void {
        if (this.playerUnits.length) { // should check for every troop
            this.playerUnits.forEach((playerUnit, i) => {
                if (playerUnit.health <= 0) {
                    // console.log(this.side, 'died', playerUnit)
                    playerUnit.deleteAnim()
                    enemy.addFunds(playerUnit.price * 1.5)
                    this.playerUnits.splice(i, 1)
                }
            })
        }
    }

    addFunds(amount: number): void {
        this.money += amount
        if (this.visualize) document.getElementById(`${this.side}Money`).innerHTML = `Money: ${Math.round(this.money)}`
    }

    isEnoughMoney(amount: number): boolean {
        if (!this.checkForMoneyAvail) return true
        return this.money >= amount
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

    moveArmy() {
        if (this.side === 'left') {
            this.playerUnits.forEach((troop, i) => {
                if (!troop.isInFront(this.playerUnits, i) && !troop.isInFront(this.enemyUnits, 1) &&
                    troop.position < canvasWidth - baseStats.span - 10) {
                    // console.log('moved to right', troop.position)
                    troop.position += troop.speed + (!this.visualize ? 4 : 0)
                }
                // else console.log('no movement to right', troop.position)
            })
        }
        if (this.side === 'right') {
            this.playerUnits.forEach((troop, i) => {
                if (!troop.isInFront(this.playerUnits, i) && !troop.isInFront(this.enemyUnits, 1) &&
                    troop.position > baseStats.span + 10) {
                    // console.log('moved to left', troop.position)
                    troop.position -= troop.speed + (!this.visualize ? 4 : 0)
                }
                // else console.log('no movement to left', troop.position)
            })
        }
        this.afterMoveArmy()
    }
    
    protected afterMoveArmy() {}

    private unlockUnits() {
        // console.log(this.visualize)
        // needs to create buttons for the length of troopArr
        if (this.visualize) {
            let div = document.getElementById(this.side)
            troopArr.forEach((stat, i) => {
                let button = document.createElement('button')
                button.innerHTML = `${stat.name}: ${stat.price}`
                div.appendChild(button)
                button.className = this.side
                div.appendChild(document.createElement('br'))
                if (!this.unlockedUnits[i]) button.innerHTML = `Purchase for ${troopArr[i].researchPrice}`
                button.addEventListener('click', () => {
                    if (this.unlockedUnits[i]) this.addTroop(i)
                    else this.purchaseUnit(i, button)
                    document.getElementById(`${this.side}Money`).innerHTML = `Money: ${Math.round(this.money)}`
                })

            })
        }
    }

    protected purchaseUnit(index: number, element: object) {
        // if (this.money)age
        if (this.isEnoughMoney(troopArr[index].researchPrice)) {
            this.money -= troopArr[index].researchPrice - 5
            this.unlockedUnits[index] = true
            // @ts-ignore
            if (this.visualize) element.innerHTML = `${troopArr[index].name}: ${troopArr[index].price}`
            // document.querySelectorAll(`.${this.side}`)[index].removeAttribute('disabled')
        }
        else {
            // @ts-ignore
            element.style.backgroundColor = 'red'
            setTimeout(() => {
                // @ts-ignore
                element.style.backgroundColor = 'rgb(239, 239, 239)'
            }, 800)
            console.log('Not enough money, dummy')
        }
    }
}





interface botInterface extends playerInterface {

}

class CalculatingBot extends Player implements botInterface{
    toUnlockUnit: number
    cooldown: number = 0
    constructor(money = 0, side: string, checkForAvailMoney: boolean) {
        super(money, side, checkForAvailMoney);
        this.toUnlockUnit = 1
    }

    protected afterMoveArmy() {
        if (this.cooldown <= 0) {
            if (this.DPR(this.enemyUnits) >= this.DPR(this.playerUnits) ||
                this.healthOverall(this.enemyUnits) / 10 * 7 > this.healthOverall(this.playerUnits)) {
                let i = this.neededUnit(this.DPR(this.enemyUnits) - this.DPR(this.playerUnits),
                    this.healthOverall(this.enemyUnits) / 10 * 9 - this.healthOverall(this.playerUnits))
                if (i) this.addTroop(i)
                else this.addTroop(0)
            }
            if (!this.unlockedUnits[this.unlockedUnits.length - 1] && this.money > troopArr[this.toUnlockUnit].researchPrice * 2) {
                this.purchaseUnit(this.toUnlockUnit, document.getElementsByClassName(this.side)[this.toUnlockUnit])
                this.toUnlockUnit++
            }
        }
        this.cooldown--
    }

    addTroop(index: number) {
        super.addTroop(index);
        this.cooldown = 45
    }

    DPR(units: Array<trooperStatsInterface>): number {
        let troopAttackPerRound = 0
        for (let unit of units) {
            // has to be changed when troopArr changes
            if (unit.name === troopArr[2].name) troopAttackPerRound += unit.damage * 2 / unit.attackSpeed
            else if (unit.name != troopArr[5].name) troopAttackPerRound += unit.damage / unit.attackSpeed
        }
        return troopAttackPerRound
    }

    DPH(damage: number, health: number) { // damage per health
        return damage / health
    }

    DPHPP() { // damage per health per money

    }

    healthOverall(units: Array<trooperStatsInterface>): number {
        let healthOfTroops = 0
        for (let unit of units) {
            healthOfTroops += unit.health
        }
        return healthOfTroops
    }

    neededUnit(damage: number, health: number): number {
        let mostSuitable = {
            DPH: null,
            index: null
        }
        troopArr.forEach((elem, i) => {
            if (elem.price < this.money && this.unlockedUnits[i]) {
                if (this.DPH(elem.damage, elem.health) >= mostSuitable.DPH) {
                    mostSuitable.DPH = this.DPH(elem.damage, elem.health)
                    mostSuitable.index = i
                }
            }
        })
        return mostSuitable.index
    }

}


class SimulatingBot extends Player {
    cooldown: number = 45

    // constructor(money = 0, side: string, checkForAvailMoney: boolean) {
    //     super(money, side, checkForAvailMoney);
    // }

    protected afterMoveArmy() {
        if (this.cooldown <= 0) {
            let stats = this.bruteforce([0,0,0], [1,1,1,1,1])
        }
        this.cooldown--
    }

    simulate(units1: Array<number>, units2: Array<number>): gameInterface {
        // console.log('simulate')
        return new Game(new Player(0, 'left', false),
                        new Player(0, 'right', false),
            false, units1, units2)
    }

    bruteforce(playerTroops: Array<number>, enemyTroops: Array<number>) {
        // let mostSuitedTroops: Array<number> = []
        // let getStats = this.getGameStats
        // let DPM = this.DPM
        // let simulate = this.simulate
        // has to be changed to number array
        // let enemyTroops = this.enemyUnits
        // let playerTroops = this.playerUnits
        let bestDPM = null
        let bestStats
        let bestTroops = []
        // test(0, [], 0)
        // function test(depth: number, arr: Array<number>, i:number) {
        //     if (depth < deepness) {
        //             arr = arr.slice()
        //             arr.push(i)
        //         for (let i = 0; i < deepness; i++) {
        //             test(depth + 1, arr, i)
        //         }
        //     }
        //     else {
        //         console.log(arr)
        //     }
        // }
        let p = performance.now()
        for (let i = 0; i < troopArr.length - 2; i++) { // - trebuchet
            for (let j = 0; j < troopArr.length - 1; j++) {
                for (let k = 0; k < troopArr.length - 1; k++) {
                    let plTroops: Array<number> = playerTroops.slice()
                    plTroops.push(i)
                    plTroops.push(j)
                    plTroops.push(k)
                    // console.log(plTroops)
                    let game = this.simulate(plTroops, enemyTroops.slice())
                    let stats = this.getGameStats(game)
                    stats.enemyUnitsLength = game.players[this.side === 'left' ? 0 : 1].enemyUnits.length
                    stats.playerUnitsLength = game.players[this.side === 'left' ? 0 : 1].playerUnits.length

                    if (this.damageCalc(stats) > bestDPM) {
                        bestDPM = this.damageCalc(stats)
                        bestStats = stats
                        bestTroops = plTroops
                        // console.log('!!!!!!!!!!!!', bestStats)
                    }
                }
            }
        }
        console.log(bestTroops, 'in', performance.now() - p, 'ms')
        return bestTroops
    }

    private parseUnits(units: Array<trooperStatsInterface>): Array<number> {
        let arr = []
        units.forEach((unit) => {
            troopArr.forEach((u, i) => {
                if (unit.name === u.name) arr.push(i)
            })
        })
        return arr
    }

    damageCalc(stats: extendedStatsInterface): number {
        if (stats.playerSpending === 0) return -1
        if (stats.playerUnitsLength) return (stats.playerUnitsLength / stats.playerDamage) / stats.playerSpending
        if (stats.enemyUnitsLength) return (stats.playerDamage / stats.enemyUnitsLength) / stats.playerSpending
    }

    getGameStats(game: gameInterface): extendedStatsInterface {
        let stats = {
            playerSpending: null,
            playerDamage: null,
            playerUnitsLength: null,
            enemyDamage: null,
            enemyUnitsLength: null
        }
        stats.playerSpending = game.players[this.side === 'left' ? 0 : 1].stats.spending

        stats.playerDamage = game.players[this.side === 'left' ? 0 : 1].stats.damageDealt
        stats.enemyDamage = game.players[this.side === 'left' ? 0 : 1].stats.damageDealt
        return stats
    }
}


let s = new SimulatingBot(0, 'left', false)
s.bruteforce( [], [0,1])

// new Game(new Player(55, 'left', true),
//          new SimulatingBot(55, 'right', true),
//     true, [], [])




