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
var canvasWidth, canvasHeight, cx, explosionIMG;
try {
    console.log('Running in Browser');
    var ctx = document.querySelector('canvas');
    canvasWidth = ctx.width = 600;
    canvasHeight = ctx.height = 250;
    console.log(ctx);
    cx = ctx.getContext('2d');
    explosionIMG = new Image(68, 55);
    explosionIMG.src = 'explosion.png';
}
catch (e) {
    console.log('Running node.js huh?');
    canvasWidth = 600;
    canvasHeight = 250;
}
var troopArr = [
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
        name: 'Advanced Troop', health: 30, damage: 10, baseDamage: 5, attackSpeed: 80, castingTime: 1.6, price: 12, color: 'darkgreen', speed: 1, span: 20, range: 0, researchPrice: 250
    },
    {
        name: 'Base Destroyer Troop', health: 50, damage: 2, baseDamage: 35, attackSpeed: 140, castingTime: 3, price: 50, color: 'yellow', speed: .5, span: 45, range: 0, researchPrice: 400
    },
    {
        name: 'Boomer Troop', health: 1, damage: 49, baseDamage: 30, attackSpeed: 17, castingTime: 1.6, price: 12, color: 'red', speed: 1, span: 20, range: 21, researchPrice: 550
    },
    {
        name: 'Shield Troop', health: 98, damage: .5, baseDamage: 1, attackSpeed: 50, castingTime: 3, price: 30, color: 'cadetblue', speed: 1, span: 20, range: 0, researchPrice: 550
    },
    {
        name: 'Healer Troop', health: 3, damage: 5, baseDamage: 0, attackSpeed: 60, castingTime: 1, price: 25, color: 'hotpink', speed: 1.5, span: 20, range: 100, researchPrice: 800
    },
    {
        name: 'Trebuchet Troop', health: 5, damage: 0, baseDamage: 100, attackSpeed: 300, castingTime: 3, price: 50, color: 'brown', speed: .3, span: 50, range: 200, researchPrice: 2000
    },
    // {
    //     name: 'Sneaky Troop', health: 1, damage: 49, baseDamage: 75, attackSpeed: 17, castingTime: 1.6, price: 12, color: 'darkgray', speed: 1, span: 20, range: 0, researchPrice: 500
    // },
    {
        name: 'Plane Troop', health: 1, damage: 49, baseDamage: 75, attackSpeed: 17, castingTime: 1.6, price: 12, color: 'steelblue', speed: 1, span: 20, range: 0, researchPrice: 500
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
            this.position = 20;
        if (side === 'right')
            this.position = canvasWidth - 20;
    }
    Trooper.prototype.attack = function (enemyTroopers) {
        // console.log('attacked enemy: ', enemyTroopers)
        enemyTroopers[0].health -= this.damage;
    };
    Trooper.prototype.timeAttack = function (time, enemyTroopers) {
        if (this.visualize) {
            if (this.targetTime === null)
                this.targetTime = time + this.attackSpeed;
            else if (time === this.targetTime) {
                this.attack(enemyTroopers);
                this.targetTime = null;
            }
        }
        else
            this.attack(enemyTroopers); // This is a shortcut, may not be as precise!
    };
    Trooper.prototype.isInFront = function (playerUnits, index) {
        // takes an array and queue number to find out if one in front of him is '11' near
        if (index === 0)
            return false;
        if (playerUnits.length === 0)
            return false;
        if (this.side === 'left') {
            for (var i = index - 1; i >= 0; i--) {
                if (this.position < playerUnits[i].position &&
                    this.position + this.span / 2 + 2 > playerUnits[i].position - playerUnits[i].span / 2) {
                    return true;
                }
            }
        }
        if (this.side === 'right') {
            for (var i = index - 1; i >= 0; i--) {
                if (this.position > playerUnits[i].position &&
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
        if (this.targetTime !== null) {
            cx.fillStyle = "rgb(" + (255 - (1 / (this.targetTime - time)) * 255) + ", " + (255 - (1 / (this.targetTime - time)) * 255) + ", 255)";
            cx.fillRect(this.position - this.span / 2, canvasHeight - 85, this.span, 5);
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
    ExplodingTroop.prototype.timeAttack = function (time, enemyTroopers) {
        this.deleteAnim();
        _super.prototype.timeAttack.call(this, time, enemyTroopers);
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
        cx.fillStyle = 'red';
        cx.beginPath();
        cx.arc(this.position, canvasHeight - 65, 20, 0, 2 * Math.PI);
        cx.fill();
        cx.drawImage(explosionIMG, this.position - this.span / 2 - 34, canvasHeight - 65 - 35 / 2);
    };
    return ExplodingTroop;
}(Trooper));
var ShieldTroop = /** @class */ (function (_super) {
    __extends(ShieldTroop, _super);
    function ShieldTroop(side, player, enemy) {
        return _super.call(this, troopArr[6], side, player.visualize) || this;
    }
    ShieldTroop.prototype.draw = function () {
        cx.fillStyle = this.color;
        cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35);
        cx.fillStyle = 'brown';
        cx.fillRect(this.position - (this.side === 'left' ? 0 : this.span) + this.span / 2 - 3, canvasHeight - 65, 3, 35);
        this.drawHealth();
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
        _super.prototype.timeAttackBase.call(this, time, this.player.enemyBase);
    };
    TrebuchetTroop.prototype.drawAttack = function (time) {
        _super.prototype.drawAttack.call(this, time);
        cx.fillStyle = 'silver';
        // could shoot in a curve
        cx.beginPath();
        cx.arc(this.position + (this.side === 'left' ? (1 / (this.targetTime - time)) * this.span :
            -(1 / (this.targetTime - time)) * this.range), canvasHeight - 100, 10, 0, 2 * Math.PI);
        cx.fill();
    };
    return TrebuchetTroop;
}(Trooper));
var PlaneTroop = /** @class */ (function (_super) {
    __extends(PlaneTroop, _super);
    function PlaneTroop(side, player, enemy) {
        return _super.call(this, troopArr[9], side, player.visualize) || this;
    }
    return PlaneTroop;
}(Trooper));
var troopers = [BasicTroop, FastTroop, RangeTroop, AdvancedTroop, BaseDestroyerTroop, ExplodingTroop, ShieldTroop, HealerTroop, TrebuchetTroop, PlaneTroop];
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
    function Game(player1, player2, visualize, playerUnits1, playerUnits2) {
        if (playerUnits1 === void 0) { playerUnits1 = []; }
        this.time = 0;
        this.msTime = Date.now();
        this.playerOneUnits = [];
        this.playerTwoUnits = [];
        this.visualize = visualize;
        //new Trooper(advancedTroop, 'right'), new Trooper(bestTroop, 'right')
        this.playerOneBase = new Base(baseStats, 'left', this.visualize);
        this.playerTwoBase = new Base(baseStats, 'right', this.visualize);
        this.players = [player1, player2];
        // new Player(55, 'right', this.playerTwoUnits, this.playerOneUnits)
        this.players[0].map(this.players[1], visualize, this.playerOneUnits, playerUnits1, this.playerTwoUnits, this.playerTwoBase, this.playerOneBase);
        this.players[1].map(this.players[0], visualize, this.playerTwoUnits, playerUnits2, this.playerOneUnits, this.playerOneBase, this.playerTwoBase);
        this.animation();
    }
    Game.prototype.move = function () {
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
        else {
            while (aliveBases() && this.playerOneUnits.length && this.playerTwoUnits.length) {
                move();
            }
            console.log('Game ended,', (!this.playerOneUnits.length && !this.playerTwoUnits.length ? 'nobody' : (this.playerOneUnits.length ? 'left' : 'right')), 'won', ', took:', this.time, 'rounds, in', Date.now() - this.msTime, 'ms');
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
    function Player(money, side) {
        if (money === void 0) { money = 0; }
        this.money = money;
        this.side = side;
        this.score = 0;
        this.exp = 0;
        this.checkForMoneyAvail = false;
        // this.playerUnits = playerUnits
        // this.enemyUnits = enemyUnits
        this.unlockedUnits = [true, false, false];
    }
    Player.prototype.map = function (enemy, visualize, playerUnits, startingPlayerUnits, enemyUnits, enemyBase, playerBase) {
        var _this = this;
        this.enemy = enemy;
        this.visualize = visualize;
        this.enemyBase = enemyBase;
        this.playerBase = playerBase;
        this.playerUnits = playerUnits;
        if (startingPlayerUnits.length > 0) {
            startingPlayerUnits.forEach(function (i) { return _this.addTroop(i); });
        }
        this.enemyUnits = enemyUnits;
        this.unlockUnits();
    };
    Player.prototype.addTroop = function (index) {
        if (this.isEnoughMoney(troopArr[index].price)) {
            this.money -= troopArr[index].price;
            this.playerUnits.push(new troopers[index](this.side, this, this.enemy));
        }
    };
    // addTroopTimed(stats: trooperStatsInterface): void {
    //
    // }
    Player.prototype.doesBaseHaveHealth = function () {
        if (this.playerBase.health <= 0) {
            console.log('Base destroyed: ', this.playerBase);
            return false;
        }
        return true;
    };
    Player.prototype.attackEnemyTroop = function (time) {
        this.playerUnits[0].timeAttack(time, this.enemyUnits);
    };
    Player.prototype.handleRangeAttack = function (time) {
        for (var _i = 0, _a = this.playerUnits; _i < _a.length; _i++) {
            var unit = _a[_i];
            if (unit.range) {
                if (this.side === 'left' && unit.position + unit.range >= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits);
                }
            }
            if (unit.range) {
                if (this.side === 'right' && unit.position - unit.range <= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits);
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
                    console.log(_this.side, 'died', playerUnit);
                    playerUnit.deleteAnim();
                    enemy.addFunds(playerUnit.price * 10);
                    _this.playerUnits.splice(i, 1);
                }
            });
        }
    };
    Player.prototype.addFunds = function (amount) {
        this.money += amount;
        if (this.visualize)
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
    };
    Player.prototype.unlockUnits = function () {
        var _this = this;
        console.log(this.visualize);
        // needs to create buttons for the length of troopArr
        if (this.visualize) {
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
            // @ts-ignore
            if (this.visualize)
                element.innerHTML = troopArr[index].name + ": " + troopArr[index].price;
            // document.querySelectorAll(`.${this.side}`)[index].removeAttribute('disabled')
        }
        else {
            console.log('Not enough money, dummy');
        }
    };
    return Player;
}());
var CalculatingBot = /** @class */ (function (_super) {
    __extends(CalculatingBot, _super);
    function CalculatingBot(money, side) {
        if (money === void 0) { money = 0; }
        var _this = _super.call(this, money, side) || this;
        _this.cooldown = 0;
        _this.toUnlockUnit = 1;
        return _this;
    }
    CalculatingBot.prototype.afterMoveArmy = function () {
        if (this.cooldown <= 0) {
            if (this.DPR(this.enemyUnits) >= this.DPR(this.playerUnits) ||
                this.healthOverall(this.enemyUnits) / 10 * 7 > this.healthOverall(this.playerUnits)) {
                var i = this.neededUnit(this.DPR(this.enemyUnits) - this.DPR(this.playerUnits), this.healthOverall(this.enemyUnits) / 10 * 9 - this.healthOverall(this.playerUnits));
                if (i)
                    this.addTroop(i);
                else
                    this.addTroop(0);
            }
            if (this.money > troopArr[this.toUnlockUnit].researchPrice * 2) {
                this.purchaseUnit(this.toUnlockUnit, document.getElementsByClassName(this.side)[this.toUnlockUnit]);
                this.toUnlockUnit++;
            }
        }
        this.cooldown--;
    };
    CalculatingBot.prototype.addTroop = function (index) {
        _super.prototype.addTroop.call(this, index);
        this.cooldown = 30;
    };
    CalculatingBot.prototype.DPR = function (units) {
        var troopAttackPerRound = 0;
        for (var _i = 0, units_1 = units; _i < units_1.length; _i++) {
            var unit = units_1[_i];
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
new Game(new Player(55, 'left'), new CalculatingBot(55, 'right'), true, [], []);
//# sourceMappingURL=index.js.map