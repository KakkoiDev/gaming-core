/*
    Hop Hill: a side-scrolling platformer (designer card GamePlatformer).
    Run and jump (hold for higher, coyote time and a jump buffer), coins, enemies to stomp, a checkpoint
    and a flag that ends the level into results (time, coins, stars). Lives; out of lives -> Game Over.
    The canvas draws shapes only; every word and number is the game kit's HTML (js/kit.js).

    Extend it:
    - a new level: one more entry in LEVELS (a string map, see TILE KEY) with its name text in GAME_TEXTS
    - a new tile: a character in the map, a case in solidAt()/build(), a few lines in drawTiles()
    - a new move: an action in GAME_ACTIONS, a row in kitControls(), read input.held.<name> in updateHero()
*/
'use strict';

///////////////////////////////////////////////////////////////////////////////
// Texts (English and Japanese) and actions

const GAME_TEXTS = {
    en: {'game.name': 'Hop Hill', 'platformer.title': 'Hop Hill', 'hud.coins': '{n} / {total}', 'hud.time': 'Time',
        'hud.best_time': 'Best {time}', 'platformer.play': 'Play', 'level.name': '1-1 Windy Ledge', 'result.next': 'Next Level',
        'result.replay': 'Replay', 'action.run': 'Run', 'action.down': 'Down / Drop Through', 'touch.left': 'Left', 'touch.right': 'Right',
        'platformer.drop': 'Press {button} to drop through', 'platformer.continue': 'Continue',
        'platformer.star_coins': 'Every coin', 'platformer.star_time': 'Under {time}', 'platformer.star_safe': 'No damage',
        'platformer.lost_detail': 'Coins {coins} · Time {time}'},
    ja: {'game.name': 'ホップヒル', 'platformer.title': 'ホップヒル', 'hud.coins': '{n} / {total}', 'hud.time': 'タイム',
        'hud.best_time': 'ベスト {time}', 'platformer.play': 'プレイ', 'level.name': '1-1 かぜの がけ', 'result.next': 'つぎのレベル',
        'result.replay': 'もう一度', 'action.run': 'ダッシュ', 'action.down': 'しゃがむ・すり抜け', 'touch.left': 'ひだり', 'touch.right': 'みぎ',
        'platformer.drop': '{button} で足場をすり抜け', 'platformer.continue': 'コンティニュー',
        'platformer.star_coins': 'コインぜんぶ', 'platformer.star_time': '{time} 以内', 'platformer.star_safe': 'ノーダメージ',
        'platformer.lost_detail': 'コイン {coins}・タイム {time}'},
};

// gaming-core's own: moveX/moveY, jump, fire, confirm, back, pause. jump also gets ↑ (the card's table).
const GAME_ACTIONS = {
    jump: ['key:Space', 'key:KeyZ', 'key:ArrowUp', 'pad:0'],
    run: ['key:ShiftLeft', 'key:ShiftRight', 'key:KeyX', 'pad:2'],
    down: ['key:ArrowDown', 'key:KeyS', 'pad:13'],
};

///////////////////////////////////////////////////////////////////////////////
// Levels. TILE KEY: # ground  = one-way plank (drop through with down)  o coin  e enemy
//                   P hero start  C checkpoint  F goal flag  . air.  The bottom row is y = 0.

const LEVELS = [{
    name: 'level.name', par: 60, map: [
        '................................................................................',
        '................................................................................',
        '................................................................................',
        '................................................................................',
        '................................................................................',
        '................................................................................',
        '................................................................................',
        '................................................................................',
        '...................................ooo.............ooo..........................',
        '...........ooo...........ooo......=====...........=====.........................',
        '..........######.....................................................oo.........',
        '..........................................##........................####........',
        '..P...ooo.........e............C..........##...e..........ooo...e...####....F...',
        '#########################...#######################...##########################',
        '#########################...#######################...##########################',
        '#########################...#######################...##########################',
    ]}];

// feel: units per second (1 unit = 1 tile); tuned so no jump needs frame-perfect timing
const PHYS = {walk: 7, run: 10.5, accel: 70, friction: 60, gravity: 50, jump: 20, cut: .45, fall: 24,
    coyote: .1, buffer: .12, touchCoyote: .15, touchBuffer: .18};
const HERO = vec2(.7, .9), ENEMY = vec2(.8, .7), VIEW_H = 12, START_LIVES = 3;

let state = 'title';             // title | play | over
let levelIndex = 0, level;       // level = {w, h, rows, coins, enemies, start, checkpoint, flag, par, name}
let hero;                        // {pos, vel, grounded, coyote, buffer, drop, invuln, face}
let lives, coins, levelTime, damaged, checkpointOn, nameTimer;
let tutorialStep = '';           // move | jump | drop | done

