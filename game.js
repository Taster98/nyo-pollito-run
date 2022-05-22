/* x -> muri
! -> lava statica 
@ -> punto di partenza del giocatore
o -> pollo
= -> lava che si sposta orizzontalmente*/
function Level(plan) {
    this.width = plan[0].length;
    this.height = plan.length;
    this.grid = [];
    this.actors = [];

    for (var y = 0; y < this.height; y++) {
        var line = plan[y], gridline = [];
        for (var x = 0; x < this.width; x++) {
            var ch = line[x], fieldType = null;
            var Actor = actorChars[ch];
            if (Actor)
                this.actors.push(new Actor(new Vector(x, y), ch));
            else if (ch == "x")
                fieldType = "wall";
            else if (ch == "!")
                fieldType = "lava";
            gridline.push(fieldType);
        }
        this.grid.push(gridline);
    }
    this.player = this.actors.filter(function (actor) {
        return actor.type == "player";
    })[0];
    this.status = this.finishDelay = null;
}
// metodo per identificare la fine del livello
Level.prototype.isFinished = function () {
    return this.status != null && this.finishDelay < 0;
};

function Vector(x, y) {
    this.x = x; this.y = y;
}

Vector.prototype.plus = function (other) {
    return new Vector(this.x + other.x, this.y + other.y);
};
Vector.prototype.times = function (factor) {
    return new Vector(this.x * factor, this.y * factor);
};

var actorChars = {
    "@": Player,
    "o": Chicken,
    "!": Lava, "=": Lava, "v": Lava
};

function Player(pos) {
    this.pos = pos.plus(new Vector(0, -0.5));
    this.size = new Vector(0.8, 1.5);
    this.speed = new Vector(0, 0);
}
Player.prototype.type = "player";

function Lava(pos, ch) {
    this.pos = pos;
    this.size = new Vector(1, 1);
    if (ch == "=") {
        this.speed = new Vector(2, 0);
    } else if (ch == "!") {
        this.speed = new Vector(0, 2);
        this.repeatPos = pos;
    } else if (ch == "v") {
        this.speed = new Vector(0, 3);
        this.repeatPos = pos;
    }
}
Lava.prototype.type = "lava";

function Chicken(pos) {
    this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
    this.size = new Vector(0.9, 0.9);
    this.wobble = Math.random() * Math.PI * 2;
}
Chicken.prototype.type = "chicken";

function elt(name, className) {
    var elt = document.createElement(name);
    if (className) elt.className = className;
    return elt;
}

// costante moltiplicativa del pixel
var scale = 20;

/*NEW INTRO WITH CANVAS*/
function CanvasDisplay(parent, level) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.min(1024, level.width * scale);
    this.canvas.height = Math.min(720, level.height * scale);
    parent.appendChild(this.canvas);
    this.cx = this.canvas.getContext("2d");

    this.level = level;
    this.animationTime = 0;
    this.flipPlayer = false;

    this.viewport = {
        left: 0,
        top: 0,
        width: this.canvas.width / scale,
        height: this.canvas.height / scale
    };

    this.drawFrame(0);
}

CanvasDisplay.prototype.clear = function () {
    this.canvas.parentNode.removeChild(this.canvas);
};

CanvasDisplay.prototype.drawFrame = function (step) {
    this.animationTime += step;

    this.updateViewport();
    this.clearDisplay();
    this.drawBackground();
    this.drawActors();
};

CanvasDisplay.prototype.updateViewport = function () {
    var view = this.viewport, margin = view.width / 3;
    var player = this.level.player;
    var center = player.pos.plus(player.size.times(0.5));

    if (center.x < view.left + margin) {
        view.left = Math.max(center.x - margin, 0);
    } else if (center.x > view.left + view.width - margin) {
        view.left = Math.min(center.x + margin - view.width, this.level.width - view.width);
    }

    if (center.y < view.top + margin) {
        view.top = Math.max(center.y - margin, 0);
    } else if (center.y > view.top + view.height - margin) {
        view.top = Math.min(center.y + margin - view.height, this.level.height - view.height);
    }
};

CanvasDisplay.prototype.clearDisplay = function () {
    if (this.level.status == "won")
        this.cx.fillStyle = "rgb(68,191,255)";
    else if (this.level.status == "lost")
        this.cx.fillStyle = "rgb(44,136,214)";
    else
        this.cx.fillStyle = "rgb(52,166,251)";
    this.cx.fillRect(0, 0, this.canvas.width, this.canvas.height);
};

var otherSprites = document.createElement("img");
otherSprites.src = "img/sprites.png";

