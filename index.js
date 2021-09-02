var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// But be careful not to write it wrong since it has a powerful resolution going for the people that test my forms
var canvasWidth, canvasHeight, cx, explosionIMG, explosionAtomicIMG, radiationSymbolIMG, buttonColor, deathAnimPending, radioactivityPending, bgColor, buttonBg, darkTheme, playingHostedGame;
try {
    var canvas = document.querySelector('canvas');
    canvasWidth = canvas.width = 700;
    canvasHeight = canvas.height = 250;
    cx = canvas.getContext('2d');
    explosionIMG = new Image(68, 55);
    explosionIMG.src = 'img/explosion.png';
    explosionAtomicIMG = new Image(255, 255);
    explosionAtomicIMG.src = 'img/nuke.png';
    radiationSymbolIMG = new Image(255, 255);
    radiationSymbolIMG.src = 'img/radiationSymbol.png';
    darkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
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
        // @ts-ignore
        if (parameters.puppy) {
            this.puppy = true;
            // @ts-ignore
            this.damage = parameters.damage;
            // @ts-ignore
            this.attackSpeed = parameters.attackSpeed;
            // @ts-ignore
            this.speed = parameters.speed;
            // @ts-ignore
            this.span = parameters.span;
        }
    };
    Trooper.prototype.attack = function (enemyTroopers, stats) {
        // console.log('attacked enemy: ', enemyTroopers)
        if (enemyTroopers.length) {
            stats.damageDealt += this.damage;
            // (enemyTroopers[0].health < 0 ? 0 :
            // enemyTroopers[0].health < this.damage ?
            // enemyTroopers[0].health : this.damage)
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
    };
    // else this.attack(enemyTroopers, stats) // This is a shortcut, may not be as precise!
    Trooper.prototype.isInFront = function (playerUnits, index) {
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
    Trooper.prototype.timeAttackBase = function (time, base, stats) {
        // if (this.visualize) {
        if (this.targetTime === null)
            this.targetTime = time + this.attackSpeed;
        else if (time >= this.targetTime) {
            this.attackBase(base, stats);
            this.targetTime = null;
        }
    };
    // else this.attackBase(base) // This is a shortcut, may not be as precise!
    Trooper.prototype.attackBase = function (base, stats) {
        base.health -= this.baseDamage;
        stats.damageDealt += this.baseDamage;
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
var ShieldTroop = /** @class */ (function (_super) {
    __extends(ShieldTroop, _super);
    function ShieldTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        var _this = _super.call(this, troopArr[4], side, player.visualize, multiplier, specialParameters) || this;
        _this.multiplier = multiplier;
        return _this;
    }
    ShieldTroop.prototype.draw = function () {
        if (this.visualize) {
            cx.fillStyle = this.color;
            cx.fillRect(this.position - this.span / 2, canvasHeight - 65, this.span, 35);
            cx.fillStyle = 'brown';
            cx.fillRect(this.position - (this.side === 'left' ? 3 : this.span) + this.span / 2, canvasHeight - 65, 3, 35);
            this.drawHealth();
        }
    };
    ShieldTroop.prototype.attack = function (enemyTroopers, stats, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        if (enemyTroopers[0].name === troopArr[4].name) {
            this.damage = troopArr[4].damage * 20 * this.multiplier;
        }
        else {
            this.damage = troopArr[4].damage * this.multiplier;
        }
        _super.prototype.attack.call(this, enemyTroopers, stats);
    };
    return ShieldTroop;
}(Trooper));
var CatapultTroop = /** @class */ (function (_super) {
    __extends(CatapultTroop, _super);
    function CatapultTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        var _this = _super.call(this, troopArr[5], side, player.visualize, multiplier, specialParameters) || this;
        _this.blast = 60;
        return _this;
    }
    CatapultTroop.prototype.drawAttack = function (time) {
        if (!this.visualize)
            return;
        if (this.targetTime !== null && this.visualize) {
            _super.prototype.drawAttack.call(this, time);
        }
        var y;
        if (this.targetTime)
            y = canvasHeight - 100 -
                Math.abs(Math.sin(((this.attackSpeed / 8) / (this.targetTime - time)) / (this.attackSpeed / 8) * Math.PI)) * 50 + 5;
        else
            y = canvasHeight - 100;
        if (this.targetTime) {
            cx.fillStyle = 'silver';
            cx.beginPath();
            if (this.side === 'left') {
                cx.arc(this.position + this.attackSpeed / Math.abs(time - this.targetTime), y, 5, 0, 2 * Math.PI); // y = canvasHeight - 100
            }
            else if (this.side === 'right') {
                cx.arc(this.position - this.attackSpeed / Math.abs(time - this.targetTime), y, 5, 0, 2 * Math.PI); // y = canvasHeight - 100
            }
            cx.fill();
        }
    };
    CatapultTroop.prototype.attack = function (enemyTroopers, stats) {
        for (var _i = 0, enemyTroopers_1 = enemyTroopers; _i < enemyTroopers_1.length; _i++) {
            var troop = enemyTroopers_1[_i];
            if (this.side === 'left' && this.position + this.range > troop.position && this.position + this.range - this.blast < troop.position) {
                troop.health -= this.damage;
                stats.damageDealt += this.damage;
            }
            else if (this.side === 'right' && this.position - this.range < troop.position && this.position - this.range + this.blast > troop.position) {
                troop.health -= this.damage;
                stats.damageDealt += this.damage;
            }
        }
    };
    return CatapultTroop;
}(Trooper));
var ExplodingTroop = /** @class */ (function (_super) {
    __extends(ExplodingTroop, _super);
    function ExplodingTroop(side, player, enemy, multiplier, specialParameters, troopStats) {
        if (specialParameters === void 0) { specialParameters = {}; }
        if (troopStats === void 0) { troopStats = troopArr[6]; }
        var _this = _super.call(this, troopStats, side, player.visualize, multiplier, specialParameters) || this;
        // @ts-ignore
        if (player.visualize)
            Array.from(document.getElementsByClassName(_this.side + "Button")).forEach(function (btn) {
                if (btn.id === troopArr[6].name) {
                    // @ts-ignore
                    btn.disabled = true;
                    setTimeout(function () {
                        // @ts-ignore
                        btn.disabled = false;
                    }, 400);
                }
            });
        return _this;
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
    ExplodingTroop.prototype.timeAttackBase = function (time, base, stats) {
        this.deleteAnim();
        _super.prototype.timeAttackBase.call(this, time, base, stats);
    };
    ExplodingTroop.prototype.attackBase = function (base, stats) {
        this.health = 0;
        _super.prototype.attackBase.call(this, base, stats);
    };
    ExplodingTroop.prototype.isInFront = function (playerUnits, index) {
        if (playerUnits.length) {
            if ((this.side === 'left' && playerUnits[0].side === 'left') ||
                (this.side === 'right' && playerUnits[0].side === 'right'))
                return false;
        }
        return _super.prototype.isInFront.call(this, playerUnits, index);
    };
    ExplodingTroop.prototype.deleteAnim = function (position) {
        if (position === void 0) { position = this.position; }
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
var DoggoTroop = /** @class */ (function (_super) {
    __extends(DoggoTroop, _super);
    // player: playerInterface
    // playerUnits: Array<trooperStatsInterface>
    function DoggoTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        var _this = _super.call(this, troopArr[7], side, player.visualize, multiplier, specialParameters) || this;
        // index: number
        // amountOfDogsPresent: number = 0
        _this.puppy = false;
        if (!playingHostedGame && player.playerUnits.length >= 2) {
            if (player.playerUnits[player.playerUnits.length - 1].name === troopArr[7].name && player.playerUnits[player.playerUnits.length - 2].name === troopArr[7].name) {
                _this.puppy = true;
            }
        }
        // console.log(player)
        if (_this.puppy) {
            _this.health = 22 * multiplier;
            _this.maxHealth = _this.health * multiplier;
            _this.damage = 3.2 * multiplier;
            _this.attackSpeed = 10;
            _this.speed = 2.2;
            _this.span = 10;
        }
        _this.multiplier = multiplier;
        return _this;
    }
    DoggoTroop.prototype.attack = function (enemyTroopers, stats) {
        if (this.puppy)
            this.damage = Math.random() * 6 * this.multiplier;
        _super.prototype.attack.call(this, enemyTroopers, stats);
    };
    DoggoTroop.prototype.draw = function () {
        if (this.visualize) {
            cx.fillStyle = this.color;
            cx.fillRect(this.position - this.span / 2, canvasHeight - 45 + (this.span == 10 ? 5 : 0), this.span, (this.span == 10 ? 10 : 15));
            this.drawHealth();
        }
    };
    return DoggoTroop;
}(Trooper));
var TrebuchetTroop = /** @class */ (function (_super) {
    __extends(TrebuchetTroop, _super);
    function TrebuchetTroop(side, player, enemy, multiplier, specialParameters) {
        if (specialParameters === void 0) { specialParameters = {}; }
        var _this = _super.call(this, troopArr[8], side, player.visualize, multiplier, specialParameters) || this;
        _this.enemyBase = player.enemyBase;
        return _this;
    }
    TrebuchetTroop.prototype.timeAttack = function (time, enemyTroopers, stats) {
        if (this.side === 'left' && canvasWidth - this.position - 55 < this.range) {
            _super.prototype.timeAttackBase.call(this, time, this.enemyBase, stats);
        } // attacks enemy base even when unit is close but base is far !!!
        else if (this.side === 'right' && this.position - this.range - 55 < 0) {
            _super.prototype.timeAttackBase.call(this, time, this.enemyBase, stats);
        }
    };
    TrebuchetTroop.prototype.attackBase = function (base, stats) {
        _super.prototype.attackBase.call(this, base, stats);
    };
    TrebuchetTroop.prototype.drawAttack = function (time) {
        if (this.visualize) {
            _super.prototype.drawAttack.call(this, time);
            var y = void 0;
            if (this.targetTime && this.targetTime - time <= this.attackSpeed / 5)
                y = canvasHeight - 100 -
                    Math.abs(Math.sin(((this.attackSpeed / 5) / (this.targetTime - time)) / (this.attackSpeed / 5) * Math.PI)) * 100 + 5;
            else
                y = canvasHeight - 100;
            if (this.targetTime) {
                cx.fillStyle = 'silver';
                cx.beginPath();
                cx.arc(this.position + (this.side === 'left' ? (1 / (this.targetTime - time)) * (canvasWidth - this.position - 35) :
                    -(1 / (this.targetTime - time)) * (this.position - 35)), y, 10, 0, 2 * Math.PI); // y = canvasHeight - 100
                cx.fill();
            }
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
        this.health -= (this.maxHealth / 8) / canvasWidth;
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
    // player: playerInterface
    // enemy: playerInterface
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
var troopers = [BasicTroop, FastTroop, RangeTroop, AdvancedTroop, ShieldTroop, CatapultTroop, ExplodingTroop, DoggoTroop, TrebuchetTroop, AtomicTroop, AtomicBomb, BossTroop];
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
    Game.prototype.boomerDoomer = function (position) {
    };
    Game.prototype.animation = function () {
        var _this = this;
        var move = function () {
            _this.move();
        };
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
            while (aliveBases() && this.playerOneUnits.length && this.playerTwoUnits.length && this.time < 120000) { //
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
        this.unlockedUnits = [true, false, false, false, false, false, false, false, false, false, false, false];
        // this.unlockedUnits = [true, true, true, true, true, true, true, true, true, true, true, true]
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
        if (!this.checkForMoneyAvail && visualize) {
            document.getElementById(this.side + "Money").innerHTML = "";
            document.getElementById('shBot').style.height = '30px';
            this.unlockedUnits = [true, true, true, true, true, true, true, true, true, true, true, true];
            this.money = 1999;
        }
        if (startingPlayerUnits.length > 0) {
            startingPlayerUnits.forEach(function (i) { return _this.addTroop(i); });
        }
        this.enemyUnits = enemyUnits;
        this.game = game;
        this.unlockUnits();
    };
    Player.prototype.addTroop = function (index, params) {
        if (params === void 0) { params = {}; }
        // if (this.playerUnits.length) {
        //     for (let unit of this.playerUnits) {
        //         if (troopArr[5].name === troopArr[index].name && unit.name === troopArr[5].name) return
        //     }
        // }
        if (index === undefined)
            return;
        if (this.isEnoughMoney(troopArr[index].price) && this.playerUnits.length < this.maxUnits) {
            if (this.DOMAccess) {
                this.stats.units[Object.keys(this.stats.units)[index]] += 1;
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
                console.log('Base destroyed: ', this.playerBase, '\nLeft used units:', this.game.players[0].stats.units, 'Right used units:', this.game.players[1].stats.units);
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
                    // this.stats.damageDealt += unit.damage
                    // console.log(this.stats.damageDealt)
                }
            }
            if (unit.range) {
                if (this.side === 'right' && unit.position - unit.range <= this.enemyUnits[0].position) {
                    unit.timeAttack(time, this.enemyUnits, this.stats);
                    // this.stats.damageDealt += unit.damage
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
                        setTimeout(function () {
                            _this.game.atomicDoomPending = false;
                        }, 22000);
                    }
                    else if (playerUnit.name === troopArr[6].name) {
                        _this.game.boomerDoomer(playerUnit.position);
                        enemy.addFunds(playerUnit.price * 2.5);
                        // this.boomerDoomer(playerUnit.position)
                    }
                    // @ts-ignore
                    else if (playerUnit.name === troopArr[7].name && playerUnit.puppy) {
                        enemy.addFunds(playerUnit.price * 2);
                    }
                    else {
                        enemy.addFunds(playerUnit.price * 3);
                    }
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
                    unit.timeAttackBase(time, enemyBase, this.stats);
                }
                if (this.side === 'right' && unit.position <= 55 + unit.range)
                    unit.timeAttackBase(time, enemyBase, this.stats);
            }
        }
    };
    Player.prototype.moveArmy = function () {
        var _this = this;
        if (deathAnimPending)
            return;
        for (var i = 0; i < 2; i++) {
            this.playerUnits.forEach(function (troop, i) {
                if (_this.side === 'left') {
                    if (!troop.isInFront(_this.playerUnits, i) && !troop.isInFront(_this.enemyUnits, 1) &&
                        troop.position < canvasWidth - baseStats.span - 10) {
                        troop.position += troop.speed / 2;
                    }
                }
                else if (_this.side === 'right') {
                    if (!troop.isInFront(_this.playerUnits, i) && !troop.isInFront(_this.enemyUnits, 1) &&
                        troop.position > baseStats.span + 10) {
                        troop.position -= troop.speed / 2;
                    }
                }
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
                    button.innerHTML = "<span style=\"color: " + stat.color + "\"><i class=\"fas fa-lock\"></i></span> Purchase for " + troopArr[i].researchPrice;
                if (bindEventListeners)
                    button.addEventListener('click', function () {
                        if (!_this.unlockedUnits[i])
                            _this.purchaseUnit(i, button);
                        else if (_this.unlockedUnits[i] && !_this.isEnoughMoney(stat.price)) {
                            _this.redden(button, 280);
                        }
                        else if (_this.playerUnits.length >= 10) {
                            _this.redden(button, 180);
                        }
                        else if (_this.unlockedUnits[i])
                            _this.addTroop(i);
                        if (_this.checkForMoneyAvail)
                            document.getElementById(_this.side + "Money").innerHTML = "Money: " + Math.round(_this.money);
                        else {
                            document.getElementById(_this.side + "Money").innerHTML = "";
                        }
                    });
            });
            div_1.appendChild(document.createElement('hr'));
            var button_1 = document.createElement('button');
            button_1.innerHTML = "Increase all troop stats by 20%: 1500";
            div_1.appendChild(button_1);
            button_1.id = 'incMult';
            if (bindEventListeners) {
                button_1.addEventListener('click', function () {
                    if (_this.isEnoughMoney(1500)) {
                        _this.multiplier *= 1.2;
                        _this.addFunds(-1500);
                        // console.log(this.multiplier)
                    }
                    else
                        _this.redden(button_1, 800);
                });
            }
            // for (let i = 0; i <= 10; i++) {
            div_1.appendChild(document.createElement('br'));
            // }
        }
    };
    Player.prototype.redden = function (element, time) {
        element.style.backgroundColor = 'red';
        setTimeout(function () {
            element.style.backgroundColor = buttonBg;
        }, time);
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
            catch (e) {
            }
            // document.querySelectorAll(`.${this.side}`)[index].removeAttribute('disabled')
        }
        else {
            // @ts-ignore
            this.redden(element, 520);
        }
    };
    return Player;
}());
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
        _this.botWorker = new Worker('index.js');
        return _this;
    }
    // constructor(money = 0, side: string, checkForAvailMoney: boolean) {
    //     super(money, side, checkForAvailMoney);
    // }
    SimulatingBot.prototype.afterMoveArmy = function () {
        var _this = this;
        _super.prototype.afterMoveArmy.call(this);
        if (this.money > 1800) {
            this.multiplier *= 1.2;
            this.addFunds(-1500);
        }
        var enc = this.encouragement();
        if (enc > 50 && this.playerUnits.length <= 1)
            this.addTroop(0);
        document.getElementById("pull" + this.side).innerText = 'Mode: ' + (enc > 2 ? 'Panic' : this.shouldPull(0, enc) ? 'Pull' : 'Normal');
        if (this.cooldown <= 0 && !this.shouldPull(1, enc)) {
            if (enc >= .8 && !this.working && this.playerUnits.length < this.maxUnits) {
                this.working = true;
                var cancelWork_1 = function () { return _this.working = false; };
                var addTroop_1 = function (i) { return _this.addTroop(i); };
                var side_1 = this.side;
                var p_1 = performance.now();
                // let worker = new Worker('index.js')
                this.botWorker.postMessage([this.parseUnits(this.playerUnits), this.parseUnits(this.enemyUnits),
                    this.unlockedUnits, 'right', this.money, enc > 3]);
                this.botWorker.onmessage = function (e) {
                    // console.log(e.data)
                    if (e.data.length)
                        addTroop_1(e.data[0]);
                    if (enc > 1.8)
                        addTroop_1(e.data[1]);
                    if (enc > 2.8)
                        addTroop_1(e.data[2]);
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
            this.unlockedUnits.forEach(function (e) {
                if (e) {
                    numberOfUnlockedUnits_1++;
                }
            });
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
            if (this.roundsSpentAtOpponentsHalf > 2700) { // 45 seconds = 2700
                return true;
            }
        }
        return false;
    };
    SimulatingBot.prototype.tryToUnlock = function () {
        if (!this.unlockedUnits[this.unlockedUnits.length - 1] && this.money > troopArr[this.toUnlockUnit].researchPrice * 1.25) {
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
            this.money -= troopArr[index].researchPrice;
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
        _this.boomerDoom = false;
        _this.boomerDoomAt = -1;
        _this.cash = 0;
        playingHostedGame = true;
        var socket = io(address); // ws://localhost:8080
        // this.map(new Player(1000, 'right', false), true, true, [], [], [], new Base(baseStats, 'right'), new Base(baseStats, 'left'))
        _this.DOMAccess = true;
        _this.playerUnits = [];
        _this.enemyUnits = [];
        _this.firstTimeAtomicDoom = true;
        socket.on('mess', function (message) {
            console.log(message);
        });
        socket.on('side', function (side, checkForAvailMoney, unlockedUnits) {
            if (side === 'Server Full') {
                _this.message = 'Logged in as spectator';
                setTimeout(function () {
                    _this.message = '';
                }, 7000);
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
        socket.on('boomer', function (position) {
            _this.boomerDoom = true;
            _this.boomerDoomAt = position;
            setTimeout(function () {
                _this.boomerDoom = false;
            }, 85);
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
                // console.log('atomicDoomPending')
                _this.firstTimeAtomicDoom = false;
                holdDeathAnim(canvasWidth / 2, 28, true);
                setTimeout(function () {
                    _this.firstTimeAtomicDoom = true;
                }, 22000);
            }
        });
        socket.on('win', function (message) {
            _this.message = message;
            setTimeout(function () {
                location.reload();
            }, 7500);
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
    InternetPlayer.prototype.boomerBoom = function (position) {
        cx.drawImage(explosionIMG, position - 20 / 2 - 34, canvasHeight - 65 - 35 / 2);
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
            multiplier = canvasHeight - 105 - 80;
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
        this.playerUnits = [];
        this.enemyUnits = [];
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
        if (this.boomerDoom)
            this.boomerBoom(this.boomerDoomAt);
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
        document.querySelectorAll('hr').forEach(function (hr) { return hr.remove(); });
        // if (this.spectator) return
        this.unlockUnits(false);
        //@ts-ignore
        var buttons = Array.from(document.getElementsByClassName(this.side + 'Button'));
        buttons.forEach(function (button, i) {
            if (i >= troopArr.length)
                return;
            button.addEventListener('click', function () {
                if ((!_this.unlockedUnits[i] && _this.cash >= troopArr[i].researchPrice) || !_this.checkForAvailMoney) {
                    _this.purchaseUnit(i, button);
                    // @ts-ignore
                    socket.emit("unlockTroop", _this.side, i);
                }
                else if (_this.unlockedUnits[i] && _this.cash < troopArr[i].price) {
                    // @ts-ignore
                    _this.redden(button, 280);
                }
                else if (_this.playerUnits.length >= 10) {
                    //@ts-ignore
                    _this.redden(button, 180);
                }
                else if (_this.unlockedUnits[i]) {
                    // @ts-ignore
                    socket.emit("AddTroop", _this.side, i);
                }
                else {
                    // @ts-ignore
                    _this.redden(button, 500);
                }
            });
        });
        document.getElementById('incMult').addEventListener('click', function () {
            if (_this.money < 1500) {
                _this.redden(document.getElementById('incMult'), 800);
            }
            // @ts-ignore
            socket.emit('multiplier', _this.side);
        });
    };
    InternetPlayer.prototype.updateMoney = function (leftMoney, rightMoney, leftTroops, rightTroops) {
        if (this.side === 'left') {
            this.money = leftMoney;
            this.cash = leftMoney;
        }
        else {
            this.money = rightMoney;
            this.cash = rightMoney;
        }
        document.getElementById('leftMoney').innerText = "Money: " + leftMoney;
        document.getElementById('rightMoney').innerText = "Money: " + rightMoney;
        document.getElementById('trsleft').innerText = leftTroops + " / " + 10;
        document.getElementById('trsright').innerText = rightTroops + " / " + 10;
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
catch (e) {
}
function initializeUI() {
    document.getElementById('leftMoney').style.display = 'initial';
    document.getElementById('rightMoney').style.display = 'initial';
    document.getElementById('startingScreen').style.display = 'none';
    document.getElementById('cx').style.display = 'initial';
    document.getElementById('controls').style.display = '';
    document.getElementById('shBot').style.display = 'block';
    window.addEventListener('resize', function () {
        resize();
    });
    resize();
}
function resize() {
    document.querySelectorAll('button').forEach(function (e) {
        if (document.body.scrollWidth > 440) {
            e.style.width = 200 + 'px';
            if (darkTheme)
                e.style.boxShadow = '0 0 15px 4px rgb(14, 14, 14)';
            e.style.margin = '4px';
            return;
        }
        if (document.body.scrollWidth <= 440) {
            e.style.width = 'auto';
        }
        if (darkTheme)
            e.style.boxShadow = '0 0 7px 2px rgb(20,20,20)';
        e.style.margin = '0';
        e.style.marginTop = '5px';
        e.style.backgroundColor = buttonBg;
    });
    var cxHeight = document.getElementById('cx').offsetHeight;
    document.getElementById('controls').style.height = window.innerHeight - cxHeight - 50 + 'px';
}
try {
    var hostIP = self.location.hostname;
    var hostPort = '8083';
    var onlineConnection_1 = false;
    var game_1;
    var audioPlaying_1 = false;
    var audio_1 = new Audio('img/Age of War - Theme Soundtrack.mp3');
    document.getElementById('music').addEventListener('click', function () {
        if (!audioPlaying_1) {
            audio_1.play().then(function () {
            });
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
    if (new URLSearchParams(window.location.search).get('mode') === 'player-vs-player') {
        game_1 = new Game(new Player(55, 'left', !shiftDown_1), new Player(55, 'right', !shiftDown_1), true, true, [], []);
        initializeUI();
    }
    if (new URLSearchParams(window.location.search).get('mode') === 'player-vs-ai') {
        game_1 = new Game(new Player(55, 'left', !shiftDown_1), new SimulatingBot(55, 'right', !shiftDown_1), true, true, [], []);
        initializeUI();
    }
    if (new URLSearchParams(window.location.search).get('mode') === 'multiplayer') {
        new InternetPlayer(0, 'left', false, 'https://multiplayer1-dot-testerislus.ew.r.appspot.com');
        initializeUI();
    }
    console.log(new URLSearchParams(window.location.search).get('mode'));
    document.getElementById('pl').addEventListener('click', function () {
        window.open('/?mode=player-vs-player', '_self');
    });
    document.getElementById('bot').addEventListener('click', function () {
        window.open('/?mode=player-vs-ai', '_self');
    });
    document.getElementById('mul1').addEventListener('click', function () {
        window.open('/?mode=multiplayer', '_self');
    });
    // document.getElementById('mul2').addEventListener('click', () => {
    //     new InternetPlayer(0, 'left', false, 'https://multiplayer2-dot-testerislus.ew.r.appspot.com')
    //     initializeUI()
    // })
    // document.getElementById('mul3').addEventListener('click', () => {
    //     new InternetPlayer(0, 'left', false, 'https://testerislus.ew.r.appspot.com')
    //     initializeUI()
    // })
    // document.getElementById('mul4').addEventListener('click', () => {
    //     new InternetPlayer(0, 'left', false, 'https://multiplayer3-dot-testerislus.ew.r.appspot.com')
    //     initializeUI()
    // })
    fetch("http://" + hostIP + ":" + hostPort, {
        headers: new Headers(),
        method: 'GET'
    }).then(function (res) {
        res.json().then(function (mess) {
            if (mess != 'Available')
                return;
            document.getElementById('onlineIndicator').style.color = 'green';
            document.getElementById('onlineIndicator').innerHTML = '&#10004; Play online: Available!';
            // @ts-ignore
            document.getElementById('mul').disabled = false;
            // @ts-ignore
            document.getElementById('code').disabled = false;
            onlineConnection_1 = true;
        });
    }).catch(function (err) {
        console.log(err);
        document.getElementById('onlineIndicator').innerHTML =
            'Play online: Available';
        // @ts-ignore
        document.getElementById('mul').disabled = false;
        // @ts-ignore
        document.getElementById('code').disabled = false;
    });
    // ------ //
    //@ts-ignore
    window.cheat1000 = function (side, amount) {
        if (side === void 0) { side = ''; }
        if (amount === void 0) { amount = 1000; }
        if (!playingHostedGame && (side === 'left' || side === 'right')) {
            game_1.players[side === 'left' ? 0 : 1].money += amount;
            document.getElementById(side + "Money").innerHTML = "Money: " + game_1.players[side === 'left' ? 0 : 1].money;
        }
        else {
            var a = document.createElement('a');
            var link = document.createTextNode("");
            a.appendChild(link);
            a.href = "https://youtu.be/dQw4w9WgXcQ";
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            a.style.display = '';
        }
    };
}
// catch (e) {}
catch (e) {
    try {
        onmessage = function (e) {
            // e[0] playerTroops e[1] enemyTroops e[2] unlockedUnits e[3] side e[4] money e[5] quick compute mode
            // console.log(e);
            var bestDPM = -9999;
            var bestStats;
            var bestTroops = [];
            var numberOfUnlockedUnits = 0;
            e.data[2].forEach(function (e) {
                return e ? numberOfUnlockedUnits++ : 0;
            });
            if (numberOfUnlockedUnits >= troopArr.length - 2) {
                numberOfUnlockedUnits = troopArr.length - 2;
            }
            // if (numberOfUnlockedUnits >= 4) numberOfUnlockedUnits = 4
            // let p = performance.now()
            if (!e[5]) {
                for (var i = 0; i < numberOfUnlockedUnits; i++) { // - trebuchet
                    if (i === 8)
                        continue;
                    for (var j = 0; j < numberOfUnlockedUnits; j++) {
                        if (j === 8 || (i === 6 && j === 6))
                            continue;
                        for (var k = 0; k < numberOfUnlockedUnits; k++) {
                            if (((i === 6 && k === 6) || (j === 6 && k === 6)))
                                continue;
                            var plTroops = e.data[0].slice();
                            plTroops.push(i);
                            plTroops.push(j);
                            plTroops.push(k);
                            // let p = performance.now()
                            simulationHandler(plTroops);
                        }
                    }
                }
            }
            else {
                for (var i = 0; i < numberOfUnlockedUnits; i++) { // - trebuchet
                    if (i === 8)
                        continue;
                    for (var j = 0; j < numberOfUnlockedUnits; j++) {
                        if (j === 8 || (i === 6 && j === 6))
                            continue;
                        if (j === 6)
                            continue;
                        var plTroops = e.data[0].slice();
                        plTroops.push(i);
                        plTroops.push(j);
                        simulationHandler(plTroops);
                    }
                }
            }
            function simulationHandler(plTroops) {
                var game = simulate(plTroops, e.data[1].slice());
                var stats = getGameStats(game);
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
                stats.playerSpending = game.players[0].stats.spending;
                stats.playerDamage = game.players[0].stats.damageDealt;
                stats.enemyDamage = game.players[1].stats.damageDealt;
                return stats;
            }
            function damageCalc(stats) {
                // if (stats.playerSpending > e.data[4])
                //     return 0;
                return (stats.playerDamage / stats.playerSpending);
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