///////////////////////////////////////////////////////////////////////////////
// Level building and tile queries

function build(index)
{
    const def = LEVELS[index], h = def.map.length, w = Math.max(...def.map.map(r=> r.length));
    level = {w, h, rows: def.map.map(r=> r.padEnd(w, '.')), coins: [], enemies: [], start: vec2(1.5, 3.5),
        checkpoint: null, flag: null, par: def.par, name: def.name};
    for (let y = 0; y < h; ++y)
        for (let x = 0; x < w; ++x)
        {
            const c = level.rows[h - 1 - y][x], center = vec2(x + .5, y + .5);
            if (c === 'o') level.coins.push({pos: center, taken: false});
            if (c === 'e') level.enemies.push({pos: vec2(x + .5, y + ENEMY.y / 2), home: x + .5, dir: -1, alive: true, squash: 0});
            if (c === 'P') level.start = vec2(x + .5, y + HERO.y / 2);
            if (c === 'C') level.checkpoint = vec2(x + .5, y + HERO.y / 2);
            if (c === 'F') level.flag = vec2(x + .5, y);
        }
}

function tileAt(x, y)
{
    if (x < 0 || x >= level.w) return '#';   // the level's sides are walls
    if (y < 0 || y >= level.h) return '.';   // below is a pit, above is sky
    return level.rows[level.h - 1 - y][x];
}
function solidAt(x, y) { return tileAt(x, y) === '#'; }
function plankAt(x, y) { return tileAt(x, y) === '='; }

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> play -> results (flag) or game over (no lives)

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    tutorial();
    showScreen(titleScreen({items: [
        {id: 'title-start', t: 'platformer.play', onSelect: ()=> startLevel(0, true)},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ]}));
}

function startLevel(index, freshLives)
{
    levelIndex = index;
    build(index);
    if (freshLives || !lives) lives = START_LIVES;
    coins = 0; levelTime = 0; damaged = false; checkpointOn = false; nameTimer = 2;
    spawnHero(level.start);
    state = 'play';
    kitPlaying = true;
    hudInit(`
      <div data-slot="tl" class="game-stack">
        <span id="hud-lives" class="game-row" aria-label="${esc(t('hud.lives'))}"></span>
        <span class="game-row game-num"><span class="game-icon" data-kind="coin" aria-hidden="true"></span><b id="hud-coins"></b></span>
      </div>
      <div data-slot="tc" class="game-h" id="hud-level"></div>
      <div data-slot="tr" class="game-stack" style="justify-items:end">
        <b class="game-num game-big" id="hud-time" aria-label="${esc(t('hud.time'))}"></b>
        <span class="game-small game-num" id="hud-best"></span>
      </div>`);
    showScreen(document.getElementById('hud'));
    tutorialStep = 'move';
    tutorial('tutorial.move', 'move');
}

function spawnHero(pos)
{
    hero = {pos: pos.copy(), vel: vec2(), grounded: true, coyote: 0, buffer: 0, drop: 0, invuln: 0, face: 1};
}

function hurt()
{
    if (hero.invuln > 0) return;
    damaged = true;
    zzfx(...[.5,,150,.02,.1,.25,,,-6]);
    if (--lives <= 0) return lose();
    spawnHero(checkpointOn ? level.checkpoint : level.start);   // back to the last checkpoint
    hero.invuln = 1.5;
}

function bestTime() { return readSaveData(GAME_ID + '.best.' + levelIndex, {time: 0}).time; }

function win()
{
    state = 'over';
    tutorial();
    zzfx(...[.6,,500,.02,.2,.4,,,,,200,.08]);
    const total = level.coins.length, best = bestTime(), newBest = !best || levelTime < best;
    if (newBest) writeSaveData(GAME_ID + '.best.' + levelIndex, {time: levelTime});
    const starCoins = coins === total, starTime = levelTime <= level.par, starSafe = !damaged;
    const mark = (ok)=> ok ? '★' : '☆';
    const next = levelIndex + 1 < LEVELS.length;
    results({title: 'results.clear', newBest,
        rows: [['hud.time', fmtTime(levelTime)], ['results.coins', t('hud.coins', {n: coins, total})],
            ['platformer.star_coins', mark(starCoins)], ['platformer.star_safe', mark(starSafe)]],
        stars: starCoins + starTime + starSafe,
        items: [
            ...(next ? [{id: 'result-next', t: 'result.next', onSelect: ()=> startLevel(levelIndex + 1, false)}] : []),
            {id: 'result-replay', t: 'result.replay', onSelect: ()=> startLevel(levelIndex, true)},
            {id: 'result-title', t: 'gameover.title_screen', onSelect: toTitle}]});
    // the time star's row names the target time, filled from code
    const dl = document.querySelector('#results dl');
    if (dl) dl.insertAdjacentHTML('beforeend', `<dt>${esc(t('platformer.star_time', {time: fmtTime(level.par)}))}</dt><dd style="margin:0">${mark(starTime)}</dd>`);
}

