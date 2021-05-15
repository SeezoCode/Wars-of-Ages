// But be careful not to write it wrong since it has a powerful resolution going for the people that test my forms
let canvasWidth, canvasHeight, cx, explosionIMG, explosionAtomicIMG, radiationSymbolIMG, buttonColor, deathAnimPending,
    radioactivityPending, bgColor, buttonBg, darkTheme, playingHostedGame

try {
    let canvas = document.querySelector('canvas')
    canvasWidth = canvas.width = 700
    canvasHeight = canvas.height = 250
    cx = canvas.getContext('2d')
    explosionIMG = new Image(68, 55)

    explosionIMG.src = 'img/explosion.png'
    explosionAtomicIMG = new Image(255, 255)
    explosionAtomicIMG.src = 'img/nuke.png'
    radiationSymbolIMG = new Image(255, 255)
    radiationSymbolIMG.src = 'img/radiationSymbol.png'

    darkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (darkTheme) {
        buttonColor = 'darkgray'
        buttonBg = '#1c1c1c'
        bgColor = 'rgb(24, 26, 27)'
    } else {
        buttonColor = 'black'
        buttonBg = 'rgb(239, 239, 239)'
        bgColor = 'white'
    }

} catch (e) {
    // console.log('Running node.js huh?')
    canvasWidth = 700
    canvasHeight = 250
}

const troopArr = [
    {
        name: 'Basic Troop',
        health: 20,
        damage: 4.4,
        baseDamage: 4,
        attackSpeed: 40,
        price: 5,
        color: 'limegreen',
        speed: 1,
        span: 20,
        range: 0,
        researchPrice: 0
    },
    {
        name: 'Fast Troop',
        health: 12,
        damage: 2.3,
        baseDamage: .8,
        attackSpeed: 13,
        price: 5,
        color: 'lightpink',
        speed: 2.5,
        span: 15,
        range: 10,
        researchPrice: 60
    },
    {
        name: 'Range Troop',
        health: 20,
        damage: 4.3,
        baseDamage: 3,
        attackSpeed: 50,
        price: 8,
        color: 'blue',
        speed: 1,
        span: 20,
        range: 79,
        researchPrice: 100
    },
    {
        name: 'Advanced Troop',
        health: 36,
        damage: 15,
        baseDamage: 10,
        attackSpeed: 70,
        price: 10,
        color: 'darkgreen',
        speed: 1,
        span: 20,
        range: 0,
        researchPrice: 120
    },
    {
        name: 'Shield Troop',
        health: 115,
        damage: 3,
        baseDamage: 1.75,
        attackSpeed: 200,
        price: 12,
        color: 'cadetblue',
        speed: 1,
        span: 20,
        range: 0,
        researchPrice: 150
    },
    {
        name: 'Catapult',
        health: 15,
        damage: 3.2,
        baseDamage: 12,
        attackSpeed: 100,
        price: 20,
        color: 'yellow',
        speed: .9,
        span: 32,
        range: 140,
        researchPrice: 140
    },
    {
        name: 'Boomer Troop',
        health: 1,
        damage: 50,
        baseDamage: 30,
        attackSpeed: 17,
        price: 20,
        color: 'red',
        speed: 2,
        span: 20,
        range: 40,
        researchPrice: 140
    },
    {
        name: 'Doggo',
        health: 30,
        damage: 30,
        baseDamage: 2,
        attackSpeed: 60,
        price: 20,
        color: 'chocolate',
        speed: 1.8,
        span: 15,
        range: 0,
        researchPrice: 175
    },
    {
        name: 'Trebuchet',
        health: 5,
        damage: 0,
        baseDamage: 100,
        attackSpeed: 300,
        price: 45,
        color: 'brown',
        speed: .5,
        span: 50,
        range: 210,
        researchPrice: 250
    },
    {
        name: 'Atomic Troop',
        health: 280,
        damage: .6,
        baseDamage: .75,
        attackSpeed: 1,
        price: 40,
        color: 'forestgreen',
        speed: .8,
        span: 18,
        range: 0,
        researchPrice: 250
    },
    {
        name: 'Atomic Bomb',
        health: 5000,
        damage: 9999,
        baseDamage: 0,
        attackSpeed: 1,
        price: 250,
        color: 'forestgreen',
        speed: 3,
        span: 28,
        range: 100,
        researchPrice: 800
    },
    {
        name: 'Boss',
        health: 1000,
        damage: 40,
        baseDamage: 10,
        attackSpeed: 180,
        price: 5000,
        color: 'crimson',
        speed: .3,
        span: 35,
        range: 0,
        researchPrice: 10000
    },
]

let baseStats = {
    health: 800, position: 0, color: 'royalblue', span: 45
}

interface trooperStatsInterface {
    range: number;
    health: number
    damage: number
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
    timeAttack?: (time: number, enemyTroopers: Array<trooperStatsInterface>, stats: statsInterface) => void
    timeAttackBase?: (time: number, base: baseInterface, stats: statsInterface) => void
    drawAttack?: (time: number) => void
    deleteAnim?: () => void
}

class Trooper implements trooperStatsInterface {
    health: number
    damage: number
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
    protected puppy?: boolean;
    static draw?: () => void;

