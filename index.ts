// import {Socket} from "socket.io";

let canvasWidth, canvasHeight, cx, explosionIMG, explosionAtomicIMG, radiationSymbolIMG, color, deathAnimPending, radioactivityPending, bgColor

try {
    let ctx = document.querySelector('canvas')
    canvasWidth = ctx.width = 700
    canvasHeight = ctx.height = 250
    console.log(ctx)
    cx = ctx.getContext('2d')
    explosionIMG = new Image(68, 55)

    explosionIMG.src = 'img/explosion.png'
    explosionAtomicIMG = new Image(255, 255)
    explosionAtomicIMG.src = 'img/nuke.png'
    radiationSymbolIMG = new Image(255, 255)
    radiationSymbolIMG.src = 'img/radiationSymbol.png'

    console.log('Running in Browser')
    color = document.querySelector('button')
    color = getComputedStyle(color).backgroundColor
    bgColor = document.body
    bgColor = getComputedStyle(bgColor).backgroundColor
}
catch (e) {
    // console.log('Running node.js huh?')
    canvasWidth = 700
    canvasHeight = 250
}

const troopArr = [
    {
        name: 'Basic Troop', health: 20, damage: 4.5, baseDamage: 4, attackSpeed: 40, castingTime: 1, price: 5, color: 'limegreen', speed: 1, span: 20, range: 0, researchPrice: 0
    },
    {
        name: 'Fast Troop', health: 18, damage: 1.3, baseDamage: .8, attackSpeed: 15, castingTime: 1.6, price: 5, color: 'lightpink', speed: 2.5, span: 15, range: 10, researchPrice: 60
    },
    {
        name: 'Range Troop', health: 20, damage: 4.5, baseDamage: 3, attackSpeed: 50, castingTime: 1.2, price: 8, color: 'blue', speed: 1, span: 20, range: 79, researchPrice: 120
    },
    {
        name: 'Advanced Troop', health: 35, damage: 12, baseDamage: 5, attackSpeed: 80, castingTime: 1.6, price: 10, color: 'darkgreen', speed: 1, span: 20, range: 0, researchPrice: 150
    },
    {
        name: 'Base Destroyer Troop', health: 40, damage: 2, baseDamage: 35, attackSpeed: 140, castingTime: 3, price: 50, color: 'yellow', speed: .8, span: 45, range: 0, researchPrice: 175
    },
    {
        name: 'Boomer Troop', health: 1, damage: 40, baseDamage: 30, attackSpeed: 17, castingTime: 1.6, price: 30, color: 'red', speed: 1, span: 20, range: 40, researchPrice: 200
    },
    {
        name: 'Shield Troop', health: 65, damage: .5, baseDamage: 1, attackSpeed: 300, castingTime: 3, price: 30, color: 'cadetblue', speed: 1, span: 20, range: 0, researchPrice: 250
    },
    {
        name: 'Doggo', health: 15, damage: 30, baseDamage: 0, attackSpeed: 60, castingTime: 1, price: 50, color: 'chocolate', speed: 1.5, span: 15, range: 0, researchPrice: 250
    },
    {
        name: 'Trebuchet Troop', health: 5, damage: 0, baseDamage: 100, attackSpeed: 300, castingTime: 3, price: 75, color: 'brown', speed: .4, span: 50, range: 200, researchPrice: 400
    },
    {
        name: 'Atomic Troop', health: 400, damage: .6, baseDamage: .75, attackSpeed: 1, castingTime: 3, price: 200, color: 'forestgreen', speed: .8, span: 18, range: 0, researchPrice: 600
    },
    {
        name: 'Atomic Bomb', health: 5000, damage: 9999, baseDamage: 0, attackSpeed: 1, castingTime: 3, price: 500, color: 'forestgreen', speed: 3, span: 28, range: 100, researchPrice: 1000
    },
    {
        name: 'Boss', health: 1000, damage: 40, baseDamage: 0, attackSpeed: 180, castingTime: 3, price: 10000, color: 'forestgreen', speed: .3, span: 35, range: 0, researchPrice: 30000
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

    constructor(stats: trooperStatsInterface, side: string, visualize: boolean = true, specialParameters: object = {}) {
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
        if (side === 'left') this.position = 10
        if (side === 'right') this.position = canvasWidth - 10
        if (JSON.stringify(specialParameters) != JSON.stringify({})) this.parseSpecialParameters(specialParameters)
    }

    parseSpecialParameters(parameters: object) {
        // @ts-ignore
        this.health = parameters.health
        // @ts-ignore
        this.position = parameters.position
        // @ts-ignore
        this.targetTime = parameters.targetTime
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
        else if (time >= this.targetTime) {
            this.attack(enemyTroopers, stats)
            this.targetTime = null
        }
        // }
        // else this.attack(enemyTroopers, stats) // This is a shortcut, may not be as precise!
    }

    isInFront(playerUnits: Array<trooperStatsInterface>, index: number): boolean {
        // takes an array and queue number to find out if one in front of him is '11' near
        // if (radioactivityPending && this.name != troopArr[4].name) this.health -= .04
        if (index === 0) return false
        // if (!this.visualize) return true // increases performance thrice, but isn't very precise, shortcut
        if (playerUnits.length === 0) return false
        if (this.side === 'left') {
            for (let i = index - 1; i >= 0; i--) {
                if (this.position <= playerUnits[i].position &&
                    this.position + this.span / 2 + 2 > playerUnits[i].position - playerUnits[i].span / 2) {
                    return true
                }
            }
        }
        if (this.side === 'right') {
            for (let i = index - 1; i >= 0; i--) {
                if (this.position >= playerUnits[i].position &&
                    this.position - this.span / 2 - 2 < playerUnits[i].position + playerUnits[i].span / 2) {
                    return true
                }
            }
        }
        return false
    }

    timeAttackBase(time: number, base: baseInterface): void {
        // if (this.visualize) {
        if (this.targetTime === null) this.targetTime = time + this.attackSpeed
        else if (time >= this.targetTime) {
            this.attackBase(base)
            // console.log('Attack Base !!!!!!!!')
            this.targetTime = null
        }
    }
        // else this.attackBase(base) // This is a shortcut, may not be as precise!


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
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(troopArr[0], side, player.visualize, specialParameters);
    }
}
class FastTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(troopArr[1], side, player.visualize, specialParameters);
    }
}
class RangeTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(troopArr[2], side, player.visualize, specialParameters);
    }
}
class AdvancedTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(troopArr[3], side, player.visualize, specialParameters);
    }
}
class BaseDestroyerTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(troopArr[4], side, player.visualize, specialParameters);
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
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}, troopStats: trooperStatsInterface = troopArr[5]) {
        super(troopStats, side, player.visualize, specialParameters);
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
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(troopArr[6], side, player.visualize, specialParameters);
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
    attack(enemyTroopers: Array<trooperStatsInterface>, stats: statsInterface, specialParameters: object = {}) {
        if (enemyTroopers[0].name === troopArr[6].name) {
            this.damage = 33
        }
        else {
            this.damage = .5
        }
        super.attack(enemyTroopers, stats);
    }
}
class HealerTroop extends Trooper {
    index: number
    player: playerInterface
    playerUnits: Array<trooperStatsInterface>

    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(troopArr[7], side, player.visualize, specialParameters);
        this.index = null
        // this.playerUnits = player.playerUnits
        // for (let unit of this.playerUnits) {
        //     unit.damage += 100
        // }
        // this.player = player
    }

    draw() {
        if (this.visualize) {
            cx.fillStyle = this.color
            cx.fillRect(this.position - this.span / 2, canvasHeight - 45, this.span, 15)
            this.drawHealth()
        }
    }
}
class TrebuchetTroop extends Trooper { // trebuchet could also attack other trebuchets
    enemyBase: baseInterface
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(troopArr[8], side, player.visualize, specialParameters);
        this.enemyBase = player.enemyBase
    }
    timeAttack(time: number, enemyTroopers: Array<trooperStatsInterface>) {
        if (this.side === 'left' && canvasWidth - this.position - 55 < this.range) {
            super.timeAttackBase(time, this.enemyBase)
        } // attacks enemy base even when unit is close but base is far !!!
        else if (this.side === 'right' && this.position - this.range - 55 < 0) {
            super.timeAttackBase(time, this.enemyBase)
        }
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
class AtomicTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(troopArr[9], side, player.visualize, specialParameters);
    }
    isInFront(playerUnits: Array<trooperStatsInterface>, index: number): boolean {
        this.health -= (this.maxHealth / 7) / canvasWidth
        return super.isInFront(playerUnits, index);
    }
    draw() {
        // cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35)
        super.draw();
        if (this.visualize) cx.drawImage(radiationSymbolIMG, this.position - this.span / 2 - 1, canvasHeight - 60)
    }
}
class AtomicBomb extends ExplodingTroop {
    player: playerInterface
    enemy: playerInterface
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(side, player, enemy, specialParameters, troopArr[10]);
        // this.player = player
        // this.enemy = enemy
        if (this.visualize) document.querySelectorAll('button').forEach(e => {
            if (e.innerText === `${troopArr[10].name}: ${troopArr[10].price}` || e.innerText === `Purchase for ${troopArr[10].researchPrice}`) {
                e.disabled = true
                setTimeout(() => {
                    e.removeAttribute('disabled')
                }, 10000)
            }
        })
    }
    attack(enemyTroopers: Array<trooperStatsInterface>) {
        this.health = 0
    }

    deleteAnim() {
        if (this.visualize) holdDeathAnim(this.position, this.span, this.visualize)
    }
    draw() {
        super.draw();
        if (this.visualize) cx.drawImage(radiationSymbolIMG, this.position - 9, canvasHeight - 60)
    }
}
class BossTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, specialParameters: object = {}) {
        super(troopArr[11], side, player.visualize, specialParameters);
    }
}
function holdDeathAnim(position: number, span: number, visualize: boolean) {
    if (!visualize) return
    let i = 0
    document.body.style.backgroundColor = 'rgb(26,38,26)'
    document.querySelectorAll('button').forEach(e => {
        e.style.backgroundColor = 'rgb(22,48,6)'
        e.style.color = 'rgb(166,172,154)'
    })
    requestAnimationFrame(hold)
    function hold() {
        deathAnimPending = true
        i++
        cx.globalAlpha = i / 100
        cx.drawImage(explosionAtomicIMG, position - 171 / 2 + span / 4, 20);
        cx.globalAlpha = 1

        if (i <= 45) requestAnimationFrame(hold)
        else {
            deathAnimPending = false
            radioactivityPending = true
            setTimeout(() => {
                radioactivityPending = false
                document.body.style.backgroundColor = bgColor
                document.querySelectorAll('button').forEach(e => {
                    e.style.backgroundColor = color
                    if (color === 'rgb(239, 239, 239)') {
                        e.style.color = 'black'
                    }
                    else e.style.color = 'rgb(169,169,169)'
                })
            }, 22000)
        }
    }
}
// class PlaneTroop extends Trooper {
//     constructor(side: string, player: playerInterface, enemy: playerInterface) {
//         super(troopArr[9], side, player.visualize);
//     }
// }