function lose()
{
    state = 'over';
    tutorial();
    gameOver({detail: t('platformer.lost_detail', {coins: t('hud.coins', {n: coins, total: level.coins.length}), time: fmtTime(levelTime)}),
        items: [{id: 'over-continue', t: 'platformer.continue', onSelect: ()=> startLevel(levelIndex, true)},
            {id: 'over-title', t: 'gameover.title_screen', onSelect: toTitle}]});
}

///////////////////////////////////////////////////////////////////////////////
// The hero: run, jump (hold = higher), coyote time, jump buffer, one-way planks

function updateHero(input, dt)
{
    const onTouch = inputDevice() === 'touch';
    let moveX = input.moveX + (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);  // + the touch buttons left/right
    moveX = clamp(moveX, -1, 1);
    if (Math.abs(moveX) < .2) moveX = 0;
    const top = (input.held.run || onTouch) ? PHYS.run : PHYS.walk;   // touch always runs

    // horizontal: accelerate toward the target speed, brake with friction
    const target = moveX * top;
    const rate = moveX ? PHYS.accel : PHYS.friction;
    hero.vel.x += clamp(target - hero.vel.x, -rate * dt, rate * dt);
    if (moveX) hero.face = sign(moveX);

    // jump: a press is remembered for a moment (buffer); leaving a ledge still allows it briefly (coyote)
    hero.coyote = hero.grounded ? (onTouch ? PHYS.touchCoyote : PHYS.coyote) : hero.coyote - dt;
    hero.buffer = input.pressed.jump ? (onTouch ? PHYS.touchBuffer : PHYS.buffer) : hero.buffer - dt;
    if (hero.buffer > 0 && hero.coyote > 0)
    {
        hero.vel.y = PHYS.jump;
        hero.buffer = hero.coyote = 0;
        hero.grounded = false;
        zzfx(...[.3,,250,.01,.05,.1,,,8]);
        if (tutorialStep === 'jump') { tutorialStep = 'done'; tutorial(); }
    }
    if (!input.held.jump && hero.vel.y > 0) hero.vel.y *= PHYS.cut;   // released early: a lower jump

    // down on a plank drops through it
    if (input.pressed.down && hero.grounded && standingOnPlank()) { hero.drop = .25; if (tutorialStep === 'drop') { tutorialStep = 'done'; tutorial(); } }
    hero.drop -= dt;

    hero.vel.y = Math.max(hero.vel.y - PHYS.gravity * dt, -PHYS.fall);
    moveBody(dt);

    // tutorial prompts: move, then the first jump, then the first plank (drop through)
    if (tutorialStep === 'move' && moveX) { tutorialStep = 'jump'; tutorial('tutorial.jump', 'jump'); }
    if (tutorialStep === 'done' && hero.grounded && standingOnPlank() && !hero.droppedOnce) { hero.droppedOnce = true; tutorialStep = 'drop'; tutorial('platformer.drop', 'down'); }
    if (hero.invuln > 0) hero.invuln -= dt;
}

function standingOnPlank()
{
    const y = Math.floor(hero.pos.y - HERO.y / 2 - .05);
    return plankAt(Math.floor(hero.pos.x), y);
}