    constructor(stats: trooperStatsInterface, side: string, visualize: boolean = true, multiplier: number = 1, specialParameters: object = {}) {
        this.health = stats.health * multiplier
        this.damage = stats.damage * multiplier
        this.color = stats.color
        this.speed = stats.speed
        this.span = stats.span
        this.side = side
        this.attackSpeed = stats.attackSpeed
        this.targetTime = null
        this.maxHealth = stats.health * multiplier
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
        // @ts-ignore
        this.maxHealth = parameters.maxHealth
        // @ts-ignore
        if (parameters.puppy) {
            this.puppy = true
            // @ts-ignore
            this.damage = parameters.damage
            // @ts-ignore
            this.attackSpeed = parameters.attackSpeed
            // @ts-ignore
            this.speed = parameters.speed
            // @ts-ignore
            this.span = parameters.span
        }
    }

    attack(enemyTroopers: Array<trooperStatsInterface>, stats: statsInterface): void {
        // console.log('attacked enemy: ', enemyTroopers)
        if (enemyTroopers.length) {
            stats.damageDealt += this.damage
            // (enemyTroopers[0].health < 0 ? 0 :
            // enemyTroopers[0].health < this.damage ?
            // enemyTroopers[0].health : this.damage)
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
    }

    // else this.attack(enemyTroopers, stats) // This is a shortcut, may not be as precise!

    isInFront(playerUnits: Array<trooperStatsInterface>, index: number): boolean {
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

    timeAttackBase(time: number, base: baseInterface, stats: statsInterface): void {
        // if (this.visualize) {
        if (this.targetTime === null) this.targetTime = time + this.attackSpeed
        else if (time >= this.targetTime) {
            this.attackBase(base, stats)
            this.targetTime = null
        }
    }

    // else this.attackBase(base) // This is a shortcut, may not be as precise!


    attackBase(base: baseInterface, stats: statsInterface): void {
        base.health -= this.baseDamage
        stats.damageDealt += this.baseDamage
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
    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(troopArr[0], side, player.visualize, multiplier, specialParameters);
    }
}

class FastTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(troopArr[1], side, player.visualize, multiplier, specialParameters);
    }
}

class RangeTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(troopArr[2], side, player.visualize, multiplier, specialParameters);
    }
}

class AdvancedTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(troopArr[3], side, player.visualize, multiplier, specialParameters);
    }
}

class ShieldTroop extends Trooper {
    private readonly multiplier: number;

    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(troopArr[4], side, player.visualize, multiplier, specialParameters);
        this.multiplier = multiplier;
    }

    draw() {
        if (this.visualize) {
            cx.fillStyle = this.color
            cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35)
            cx.fillStyle = 'brown'
            cx.fillRect(this.position - (this.side === 'left' ? 3 : this.span) + this.span / 2, canvasHeight - 65, 3, 35)
            this.drawHealth()
        }
    }

    attack(enemyTroopers: Array<trooperStatsInterface>, stats: statsInterface, specialParameters: object = {}) {
        if (enemyTroopers[0].name === troopArr[4].name) {
            this.damage = troopArr[4].damage * 20 * this.multiplier;
        } else {
            this.damage = troopArr[4].damage * this.multiplier;
        }
        super.attack(enemyTroopers, stats);
    }
}

class CatapultTroop extends Trooper {
    blast: number = 60

    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(troopArr[5], side, player.visualize, multiplier, specialParameters);
    }

    drawAttack(time: number): void {
        if (!this.visualize) return
        if (this.targetTime !== null && this.visualize) {
            super.drawAttack(time)
        }

        let y
        if (this.targetTime) y = canvasHeight - 100 -
            Math.abs(Math.sin(((this.attackSpeed / 8) / (this.targetTime - time)) / (this.attackSpeed / 8) * Math.PI)) * 50 + 5
        else y = canvasHeight - 100

        if (this.targetTime) {
            cx.fillStyle = 'silver'
            cx.beginPath()
            if (this.side === 'left') {
                cx.arc(this.position + this.attackSpeed / Math.abs(time - this.targetTime), y, 5, 0, 2 * Math.PI); // y = canvasHeight - 100
            } else if (this.side === 'right') {
                cx.arc(this.position - this.attackSpeed / Math.abs(time - this.targetTime), y, 5, 0, 2 * Math.PI); // y = canvasHeight - 100
            }
            cx.fill()
        }
    }

    attack(enemyTroopers: Array<trooperStatsInterface>, stats: statsInterface) {
        for (let troop of enemyTroopers) {
            if (this.side === 'left' && this.position + this.range > troop.position && this.position + this.range - this.blast < troop.position) {
                troop.health -= this.damage
                stats.damageDealt += this.damage
            } else if (this.side === 'right' && this.position - this.range < troop.position && this.position - this.range + this.blast > troop.position) {
                troop.health -= this.damage
                stats.damageDealt += this.damage
            }
        }
    }
}

class ExplodingTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}, troopStats: trooperStatsInterface = troopArr[6]) {
        super(troopStats, side, player.visualize, multiplier, specialParameters);
        // @ts-ignore
        if (player.visualize) Array.from(document.getElementsByClassName(`${this.side}Button`)).forEach(btn => {
            if (btn.id === troopArr[6].name) {
                // @ts-ignore
                btn.disabled = true
                setTimeout(() => {
                    // @ts-ignore
                    btn.disabled = false
                }, 400)
            }
        })

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

    timeAttackBase(time: number, base: baseInterface, stats: statsInterface) {
        this.deleteAnim()
        super.timeAttackBase(time, base, stats);
    }

    attackBase(base: baseInterface, stats: statsInterface) {
        this.health = 0
        super.attackBase(base, stats);
    }

    isInFront(playerUnits: Array<trooperStatsInterface>, index: number): boolean {
        if (playerUnits.length) {
            if ((this.side === 'left' && playerUnits[0].side === 'left') ||
                (this.side === 'right' && playerUnits[0].side === 'right')) return false
        }
        return super.isInFront(playerUnits, index);
    }

