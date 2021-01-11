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
var canvasWidth, canvasHeight, cx, explosionIMG, explosionAtomicIMG, radiationSymbolIMG, buttonColor, deathAnimPending, radioactivityPending, bgColor, buttonBg, darkTheme;
try {
    var canvas = document.querySelector('canvas');
    canvasWidth = canvas.width = 700;
    canvasHeight = canvas.height = 250;
    console.log(canvas);
    cx = canvas.getContext('2d');
    explosionIMG = new Image(68, 55);
    explosionIMG.src = 'img/explosion.png';
    explosionAtomicIMG = new Image(255, 255);
    explosionAtomicIMG.src = 'img/nuke.png';
    radiationSymbolIMG = new Image(255, 255);
    radiationSymbolIMG.src = 'img/radiationSymbol.png';
    darkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log(darkTheme);
    if (darkTheme) {
        buttonColor = 'darkgray';
        buttonBg = '#1c1c1c';
        bgColor = 'rgb(24, 26, 27)';
    }
    else {
        buttonColor = 'black';
        buttonBg = 'rgb(239, 239, 239)';
        bgColor = 'white';
    }
}
catch (e) {
    // console.log('Running node.js huh?')
    canvasWidth = 700;
    canvasHeight = 250;
}
var troopArr = [
    {
        name: 'Basic Troop', health: 20, damage: 4.5, baseDamage: 4, attackSpeed: 40, price: 5, color: 'limegreen', speed: 1, span: 20, range: 0, researchPrice: 0
    },
    {
        name: 'Fast Troop', health: 18, damage: 1.3, baseDamage: .8, attackSpeed: 15, price: 5, color: 'lightpink', speed: 2.5, span: 15, range: 10, researchPrice: 60
    },
    {
        name: 'Range Troop', health: 20, damage: 4.5, baseDamage: 3, attackSpeed: 50, price: 8, color: 'blue', speed: 1, span: 20, range: 79, researchPrice: 120
    },
    {
        name: 'Advanced Troop', health: 35, damage: 12, baseDamage: 5, attackSpeed: 80, price: 10, color: 'darkgreen', speed: 1, span: 20, range: 0, researchPrice: 150
    },
    {
        name: 'Base Destroyer', health: 40, damage: 8, baseDamage: 35, attackSpeed: 140, price: 50, color: 'yellow', speed: .8, span: 45, range: 0, researchPrice: 175
    },
    {
        name: 'Boomer Troop', health: 1, damage: 40, baseDamage: 30, attackSpeed: 17, price: 30, color: 'red', speed: 1.75, span: 20, range: 40, researchPrice: 200
    },
    {
        name: 'Shield Troop', health: 75, damage: .5, baseDamage: 1, attackSpeed: 300, price: 30, color: 'cadetblue', speed: 1, span: 20, range: 0, researchPrice: 250
    },
    {
        name: 'Doggo', health: 15, damage: 30, baseDamage: 0, attackSpeed: 60, price: 40, color: 'chocolate', speed: 1.8, span: 15, range: 0, researchPrice: 250
    },
    {
        name: 'Trebuchet', health: 5, damage: 0, baseDamage: 100, attackSpeed: 300, price: 75, color: 'brown', speed: .4, span: 50, range: 200, researchPrice: 400
    },
    {
        name: 'Atomic Troop', health: 280, damage: .6, baseDamage: .75, attackSpeed: 1, price: 60, color: 'forestgreen', speed: .8, span: 18, range: 0, researchPrice: 600
    },
    {
        name: 'Atomic Bomb', health: 5000, damage: 9999, baseDamage: 0, attackSpeed: 1, price: 500, color: 'forestgreen', speed: 3, span: 28, range: 100, researchPrice: 1000
    },
    {
        name: 'Boss', health: 1000, damage: 40, baseDamage: 0, attackSpeed: 180, price: 10000, color: 'crimson', speed: .3, span: 35, range: 0, researchPrice: 30000
    },
];
var baseStats = {
    health: 800, position: 0, color: 'royalblue', span: 45
};
var Trooper = /** @class */ (function () {
    function Trooper(stats, side, visualize, multiplier, specialParameters) {
        if (visualize === void 0) { visualize = true; }
        if (multiplier === void 0) { multiplier = 1; }
        if (specialParameters === void 0) { specialParameters = {}; }
        this.health = stats.health * multiplier;
        this.damage = stats.damage * multiplier;
        this.color = stats.color;
        this.speed = stats.speed;
        this.span = stats.span;
        this.side = side;
        this.attackSpeed = stats.attackSpeed;
        this.targetTime = null;
        this.maxHealth = stats.health * multiplier;
        this.range = stats.range;
        this.price = stats.price;
        this.baseDamage = stats.baseDamage;
        this.visualize = visualize;
        this.name = stats.name;
        if (side === 'left')
            this.position = 10;
        if (side === 'right')
            this.position = canvasWidth - 10;
        if (JSON.stringify(specialParameters) != JSON.stringify({}))
            this.parseSpecialParameters(specialParameters);
    }
    Trooper.prototype.parseSpecialParameters = function (parameters) {
        // @ts-ignore
        this.health = parameters.health;
        // @ts-ignore
        this.position = parameters.position;
        // @ts-ignore
        this.targetTime = parameters.targetTime;
        // @ts-ignore
        this.maxHealth = parameters.maxHealth;
    };
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
        else if (time >= this.targetTime) {
            this.attack(enemyTroopers, stats);
            this.targetTime = null;
        }
        // }
        // else this.attack(enemyTroopers, stats) // This is a shortcut, may not be as precise!
    };
    Trooper.prototype.isInFront = function (playerUnits, index) {
        // takes an array and queue number to find out if one in front of him is '11' near
        // if (radioactivityPending && this.name != troopArr[4].name) this.health -= .04
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
        // if (this.visualize) {
        if (this.targetTime === null)
            this.targetTime = time + this.attackSpeed;
        else if (time >= this.targetTime) {
            this.attackBase(base);
            // console.log('Attack Base !!!!!!!!')
            this.targetTime = null;
        }
    };
    // else this.attackBase(base) // This is a shortcut, may not be as precise!
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
    function BasicTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        return _super.call(this, troopArr[0], side, player.visualize, multiplier, specialParameters) || this;
    }
    return BasicTroop;
}(Trooper));
var FastTroop = /** @class */ (function (_super) {
    __extends(FastTroop, _super);
    function FastTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        return _super.call(this, troopArr[1], side, player.visualize, multiplier, specialParameters) || this;
    }
    return FastTroop;
}(Trooper));
var RangeTroop = /** @class */ (function (_super) {
    __extends(RangeTroop, _super);
    function RangeTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        return _super.call(this, troopArr[2], side, player.visualize, multiplier, specialParameters) || this;
    }
    return RangeTroop;
}(Trooper));
var AdvancedTroop = /** @class */ (function (_super) {
    __extends(AdvancedTroop, _super);
    function AdvancedTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        return _super.call(this, troopArr[3], side, player.visualize, multiplier, specialParameters) || this;
    }
    return AdvancedTroop;
}(Trooper));
var BaseDestroyerTroop = /** @class */ (function (_super) {
    __extends(BaseDestroyerTroop, _super);
    function BaseDestroyerTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        return _super.call(this, troopArr[4], side, player.visualize, multiplier, specialParameters) || this;
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
    function ExplodingTroop(side, player, enemy, multiplier, specialParameters, troopStats) {
        if (specialParameters === void 0) { specialParameters = {}; }
        if (troopStats === void 0) { troopStats = troopArr[5]; }
        return _super.call(this, troopStats, side, player.visualize, multiplier, specialParameters) || this;
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
    function ShieldTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        return _super.call(this, troopArr[6], side, player.visualize, multiplier, specialParameters) || this;
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
    ShieldTroop.prototype.attack = function (enemyTroopers, stats, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        if (enemyTroopers[0].name === troopArr[6].name) {
            this.damage = 33;
        }
        else {
            this.damage = .5;
        }
        _super.prototype.attack.call(this, enemyTroopers, stats);
    };
    return ShieldTroop;
}(Trooper));
var HealerTroop = /** @class */ (function (_super) {
    __extends(HealerTroop, _super);
    function HealerTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        var _this = _super.call(this, troopArr[7], side, player.visualize, multiplier, specialParameters) || this;
        _this.index = null;
        return _this;
        // this.playerUnits = player.playerUnits
        // for (let unit of this.playerUnits) {
        //     unit.damage += 100
        // }
        // this.player = player
    }
    HealerTroop.prototype.draw = function () {
        if (this.visualize) {
            cx.fillStyle = this.color;
            cx.fillRect(this.position - this.span / 2, canvasHeight - 45, this.span, 15);
            this.drawHealth();
        }
    };
    return HealerTroop;
}(Trooper));
var TrebuchetTroop = /** @class */ (function (_super) {
    __extends(TrebuchetTroop, _super);
    function TrebuchetTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        var _this = _super.call(this, troopArr[8], side, player.visualize, multiplier, specialParameters) || this;
        _this.enemyBase = player.enemyBase;
        return _this;
    }
    TrebuchetTroop.prototype.timeAttack = function (time, enemyTroopers) {
        if (this.side === 'left' && canvasWidth - this.position - 55 < this.range) {
            _super.prototype.timeAttackBase.call(this, time, this.enemyBase);
        } // attacks enemy base even when unit is close but base is far !!!
        else if (this.side === 'right' && this.position - this.range - 55 < 0) {
            _super.prototype.timeAttackBase.call(this, time, this.enemyBase);
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
var AtomicTroop = /** @class */ (function (_super) {
    __extends(AtomicTroop, _super);
    function AtomicTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        return _super.call(this, troopArr[9], side, player.visualize, multiplier, specialParameters) || this;
    }
    AtomicTroop.prototype.isInFront = function (playerUnits, index) {
        this.health -= (this.maxHealth / 7) / canvasWidth;
        return _super.prototype.isInFront.call(this, playerUnits, index);
    };
    AtomicTroop.prototype.draw = function () {
        // cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35)
        _super.prototype.draw.call(this);
        if (this.visualize)
            cx.drawImage(radiationSymbolIMG, this.position - this.span / 2 - 1, canvasHeight - 60);
    };
    return AtomicTroop;
}(Trooper));
var AtomicBomb = /** @class */ (function (_super) {
    __extends(AtomicBomb, _super);
    function AtomicBomb(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        var _this = _super.call(this, side, player, enemy, multiplier, specialParameters, troopArr[10]) || this;
        // this.player = player
        // this.enemy = enemy
        if (_this.visualize)
            document.querySelectorAll('button').forEach(function (e) {
                if (e.id === troopArr[10].name) {
                    e.disabled = true;
                    setTimeout(function () {
                        e.removeAttribute('disabled');
                    }, 100000);
                }
            });
        return _this;
    }
    AtomicBomb.prototype.attack = function (enemyTroopers) {
        this.health = 0;
    };
    AtomicBomb.prototype.deleteAnim = function () {
        if (this.visualize)
            holdDeathAnim(this.position, this.span, this.visualize);
    };
    AtomicBomb.prototype.draw = function () {
        _super.prototype.draw.call(this);
        if (this.visualize)
            cx.drawImage(radiationSymbolIMG, this.position - 9, canvasHeight - 60);
    };
    return AtomicBomb;
}(ExplodingTroop));
var BossTroop = /** @class */ (function (_super) {
    __extends(BossTroop, _super);
    function BossTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        return _super.call(this, troopArr[11], side, player.visualize, multiplier, specialParameters) || this;
    }
    return BossTroop;
}(Trooper));
function holdDeathAnim(position, span, visualize) {
    if (!visualize)
        return;
    var i = 0;
    document.body.style.backgroundColor = 'rgb(26,38,26)';
    document.querySelectorAll('button').forEach(function (e) {
        e.style.backgroundColor = 'rgb(22,48,6)';
        e.style.color = 'rgb(166,172,154)';
    });
    requestAnimationFrame(hold);
    function hold() {
        deathAnimPending = true;
        i++;
        cx.globalAlpha = i / 100;
        cx.drawImage(explosionAtomicIMG, position - 171 / 2 + span / 4, 20);
        cx.globalAlpha = 1;
        if (i <= 45)
            requestAnimationFrame(hold);
        else {
            deathAnimPending = false;
            radioactivityPending = true;
            setTimeout(function () {
                radioactivityPending = false;
                document.body.style.backgroundColor = bgColor;
                document.querySelectorAll('button').forEach(function (e) {
                    e.style.backgroundColor = buttonBg;
                    e.style.color = buttonColor;
                });
            }, 22000);
        }
    }
}
var troopers = [BasicTroop, FastTroop, RangeTroop, AdvancedTroop, BaseDestroyerTroop, ExplodingTroop, ShieldTroop, HealerTroop, TrebuchetTroop, AtomicTroop, AtomicBomb, BossTroop];
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
    Base.prototype.draw = function (multiplier) {
        if (this.visualize) {
            cx.fillStyle = this.color;
            cx.fillRect(this.position, canvasHeight - 105, this.span, 75);
        }
        if (canvasHeight - 105 - multiplier < canvasHeight - 105 - 50) {
            multiplier = canvasHeight - 105 - 50;
            Base.drawCross(this.position + this.span / 2, 26, this.visualize);
        }
        multiplier = (Math.pow(multiplier, .1)) * 165 - 165;
        if (this.visualize) {
            cx.fillStyle = this.color;
            cx.fillRect(this.position, canvasHeight - 105 - multiplier, this.span, 75 + multiplier);
            this.drawHealth(115 + multiplier);
        }
    };
    Base.drawCross = function (x, y, visualize) {
        if (visualize) {
            cx.strokeStyle = 'red';
            cx.beginPath();
            cx.moveTo(x, y - 7);
            cx.lineTo(x, y + 7);
            cx.moveTo(x - 7, y);
            cx.lineTo(x + 7, y);
            cx.stroke();
        }
    };
    Base.prototype.drawHealth = function (y) {
        cx.fillStyle = 'lightgray';
        cx.fillRect(this.position, canvasHeight - y, this.span, 5);
        cx.fillStyle = 'red';
        cx.fillRect(this.position, canvasHeight - y, this.health / this.maxHealth * this.span, 5);
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
        this.atomicDoomPending = false;
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
        if (this.visualize && !deathAnimPending)
            cx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (this.visualize && radioactivityPending) {
            cx.fillStyle = 'rgba(98,134,85, .15)';
            cx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
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
        this.playerOneBase.draw(this.players[0].multiplier);
        this.playerTwoBase.draw(this.players[1].multiplier);
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
        this.multiplier = 1;
        this.money = money;
        this.side = side;
        this.score = 0;
        this.exp = 0;
        this.checkForMoneyAvail = checkForAvailMoney;
        // this.playerUnits = playerUnits
        // this.enemyUnits = enemyUnits
        this.unlockedUnits = [true, false, false, false, false, false, false, false, false];
        // this.unlockedUnits = [true, true, true, true, true, true, true, true, true]
        this.maxUnits = 10;
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
        if (!this.checkForMoneyAvail && visualize)
            document.getElementById(this.side + "Money").innerHTML = "";
        if (startingPlayerUnits.length > 0) {
            startingPlayerUnits.forEach(function (i) { return _this.addTroop(i); });
        }
        this.enemyUnits = enemyUnits;
        this.game = game;
        this.unlockUnits();
    };
    Player.prototype.addTroop = function (index, params) {
        if (params === void 0) { params = {}; }
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
            this.playerUnits.push(new troopers[index](this.side, this, this.enemy, this.multiplier, params));
        }
    };
    // addTroopTimed(stats: trooperStatsInterface): void {
    //
    // }
    Player.prototype.doesBaseHaveHealth = function () {
        if (this.playerBase.health <= 0) {
            if (this.visualize)
                console.log('Base destroyed: ', this.playerBase);
            if (this.visualize) {
                cx.font = "45px Arial";
                cx.textAlign = "center";
                cx.fillStyle = "red";
                cx.fillText((this.side === 'left' ? 'right' : 'left').toUpperCase() + " WON", canvasWidth / 2, canvasHeight / 2);
            }
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
                    playerUnit.deleteAnim();
                    if (playerUnit.name === troopArr[10].name) {
                        _this.game.atomicDoomPending = true;
                        setTimeout(function () { _this.game.atomicDoomPending = false; }, 22000);
                        console.log('atomicDoomPending');
                        _this.playerUnits.splice(i, 1);
                        return;
                    }
                    // playerUnit.doDeleteAnim = true
                    enemy.addFunds(playerUnit.price * 3);
                    _this.playerUnits.splice(i, 1);
                }
            });
        }
    };
    Player.prototype.addFunds = function (amount) {
        this.money += amount;
        if (this.DOMAccess && this.checkForMoneyAvail)
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
        // if (deathAnimPending) return
        if (this.side === 'left') {
            this.playerUnits.forEach(function (troop, i) {
                if (!troop.isInFront(_this.playerUnits, i) && !troop.isInFront(_this.enemyUnits, 1) &&
                    troop.position < canvasWidth - baseStats.span - 10) {
                    // console.log('moved to right', troop.position)
                    troop.position += troop.speed;
                }
                // else console.log('no movement to right', troop.position)
            });
        }
        if (this.side === 'right') {
            this.playerUnits.forEach(function (troop, i) {
                if (!troop.isInFront(_this.playerUnits, i) && !troop.isInFront(_this.enemyUnits, 1) &&
                    troop.position > baseStats.span + 10) {
                    // console.log('moved to left', troop.position)
                    troop.position -= troop.speed;
                }
                // else console.log('no movement to left', troop.position)
            });
        }
        for (var _i = 0, _a = this.playerUnits; _i < _a.length; _i++) {
            var troop = _a[_i];
            if (this.game.atomicDoomPending)
                troop.health -= .04;
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
    Player.prototype.unlockUnits = function (bindEventListeners) {
        var _this = this;
        if (bindEventListeners === void 0) { bindEventListeners = true; }
        // console.log(this.visualize)
        // needs to create buttons for the length of troopArr
        if (this.DOMAccess) {
            var div_1 = document.getElementById(this.side);
            troopArr.forEach(function (stat, i) {
                var button = document.createElement('button');
                button.innerHTML = "<span style=\"color: " + stat.color + "\"><i class=\"fa-circle\"></i></span> " + stat.name + ": " + stat.price;
                div_1.appendChild(button);
                button.className = _this.side + 'Button';
                button.id = stat.name;
                div_1.appendChild(document.createElement('br'));
                if (!_this.unlockedUnits[i])
                    button.innerHTML = "Purchase for " + troopArr[i].researchPrice;
                if (bindEventListeners)
                    button.addEventListener('click', function () {
                        if (_this.unlockedUnits[i])
                            _this.addTroop(i);
                        else
                            _this.purchaseUnit(i, button);
                        if (_this.checkForMoneyAvail)
                            document.getElementById(_this.side + "Money").innerHTML = "Money: " + Math.round(_this.money);
                        else {
                            document.getElementById(_this.side + "Money").innerHTML = "";
                        }
                    });
            });
            div_1.appendChild(document.createElement('hr'));
            var button = document.createElement('button');
            button.innerHTML = "Increase all troop stats by 20%: 1500";
            div_1.appendChild(button);
            button.id = 'incMult';
            if (bindEventListeners) {
                button.addEventListener('click', function () {
                    if (_this.isEnoughMoney(2000)) {
                        _this.multiplier *= 1.2;
                        // console.log(this.multiplier)
                    }
                });
            }
        }
    };
    Player.prototype.parseUnits = function (units) {
        var arr = [];
        units.forEach(function (unit) {
            troopArr.forEach(function (u, i) {
                if (unit.name === u.name)
                    arr.push(i);
            });
        });
        return arr;
    };
    Player.prototype.purchaseUnit = function (index, element) {
        // if (this.money)age
        if (this.isEnoughMoney(troopArr[index].researchPrice)) {
            this.money -= troopArr[index].researchPrice - 5;
            this.unlockedUnits[index] = true;
            try {
                // @ts-ignore
                if (this.DOMAccess)
                    element.innerHTML =
                        "<span style=\"color: " + troopArr[index].color + "\"><i class=\"fa-circle\"></i></span> " + troopArr[index].name + ": " + troopArr[index].price;
            }
            catch (e) { }
            // document.querySelectorAll(`.${this.side}`)[index].removeAttribute('disabled')
        }
        else {
            // @ts-ignore
            element.style.backgroundColor = 'red';
            setTimeout(function () {
                // @ts-ignore
                element.style.backgroundColor = buttonBg;
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
        if (this.side === 'left' ? this.playerUnits[0].position < canvasWidth / 2 : this.playerUnits[0].position > canvasWidth / 2) {
            this.roundsSpentAtOpponentsHalf = 0;
            return false;
        }
        if (this.side === 'left' ? this.playerUnits[0].position > canvasWidth / 2 : this.playerUnits[0].position < canvasWidth / 2) {
            this.roundsSpentAtOpponentsHalf += increase;
            if (this.roundsSpentAtOpponentsHalf > 170) { // 45 seconds = 2700
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
var InternetPlayer = /** @class */ (function (_super) {
    __extends(InternetPlayer, _super);
    function InternetPlayer(money, side, checkForAvailMoney, address) {
        var _this = _super.call(this, money, side, checkForAvailMoney) || this;
        _this.message = '';
        _this.playerMultiplier = 1;
        _this.enemyMultiplier = 1;
        var socket = io(address); // ws://localhost:8080
        // this.map(new Player(1000, 'right', false), true, true, [], [], [], new Base(baseStats, 'right'), new Base(baseStats, 'left'))
        _this.DOMAccess = true;
        _this.playerUnits = [];
        _this.enemyUnits = [];
        _this.firstTimeAtomicDoom = true;
        socket.on('mess', function (message) { console.log(message); });
        socket.on('side', function (side, checkForAvailMoney, unlockedUnits) {
            if (side === 'Server Full') {
                _this.message = 'Logged in as spectator';
                setTimeout(function () { _this.message = ''; }, 7000);
                return;
            }
            else {
                _this.checkForAvailMoney = checkForAvailMoney;
                console.log('Overdraft:', !checkForAvailMoney);
                _this.side = side;
                console.log('side: ', _this.side);
                _this.unlockedUnits = unlockedUnits;
                if (side)
                    _this.addGUI(socket);
            }
        });
        socket.on('getSide', function () {
            socket.emit('getSide', _this.side);
        });
        if (_this.side || _this.spectator)
            socket.on('game', function (playerOneBase, playerTwoBase, playerOneUnits, playerTwoUnits, leftMoney, rightMoney, time) {
                _this.updateMoney(leftMoney, rightMoney, playerOneUnits.length, playerTwoUnits.length);
                if (_this.side === 'left')
                    _this.display(playerOneBase, playerTwoBase, playerOneUnits, playerTwoUnits, time);
                else if (_this.side === 'right')
                    _this.display(playerTwoBase, playerOneBase, playerTwoUnits, playerOneUnits, time);
            });
        socket.on('atomic', function (atomicDoomPending) {
            if (atomicDoomPending && _this.firstTimeAtomicDoom) {
                console.log('atomicDoomPending');
                _this.firstTimeAtomicDoom = false;
                holdDeathAnim(canvasWidth / 2, 28, true);
            }
            if (!atomicDoomPending)
                _this.firstTimeAtomicDoom = true;
        });
        socket.on('win', function (message) {
            _this.message = message;
            setTimeout(function () { location.reload(); }, 7500);
        });
        socket.on('multiplier', function (left, right) {
            if (_this.side === 'left') {
                _this.playerMultiplier = left;
                _this.enemyMultiplier = right;
            }
            if (_this.side === 'right') {
                _this.playerMultiplier = right;
                _this.enemyMultiplier = left;
            }
        });
        socket.on('message', function (message) {
            _this.message = message;
            _this.displayText(message);
        });
        return _this;
    }
    InternetPlayer.prototype.configBases = function (playerBase, enemyBase) {
        InternetPlayer.draw(playerBase, this.playerMultiplier);
        InternetPlayer.draw(enemyBase, this.enemyMultiplier);
    };
    InternetPlayer.prototype.displayText = function (text) {
        cx.fillStyle = "red";
        if (text.length > 10) {
            cx.font = "30px Arial";
            cx.fillStyle = "green";
        }
        else
            cx.font = "45px Arial";
        cx.textAlign = "center";
        cx.fillText("" + text, canvasWidth / 2, canvasHeight / 2);
    };
    InternetPlayer.draw = function (base, multiplier) {
        multiplier = (Math.pow(multiplier, .1)) * 165 - 165;
        if (canvasHeight - 105 - multiplier < canvasHeight - 105 - 50) {
            this.drawCross(base.position + base.span / 2, 26);
        }
        if (canvasHeight - 105 - multiplier < canvasHeight - 105 - 50)
            multiplier = canvasHeight - 105 - 50;
        cx.fillStyle = base.color;
        cx.fillRect(base.position, canvasHeight - 105 - multiplier, base.span, 75 + multiplier);
        cx.fillStyle = 'lightgray';
        cx.fillRect(base.position, canvasHeight - 115 - multiplier, base.span, 5);
        cx.fillStyle = 'red';
        cx.fillRect(base.position, canvasHeight - 115 - multiplier, base.health / 800 * base.span, 5);
    };
    InternetPlayer.drawCross = function (x, y) {
        cx.strokeStyle = 'red';
        cx.beginPath();
        cx.moveTo(x, y - 7);
        cx.lineTo(x, y + 7);
        cx.moveTo(x - 7, y);
        cx.lineTo(x + 7, y);
        cx.stroke();
    };
    InternetPlayer.prototype.display = function (playerOneBase, playerTwoBase, playerUnits, enemyUnits, time) {
        var _this = this;
        cx.clearRect(0, 0, canvasWidth, canvasHeight);
        var playerUnitsNumber = this.parseUnits(playerUnits);
        var enemyUnitsNumber = this.parseUnits(enemyUnits);
        playerUnitsNumber.forEach(function (num, i) {
            _this.addTroop(num, playerUnits[i]);
        });
        enemyUnitsNumber.forEach(function (num, i) {
            _this.addTroopToEnemy(num, enemyUnits[i]);
        });
        this.configBases(playerOneBase, playerTwoBase);
        for (var _i = 0, _a = this.playerUnits; _i < _a.length; _i++) {
            var unit = _a[_i];
            unit.draw();
            unit.drawAttack(time);
        }
        for (var _b = 0, _c = this.enemyUnits; _b < _c.length; _b++) {
            var unit = _c[_b];
            unit.draw();
            unit.drawAttack(time);
        }
        this.playerUnits = [];
        this.enemyUnits = [];
        if (this.message)
            this.displayText(this.message);
    };
    InternetPlayer.prototype.addTroopToEnemy = function (index, params) {
        this.enemyUnits.push(new troopers[index]((this.side === 'left' ? 'right' : 'left'), this, this.enemy, this.multiplier, params));
    };
    InternetPlayer.prototype.addGUI = function (socket) {
        var _this = this;
        document.querySelectorAll('button').forEach(function (button) { return button.remove(); });
        document.querySelectorAll('br').forEach(function (br) { return br.remove(); });
        // if (this.spectator) return
        this.unlockUnits(false);
        var buttons = Array.from(document.getElementsByClassName(this.side + 'Button'));
        buttons.forEach(function (button, i) {
            if (i >= troopArr.length)
                return;
            button.addEventListener('click', function () {
                if (_this.unlockedUnits[i]) {
                    // @ts-ignore
                    socket.emit("AddTroop", _this.side, i);
                }
                else if (_this.money > troopArr[i - 1].researchPrice || !_this.checkForAvailMoney) {
                    _this.purchaseUnit(i, button);
                    // @ts-ignore
                    socket.emit("unlockTroop", _this.side, i);
                    // socket.emit(`AddMoney`, this.side, -troopArr[i].researchPrice)
                }
                else {
                    // @ts-ignore
                    button.style.backgroundColor = 'red';
                    setTimeout(function () {
                        // @ts-ignore
                        button.style.backgroundColor = buttonBg;
                    }, 800);
                }
            });
        });
        document.getElementById('incMult').addEventListener('click', function () {
            // @ts-ignore
            socket.emit('multiplier', _this.side);
        });
    };
    InternetPlayer.prototype.updateMoney = function (leftMoney, rightMoney, leftTroops, rightTroops) {
        if (this.side === 'left')
            this.money = leftMoney;
        else
            this.money = rightMoney;
        document.getElementById('leftMoney').innerText = "Money: " + leftMoney;
        document.getElementById('rightMoney').innerText = "Money: " + rightMoney;
        document.getElementById('encleft').innerText = leftTroops + " / " + 10;
        document.getElementById('encright').innerText = rightTroops + " / " + 10;
    };
    return InternetPlayer;
}(Player));
// try {
//     new InternetPlayer(null, '', false)
// }
// catch (e) {}
try {
    module.exports = {
        Game: Game,
        Player: Player,
        troopArr: troopArr,
    };
}
catch (e) { }
function initializeUI(btnWiderWidth, btnNarrowerWidth) {
    document.getElementById('startingScreen').style.display = 'none';
    document.getElementById('cx').style.display = 'initial';
    document.getElementById('controls').style.display = '';
    window.addEventListener('resize', function () { resize(btnWiderWidth, btnNarrowerWidth); });
    resize(btnWiderWidth, btnNarrowerWidth);
}
function resize(btnWiderWidth, btnNarrowerWidth) {
    document.querySelectorAll('button').forEach(function (e) {
        if (document.body.scrollWidth > 477) {
            e.style.width = 200 + 'px';
            if (darkTheme)
                e.style.boxShadow = '0 0 15px 4px rgb(14, 14, 14)';
            e.style.margin = '4px';
            return;
        }
        if (document.body.scrollWidth <= 477) {
            e.style.width = btnWiderWidth + 'px';
        }
        if (document.body.scrollWidth <= 347) {
            e.style.width = btnNarrowerWidth + 'px';
        }
        if (darkTheme)
            e.style.boxShadow = '0 0 7px 2px rgb(20,20,20)';
        e.style.margin = '0';
        e.style.marginTop = '5px';
        e.style.backgroundColor = buttonBg;
    });
    var cxHeight = document.getElementById('cx').offsetHeight;
    document.getElementById('controls').style.height = window.innerHeight - cxHeight + 'px';
}
try {
    var hostIP_1 = self.location.hostname;
    var hostPort_1 = '8083';
    var audioPlaying_1 = false;
    var audio_1 = new Audio('img/Age of War - Theme Soundtrack.mp3');
    document.getElementById('music').addEventListener('click', function () {
        if (!audioPlaying_1) {
            audio_1.play();
            audio_1.loop = true;
        }
        else
            audio_1.pause();
        audioPlaying_1 = !audioPlaying_1;
    });
    var shiftDown_1 = false;
    window.addEventListener('keydown', function (e) {
        if (e.shiftKey) {
            shiftDown_1 = true;
        }
    });
    window.addEventListener('keyup', function () {
        shiftDown_1 = false;
    });
    document.getElementById('pl').addEventListener('click', function () {
        new Game(new Player(55, 'left', !shiftDown_1), new Player(55, 'right', !shiftDown_1), true, true, [], []);
        initializeUI(160, 140);
    });
    document.getElementById('bot').addEventListener('click', function () {
        new Game(new Player(55, 'left', !shiftDown_1), new SimulatingBot(55, 'right', !shiftDown_1), true, true, [], []);
        initializeUI(160, 120);
    });
    document.getElementById('mul').addEventListener('click', function () {
        var address = prompt('Enter address:', "http://localhost:8080");
        // let address = `http://${hostIP}:${hostPort}`
        // let address = prompt('Enter code:', '')
        if (address === null)
            return;
        // address = `http://${hostIP}:${address}`
        new InternetPlayer(0, 'left', false, address);
        initializeUI(160, 120);
    });
    document.getElementById('code').addEventListener('click', function () {
        document.getElementById('code').innerHTML = "<i class=\"fa fa-spinner fa-spin\"></i> " + document.getElementById('code').innerHTML;
        fetch("http://" + hostIP_1 + ":" + hostPort_1, {
            headers: new Headers(),
            method: 'POST'
        }).then(function (res) {
            res.json().then(function (res) {
                console.log(res);
                if (res === 'Too many requests') {
                    alert(res);
                    return;
                }
                alert("Game code is: " + res);
                new InternetPlayer(0, 'left', false, "localhost:" + res);
                initializeUI(160, 120);
            });
        });
    });
    setTimeout(function () {
        if (document.getElementById('onlineIndicator').innerHTML === '<i class="fa fa-spinner fa-spin"></i> Play online: ') {
            document.getElementById('onlineIndicator').innerHTML = '<span style="color: red">&#10006;</span> Play online';
        }
    }, 5000);
    fetch("http://" + hostIP_1 + ":" + hostPort_1, {
        headers: new Headers(),
        method: 'GET'
    }).then(function (res) {
        res.json().then(function (mess) {
            if (mess != 'Available')
                return;
            document.getElementById('onlineIndicator').style.color = 'green';
            document.getElementById('onlineIndicator').innerHTML = '&#10004; Play online: Available!';
        });
    }).catch(function (err) {
        console.log(err);
        document.getElementById('onlineIndicator').innerHTML = '<span style="color: red">&#10006;</span> Play online';
        // @ts-ignore
        document.getElementById('mul').disabled = true;
        // @ts-ignore
        document.getElementById('code').disabled = true;
    });
}
// catch (e) {}
catch (e) {
    try {
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
                        var game_1 = simulate(plTroops, e.data[1].slice());
                        var stats = getGameStats(game_1);
                        stats.enemyUnitsLength = game_1.players[e.data[3] === 'left' ? 0 : 1].enemyUnits.length;
                        stats.playerUnitsLength = game_1.players[e.data[3] === 'left' ? 0 : 1].playerUnits.length;
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
//# sourceMappingURL=index.js.map