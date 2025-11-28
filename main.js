// Unlock all levels immediately as requested
if (!localStorage.getItem('echo_unlocked') || parseInt(localStorage.getItem('echo_unlocked'), 10) < 10) {
    localStorage.setItem('echo_unlocked', 10);
}

const TILE_SIZE = 40;
const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const SPEED = 5;

const STORY_TEXTS = [
  "СИСТЕМА: Инициализация. Протокол 'Зеркало'. Цель: Ядро.",
  "СИСТЕМА: Тень учится. Не касайся прошлого.",
  "АРХИВ: 'Это не тренировка. Это клетка.'",
  "СИСТЕМА: Обнаружены шипы. Будь осторожен.",
  "АРХИВ: 'Разорви цикл. Ключ где-то рядом.'",
  "СИСТЕМА: Ошибка. Субъект отклонился от маршрута.",
  "НЕИЗВЕСТНЫЙ: Тень хочет занять твое место.",
  "СИСТЕМА: Вмешательство заблокировано.",
  "НЕИЗВЕСТНЫЙ: Выход с 10 уровня — это ловушка.",
  "СИСТЕМА: СБОЙ. Добро пожаловать в реальность."
];

// Level maps
const LEVEL_MAPS = [
  // Level 1: The Loop
  [
    "#########################",
    "#P.....................D#",
    "######################.##",
    "#.....................###",
    "#..##################.#.#",
    "#..#..................#.#",
    "#..#..K...............#.#",
    "#..####################.#",
    "#########################"
  ],
  // Level 2: The Climb
  [
    "#########################",
    "#D..#.........#........K#",
    "###.#.........#...#######",
    "#...#.........#.........#",
    "#...#######.#######.....#",
    "#.......................#",
    "#P......................#",
    "#########################",
    "#########################"
  ],
  // Level 3: Spike Floor
  [
    "#########################",
    "#P.....#.......#.......D#",
    "####...#...K...#...######",
    "#......#.......#........#",
    "#......#########........#",
    "#.......................#",
    "#.SSSS...........SSSS...#",
    "#########################",
    "#########################"
  ],
  // Level 4: The U-Turn
  [
    "#########################",
    "#D.....................K#",
    "#########...#############",
    "#.......#...#...........#",
    "#.......#...#...#####...#",
    "#.......#...#.......#...#",
    "#P......#.......=...#...#",
    "#########################",
    "#########################"
  ],
  // Level 5: Cage Break
  [
    "#########################",
    "#K..#.........#........D#",
    "###.#.........#...#######",
    "#...#.........#.........#",
    "#...#####.#####.........#",
    "#...#.........#.........#",
    "#...#....P....#.........#",
    "#...###########.........#",
    "#########################"
  ],
  // Level 6: Zig Zag
  [
    "#########################",
    "#K..........#..........D#",
    "######..#####..##########",
    "#.......................#",
    "#..###################..#",
    "#.......................#",
    "##########..#####..######",
    "#P......................#",
    "#########################"
  ],
  // Level 7: Risk
  [
    "#########################",
    "#P.....................K#",
    "####################....#",
    "#.......................#",
    "#....SSSSSSSSSSSSSSS....#",
    "#.......................#",
    "#....####################",
    "#D......................#",
    "#########################"
  ],
  // Level 8: Tight
  [
    "#########################",
    "#P..#.......K.......#..D#",
    "###.#.###########.#.###.#",
    "#...#.............#.....#",
    "#.###################.###",
    "#.......................#",
    "#########################",
    "#.......................#",
    "#########################"
  ],
  // Level 9: Tower
  [
    "#########################",
    "#K.....................D#",
    "#####.#####.#####.#####.#",
    "#.....#.....#.....#.....#",
    "#.#####.#####.#####.#####",
    "#.......................#",
    "#####.#####.#####.#####.#",
    "#P......................#",
    "#########################"
  ],
  // Level 10: Final
  [
    "#########################",
    "#D..#...S...K...S...#...#",
    "###.#.#####.#####.#.#.#.#",
    "#...#.#.....#.....#.#.#.#",
    "#.###.###.###.###.###.#.#",
    "#.......................#",
    "#.SSSS.SSSS.SSSS.SSSS.S.#",
    "#P......................#",
    "#########################"
  ]
];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