    deleteAnim(position: number = this.position) {
        if (this.visualize) {
            cx.fillStyle = 'red'
            cx.beginPath();
            cx.arc(this.position, canvasHeight - 65, 20, 0, 2 * Math.PI);
            cx.fill()
            cx.drawImage(explosionIMG, this.position - this.span / 2 - 34, canvasHeight - 65 - 35 / 2);
        }
    }
}

class DoggoTroop extends Trooper {
    // index: number
    // amountOfDogsPresent: number = 0
    protected puppy: boolean = false
    multiplier: number
    // player: playerInterface
    // playerUnits: Array<trooperStatsInterface>

    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(troopArr[7], side, player.visualize, multiplier, specialParameters);
        if (!playingHostedGame && player.playerUnits.length >= 2) {
            if (player.playerUnits[player.playerUnits.length - 1].name === troopArr[7].name && player.playerUnits[player.playerUnits.length - 2].name === troopArr[7].name) {
                this.puppy = true
            }
        }
        // console.log(player)
        if (this.puppy) {
            this.health = 22 * multiplier
            this.maxHealth = this.health * multiplier
            this.damage = 3.2 * multiplier
            this.attackSpeed = 10
            this.speed = 2.2
            this.span = 10
        }
        this.multiplier = multiplier
    }

    attack(enemyTroopers: Array<trooperStatsInterface>, stats: statsInterface) {
        if (this.puppy) this.damage = Math.random() * 6 * this.multiplier
        super.attack(enemyTroopers, stats);
    }

    draw() {
        if (this.visualize) {
            cx.fillStyle = this.color
            cx.fillRect(this.position - this.span / 2, canvasHeight - 45 + (this.span == 10 ? 5 : 0), this.span, (this.span == 10 ? 10 : 15))
            this.drawHealth()
        }
    }
}

class TrebuchetTroop extends Trooper { // trebuchet could also attack other trebuchets
    enemyBase: baseInterface

    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(troopArr[8], side, player.visualize, multiplier, specialParameters);
        this.enemyBase = player.enemyBase
    }

    timeAttack(time: number, enemyTroopers: Array<trooperStatsInterface>, stats: statsInterface) {
        if (this.side === 'left' && canvasWidth - this.position - 55 < this.range) {
            super.timeAttackBase(time, this.enemyBase, stats)
        } // attacks enemy base even when unit is close but base is far !!!
        else if (this.side === 'right' && this.position - this.range - 55 < 0) {
            super.timeAttackBase(time, this.enemyBase, stats)
        }
    }

    attackBase(base: baseInterface, stats: statsInterface) {
        super.attackBase(base, stats);

    }

    drawAttack(time: number) {
        if (this.visualize) {
            super.drawAttack(time);
            let y
            if (this.targetTime && this.targetTime - time <= this.attackSpeed / 5) y = canvasHeight - 100 -
                Math.abs(Math.sin(((this.attackSpeed / 5) / (this.targetTime - time)) / (this.attackSpeed / 5) * Math.PI)) * 100 + 5
            else y = canvasHeight - 100

            if (this.targetTime) {
                cx.fillStyle = 'silver'
                cx.beginPath()
                cx.arc(this.position + (this.side === 'left' ? (1 / (this.targetTime - time)) * (canvasWidth - this.position - 35) :
                    -(1 / (this.targetTime - time)) * (this.position - 35)), y, 10, 0, 2 * Math.PI); // y = canvasHeight - 100
                cx.fill()
            }
        }
    }
}

class AtomicTroop extends Trooper {
    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(troopArr[9], side, player.visualize, multiplier, specialParameters);
    }

    isInFront(playerUnits: Array<trooperStatsInterface>, index: number): boolean {
        this.health -= (this.maxHealth / 8) / canvasWidth
        return super.isInFront(playerUnits, index);
    }

    draw() {
        // cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35)
        super.draw();
        if (this.visualize) cx.drawImage(radiationSymbolIMG, this.position - this.span / 2 - 1, canvasHeight - 60)
    }
}

class AtomicBomb extends ExplodingTroop {
    // player: playerInterface
    // enemy: playerInterface
    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(side, player, enemy, multiplier, specialParameters, troopArr[10]);
        // this.player = player
        // this.enemy = enemy
        if (this.visualize) document.querySelectorAll('button').forEach(e => {
            if (e.id === troopArr[10].name) {
                e.disabled = true
                setTimeout(() => {
                    e.removeAttribute('disabled')
                }, 100000)
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
    constructor(side: string, player: playerInterface, enemy: playerInterface, multiplier: number, specialParameters: object = {}) {
        super(troopArr[11], side, player.visualize, multiplier, specialParameters);
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
                    e.style.backgroundColor = buttonBg
                    e.style.color = buttonColor
                })
            }, 22000)
        }
    }
}


let troopers = [BasicTroop, FastTroop, RangeTroop, AdvancedTroop, ShieldTroop, CatapultTroop, ExplodingTroop, DoggoTroop, TrebuchetTroop, AtomicTroop, AtomicBomb, BossTroop]

interface baseInterface {
    health: number
    position: number
    color: string
    span: number
    visualize?: boolean
    baseExposed?: boolean
    side?: string
    draw?: (multiplier: number) => void
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

    draw(multiplier: number): void {
        if (this.visualize) {
            cx.fillStyle = this.color
            cx.fillRect(this.position, canvasHeight - 105, this.span, 75)
        }
        if (canvasHeight - 105 - multiplier < canvasHeight - 105 - 50) {
            multiplier = canvasHeight - 105 - 50
            Base.drawCross(this.position + this.span / 2, 26, this.visualize)
        }
        multiplier = (multiplier ** .1) * 165 - 165
        if (this.visualize) {
            cx.fillStyle = this.color
            cx.fillRect(this.position, canvasHeight - 105 - multiplier, this.span, 75 + multiplier)
            this.drawHealth(115 + multiplier)
        }
    }