CanvasDisplay.prototype.drawBackground = function () {
    var view = this.viewport;
    var xStart = Math.floor(view.left);
    var xEnd = Math.ceil(view.left + view.width);
    var yStart = Math.floor(view.top);
    var yEnd = Math.ceil(view.top + view.height);

    for (var y = yStart; y < yEnd; y++) {
        for (var x = xStart; x < xEnd; x++) {
            var tile = this.level.grid[y][x];
            if (tile == null) continue;
            var screenX = (x - view.left) * scale;
            var screenY = (y - view.top) * scale;
            var tileX = tile == "lava" ? scale : 0;
            this.cx.drawImage(otherSprites,
                tileX, 0, scale, scale,
                screenX, screenY, scale, scale);
        }
    }
};

var playerSprites = document.createElement("img");
playerSprites.src = "img/player.png";
var playerXOverlap = 4;

function flipHorizontally(context, around) {
    context.translate(around, 0);
    context.scale(-1, 1);
    context.translate(-around, 0);
}

CanvasDisplay.prototype.drawPlayer = function (x, y, width, height) {
    var sprite = 1, player = this.level.player;
    width += playerXOverlap * 2;
    x -= playerXOverlap;
    if (player.speed.x != 0) {
        this.flipPlayer = player.speed.x < 0;
    }

    if (player.speed.y != 0)
        sprite = 6;
    else if (player.speed.x != 0) {
        sprite = Math.floor(this.animationTime * 12) % 8;
    }

    this.cx.save();
    if (this.flipPlayer)
        flipHorizontally(this.cx, x + width / 2);

    this.cx.drawImage(playerSprites, sprite * width, 0, width, height, x, y, width, height);
    this.cx.restore();
};

CanvasDisplay.prototype.drawActors = function () {
    this.level.actors.forEach(function (actor) {
        var width = actor.size.x * scale;
        var height = actor.size.y * scale;
        var x = (actor.pos.x - this.viewport.left) * scale;
        var y = (actor.pos.y - this.viewport.top) * scale;
        if (actor.type == "player") {
            this.drawPlayer(x, y, width, height);
        } else {
            var tileX = (actor.type == "chicken" ? 2 : 1) * scale;
            this.cx.drawImage(otherSprites,
                tileX, 0, width, height,
                x, y, width, height);
        }
    }, this);
};

Level.prototype.obstacleAt = function (pos, size) {
    var xStart = Math.floor(pos.x);
    var xEnd = Math.ceil(pos.x + size.x);
    var yStart = Math.floor(pos.y);
    var yEnd = Math.ceil(pos.y + size.y);

    if (xStart < 0 || xEnd > this.width || yStart < 0) {
        return "wall";
    }
    if (yEnd > this.height) {
        return "lava";
    }
    for (var y = yStart; y < yEnd; y++) {
        for (var x = xStart; x < xEnd; x++) {
            var fieldType = this.grid[y][x];
            if (fieldType) return fieldType;
        }
    }
};
Level.prototype.actorAt = function (actor) {
    for (var i = 0; i < this.actors.length; i++) {
        var other = this.actors[i];
        if (other != actor &&
            actor.pos.x + actor.size.x > other.pos.x &&
            actor.pos.x < other.pos.x + other.size.x &&
            actor.pos.y + actor.size.y > other.pos.y &&
            actor.pos.y < other.pos.y + other.size.y)
            return other;
    }
};
var maxStep = 0.05;
Level.prototype.animate = function (step, keys) {
    if (this.status != null)
        this.finishDelay -= step;

    while (step > 0) {
        var thisStep = Math.min(step, maxStep);
        this.actors.forEach(function (actor) {
            actor.act(thisStep, this, keys);
        }, this);
        step -= thisStep;
    }
};

Lava.prototype.act = function (step, level) {
    var newPos = this.pos.plus(this.speed.times(step));
    if (!level.obstacleAt(newPos, this.size)) {
        this.pos = newPos;
    } else if (this.repeatPos) {
        this.pos = this.repeatPos;
    } else {
        this.speed = this.speed.times(-1);
    }
};

var wobbleSpeed = 8, wobbleDist = 0.07;
Chicken.prototype.act = function (step) {
    this.wobble += step * wobbleSpeed;
    var wobblePos = Math.sin(this.wobble) * wobbleDist;
    this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

var playerXSpeed = 7;

Player.prototype.moveX = function (step, level, keys) {
    this.speed.x = 0;
    if (keys.left) this.speed.x -= playerXSpeed;
    if (keys.right) this.speed.x += playerXSpeed;

    var motion = new Vector(this.speed.x * step, 0);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle)
        level.playerTouched(obstacle);
    else
        this.pos = newPos;
};

var gravity = 30;
var jumpSpeed = 17;