let troopers = [BasicTroop, FastTroop, RangeTroop, AdvancedTroop, BaseDestroyerTroop, ExplodingTroop, ShieldTroop, HealerTroop, TrebuchetTroop, AtomicTroop, AtomicBomb, BossTroop]

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
    DOMAccess: boolean
    atomicDoomPending: boolean

}

class Game implements gameInterface{
    playerOneUnits: Array<trooperStatsInterface>
    playerTwoUnits: Array<trooperStatsInterface>
    playerOneBase: baseInterface
    playerTwoBase: baseInterface
    players: Array<playerInterface>
    time: number = 0
    atomicDoomPending: boolean = false;
    msTime: number
    visualize: boolean
    DOMAccess: boolean
    // money: number
    // score: number

    constructor(player1: playerInterface, player2: playerInterface, visualize: boolean, DOMAccess: boolean,
                playerUnits1: Array<number> = [], playerUnits2: Array<number> = []) {
        // this.msTime = performance.now()
        this.DOMAccess = DOMAccess

        this.playerOneUnits = []
        this.playerTwoUnits = []

        this.visualize = visualize
        //new Trooper(advancedTroop, 'right'), new Trooper(bestTroop, 'right')
        this.playerOneBase = new Base(baseStats, 'left', this.visualize)
        this.playerTwoBase = new Base(baseStats, 'right', this.visualize)

        this.players = [player1, player2]
            // new Player(55, 'right', this.playerTwoUnits, this.playerOneUnits)

        this.players[0].map(this.players[1], visualize, DOMAccess, this.playerOneUnits, playerUnits1, this.playerTwoUnits, this.playerTwoBase, this.playerOneBase, this)
        this.players[1].map(this.players[0], visualize, DOMAccess, this.playerTwoUnits, playerUnits2, this.playerOneUnits, this.playerOneBase, this.playerTwoBase, this)

        this.animation()
    }