    private static drawCross(x: number, y: number, visualize: boolean): void {
        if (visualize) {
            cx.strokeStyle = 'red'
            cx.beginPath()
            cx.moveTo(x, y - 7)
            cx.lineTo(x, y + 7)
            cx.moveTo(x - 7, y)
            cx.lineTo(x + 7, y)
            cx.stroke()
        }
    }

    private drawHealth(y: number) {
        cx.fillStyle = 'lightgray'
        cx.fillRect(this.position, canvasHeight - y, this.span, 5)
        cx.fillStyle = 'red'
        cx.fillRect(this.position, canvasHeight - y, this.health / this.maxHealth * this.span, 5)
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

    boomerDoomer(position: number): void;
}

class Game implements gameInterface {
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

        if (!this.players[0].checkForTroops()) {
            this.players[1].attackBase(this.time, this.playerOneBase)
        }
        if (!this.players[1].checkForTroops()) {
            this.players[0].attackBase(this.time, this.playerTwoBase)
        }

        if (this.players[0].checkForTroops()) this.players[1].handleRangeAttack(this.time)
        if (this.players[1].checkForTroops()) this.players[0].handleRangeAttack(this.time)

        this.players[0].checkForDeath(this.players[1])
        this.players[1].checkForDeath(this.players[0])

        // this.players[0].doesBaseHaveHealth()
        // this.players[1].doesBaseHaveHealth()

        this.display()
    }

    display() {
        this.playerOneBase.draw(this.players[0].multiplier)
        this.playerTwoBase.draw(this.players[1].multiplier)
        for (let unit of this.playerOneUnits) {
            unit.draw()
            unit.drawAttack(this.time)
        }
        for (let unit of this.playerTwoUnits) {
            unit.draw()
            unit.drawAttack(this.time)
        }
    }

    boomerDoomer(position: number) {

    }

    animation(): void {
        let move = () => {
            this.move()
        }
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
            while (aliveBases() && this.playerOneUnits.length && this.playerTwoUnits.length && this.time < 120000) { //
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
    multiplier: number
    // unlockUnits: () => void
    // addTroopTimed: (stats: trooperStatsInterface) => void

}

class Player implements playerInterface {
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
    multiplier: number = 1

    constructor(money = 0, side: string, checkForAvailMoney: boolean) {
        this.money = money
        this.side = side
        this.score = 0
        this.exp = 0
        this.checkForMoneyAvail = checkForAvailMoney
        // this.playerUnits = playerUnits
        // this.enemyUnits = enemyUnits
        this.unlockedUnits = [true, false, false, false, false, false, false, false, false, false, false, false]
        // this.unlockedUnits = [true, true, true, true, true, true, true, true, true, true, true, true]
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

    map(enemy: playerInterface, visualize: boolean, DOMAccess: boolean, playerUnits: Array<trooperStatsInterface>, startingPlayerUnits: Array<number>,
        enemyUnits: Array<trooperStatsInterface>, enemyBase: baseInterface, playerBase: baseInterface, game: gameInterface) {
        this.enemy = enemy
        this.visualize = visualize
        this.DOMAccess = DOMAccess
        this.enemyBase = enemyBase
        this.playerBase = playerBase
        this.playerUnits = playerUnits
        if (!this.checkForMoneyAvail && visualize) {
            document.getElementById(`${this.side}Money`).innerHTML = ``
            document.getElementById('shBot').style.height = '30px'
            this.unlockedUnits = [true, true, true, true, true, true, true, true, true, true, true, true]
            this.money = 1999
        }
        if (startingPlayerUnits.length > 0) {
            startingPlayerUnits.forEach(i => this.addTroop(i))
        }
        this.enemyUnits = enemyUnits
        this.game = game

        this.unlockUnits()
    }

    addTroop(index: number, params: trooperStatsInterface | object = {}): void {
        // if (this.playerUnits.length) {
        //     for (let unit of this.playerUnits) {
        //         if (troopArr[5].name === troopArr[index].name && unit.name === troopArr[5].name) return
        //     }
        // }
        if (index === undefined) return
        if (this.isEnoughMoney(troopArr[index].price) && this.playerUnits.length < this.maxUnits) {
            if (this.DOMAccess) {
                this.stats.units[Object.keys(this.stats.units)[index]] += 1
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
            }

            this.stats.spending += troopArr[index].price
            this.addFunds(-troopArr[index].price)
            this.playerUnits.push(new troopers[index](this.side, this, this.enemy, this.multiplier, params))
        }
    }

    // addTroopTimed(stats: trooperStatsInterface): void {
    //
    // }

    doesBaseHaveHealth(): boolean {
        if (this.playerBase.health <= 0) {
            if (this.visualize) console.log('Base destroyed: ', this.playerBase,
                '\nLeft used units:', this.game.players[0].stats.units, 'Right used units:', this.game.players[1].stats.units)
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
                    // this.stats.damageDealt += unit.damage
                    // console.log(this.stats.damageDealt)
                }
            }
            if (unit.range) {
                if (this.side === 'right' && unit.position - unit.range <= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits, this.stats)
                    // this.stats.damageDealt += unit.damage
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
                        setTimeout(() => {
                            this.game.atomicDoomPending = false
                        }, 22000)
                    } else if (playerUnit.name === troopArr[6].name) {
                        this.game.boomerDoomer(playerUnit.position)
                        enemy.addFunds(playerUnit.price * 2.5)
                        // this.boomerDoomer(playerUnit.position)
                    }
                    // @ts-ignore
                    else if (playerUnit.name === troopArr[7].name && playerUnit.puppy) {
                        enemy.addFunds(playerUnit.price * 2)
                    } else {
                        enemy.addFunds(playerUnit.price * 3)
                    }
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
                if (this.side === 'left' && unit.position >= canvasWidth - 55 - unit.range) {
                    unit.timeAttackBase(time, enemyBase, this.stats)
                }
                if (this.side === 'right' && unit.position <= 55 + unit.range) unit.timeAttackBase(time, enemyBase, this.stats)
            }
        }
    }

