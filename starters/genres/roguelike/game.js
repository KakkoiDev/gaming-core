/*
    Deepwell: a turn-based grid roguelike (designer card GameRoguelike).
    Seeded floors of rooms and corridors, one step per direction press, bump an enemy to attack it,
    enemies move after you, potions to pick up and drink, stairs down. Reach the stairs on floor 3 to win;
    HP 0 ends the run (permadeath: Run Over, New Run first, no Load).
    The canvas draws shapes only; every word and number is the game kit's HTML (js/kit.js).

    Extend it: more monsters in MONSTERS, more floors (FLOORS), more items next to potions (pickUp, usePotion).
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Deepwell', 'rogue.title': 'Deepwell', 'rogue.start': 'Start Run', 'hud.floor': 'Floor {n}',
        'hud.seed': 'Seed {seed}', 'hud.turn': 'Turn {n}', 'death.cause': 'Slain by {monster} on floor {n}.',
        'summary.title': 'Run Summary', 'summary.new_run': 'New Run', 'summary.best': 'Best',
        'rogue.escaped': 'You Escaped the Well', 'rogue.floor': 'Floor reached', 'rogue.kills': 'Kills',
        'rogue.potions': 'Potions found', 'rogue.turns': 'Turns', 'rogue.potion_slot': 'Potion ×{n}',
        'action.wait': 'Wait a Turn', 'action.use_item_1': 'Drink Potion', 'action.fire': 'Attack',
        'tutorial.bump': 'Walk into a monster to attack it',
        'enemy.slime': 'a rose slime', 'enemy.bat': 'a cave bat', 'enemy.ghoul': 'a lantern ghoul'},
    ja: {'game.name': 'ディープウェル', 'rogue.title': 'ディープウェル', 'rogue.start': 'ラン開始', 'hud.floor': '地下 {n} 階',
        'hud.seed': 'シード {seed}', 'hud.turn': 'ターン {n}', 'death.cause': '地下 {n} 階で {monster} にたおされた。',
        'summary.title': 'ランの結果', 'summary.new_run': 'もう一度', 'summary.best': 'ベスト',
        'rogue.escaped': '井戸から脱出した', 'rogue.floor': '到達した階', 'rogue.kills': '倒した数',
        'rogue.potions': '拾ったポーション', 'rogue.turns': 'ターン数', 'rogue.potion_slot': 'ポーション ×{n}',
        'action.wait': '1ターン待つ', 'action.use_item_1': 'ポーションを飲む', 'action.fire': 'こうげき',
        'tutorial.bump': 'モンスターに向かって歩くとこうげき',
        'enemy.slime': 'ローズスライム', 'enemy.bat': 'どうくつコウモリ', 'enemy.ghoul': 'ランタングール'},
};

// the game's own actions on top of gaming-core's (moveX/moveY, jump, fire, confirm, back, pause);
// fire attacks a monster next to you (bumping does the same), wait passes a turn, use_item_1 drinks a potion
const GAME_ACTIONS = {
    wait: ['key:Period', 'key:KeyZ', 'pad:0'],
    use_item_1: ['key:Digit1', 'pad:3'],
};

const MAP = vec2(40, 24);          // tiles; tile (x, y) has y up, like the world
const FLOORS = 3;                  // the stairs on the last floor win the run
const MAX_HP = 20, POTION_HEAL = 8, PLAYER_DAMAGE = 2;
const MONSTERS = [                 // one kind per floor, deeper is tougher (colour swap: mint -> rose -> lantern)
    {id: 'slime', hp: 3, damage: 1, hue: .9},
    {id: 'bat', hp: 4, damage: 2, hue: .55},
    {id: 'ghoul', hp: 6, damage: 3, hue: .12},
];
const WALL = 0, FLOOR = 1;

let state = 'title';               // title | play | dead | won
let nextSeed = 0;                  // set before New Run for a fixed seed (tests); 0 picks one from the clock
let seed, rng;                     // the run's seed and its RandomGenerator (LittleJS, xorshift)
let depth, tiles, rooms, stairs;   // the current floor
let player, enemies, potions;      // player {pos, hp}; enemies [{pos, hp, max, kind, hit}]; potions [vec2]
let bag, turns, kills, found, runTime, deathCause;
let stepDir = null, stepTimer = 0; // held direction and its repeat timer (one step per press, repeats when held)
let deathTime = 0;                 // time of death, for the fade to grey

///////////////////////////////////////////////////////////////////////////////
// Floors: rooms and corridors from the run's seed

const key = (p)=> p.x + ',' + p.y;
const tileAt = (p)=> p.x < 0 || p.y < 0 || p.x >= MAP.x || p.y >= MAP.y ? WALL : tiles[p.y * MAP.x + p.x];
const enemyAt = (p)=> enemies.find(e=> e.pos.x === p.x && e.pos.y === p.y);
const roomCenter = (r)=> vec2(r.x + (r.w >> 1), r.y + (r.h >> 1));

function makeFloor()
{
    rng = new RandomGenerator(seed * 7 + depth * 1013);   // same seed and floor -> same floor
    tiles = new Array(MAP.x * MAP.y).fill(WALL);
    rooms = [];
    for (let tries = 0; tries < 200 && rooms.length < 8; ++tries)
    {
        const w = rng.int(4, 9), h = rng.int(3, 7);
        const r = {x: rng.int(1, MAP.x - w - 1), y: rng.int(1, MAP.y - h - 1), w, h};
        if (rooms.some(o=> r.x < o.x + o.w + 1 && o.x < r.x + r.w + 1 && r.y < o.y + o.h + 1 && o.y < r.y + r.h + 1)) continue;
        rooms.push(r);
    }
    rooms.sort((a, b)=> a.x - b.x);                       // left to right: start left, stairs right
    for (const r of rooms) for (let y = r.y; y < r.y + r.h; ++y) for (let x = r.x; x < r.x + r.w; ++x) tiles[y * MAP.x + x] = FLOOR;
    // L-shaped corridors between neighbouring rooms
    for (let i = 1; i < rooms.length; ++i)
    {
        const a = roomCenter(rooms[i - 1]), b = roomCenter(rooms[i]);
        for (let x = min(a.x, b.x); x <= max(a.x, b.x); ++x) tiles[a.y * MAP.x + x] = FLOOR;
        for (let y = min(a.y, b.y); y <= max(a.y, b.y); ++y) tiles[y * MAP.x + b.x] = FLOOR;
    }
    player.pos = roomCenter(rooms[0]);
    stairs = roomCenter(rooms[rooms.length - 1]);
    // monsters and potions on free floor tiles, never in the first room
    const free = ()=>
    {
        for (;;)
        {
            const r = rooms[rng.int(1, rooms.length)];
            const p = vec2(rng.int(r.x, r.x + r.w), rng.int(r.y, r.y + r.h));
            if (key(p) !== key(stairs) && !enemyAt(p) && !potions.some(q=> key(q) === key(p))) return p;
        }
    };
    enemies = [];
    potions = [];
    const kind = MONSTERS[min(depth, MONSTERS.length) - 1];
    for (let i = 0; i < 2 + depth; ++i) enemies.push({pos: free(), hp: kind.hp, max: kind.hp, kind, hit: 0});
    for (let i = 0; i < 2; ++i) potions.push(free());
}

///////////////////////////////////////////////////////////////////////////////
// Turns: the player acts, then every monster

function playerTurn(dir)
{
    const target = player.pos.add(dir);
    const enemy = enemyAt(target);
    if (enemy) attack(enemy);
    else if (tileAt(target) === WALL) return;            // bumping a wall costs no turn
    else
    {
        player.pos = target;
        zzfx(...[.1,,200,,.01,.02]);
        tutorial();
        const potion = potions.findIndex(q=> key(q) === key(target));
        if (potion >= 0) pickUp(potion);
        if (key(target) === key(stairs)) return takeStairs();
    }
    endTurn();
}

function attack(enemy)
{
    enemy.hp -= PLAYER_DAMAGE;
    enemy.hit = time;
    zzfx(...[.3,,400,,.02,.06,,,-8]);
    if (enemy.hp <= 0) { enemies.splice(enemies.indexOf(enemy), 1); kills++; zzfx(...[.3,,150,,.05,.15,,,-4]); }
}

function pickUp(index)
{
    potions.splice(index, 1);
    bag++;
    found++;
    zzfx(...[.3,,800,,.03,.08,,,12]);
}

function usePotion()
{
    if (!bag || player.hp >= MAX_HP) return;
    bag--;
    player.hp = min(MAX_HP, player.hp + POTION_HEAL);
    zzfx(...[.3,,600,,.05,.1,,,6]);
    endTurn();
}

function endTurn()
{
    turns++;
    for (const e of enemies.slice())
    {
        const d = player.pos.subtract(e.pos);
        if (abs(d.x) + abs(d.y) === 1)                    // next to you: it attacks
        {
            player.hp -= e.kind.damage;
            player.hit = time;
            zzfx(...[.4,,120,.01,.05,.12,,,-6]);
            if (player.hp <= 0) return die(e.kind);
        }
        else if (abs(d.x) + abs(d.y) <= 8)                // near: one step toward you, longer axis first
        {
            const steps = abs(d.x) >= abs(d.y) ? [vec2(sign(d.x), 0), vec2(0, sign(d.y))] : [vec2(0, sign(d.y)), vec2(sign(d.x), 0)];
            for (const s of steps)
            {
                const p = e.pos.add(s);
                if ((s.x || s.y) && tileAt(p) === FLOOR && !enemyAt(p) && key(p) !== key(player.pos)) { e.pos = p; break; }
            }
        }
    }
}

function takeStairs()
{
    zzfx(...[.3,,300,,.1,.2,,,3]);
    if (depth >= FLOORS) return win();
    depth++;
    makeFloor();
}

// the direction to step this tick: on a new press, then repeating while held
function readStep(input)
{
    const x = input.moveX, y = input.moveY;
    const dir = max(abs(x), abs(y)) < .5 ? null : abs(x) >= abs(y) ? vec2(sign(x), 0) : vec2(0, sign(y));
    const same = dir && stepDir && dir.x === stepDir.x && dir.y === stepDir.y;
    stepDir = dir;
    if (!dir) return null;
    if (!same) { stepTimer = .28; return dir; }
    if ((stepTimer -= timeDelta) > 0) return null;
    stepTimer = .14;
    return dir;
}

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> run -> Run Over or the run summary -> New Run

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    tutorial();
    showScreen(titleScreen({items: [
        {id: 'title-start', t: 'rogue.start', onSelect: newRun},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ]}));
}

function newRun()
{
    seed = nextSeed || (Date.now() % 100000) + 1;
    depth = 1;
    player = {pos: vec2(), hp: MAX_HP, hit: -9};
    bag = turns = kills = found = runTime = 0;
    stepDir = null;
    makeFloor();
    state = 'play';
    kitPlaying = true;
    hudInit(`
      <div data-slot="tl" class="game-stack">
        <div class="game-row" role="meter" aria-labelledby="hud-hp-l" aria-valuemin="0" aria-valuemax="${MAX_HP}" aria-valuenow="${MAX_HP}">
          <span class="game-icon" data-kind="heart" aria-hidden="true"></span>
          <span id="hud-hp-l" class="sr-only" data-t="hud.health">${t('hud.health')}</span>
          <span class="game-bar" id="hud-hp-bar" style="--value:1;width:120px"></span>
          <span class="game-num" id="hud-hp"></span>
        </div>
        <b class="game-num" id="hud-floor"></b>
      </div>
      <div data-slot="bl" class="game-num" id="hud-potion"></div>
      <div data-slot="br" class="game-stack" style="justify-items:end">
        <span class="game-small game-num" id="hud-turn"></span>
        <span class="game-small game-num" id="hud-seed"></span>
      </div>`);
    showScreen(document.getElementById('hud'));
    tutorial('tutorial.move', 'move');
}

function die(kind)
{
    state = 'dead';
    deathTime = time;
    deathCause = kind;
    tutorial();
    const detail = t('gameover.floor', {floor: depth, time: fmtTime(runTime)}) + ' ' + t('death.cause', {monster: t('enemy.' + kind.id), n: depth});
    gameOver({title: 'gameover.run_over', detail, items: [
        {id: 'over-new', t: 'gameover.new_run', onSelect: newRun},
        {id: 'over-title', t: 'gameover.title_screen', onSelect: toTitle},
    ]});
}

function win()
{
    state = 'won';
    tutorial();
    results({title: 'rogue.escaped', rows: [
        ['rogue.floor', String(depth)], ['hud.time', fmtTime(runTime)], ['rogue.kills', fmt(kills)],
        ['rogue.potions', fmt(found)], ['rogue.turns', fmt(turns)]],
    items: [{id: 'res-new', t: 'summary.new_run', onSelect: newRun}, {id: 'res-title', t: 'gameover.title_screen', onSelect: toTitle}]});
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'fire', 'wait', 'use_item_1']);
    pauseMenu({onQuit: toTitle});
    touchControls({stick: true, buttons: [{action: 'use_item_1', label: 'action.use_item_1'}, {action: 'wait', label: 'action.wait'}]});
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    if (state !== 'play' || menuOpen()) return;
    if (input.pressed.pause) return openPause();
    runTime += timeDelta;
    const dir = readStep(input);
    if (dir) return playerTurn(dir);
    if (input.pressed.wait) return endTurn();
    if (input.pressed.use_item_1) return usePotion();
    if (input.pressed.fire)
    {
        const enemy = enemies.find(e=> abs(e.pos.x - player.pos.x) + abs(e.pos.y - player.pos.y) === 1);
        if (enemy) { attack(enemy); endTurn(); }
    }
}

function gameUpdatePost()
{
    // zoom so the whole floor fits the window, with room for the HUD above and below
    cameraScale = min(mainCanvasSize.x / (MAP.x + 2), mainCanvasSize.y / (MAP.y + 6));
    cameraPos = vec2();
    if (state === 'title') return;
    hudText('hud-hp', max(0, player.hp) + ' / ' + MAX_HP);
    hudBar('hud-hp-bar', max(0, player.hp), MAX_HP);
    hudText('hud-floor', t('hud.floor', {n: depth}));
    hudText('hud-potion', t('rogue.potion_slot', {n: bag}));
    hudText('hud-turn', t('hud.turn', {n: turns}));
    hudText('hud-seed', t('hud.seed', {seed}));
}

const world = (p)=> vec2(p.x - MAP.x / 2 + .5, p.y - MAP.y / 2 + .5);

function gameRender()
{
    drawRect(vec2(), MAP.add(vec2(2)), hsl(.7, .3, .07));
    if (state === 'title')
    {
        for (let i = 0; i < 9; ++i) drawRect(vec2(-8 + i * 2, -2 - i * .8), vec2(1.8, .4), hsl(.75, .3, .2 + i * .03));
        drawCircle(vec2(0, -9 + Math.sin(time * 2) * .2), .8, hsl(.15, .8, .6));
        return;
    }
    // floors, walls that touch a floor, the stairs
    for (let y = 0; y < MAP.y; ++y) for (let x = 0; x < MAP.x; ++x)
    {
        const p = vec2(x, y);
        if (tileAt(p) === FLOOR) drawRect(world(p), vec2(.96), hsl(.72, .2, .2));
        else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy])=> tileAt(vec2(x + dx, y + dy)) === FLOOR))
            drawRect(world(p), vec2(1), hsl(.72, .25, .32));
    }
    const s = world(stairs);
    for (let i = 0; i < 3; ++i) drawRect(s.add(vec2(0, .3 - i * .3)), vec2(.8 - i * .2, .2), hsl(.12, .7, .65 - i * .15));
    for (const q of potions) { drawCircle(world(q).add(vec2(0, -.1)), .25, hsl(0, .75, .55)); drawRect(world(q).add(vec2(0, .2)), vec2(.12, .2), hsl(0, 0, .8)); }
    // monsters: a blob in the floor's colour, flashing white when hit, HP pips over it
    for (const e of enemies)
    {
        const p = world(e.pos), flash = time - e.hit < .15;
        drawCircle(p, .7, flash ? WHITE : hsl(e.kind.hue, .6, .6));
        drawRect(p.add(vec2(-.12, .08)), vec2(.1), BLACK);
        drawRect(p.add(vec2(.12, .08)), vec2(.1), BLACK);
        for (let i = 0; i < e.max; ++i) drawRect(p.add(vec2((i - (e.max - 1) / 2) * .14, .5)), vec2(.1), i < e.hp ? hsl(.3, .7, .6) : hsl(0, 0, .3));
    }
    const pp = world(player.pos);
    drawCircle(pp, .8, time - player.hit < .15 ? hsl(0, .8, .7) : hsl(.15, .8, .65));
    drawRect(pp.add(vec2(0, .05)), vec2(.4, .1), hsl(.7, .3, .15));
}

function gameRenderPost()
{
    // the death beat: the floor fades to grey (no red flash)
    if (state === 'dead') drawRect(vec2(), MAP.add(vec2(2)), hsl(0, 0, .25, min(.7, (time - deathTime) * 1.2)));
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