// axis by axis against the tiles; speeds are capped below one tile per tick, so nothing tunnels
function moveBody(dt)
{
    const half = HERO.scale(.5), eps = .001;
    // x
    hero.pos.x += hero.vel.x * dt;
    for (let y = Math.floor(hero.pos.y - half.y + eps); y <= Math.floor(hero.pos.y + half.y - eps); ++y)
    {
        if (hero.vel.x > 0 && solidAt(Math.floor(hero.pos.x + half.x), y)) { hero.pos.x = Math.floor(hero.pos.x + half.x) - half.x; hero.vel.x = 0; }
        if (hero.vel.x < 0 && solidAt(Math.floor(hero.pos.x - half.x), y)) { hero.pos.x = Math.floor(hero.pos.x - half.x) + 1 + half.x; hero.vel.x = 0; }
    }
    // y
    const oldBottom = hero.pos.y - half.y;
    hero.pos.y += hero.vel.y * dt;
    hero.grounded = false;
    for (let x = Math.floor(hero.pos.x - half.x + eps); x <= Math.floor(hero.pos.x + half.x - eps); ++x)
    {
        const below = Math.floor(hero.pos.y - half.y), above = Math.floor(hero.pos.y + half.y);
        const landsOnPlank = plankAt(x, below) && hero.drop <= 0 && oldBottom >= below + 1 - eps;
        if (hero.vel.y <= 0 && (solidAt(x, below) || landsOnPlank)) { hero.pos.y = below + 1 + half.y; hero.vel.y = 0; hero.grounded = true; }
        else if (hero.vel.y > 0 && solidAt(x, above)) { hero.pos.y = above - half.y; hero.vel.y = 0; }
    }
}

///////////////////////////////////////////////////////////////////////////////
// Enemies, coins, checkpoint and flag

function updateWorld(dt)
{
    for (const e of level.enemies)
    {
        if (!e.alive) { e.squash -= dt; continue; }
        // patrol 3 tiles around home; turn at walls and ledges
        const ahead = e.pos.x + e.dir * (ENEMY.x / 2 + .05), feet = Math.floor(e.pos.y - ENEMY.y / 2);
        if (Math.abs(ahead - e.home) > 3 || solidAt(Math.floor(ahead), feet) || !solidAt(Math.floor(ahead), feet - 1)) e.dir *= -1;
        e.pos.x += e.dir * 2 * dt;
        if (!isOverlapping(hero.pos, HERO, e.pos, ENEMY)) continue;
        if (hero.vel.y < 0 && hero.pos.y - HERO.y / 2 > e.pos.y)
        {
            e.alive = false; e.squash = .4;           // stomped: bounce off it
            hero.vel.y = PHYS.jump * .6;
            zzfx(...[.4,,180,,.05,.1,1,,,,,,,,8]);
        }
        else return hurt();
    }
    for (const c of level.coins)
        if (!c.taken && hero.pos.distance(c.pos) < .8)
        {
            c.taken = true; coins++;
            zzfx(...[.3,,900 + coins * 20,,.03,.1,,,,,300,.05]);   // the pitch rises along a chain
        }
    if (level.checkpoint && !checkpointOn && hero.pos.x >= level.checkpoint.x) { checkpointOn = true; zzfx(...[.3,,600,,.05,.15]); }
    if (level.flag && Math.abs(hero.pos.x - level.flag.x) < .6 && hero.pos.y < level.flag.y + 5) return win();
    if (hero.pos.y < -2) hurt();                         // fell into a pit
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'jump', 'run', 'down']);
    pauseMenu({onQuit: toTitle});
    // left/right buttons bottom left, jump bottom right (touchControls puts every button on the right; move two over)
    const touch = touchControls({stick: false, buttons: [
        {action: 'left', label: 'touch.left', text: '◀'}, {action: 'right', label: 'touch.right', text: '▶'},
        {action: 'jump', label: 'action.jump', text: '▲'}]});
    const arrows = document.createElement('div');
    arrows.className = 'game-row';
    arrows.style.gap = '16px';
    for (const a of ['left', 'right']) arrows.appendChild(touch.querySelector(`[data-action="${a}"]`));
    touch.replaceChild(arrows, touch.firstElementChild);
    touch.querySelector('[data-action="jump"]').style.cssText = 'width:72px;height:72px';
    build(0);
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    if (state !== 'play' || menuOpen()) return;
    if (input.pressed.pause) return openPause();
    const dt = timeDelta;
    levelTime += dt;
    nameTimer -= dt;
    updateHero(input, dt);
    if (state === 'play') updateWorld(dt);
}

function gameUpdatePost()
{
    // fit the level's height to the window; follow the hero sideways, never past the level's ends
    cameraScale = Math.min(mainCanvasSize.y / VIEW_H, mainCanvasSize.x / 12);
    const halfW = mainCanvasSize.x / cameraScale / 2;
    const followX = hero && state !== 'title' ? hero.pos.x : halfW + Math.sin(time * .3) * 4 + 4;
    cameraPos = vec2(level.w > halfW * 2 ? clamp(followX, halfW, level.w - halfW) : level.w / 2, VIEW_H / 2 + .25);
    if (state !== 'play' && state !== 'over') return;
    hudLives('hud-lives', lives);
    hudText('hud-coins', t('hud.coins', {n: coins, total: level.coins.length}));
    hudText('hud-time', fmtTime(levelTime));
    const best = bestTime();
    hudText('hud-best', best ? t('hud.best_time', {time: fmtTime(best)}) : '');
    hudText('hud-level', nameTimer > 0 ? t(level.name) : '');
}