    moveArmy() {
        if (deathAnimPending) return
        for (let i = 0; i < 2; i++) {
            this.playerUnits.forEach((troop, i) => {
                if (this.side === 'left') {
                    if (!troop.isInFront(this.playerUnits, i) && !troop.isInFront(this.enemyUnits, 1) &&
                        troop.position < canvasWidth - baseStats.span - 10) {
                        troop.position += troop.speed / 2
                    }
                } else if (this.side === 'right') {
                    if (!troop.isInFront(this.playerUnits, i) && !troop.isInFront(this.enemyUnits, 1) &&
                        troop.position > baseStats.span + 10) {
                        troop.position -= troop.speed / 2
                    }
                }
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
                button.innerHTML = `<span style="color: ${stat.color}"><i class="fa-circle"></i></span> ${stat.name}: ${stat.price}`
                div.appendChild(button)
                button.className = this.side + 'Button'
                button.id = stat.name
                div.appendChild(document.createElement('br'))
                if (!this.unlockedUnits[i]) button.innerHTML = `<span style="color: ${stat.color}"><i class="fas fa-lock"></i></span> Purchase for ${troopArr[i].researchPrice}`
                if (bindEventListeners) button.addEventListener('click', () => {
                    if (!this.unlockedUnits[i]) this.purchaseUnit(i, button)
                    else if (this.unlockedUnits[i] && !this.isEnoughMoney(stat.price)) {
                        this.redden(button, 280)
                    } else if (this.playerUnits.length >= 10) {
                        this.redden(button, 180)
                    } else if (this.unlockedUnits[i]) this.addTroop(i)
                    if (this.checkForMoneyAvail) document.getElementById(`${this.side}Money`).innerHTML = `Money: ${Math.round(this.money)}`
                    else {
                        document.getElementById(`${this.side}Money`).innerHTML = ``
                    }
                })
            })
            div.appendChild(document.createElement('hr'))
            let button = document.createElement('button')
            button.innerHTML = `Increase all troop stats by 20%: 1500`

            div.appendChild(button)
            button.id = 'incMult'
            if (bindEventListeners) {
                button.addEventListener('click', () => {
                    if (this.isEnoughMoney(1500)) {
                        this.multiplier *= 1.2
                        this.addFunds(-1500)
                        // console.log(this.multiplier)
                    } else this.redden(button, 800)
                })
            }
            // for (let i = 0; i <= 10; i++) {
            div.appendChild(document.createElement('br'))
            // }
        }
    }

    protected redden(element: HTMLElement, time: number) {
        element.style.backgroundColor = 'red'
        setTimeout(() => {
            element.style.backgroundColor = buttonBg
        }, time)

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
                if (this.DOMAccess) element.innerHTML =
                    `<span style="color: ${troopArr[index].color}"><i class="fa-circle"></i></span> ${troopArr[index].name}: ${troopArr[index].price}`
            } catch (e) {
            }
            // document.querySelectorAll(`.${this.side}`)[index].removeAttribute('disabled')
        } else {
            // @ts-ignore
            this.redden(element, 520)
        }
    }
}


