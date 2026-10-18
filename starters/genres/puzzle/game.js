/*
    Push Puzzle (designer card GamePuzzle, Sokoban variant): push every crate onto a mark.
    One step per direction press (keys, d-pad, stick, a swipe or a tap on a neighbour cell), Undo and Restart
    always available, moves counted, stars by moves, Next. Sokoban never fails, so there is no Game Over.
    The canvas draws shapes only; every word and number is the game kit's HTML (js/kit.js).

    Add a level: one entry in LEVELS (a map of strings and par, the moves of a known solution).
    Map legend: # wall, space floor, . mark, $ crate, * crate on a mark, @ player, + player on a mark.
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Push Puzzle', 'puzzle.title': 'Push Puzzle', 'title.play': 'Play', 'title.levels': 'Levels',
        'hud.moves': '{n} moves', 'hud.moves_one': '{n} move', 'hud.moves_left': '{n} moves left', 'puzzle.level': 'Level {n}', 'puzzle.par': '3 stars in {n}',
        'action.undo': 'Undo', 'action.restart': 'Restart', 'action.hint': 'Hint',
        'puzzle.tutorial': '{button} Push every crate onto a mark', 'puzzle.solved': 'Solved!', 'puzzle.all_solved': 'Every Level Solved!',
        'puzzle.moves': 'Moves', 'puzzle.level_label': 'Level {n}, {stars} stars', 'puzzle.level_locked': 'Level {n}, locked'},
    ja: {'game.name': 'プッシュパズル', 'puzzle.title': 'プッシュパズル', 'title.play': 'プレイ', 'title.levels': 'ステージ選択',
        'hud.moves': '{n} 手', 'hud.moves_one': '{n} 手', 'hud.moves_left': 'のこり {n} 手', 'puzzle.level': 'ステージ {n}', 'puzzle.par': '{n} 手で 星3',
        'action.undo': '戻す', 'action.restart': 'やり直し', 'action.hint': 'ヒント',
        'puzzle.tutorial': '{button} 箱をすべて印の上へ押そう', 'puzzle.solved': 'クリア！', 'puzzle.all_solved': '全ステージクリア！',
        'puzzle.moves': '手数', 'puzzle.level_label': 'ステージ {n}、星 {stars}', 'puzzle.level_locked': 'ステージ {n}、ロック中'},
};

// the game's own actions on top of gaming-core's (moveX/moveY push, confirm, back, pause)
const GAME_ACTIONS = {undo: ['key:KeyZ', 'key:Backspace', 'pad:2'], restart: ['key:KeyR', 'pad:3']};

// par = the moves of a known solution (3 stars at par, 2 up to par x 1.5, 1 otherwise)
const LEVELS = [
    {par: 6, map: [          // solution: right right right left left down
        '########',
        '#      #',
        '# @$  .#',
        '#  $   #',
        '#  .   #',
        '########']},
    {par: 11, map: [         // solution: left down left up up right right right down right up
        '#######',
        '#.   .#',
        '#  $  #',
        '# $@  #',
        '#     #',
        '#######']},
    {par: 19, map: [         // solution: left left up up up right down left down right up up right right right down right down left
        '########',
        '#      #',
        '# $##$ #',
        '#  ..  #',
        '#  @   #',
        '########']},
];

const PROGRESS_KEY = GAME_ID + '.progress';   // {levels: {<index>: {stars, best}}}
let progress = readSaveData(PROGRESS_KEY, {levels: {}});
if (!progress.levels) progress = {levels: {}};

let state = 'title';      // title | play | solved
let levelIndex = 0;
let grid;                 // {w, h, walls: [[bool]], floor: [[bool]], marks: [{x, y}]}
let player;               // {x, y, draw: Vector2, face: {x, y}}
let crates = [];          // [{x, y, draw: Vector2}]; grid y grows downward
let history = [];         // snapshots before each move or restart, for Undo
let moves = 0, playTime = 0;
let held = null, heldTimer = 0;   // the direction being held, for key repeat
let pendingDir = null;    // a swipe or tap from the pointer, used on the next tick
let tutorialShown = false;

///////////////////////////////////////////////////////////////////////////////
// Level: parse, move, undo, restart

function loadLevel(i)
{
    levelIndex = i;
    const rows = LEVELS[i].map, h = rows.length, w = Math.max(...rows.map(r=> r.length));
    grid = {w, h, walls: [], floor: [], marks: []};
    crates = [];
    for (let y = 0; y < h; ++y)
    {
        grid.walls.push([]); grid.floor.push([]);
        for (let x = 0; x < w; ++x)
        {
            const c = rows[y][x] || ' ';
            grid.walls[y].push(c === '#');
            grid.floor[y].push(false);
            if ('.*+'.includes(c)) grid.marks.push({x, y});
            if ('$*'.includes(c)) crates.push({x, y, draw: cellPos(x, y)});
            if ('@+'.includes(c)) player = {x, y, draw: cellPos(x, y), face: {x: 0, y: 1}};
        }
    }
    // floor = cells reachable from the player (what is outside the walls stays empty)
    const open = [[player.x, player.y]];
    while (open.length)
    {
        const [x, y] = open.pop();
        if (x < 0 || y < 0 || x >= w || y >= h || grid.walls[y][x] || grid.floor[y][x]) continue;
        grid.floor[y][x] = true;
        open.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    history = [];
    moves = 0;
    playTime = 0;
}

// world position of a cell's centre; the level is centred on the origin
function cellPos(x, y) { return vec2(x - (grid.w - 1) / 2, (grid.h - 1) / 2 - y); }
function wall(x, y) { return y < 0 || y >= grid.h || x < 0 || x >= grid.w || grid.walls[y][x]; }
function crateAt(x, y) { return crates.find(c=> c.x === x && c.y === y); }
function onMark(c) { return grid.marks.some(m=> m.x === c.x && m.y === c.y); }
function snapshot() { return {player: {x: player.x, y: player.y}, crates: crates.map(c=> ({x: c.x, y: c.y})), moves}; }

// one step; dx/dy in grid terms (dy +1 is down). Returns true if the player moved.
function step(dx, dy)
{
    player.face = {x: dx, y: dy};
    const x = player.x + dx, y = player.y + dy;
    if (wall(x, y)) return bump();
    const crate = crateAt(x, y);
    if (crate && (wall(x + dx, y + dy) || crateAt(x + dx, y + dy))) return bump();
    history.push(snapshot());
    if (crate) { crate.x += dx; crate.y += dy; zzfx(...[.3,,200,,.03,.06,4]); }
    else zzfx(...[.1,,600,,.01,.02]);
    player.x = x; player.y = y;
    ++moves;
    if (tutorialShown) { tutorialShown = false; tutorial(); }
    if (crates.every(onMark)) solved();
    return true;
}
function bump() { zzfx(...[.2,,90,,.02,.04]); return false; }

function undo()
{
    if (state !== 'play' || !history.length) return;
    const s = history.pop();
    player.x = s.player.x; player.y = s.player.y;
    s.crates.forEach((c, i)=> { crates[i].x = c.x; crates[i].y = c.y; });
    moves = s.moves;
    zzfx(...[.15,,400,,.02,.04,,,-20]);
}

// Restart can itself be undone: the board before it goes on the history
function restart()
{
    if (state !== 'play') return;
    const before = history.concat([snapshot()]), time = playTime;
    loadLevel(levelIndex);
    history = before;
    playTime = time;
}

function stars(n, par) { return n <= par ? 3 : n <= Math.ceil(par * 1.5) ? 2 : 1; }
function nextUnsolved() { const i = LEVELS.findIndex((l, n)=> !progress.levels[n]); return i < 0 ? 0 : i; }
function unlocked(i) { return i === 0 || !!progress.levels[i - 1]; }

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> play -> results -> next level

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    tutorial();
    loadLevel(nextUnsolved());   // drawn dimmed behind the title
    showScreen(titleScreen({items: [
        {id: 'title-start', t: 'title.play', onSelect: ()=> start(nextUnsolved())},
        {id: 'title-levels', t: 'title.levels', onSelect: openLevels},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ]}));
}

function start(i)
{
    loadLevel(i);
    state = 'play';
    kitPlaying = true;
    held = null;
    pendingDir = null;
    const button = (id, action)=> `<button id="hud-${id}" class="game-touchbtn" tabindex="-1" data-t-label="action.${id}"
        style="width:auto;min-width:96px;height:44px;border-radius:8px;padding:0 12px;display:flex;gap:6px;align-items:center;justify-content:center">
        <span data-prompt="${action}" data-for="keyboard mouse gamepad"></span><span data-t="action.${id}"></span></button>`;
    const el = hudInit(`
      <div data-slot="tl" class="game-num game-big" id="hud-level" style="white-space:nowrap"></div>
      <div data-slot="tr" class="game-stack" data-align="end">
        <b class="game-num game-big" id="hud-moves" aria-live="off" style="white-space:nowrap"></b>
        <span class="game-small game-num" id="hud-par" style="white-space:nowrap"></span>
      </div>
      <div data-slot="bc" class="game-row" style="grid-column:1/-1;justify-self:center;gap:12px;flex-wrap:nowrap;pointer-events:auto">${button('undo', 'undo')}${button('restart', 'restart')}</div>`);
    renderPrompts(el);
    for (const [id, fn] of [['undo', undo], ['restart', restart]])
    {
        const b = el.querySelector('#hud-' + id);
        b.addEventListener('mousedown', (e)=> e.preventDefault());   // keep focus on the game, not the button
        b.addEventListener('click', fn);
    }
    showScreen(el);
    gameBox.focus({preventScroll: true});   // the HUD's buttons are for the pointer; keys play the game
    if (i === 0 && !progress.levels[0]) { tutorial('puzzle.tutorial', 'move'); tutorialShown = true; }
}

function solved()
{
    state = 'solved';
    kitPlaying = false;
    tutorial();
    zzfx(...[.4,,520,.02,.1,.3,,,,,200,.06]);
    const got = stars(moves, LEVELS[levelIndex].par), old = progress.levels[levelIndex];
    const newBest = !!old && moves < old.best;
    progress.levels[levelIndex] = {stars: Math.max(got, old ? old.stars : 0), best: Math.min(moves, old ? old.best : moves)};
    writeSaveData(PROGRESS_KEY, progress);
    const last = levelIndex === LEVELS.length - 1, i = levelIndex;
    kitAfter(.5, ()=> state === 'solved' && results({
        title: last && LEVELS.every((l, n)=> progress.levels[n]) ? 'puzzle.all_solved' : 'puzzle.solved',
        rows: [['puzzle.moves', fmt(moves)], ['hud.time', fmtTime(playTime)], ['levels.best', fmt(progress.levels[i].best)]],
        stars: got, newBest,
        items: [
            {id: 'res-next', t: 'results.next', onSelect: ()=> start(i + 1), hiddenItem: last},
            {id: 'res-retry', t: 'results.retry', onSelect: ()=> start(i)},
            {id: 'res-levels', t: 'results.levels', onSelect: ()=> { toTitle(); openLevels(); }},
            {id: 'res-home', t: 'gameover.title_screen', onSelect: toTitle},
        ]}));
}

// LevelSelect: numbered tiles with stars; a level opens when the one before it is solved
function openLevels()
{
    const total = LEVELS.reduce((s, l, i)=> s + (progress.levels[i] ? progress.levels[i].stars : 0), 0);
    const starIcons = (n)=> [0, 1, 2].map(k=> `<i class="game-icon" data-kind="star" ${k < n ? '' : 'data-off style="background:var(--g-dim)"'}></i>`).join('');
    const slots = LEVELS.map((l, i)=> unlocked(i)
        ? `<button class="game-slot" id="level-${i + 1}" data-level="${i}" aria-label="${esc(t('puzzle.level_label', {n: i + 1, stars: progress.levels[i] ? progress.levels[i].stars : 0}))}"
             style="width:64px;height:64px;display:grid;align-content:center;justify-items:center;gap:4px">
             <span class="game-num">${i + 1}</span><span class="game-row" style="gap:1px" aria-hidden="true">${starIcons(progress.levels[i] ? progress.levels[i].stars : 0)}</span></button>`
        : `<span class="game-slot" id="level-${i + 1}" aria-disabled="true" aria-label="${esc(t('puzzle.level_locked', {n: i + 1}))}"
             style="width:64px;height:64px;display:grid;place-items:center;opacity:.5">${i + 1}</span>`).join('');
    const el = kitSection('levels', `
<section id="levels" class="game-overlay" role="dialog" aria-modal="true" aria-labelledby="lv-title" hidden>
  <div class="game-panel" style="width:min(420px,100%);display:grid;gap:12px">
    <div class="game-row" style="justify-content:space-between">
      <h2 id="lv-title" class="game-h" data-t="levels.title"></h2>
      <span class="game-row game-num"><span class="game-icon" data-kind="star" aria-hidden="true"></span><span>${esc(t('levels.stars_total', {stars: total, max: LEVELS.length * 3}))}</span></span>
    </div>
    <div class="game-slots" role="grid" style="--cols:4;gap:8px;display:grid;grid-template-columns:repeat(4,64px)">${slots}</div>
    <p class="game-hint">${hint('confirm', 'levels.play')} ${hint('back', 'game.back')}</p>
  </div>
</section>`);
    for (const b of el.querySelectorAll('button[data-level]')) b.addEventListener('click', ()=> start(+b.dataset.level));
    el.addEventListener('game:back', ()=> closeScreen(el));
    openScreen(el);
    const focus = el.querySelector(`[data-level="${nextUnsolved()}"]`);   // last played / next unsolved first
    if (focus) focus.focus({preventScroll: true});
}

///////////////////////////////////////////////////////////////////////////////
// Input: one step per press; holding repeats after a beat. Pointer: swipe (12 px dead zone) or tap a neighbour cell.

function pressDir(input)
{
    const x = input.moveX, y = input.moveY;
    if (Math.max(abs(x), abs(y)) < .5) return null;
    return abs(x) >= abs(y) ? {x: sign(x), y: 0} : {x: 0, y: -sign(y)};   // grid y grows downward
}

let swipe = null;
addEventListener('pointerdown', (e)=>
{
    swipe = state === 'play' && !menuOpen() && !(e.target instanceof Element && e.target.closest('button, input, [data-overlay]')) ? {x: e.clientX, y: e.clientY} : null;
}, true);
addEventListener('pointerup', (e)=>
{
    if (!swipe || state !== 'play' || menuOpen()) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.hypot(dx, dy) >= 12) return pendingDir = abs(dx) > abs(dy) ? {x: sign(dx), y: 0} : {x: 0, y: sign(dy)};
    // a tap: the cell under it, if it is next to the player
    const r = mainCanvas.getBoundingClientRect();
    const w = screenToWorld(vec2((e.clientX - r.left) * mainCanvas.width / r.width, (e.clientY - r.top) * mainCanvas.height / r.height));
    const cx = Math.round(w.x + (grid.w - 1) / 2), cy = Math.round((grid.h - 1) / 2 - w.y);
    if (abs(cx - player.x) + abs(cy - player.y) === 1) pendingDir = {x: cx - player.x, y: cy - player.y};
}, true);

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'undo', 'restart']);
    pauseMenu({onQuit: toTitle, extra: [{id: 'pause-restart', t: 'action.restart', onSelect: ()=> { resume(); restart(); }}]});
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    if (state !== 'play' || menuOpen()) { held = null; pendingDir = null; return; }
    if (input.pressed.pause) return openPause();
    playTime += timeDelta;
    if (input.pressed.undo) return undo();
    if (input.pressed.restart) return restart();

    const dir = pressDir(input);
    if (dir && (!held || held.x !== dir.x || held.y !== dir.y)) { held = dir; heldTimer = .3; step(dir.x, dir.y); }
    else if (dir && (heldTimer -= timeDelta) <= 0) { heldTimer = .15; step(dir.x, dir.y); }
    else if (!dir) held = null;
    if (pendingDir && state === 'play') { const d = pendingDir; pendingDir = null; step(d.x, d.y); }
}

function gameUpdatePost()
{
    // fit the level between the HUD's top line and its bottom buttons, at most 72 px a cell
    const top = 76, bottom = 84;
    cameraScale = Math.max(8, Math.min(72, (mainCanvasSize.x - 32) / grid.w, (mainCanvasSize.y - top - bottom) / grid.h));
    cameraPos = vec2(0, -(bottom - top) / 2 / cameraScale);
    // ease the drawn positions toward the grid ones
    const ease = kitReduceMotion() ? 1 : .4;
    player.draw = player.draw.lerp(cellPos(player.x, player.y), ease);
    for (const c of crates) c.draw = c.draw.lerp(cellPos(c.x, c.y), ease);
    if (state === 'play' || state === 'solved')
    {
        hudText('hud-level', t('puzzle.level', {n: levelIndex + 1}));
        hudText('hud-moves', t(moves === 1 ? 'hud.moves_one' : 'hud.moves', {n: fmt(moves)}));
        hudText('hud-par', t('puzzle.par', {n: fmt(LEVELS[levelIndex].par)}));
    }
}

function gameRender()
{
    drawRect(cameraPos, mainCanvasSize.scale(1 / cameraScale), hsl(.35, .25, .12));
    const dim = state === 'title' ? .22 : 1;   // the title's menu reads over a dimmed board
    // floor and walls
    for (let y = 0; y < grid.h; ++y)
        for (let x = 0; x < grid.w; ++x)
        {
            const p = cellPos(x, y);
            if (grid.floor[y][x]) drawRect(p, vec2(.96), hsl(.3, .2, .26 * dim));
            else if (grid.walls[y][x])
            {
                drawRect(p, vec2(1), hsl(.07, .35, .38 * dim));
                drawLine(p.add(vec2(-.5, 0)), p.add(vec2(.5, 0)), .06, hsl(.07, .3, .22 * dim));   // mortar
                drawLine(p.add(vec2(y % 2 ? -.2 : .2, 0)), p.add(vec2(y % 2 ? -.2 : .2, .5)), .06, hsl(.07, .3, .22 * dim));
                drawLine(p.add(vec2(y % 2 ? .25 : -.25, 0)), p.add(vec2(y % 2 ? .25 : -.25, -.5)), .06, hsl(.07, .3, .22 * dim));
            }
        }
    // marks: a ring with a small diamond (shape, not only colour)
    for (const m of grid.marks)
    {
        const p = cellPos(m.x, m.y);
        drawCircle(p, .62, hsl(0, 0, 0, 0), .07, hsl(.13, .9, .6 * dim));
        drawPoly([vec2(0, .12), vec2(.12, 0), vec2(0, -.12), vec2(-.12, 0)], hsl(.13, .9, .6 * dim), 0, BLACK, p);
    }
    // crates: a square with an X; on a mark, a filled diamond instead of the X and a green tint
    for (const c of crates)
    {
        const p = c.draw, done = onMark(c);
        drawRect(p, vec2(.82), done ? hsl(.33, .5, .32 * dim) : hsl(.09, .5, .3 * dim));
        drawRect(p, vec2(.66), done ? hsl(.33, .55, .48 * dim) : hsl(.09, .55, .5 * dim));
        if (done) drawPoly([vec2(0, .24), vec2(.24, 0), vec2(0, -.24), vec2(-.24, 0)], hsl(.13, .9, .65 * dim), .05, hsl(0, 0, .1), p);
        else
        {
            drawLine(p.add(vec2(-.28, -.28)), p.add(vec2(.28, .28)), .08, hsl(.09, .5, .28 * dim));
            drawLine(p.add(vec2(-.28, .28)), p.add(vec2(.28, -.28)), .08, hsl(.09, .5, .28 * dim));
        }
    }
    // player: a round body with two eyes looking the way it last moved
    const p = player.draw, f = vec2(player.face.x, -player.face.y).scale(.08);
    drawCircle(p, .74, hsl(.58, .7, .55 * dim), .06, hsl(.6, .6, .2));
    drawCircle(p.add(vec2(-.13, .08)).add(f), .18, hsl(0, 0, dim));
    drawCircle(p.add(vec2(.13, .08)).add(f), .18, hsl(0, 0, dim));
    drawCircle(p.add(vec2(-.13, .08)).add(f.scale(1.6)), .08, hsl(0, 0, .1));
    drawCircle(p.add(vec2(.13, .08)).add(f.scale(1.6)), .08, hsl(0, 0, .1));
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