class Game {
    constructor() {
        this.levelIndex = 0;
        this.tiles = [];
        this.player = { x: 0, y: 0, vx: 0, vy: 0, w: 20, h: 30, onGround: false, dead: false };
        this.keys = {};
        this.hasKey = false;
        this.doorOpen = false;
        this.running = false;

        // Shadow System
        this.history = [];
        this.frameCount = 0;

        // Input
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        this.loop = this.loop.bind(this);
    }

    startLevel(idx) {
        this.levelIndex = idx;
        document.getElementById('hud-level').innerText = idx + 1;
        this.loadMap(LEVEL_MAPS[idx]);
        this.hasKey = false;
        this.doorOpen = false;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.dead = false;

        // Reset Shadow
        this.history = [];
        this.frameCount = 0;

        this.running = true;
        ui.hideAll();
        requestAnimationFrame(this.loop);
    }

    loadMap(mapData) {
        this.tiles = [];
        for (let y = 0; y < mapData.length; y++) {
            const row = mapData[y];
            for (let x = 0; x < row.length; x++) {
                const char = row[x];
                if (char === 'P') {
                    this.player.x = x * TILE_SIZE + (TILE_SIZE - this.player.w) / 2;
                    this.player.y = y * TILE_SIZE + (TILE_SIZE - this.player.h);
                } else if (char !== '.') {
                    this.tiles.push({ x, y, type: char });
                }
            }
        }
    }

    update() {
        if (this.player.dead) {
            this.startLevel(this.levelIndex); // Instant restart
            return;
        }

        // Controls
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.player.vx = -SPEED;
        else if (this.keys['ArrowRight'] || this.keys['KeyD']) this.player.vx = SPEED;
        else this.player.vx = 0;

        if ((this.keys['ArrowUp'] || this.keys['KeyW']) && this.player.onGround) {
            this.player.vy = JUMP_FORCE;
            this.player.onGround = false;
        }

        // Physics
        this.player.vy += GRAVITY;
        this.player.x += this.player.vx;
        this.handleCollision('x');
        this.player.y += this.player.vy;
        this.handleCollision('y');

        // Bounds
        if (this.player.y > canvas.height) this.player.dead = true;

        // Shadow Logic (Record & Replay)
        if (this.frameCount % 2 === 0) {
            this.history.push({ x: this.player.x, y: this.player.y });
        }
        this.frameCount++;

        // Shadow Spawn (delay)
        if (this.history.length > 90) {
            const shadowPos = this.history[this.history.length - 90];
            if (this.checkRectCollide(this.player, {
                x: shadowPos.x,
                y: shadowPos.y,
                w: this.player.w,
                h: this.player.h
            })) {
                this.player.dead = true;
            }
        }
    }

    handleCollision(axis) {
        this.player.onGround = false;
        const p = this.player;

        for (const t of this.tiles) {
            const tx = t.x * TILE_SIZE;
            const ty = t.y * TILE_SIZE;

            if (
                p.x < tx + TILE_SIZE && p.x + p.w > tx &&
                p.y < ty + TILE_SIZE && p.y + p.h > ty
            ) {
                if (t.type === '#') {
                    if (axis === 'x') {
                        if (p.vx > 0) p.x = tx - p.w;
                        if (p.vx < 0) p.x = tx + TILE_SIZE;
                        p.vx = 0;
                    } else {
                        if (p.vy > 0) { p.y = ty - p.h; p.onGround = true; p.vy = 0; }
                        if (p.vy < 0) { p.y = ty + TILE_SIZE; p.vy = 0; }
                    }
                } else if (t.type === 'S') {
                    this.player.dead = true;
                } else if (t.type === 'K') {
                    this.hasKey = true;
                    this.doorOpen = true;
                    t.type = '.';
                } else if (t.type === 'D') {
                    if (this.doorOpen) {
                        this.winLevel();
                        return;
                    } else {
                        if (axis === 'x') {
                            if (p.vx > 0) p.x = tx - p.w;
                            if (p.vx < 0) p.x = tx + TILE_SIZE;
                            p.vx = 0;
                        } else {
                            if (p.vy > 0) { p.y = ty - p.h; p.onGround = true; p.vy = 0; }
                            if (p.vy < 0) { p.y = ty + TILE_SIZE; p.vy = 0; }
                        }
                    }
                }
            }
        }
    }