// This bot is an idiot and should not be used!
// His performance, however, is, compared to other options, spectacular
/*
class CalculatingBot extends Player implements playerInterface {
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
                let i = this.neededUnit()
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

    healthOverall(units: Array<trooperStatsInterface>): number {
        let healthOfTroops = 0
        for (let unit of units) {
            healthOfTroops += unit.health
        }
        return healthOfTroops
    }

    neededUnit(): number {
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
*/

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
        if (this.money > 1800) {
            this.multiplier *= 1.2
            this.addFunds(-1500)
        }
        let enc = this.encouragement()
        if (enc > 50 && this.playerUnits.length <= 1) this.addTroop(0)
        document.getElementById(`pull${this.side}`).innerText = 'Mode: ' + (enc > 2 ? 'Panic' : this.shouldPull(0, enc) ? 'Pull' : 'Normal')
        if (this.cooldown <= 0 && !this.shouldPull(1, enc)) {
            if (enc >= .8 && !this.working && this.playerUnits.length < this.maxUnits) {
                this.working = true
                let cancelWork = () => this.working = false
                let addTroop = (i) => this.addTroop(i)
                let side = this.side
                let p = performance.now()
                let worker = new Worker('index.js')
                worker.postMessage([this.parseUnits(this.playerUnits), this.parseUnits(this.enemyUnits),
                    this.unlockedUnits, 'right', this.money, this.game, enc > 3])
                worker.onmessage = function (e) {
                    // console.log(e.data)
                    if (e.data.length) addTroop(e.data[0])
                    if (enc > 1.8) addTroop(e.data[1])
                    if (enc > 2.8) addTroop(e.data[2])
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
            this.unlockedUnits.forEach(e => {
                if (e) {
                    numberOfUnlockedUnits++
                }
            })
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
            if (this.roundsSpentAtOpponentsHalf > 2700) { // 45 seconds = 2700
                return true
            }
        }
        return false
    }

    tryToUnlock() {
        if (!this.unlockedUnits[this.unlockedUnits.length - 1] && this.money > troopArr[this.toUnlockUnit].researchPrice * 1.25) {
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
            } else if (this.unlockedUnits[4] && enc <= .1 && this.unlockedUnits[3]) {
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
        } else if (!stats.enemyUnitsLength) return 0
        else return 10
    }

    purchaseUnit(index) {
        if (this.isEnoughMoney(troopArr[index].researchPrice)) {
            this.money -= troopArr[index].researchPrice
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
    playerMultiplier: number = 1
    enemyMultiplier: number = 1
    checkForAvailMoney: boolean
    boomerDoom: boolean = false
    boomerDoomAt: number = -1
    private cash = 0

    constructor(money, side, checkForAvailMoney, address: string) {
        super(money, side, checkForAvailMoney);
        playingHostedGame = true
        let socket = io(address) // ws://localhost:8080
        // this.map(new Player(1000, 'right', false), true, true, [], [], [], new Base(baseStats, 'right'), new Base(baseStats, 'left'))
        this.DOMAccess = true
        this.playerUnits = []
        this.enemyUnits = []
        this.firstTimeAtomicDoom = true
        socket.on('mess', message => {
            console.log(message)
        })

        socket.on('side', (side, checkForAvailMoney, unlockedUnits) => {
            if (side === 'Server Full') {
                this.message = 'Logged in as spectator'
                setTimeout(() => {
                    this.message = ''
                }, 7000)
                return
            } else {
                this.checkForAvailMoney = checkForAvailMoney
                console.log('Overdraft:', !checkForAvailMoney)
                this.side = side
                console.log('side: ', this.side)
                this.unlockedUnits = unlockedUnits
                if (side) this.addGUI(socket)
            }
        })
        socket.on('getSide', () => {
            socket.emit('getSide', this.side)
        })
        socket.on('boomer', position => {
            this.boomerDoom = true
            this.boomerDoomAt = position
            setTimeout(() => {
                this.boomerDoom = false
            }, 85)
        })

        if (this.side || this.spectator) socket.on('game', (playerOneBase, playerTwoBase, playerOneUnits, playerTwoUnits,
                                                            leftMoney, rightMoney, time) => {
            this.updateMoney(leftMoney, rightMoney, playerOneUnits.length, playerTwoUnits.length)
            if (this.side === 'left') this.display(playerOneBase, playerTwoBase, playerOneUnits, playerTwoUnits, time)
            else if (this.side === 'right') this.display(playerTwoBase, playerOneBase, playerTwoUnits, playerOneUnits, time)
        });

        socket.on('atomic', (atomicDoomPending) => {
            if (atomicDoomPending && this.firstTimeAtomicDoom) {
                // console.log('atomicDoomPending')
                this.firstTimeAtomicDoom = false

                holdDeathAnim(canvasWidth / 2, 28, true)
                setTimeout(() => {
                    this.firstTimeAtomicDoom = true
                }, 22000)
            }
        })

        socket.on('win', message => {
            this.message = message
            setTimeout(() => {
                location.reload()
            }, 7500)
        })

        socket.on('multiplier', (left, right) => {
            if (this.side === 'left') {
                this.playerMultiplier = left
                this.enemyMultiplier = right
            }
            if (this.side === 'right') {
                this.playerMultiplier = right
                this.enemyMultiplier = left
            }
        })

        socket.on('message', message => {
            this.message = message
            this.displayText(message)
        })
    }

    configBases(playerBase, enemyBase) {
        InternetPlayer.draw(playerBase, this.playerMultiplier)
        InternetPlayer.draw(enemyBase, this.enemyMultiplier)
    }

    boomerBoom(position: number) {
        cx.drawImage(explosionIMG, position - 20 / 2 - 34, canvasHeight - 65 - 35 / 2);
    }

    displayText(text: string) {
        cx.fillStyle = "red";
        if (text.length > 10) {
            cx.font = "30px Arial"
            cx.fillStyle = "green";
        } else cx.font = "45px Arial"
        cx.textAlign = "center";
        cx.fillText(`${text}`, canvasWidth / 2, canvasHeight / 2);
    }

    private static draw(base: baseInterface, multiplier: number): void {
        multiplier = (multiplier ** .1) * 165 - 165
        if (canvasHeight - 105 - multiplier < canvasHeight - 105 - 50) {
            this.drawCross(base.position + base.span / 2, 26)
        }
        if (canvasHeight - 105 - multiplier < canvasHeight - 105 - 50) multiplier = canvasHeight - 105 - 80
        cx.fillStyle = base.color
        cx.fillRect(base.position, canvasHeight - 105 - multiplier, base.span, 75 + multiplier)
        cx.fillStyle = 'lightgray'
        cx.fillRect(base.position, canvasHeight - 115 - multiplier, base.span, 5)
        cx.fillStyle = 'red'
        cx.fillRect(base.position, canvasHeight - 115 - multiplier, base.health / 800 * base.span, 5)
    }

    private static drawCross(x, y): void {
        cx.strokeStyle = 'red'
        cx.beginPath()
        cx.moveTo(x, y - 7)
        cx.lineTo(x, y + 7)
        cx.moveTo(x - 7, y)
        cx.lineTo(x + 7, y)
        cx.stroke()
    }

    display(playerOneBase: baseInterface, playerTwoBase: baseInterface,
            playerUnits: Array<trooperStatsInterface>, enemyUnits: Array<trooperStatsInterface>, time: number) {
        this.playerUnits = []
        this.enemyUnits = []

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
        if (this.boomerDoom) this.boomerBoom(this.boomerDoomAt)

        if (this.message) this.displayText(this.message)
    }

    addTroopToEnemy(index: number, params: trooperStatsInterface) {
        this.enemyUnits.push(new troopers[index]((this.side === 'left' ? 'right' : 'left'), this, this.enemy, this.multiplier, params))
    }

    addGUI(socket: WebSocket) {
        document.querySelectorAll('button').forEach(button => button.remove())
        document.querySelectorAll('br').forEach(br => br.remove())
        document.querySelectorAll('hr').forEach(hr => hr.remove())
        // if (this.spectator) return
        this.unlockUnits(false)
        //@ts-ignore
        let buttons = Array.from(document.getElementsByClassName(this.side + 'Button'))
        buttons.forEach((button, i) => {
            if (i >= troopArr.length) return
            button.addEventListener('click', () => {
                if ((!this.unlockedUnits[i] && this.cash >= troopArr[i].researchPrice) || !this.checkForAvailMoney) {
                    this.purchaseUnit(i, button)
                    // @ts-ignore
                    socket.emit(`unlockTroop`, this.side, i)
                } else if (this.unlockedUnits[i] && this.cash < troopArr[i].price) {
                    // @ts-ignore
                    this.redden(button, 280)
                } else if (this.playerUnits.length >= 10) {
                    //@ts-ignore
                    this.redden(button, 180)
                } else if (this.unlockedUnits[i]) {
                    // @ts-ignore
                    socket.emit(`AddTroop`, this.side, i)
                } else {
                    // @ts-ignore
                    this.redden(button, 500)
                }
            })
        })
        document.getElementById('incMult').addEventListener('click', () => {
            if (this.money < 1500) {
                this.redden(document.getElementById('incMult'), 800)
            }
            // @ts-ignore
            socket.emit('multiplier', this.side)
        })
    }

    updateMoney(leftMoney: number, rightMoney: number, leftTroops: number, rightTroops: number) {
        if (this.side === 'left') {
            this.money = leftMoney
            this.cash = leftMoney
        } else {
            this.money = rightMoney
            this.cash = rightMoney
        }
        document.getElementById('leftMoney').innerText = `Money: ${leftMoney}`
        document.getElementById('rightMoney').innerText = `Money: ${rightMoney}`
        document.getElementById('trsleft').innerText = `${leftTroops} / ${10}`
        document.getElementById('trsright').innerText = `${rightTroops} / ${10}`

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
        troopArr: troopArr,
    }
} catch (e) {
}

function initializeUI() {
    document.getElementById('leftMoney').style.display = 'initial'
    document.getElementById('rightMoney').style.display = 'initial'
    document.getElementById('startingScreen').style.display = 'none'
    document.getElementById('cx').style.display = 'initial'
    document.getElementById('controls').style.display = ''
    document.getElementById('shBot').style.display = 'block'
    window.addEventListener('resize', () => {
        resize()
    })
    resize()
}

function resize() {
    document.querySelectorAll('button').forEach(e => {
        if (document.body.scrollWidth > 440) {
            e.style.width = 200 + 'px'
            if (darkTheme) e.style.boxShadow = '0 0 15px 4px rgb(14, 14, 14)'
            e.style.margin = '4px'
            return
        }
        if (document.body.scrollWidth <= 440) {
            e.style.width = 'auto'
        }
        if (darkTheme) e.style.boxShadow = '0 0 7px 2px rgb(20,20,20)'
        e.style.margin = '0'
        e.style.marginTop = '5px'
        e.style.backgroundColor = buttonBg

    })
    let cxHeight = document.getElementById('cx').offsetHeight
    document.getElementById('controls').style.height = window.innerHeight - cxHeight - 50 + 'px'
}


try {
    let hostIP = self.location.hostname
    let hostPort = '8083'
    let onlineConnection = false
    let game

    let audioPlaying = false
    let audio = new Audio('img/Age of War - Theme Soundtrack.mp3');
    document.getElementById('music').addEventListener('click', () => {
        if (!audioPlaying) {
            audio.play().then(() => {
            });
            audio.loop = true
        } else audio.pause()
        audioPlaying = !audioPlaying
    })
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
            game = new Game(new Player(55, 'left', !shiftDown),
                new Player(55, 'right', !shiftDown),
                true, true, [], [])
            initializeUI()
        }
    )
    document.getElementById('bot').addEventListener('click', () => {
            game = new Game(new Player(55, 'left', !shiftDown),
                new SimulatingBot(55, 'right', !shiftDown),
                true, true, [], [])

            initializeUI()
        }
    )
    document.getElementById('mul').addEventListener('click', () => {
            let address
            // let address = prompt('Enter address:', `http://${hostIP}:${hostPort}`)
            // let address = `http://${hostIP}:${hostPort}`
            if (onlineConnection) {
                address = prompt('Enter code:', '')
                if (address === null) return
                address = `http://${hostIP}:${address}`
            } else {
                address = prompt('Enter address:', `http://localhost:${8085}`)
                if (address === null) return
            }
            new InternetPlayer(0, 'left', false, address)
            initializeUI()
        }
    )
    document.getElementById('code').addEventListener('click', () => {
        // document.getElementById('code').innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${document.getElementById('code').innerHTML}`
        let address
        if (onlineConnection) {
            address = `http://${hostIP}:${hostPort}`
        } else {
            address = prompt('Enter server address:', `http://localhost:8080`)
            if (address === null) return
        }

        fetch(address, {
            headers: new Headers(),
            method: 'POST'
        }).then((res) => {
            res.json().then(res => {
                console.log(res)
                if (res === 'Too many requests') {
                    alert('Too many requests, please wait a moment')
                    return
                }
                alert(`Game code is: ${res}`)
                new InternetPlayer(0, 'left', false, `${hostIP}:${res}`)
                initializeUI()
            })
        })
    })

    setTimeout(() => {
        if (!onlineConnection) {
            document.getElementById('onlineIndicator').innerHTML =
                '<span style="color: red">&#10006;</span> Play online:<br><a href="https://github.com/SeezoCode/AgeOfWar/blob/master/README.md"' +
                ' target="blank">How to host the server</a>'
            // @ts-ignore
            document.getElementById('mul').disabled = false
            // @ts-ignore
            document.getElementById('code').disabled = false
        }
    }, 5000)
    fetch(`http://${hostIP}:${hostPort}`, {
        headers: new Headers(),
        method: 'GET'
    }).then((res) => {
        res.json().then((mess) => {
            if (mess != 'Available') return
            document.getElementById('onlineIndicator').style.color = 'green'
            document.getElementById('onlineIndicator').innerHTML = '&#10004; Play online: Available!'
            // @ts-ignore
            document.getElementById('mul').disabled = false
            // @ts-ignore
            document.getElementById('code').disabled = false
            onlineConnection = true
        })
    }).catch(err => {
        console.log(err)
        document.getElementById('onlineIndicator').innerHTML =
            '<span style="color: red">&#10006;</span> Play online:<br><a href="https://github.com/SeezoCode/AgeOfWar/blob/master/README.md"' +
            ' target="blank">How to host the server</a>'
        // @ts-ignore
        document.getElementById('mul').disabled = false
        // @ts-ignore
        document.getElementById('code').disabled = false
    })

    // ------ //
    //@ts-ignore
    window.cheat1000 = function (side: string = '', amount: number = 1000) {
        if (!playingHostedGame && (side === 'left' || side === 'right')) {
            game.players[side === 'left' ? 0 : 1].money += amount
            document.getElementById(`${side}Money`).innerHTML = `Money: ${game.players[side === 'left' ? 0 : 1].money}`
        } else {
            let a = document.createElement('a');
            let link = document.createTextNode("");
            a.appendChild(link);
            a.href = "https://youtu.be/dQw4w9WgXcQ";
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            a.style.display = ''
        }
    }

}
// catch (e) {}