    move() {
        if (this.visualize && !deathAnimPending) cx.clearRect(0, 0, canvasWidth, canvasHeight)
        if (this.visualize && radioactivityPending) {
            cx.fillStyle = 'rgba(98,134,85, .15)'
            cx.fillRect(0, 0, canvasWidth, canvasHeight)
        }

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
        // if (this.DOMAccess) {
        //     setInterval(() => {
        //         move()
        //     }, .001)
        // }
        else {
            while (aliveBases() && this.playerOneUnits.length && this.playerTwoUnits.length && this.time < 100000) { //
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
    units: {
        basicTroop: 0,
        fastTroop: 0,
        rangeTroop: 0,
        advancedTroop: 0,
        baseDestroyerTroop: 0,
        boomerTroop: 0,
        shieldTroop: 0,
        healerTroop: 0,
        trebuchetTroop: 0
    }
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
    map: (enemy: playerInterface, visualize: boolean, DOMAccess: boolean, playerUnits: Array<trooperStatsInterface>, startingPlayerUnits: Array<number>,
          enemyUnits: Array<trooperStatsInterface>, enemyBase: baseInterface, playerBase: baseInterface, game: gameInterface) => void
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
    financialAid: Array<boolean> = [true, true, true]
    stats: statsInterface
    enemy: playerInterface
    enemyBase: baseInterface
    unlockedUnits: Array<boolean>
    playerUnits: Array<trooperStatsInterface>
    enemyUnits: Array<trooperStatsInterface>
    playerBase: baseInterface
    game: gameInterface
    maxUnits: number
    DOMAccess: boolean

    constructor(money = 0, side: string, checkForAvailMoney: boolean) {
        this.money = money
        this.side = side
        this.score = 0
        this.exp = 0
        this.checkForMoneyAvail = checkForAvailMoney
        // this.playerUnits = playerUnits
        // this.enemyUnits = enemyUnits
        this.unlockedUnits = [true, false, false, false, false, false, false, false, false]
        // this.unlockedUnits = [true, true, true, true, true, true, true, true, true]
        this.maxUnits = 10
        this.stats = {
            damageDealt: 0,
            spending: 0,
            units: {
                basicTroop: 0,
                fastTroop: 0,
                rangeTroop: 0,
                advancedTroop: 0,
                baseDestroyerTroop: 0,
                boomerTroop: 0,
                shieldTroop: 0,
                healerTroop: 0,
                trebuchetTroop: 0
            }
        }
    }

    map(enemy: playerInterface, visualize:boolean, DOMAccess: boolean, playerUnits: Array<trooperStatsInterface>, startingPlayerUnits: Array<number>,
        enemyUnits: Array<trooperStatsInterface>, enemyBase: baseInterface, playerBase: baseInterface, game: gameInterface) {
        this.enemy = enemy
        this.visualize = visualize
        this.DOMAccess = DOMAccess
        this.enemyBase = enemyBase
        this.playerBase = playerBase
        this.playerUnits = playerUnits
        if (!this.checkForMoneyAvail && visualize) document.getElementById(`${this.side}Money`).innerHTML = ``
        if (startingPlayerUnits.length > 0) {
            startingPlayerUnits.forEach(i => this.addTroop(i))
        }
        this.enemyUnits = enemyUnits
        this.game = game
        this.unlockUnits()
    }

    addTroop(index: number, params: trooperStatsInterface | object = {}): void {
        if (this.playerUnits.length) {
            for (let unit of this.playerUnits) {
                if (troopArr[5].name === troopArr[index].name && unit.name === troopArr[5].name) return
            }
        }
        if (this.isEnoughMoney(troopArr[index].price) && this.playerUnits.length < this.maxUnits) {
            // if (this.DOMAccess) {
            //     this.stats.units[Object.keys(this.stats.units)[index]] += 1
            //     document.getElementById(`stats${this.side}`).innerText = `
            //     Basic Troop: ${this.stats.units.basicTroop}
            //     Fast Troop: ${this.stats.units.fastTroop}
            //     Ranged Troop: ${this.stats.units.rangeTroop}
            //     Advanced Troop: ${this.stats.units.advancedTroop}
            //     Base Destroyer Troop: ${this.stats.units.baseDestroyerTroop}
            //     Boomer Troop: ${this.stats.units.boomerTroop}
            //     Shield Troop: ${this.stats.units.shieldTroop}
            //     Healer Troop: ${this.stats.units.healerTroop}
            //     Trebuchet Troop: ${this.stats.units.trebuchetTroop}`
            // }

            this.stats.spending += troopArr[index].price
            this.addFunds(-troopArr[index].price)
            this.playerUnits.push(new troopers[index](this.side, this, this.enemy, params))
        }
    }

    // addTroopTimed(stats: trooperStatsInterface): void {
    //
    // }

    doesBaseHaveHealth(): boolean {
        if (this.playerBase.health <= 0) {
            if (this.visualize) console.log('Base destroyed: ', this.playerBase)
            if (this.visualize) {
                cx.font = "45px Arial";
                cx.textAlign = "center";
                cx.fillStyle = "red";
                cx.fillText(`${(this.side === 'left' ? 'right' : 'left').toUpperCase()} WON`, canvasWidth / 2, canvasHeight / 2);
            }
            return false
        }
        return true
    }

    attackEnemyTroop(time: number): void {
        this.playerUnits[0].timeAttack(time, this.enemyUnits, this.stats)
    }

    handleRangeAttack(time: number): void {
        for (let unit of this.playerUnits) {
            if (unit.range > 0) {
                if (this.side === 'left' && unit.position + unit.range >= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits, this.stats)
                    this.stats.damageDealt += unit.damage
                    // console.log(this.stats.damageDealt)
                }
            }
            if (unit.range) {
                if (this.side === 'right' && unit.position - unit.range <= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits, this.stats)
                    this.stats.damageDealt += unit.damage
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
                    playerUnit.deleteAnim()
                    if (playerUnit.name === troopArr[10].name) {
                        this.game.atomicDoomPending = true
                        setTimeout(() => {this.game.atomicDoomPending = false}, 22000)
                        console.log('atomicDoomPending')
                    }
                    // playerUnit.doDeleteAnim = true
                    enemy.addFunds(playerUnit.price * 3)
                    this.playerUnits.splice(i, 1)
                }
            })
        }
    }