    checkRectCollide(r1, r2) {
        return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
               r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
    }

    winLevel() {
        this.running = false;
        ui.showStory(this.levelIndex);
    }

    nextLevel() {
        const next = this.levelIndex + 1;
        if (next >= LEVEL_MAPS.length) {
            ui.showMenu();
        } else {
            this.startLevel(next);
        }
    }

    draw() {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Tiles
        for (const t of this.tiles) {
            if (t.type === '.') continue;
            const x = t.x * TILE_SIZE;
            const y = t.y * TILE_SIZE;

            if (t.type === '#') {
                ctx.strokeStyle = '#0ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#001111';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            } else if (t.type === 'S') {
                ctx.fillStyle = '#f00';
                ctx.beginPath();
                ctx.moveTo(x, y + TILE_SIZE);
                ctx.lineTo(x + TILE_SIZE / 2, y);
                ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
                ctx.fill();
            } else if (t.type === 'K') {
                if (this.hasKey) continue;
                ctx.fillStyle = '#ff0';
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 10, 0, Math.PI * 2);
                ctx.fill();
            } else if (t.type === 'D') {
                ctx.lineWidth = 4;
                if (this.doorOpen) {
                    ctx.strokeStyle = '#0f0';
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                } else {
                    ctx.strokeStyle = '#f00';
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#f00';
                    ctx.fillRect(x + 15, y + 15, 10, 10);
                }
            }
        }

        // Shadow (Echo)
        if (this.history.length > 90) {
            const s = this.history[this.history.length - 90];
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(s.x, s.y, this.player.w, this.player.h);
            ctx.strokeStyle = '#f00';
            ctx.strokeRect(s.x, s.y, this.player.w, this.player.h);
        }

        // Player
        ctx.fillStyle = '#0ff';
        ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
    }

    loop() {
        if (!this.running) return;
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}

const game = new Game();

const ui = {
    showMenu: () => {
        document.getElementById('menu-screen').classList.remove('hidden');
        document.getElementById('level-screen').classList.add('hidden');
        document.getElementById('story-screen').classList.add('hidden');
    },
    showLevelSelect: () => {
        document.getElementById('menu-screen').classList.add('hidden');
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.innerText = (i + 1).toString();
            btn.onclick = () => game.startLevel(i);
            grid.appendChild(btn);
        }
        document.getElementById('level-screen').classList.remove('hidden');
    },
    showStory: (lvlIdx) => {
        const txt = STORY_TEXTS[lvlIdx] || "Уровень завершен";
        document.getElementById('story-text').innerText = txt;
        document.getElementById('story-screen').classList.remove('hidden');
    },
    hideAll: () => {
        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    }
};

// Button wiring
document.getElementById('btn-new-game').addEventListener('click', () => game.startLevel(0));
document.getElementById('btn-level-select').addEventListener('click', () => ui.showLevelSelect());
document.getElementById('btn-back-menu').addEventListener('click', () => ui.showMenu());
document.getElementById('btn-next-level').addEventListener('click', () => game.nextLevel());

// Init: start at menu, hide story overlay initially
ui.showMenu();
document.getElementById('story-screen').classList.add('hidden');