Player.prototype.moveY = function (step, level, keys) {
    this.speed.y += step * gravity;
    var motion = new Vector(0, this.speed.y * step);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle) {
        level.playerTouched(obstacle);
        if (keys.up && this.speed.y > 0) {
            this.speed.y = -jumpSpeed;
        } else {
            this.speed.y = 0;
        }
    } else {
        this.pos = newPos;
    }
};

Player.prototype.act = function (step, level, keys) {
    this.moveX(step, level, keys);
    this.moveY(step, level, keys);

    var otherActor = level.actorAt(this);
    if (otherActor)
        level.playerTouched(otherActor.type, otherActor);

    if (level.status == "lost") {
        this.pos.y += step;
        this.size.y -= step;
    }
};

Level.prototype.playerTouched = function (type, actor) {
    if (type == "lava" && this.status == null) {
        this.status = "lost";
        this.finishDelay = 1;
    } else if (type == "chicken") {
        gotChicken();
        this.actors = this.actors.filter(function (other) {
            return other != actor;
        });
        if (!this.actors.some(function (actor) {
            return actor.type == "chicken";
        })) {
            this.status = "won";
            this.finishDelay = 1;
        }
    }
};

//var arrowCodes = {37: "left", 38: "up", 39: "right"};
var arrowCodes = { 37: "left", 32: "up", 39: "right", 80: "pause" };
function trackKeys(codes) {
    var pressed = Object.create(null);
    function handler(event) {
        //console.log(event);
        if (codes.hasOwnProperty(event.keyCode)) {
            var down = event.type == "keydown";
            pressed[codes[event.keyCode]] = down;
            event.preventDefault();
        }
    }
    addEventListener("keydown", handler);
    addEventListener("keyup", handler);
    return pressed;
}

function runAnimation(frameFunc) {
    var lastTime = null;
    function frame(time) {
        var stop = false;
        if (lastTime != null) {
            var timeStep = Math.min(time - lastTime, 100) / 1000;
            stop = frameFunc(timeStep) === false;
        }
        lastTime = time;
        if (!stop)
            requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

var arrows = trackKeys(arrowCodes);

function runLevel(level, Display, andThen) {
    var display = new Display(document.body, level);
    runAnimation(function (step) {
        level.animate(step, arrows);
        display.drawFrame(step);
        if (level.isFinished()) {
            display.clear();
            if (andThen)
                andThen(level.status);
            return false;
        }
    })
}
var lifes = 3;
var pollo = 0;
var mappa;
function runGame(plans, Display) {
    initLife(lifes);
    function startLevel(n) {
        initLevel(n);
        pollo = 0;
        mappa = plans[n];
        countChickens(plans[n]);
        runLevel(new Level(plans[n]), Display, function (status) {
            if (status == "lost") {
                lifes--;
                initLife(lifes);
                if (lifes >= 0) {
                    startLevel(n);
                } else {
                    gameOver("Game Over", "Replay", "Nyo's still hungry :(");
                    lifes = 3;
                    initLife(lifes);
                    startLevel(0);
                }
            } else if (n < plans.length - 1) {
                startLevel(n + 1);
            } else {
                //console.log("Hai vinto!");
                gameOver("You Won!", "Replay", "Nyo ate all existing chicken in the world :D");
            }
        });
    }
    startLevel(0);
}
function initLife(n) {
    var vite = document.getElementById("vite");
    vite.textContent = '';
    for (var i = 0; i < n; i++) {
        vite.textContent += '❤️';
    }
    for (var i = 0; i < 3 - n; i++) {
        vite.textContent += '♡';
    }
}

function gameOver(text, buttText, testo_suppl) {
    // Get the modal
    var modal = document.getElementById("myModal");

    // Get the btext of modal
    var testo = document.getElementById("testo");
    // Get the btext of modal
    var testSuppl = document.getElementById("testo_suppl");

    // Get the button of modal
    var butt = document.getElementById("butt");
    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks on the button, open the modal
    testo.textContent = text;
    testSuppl.textContent = testo_suppl;
    butt.textContent = buttText;
    modal.style.display = "block";
    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
        modal.style.display = "none";
    }

    butt.onclick = function () {
        modal.style.display = "none";
    };

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function countChickens(mappa) {
    var cnt = 0;
    mappa.forEach(function (str) {
        cnt = cnt + (str.split("o").length - 1);
    });
    var moneys = document.getElementById("coins");
    moneys.textContent = pollo + "/" + cnt + " 🍗";
}

function gotChicken() {
    pollo++;
    countChickens(mappa);
}

function initLevel(n) {
    var lev = document.getElementById("livello");
    lev.textContent = "Livello " + (n + 1);
}

runGame(GAME_LEVELS, CanvasDisplay);