    addFunds(amount: number): void {
        this.money += amount
        if (this.DOMAccess && this.checkForMoneyAvail) document.getElementById(`${this.side}Money`).innerHTML = `Money: ${Math.round(this.money)}`
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
        // if (deathAnimPending) return
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
        for (let troop of this.playerUnits) {
            if (this.game.atomicDoomPending) troop.health -= .04
        }
        this.afterMoveArmy()
    }

    protected afterMoveArmy() {
        if (this.DOMAccess) {
            document.getElementById(`trs${this.side}`).innerText = `${this.playerUnits.length}/${this.maxUnits} Troops`
        }
        for (let i = 0; i <= 2; i++) {
            if (this.financialAid[i] && this.playerBase.health < baseStats.health / 4 * (i + 1)) {
                this.addFunds(100)
                this.financialAid[i] = false
            }
        }
    }

    protected unlockUnits(bindEventListeners: boolean = true): void {
        // console.log(this.visualize)
        // needs to create buttons for the length of troopArr
        if (this.DOMAccess) {
            let div = document.getElementById(this.side)
            troopArr.forEach((stat, i) => {
                let button = document.createElement('button')
                button.innerHTML = `${stat.name}: ${stat.price}`
                div.appendChild(button)
                button.className = this.side + 'Button'
                div.appendChild(document.createElement('br'))
                if (!this.unlockedUnits[i]) button.innerHTML = `Purchase for ${troopArr[i].researchPrice}`
                if (bindEventListeners) button.addEventListener('click', () => {
                    if (this.unlockedUnits[i]) this.addTroop(i)
                    else this.purchaseUnit(i, button)
                    if (this.checkForMoneyAvail) document.getElementById(`${this.side}Money`).innerHTML = `Money: ${Math.round(this.money)}`
                    else {
                        document.getElementById(`${this.side}Money`).innerHTML = ``
                    }
                })
            })
        }
    }

