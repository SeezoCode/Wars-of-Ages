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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
// But be careful not to write it wrong since it has a powerful resolution going for the people that test my forms
var canvasWidth, canvasHeight, cx, explosionIMG, explosionAtomicIMG, radiationSymbolIMG, buttonColor, deathAnimPending, radioactivityPending, bgColor, buttonBg, darkTheme, playingHostedGame;
// ticks simulated per animation frame in the visualized game; real-time effects (nuke animation,
// fallout timer) divide by it so they last the same number of game ticks at any speed
var gameSpeed = 1;
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
        damage: 1,
        baseDamage: 100,
        attackSpeed: 300,
        price: 45,
        color: 'brown',
        speed: .65,
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
        if (enemyTroopers.length) {
            var enemy = enemyTroopers[0];
            var actualDamage = Math.min(this.damage, Math.max(0, enemy.health));
            stats.damageDealt += actualDamage;
            enemy.health -= this.damage;
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
        var actualDamage = Math.min(this.baseDamage, Math.max(0, base.health));
        stats.damageDealt += actualDamage;
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
            // this.damage = troopArr[4].damage * 20 * this.multiplier;
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
            if (this.side === "left" &&
                this.position + this.range > troop.position &&
                this.position + this.range - this.blast < troop.position) {
                var actualDamage = Math.min(this.damage, Math.max(0, troop.health));
                stats.damageDealt += actualDamage;
                troop.health -= this.damage;
            }
            else if (this.side === "right" &&
                this.position - this.range < troop.position &&
                this.position - this.range + this.blast > troop.position) {
                var actualDamage = Math.min(this.damage, Math.max(0, troop.health));
                stats.damageDealt += actualDamage;
                troop.health -= this.damage;
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
    ExplodingTroop.prototype.attack = function (enemyTroopers, stats) {
        if (enemyTroopers[0]) {
            var enemy = enemyTroopers[0];
            var actualDamage = Math.min(this.damage, Math.max(0, enemy.health));
            stats.damageDealt += actualDamage;
            enemy.health -= this.damage;
        }
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
            _this.maxHealth = 22 * multiplier;
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
        else if (enemyTroopers.length > 0 && (enemyTroopers[0].name === troopArr[8].name || enemyTroopers[0].name === troopArr[5].name)) {
            // ANTI-STALEMATE FIX:
            // If an enemy is blocking us, but we are too far to hit the base,
            // slowly decay health until destroyed (kills it in ~1.5 seconds).
            var distance = Math.abs(this.position - enemyTroopers[0].position);
            var collisionDistance = (this.span / 2) + (enemyTroopers[0].span / 2) + 5; // ~55 pixels
            if (distance <= collisionDistance) {
                this.health -= 0.01;
            }
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
        i += gameSpeed;
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
            }, 22000 / gameSpeed);
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
    function Game(player1, player2, visualize, DOMAccess, playerUnits1, playerUnits2, moveCount) {
        if (playerUnits1 === void 0) { playerUnits1 = []; }
        if (playerUnits2 === void 0) { playerUnits2 = []; }
        if (moveCount === void 0) { moveCount = 1; }
        this.time = 0;
        this.atomicDoomPending = false;
        this.moveCount = 1;
        this.stopped = false; // set to end a visualized game early (custom match time limit / rematch)
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
        this.moveCount = moveCount;
        if (visualize)
            gameSpeed = Math.max(1, moveCount);
        this.animation();
    }
    Game.prototype.move = function () {
        var _this = this;
        // Between-tick decisions for policy bots (UltimateBot): both decide from the same
        // state, then act left player first. Mirrors Env::step in rl/engine/src/env.rs.
        var decisions = this.players.map(function (p) { return p.decide ? p.decide(_this.time) : undefined; });
        this.players.forEach(function (p, i) {
            if (decisions[i] !== undefined)
                p.applyAction(decisions[i]);
        });
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
        var mc = this.moveCount;
        var move = function () {
            _this.move();
        };
        var aliveBases = function () {
            return _this.players[0].doesBaseHaveHealth() && _this.players[1].doesBaseHaveHealth();
        };
        var isStopped = function () { return _this.stopped; };
        if (this.visualize)
            requestAnimationFrame(hold);
        // if (this.DOMAccess) {
        //     setInterval(() => {
        //         move()
        //     }, .001)
        // }
        else {
            // Headless battle (the classic bot's worker simulations).
            // Exact early exit for stalemates such as Catapult vs Catapult, which otherwise run all 120 000
            // ticks: positions only move forward and health only goes down, so if nothing changed between
            // two checkpoints further apart than any attack cycle (Trebuchet: 300 ticks), nothing ever will.
            // The result and the Math.random() calls are the same as running to the end.
            var checkpoint = '';
            var fingerprint = function () { return __spreadArray(__spreadArray(__spreadArray([_this.playerOneBase.health, _this.playerTwoBase.health], _this.playerOneUnits.map(function (u) { return u.position + "," + u.health; })), ['|']), _this.playerTwoUnits.map(function (u) { return u.position + "," + u.health; })).join(';'); };
            while (aliveBases() && this.playerOneUnits.length && this.playerTwoUnits.length && this.time < 120000) { //
                move();
                if (this.time % 610 === 0) {
                    var fp = fingerprint();
                    if (!this.atomicDoomPending && fp === checkpoint)
                        break;
                    checkpoint = fp;
                }
            }
            // console.log('Game ended,',
            //     (!this.playerOneUnits.length && !this.playerTwoUnits.length ? 'nobody' : (this.playerOneUnits.length ? 'left' : 'right')), 'won',
            //     ', took:', this.time, 'rounds, in', performance.now() - this.msTime, 'ms\n', 'Left player damage:', this.players[0].stats.damageDealt,
            //     'Right player damage:', this.players[1].stats.damageDealt)
        }
        function hold() {
            if (isStopped())
                return;
            for (var i = 0; i < mc; i++)
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
                        }, 22000 / (_this.visualize ? gameSpeed : 1)); // 22 s = 1320 ticks at any speed
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
                        else if (_this.playerUnits.length >= _this.maxUnits) {
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
var HttpBot = /** @class */ (function (_super) {
    __extends(HttpBot, _super);
    function HttpBot(money, side, checkForAvailMoney, endpoint) {
        if (money === void 0) { money = 0; }
        if (endpoint === void 0) { endpoint = 'http://localhost:6767'; }
        var _this = _super.call(this, money, side, checkForAvailMoney) || this;
        _this.historyBuffer = new Map();
        _this.endpoint = 'http://localhost:6767';
        _this.endpoint = endpoint;
        _this.cooldown = 5;
        if (_this.botWorker) {
            _this.botWorker.terminate();
        }
        return _this;
    }
    HttpBot.prototype.getDistanceFromOurBase = function (position) {
        return this.side === 'right'
            ? Math.round((canvasWidth - 10) - position)
            : Math.round(position - 10);
    };
    HttpBot.prototype.getUnitPower = function (unit) {
        if (unit.name === 'Boomer Troop')
            return unit.damage * 1.5;
        if (unit.name === 'Trebuchet')
            return 15;
        var dps = unit.damage / Math.max(1, unit.attackSpeed);
        var rangeMultiplier = unit.range > 50 ? 1.35 : 1.0;
        return (unit.health + (dps * 60 * rangeMultiplier));
    };
    HttpBot.prototype.encouragement = function () {
        var _this = this;
        var myPower = this.playerUnits.reduce(function (sum, u) { return sum + _this.getUnitPower(u); }, 0);
        var enemyPower = this.enemyUnits.reduce(function (sum, u) { return sum + _this.getUnitPower(u); }, 0);
        if (myPower === 0 && enemyPower === 0)
            return 1.0;
        if (myPower === 0 && enemyPower > 0) {
            var closestEnemyDist = this.getDistanceFromOurBase(this.enemyUnits[0].position);
            var proximityPanic = 1 + ((canvasWidth - closestEnemyDist) / canvasWidth) * 2;
            return Math.min(10, 2.0 * proximityPanic);
        }
        if (enemyPower === 0) {
            return this.money > 40 ? 0.85 : 0.5;
        }
        var powerRatio = enemyPower / myPower;
        var enemyFrontDist = this.getDistanceFromOurBase(this.enemyUnits[0].position);
        var proximityFactor = 0.7 + 0.9 * (1 - Math.max(0, Math.min(canvasWidth, enemyFrontDist)) / canvasWidth);
        return Math.round((powerRatio * proximityFactor) * 100) / 100;
    };
    HttpBot.prototype.takeSnapshot = function () {
        var _this = this;
        var myUnits = this.playerUnits.map(function (u) { return ({
            name: u.name,
            health: Math.round(u.health),
            distanceToMyBase: _this.getDistanceFromOurBase(u.position)
        }); });
        var enemyUnits = this.enemyUnits.map(function (u) { return ({
            name: u.name,
            health: Math.round(u.health),
            distanceToMyBase: _this.getDistanceFromOurBase(u.position)
        }); });
        var mySummary = myUnits.length ? myUnits.map(function (u) { return u.name + " (HP:" + u.health + ")"; }).join(', ') : 'none';
        var enemySummary = enemyUnits.length ? enemyUnits.map(function (u) { return u.name + " (HP:" + u.health + ")"; }).join(', ') : 'none';
        var baseDamageDealt = this.enemyBase.maxHealth - this.enemyBase.health;
        var troopDamageDealt = Math.max(0, Math.round((this.stats.damageDealt - baseDamageDealt) * 10) / 10);
        var upgradeCost = 350 * (this.playerBase.level || 1);
        return {
            time: this.game.time,
            money: Math.round(this.money),
            isFallout: this.game.atomicDoomPending ? 1.0 : 0.0,
            troopDamageDealt: troopDamageDealt,
            playerBaseHealth: Math.round(this.playerBase.health),
            enemyBaseHealth: Math.round(this.enemyBase.health),
            myBaseLevel: this.playerBase.level || 1,
            enemyBaseLevel: this.enemyBase.level || 1,
            canUpgradeBase: this.money >= upgradeCost,
            baseUpgradeCost: upgradeCost,
            myUnits: myUnits,
            enemyUnits: enemyUnits,
            summary: "Our units: [" + mySummary + "] | Enemy units: [" + enemySummary + "]"
        };
    };
    HttpBot.prototype.getHistoricalSnapshot = function (secondsAgo) {
        var targetTick = this.game.time - (secondsAgo * 60);
        var roundedTick = Math.floor(targetTick / 30) * 30;
        return this.historyBuffer.get(roundedTick) || "Game had not reached this point yet.";
    };
    HttpBot.prototype.resolveTroopIndex = function (unitChoice) {
        if (typeof unitChoice === 'number' && unitChoice >= 0 && unitChoice < troopArr.length) {
            return unitChoice;
        }
        if (typeof unitChoice === 'string') {
            if (unitChoice.toLowerCase() === 'wait' || unitChoice.toLowerCase() === 'none')
                return -1;
            return troopArr.findIndex(function (t) { return t.name.toLowerCase() === unitChoice.toLowerCase(); });
        }
        return -1;
    };
    HttpBot.prototype.doesBaseHaveHealth = function () {
        var alive = _super.prototype.doesBaseHaveHealth.call(this);
        if (!alive && !this.game.atomicDoomPending) {
            setTimeout(function () { return location.reload(); }, 1000);
        }
        return alive;
    };
    HttpBot.prototype.afterMoveArmy = function () {
        var _this = this;
        if (this.DOMAccess) {
            var trsEl = document.getElementById("trs" + this.side);
            if (trsEl)
                trsEl.innerText = this.playerUnits.length + "/" + this.maxUnits + " Troops";
        }
        for (var i = 0; i <= 2; i++) {
            if (this.financialAid[i] && this.playerBase.health < (this.playerBase.maxHealth || baseStats.health) / 4 * (i + 1)) {
                this.addFunds(100);
                this.financialAid[i] = false;
            }
        }
        if (this.game.time % 30 === 0) {
            this.historyBuffer.set(this.game.time, this.takeSnapshot());
            var oldestAllowed = this.game.time - (25 * 60);
            // @ts-ignore
            for (var _i = 0, _a = this.historyBuffer.keys(); _i < _a.length; _i++) {
                var key = _a[_i];
                if (key < oldestAllowed)
                    this.historyBuffer.delete(key);
            }
        }
        var enc = this.encouragement();
        var pullEl = document.getElementById("pull" + this.side);
        if (pullEl) {
            pullEl.innerText = "Enc: " + enc.toFixed(2) + " | " + (enc > 2.2 ? 'Panic' : enc < 0.7 ? 'Winning' : 'Normal');
        }
        var upgCost = 350 * (this.playerBase.level || 1);
        var availableUnits = [];
        if (this.playerUnits.length < this.maxUnits) {
            availableUnits = troopArr
                .map(function (t, index) { return ({ index: index, name: t.name, price: t.price }); })
                .filter(function (t, index) { return _this.unlockedUnits[index] && _this.money >= t.price; });
        }
        if (this.money >= upgCost) {
            availableUnits.push({ index: 12, name: "Upgrade Base", price: upgCost });
        }
        // Only ask the server if there are valid choices available
        if (this.cooldown <= 0 && !this.working && availableUnits.length > 0) {
            this.working = true;
            var p_2 = performance.now();
            var side_2 = this.side;
            var payload = {
                side: this.side,
                money: Math.round(this.money),
                encouragement: enc,
                unlockedUnits: this.unlockedUnits,
                availableUnits: availableUnits,
                currentField: this.takeSnapshot(),
                fieldHistory: {
                    "20s_ago": this.getHistoricalSnapshot(20),
                    "10s_ago": this.getHistoricalSnapshot(10),
                    "5s_ago": this.getHistoricalSnapshot(5),
                    "2s_ago": this.getHistoricalSnapshot(2),
                    "1s_ago": this.getHistoricalSnapshot(1),
                }
            };
            fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                var _a, _b;
                var choice = (_b = (_a = data === null || data === void 0 ? void 0 : data.unit) !== null && _a !== void 0 ? _a : data === null || data === void 0 ? void 0 : data.unit_to_send) !== null && _b !== void 0 ? _b : (Array.isArray(data) ? data[0] : data);
                if (choice === "Upgrade Base") {
                    if (_this.money >= 1500) {
                        _this.multiplier *= 1.2;
                        _this.addFunds(-1500);
                        _this.playerBase.level = (_this.playerBase.level || 1) + 1;
                        _this.stats.spending += upgCost;
                    }
                    // this.stats.spending += upgCost
                    // this.addFunds(-upgCost)
                    // this.playerBase.maxHealth = (this.playerBase.maxHealth || baseStats.health) + 400
                    // this.playerBase.health += 400
                    // this.playerBase.level = (this.playerBase.level || 1) + 1
                }
                else if (choice !== "wait") {
                    var troopIndex = _this.resolveTroopIndex(choice);
                    if (troopIndex === -1 && _this.playerUnits.length === 0)
                        troopIndex = 0; // Anti stalemate
                    if (troopIndex !== -1 && _this.unlockedUnits[troopIndex]) {
                        if (troopIndex === 10 && _this.game.atomicDoomPending) { }
                        else
                            _this.addTroop(troopIndex);
                    }
                }
                _this.working = false;
                var perEl = document.getElementById("per" + side_2);
                if (perEl)
                    perEl.innerText = "Computed in: " + Math.round((performance.now() - p_2) * 1000) / 1000 + "ms";
            })
                .catch(function (err) {
                console.error("[HttpBot " + _this.side + "] Server unreachable at " + _this.endpoint + ":", err);
                if (_this.playerUnits.length === 0)
                    _this.addTroop(0);
                _this.working = false;
                _this.cooldown = 60;
            });
            this.cooldown = enc > 2.0 ? 15 : enc >= 0.8 ? 25 : 40;
        }
        if (this.cooldown <= 0) {
            if (this.playerUnits.length && this.money > 1000 &&
                (this.side === 'left' ? this.playerUnits[0].position > canvasWidth - 300 : this.playerUnits[0].position < 300)) {
                this.shouldSpawnBaseDestroyer(enc);
            }
            this.tryToUnlock();
            var numberOfUnlockedUnits_2 = 0;
            this.unlockedUnits.forEach(function (e) {
                if (e)
                    numberOfUnlockedUnits_2++;
            });
            var unlEl = document.getElementById("unl" + this.side);
            if (unlEl)
                unlEl.innerText = "Unlocked Units: " + numberOfUnlockedUnits_2;
        }
        this.cooldown--;
    };
    return HttpBot;
}(SimulatingBot));
var LocalRLBot = /** @class */ (function (_super) {
    __extends(LocalRLBot, _super);
    function LocalRLBot(money, side, checkForAvailMoney, modelUrl, maxUnits) {
        if (money === void 0) { money = 0; }
        if (modelUrl === void 0) { modelUrl = 'ultimate_dqn_model.json'; }
        if (maxUnits === void 0) { maxUnits = 7; }
        var _this = _super.call(this, money, side, checkForAvailMoney) || this;
        _this.historyBuffer = new Map();
        _this.net = null;
        _this.modelLoaded = false;
        _this.INPUT_SIZE = 148;
        _this.HIDDEN_1 = 256;
        _this.HIDDEN_2 = 128;
        _this.OUTPUT_SIZE = 14;
        _this.ACTIONS = [
            "Basic Troop", "Fast Troop", "Range Troop", "Advanced Troop",
            "Shield Troop", "Catapult", "Boomer Troop", "Doggo",
            "Trebuchet", "Atomic Troop", "Atomic Bomb", "Boss",
            "Upgrade Base", "wait"
        ];
        _this.UNIT_META = {
            "Basic Troop": { id: 0, price: 5, hp: 20, dps: 4.4 / 40, range: 0 },
            "Fast Troop": { id: 1, price: 5, hp: 12, dps: 2.3 / 13, range: 10 },
            "Range Troop": { id: 2, price: 8, hp: 20, dps: 4.3 / 50, range: 79 },
            "Advanced Troop": { id: 3, price: 10, hp: 36, dps: 15 / 70, range: 0 },
            "Shield Troop": { id: 4, price: 12, hp: 115, dps: 3 / 200, range: 0 },
            "Catapult": { id: 5, price: 20, hp: 15, dps: 3.2 / 100, range: 140 },
            "Boomer Troop": { id: 6, price: 20, hp: 1, dps: 50 / 17, range: 40 },
            "Doggo": { id: 7, price: 20, hp: 30, dps: 30 / 60, range: 0 },
            "Trebuchet": { id: 8, price: 45, hp: 5, dps: 100 / 300, range: 210 },
            "Atomic Troop": { id: 9, price: 40, hp: 280, dps: 0.6 / 1, range: 0 },
            "Atomic Bomb": { id: 10, price: 250, hp: 5000, dps: 99, range: 100 },
            "Boss": { id: 11, price: 5000, hp: 1000, dps: 40 / 180, range: 0 },
            "Upgrade Base": { id: 12, price: 0, hp: 0, dps: 0, range: 0 },
            "wait": { id: 13, price: 0, hp: 0, dps: 0, range: 0 },
        };
        _this.probHistory = [];
        _this.cooldown = 5;
        if (_this.botWorker)
            _this.botWorker.terminate();
        _this.loadModel(modelUrl);
        _this.maxUnits = maxUnits;
        return _this;
    }
    LocalRLBot.prototype.loadModel = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var res, weights, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.log("[LocalRLBot] Fetching model from " + url + "...");
                        return [4 /*yield*/, fetch(url)];
                    case 1:
                        res = _a.sent();
                        return [4 /*yield*/, res.json()];
                    case 2:
                        weights = _a.sent();
                        this.net = {
                            W1: new Float32Array(weights.W1),
                            b1: new Float32Array(weights.b1),
                            W2: new Float32Array(weights.W2),
                            b2: new Float32Array(weights.b2),
                            Wv: new Float32Array(weights.Wv),
                            bv: new Float32Array(weights.bv),
                            Wa: new Float32Array(weights.Wa),
                            ba: new Float32Array(weights.ba),
                        };
                        this.modelLoaded = true;
                        console.log("[LocalRLBot] Model loaded! Ready to destroy.");
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        console.error("[LocalRLBot] Failed to load model:", err_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    LocalRLBot.prototype.forwardPass = function (x) {
        var h1 = new Float32Array(this.HIDDEN_1);
        for (var i = 0; i < this.HIDDEN_1; i++) {
            var sum = this.net.b1[i];
            var off = i * this.INPUT_SIZE;
            for (var j = 0; j < this.INPUT_SIZE; j++)
                sum += this.net.W1[off + j] * x[j];
            h1[i] = sum > 0 ? sum : 0.01 * sum;
        }
        var h2 = new Float32Array(this.HIDDEN_2);
        for (var i = 0; i < this.HIDDEN_2; i++) {
            var sum = this.net.b2[i];
            var off = i * this.HIDDEN_1;
            for (var j = 0; j < this.HIDDEN_1; j++)
                sum += this.net.W2[off + j] * h1[j];
            h2[i] = sum > 0 ? sum : 0.01 * sum;
        }
        var value = this.net.bv[0];
        for (var i = 0; i < this.HIDDEN_2; i++)
            value += this.net.Wv[i] * h2[i];
        var adv = new Float32Array(this.OUTPUT_SIZE);
        var meanAdv = 0;
        for (var a = 0; a < this.OUTPUT_SIZE; a++) {
            var sum = this.net.ba[a];
            var off = a * this.HIDDEN_2;
            for (var i = 0; i < this.HIDDEN_2; i++)
                sum += this.net.Wa[off + i] * h2[i];
            adv[a] = sum;
            meanAdv += sum;
        }
        meanAdv /= this.OUTPUT_SIZE;
        var out = new Float32Array(this.OUTPUT_SIZE);
        for (var a = 0; a < this.OUTPUT_SIZE; a++)
            out[a] = value + (adv[a] - meanAdv);
        return out;
    };
    LocalRLBot.prototype.extractFeatures = function (field) {
        var _a, _b;
        var myUnits = field.myUnits || [];
        var enemyUnits = field.enemyUnits || [];
        var unlocked = this.unlockedUnits || [];
        var features = [];
        var myCounts = new Array(12).fill(0);
        var enemyCounts = new Array(12).fill(0);
        for (var _i = 0, myUnits_1 = myUnits; _i < myUnits_1.length; _i++) {
            var u = myUnits_1[_i];
            var m = this.UNIT_META[u.name];
            if (m && m.id < 12)
                myCounts[m.id] += 1 / 7;
        }
        for (var _c = 0, enemyUnits_1 = enemyUnits; _c < enemyUnits_1.length; _c++) {
            var u = enemyUnits_1[_c];
            var m = this.UNIT_META[u.name];
            if (m && m.id < 12)
                enemyCounts[m.id] += 1 / 7;
        }
        var unlockedFlags = Array.from({ length: 12 }, function (_, i) { return (unlocked[i] ? 1.0 : 0.0); });
        features.push.apply(features, __spreadArray(__spreadArray(__spreadArray([], myCounts), enemyCounts), unlockedFlags));
        var zones = Array.from({ length: 7 }, function () { return ({ myHP: 0, myDPS: 0, enHP: 0, enDPS: 0, enCount: 0 }); });
        for (var _d = 0, myUnits_2 = myUnits; _d < myUnits_2.length; _d++) {
            var u = myUnits_2[_d];
            var z = Math.max(0, Math.min(6, Math.floor((u.distanceToMyBase || 0) / 100)));
            var m = this.UNIT_META[u.name] || this.UNIT_META["Basic Troop"];
            zones[z].myHP += (u.health || 0) / 200;
            zones[z].myDPS += (m.dps || 0);
        }
        for (var _e = 0, enemyUnits_2 = enemyUnits; _e < enemyUnits_2.length; _e++) {
            var u = enemyUnits_2[_e];
            var z = Math.max(0, Math.min(6, Math.floor((u.distanceToMyBase || 700) / 100)));
            var m = this.UNIT_META[u.name] || this.UNIT_META["Basic Troop"];
            zones[z].enHP += (u.health || 0) / 200;
            zones[z].enDPS += (m.dps || 0);
            zones[z].enCount += 1 / 5;
        }
        for (var _f = 0, zones_1 = zones; _f < zones_1.length; _f++) {
            var z = zones_1[_f];
            features.push(Math.min(2.5, z.myHP || 0), Math.min(2.5, z.myDPS || 0), Math.min(2.5, z.enHP || 0), Math.min(2.5, z.enDPS || 0), Math.min(2.5, z.enCount || 0));
        }
        for (var i = 0; i < 6; i++) {
            var u = myUnits[i];
            if (u) {
                var m = this.UNIT_META[u.name] || this.UNIT_META["Basic Troop"];
                features.push(1.0, (u.distanceToMyBase || 0) / 700, Math.min(2, (u.health || m.hp) / m.hp), (m.range || 0) / 210);
            }
            else
                features.push(0, 0, 0, 0);
        }
        for (var i = 0; i < 6; i++) {
            var u = enemyUnits[i];
            if (u) {
                var m = this.UNIT_META[u.name] || this.UNIT_META["Basic Troop"];
                features.push(1.0, (u.distanceToMyBase || 700) / 700, Math.min(2, (u.health || m.hp) / m.hp), (m.range || 0) / 210, u.name === "Shield Troop" ? 1.0 : 0.0);
            }
            else
                features.push(0, 1.0, 0, 0, 0);
        }
        var getFrontDist = function (snap, isEnemy) {
            if (!snap || typeof snap !== "object")
                return isEnemy ? 1.0 : 0.0;
            var arr = isEnemy ? snap.enemyUnits : snap.myUnits;
            return (arr === null || arr === void 0 ? void 0 : arr[0]) ? (arr[0].distanceToMyBase || 0) / 700 : (isEnemy ? 1.0 : 0.0);
        };
        var myFrontNow = getFrontDist(field, false);
        var myFront1s = getFrontDist(this.getHistoricalSnapshot(1), false);
        var myFront2s = getFrontDist(this.getHistoricalSnapshot(2), false);
        var myFront5s = getFrontDist(this.getHistoricalSnapshot(5), false);
        var myFront10s = getFrontDist(this.getHistoricalSnapshot(10), false);
        var myFront20s = getFrontDist(this.getHistoricalSnapshot(20), false);
        var enFrontNow = getFrontDist(field, true);
        var enFront1s = getFrontDist(this.getHistoricalSnapshot(1), true);
        var enFront2s = getFrontDist(this.getHistoricalSnapshot(2), true);
        var enFront5s = getFrontDist(this.getHistoricalSnapshot(5), true);
        var enFront10s = getFrontDist(this.getHistoricalSnapshot(10), true);
        var enFront20s = getFrontDist(this.getHistoricalSnapshot(20), true);
        var frontlineGap = Math.max(-1, Math.min(1, enFrontNow - myFrontNow));
        var moneyNorm = Math.min(2.5, (this.money || 0) / 50);
        var encNorm = Math.min(2.5, (this.encouragement() || 1) / 3);
        var myBaseNorm = Math.min(2.5, (field.playerBaseHealth || 800) / 2000);
        var enemyBaseNorm = Math.min(2.5, (field.enemyBaseHealth || 800) / 2000);
        var myCapRatio = myUnits.length / 7;
        var myBaseLevelNorm = Math.min(2.0, (field.myBaseLevel || 1) / 5);
        var enBaseLevelNorm = Math.min(2.0, (field.enemyBaseLevel || 1) / 5);
        var canUpg = field.canUpgradeBase ? 1.0 : 0.0;
        var len = myUnits.length;
        var doggoComboReady = len >= 2 && ((_a = myUnits[len - 1]) === null || _a === void 0 ? void 0 : _a.name) === "Doggo" && ((_b = myUnits[len - 2]) === null || _b === void 0 ? void 0 : _b.name) === "Doggo" ? 1.0 : 0.0;
        features.push(myFrontNow, myFront1s, myFront2s, myFront5s, myFront10s, myFront20s, enFrontNow, enFront1s, enFront2s, enFront5s, enFront10s, enFront20s, frontlineGap, moneyNorm, encNorm, myBaseNorm, enemyBaseNorm, myCapRatio, doggoComboReady, myBaseLevelNorm, enBaseLevelNorm, canUpg, field.isFallout || 0.0);
        // SAFEGUARD: Replace any NaNs with 0
        var safeArray = features.map(function (f) { return isNaN(f) ? 0 : f; });
        return Float32Array.from(safeArray);
    };
    LocalRLBot.prototype.getDistanceFromOurBase = function (position) {
        return this.side === 'right' ? Math.round((canvasWidth - 10) - position) : Math.round(position - 10);
    };
    LocalRLBot.prototype.getUnitPower = function (unit) {
        if (unit.name === 'Boomer Troop')
            return unit.damage * 1.5;
        if (unit.name === 'Trebuchet')
            return 15;
        var dps = unit.damage / Math.max(1, unit.attackSpeed);
        var rangeMultiplier = unit.range > 50 ? 1.35 : 1.0;
        return (unit.health + (dps * 60 * rangeMultiplier));
    };
    LocalRLBot.prototype.encouragement = function () {
        var _this = this;
        var myPower = this.playerUnits.reduce(function (sum, u) { return sum + _this.getUnitPower(u); }, 0);
        var enemyPower = this.enemyUnits.reduce(function (sum, u) { return sum + _this.getUnitPower(u); }, 0);
        if (myPower === 0 && enemyPower === 0)
            return 1.0;
        if (myPower === 0 && enemyPower > 0)
            return Math.min(10, 2.0 * (1 + ((canvasWidth - this.getDistanceFromOurBase(this.enemyUnits[0].position)) / canvasWidth) * 2));
        if (enemyPower === 0)
            return this.money > 40 ? 0.85 : 0.5;
        return Math.round(((enemyPower / myPower) * (0.7 + 0.9 * (1 - Math.max(0, Math.min(canvasWidth, this.getDistanceFromOurBase(this.enemyUnits[0].position))) / canvasWidth))) * 100) / 100;
    };
    LocalRLBot.prototype.takeSnapshot = function () {
        var _this = this;
        var baseDamageDealt = (this.enemyBase.maxHealth || 800) - this.enemyBase.health;
        var upgradeCost = 350 * (this.playerBase.level || 1);
        return {
            time: this.game.time,
            money: Math.round(this.money),
            isFallout: this.game.atomicDoomPending ? 1.0 : 0.0,
            troopDamageDealt: Math.max(0, Math.round((this.stats.damageDealt - baseDamageDealt) * 10) / 10),
            playerBaseHealth: Math.round(this.playerBase.health),
            enemyBaseHealth: Math.round(this.enemyBase.health),
            myBaseLevel: this.playerBase.level || 1,
            enemyBaseLevel: this.enemyBase.level || 1,
            canUpgradeBase: this.money >= upgradeCost,
            baseUpgradeCost: upgradeCost,
            myUnits: this.playerUnits.map(function (u) { return ({
                name: u.name,
                health: Math.round(u.health),
                distanceToMyBase: _this.getDistanceFromOurBase(u.position)
            }); }),
            enemyUnits: this.enemyUnits.map(function (u) { return ({
                name: u.name,
                health: Math.round(u.health),
                distanceToMyBase: _this.getDistanceFromOurBase(u.position)
            }); }),
            summary: ''
        };
    };
    LocalRLBot.prototype.getHistoricalSnapshot = function (secondsAgo) {
        var targetTick = this.game.time - (secondsAgo * 60);
        return this.historyBuffer.get(Math.floor(targetTick / 30) * 30) || "none";
    };
    LocalRLBot.prototype.doesBaseHaveHealth = function () {
        var alive = _super.prototype.doesBaseHaveHealth.call(this);
        if (!alive && !this.game.atomicDoomPending) {
            setTimeout(function () { return location.reload(); }, 1000);
        }
        return alive;
    };
    LocalRLBot.prototype.afterMoveArmy = function () {
        var _this = this;
        var _a, _b;
        if (this.DOMAccess) {
            var trsEl = document.getElementById("trs" + this.side);
            if (trsEl)
                trsEl.innerText = this.playerUnits.length + "/" + this.maxUnits + " Troops";
        }
        for (var i = 0; i <= 2; i++) {
            if (this.financialAid[i] && this.playerBase.health < (this.playerBase.maxHealth || baseStats.health) / 4 * (i + 1)) {
                this.addFunds(100);
                this.financialAid[i] = false;
            }
        }
        if (this.game.time % 30 === 0) {
            this.historyBuffer.set(this.game.time, this.takeSnapshot());
            var oldestAllowed = this.game.time - (25 * 60);
            // @ts-ignore
            for (var _i = 0, _c = this.historyBuffer.keys(); _i < _c.length; _i++) {
                var key = _c[_i];
                // @ts-ignore
                if (key < oldestAllowed)
                    this.historyBuffer.delete(key);
            }
        }
        var enc = this.encouragement();
        var pullEl = document.getElementById("pull" + this.side);
        if (pullEl)
            pullEl.innerText = "Enc: " + enc.toFixed(2) + " | Local AI";
        var upgCost = 1500;
        var availableNames = [];
        var allowedIndices = [];
        if (this.playerUnits.length < this.maxUnits) {
            troopArr.forEach(function (t, i) {
                if (_this.unlockedUnits[i] && _this.money >= t.price) {
                    availableNames.push(t.name);
                    allowedIndices.push(_this.ACTIONS.indexOf(t.name));
                }
            });
        }
        if (this.money >= upgCost) {
            availableNames.push("Upgrade Base");
            allowedIndices.push(12);
        }
        if (availableNames.length === 0 || this.playerUnits.length > 0) {
            availableNames.push("wait");
            allowedIndices.push(13);
        }
        // --- LOCAL INFERENCE ---
        if (this.modelLoaded && this.cooldown <= 0 && availableNames.length > 0) {
            var p = performance.now();
            var features = this.extractFeatures(this.takeSnapshot());
            var qValues = this.forwardPass(features);
            // Safety Check: If qValues are corrupted (NaN), fallback to "wait"
            if (isNaN(qValues[0])) {
                console.error("[LocalRLBot] CRITICAL: Network output NaN. Freezing to prevent crash.");
                this.cooldown = 100;
                return;
            }
            // 1. Find both the Max AND Min Q-values among allowed choices
            var maxQ = -Infinity;
            var minQ = Infinity;
            for (var _d = 0, allowedIndices_1 = allowedIndices; _d < allowedIndices_1.length; _d++) {
                var idx = allowedIndices_1[_d];
                var q = qValues[idx];
                if (q > maxQ)
                    maxQ = q;
                if (q < minQ)
                    minQ = q;
            }
            // Ensure range is never zero to prevent dividing by zero
            var range = (maxQ - minQ) + 1e-8;
            // Universal Temperature Scale:
            // 0.1 = Very Strict (95% chance to pick #1)
            // 0.2 = Dynamic (70-80% chance for #1, 20% for #2, small chance for others)
            // 0.5 = Chaotic (Very spread out)
            var TEMPERATURE = 0.1;
            // 2. Normalize and convert to probabilities
            var sumExp = 0;
            var exps = [];
            for (var _e = 0, allowedIndices_2 = allowedIndices; _e < allowedIndices_2.length; _e++) {
                var idx = allowedIndices_2[_e];
                // This scales the Q-value strictly between 0.0 and 1.0
                var normalizedQ = (qValues[idx] - minQ) / range;
                // Apply Softmax to the 0.0 - 1.0 normalized value
                var val = Math.exp(normalizedQ / TEMPERATURE);
                exps.push({ idx: idx, val: val });
                sumExp += val;
            }
            // --- DEBUG: Print the % chance of top choices cleanly ---
            //             if (this.game.time % 10 === 0) {
            //                 let debugStr = "Probabilities: ";
            //                 // Sort array so it prints the highest % first
            //                 const sortedExps = [...exps].sort((a, b) => b.val - a.val);
            //
            //                 for (const expObj of sortedExps) {
            //                     let percent = ((expObj.val / sumExp) * 100).toFixed(1);
            //                     if (parseFloat(percent) > 0.5) {
            //                         debugStr += `${this.ACTIONS[expObj.idx]}: ${percent}% | `;
            //                     }
            //                 }
            //                 console.log(`[Top Q: ${Math.round(maxQ)}] ${debugStr}`);
            // }
            // --- VISUAL UI UPDATE ---
            // --- VISUAL UI UPDATE (Fixed Order & 10-Decision Smoothing) ---
            // Convert current probabilities to strict percentages
            var currentProbs = {};
            for (var _f = 0, exps_1 = exps; _f < exps_1.length; _f++) {
                var expObj = exps_1[_f];
                currentProbs[expObj.idx] = (expObj.val / sumExp) * 100;
            }
            // Store in history window (keep last 10 decisions)
            this.probHistory.push(currentProbs);
            if (this.probHistory.length > 8) {
                this.probHistory.shift();
            }
            var html = "<div style=\"font-family: monospace;\"><strong>" + this.side.toUpperCase() + " AI Brain:</strong><br/>";
            var _loop_2 = function (i) {
                // Check if it is unlocked (0-11 are troops, 12 is Base, 13 is wait)
                var isUnlocked = i < 12 ? this_1.unlockedUnits[i] : true;
                if (isUnlocked) {
                    // Find the maximum probability this unit had over the last 10 decisions
                    var maxProbInWindow = 0;
                    for (var _h = 0, _j = this_1.probHistory; _h < _j.length; _h++) {
                        var hist = _j[_h];
                        if (hist[i] !== undefined && hist[i] > maxProbInWindow) {
                            maxProbInWindow = hist[i];
                        }
                    }
                    var unitName_1 = this_1.ACTIONS[i];
                    var color = ((_a = troopArr.find(function (t) { return t.name === unitName_1; })) === null || _a === void 0 ? void 0 : _a.color) || (i === 12 ? 'gold' : 'gray');
                    html += "\n            <div style=\"margin-top: 4px; font-size: 11px; display: flex; align-items: center; width: 100%;\">\n                <div style=\"width: 85px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">" + unitName_1 + "</div>\n                <div style=\"flex-grow: 1; background: #e0e0e0; height: 8px; margin: 0 8px; border-radius: 4px; overflow: hidden;\">\n                    <div style=\"width: " + maxProbInWindow + "%; background: " + color + "; height: 100%; border-radius: 4px; transition: width 0.2s ease-out;\"></div>\n                </div>\n                <div style=\"width: 35px; text-align: right;\">" + maxProbInWindow.toFixed(0) + "%</div>\n            </div>\n        ";
                }
            };
            var this_1 = this;
            // Loop through ALL actions in their strict default order so the rows never jump around
            for (var i = 0; i < this.ACTIONS.length; i++) {
                _loop_2(i);
            }
            html += "</div>";
            // Target your existing HTML element
            var uiEl = document.getElementById("ai-stats-" + this.side);
            if (uiEl)
                uiEl.innerHTML = html;
            // --------------------------------------------------------------
            // ------------------------
            // --------------------------------------------------------
            // 3. Spin the probability wheel
            var rand = Math.random() * sumExp;
            var chosenIdx = (_b = allowedIndices[0]) !== null && _b !== void 0 ? _b : 13;
            for (var _g = 0, exps_2 = exps; _g < exps_2.length; _g++) {
                var expObj = exps_2[_g];
                rand -= expObj.val;
                if (rand <= 0) {
                    chosenIdx = expObj.idx;
                    break;
                }
            }
            var choice_1 = this.ACTIONS[chosenIdx];
            if (choice_1 === "Upgrade Base") {
                if (this.money >= 1500 && Math.random() > 0.5) {
                    this.multiplier *= 1.2;
                    this.addFunds(-1500);
                    // this.playerBase.maxHealth = (this.playerBase.maxHealth || baseStats.health) + 400;
                    // this.playerBase.health += 400;
                    this.playerBase.level = (this.playerBase.level || 1) + 1;
                    this.stats.spending += upgCost;
                }
                // this.addFunds(-upgCost);
            }
            else if (choice_1 !== "wait") {
                var troopIndex = troopArr.findIndex(function (t) { return t.name === choice_1; });
                if (troopIndex === -1 && this.playerUnits.length === 0)
                    troopIndex = 0;
                if (troopIndex !== -1 && this.unlockedUnits[troopIndex]) {
                    if (troopIndex === 10 && this.game.atomicDoomPending) { }
                    else
                        this.addTroop(troopIndex);
                }
            }
            var perEl = document.getElementById("per" + this.side);
            if (perEl)
                perEl.innerText = "Local Inference: " + Math.round((performance.now() - p) * 100) / 100 + "ms";
            this.cooldown = enc > 2.0 ? 15 : enc >= 0.8 ? 25 : 40;
        }
        this.tryToUnlock();
        if (this.cooldown <= 0) {
            if (this.playerUnits.length && this.money > 1000 && (this.side === 'left' ? this.playerUnits[0].position > canvasWidth - 300 : this.playerUnits[0].position < 300))
                this.shouldSpawnBaseDestroyer(enc);
            this.tryToUnlock();
        }
        this.cooldown--;
    };
    return LocalRLBot;
}(SimulatingBot));
// ============================================================================
// UltimateBot — policy trained with the Rust engine + PyTorch PPO in rl/
// (see rl/README.md). observe(), actionMask() and applyAction() MUST stay identical
// to rl/engine/src/obs.rs; rl/parity checks this.
// ============================================================================
var ULT_NUM_ACTIONS = 26; // 0-11 spawn troop i, 12-23 research troop i, 24 upgrade, 25 wait
var ULT_RESEARCH0 = 12;
var ULT_UPGRADE = 24;
var ULT_WAIT = 25;
var ULT_MAX_SLOTS = 10;
var ULT_GLOBAL = 72;
var ULT_UNIT = 20;
var ULT_OBS_SIZE = ULT_GLOBAL + 2 * ULT_MAX_SLOTS * ULT_UNIT;
var ULT_TIME_SCALE = 36000;
var UltimateBot = /** @class */ (function (_super) {
    __extends(UltimateBot, _super);
    function UltimateBot(money, side, checkForAvailMoney, modelUrl, greedy) {
        if (money === void 0) { money = 0; }
        if (modelUrl === void 0) { modelUrl = 'ultimate_model.json'; }
        if (greedy === void 0) { greedy = false; }
        var _this = _super.call(this, money, side, checkForAvailMoney) || this;
        _this.decisionInterval = 10;
        _this.layers = null;
        _this.lastProbs = null;
        _this.computeMs = [];
        _this.brainHistory = [];
        _this.greedy = greedy;
        if (modelUrl)
            _this.loadModel(modelUrl);
        return _this;
    }
    UltimateBot.prototype.loadModel = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var res, _a, err_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, fetch(url)];
                    case 1:
                        res = _b.sent();
                        _a = this.setModel;
                        return [4 /*yield*/, res.json()];
                    case 2:
                        _a.apply(this, [_b.sent()]);
                        console.log("[UltimateBot] Model loaded from " + url);
                        return [3 /*break*/, 4];
                    case 3:
                        err_2 = _b.sent();
                        console.error("[UltimateBot] Failed to load model:", err_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    UltimateBot.decodeFloats = function (b64) {
        var bin = atob(b64);
        var view = new DataView(new ArrayBuffer(bin.length));
        for (var i = 0; i < bin.length; i++)
            view.setUint8(i, bin.charCodeAt(i));
        var out = new Float32Array(bin.length / 4);
        for (var i = 0; i < out.length; i++)
            out[i] = view.getFloat32(i * 4, true);
        return out;
    };
    UltimateBot.prototype.setModel = function (json) {
        if (json.obs_size !== ULT_OBS_SIZE || json.num_actions !== ULT_NUM_ACTIONS) {
            throw new Error("model expects obs " + json.obs_size + "/actions " + json.num_actions + ", game has " + ULT_OBS_SIZE + "/" + ULT_NUM_ACTIONS);
        }
        this.decisionInterval = json.decision_interval || 10;
        this.layers = json.layers.map(function (l) { return ({
            type: l.type, in: l.in, out: l.out, size: l.size, eps: l.eps,
            weight: l.weight ? UltimateBot.decodeFloats(l.weight) : undefined,
            bias: l.bias ? UltimateBot.decodeFloats(l.bias) : undefined,
        }); });
    };
    UltimateBot.prototype.unlockUnits = function (bindEventListeners) {
        if (bindEventListeners === void 0) { bindEventListeners = true; }
        // no buttons for bots
    };
    UltimateBot.prototype.enemyPlayer = function () {
        return this.enemy;
    };
    UltimateBot.prototype.actionMask = function () {
        var mask = new Array(ULT_NUM_ACTIONS).fill(false);
        var room = this.playerUnits.length < this.maxUnits;
        for (var i = 0; i < troopArr.length; i++) {
            mask[i] = this.unlockedUnits[i] && this.money >= troopArr[i].price && room && !(i === 10 && this.game.atomicDoomPending);
            mask[ULT_RESEARCH0 + i] = !this.unlockedUnits[i] && this.money >= troopArr[i].researchPrice;
        }
        mask[ULT_UPGRADE] = this.money >= 1500;
        mask[ULT_WAIT] = true;
        return mask;
    };
    UltimateBot.prototype.applyAction = function (action) {
        var mask = this.actionMask();
        if (!(action >= 0 && action < ULT_NUM_ACTIONS) || !mask[action])
            return;
        if (action < troopArr.length) {
            this.addTroop(action);
        }
        else if (action < ULT_UPGRADE) {
            var i = action - ULT_RESEARCH0;
            this.addFunds(-troopArr[i].researchPrice);
            this.unlockedUnits[i] = true;
        }
        else if (action === ULT_UPGRADE) {
            this.multiplier *= 1.2;
            this.addFunds(-1500);
        }
    };
    UltimateBot.prototype.observe = function () {
        var _this = this;
        var me = this;
        var en = this.enemyPlayer();
        var time = this.game.time;
        var g = [];
        var moneyFeatures = function (m) { return [Math.min(m, 200) / 200, Math.log(1 + Math.max(m, 0)) / 8]; };
        var b = function (x) { return x ? 1 : 0; };
        var doggoCombo = function (units) { return units.length >= 2 &&
            units[units.length - 1].name === troopArr[7].name && units[units.length - 2].name === troopArr[7].name; };
        var hpSum = function (units) { return units.reduce(function (s, u) { return s + Math.max(u.health, 0); }, 0); };
        g.push.apply(g, __spreadArray(__spreadArray([], moneyFeatures(me.money)), moneyFeatures(en.money)));
        g.push(Math.max(me.playerBase.health, 0) / 800, Math.max(en.playerBase.health, 0) / 800);
        g.push(Math.log(me.multiplier) / Math.log(1.2) / 10, Math.log(en.multiplier) / Math.log(1.2) / 10);
        g.push(me.playerUnits.length / ULT_MAX_SLOTS, en.playerUnits.length / ULT_MAX_SLOTS);
        g.push(b(this.game.atomicDoomPending));
        for (var i = 0; i < 3; i++)
            g.push(b(me.financialAid[i]));
        for (var i = 0; i < 3; i++)
            g.push(b(en.financialAid[i]));
        for (var i = 0; i < troopArr.length; i++)
            g.push(b(me.unlockedUnits[i]));
        for (var i = 0; i < troopArr.length; i++)
            g.push(b(en.unlockedUnits[i]));
        for (var _i = 0, _a = this.actionMask(); _i < _a.length; _i++) {
            var m = _a[_i];
            g.push(b(m));
        }
        g.push(Math.min(time / ULT_TIME_SCALE, 1));
        g.push(b(doggoCombo(me.playerUnits)), b(doggoCombo(en.playerUnits)));
        g.push(Math.min(hpSum(me.playerUnits) / 1000, 3), Math.min(hpSum(en.playerUnits) / 1000, 3));
        var out = new Float32Array(ULT_OBS_SIZE);
        for (var i = 0; i < g.length; i++)
            out[i] = g[i];
        var egoX = function (pos) { return _this.side === 'left' ? pos / canvasWidth : (canvasWidth - pos) / canvasWidth; };
        var writeUnits = function (units, base) {
            var _loop_3 = function (s) {
                var u = units[s];
                var off = base + s * ULT_UNIT;
                var kind = troopArr.findIndex(function (t) { return t.name === u.name; });
                out[off] = 1;
                out[off + 1 + kind] = 1;
                out[off + 13] = b(u.puppy === true);
                out[off + 14] = egoX(u.position);
                out[off + 15] = Math.min(Math.max(u.health / u.maxHealth, 0), 1);
                out[off + 16] = Math.min(Math.max(u.health, 0) / 200, 5);
                if (u.targetTime !== null && u.targetTime !== undefined) {
                    out[off + 17] = 1;
                    out[off + 18] = Math.min(Math.max((u.targetTime - time) / u.attackSpeed, 0), 1);
                }
                out[off + 19] = Math.log(1 + Math.max(u.damage, 0)) / 5;
            };
            for (var s = 0; s < Math.min(units.length, ULT_MAX_SLOTS); s++) {
                _loop_3(s);
            }
        };
        writeUnits(me.playerUnits, ULT_GLOBAL);
        writeUnits(en.playerUnits, ULT_GLOBAL + ULT_MAX_SLOTS * ULT_UNIT);
        return out;
    };
    UltimateBot.prototype.forward = function (obs) {
        var x = obs;
        for (var _i = 0, _a = this.layers; _i < _a.length; _i++) {
            var l = _a[_i];
            if (l.type === 'linear') {
                var y = new Float32Array(l.out);
                for (var o = 0; o < l.out; o++) {
                    var sum = l.bias[o];
                    var off = o * l.in;
                    for (var i = 0; i < l.in; i++)
                        sum += l.weight[off + i] * x[i];
                    y[o] = sum;
                }
                x = y;
            }
            else if (l.type === 'layernorm') {
                var mean = 0, varSum = 0;
                for (var i = 0; i < x.length; i++)
                    mean += x[i];
                mean /= x.length;
                for (var i = 0; i < x.length; i++)
                    varSum += Math.pow((x[i] - mean), 2);
                var inv = 1 / Math.sqrt(varSum / x.length + l.eps);
                var y = new Float32Array(x.length);
                for (var i = 0; i < x.length; i++)
                    y[i] = (x[i] - mean) * inv * l.weight[i] + l.bias[i];
                x = y;
            }
            else {
                var y = new Float32Array(x.length);
                for (var i = 0; i < x.length; i++) {
                    var v = x[i];
                    if (l.type === 'relu')
                        y[i] = v > 0 ? v : 0;
                    else if (l.type === 'tanh')
                        y[i] = Math.tanh(v);
                    else if (l.type === 'silu')
                        y[i] = v / (1 + Math.exp(-v));
                    else if (l.type === 'gelu')
                        y[i] = 0.5 * v * (1 + Math.tanh(0.7978845608028654 * (v + 0.044715 * v * v * v)));
                    else
                        throw new Error("unknown layer type " + l.type);
                }
                x = y;
            }
        }
        return x;
    };
    /** Called by Game.move() before each tick; returns an action on decision ticks. */
    UltimateBot.prototype.decide = function (time) {
        if (!this.layers || time % this.decisionInterval !== 0)
            return undefined;
        var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
        var mask = this.actionMask();
        var logits = this.forward(this.observe());
        var maxL = -Infinity;
        for (var a = 0; a < ULT_NUM_ACTIONS; a++)
            if (mask[a] && logits[a] > maxL)
                maxL = logits[a];
        var probs = new Array(ULT_NUM_ACTIONS).fill(0);
        var sum = 0;
        for (var a = 0; a < ULT_NUM_ACTIONS; a++)
            if (mask[a]) {
                probs[a] = Math.exp(logits[a] - maxL);
                sum += probs[a];
            }
        for (var a = 0; a < ULT_NUM_ACTIONS; a++)
            probs[a] /= sum;
        this.lastProbs = probs;
        var action = ULT_WAIT;
        if (this.greedy) {
            var best = -1;
            for (var a = 0; a < ULT_NUM_ACTIONS; a++)
                if (mask[a] && probs[a] > best) {
                    best = probs[a];
                    action = a;
                }
        }
        else {
            var r = Math.random();
            for (var a = 0; a < ULT_NUM_ACTIONS; a++)
                if (mask[a]) {
                    action = a;
                    r -= probs[a];
                    if (r <= 0)
                        break;
                }
        }
        if (this.DOMAccess) {
            this.showComputeTime(performance.now() - t0);
            this.showBrain(probs);
        }
        return action;
    };
    /** "Computed in" line, like the other bots: last decision and the average of the last 60. */
    UltimateBot.prototype.showComputeTime = function (ms) {
        this.computeMs.push(ms);
        if (this.computeMs.length > 60)
            this.computeMs.shift();
        var avg = this.computeMs.reduce(function (a, b) { return a + b; }, 0) / this.computeMs.length;
        var perEl = typeof document !== 'undefined' ? document.getElementById("per" + this.side) : null;
        if (perEl)
            perEl.innerText = "Computed in: " + ms.toFixed(2) + "ms (avg " + avg.toFixed(2) + "ms)";
    };
    /** Probability bars in a fixed order (like LocalRLBot): every unlocked troop, research, upgrade, wait.
     *  Each bar shows the highest probability over the last 8 decisions so it doesn't flicker. */
    UltimateBot.prototype.showBrain = function (probs) {
        var _this = this;
        var el = typeof document !== 'undefined' ? document.getElementById("ai-stats-" + this.side) : null;
        if (!el)
            return;
        var researchSum = 0, researchBest = -1;
        for (var i = 0; i < troopArr.length; i++) {
            var p = probs[ULT_RESEARCH0 + i];
            researchSum += p;
            if (p > 0 && (researchBest < 0 || p > probs[ULT_RESEARCH0 + researchBest]))
                researchBest = i;
        }
        // rows 0-11 troops, 12 research (all targets), 13 upgrade, 14 wait
        var rows = probs.slice(0, troopArr.length).concat([researchSum, probs[ULT_UPGRADE], probs[ULT_WAIT]]);
        this.brainHistory.push({ rows: rows, research: researchBest >= 0 ? troopArr[researchBest].name : '' });
        if (this.brainHistory.length > 8)
            this.brainHistory.shift();
        var peak = function (r) { return Math.max.apply(Math, _this.brainHistory.map(function (h) { return h.rows[r]; })) * 100; };
        var lastResearch = __spreadArray([], this.brainHistory).reverse().find(function (h) { return h.research; });
        var bar = function (label, title, color, pct) { return "\n            <div style=\"margin-top: 4px; font-size: 11px; display: flex; align-items: center; width: 100%;\" title=\"" + title + "\">\n                <div style=\"width: 85px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">" + label + "</div>\n                <div style=\"flex-grow: 1; background: #e0e0e0; height: 8px; margin: 0 8px; border-radius: 4px; overflow: hidden;\">\n                    <div style=\"width: " + pct + "%; background: " + color + "; height: 100%; border-radius: 4px; transition: width 0.2s ease-out;\"></div>\n                </div>\n                <div style=\"width: 35px; text-align: right;\">" + pct.toFixed(0) + "%</div>\n            </div>"; };
        var html = "<div style=\"font-family: monospace;\"><strong>" + this.side.toUpperCase() + " Ultimate AI:</strong><br/>";
        for (var i = 0; i < troopArr.length; i++) {
            if (this.unlockedUnits[i])
                html += bar(troopArr[i].name, troopArr[i].name, troopArr[i].color, peak(i));
        }
        var resName = lastResearch ? lastResearch.research : '';
        html += bar(resName ? "Res: " + resName : 'Research', resName ? "Research " + resName : 'Research a new unit', 'mediumpurple', peak(troopArr.length));
        html += bar('Upgrade +20%', 'Increase all troop stats by 20% (1500)', 'gold', peak(troopArr.length + 1));
        html += bar('wait', 'wait', 'gray', peak(troopArr.length + 2));
        el.innerHTML = html + "</div>";
    };
    return UltimateBot;
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
        SimulatingBot: SimulatingBot,
        LocalRLBot: LocalRLBot,
        UltimateBot: UltimateBot,
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
        if (e.classList.contains('keep-size'))
            return;
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
        game_1 = new Game(new Player(500, 'left', !shiftDown_1), new Player(500, 'right', !shiftDown_1), true, true, [], []);
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
    if (new URLSearchParams(window.location.search).get('mode') === 'player-vs-reinforcementai') {
        game_1 = new Game(new Player(55, 'left', !shiftDown_1), new HttpBot(55, 'right', !shiftDown_1), // <-- Using HttpBot here
        true, true, [], []);
        initializeUI();
    }
    // Or pit SimulatingBot against your new HttpBot to test it!
    if (new URLSearchParams(window.location.search).get('mode') === 'bot-vs-bot') {
        game_1 = new Game(new SimulatingBot(55, 'left', !shiftDown_1), new HttpBot(55, 'right', !shiftDown_1), true, true, [], []);
        initializeUI();
    }
    if (new URLSearchParams(window.location.search).get('mode') === 'reinforcementai-vs-reinforcementai') {
        game_1 = new Game(new HttpBot(55, 'left', !shiftDown_1), new HttpBot(55, 'right', !shiftDown_1), true, true, [0], [], 5);
        initializeUI();
    }
    if (new URLSearchParams(window.location.search).get('mode') === 'player-vs-local-reinforcementai') {
        game_1 = new Game(new Player(55, 'left', !shiftDown_1), new LocalRLBot(55, 'right', !shiftDown_1, 'ultimate_dqn_model.json', 10), true, true, [], []);
        initializeUI();
    }
    if (new URLSearchParams(window.location.search).get('mode') === 'local-reinforcementai-vs-reinforcementai') {
        game_1 = new Game(new LocalRLBot(55, 'left', !shiftDown_1, 'ultimate_dqn_model.json', 10), new LocalRLBot(55, 'right', !shiftDown_1, 'ultimate_dqn_model.json', 10), true, true, [0], [], 5);
        initializeUI();
    }
    if (new URLSearchParams(window.location.search).get('mode') === 'local-old-vs-reinforcementai') {
        game_1 = new Game(new SimulatingBot(55, 'left', !shiftDown_1), new LocalRLBot(55, 'right', !shiftDown_1), true, true, [0], [], 1);
        initializeUI();
    }
    if (new URLSearchParams(window.location.search).get('mode') === 'player-vs-ultimate-ai') {
        game_1 = new Game(new Player(55, 'left', !shiftDown_1), new UltimateBot(55, 'right', !shiftDown_1, 'ultimate_model.json'), true, true, [], []);
        initializeUI();
    }
    if (new URLSearchParams(window.location.search).get('mode') === 'old-bot-vs-ultimate-ai') {
        game_1 = new Game(new SimulatingBot(55, 'left', !shiftDown_1), new UltimateBot(55, 'right', !shiftDown_1, 'ultimate_model.json'), true, true, [], []);
        initializeUI();
    }
    if (new URLSearchParams(window.location.search).get('mode') === 'local-reinforcementai-vs-ultimate-ai') {
        game_1 = new Game(new LocalRLBot(55, 'left', !shiftDown_1, 'ultimate_dqn_model.json', 10), new UltimateBot(55, 'right', !shiftDown_1, 'ultimate_model.json'), true, true, [], []);
        initializeUI();
    }
    // ---------------- Custom match picker: any player/model vs any other ----------------
    var PLAYER_KINDS_1 = [
        { key: 'human', label: 'Human', model: false, maxUnits: 10 },
        { key: 'classic', label: 'Classic AI (Player vs AI bot)', model: false, maxUnits: 7 },
        { key: 'dqn', label: 'Local reinforcement AI (DQN)', model: true, defaultModel: 'ultimate_dqn_model.json', maxUnits: 10 },
        { key: 'ultimate', label: 'Ultimate AI', model: true, defaultModel: 'ultimate_model.json', maxUnits: 10 },
        { key: 'http', label: 'HTTP bot (server on localhost:6767)', model: false, maxUnits: 7 },
    ];
    var kindInfo_1 = function (key) { return PLAYER_KINDS_1.find(function (k) { return k.key === key; }) || PLAYER_KINDS_1[0]; };
    var el_1 = function (id) { return document.getElementById(id); };
    var custom_1 = { cfg: null, tally: { left: 0, right: 0, draw: 0 }, recorded: false, timer: null };
    function readSide(side) {
        var kind = el_1(side + "Kind").value;
        var file = el_1(side + "File").files && el_1(side + "File").files[0];
        return {
            kind: kind,
            model: el_1(side + "Model").value.trim() || kindInfo_1(kind).defaultModel || '',
            file: kindInfo_1(kind).model && file ? file : null,
            greedy: el_1(side + "Greedy").checked,
            maxUnits: Math.max(1, Math.min(50, parseInt(el_1(side + "Max").value) || kindInfo_1(kind).maxUnits)),
        };
    }
    function refreshPicker() {
        for (var _i = 0, _a = ['left', 'right']; _i < _a.length; _i++) {
            var side = _a[_i];
            var info = kindInfo_1(el_1(side + "Kind").value);
            el_1(side + "ModelBox").style.display = info.model ? '' : 'none';
            el_1(side + "GreedyBox").style.display = info.key === 'ultimate' ? '' : 'none';
            el_1(side + "Model").placeholder = info.defaultModel || '';
            el_1(side + "Max").placeholder = String(info.maxUnits);
        }
    }
    function sideName(c) {
        var info = kindInfo_1(c.kind);
        if (!info.model)
            return info.label + (c.maxUnits !== info.maxUnits ? " (max " + c.maxUnits + ")" : '');
        var src = c.file ? c.file.name : c.model;
        var extras = (c.greedy && info.key === 'ultimate' ? ', greedy' : '') +
            (c.maxUnits !== info.maxUnits ? ", max " + c.maxUnits : '');
        return (info.key === 'ultimate' ? 'Ultimate AI' : 'DQN AI') + " (" + src.split('/').pop() + extras + ")";
    }
    function makeCustomPlayer(c, side, money) {
        var p = makeCustomPlayerOfKind(c, side, money);
        p.maxUnits = c.maxUnits;
        return p;
    }
    function makeCustomPlayerOfKind(c, side, money) {
        var modelUrl = c.file ? (c.fileUrl = c.fileUrl || URL.createObjectURL(c.file)) : c.model;
        var noReload = function (b) {
            // these bots reload the page when they lose; keep the custom match (and its tally) instead
            b.doesBaseHaveHealth = function () { return Player.prototype.doesBaseHaveHealth.call(b); };
            return b;
        };
        switch (c.kind) {
            case 'classic':
                return new SimulatingBot(money, side, true);
            case 'dqn':
                return noReload(new LocalRLBot(money, side, true, modelUrl, 10));
            case 'ultimate':
                return new UltimateBot(money, side, true, modelUrl, c.greedy);
            case 'http':
                return noReload(new HttpBot(money, side, true));
            default:
                return new Player(money, side, true);
        }
    }
    function showMatchInfo(status) {
        if (status === void 0) { status = ''; }
        var c = custom_1.cfg, t = custom_1.tally;
        el_1('matchInfo').style.display = 'block';
        el_1('matchText').innerHTML = "<b style=\"color: royalblue\">" + sideName(c.left) + "</b> " + t.left + " : " + t.right + " " +
            ("<b style=\"color: crimson\">" + sideName(c.right) + "</b> &nbsp;\u00B7&nbsp; draws " + t.draw) + (status ? " &nbsp;\u00B7&nbsp; " + status : '');
    }
    function startCustomMatch() {
        var c = custom_1.cfg;
        if (game_1)
            game_1.stopped = true;
        // remove the previous match's troop buttons before human players create new ones
        for (var _i = 0, _a = ['left', 'right']; _i < _a.length; _i++) {
            var side = _a[_i];
            el_1(side).querySelectorAll('button, br, hr').forEach(function (e) { return e.remove(); });
        }
        el_1('ai-stats-left').innerHTML = el_1('ai-stats-right').innerHTML = '';
        el_1('leftMoney').innerHTML = el_1('rightMoney').innerHTML = "Money: " + c.money;
        var left = makeCustomPlayer(c.left, 'left', c.money);
        var right = makeCustomPlayer(c.right, 'right', c.money);
        custom_1.recorded = false;
        game_1 = new Game(left, right, true, true, [], [], c.speed);
        initializeUI();
        showMatchInfo('playing…');
        if (!custom_1.timer)
            custom_1.timer = setInterval(watchCustomMatch, 250);
    }
    function watchCustomMatch() {
        if (!game_1 || custom_1.recorded || !custom_1.cfg)
            return;
        var c = custom_1.cfg;
        var leftDead = game_1.playerOneBase.health <= 0, rightDead = game_1.playerTwoBase.health <= 0;
        var timeUp = c.limit > 0 && game_1.time >= c.limit * 60 * 60;
        if (!leftDead && !rightDead && !timeUp)
            return;
        custom_1.recorded = true;
        var status;
        if (leftDead && !rightDead) {
            custom_1.tally.right++;
            status = 'right won';
        }
        else if (rightDead && !leftDead) {
            custom_1.tally.left++;
            status = 'left won';
        }
        else {
            custom_1.tally.draw++;
            status = timeUp ? "draw (" + c.limit + " min limit)" : 'draw';
            game_1.stopped = true;
        }
        var botsOnly = c.left.kind !== 'human' && c.right.kind !== 'human';
        showMatchInfo(status + (c.repeat && botsOnly ? ' — next game in 3 s' : ''));
        if (c.repeat && botsOnly)
            setTimeout(function () { if (custom_1.recorded)
                startCustomMatch(); }, 3000);
    }
    function launchCustom(cfg) {
        custom_1.cfg = cfg;
        custom_1.tally = { left: 0, right: 0, draw: 0 };
        // shareable / reloadable link (uploaded files can't go into a URL)
        var q = new URLSearchParams({
            mode: 'custom', left: cfg.left.kind, right: cfg.right.kind, speed: String(cfg.speed),
            money: String(cfg.money), limit: String(cfg.limit), repeat: cfg.repeat ? '1' : '0',
        });
        for (var _i = 0, _a = [['l', cfg.left], ['r', cfg.right]]; _i < _a.length; _i++) {
            var _b = _a[_i], side = _b[0], c = _b[1];
            if (kindInfo_1(c.kind).model && !c.file)
                q.set(side + "model", c.model);
            if (c.greedy)
                q.set(side + "greedy", '1');
            if (c.maxUnits !== kindInfo_1(c.kind).maxUnits)
                q.set(side + "max", String(c.maxUnits));
        }
        history.replaceState(null, '', '?' + q.toString());
        startCustomMatch();
    }
    function pickerConfig() {
        return {
            left: readSide('left'), right: readSide('right'),
            speed: Math.max(1, parseInt(el_1('pickSpeed').value) || 1),
            money: Math.max(0, parseFloat(el_1('pickMoney').value) || 0),
            limit: Math.max(0, parseFloat(el_1('pickLimit').value) || 0),
            repeat: el_1('pickRepeat').checked,
        };
    }
    for (var _i = 0, _a = ['left', 'right']; _i < _a.length; _i++) {
        var side = _a[_i];
        el_1(side + "Kind").innerHTML = PLAYER_KINDS_1.map(function (k) { return "<option value=\"" + k.key + "\">" + k.label + "</option>"; }).join('');
        el_1(side + "Kind").addEventListener('change', refreshPicker);
    }
    el_1('leftKind').value = 'human';
    el_1('rightKind').value = 'ultimate';
    var params_1 = new URLSearchParams(window.location.search);
    if (params_1.get('mode') === 'custom') {
        var _loop_1 = function (side, s) {
            if (params_1.get(side) && PLAYER_KINDS_1.some(function (k) { return k.key === params_1.get(side); }))
                el_1(side + "Kind").value = params_1.get(side);
            el_1(side + "Model").value = params_1.get(s + "model") || '';
            el_1(side + "Greedy").checked = params_1.get(s + "greedy") === '1';
            el_1(side + "Max").value = params_1.get(s + "max") || '';
        };
        // prefill from the URL
        for (var _b = 0, _c = [['left', 'l'], ['right', 'r']]; _b < _c.length; _b++) {
            var _d = _c[_b], side = _d[0], s = _d[1];
            _loop_1(side, s);
        }
        if (params_1.get('speed'))
            el_1('pickSpeed').value = params_1.get('speed');
        if (params_1.get('money'))
            el_1('pickMoney').value = params_1.get('money');
        if (params_1.get('limit'))
            el_1('pickLimit').value = params_1.get('limit');
        el_1('pickRepeat').checked = params_1.get('repeat') === '1';
    }
    refreshPicker();
    el_1('customBtn').addEventListener('click', function () {
        el_1('menuButtons').style.display = 'none';
        el_1('customPanel').style.display = 'block';
    });
    el_1('pickBack').addEventListener('click', function () {
        el_1('customPanel').style.display = 'none';
        el_1('menuButtons').style.display = '';
    });
    el_1('pickSwap').addEventListener('click', function () {
        for (var _i = 0, _a = ['Kind', 'Model', 'Greedy', 'Max']; _i < _a.length; _i++) {
            var f = _a[_i];
            var prop = f === 'Greedy' ? 'checked' : 'value';
            var tmp = el_1("left" + f)[prop];
            el_1("left" + f)[prop] = el_1("right" + f)[prop];
            el_1("right" + f)[prop] = tmp;
        }
        el_1('leftFile').value = el_1('rightFile').value = ''; // file inputs can't be swapped
        refreshPicker();
    });
    el_1('pickStart').addEventListener('click', function () { return launchCustom(pickerConfig()); });
    el_1('matchRematch').addEventListener('click', function () { if (custom_1.cfg)
        startCustomMatch(); });
    el_1('matchMenu').addEventListener('click', function () { return window.open('?', '_self'); });
    if (params_1.get('mode') === 'custom')
        launchCustom(pickerConfig());
    console.log(new URLSearchParams(window.location.search).get('mode'));
    document.getElementById('pl').addEventListener('click', function () {
        window.open('?mode=player-vs-player', '_self');
    });
    document.getElementById('bot').addEventListener('click', function () {
        window.open('?mode=player-vs-ai', '_self');
    });
    document.getElementById('mul1').addEventListener('click', function () {
        window.open('?mode=multiplayer', '_self');
    });
    document.getElementById('bot2').addEventListener('click', function () {
        window.open('?mode=player-vs-genai', '_self');
    });
    document.getElementById('bot3').addEventListener('click', function () {
        window.open('?mode=player-vs-reinforcementai', '_self');
    });
    document.getElementById('bot4').addEventListener('click', function () {
        window.open('?mode=reinforcementai-vs-reinforcementai', '_self');
    });
    document.getElementById('bot5').addEventListener('click', function () {
        window.open('?mode=player-vs-local-reinforcementai', '_self');
    });
    document.getElementById('bot6').addEventListener('click', function () {
        window.open('?mode=local-reinforcementai-vs-reinforcementai', '_self');
    });
    document.getElementById('bot7').addEventListener('click', function () {
        window.open('?mode=local-old-vs-reinforcementai', '_self');
    });
    document.getElementById('bot8').addEventListener('click', function () {
        window.open('?mode=player-vs-ultimate-ai', '_self');
    });
    document.getElementById('bot9').addEventListener('click', function () {
        window.open('?mode=old-bot-vs-ultimate-ai', '_self');
    });
    document.getElementById('bot10').addEventListener('click', function () {
        window.open('?mode=local-reinforcementai-vs-ultimate-ai', '_self');
    });
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
            document.getElementById('mul').style.display = 'initial';
            // @ts-ignore
            document.getElementById('code').disabled = false;
            // @ts-ignore
            document.getElementById('code').style.display = 'initial';
            // @ts-ignore
            document.getElementById('mul1').style.display = 'none';
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
                    if (i >= 8)
                        continue;
                    for (var j = 0; j < numberOfUnlockedUnits; j++) {
                        if (j >= 8 || (i === 6 && j === 6))
                            continue;
                        for (var k = 0; k < numberOfUnlockedUnits; k++) {
                            if (k >= 8 || ((i === 6 && k === 6) || (j === 6 && k === 6)))
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