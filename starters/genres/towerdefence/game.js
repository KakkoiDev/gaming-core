/*
    Garden Guard: a grid tower defence (designer card GameTowerDefence).
    Enemies walk a fixed path in waves; move the cursor (keys, d-pad or mouse), pick a tower (1-3, shoulders, wheel)
    and place it on a free grass cell with `fire` (Space, Enter, left click, south). Towers shoot the nearest enemy
    in range on their own. Kills give gold; an enemy that reaches the end costs a life. Survive 5 waves.
    The canvas draws shapes only; every word and number is the game kit's HTML (js/kit.js).

    Add a tower: one entry in TOWERS (cost, range, damage, rate, colour, optional slow) and its texts.
    Add a map: change PATH (corner cells, entering on the left, leaving on the right).
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Garden Guard', 'td.title': 'Garden Guard', 'hud.wave': 'Wave {n} / {total}', 'hud.lives': 'Lives',
        'hud.gold': '{n} g', 'action.start_wave': 'Start Wave', 'action.fire': 'Place Tower', 'action.tower_next': 'Next Tower',
        'action.tower_prev': 'Previous Tower', 'action.tower1': 'Tower 1', 'action.tower2': 'Tower 2', 'action.tower3': 'Tower 3',
        'tower.bolt': 'Bolt', 'tower.cannon': 'Cannon', 'tower.frost': 'Frost', 'tower.card': '{key} {name} {price} g',
        'place.on_path': 'Not on the path', 'place.no_gold': 'Not enough gold', 'place.taken': 'A tower is already there',
        'td.tut_place': 'Press {button} to place a tower', 'td.tut_wave': 'Press {button} to start the wave',
        'td.wave_running': 'Wave running', 'td.victory': 'Garden Saved', 'td.defeat': 'Defeat',
        'td.defeat_detail': 'The garden fell on wave {n}', 'td.kills': 'Enemies stopped', 'td.waves': 'Waves'},
    ja: {'game.name': 'ガーデンガード', 'td.title': 'ガーデンガード', 'hud.wave': 'ウェーブ {n} / {total}', 'hud.lives': 'ライフ',
        'hud.gold': '{n} G', 'action.start_wave': 'ウェーブ開始', 'action.fire': 'タワーを置く', 'action.tower_next': '次のタワー',
        'action.tower_prev': '前のタワー', 'action.tower1': 'タワー1', 'action.tower2': 'タワー2', 'action.tower3': 'タワー3',
        'tower.bolt': 'ボルト', 'tower.cannon': 'キャノン', 'tower.frost': 'フロスト', 'tower.card': '{key} {name} {price} G',
        'place.on_path': '道の上には置けません', 'place.no_gold': 'ゴールドが足りません', 'place.taken': 'もうタワーがあります',
        'td.tut_place': '{button} でタワーを置く', 'td.tut_wave': '{button} でウェーブ開始',
        'td.wave_running': 'ウェーブ中', 'td.victory': '庭を守った', 'td.defeat': '敗北',
        'td.defeat_detail': 'ウェーブ {n} で庭が落ちた', 'td.kills': '倒した敵', 'td.waves': 'ウェーブ'},
};

// the game's own actions on top of gaming-core's; `fire` (the primary action) is re-bound to the card's Place keys
const GAME_ACTIONS = {
    fire: ['key:Space', 'key:Enter', 'mouse:0', 'pad:0'],
    start_wave: ['key:KeyN', 'pad:3'],            // north; start is pause
    tower_next: ['key:KeyE', 'pad:5'],
    tower_prev: ['key:KeyQ', 'pad:4'],
    tower1: ['key:Digit1'], tower2: ['key:Digit2'], tower3: ['key:Digit3'],
};

///////////////////////////////////////////////////////////////////////////////
// Tuning: the map, the towers, the waves

const GRID = vec2(16, 10);     // cells
const CELL = 2;                // world units per cell; the camera fits the field to the window
const FIELD = GRID.scale(CELL);
const WAVES = 5;
const START_GOLD = 120, START_LIVES = 20;
// corner cells of the path, from the entrance (left edge) to the exit (right edge)
const PATH = [vec2(-1, 7), vec2(4, 7), vec2(4, 2), vec2(9, 2), vec2(9, 7), vec2(13, 7), vec2(13, 3), vec2(16, 3)];
// range in cells, damage per shot, seconds between shots; frost slows its target
const TOWERS = [
    {id: 'bolt', cost: 50, range: 2.4, damage: 1, rate: .35, color: hsl(.13, .8, .6)},
    {id: 'cannon', cost: 80, range: 2.8, damage: 4, rate: 1.1, color: hsl(0, .7, .55)},
    {id: 'frost', cost: 60, range: 2.2, damage: .6, rate: .5, color: hsl(.55, .8, .65), slow: 1.2},
];
function waveSize(n) { return 5 + n * 2; }
function waveHealth(n) { return 2 + n * 1.5; }
function waveSpeed(n) { return min(3.4 + n * .2, 5); }   // world units per second, capped
const SPAWN_GAP = .8;          // seconds between enemies
const KILL_GOLD = 6, WAVE_GOLD = 25;

///////////////////////////////////////////////////////////////////////////////
// State (top-level so tests and extensions can read it)

let state = 'title';           // title | play | over
let gold, lives, wave, kills, score;
let waveActive = false, toSpawn = 0, spawnTimer = 0;
let towers = [];               // {cell, kind, cooldown}
let enemies = [];              // {pos, leg, hp, maxHp, speed, slow}
let shots = [];                // {from, to, color, life} short lines drawn after a shot
let cursor = vec2(5, 5);       // cell
let selected = 0;              // index in TOWERS
let message = '';              // the placement refusal shown in the HUD
let messageTimer = 0;
let playTicks = 0;             // ignore the Enter that started the game
let repeatTimer = 0, lastMove = vec2();
let lastMouse = vec2();

const pathCells = new Set();
for (let i = 1; i < PATH.length; ++i)
{
    const a = PATH[i - 1], b = PATH[i], d = vec2(sign(b.x - a.x), sign(b.y - a.y));
    for (let p = a.copy(); ; p = p.add(d)) { pathCells.add(p.x + ',' + p.y); if (p.x === b.x && p.y === b.y) break; }
}
function cellPos(c) { return vec2((c.x - GRID.x / 2 + .5) * CELL, (c.y - GRID.y / 2 + .5) * CELL); }
function posCell(p) { return vec2(Math.floor(p.x / CELL + GRID.x / 2), Math.floor(p.y / CELL + GRID.y / 2)); }
function inGrid(c) { return c.x >= 0 && c.y >= 0 && c.x < GRID.x && c.y < GRID.y; }
function onPath(c) { return pathCells.has(c.x + ',' + c.y); }
function towerAt(c) { return towers.find(t=> t.cell.x === c.x && t.cell.y === c.y); }
const WAYPOINTS = PATH.map(cellPos);

// why the selected tower can't go on this cell ('' when it can)
function placeProblem(c)
{
    if (!inGrid(c)) return 'place.on_path';
    if (onPath(c)) return 'place.on_path';
    if (towerAt(c)) return 'place.taken';
    if (gold < TOWERS[selected].cost) return 'place.no_gold';
    return '';
}

///////////////////////////////////////////////////////////////////////////////
// Player actions

// gaming-core's axes report only "held": a key tapped and released between two frames (a slow frame) would be
// lost, so a step also reads the axis' own bindings' "was pressed" (still through gcInput, so rebinding holds)
const tapReader = {
    down: ()=> false,
    pressed: (s)=> s.device === 'key' ? keyWasPressed(s.code) : s.device === 'pad' ? gamepadWasPressed(s.code) : false,
};
function axisTapped(axis, side) { return gcInputCore.read(tapReader, gcInput.bindings.axes[axis][side]).tapped; }

function moveCursor(input)
{
    // discrete steps: one on press, then repeats while held (keys, d-pad or stick)
    const want = vec2(abs(input.moveX) > .5 ? sign(input.moveX) : 0, abs(input.moveY) > .5 ? sign(input.moveY) : 0);
    if (!want.x && !want.y)
    {
        const tap = vec2(axisTapped('moveX', 'positive') - axisTapped('moveX', 'negative'), axisTapped('moveY', 'positive') - axisTapped('moveY', 'negative'));
        lastMove = vec2();
        if (tap.x || tap.y) cursor = vec2(clamp(cursor.x + tap.x, 0, GRID.x - 1), clamp(cursor.y + tap.y, 0, GRID.y - 1));
        return;
    }
    const fresh = want.x !== lastMove.x || want.y !== lastMove.y;
    lastMove = want;
    if (fresh) repeatTimer = .3;
    else if ((repeatTimer -= timeDelta) > 0) return;
    else repeatTimer = .1;
    cursor = vec2(clamp(cursor.x + want.x, 0, GRID.x - 1), clamp(cursor.y + want.y, 0, GRID.y - 1));
}

function followMouse(input)
{
    // the mouse moves the cursor only when it moves, so keys keep working after it
    const m = input.mouse.screen;
    if (m.x === lastMouse.x && m.y === lastMouse.y) return;
    lastMouse = m.copy();
    const c = posCell(input.mouse.pos);
    if (inGrid(c)) cursor = c;
}

function chooseTower(input)
{
    const n = TOWERS.length;
    for (let i = 0; i < n; ++i) if (input.pressed['tower' + (i + 1)]) selected = i;
    if (input.pressed.tower_next || input.mouse.wheel > 0) selected = (selected + 1) % n;
    if (input.pressed.tower_prev || input.mouse.wheel < 0) selected = (selected + n - 1) % n;
}

function place()
{
    const problem = placeProblem(cursor);
    if (problem) { message = problem; messageTimer = 2; zzfx(...[.2,,120,,.02,.05]); return false; }
    gold -= TOWERS[selected].cost;
    towers.push({cell: cursor.copy(), kind: TOWERS[selected], cooldown: 0});
    message = '';
    zzfx(...[.3,,400,,.03,.08]);
    if (!waveActive && wave === 0) tutorial('td.tut_wave', 'start_wave');
    return true;
}

function startWave()
{
    if (waveActive || wave >= WAVES) return;
    wave++;
    waveActive = true;
    toSpawn = waveSize(wave);
    spawnTimer = 0;
    tutorial();
    zzfx(...[.3,,200,.05,.1,.2]);
}

///////////////////////////////////////////////////////////////////////////////
// The world: spawning, walking, shooting

function spawn()
{
    const hp = waveHealth(wave);
    enemies.push({pos: WAYPOINTS[0].copy(), leg: 1, hp, maxHp: hp, speed: waveSpeed(wave), slow: 0});
}

function walk(e)
{
    let step = e.speed * (e.slow > 0 ? .5 : 1) * timeDelta;
    e.slow -= timeDelta;
    while (step > 0 && e.leg < WAYPOINTS.length)
    {
        const target = WAYPOINTS[e.leg], d = target.subtract(e.pos), dist = d.length();
        if (dist <= step) { e.pos = target.copy(); e.leg++; step -= dist; }
        else { e.pos = e.pos.add(d.normalize(step)); step = 0; }
    }
    return e.leg >= WAYPOINTS.length;   // reached the end
}

function shoot(tower)
{
    tower.cooldown -= timeDelta;
    if (tower.cooldown > 0) return;
    const from = cellPos(tower.cell), range = tower.kind.range * CELL;
    let target = null, best = range;
    for (const e of enemies) { const d = e.pos.distance(from); if (d <= best) { best = d; target = e; } }
    if (!target) return;
    tower.cooldown = tower.kind.rate;
    target.hp -= tower.kind.damage;
    if (tower.kind.slow) target.slow = tower.kind.slow;
    shots.push({from, to: target.pos.copy(), color: tower.kind.color, life: .08});
}

function updateWorld()
{
    if (waveActive && toSpawn > 0 && (spawnTimer -= timeDelta) <= 0) { spawn(); toSpawn--; spawnTimer = SPAWN_GAP; }
    for (const tower of towers) shoot(tower);
    for (let i = enemies.length; i--;)
    {
        const e = enemies[i];
        if (e.hp <= 0) { enemies.splice(i, 1); gold += KILL_GOLD; kills++; score += 10 * wave; zzfx(...[.2,,700,,.02,.04]); continue; }
        if (walk(e)) { enemies.splice(i, 1); lives--; zzfx(...[.4,,150,.02,.1,.2,,,-5]); }
    }
    for (let i = shots.length; i--;) if ((shots[i].life -= timeDelta) <= 0) shots.splice(i, 1);
    if (lives <= 0) return lose();
    if (waveActive && !toSpawn && !enemies.length)
    {
        waveActive = false;
        gold += WAVE_GOLD;
        zzfx(...[.3,,600,.05,.15,.3]);
        if (wave >= WAVES) return win();
    }
}

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> play -> results (victory) or game over (defeat)

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    tutorial();
    showScreen(titleScreen({items: [
        {id: 'title-start', t: 'title.new', onSelect: start},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ]}));
}

function start()
{
    gold = START_GOLD; lives = START_LIVES; wave = 0; kills = 0; score = 0;
    waveActive = false; toSpawn = 0; towers = []; enemies = []; shots = [];
    cursor = vec2(5, 5); selected = 0; message = ''; playTicks = 0;
    state = 'play';
    kitPlaying = true;
    hudInit(`
      <div data-slot="tl" class="game-stack">
        <span class="game-row" data-t-label="hud.lives"><span id="hud-lives" class="game-row"></span></span>
        <span class="game-row game-num"><span class="game-icon" data-kind="coin" aria-hidden="true"></span><b id="hud-gold"></b></span>
      </div>
      <div data-slot="tc"><b class="game-num" id="hud-wave"></b></div>
      <div data-slot="tr" class="game-row"><span data-prompt="start_wave">${promptHTML('start_wave')}</span><span id="hud-start" data-t="action.start_wave">${esc(t('action.start_wave'))}</span></div>
      <div data-slot="bl" class="game-row" id="hud-towers">${TOWERS.map((k, i)=> `<span class="game-num" id="hud-tower-${i}" style="padding:2px 6px"></span>`).join('')}</div>
      <div data-slot="br" class="game-small" id="hud-message" role="status"></div>`);
    showScreen(document.getElementById('hud'));
    tutorial('td.tut_place', 'fire');
}

function lose()
{
    state = 'over';
    tutorial();
    gameOver({title: 'td.defeat', detail: t('td.defeat_detail', {n: wave}),
        items: [{t: 'results.retry', onSelect: start}, {t: 'gameover.title_screen', onSelect: toTitle}]});
}

function win()
{
    state = 'over';
    tutorial();
    const stars = lives >= START_LIVES - 2 ? 3 : lives >= START_LIVES / 2 ? 2 : 1;   // stars by lives left
    results({title: 'td.victory', rows: [['hud.lives', String(lives)], ['td.kills', fmt(kills)], ['hud.score', fmt(score)]], stars,
        items: [{t: 'results.retry', onSelect: start}, {t: 'gameover.title_screen', onSelect: toTitle}]});
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'fire', 'start_wave', 'tower_next', 'tower_prev', 'tower1', 'tower2', 'tower3']);
    pauseMenu({onQuit: toTitle});
    // taps arrive as left clicks (place on the tapped cell); these buttons cover the rest
    touchControls({stick: false, buttons: [{action: 'tower_next', label: 'action.tower_next'}, {action: 'start_wave', label: 'action.start_wave'}]});
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    if (state !== 'play' || menuOpen()) return;
    if (input.pressed.pause) return openPause();
    playTicks++;
    moveCursor(input);
    followMouse(input);
    chooseTower(input);
    if (input.pressed.fire && playTicks > 2) place();
    if (input.pressed.start_wave) startWave();
    if ((messageTimer -= timeDelta) <= 0) message = '';
    updateWorld();
}

function gameUpdatePost()
{
    // zoom so the whole field fits the window, leaving room for the HUD rows
    cameraScale = min(mainCanvasSize.x / (FIELD.x + 2), mainCanvasSize.y / (FIELD.y + 8));
    cameraPos = vec2(0, 0);
    if (state !== 'play' && state !== 'over') return;
    hudLives('hud-lives', lives);
    hudText('hud-gold', t('hud.gold', {n: fmt(gold)}));
    hudText('hud-wave', t('hud.wave', {n: wave, total: WAVES}));
    hudText('hud-message', message ? t(message) : waveActive ? t('td.wave_running') : '');
    TOWERS.forEach((k, i)=>
    {
        hudText('hud-tower-' + i, t('tower.card', {key: i + 1, name: t('tower.' + k.id), price: k.cost}));
        const e = document.getElementById('hud-tower-' + i), on = i === selected, poor = gold < k.cost;
        if (e && e.dataset.on !== String(on) + poor)
        {
            e.dataset.on = String(on) + poor;
            e.style.outline = on ? '2px solid var(--g-accent)' : 'none';
            e.style.opacity = poor ? '.5' : '1';
            if (on) e.setAttribute('aria-current', 'true'); else e.removeAttribute('aria-current');
        }
    });
    const startHint = document.getElementById('hud-start');
    if (startHint) startHint.parentElement.style.opacity = waveActive || wave >= WAVES ? '.4' : '1';
}

function gameRender()
{
    // grass, path, towers, enemies, shots, cursor and range
    drawRect(vec2(), FIELD, hsl(.28, .45, .32));
    for (let x = 0; x < GRID.x; ++x)
        for (let y = 0; y < GRID.y; ++y)
        {
            const c = vec2(x, y);
            if (onPath(c)) drawRect(cellPos(c), vec2(CELL), hsl(.09, .4, .45));
            else if ((x + y) % 2) drawRect(cellPos(c), vec2(CELL * .96), hsl(.28, .45, .35));
        }
    if (state === 'title')
    {
        for (let i = 0; i < 6; ++i)
        {
            const p = (time * .15 + i / 6) % 1, leg = Math.floor(p * (WAYPOINTS.length - 1)), f = p * (WAYPOINTS.length - 1) - leg;
            drawCircle(WAYPOINTS[leg].lerp(WAYPOINTS[leg + 1], f), 1.1, hsl(.8, .5, .55));
        }
        return;
    }
    for (const tower of towers)
    {
        const p = cellPos(tower.cell);
        drawRect(p, vec2(CELL * .8), hsl(0, 0, .25));
        drawCircle(p, CELL * .6, tower.kind.color);
    }
    for (const e of enemies)
    {
        drawCircle(e.pos, 1.1, e.slow > 0 ? hsl(.6, .5, .7) : hsl(.8, .5, .55));
        drawRect(e.pos.add(vec2(0, .9)), vec2(1.2, .2), hsl(0, 0, 0, .6));
        drawRect(e.pos.add(vec2((e.hp / e.maxHp - 1) * .6, .9)), vec2(1.2 * max(0, e.hp / e.maxHp), .2), hsl(.33, .8, .5));
    }
    for (const s of shots) drawLine(s.from, s.to, .2, s.color);
    if (state === 'play')
    {
        const p = cellPos(cursor), ok = !placeProblem(cursor) || !!towerAt(cursor);
        const kind = towerAt(cursor) ? towerAt(cursor).kind : TOWERS[selected];
        drawCircle(p, kind.range * CELL * 2, hsl(0, 0, 1, .08), .1, hsl(0, 0, 1, .4));
        const color = ok ? hsl(.33, .9, .7) : hsl(0, .9, .6), h = CELL / 2;
        const corners = [vec2(-h, -h), vec2(h, -h), vec2(h, h), vec2(-h, h)].map(c=> p.add(c));
        corners.forEach((c, i)=> drawLine(c, corners[(i + 1) % 4], .15, color));
    }
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