    protected parseUnits(units: Array<trooperStatsInterface>): Array<number> {
        let arr = []
        units.forEach((unit) => {
            troopArr.forEach((u, i) => {
                if (unit.name === u.name) arr.push(i)
            })
        })
        return arr
    }

    protected purchaseUnit(index: number, element: object) {
        // if (this.money)age
        if (this.isEnoughMoney(troopArr[index].researchPrice)) {
            this.money -= troopArr[index].researchPrice - 5
            this.unlockedUnits[index] = true
            try {
                // @ts-ignore
                if (this.DOMAccess) element.innerHTML = `${troopArr[index].name}: ${troopArr[index].price}`
            }
            catch (e) {}
            // document.querySelectorAll(`.${this.side}`)[index].removeAttribute('disabled')
        }
        else {
            // @ts-ignore
            element.style.backgroundColor = 'red'
            setTimeout(() => {
                // @ts-ignore
                element.style.backgroundColor = color
            }, 800)
            // console.log('Not enough money, dummy')
        }
    }
}





interface botInterface extends playerInterface {

}

// This bot is an idiot and should not be used!
// His performance, however, is, compared to other options, spectacular
class CalculatingBot extends Player implements botInterface {
    toUnlockUnit: number
    cooldown: number = 0
    constructor(money = 0, side: string, checkForAvailMoney: boolean) {
        super(money, side, checkForAvailMoney);
        this.toUnlockUnit = 1
    }