function gameRender()
{
    // sky and two parallax layers (clouds 0.25x, hills 0.5x)
    drawRect(cameraPos, vec2(200, 100), hsl(.55, .55, .72));
    for (let i = -2; i < 14; ++i)
    {
        const cx = i * 9 + cameraPos.x * .75, hx = i * 7 + cameraPos.x * .5;
        drawEllipse(vec2(cx, 11 + (i % 3)), vec2(4.4, 1.6), hsl(0, 0, 1, .8));
        drawCircle(vec2(hx, 2), 9 + (i % 2) * 3, hsl(.3, .35, .55 + (i % 2) * .05));
    }
    drawTiles();
    if (state === 'title') { drawRect(cameraPos, vec2(200, 100), hsl(.6, .4, .1, .45)); return; }  // the title's menu reads over a dimmed world
    for (const c of level.coins)
        if (!c.taken) drawEllipse(c.pos, vec2(.6 * (.5 + .5 * Math.abs(Math.cos(time * 3 + c.pos.x))), .7), hsl(.13, .9, .55), 0, .06, hsl(.1, .9, .35));
    if (level.checkpoint)
    {
        const p = level.checkpoint;
        drawRect(vec2(p.x, p.y + .55), vec2(.12, 2), hsl(0, 0, .3));
        drawPoly([vec2(0, 0), vec2(.8, -.3), vec2(0, -.6)], checkpointOn ? hsl(.33, .7, .5) : hsl(0, 0, .6), 0, undefined, vec2(p.x + .06, p.y + 1.5));
    }
    if (level.flag)
    {
        const p = level.flag;
        drawRect(vec2(p.x, p.y + 2), vec2(.15, 4), hsl(0, 0, .9));
        drawCircle(vec2(p.x, p.y + 4.1), .5, hsl(.13, .9, .55));
        drawPoly([vec2(0, 0), vec2(1.4, -.5), vec2(0, -1)], hsl(0, .75, .55), 0, undefined, vec2(p.x + .08, p.y + 3.9));
    }
    for (const e of level.enemies)
    {
        if (!e.alive) { if (e.squash > 0) drawEllipse(vec2(e.pos.x, e.pos.y - .25), vec2(.9, .25), hsl(.8, .5, .45)); continue; }
        const wobble = Math.sin(time * 10 + e.home) * .04;
        drawEllipse(e.pos, vec2(ENEMY.x + wobble, ENEMY.y - wobble), hsl(.8, .5, .45));
        drawCircle(vec2(e.pos.x + e.dir * .18, e.pos.y + .08), .28, WHITE);
        drawCircle(vec2(e.pos.x + e.dir * .22, e.pos.y + .08), .13, BLACK);
    }
    if (hero && !(hero.invuln > 0 && Math.floor(time * 12) % 2))   // blinks while invulnerable
    {
        const p = hero.pos;
        drawRect(p, HERO, hsl(0, .7, .55));
        drawRect(vec2(p.x, p.y + .3), vec2(HERO.x + .08, .2), hsl(0, .6, .35));              // cap
        drawRect(vec2(p.x + hero.face * .17, p.y + .08), vec2(.12, .18), WHITE);              // eye
        drawRect(vec2(p.x, p.y - .3), vec2(HERO.x, .3), hsl(.6, .5, .4));                     // trousers
    }
}

function drawTiles()
{
    const halfW = mainCanvasSize.x / cameraScale / 2 + 1;
    for (let x = Math.max(0, Math.floor(cameraPos.x - halfW)); x < Math.min(level.w, cameraPos.x + halfW); ++x)
        for (let y = 0; y < level.h; ++y)
        {
            const c = tileAt(x, y), center = vec2(x + .5, y + .5);
            if (c === '#')
            {
                drawRect(center, vec2(1.01), hsl(.08, .45, .32 - (x + y) % 2 * .03));            // soil
                if (!solidAt(x, y + 1)) drawRect(vec2(center.x, y + .88), vec2(1.01, .25), hsl(.3, .6, .45)); // grass top
            }
            else if (c === '=')
            {
                drawRect(vec2(center.x, y + .85), vec2(1.01, .3), hsl(.08, .5, .5));             // wood plank
                drawLine(vec2(x + .05, y + .85), vec2(x + .95, y + .85), .04, hsl(.08, .5, .35));
            }
        }
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
