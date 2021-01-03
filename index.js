var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var canvasWidth, canvasHeight, cx, explosionIMG, color;
try {
    var ctx = document.querySelector('canvas');
    canvasWidth = ctx.width = 700;
    canvasHeight = ctx.height = 250;
    console.log(ctx);
    cx = ctx.getContext('2d');
    explosionIMG = new Image(68, 55);
    explosionIMG.src = 'explosion.png';
    console.log('Running in Browser');
    color = document.querySelector('button');
    color = getComputedStyle(color).backgroundColor;
}
catch (e) {
    // console.log('Running node.js huh?')
    canvasWidth = 700;
    canvasHeight = 250;
}
var troopArr = [
    {
        name: 'Basic Troop', health: 20, damage: 4.5, baseDamage: 4, attackSpeed: 40, castingTime: 1, price: 5, color: 'limegreen', speed: 1, span: 20, range: 0, researchPrice: 0
    },
    {
        name: 'Fast Troop', health: 18, damage: 1.3, baseDamage: .8, attackSpeed: 15, castingTime: 1.6, price: 5, color: 'lightpink', speed: 2.5, span: 15, range: 10, researchPrice: 60
    },
    {
        name: 'Range Troop', health: 20, damage: 4.5, baseDamage: 3, attackSpeed: 50, castingTime: 1.2, price: 8, color: 'blue', speed: 1, span: 20, range: 79, researchPrice: 100
    },
    {
        name: 'Advanced Troop', health: 35, damage: 12, baseDamage: 5, attackSpeed: 80, castingTime: 1.6, price: 10, color: 'darkgreen', speed: 1, span: 20, range: 0, researchPrice: 250
    },
    {
        name: 'Base Destroyer Troop', health: 40, damage: 2, baseDamage: 35, attackSpeed: 140, castingTime: 3, price: 50, color: 'yellow', speed: .5, span: 45, range: 0, researchPrice: 400
    },
    {
        name: 'Boomer Troop', health: 1, damage: 40, baseDamage: 30, attackSpeed: 17, castingTime: 1.6, price: 40, color: 'red', speed: 1, span: 20, range: 21, researchPrice: 550
    },
    {
        name: 'Shield Troop', health: 65, damage: .5, baseDamage: 1, attackSpeed: 500, castingTime: 3, price: 50, color: 'cadetblue', speed: 1, span: 20, range: 0, researchPrice: 550
    },
    {
        name: 'Healer Troop', health: 4, damage: 2.5, baseDamage: 0, attackSpeed: 60, castingTime: 1, price: 75, color: 'hotpink', speed: 1.5, span: 20, range: 31, researchPrice: 800
    },
    {
        name: 'Trebuchet Troop', health: 5, damage: 0, baseDamage: 100, attackSpeed: 300, castingTime: 3, price: 300, color: 'brown', speed: .3, span: 50, range: 200, researchPrice: 2000
    },
];
var baseStats = {
    health: 800, position: 0, color: 'royalblue', span: 45
};
var Trooper = /** @class */ (function () {
    function Trooper(stats, side, visualize) {
        this.health = stats.health;
        this.damage = stats.damage;
        this.castingTime = stats.castingTime;
        this.color = stats.color;
        this.speed = stats.speed;
        this.span = stats.span;
        this.side = side;
        this.attackSpeed = stats.attackSpeed;
        this.targetTime = null;
        this.maxHealth = stats.health;
        this.range = stats.range;
        this.price = stats.price;
        this.baseDamage = stats.baseDamage;
        this.visualize = visualize;
        this.name = stats.name;
        if (side === 'left')
            this.position = 10;
        if (side === 'right')
            this.position = canvasWidth - 10;
    }
    Trooper.prototype.attack = function (enemyTroopers, stats) {
        // console.log('attacked enemy: ', enemyTroopers)
        if (enemyTroopers.length) {
            stats.damageDealt += enemyTroopers[0].health < 0 ? 0 :
                enemyTroopers[0].health < this.damage ?
                    enemyTroopers[0].health : this.damage;
            enemyTroopers[0].health -= this.damage;
        }
    };
    Trooper.prototype.timeAttack = function (time, enemyTroopers, stats) {
        // if (this.visualize) {
        if (this.targetTime === null)
            this.targetTime = time + this.attackSpeed;
        else if (time === this.targetTime) {
            this.attack(enemyTroopers, stats);
            this.targetTime = null;
        }
        // }
        // else this.attack(enemyTroopers, stats) // This is a shortcut, may not be as precise!
    };
    Trooper.prototype.isInFront = function (playerUnits, index) {
        // takes an array and queue number to find out if one in front of him is '11' near
        if (index === 0)
            return false;
        // if (!this.visualize) return true // increases performance thrice, but isn't very precise, shortcut
        if (playerUnits.length === 0)
            return false;
        if (this.side === 'left') {
            for (var i = index - 1; i >= 0; i--) {
                if (this.position <= playerUnits[i].position &&
                    this.position + this.span / 2 + 2 > playerUnits[i].position - playerUnits[i].span / 2) {
                    return true;
                }
            }
        }
        if (this.side === 'right') {
            for (var i = index - 1; i >= 0; i--) {
                if (this.position >= playerUnits[i].position &&
                    this.position - this.span / 2 - 2 < playerUnits[i].position + playerUnits[i].span / 2) {
                    return true;
                }
            }
        }
        return false;
    };
    Trooper.prototype.timeAttackBase = function (time, base) {
        if (this.visualize) {
            if (this.targetTime === null)
                this.targetTime = time + this.attackSpeed;
            else if (time >= this.targetTime) {
                this.attackBase(base);
                // console.log('Attack Base !!!!!!!!')
                this.targetTime = null;
            }
        }
        else
            this.attackBase(base); // This is a shortcut, may not be as precise!
    };
    Trooper.prototype.attackBase = function (base) {
        base.health -= this.baseDamage;
    };
    Trooper.prototype.draw = function () {
        if (this.visualize) {
            cx.fillStyle = this.color;
            cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35);
            this.drawHealth();
        }
    };
    Trooper.prototype.drawHealth = function () {
        cx.fillStyle = 'lightgray';
        cx.fillRect(this.position - this.span / 2, canvasHeight - 75, this.span, 5);
        cx.fillStyle = 'red';
        cx.fillRect(this.position - this.span / 2, canvasHeight - 75, this.health / this.maxHealth * this.span, 5);
    };
    Trooper.prototype.drawAttack = function (time) {
        if (this.visualize) {
            if (this.targetTime !== null) {
                cx.fillStyle = "rgb(" + (255 - (1 / (this.targetTime - time)) * 255) + ", " + (255 - (1 / (this.targetTime - time)) * 255) + ", 255)";
                cx.fillRect(this.position - this.span / 2, canvasHeight - 85, this.span, 5);
            }
        }
    };
    Trooper.prototype.deleteAnim = function () {
    };
    return Trooper;
}());
var BasicTroop = /** @class */ (function (_super) {
    __extends(BasicTroop, _super);
    function BasicTroop(side, player, enemy) {
        return _super.call(this, troopArr[0], side, player.visualize) || this;
    }
    return BasicTroop;
}(Trooper));
var FastTroop = /** @class */ (function (_super) {
    __extends(FastTroop, _super);
    function FastTroop(side, player, enemy) {
        return _super.call(this, troopArr[1], side, player.visualize) || this;
    }
    return FastTroop;
}(Trooper));
var RangeTroop = /** @class */ (function (_super) {
    __extends(RangeTroop, _super);
    function RangeTroop(side, player, enemy) {
        return _super.call(this, troopArr[2], side, player.visualize) || this;
    }
    return RangeTroop;
}(Trooper));
var AdvancedTroop = /** @class */ (function (_super) {
    __extends(AdvancedTroop, _super);
    function AdvancedTroop(side, player, enemy) {
        return _super.call(this, troopArr[3], side, player.visualize) || this;
    }
    return AdvancedTroop;
}(Trooper));
var BaseDestroyerTroop = /** @class */ (function (_super) {
    __extends(BaseDestroyerTroop, _super);
    function BaseDestroyerTroop(side, player, enemy) {
        return _super.call(this, troopArr[4], side, player.visualize) || this;
    }
    BaseDestroyerTroop.prototype.drawAttack = function (time) {
        if (this.targetTime !== null && this.visualize) {
            _super.prototype.drawAttack.call(this, time);
            cx.fillStyle = 'orangered';
            cx.fillRect(this.position - (this.side === 'left' ? this.span / 4 : -this.span / 4), canvasHeight - 45, this.side === 'left' ? (1 / (this.targetTime - time)) * this.span : -(1 / (this.targetTime - time)) * this.span, 5);
        }
    };
    return BaseDestroyerTroop;
}(Trooper));
var ExplodingTroop = /** @class */ (function (_super) {
    __extends(ExplodingTroop, _super);
    function ExplodingTroop(side, player, enemy) {
        return _super.call(this, troopArr[5], side, player.visualize) || this;
    }
    ExplodingTroop.prototype.attack = function (enemyTroopers) {
        // console.log('attacked enemy BOOM: ', enemyTroopers)
        enemyTroopers[0].health -= this.damage;
        this.health = 0;
    };
    ExplodingTroop.prototype.timeAttack = function (time, enemyTroopers, stats) {
        this.deleteAnim();
        _super.prototype.timeAttack.call(this, time, enemyTroopers, stats);
    };
    ExplodingTroop.prototype.timeAttackBase = function (time, base) {
        this.deleteAnim();
        _super.prototype.timeAttackBase.call(this, time, base);
    };
    ExplodingTroop.prototype.attackBase = function (base) {
        this.health = 0;
        _super.prototype.attackBase.call(this, base);
    };
    ExplodingTroop.prototype.isInFront = function (playerUnits, index) {
        if (playerUnits.length) {
            if ((this.side === 'left' && playerUnits[0].side === 'left') ||
                (this.side === 'right' && playerUnits[0].side === 'right'))
                return false;
        }
        return _super.prototype.isInFront.call(this, playerUnits, index);
    };
    ExplodingTroop.prototype.deleteAnim = function () {
        if (this.visualize) {
            cx.fillStyle = 'red';
            cx.beginPath();
            cx.arc(this.position, canvasHeight - 65, 20, 0, 2 * Math.PI);
            cx.fill();
            cx.drawImage(explosionIMG, this.position - this.span / 2 - 34, canvasHeight - 65 - 35 / 2);
        }
    };
    return ExplodingTroop;
}(Trooper));
var ShieldTroop = /** @class */ (function (_super) {
    __extends(ShieldTroop, _super);
    function ShieldTroop(side, player, enemy) {
        return _super.call(this, troopArr[6], side, player.visualize) || this;
    }
    ShieldTroop.prototype.draw = function () {
        if (this.visualize) {
            cx.fillStyle = this.color;
            cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35);
            cx.fillStyle = 'brown';
            cx.fillRect(this.position - (this.side === 'left' ? 0 : this.span) + this.span / 2 - 3, canvasHeight - 65, 3, 35);
            this.drawHealth();
        }
    };
    return ShieldTroop;
}(Trooper));
var HealerTroop = /** @class */ (function (_super) {
    __extends(HealerTroop, _super);
    function HealerTroop(side, player, enemy) {
        var _this = _super.call(this, troopArr[7], side, player.visualize) || this;
        _this.index = null;
        _this.player = player;
        return _this;
    }
    HealerTroop.prototype.isInFront = function (playerUnits, index) {
        this.index = index;
        return _super.prototype.isInFront.call(this, playerUnits, index);
    };
    HealerTroop.prototype.attack = function (enemyTroopers) {
        this.heal();
    };
    HealerTroop.prototype.attackBase = function (base) {
        this.heal();
    };
    HealerTroop.prototype.heal = function () {
        var unitInFront = this.player.playerUnits[this.index - 1];
        if (this.player.playerUnits.length > 1)
            this.player.playerUnits[this.index - 1].health +=
                unitInFront.maxHealth - unitInFront.health < this.damage ? unitInFront.maxHealth - unitInFront.health : this.damage;
    };
    return HealerTroop;
}(Trooper));
var TrebuchetTroop = /** @class */ (function (_super) {
    __extends(TrebuchetTroop, _super);
    function TrebuchetTroop(side, player, enemy) {
        var _this = _super.call(this, troopArr[8], side, player.visualize) || this;
        _this.player = player;
        return _this;
    }
    TrebuchetTroop.prototype.timeAttack = function (time, enemyTroopers) {
        if (this.side === 'left' && canvasWidth - this.position - 55 < this.range) {
            _super.prototype.timeAttackBase.call(this, time, this.player.enemyBase);
        } // attacks enemy base even when unit is close but base is far !!!
        else if (this.side === 'right' && this.position - this.range - 55 < 0) {
            _super.prototype.timeAttackBase.call(this, time, this.player.enemyBase);
        }
    };
    TrebuchetTroop.prototype.drawAttack = function (time) {
        if (this.visualize) {
            _super.prototype.drawAttack.call(this, time);
            cx.fillStyle = 'silver';
            // could shoot in a curve
            cx.beginPath();
            cx.arc(this.position + (this.side === 'left' ? (1 / (this.targetTime - time)) * this.span :
                -(1 / (this.targetTime - time)) * this.range), canvasHeight - 100, 10, 0, 2 * Math.PI);
            cx.fill();
        }
    };
    return TrebuchetTroop;
}(Trooper));
// class PlaneTroop extends Trooper {
//     constructor(side: string, player: playerInterface, enemy: playerInterface) {
//         super(troopArr[9], side, player.visualize);
//     }
// }
var troopers = [BasicTroop, FastTroop, RangeTroop, AdvancedTroop, BaseDestroyerTroop, ExplodingTroop, ShieldTroop, HealerTroop, TrebuchetTroop];
var Base = /** @class */ (function () {
    function Base(stats, side, visualize) {
        if (visualize === void 0) { visualize = true; }
        this.baseExposed = false;
        this.health = stats.health;
        this.position = stats.position;
        this.color = stats.color;
        this.span = stats.span;
        this.maxHealth = stats.health;
        this.visualize = visualize;
        if (side === 'left')
            this.position = 5;
        if (side === 'right')
            this.position = canvasWidth - 50;
    }
    Base.prototype.draw = function () {
        if (this.visualize) {
            cx.fillStyle = this.color;
            cx.fillRect(this.position, canvasHeight - 105, this.span, 75);
            this.drawHealth();
        }
    };
    Base.prototype.drawHealth = function () {
        cx.fillStyle = 'lightgray';
        cx.fillRect(this.position, canvasHeight - 115, this.span, 5);
        cx.fillStyle = 'red';
        cx.fillRect(this.position, canvasHeight - 115, this.health / this.maxHealth * this.span, 5);
    };
    return Base;
}());
var Game = /** @class */ (function () {
    // money: number
    // score: number
    function Game(player1, player2, visualize, DOMAccess, playerUnits1, playerUnits2) {
        if (playerUnits1 === void 0) { playerUnits1 = []; }
        if (playerUnits2 === void 0) { playerUnits2 = []; }
        this.time = 0;
        // this.msTime = performance.now()
        this.DOMAccess = DOMAccess;
        this.playerOneUnits = [];
        this.playerTwoUnits = [];
        this.visualize = visualize;
        //new Trooper(advancedTroop, 'right'), new Trooper(bestTroop, 'right')
        this.playerOneBase = new Base(baseStats, 'left', this.visualize);
        this.playerTwoBase = new Base(baseStats, 'right', this.visualize);
        this.players = [player1, player2];
        // new Player(55, 'right', this.playerTwoUnits, this.playerOneUnits)
        this.players[0].map(this.players[1], visualize, DOMAccess, this.playerOneUnits, playerUnits1, this.playerTwoUnits, this.playerTwoBase, this.playerOneBase, this);
        this.players[1].map(this.players[0], visualize, DOMAccess, this.playerTwoUnits, playerUnits2, this.playerOneUnits, this.playerOneBase, this.playerTwoBase, this);
        this.animation();
    }
    Game.prototype.move = function () {
        if (this.visualize)
            cx.clearRect(0, 0, canvasWidth, canvasHeight);
        this.time += 1;
        // console.log(this.time, '---Move---')
        this.players[0].moveArmy();
        this.players[1].moveArmy();
        // if (this.players[0].isEnemyInFront()) console.log('-------enemy in front of player 1',
        //     game.playerOneUnits[0].position, game.playerTwoUnits[0].position)
        // if (this.players[1].isEnemyInFront()) console.log('-------enemy in front of player 2',
        //     game.playerTwoUnits[0].position, game.playerOneUnits[0].position)
        if (this.players[0].isEnemyInFront())
            this.players[0].attackEnemyTroop(this.time);
        if (this.players[1].isEnemyInFront())
            this.players[1].attackEnemyTroop(this.time);
        if (!this.players[0].checkForTroops()) {
            this.players[1].attackBase(this.time, this.playerOneBase);
        }
        if (!this.players[1].checkForTroops()) {
            this.players[0].attackBase(this.time, this.playerTwoBase);
        }
        if (this.players[0].checkForTroops())
            this.players[1].handleRangeAttack(this.time);
        if (this.players[1].checkForTroops())
            this.players[0].handleRangeAttack(this.time);
        this.players[0].checkForDeath(this.players[1]);
        this.players[1].checkForDeath(this.players[0]);
        // this.players[0].doesBaseHaveHealth()
        // this.players[1].doesBaseHaveHealth()
        this.display();
    };
    Game.prototype.display = function () {
        this.playerOneBase.draw();
        this.playerTwoBase.draw();
        for (var _i = 0, _a = this.playerOneUnits; _i < _a.length; _i++) {
            var unit = _a[_i];
            unit.draw();
            unit.drawAttack(this.time);
        }
        for (var _b = 0, _c = this.playerTwoUnits; _b < _c.length; _b++) {
            var unit = _c[_b];
            unit.draw();
            unit.drawAttack(this.time);
        }
    };
    Game.prototype.animation = function () {
        var _this = this;
        var move = function () { _this.move(); };
        var aliveBases = function () {
            return _this.players[0].doesBaseHaveHealth() && _this.players[1].doesBaseHaveHealth();
        };
        if (this.visualize)
            requestAnimationFrame(hold);
        // if (this.DOMAccess) {
        //     setInterval(() => {
        //         move()
        //     }, .001)
        // }
        else {
            while (aliveBases() && this.playerOneUnits.length && this.playerTwoUnits.length && this.time < 100000) { //
                move();
            }
            // console.log('Game ended,',
            //     (!this.playerOneUnits.length && !this.playerTwoUnits.length ? 'nobody' : (this.playerOneUnits.length ? 'left' : 'right')), 'won',
            //     ', took:', this.time, 'rounds, in', performance.now() - this.msTime, 'ms\n', 'Left player damage:', this.players[0].stats.damageDealt,
            //     'Right player damage:', this.players[1].stats.damageDealt)
        }
        function hold() {
            move();
            if (aliveBases())
                requestAnimationFrame(hold);
        }
    };
    return Game;
}());
var Player = /** @class */ (function () {
    function Player(money, side, checkForAvailMoney) {
        if (money === void 0) { money = 0; }
        this.financialAid = [true, true, true];
        this.money = money;
        this.side = side;
        this.score = 0;
        this.exp = 0;
        this.checkForMoneyAvail = checkForAvailMoney;
        // this.playerUnits = playerUnits
        // this.enemyUnits = enemyUnits
        this.unlockedUnits = [true, false, false, false, false, false, false, false, false];
        // this.unlockedUnits = [true, true, true, true, true, true, true, true, true]
        this.maxUnits = 7;
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
        };
    }
    Player.prototype.map = function (enemy, visualize, DOMAccess, playerUnits, startingPlayerUnits, enemyUnits, enemyBase, playerBase, game) {
        var _this = this;
        this.enemy = enemy;
        this.visualize = visualize;
        this.DOMAccess = DOMAccess;
        this.enemyBase = enemyBase;
        this.playerBase = playerBase;
        this.playerUnits = playerUnits;
        if (startingPlayerUnits.length > 0) {
            startingPlayerUnits.forEach(function (i) { return _this.addTroop(i); });
        }
        this.enemyUnits = enemyUnits;
        this.game = game;
        this.unlockUnits();
    };
    Player.prototype.addTroop = function (index) {
        if (this.playerUnits.length) {
            for (var _i = 0, _a = this.playerUnits; _i < _a.length; _i++) {
                var unit = _a[_i];
                if (troopArr[5].name === troopArr[index].name && unit.name === troopArr[5].name)
                    return;
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
            this.stats.spending += troopArr[index].price;
            this.addFunds(-troopArr[index].price);
            this.playerUnits.push(new troopers[index](this.side, this, this.enemy));
        }
    };
    // addTroopTimed(stats: trooperStatsInterface): void {
    //
    // }
    Player.prototype.doesBaseHaveHealth = function () {
        if (this.playerBase.health <= 0) {
            if (this.visualize)
                console.log('Base destroyed: ', this.playerBase);
            return false;
        }
        return true;
    };
    Player.prototype.attackEnemyTroop = function (time) {
        this.playerUnits[0].timeAttack(time, this.enemyUnits, this.stats);
    };
    Player.prototype.handleRangeAttack = function (time) {
        for (var _i = 0, _a = this.playerUnits; _i < _a.length; _i++) {
            var unit = _a[_i];
            if (unit.range > 0) {
                if (this.side === 'left' && unit.position + unit.range >= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits, this.stats);
                    this.stats.damageDealt += unit.damage;
                    // console.log(this.stats.damageDealt)
                }
            }
            if (unit.range) {
                if (this.side === 'right' && unit.position - unit.range <= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits, this.stats);
                    this.stats.damageDealt += unit.damage;
                }
            }
        }
    };
    Player.prototype.isEnemyInFront = function () {
        if (this.playerUnits.length === 0)
            return false;
        return this.playerUnits[0].isInFront(this.enemyUnits, 1);
    };
    Player.prototype.checkForDeath = function (enemy) {
        var _this = this;
        if (this.playerUnits.length) { // should check for every troop
            this.playerUnits.forEach(function (playerUnit, i) {
                if (playerUnit.health <= 0) {
                    // console.log(this.side, 'died', playerUnit)
                    playerUnit.deleteAnim();
                    enemy.addFunds(playerUnit.price * 3);
                    _this.playerUnits.splice(i, 1);
                }
            });
        }
    };
    Player.prototype.addFunds = function (amount) {
        this.money += amount;
        if (this.DOMAccess)
            document.getElementById(this.side + "Money").innerHTML = "Money: " + Math.round(this.money);
    };
    Player.prototype.isEnoughMoney = function (amount) {
        if (!this.checkForMoneyAvail)
            return true;
        return this.money >= amount;
    };
    Player.prototype.checkForTroops = function () {
        return Boolean(this.playerUnits.length);
    };
    Player.prototype.attackBase = function (time, enemyBase) {
        if (this.playerUnits.length) {
            for (var _i = 0, _a = this.playerUnits; _i < _a.length; _i++) {
                var unit = _a[_i];
                if (this.side === 'left' && unit.position >= canvasWidth - 55 - unit.range) {
                    unit.timeAttackBase(time, enemyBase);
                }
                if (this.side === 'right' && unit.position <= 55 + unit.range)
                    unit.timeAttackBase(time, enemyBase);
            }
        }
    };
    Player.prototype.moveArmy = function () {
        var _this = this;
        if (this.side === 'left') {
            this.playerUnits.forEach(function (troop, i) {
                if (!troop.isInFront(_this.playerUnits, i) && !troop.isInFront(_this.enemyUnits, 1) &&
                    troop.position < canvasWidth - baseStats.span - 10) {
                    // console.log('moved to right', troop.position)
                    troop.position += troop.speed + (!_this.visualize ? 4 : 0);
                }
                // else console.log('no movement to right', troop.position)
            });
        }
        if (this.side === 'right') {
            this.playerUnits.forEach(function (troop, i) {
                if (!troop.isInFront(_this.playerUnits, i) && !troop.isInFront(_this.enemyUnits, 1) &&
                    troop.position > baseStats.span + 10) {
                    // console.log('moved to left', troop.position)
                    troop.position -= troop.speed + (!_this.visualize ? 4 : 0);
                }
                // else console.log('no movement to left', troop.position)
            });
        }
        this.afterMoveArmy();
    };
    Player.prototype.afterMoveArmy = function () {
        if (this.DOMAccess) {
            document.getElementById("trs" + this.side).innerText = this.playerUnits.length + "/" + this.maxUnits + " Troops";
        }
        for (var i = 0; i <= 2; i++) {
            if (this.financialAid[i] && this.playerBase.health < baseStats.health / 4 * (i + 1)) {
                this.addFunds(100);
                this.financialAid[i] = false;
            }
        }
    };
    Player.prototype.unlockUnits = function () {
        var _this = this;
        // console.log(this.visualize)
        // needs to create buttons for the length of troopArr
        if (this.DOMAccess) {
            var div_1 = document.getElementById(this.side);
            troopArr.forEach(function (stat, i) {
                var button = document.createElement('button');
                button.innerHTML = stat.name + ": " + stat.price;
                div_1.appendChild(button);
                button.className = _this.side;
                div_1.appendChild(document.createElement('br'));
                if (!_this.unlockedUnits[i])
                    button.innerHTML = "Purchase for " + troopArr[i].researchPrice;
                button.addEventListener('click', function () {
                    if (_this.unlockedUnits[i])
                        _this.addTroop(i);
                    else
                        _this.purchaseUnit(i, button);
                    document.getElementById(_this.side + "Money").innerHTML = "Money: " + Math.round(_this.money);
                });
            });
        }
    };
    Player.prototype.purchaseUnit = function (index, element) {
        // if (this.money)age
        if (this.isEnoughMoney(troopArr[index].researchPrice)) {
            this.money -= troopArr[index].researchPrice - 5;
            this.unlockedUnits[index] = true;
            try {
                // @ts-ignore
                if (this.DOMAccess)
                    element.innerHTML = troopArr[index].name + ": " + troopArr[index].price;
            }
            catch (e) { }
            // document.querySelectorAll(`.${this.side}`)[index].removeAttribute('disabled')
        }
        else {
            // @ts-ignore
            element.style.backgroundColor = 'red';
            setTimeout(function () {
                // @ts-ignore
                element.style.backgroundColor = color;
            }, 800);
            // console.log('Not enough money, dummy')
        }
    };
    return Player;
}());
// This bot is an idiot and should not be used!
// His performance, however, is, compared to other options, spectacular
var CalculatingBot = /** @class */ (function (_super) {
    __extends(CalculatingBot, _super);
    function CalculatingBot(money, side, checkForAvailMoney) {
        if (money === void 0) { money = 0; }
        var _this = _super.call(this, money, side, checkForAvailMoney) || this;
        _this.cooldown = 0;
        _this.toUnlockUnit = 1;
        return _this;
    }
    CalculatingBot.prototype.afterMoveArmy = function () {
        _super.prototype.afterMoveArmy.call(this);
        if (this.cooldown <= 0) {
            if (this.DPR(this.enemyUnits) >= this.DPR(this.playerUnits) ||
                this.healthOverall(this.enemyUnits) / 10 * 7 > this.healthOverall(this.playerUnits)) {
                var i = this.neededUnit(this.DPR(this.enemyUnits) - this.DPR(this.playerUnits), this.healthOverall(this.enemyUnits) / 10 * 9 - this.healthOverall(this.playerUnits));
                if (i)
                    this.addTroop(i);
                else
                    this.addTroop(0);
            }
            if (!this.unlockedUnits[this.unlockedUnits.length - 1] && this.money > troopArr[this.toUnlockUnit].researchPrice * 2) {
                this.purchaseUnit(this.toUnlockUnit, document.getElementsByClassName(this.side)[this.toUnlockUnit]);
                this.toUnlockUnit++;
            }
        }
        this.cooldown--;
    };
    CalculatingBot.prototype.addTroop = function (index) {
        _super.prototype.addTroop.call(this, index);
        this.cooldown = 45;
    };
    CalculatingBot.prototype.DPR = function (units) {
        var troopAttackPerRound = 0;
        for (var _i = 0, units_1 = units; _i < units_1.length; _i++) {
            var unit = units_1[_i];
            // has to be changed when troopArr changes
            if (unit.name === troopArr[2].name)
                troopAttackPerRound += unit.damage * 2 / unit.attackSpeed;
            else if (unit.name != troopArr[5].name)
                troopAttackPerRound += unit.damage / unit.attackSpeed;
        }
        return troopAttackPerRound;
    };
    CalculatingBot.prototype.DPH = function (damage, health) {
        return damage / health;
    };
    CalculatingBot.prototype.DPHPP = function () {
    };
    CalculatingBot.prototype.healthOverall = function (units) {
        var healthOfTroops = 0;
        for (var _i = 0, units_2 = units; _i < units_2.length; _i++) {
            var unit = units_2[_i];
            healthOfTroops += unit.health;
        }
        return healthOfTroops;
    };
    CalculatingBot.prototype.neededUnit = function (damage, health) {
        var _this = this;
        var mostSuitable = {
            DPH: null,
            index: null
        };
        troopArr.forEach(function (elem, i) {
            if (elem.price < _this.money && _this.unlockedUnits[i]) {
                if (_this.DPH(elem.damage, elem.health) >= mostSuitable.DPH) {
                    mostSuitable.DPH = _this.DPH(elem.damage, elem.health);
                    mostSuitable.index = i;
                }
            }
        });
        return mostSuitable.index;
    };
    return CalculatingBot;
}(Player));
var SimulatingBot = /** @class */ (function (_super) {
    __extends(SimulatingBot, _super);
    function SimulatingBot() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.cooldown = 100;
        _this.toUnlockUnit = 1;
        _this.roundsSpentAtOpponentsHalf = 0;
        _this.working = false;
        _this.GUI = false;
        _this.maxUnits = 7;
        return _this;
    }
    // constructor(money = 0, side: string, checkForAvailMoney: boolean) {
    //     super(money, side, checkForAvailMoney);
    // }
    SimulatingBot.prototype.afterMoveArmy = function () {
        var _this = this;
        _super.prototype.afterMoveArmy.call(this);
        var enc = this.encouragement();
        document.getElementById("pull" + this.side).innerText = 'Mode: ' + (enc > 2.2 ? 'Panic' : this.shouldPull(0, enc) ? 'Pull' : 'Normal');
        if (this.cooldown <= 0 && !this.shouldPull(1, enc)) {
            // console.log(enc)
            if (enc >= .8 && !this.working && this.playerUnits.length < this.maxUnits) {
                this.working = true;
                var cancelWork_1 = function () { return _this.working = false; };
                var addTroop_1 = function (i) { return _this.addTroop(i); };
                var side_1 = this.side;
                var p_1 = performance.now();
                var worker = new Worker('index.js');
                worker.postMessage([this.parseUnits(this.playerUnits), this.parseUnits(this.enemyUnits),
                    this.unlockedUnits, 'right', this.money, this.game]);
                worker.onmessage = function (e) {
                    // console.log(e.data)
                    if (e.data.length)
                        addTroop_1(e.data[0]);
                    if (e.data.length && Math.random() > .5 && e.data[0] === 3)
                        addTroop_1(2);
                    cancelWork_1();
                    document.getElementById("per" + side_1).innerText = "Computed in: " + Math.round((performance.now() - p_1) * 1000) / 1000 + "ms";
                };
                this.cooldown = 10;
            }
            if (this.playerUnits.length) {
                if (this.money > 1000 && (this.side === 'left' ? this.playerUnits[0].position > canvasWidth - 300 : this.playerUnits[0].position < 300))
                    this.shouldSpawnBaseDestroyer(enc);
            }
            this.tryToUnlock();
            var numberOfUnlockedUnits_1 = 0;
            this.unlockedUnits.forEach(function (e) { if (e) {
                numberOfUnlockedUnits_1++;
            } });
            // document.getElementById(`enc${this.side}`).innerText = `Enc: ${Math.round(enc * 1000) / 1000}`
            document.getElementById("unl" + this.side).innerText = "Unlocked Units: " + numberOfUnlockedUnits_1;
        }
        this.cooldown--;
    };
    SimulatingBot.prototype.shouldPull = function (increase, enc) {
        // determines whether to fight left or more right
        if (enc >= 10)
            return false;
        if (!this.playerUnits.length)
            return false;
        if (this.side === 'left' ? this.playerUnits[0].position > canvasWidth / 2 : this.playerUnits[0].position < canvasWidth / 2) {
            this.roundsSpentAtOpponentsHalf += increase;
            if (this.roundsSpentAtOpponentsHalf > 1700) { // 45 seconds = 2700
                if (this.side === 'left' ? this.playerUnits[0].position < canvasWidth / 2 : this.playerUnits[0].position > canvasWidth / 2) {
                    this.roundsSpentAtOpponentsHalf = 0;
                }
                return true;
            }
        }
        return false;
    };
    SimulatingBot.prototype.tryToUnlock = function () {
        if (!this.unlockedUnits[this.unlockedUnits.length - 1] && this.money > troopArr[this.toUnlockUnit].researchPrice * 1.5) {
            this.purchaseUnit(this.toUnlockUnit);
            this.toUnlockUnit++; // should be done better
        }
    };
    SimulatingBot.prototype.shouldSpawnBaseDestroyer = function (enc) {
        this.playerUnits.forEach(function (e) {
            if (e.name === troopArr[4].name || e.name === troopArr[8].name)
                enc = 1;
        });
        if (enc <= .4) {
            if (this.money > 200 && Math.random() < .2) {
                this.addTroop(5);
            }
            if (Math.random() < .8 && this.unlockedUnits[8] && this.unlockedUnits[6] && this.unlockedUnits[2]) {
                if (this.isEnoughMoney(troopArr[6].price + troopArr[2].price + troopArr[8].price)) {
                    this.addTroop(6);
                    this.addTroop(2);
                    this.addTroop(8);
                    this.cooldown = 300;
                }
            }
            else if (this.unlockedUnits[4] && enc <= .1 && this.unlockedUnits[3]) {
                this.addTroop(3);
                this.addTroop(4);
                this.cooldown = 250;
            }
        }
    };
    SimulatingBot.prototype.parseUnits = function (units) {
        var arr = [];
        units.forEach(function (unit) {
            troopArr.forEach(function (u, i) {
                if (unit.name === u.name)
                    arr.push(i);
            });
        });
        return arr;
    };
    SimulatingBot.prototype.encouragement = function () {
        var stats = {
            playerUnitsDamage: 0,
            enemyUnitsDamage: 0,
            playerUnitsLength: 0,
            enemyUnitsLength: 0
        };
        this.game.players[this.side === 'left' ? 0 : 1].playerUnits.forEach(function (e) { return stats.playerUnitsDamage += e.damage; });
        this.game.players[this.side === 'left' ? 0 : 1].enemyUnits.forEach(function (e) { return stats.enemyUnitsDamage += e.damage; });
        stats.playerUnitsLength = this.game.players[this.side === 'left' ? 0 : 1].playerUnits.length;
        stats.enemyUnitsLength = this.game.players[this.side === 'left' ? 0 : 1].enemyUnits.length;
        // console.log(stats)
        // console.log('enc:', (stats.enemyUnitsLength / stats.playerUnitsLength) / (stats.playerUnitsDamage / stats.enemyUnitsDamage))
        if (stats.playerUnitsLength && stats.enemyUnitsDamage) {
            return (Math.pow(((stats.enemyUnitsLength / stats.playerUnitsLength) / (stats.playerUnitsDamage / stats.enemyUnitsDamage)), .5));
        }
        else if (!stats.enemyUnitsLength)
            return 0;
        else
            return 10;
    };
    SimulatingBot.prototype.purchaseUnit = function (index) {
        if (this.isEnoughMoney(troopArr[index].researchPrice)) {
            this.money -= troopArr[index].researchPrice - 5;
            this.unlockedUnits[index] = true;
        }
    };
    SimulatingBot.prototype.unlockUnits = function () {
        if (this.GUI)
            _super.prototype.unlockUnits.call(this);
    };
    return SimulatingBot;
}(Player));
// let s = new SimulatingBot(0, 'left', false)
// s.afterMoveArmy()
try {
    document.getElementById('left');
    new Game(new Player(55, 'left', true), new SimulatingBot(55, 'right', true), true, true, [], []);
}
catch (e) {
    onmessage = function (e) {
        // e[0] playerTroops e[1] enemyTroops e[2] unlockedUnits e[3] side e[4] money e[5] game
        // console.log(e);
        var bestDPM = -999999;
        var bestStats;
        var bestTroops = [];
        var numberOfUnlockedUnits = 0;
        e.data[2].forEach(function (e) {
            return e ? numberOfUnlockedUnits++ : 0;
        });
        if (numberOfUnlockedUnits >= 4)
            numberOfUnlockedUnits = 4;
        // let p = performance.now()
        for (var i = 0; i < numberOfUnlockedUnits; i++) { // - trebuchet
            if (i === 4 || i === 8)
                continue;
            for (var j = 0; j < numberOfUnlockedUnits; j++) {
                if (j === 4 || j === 8 || (i === 5 && j === 5))
                    continue;
                for (var k = 0; k < numberOfUnlockedUnits; k++) {
                    if (k === 4 || k === 8 || ((i === 5 && k === 5) || (j === 5 && k === 5)))
                        continue;
                    var plTroops = e.data[0].slice();
                    plTroops.push(i);
                    plTroops.push(j);
                    plTroops.push(k);
                    var game = simulate(plTroops, e.data[1].slice());
                    var stats = getGameStats(game);
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
        function simulate(units1, units2) {
            // console.log('simulate')
            return new Game(new Player(0, 'left', false), new Player(0, 'right', false), false, false, units1, units2);
        }
        function getGameStats(game) {
            var stats = {
                playerSpending: null,
                playerDamage: null,
                playerUnitsLength: null,
                enemyDamage: null,
                enemyUnitsLength: null,
                time: null // 200 - 2000
            };
            stats.playerSpending = game.players[e.data[3] === 'left' ? 0 : 1].stats.spending;
            stats.playerDamage = game.players[e.data[3] === 'left' ? 0 : 1].stats.damageDealt;
            stats.enemyDamage = game.players[e.data[3] === 'left' ? 0 : 1].stats.damageDealt;
            return stats;
        }
        function damageCalc(stats) {
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
        // function encouragement(): number {
        //     let stats = {
        //         playerUnitsDamage: 0,
        //         enemyUnitsDamage: 0,
        //         playerUnitsLength: 0,
        //         enemyUnitsLength: 0
        //     }
        //     e.data[5].players[e.data[3] === 'left' ? 0 : 1].playerUnits.forEach(e => stats.playerUnitsDamage += e.damage)
        //     e.data[5].players[e.data[3] === 'left' ? 0 : 1].enemyUnits.forEach(e => stats.enemyUnitsDamage += e.damage)
        //     stats.playerUnitsLength = e.data[5].players[e.data[3] === 'left' ? 0 : 1].playerUnits.length
        //     stats.enemyUnitsLength = e.data[5].players[e.data[3] === 'left' ? 0 : 1].enemyUnits.length
        //
        //     if (stats.playerUnitsLength && stats.enemyUnitsDamage) {
        //         return (((stats.enemyUnitsLength / stats.playerUnitsLength) / (stats.playerUnitsDamage / stats.enemyUnitsDamage)) ** .3)
        //     } else if (!stats.enemyUnitsLength) return 0
        //     else {
        //         // console.log(stats)
        //         return 10
        //     }
        // }
        // console.log('finished job')
        // console.log(bestTroops)
        // @ts-ignore
        postMessage(bestTroops);
    };
}
//# sourceMappingURL=index.js.map