    protected afterMoveArmy() {
        super.afterMoveArmy()
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
    cooldown: number = 100
    toUnlockUnit = 1
    roundsSpentAtOpponentsHalf = 0
    working = false
    GUI = false
    maxUnits: number = 7

    // constructor(money = 0, side: string, checkForAvailMoney: boolean) {
    //     super(money, side, checkForAvailMoney);
    // }

    afterMoveArmy() {
        super.afterMoveArmy()
        let enc = this.encouragement()
        document.getElementById(`pull${this.side}`).innerText = 'Mode: ' + (enc > 2.2 ? 'Panic' : this.shouldPull(0, enc) ? 'Pull' : 'Normal')
        if (this.cooldown <= 0 && !this.shouldPull(1, enc)) {
            // console.log(enc)
            if (enc >= .8 && !this.working && this.playerUnits.length < this.maxUnits) {
                this.working = true
                let cancelWork = () => this.working = false
                let addTroop = (i) => this.addTroop(i)
                let side = this.side
                let p = performance.now()
                let worker = new Worker('index.js')
                worker.postMessage([this.parseUnits(this.playerUnits), this.parseUnits(this.enemyUnits),
                    this.unlockedUnits, 'right', this.money, this.game])
                worker.onmessage = function (e) {
                    // console.log(e.data)
                    if (e.data.length) addTroop(e.data[0])
                    if (e.data.length && Math.random() > .5 && e.data[0] === 3) addTroop(2)
                    cancelWork()
                    document.getElementById(`per${side}`).innerText = `Computed in: ${Math.round((performance.now() - p) * 1000) / 1000}ms`
                }
                this.cooldown = 10
            }
            if (this.playerUnits.length) {
                if (this.money > 1000 && (this.side === 'left' ? this.playerUnits[0].position > canvasWidth - 300 : this.playerUnits[0].position < 300))
                    this.shouldSpawnBaseDestroyer(enc)
            }
            this.tryToUnlock()
            let numberOfUnlockedUnits = 0
            this.unlockedUnits.forEach(e => {if (e) {numberOfUnlockedUnits++}})
            // document.getElementById(`enc${this.side}`).innerText = `Enc: ${Math.round(enc * 1000) / 1000}`
            document.getElementById(`unl${this.side}`).innerText = `Unlocked Units: ${numberOfUnlockedUnits}`
        }
        this.cooldown--
    }

    shouldPull(increase: number, enc: number): boolean {
        // determines whether to fight left or more right
        if (enc >= 10) return false
        if (!this.playerUnits.length) return false
        if (this.side === 'left' ? this.playerUnits[0].position < canvasWidth / 2 : this.playerUnits[0].position > canvasWidth / 2) {
            this.roundsSpentAtOpponentsHalf = 0
            return false
        }
        if (this.side === 'left' ? this.playerUnits[0].position > canvasWidth / 2 : this.playerUnits[0].position < canvasWidth / 2) {
            this.roundsSpentAtOpponentsHalf += increase
            if (this.roundsSpentAtOpponentsHalf > 170) { // 45 seconds = 2700
                return true
            }
        }
        return false
    }

    tryToUnlock() {
        if (!this.unlockedUnits[this.unlockedUnits.length - 1] && this.money > troopArr[this.toUnlockUnit].researchPrice * 1.5) {
            this.purchaseUnit(this.toUnlockUnit)
            this.toUnlockUnit++ // should be done better
        }
    }

    shouldSpawnBaseDestroyer(enc: number) {
        this.playerUnits.forEach(e => {
            if (e.name === troopArr[4].name || e.name === troopArr[8].name) enc = 1
        })
        if (enc <= .4) {
            if (this.money > 200 && Math.random() < .2) {
                this.addTroop(5)
            }
            if (Math.random() < .8 && this.unlockedUnits[8] && this.unlockedUnits[6] && this.unlockedUnits[2]) {
                if (this.isEnoughMoney(troopArr[6].price + troopArr[2].price + troopArr[8].price)) {
                    this.addTroop(6)
                    this.addTroop(2)
                    this.addTroop(8)
                    this.cooldown = 300
                }
            }
            else if (this.unlockedUnits[4] && enc <= .1 && this.unlockedUnits[3]) {
                this.addTroop(3)
                this.addTroop(4)
                this.cooldown = 250
            }
        }
    }

    encouragement(): number {
        let stats = {
            playerUnitsDamage: 0,
            enemyUnitsDamage: 0,
            playerUnitsLength: 0,
            enemyUnitsLength: 0
        }
        this.game.players[this.side === 'left' ? 0 : 1].playerUnits.forEach(e => stats.playerUnitsDamage += e.damage)
        this.game.players[this.side === 'left' ? 0 : 1].enemyUnits.forEach(e => stats.enemyUnitsDamage += e.damage)
        stats.playerUnitsLength = this.game.players[this.side === 'left' ? 0 : 1].playerUnits.length
        stats.enemyUnitsLength = this.game.players[this.side === 'left' ? 0 : 1].enemyUnits.length

        // console.log(stats)
        // console.log('enc:', (stats.enemyUnitsLength / stats.playerUnitsLength) / (stats.playerUnitsDamage / stats.enemyUnitsDamage))

        if (stats.playerUnitsLength && stats.enemyUnitsDamage) {
            return (((stats.enemyUnitsLength / stats.playerUnitsLength) / (stats.playerUnitsDamage / stats.enemyUnitsDamage)) ** .5)
        }
        else if (!stats.enemyUnitsLength) return 0
        else return 10
    }

    purchaseUnit(index) {
        if (this.isEnoughMoney(troopArr[index].researchPrice)) {
            this.money -= troopArr[index].researchPrice - 5
            this.unlockedUnits[index] = true
        }
    }

    unlockUnits() {
        if (this.GUI) super.unlockUnits()
    }
}



class InternetPlayer extends Player implements playerInterface {
    private firstTimeAtomicDoom: boolean;
    private message: string = ''
    private spectator: boolean
    constructor(money, side, checkForAvailMoney, address: string) {
        super(money, side, checkForAvailMoney);
        let socket = io(address) // ws://localhost:8080

        // this.map(new Player(1000, 'right', false), true, true, [], [], [], new Base(baseStats, 'right'), new Base(baseStats, 'left'))
        this.DOMAccess = true
        this.playerUnits = []
        this.enemyUnits = []
        this.firstTimeAtomicDoom = true
        socket.on('mess', message => {console.log(message)})
        socket.on('side', side => {
            if (side === 'Server Full') {
                this.displayText('Server Full')
                return
            }
            this.side = side
            console.log('side: ', this.side)
            console.log('innit')
            if (side) this.addGUI(socket)
            // else if (!side) this.spectator = true
        })
        socket.on('getSide', () => {
            socket.emit('getSide', this.side)
        })

        if (this.side || this.spectator) socket.on('game', (playerOneBase, playerTwoBase, playerOneUnits, playerTwoUnits, leftMoney, rightMoney, time) => {
            this.updateMoney(leftMoney, rightMoney)
            if (this.side === 'left') this.display(playerOneBase, playerTwoBase, playerOneUnits, playerTwoUnits, time)
            else if (this.side === 'right') this.display(playerTwoBase, playerOneBase, playerTwoUnits, playerOneUnits, time)
        });
        socket.on('atomic', atomicDoomPending => {
            if (atomicDoomPending && this.firstTimeAtomicDoom) {
                console.log('atomicDoomPending')
                this.firstTimeAtomicDoom = false
                holdDeathAnim(500, 28, true)
            }
            if (!atomicDoomPending) this.firstTimeAtomicDoom = true
        })
        socket.on('message', message => {
            this.message = message
            setTimeout(() => {location.reload()}, 7500)
        })

    }