catch (e) {
    try {
        onmessage = function (e) {
            // e[0] playerTroops e[1] enemyTroops e[2] unlockedUnits e[3] side e[4] money e[5] game e[6] quick compute mode
            // console.log(e);
            let bestDPM = -9999;
            let bestStats;
            let bestTroops = [];
            let numberOfUnlockedUnits = 0;
            e.data[2].forEach(function (e) {
                return e ? numberOfUnlockedUnits++ : 0;
            });
            if (numberOfUnlockedUnits >= troopArr.length - 2) {
                numberOfUnlockedUnits = troopArr.length - 2
            }
            // if (numberOfUnlockedUnits >= 4) numberOfUnlockedUnits = 4
            // let p = performance.now()
            if (!e[6]) {
                for (let i = 0; i < numberOfUnlockedUnits; i++) { // - trebuchet
                    if (i === 8) continue;
                    for (let j = 0; j < numberOfUnlockedUnits; j++) {
                        if (j === 8 || (i === 6 && j === 6)) continue;
                        for (let k = 0; k < numberOfUnlockedUnits; k++) {
                            if (((i === 6 && k === 6) || (j === 6 && k === 6))) continue;
                            let plTroops = e.data[0].slice();
                            plTroops.push(i);
                            plTroops.push(j);
                            plTroops.push(k);
                            // let p = performance.now()
                            simulationHandler(plTroops)
                        }
                    }
                }
            } else {
                for (let i = 0; i < numberOfUnlockedUnits; i++) { // - trebuchet
                    if (i === 8) continue;
                    for (let j = 0; j < numberOfUnlockedUnits; j++) {
                        if (j === 8 || (i === 6 && j === 6)) continue;
                        if (j === 6) continue;
                        let plTroops = e.data[0].slice();
                        plTroops.push(i);
                        plTroops.push(j);
                        simulationHandler(plTroops)
                    }
                }
            }

            function simulationHandler(plTroops: Array<number>) {
                let game = simulate(plTroops, e.data[1].slice());
                let stats = getGameStats(game);
                stats.playerUnitsLength = game.players[0].playerUnits.length;
                stats.enemyUnitsLength = game.players[1].enemyUnits.length;
                if (damageCalc(stats) > bestDPM && Math.random() > .2) {
                    bestDPM = damageCalc(stats);
                    bestStats = stats;
                    bestTroops = [plTroops[plTroops.length - 3], plTroops[plTroops.length - 2], plTroops[plTroops.length - 1]];
                }
            }

            // console.log(bestDPM, bestStats, bestTroops);
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
                stats.playerSpending = game.players[0].stats.spending;
                stats.playerDamage = game.players[0].stats.damageDealt;
                stats.enemyDamage = game.players[1].stats.damageDealt;
                return stats;
            }

            function damageCalc(stats): number {
                // if (stats.playerSpending > e.data[4])
                //     return 0;
                return (stats.playerDamage / stats.playerSpending);
            }

            // @ts-ignore
            postMessage(bestTroops);
        };
    } catch (e) {
        // console.log(e)

        // new Game(new InternetPlayer(55, 'left', !shiftDown),
        //     new InternetPlayer(55, 'right', !shiftDown),
        //     true, true, [], [])

    }
}