    configBases(playerBase, enemyBase) {
        this.draw(playerBase)
        this.draw(enemyBase)
    }

    displayText(text: string) {
        cx.font = "45px Arial";
        cx.textAlign = "center";
        cx.fillStyle = "red";
        cx.fillText(`${text}`, canvasWidth / 2, canvasHeight / 2);
    }

    draw(base: baseInterface): void {
        cx.fillStyle = base.color
        cx.fillRect(base.position, canvasHeight - 105, base.span, 75)
        cx.fillStyle = 'lightgray'
        cx.fillRect(base.position, canvasHeight - 115, base.span, 5)
        cx.fillStyle = 'red'
        cx.fillRect(base.position, canvasHeight - 115, base.health / 800 * base.span, 5)
    }

    display(playerOneBase: baseInterface, playerTwoBase: baseInterface,
            playerUnits: Array<trooperStatsInterface>, enemyUnits: Array<trooperStatsInterface>, time: number) {
        cx.clearRect(0, 0, canvasWidth, canvasHeight)
        let playerUnitsNumber = this.parseUnits(playerUnits)
        let enemyUnitsNumber = this.parseUnits(enemyUnits)

        playerUnitsNumber.forEach((num, i) => {
            this.addTroop(num, playerUnits[i])
        })
        enemyUnitsNumber.forEach((num, i) => {
            this.addTroopToEnemy(num, enemyUnits[i])
        })
        this.configBases(playerOneBase, playerTwoBase)

        for (let unit of this.playerUnits) {
            unit.draw()
            unit.drawAttack(time)
        }
        for (let unit of this.enemyUnits) {
            unit.draw()
            unit.drawAttack(time)
        }
        this.playerUnits = []
        this.enemyUnits = []

        this.displayText(this.message)
    }

    addTroopToEnemy(index: number, params: trooperStatsInterface) {
        this.enemyUnits.push(new troopers[index]((this.side === 'left' ? 'right' : 'left'), this, this.enemy, params))
    }

    addGUI(socket: object) {
        document.querySelectorAll('button').forEach(button => button.remove())
        document.querySelectorAll('br').forEach(br => br.remove())
        // if (this.spectator) return
        this.unlockUnits(false)
        let buttons = Array.from(document.getElementsByClassName(this.side + 'Button'))
        buttons.forEach((button, i) => {
            button.addEventListener('click', () => {
                if (this.unlockedUnits[i]) {
                    // @ts-ignore
                    socket.emit(`AddTroop`, this.side, i)
                }
                else if (this.money >= troopArr[i].researchPrice || true) {
                    this.purchaseUnit(i, button)
                    // @ts-ignore
                    socket.emit(`AddMoney`, this.side, -troopArr[i].researchPrice)
                    console.log(this.unlockedUnits)
                }
                else {
                    // @ts-ignore
                    button.style.backgroundColor = 'red'
                    setTimeout(() => {
                        // @ts-ignore
                        button.style.backgroundColor = color
                    }, 800)
                }
            })
        })
    }

    updateMoney(leftMoney: number, rightMoney: number) {
        if (this.side === 'left') this.money = leftMoney
        else this.money = rightMoney
        document.getElementById('leftMoney').innerText = `Money: ${leftMoney}`
        document.getElementById('rightMoney').innerText = `Money: ${rightMoney}`
    }
}
// try {
//     new InternetPlayer(null, '', false)
// }
// catch (e) {}



try {
    module.exports = {
        Game: Game,
        Player: Player,
    }
}
catch (e) {}

function initializeUI(btnWiderWidth: number, btnNarrowerWidth: number,) {
    document.getElementById('startingScreen').style.display = 'none'
    document.getElementById('cx').style.display = 'initial'
    document.getElementById('controls').style.display = ''
    window.addEventListener('resize', () => {resize(btnWiderWidth, btnNarrowerWidth)})
    resize(btnWiderWidth, btnNarrowerWidth)
}
function resize(btnWiderWidth: number, btnNarrowerWidth: number,) {
    document.querySelectorAll('button').forEach(e => {
        if (document.body.scrollWidth > 477) {
            e.style.width = 200 + 'px'
            if (color === 'rgb(239,239,239') e.style.boxShadow = '0 0 15px 4px rgb(14, 14, 14)'
            e.style.margin = '4px'
            return
        }
        if (document.body.scrollWidth <= 477) {
            e.style.width = btnWiderWidth + 'px'
        }
        if (document.body.scrollWidth <= 347) {
            e.style.width = btnNarrowerWidth + 'px'
        }
        if (color === 'rgb(239,239,239') e.style.boxShadow = '0 0 7px 2px rgb(20,20,20)'
        e.style.margin = '0'
        e.style.marginTop = '5px'
        e.style.backgroundColor = color

    })
    let cxHeight = document.getElementById('cx').offsetHeight
    document.getElementById('controls').style.height = window.innerHeight - cxHeight + 'px'
}


try {
    let audioPlaying = false
    let audio = new Audio('img/Age of War - Theme Soundtrack.mp3');
    document.getElementById('music').addEventListener('click', () => {
        if (!audioPlaying) {
            audio.play();
        }
        else audio.pause()
        audioPlaying = !audioPlaying
    })
    window.addEventListener('ended', () => {
        audio = new Audio('img/Age of War - Theme Soundtrack.mp3');
        audio.play()})
    // initializeUI(160, 120)
    let shiftDown = false
    window.addEventListener('keydown', e => {
        if (e.shiftKey) {
            shiftDown = true
        }
    })
    window.addEventListener('keyup', () => {
        shiftDown = false
    })

    document.getElementById('pl').addEventListener('click', () => {
        new Game(new Player(55, 'left', !shiftDown),
            new Player(55, 'right', !shiftDown),
            true, true, [], [])
        initializeUI(160, 140)
        }
    )
    document.getElementById('bot').addEventListener('click', () => {
        new Game(new Player(55, 'left', !shiftDown),
            new SimulatingBot(55, 'right', !shiftDown),
            true, true, [], [])

        initializeUI(160, 120)
        }
    )
    document.getElementById('mul').addEventListener('click', () => {
        let address = prompt('Enter address:', 'http://192.168.1.160:8080')
        // let address = prompt('Enter code:', '8080'); address = `http://192.168.1.135:${address}`
        // let address = `http://192.168.1.160:${8080}`
        new InternetPlayer(0, 'left', false, address)
        initializeUI(160, 120)
        }
    )
}
// catch (e) {}


catch (e) {
    try {
        onmessage = function (e) {
            // e[0] playerTroops e[1] enemyTroops e[2] unlockedUnits e[3] side e[4] money e[5] game
            // console.log(e);
            let bestDPM = -999999;
            let bestStats;
            let bestTroops = [];
            let numberOfUnlockedUnits = 0;
            e.data[2].forEach(function (e) {
                return e ? numberOfUnlockedUnits++ : 0;
            });
            if (numberOfUnlockedUnits >= 4) numberOfUnlockedUnits = 4
            // let p = performance.now()
            for (let i = 0; i < numberOfUnlockedUnits; i++) { // - trebuchet
                if (i === 4 || i === 8) continue;
                for (let j = 0; j < numberOfUnlockedUnits; j++) {
                    if (j === 4 || j === 8 || (i === 5 && j === 5)) continue;
                    for (let k = 0; k < numberOfUnlockedUnits; k++) {
                        if (k === 4 || k === 8 || ((i === 5 && k === 5) || (j === 5 && k === 5))) continue;
                        let plTroops = e.data[0].slice();
                        plTroops.push(i);
                        plTroops.push(j);
                        plTroops.push(k);
                        let game = simulate(plTroops, e.data[1].slice());
                        let stats = getGameStats(game);
                        stats.enemyUnitsLength = game.players[e.data[3] === 'left' ? 0 : 1].enemyUnits.length;
                        stats.playerUnitsLength = game.players[e.data[3] === 'left' ? 0 : 1].playerUnits.length;
                        if (damageCalc(stats) > bestDPM) {
                            bestDPM = damageCalc(stats);
                            bestStats = stats;
                            bestTroops = [plTroops[plTroops.length - 3], plTroops[plTroops.length - 2], plTroops[plTroops.length - 1]];
                        }
                    }
                }
            }
            // console.log(bestTroops, damageCalc(bestStats))
            // console.log(bestTroops, 'in', performance.now() - p, 'ms')
            // document.getElementById(`dmg${this.side}`).innerText = String(bestDPM)
            function simulate(units1, units2): gameInterface {
                // console.log('simulate')
                return new Game(
                    new Player(0, 'left', false),
                    new Player(0, 'right', false),
                    false, false, units1, units2);
            }

            function getGameStats(game): extendedStatsInterface {
                let stats = {
                    playerSpending: null,       // 15 - 200
                    playerDamage: null,         // 3 - 50
                    playerUnitsLength: null,    // 3 - 7
                    enemyDamage: null,          // 3 - 50
                    enemyUnitsLength: null,     // 3 - 7
                    time: null                  // 200 - 2000
                };
                stats.playerSpending = game.players[e.data[3] === 'left' ? 0 : 1].stats.spending;
                stats.playerDamage = game.players[e.data[3] === 'left' ? 0 : 1].stats.damageDealt;
                stats.enemyDamage = game.players[e.data[3] === 'left' ? 0 : 1].stats.damageDealt;
                return stats;
            }

            function damageCalc(stats): number {
                if (stats.playerSpending > e.data[4])
                    return -1;
                if (stats.playerUnitsLength)
                    return (stats.playerDamage);
                else if (stats.enemyUnitsLength)
                    return (stats.playerDamage);
                else {
                    return (stats.playerDamage);
                }
            }

            // @ts-ignore
            postMessage(bestTroops);
        };
    }


    catch (e) {
        // console.log(e)

        // new Game(new InternetPlayer(55, 'left', !shiftDown),
        //     new InternetPlayer(55, 'right', !shiftDown),
        //     true, true, [], [])

    }
}
