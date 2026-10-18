/*
    Grid Oath: a turn-based grid tactics battle (designer card GameTactics).
    A 10 x 8 map with forest, rocks and water; 3 of your units against 3 enemies.
    Player Phase: choose a unit -> blue tiles it can reach, red tiles it can attack -> move -> action menu
    (Attack / Wait, HTML) -> choose a target with the forecast. Back undoes the move until you act.
    Enemy Phase: each enemy walks toward your nearest unit and attacks when it can.
    Defeat every enemy -> results (turns, units left, stars); lose every unit -> Game Over.
    The canvas draws shapes only; every word and number is the game kit's HTML (js/kit.js).

    Extend it: a class in CLASSES, a map in MAP, start positions in START, texts in GAME_TEXTS (both languages).
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Grid Oath', 'tactics.title': 'Grid Oath', 'hud.turn': 'Turn {n}', 'phase.player': 'Player Phase',
        'phase.enemy': 'Enemy Phase', 'action.attack': 'Attack', 'action.wait': 'Wait', 'forecast.hit': 'Hit {n}%',
        'forecast.counter': 'Counter', 'forecast.no_counter': 'No counter', 'forecast.damage': 'Damage {n}',
        'goal.defeat_all': 'Defeat all enemies', 'action.confirm': 'Select / Confirm', 'action.end_turn': 'End Turn',
        'action.next_unit': 'Next Unit', 'tactics.hp': 'HP {hp} / {max}', 'tactics.stats': 'Attack {atk} · Move {move} · Range {range}',
        'tactics.actions': 'Actions', 'tactics.no_target': 'No enemy in range', 'tactics.end_turn_confirm': 'Some units have not acted. End the turn?',
        'tactics.victory': 'Victory', 'tactics.defeat': 'Defeat', 'tactics.defeat_detail': 'All your units fell on turn {n}.',
        'tactics.turns': 'Turns', 'tactics.units_left': 'Units left', 'tactics.tut_select': 'Move the cursor to a blue unit and press {button}',
        'tactics.tut_move': 'Choose a blue tile and press {button}', 'tactics.tut_target': 'Choose a red target and press {button}',
        'unit.knight': 'Knight', 'unit.archer': 'Archer', 'unit.lancer': 'Lancer', 'unit.brute': 'Brute', 'unit.bowman': 'Bowman',
        'terrain.grass': 'Grass', 'terrain.forest': 'Forest', 'terrain.rock': 'Rock', 'terrain.water': 'Water',
        'terrain.grass.desc': 'Move cost 1', 'terrain.forest.desc': 'Move cost 2', 'terrain.rock.desc': 'Blocks movement', 'terrain.water.desc': 'Blocks movement'},
    ja: {'game.name': 'グリッドの誓い', 'tactics.title': 'グリッドの誓い', 'hud.turn': 'ターン {n}', 'phase.player': '味方フェイズ',
        'phase.enemy': '敵フェイズ', 'action.attack': '攻撃', 'action.wait': '待機', 'forecast.hit': '命中 {n}%',
        'forecast.counter': '反撃', 'forecast.no_counter': '反撃なし', 'forecast.damage': 'ダメージ {n}',
        'goal.defeat_all': '敵を全滅させる', 'action.confirm': '選択・決定', 'action.end_turn': 'ターン終了',
        'action.next_unit': '次のユニット', 'tactics.hp': 'HP {hp} / {max}', 'tactics.stats': '攻撃 {atk}・移動 {move}・射程 {range}',
        'tactics.actions': '行動', 'tactics.no_target': '射程内に敵がいない', 'tactics.end_turn_confirm': 'まだ行動していないユニットがいます。ターンを終了しますか？',
        'tactics.victory': '勝利', 'tactics.defeat': '敗北', 'tactics.defeat_detail': 'ターン {n} で味方が全滅しました。',
        'tactics.turns': 'ターン数', 'tactics.units_left': '残ったユニット', 'tactics.tut_select': 'カーソルを青いユニットに合わせて {button}',
        'tactics.tut_move': '青いマスを選んで {button}', 'tactics.tut_target': '赤い敵を選んで {button}',
        'unit.knight': 'ナイト', 'unit.archer': 'アーチャー', 'unit.lancer': 'ランサー', 'unit.brute': 'ブルート', 'unit.bowman': 'ボウマン',
        'terrain.grass': '草地', 'terrain.forest': '森', 'terrain.rock': '岩', 'terrain.water': '水',
        'terrain.grass.desc': '移動コスト 1', 'terrain.forest.desc': '移動コスト 2', 'terrain.rock.desc': '通れない', 'terrain.water.desc': '通れない'},
};

// the game's own actions on top of gaming-core's (moveX/moveY move the cursor, confirm selects, back cancels, pause)
const GAME_ACTIONS = {end_turn: ['key:KeyE', 'pad:8'], next_unit: ['key:Tab', 'pad:5']};

///////////////////////////////////////////////////////////////////////////////
// The battle: map, classes, start positions

// top row first; . grass, T forest (costs 2), # rock and ~ water (blocked)
const MAP = [
    '..........',
    '...T..#...',
    '.#..T..T..',
    '...##..#..',
    '......T...',
    '.T..#.....',
    '...~~..#..',
    '..........',
];
const COLS = MAP[0].length, ROWS = MAP.length;
const TERRAIN = {'.': {id: 'grass', cost: 1}, 'T': {id: 'forest', cost: 2}, '#': {id: 'rock', cost: 0}, '~': {id: 'water', cost: 0}};

// damage is the attack value, always hits (the forecast shows the real numbers)
const CLASSES = {
    knight: {hp: 14, atk: 5, move: 3, range: 1, shape: 'sword'},
    archer: {hp: 9, atk: 4, move: 3, range: 2, shape: 'bow'},
    lancer: {hp: 11, atk: 4, move: 4, range: 1, shape: 'lance'},
    brute: {hp: 10, atk: 4, move: 3, range: 1, shape: 'sword'},
    bowman: {hp: 8, atk: 3, move: 3, range: 2, shape: 'bow'},
};
const START = [
    {cls: 'knight', team: 'blue', x: 1, y: 3}, {cls: 'archer', team: 'blue', x: 0, y: 5}, {cls: 'lancer', team: 'blue', x: 1, y: 1},
    {cls: 'brute', team: 'red', x: 8, y: 3}, {cls: 'brute', team: 'red', x: 8, y: 1}, {cls: 'bowman', team: 'red', x: 9, y: 5},
];

let state = 'title';        // title | play | over
let phase = 'player';       // player | enemy
let mode = 'idle';          // idle (cursor free) | move (unit chosen) | menu (action menu open) | target (choosing whom to attack)
let units = [];             // {cls, team, x, y, hp, maxHp, atk, move, range, acted, draw (vec2 for the slide)}
let cursor = vec2(1, 3);    // grid cell
let selected = null;        // the chosen unit
let from = null;            // where the chosen unit stood (undo)
let reach = [];             // [{x, y, cost}] the chosen unit can end on
let targets = [];           // enemies in range after the move
let turn = 1;
let enemyQueue = [], enemyTimer = 0;
let bannerTimer = 0;
let battleTime = 0;         // runs only while the world runs (the tests check the pause freezes it)
let stepTimer = 0, stepDir = vec2();
let menuHeld = false;       // the input that closed a menu is not a game input
let tutorialStep = 0;

const terrainAt = (x, y)=> TERRAIN[MAP[ROWS - 1 - y][x]];
const inside = (x, y)=> x >= 0 && y >= 0 && x < COLS && y < ROWS;
const unitAt = (x, y)=> units.find(u=> u.x === x && u.y === y);
const team = (name)=> units.filter(u=> u.team === name);
const dist = (a, b)=> abs(a.x - b.x) + abs(a.y - b.y);
const cellPos = (x, y)=> vec2(x - COLS / 2 + .5, y - ROWS / 2 + .5);
const cellOf = (pos)=> vec2(Math.floor(pos.x + COLS / 2), Math.floor(pos.y + ROWS / 2));

function makeUnit(s)
{
    const c = CLASSES[s.cls];
    return {cls: s.cls, team: s.team, x: s.x, y: s.y, hp: c.hp, maxHp: c.hp, atk: c.atk, move: c.move, range: c.range, acted: false, draw: cellPos(s.x, s.y)};
}

///////////////////////////////////////////////////////////////////////////////
// Rules: reachable tiles, attacks, counters

// cheapest walk within the unit's move; allies can be passed through, enemies and rocks can not
function reachable(unit)
{
    const best = {[unit.x + ',' + unit.y]: 0}, open = [{x: unit.x, y: unit.y, cost: 0}];
    while (open.length)
    {
        open.sort((a, b)=> a.cost - b.cost);
        const c = open.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
        {
            const x = c.x + dx, y = c.y + dy;
            if (!inside(x, y)) continue;
            const step = terrainAt(x, y).cost, other = unitAt(x, y);
            if (!step || other && other.team !== unit.team) continue;
            const cost = c.cost + step;
            if (cost > unit.move || cost >= (best[x + ',' + y] ?? 99)) continue;
            best[x + ',' + y] = cost;
            open.push({x, y, cost});
        }
    }
    return Object.entries(best).map(([key, cost])=> { const [x, y] = key.split(',').map(Number); return {x, y, cost}; })
        .filter(c=> { const other = unitAt(c.x, c.y); return !other || other === unit; });
}

const inRange = (unit, at, foe)=> { const d = dist(at, foe); return d >= 1 && d <= unit.range; };
const foesInRange = (unit)=> units.filter(u=> u.team !== unit.team && inRange(unit, unit, u));

// the forecast: what happens if attacker hits defender now
function forecast(attacker, defender)
{
    const after = max(0, defender.hp - attacker.atk);
    const counter = after > 0 && inRange(defender, defender, attacker);
    return {damage: attacker.atk, after, hit: 100, counter, counterDamage: counter ? defender.atk : 0};
}

function attack(attacker, defender)
{
    const f = forecast(attacker, defender);
    defender.hp = f.after;
    if (f.counter) attacker.hp = max(0, attacker.hp - f.counterDamage);
    zzfx(...[.4,,220,.01,.05,.15,4,,-3]);
    units = units.filter(u=> u.hp > 0);
    if (!team('red').length) return win();
    if (!team('blue').length) return lose();
}

///////////////////////////////////////////////////////////////////////////////
// Player Phase: cursor, choose, move, act

function stepCursor(input)
{
    // one step per press, then repeat while held (keys, d-pad, stick)
    const dir = vec2(sign(Math.round(input.moveX)), sign(Math.round(input.moveY)));
    if (!dir.x && !dir.y) { stepDir = vec2(); return; }
    const fresh = dir.x !== stepDir.x || dir.y !== stepDir.y;
    stepDir = dir;
    if (!fresh && (stepTimer -= timeDelta) > 0) return;
    stepTimer = fresh ? .3 : .1;
    if (mode === 'target')
    {
        // directions cycle through the enemies in range
        const i = targets.findIndex(u=> u.x === cursor.x && u.y === cursor.y);
        const next = targets[(i + (dir.x || dir.y) + targets.length) % targets.length];
        cursor = vec2(next.x, next.y);
        return;
    }
    cursor = vec2(clamp(cursor.x + dir.x, 0, COLS - 1), clamp(cursor.y + dir.y, 0, ROWS - 1));
}

function confirmCell()
{
    const here = unitAt(cursor.x, cursor.y);
    if (mode === 'idle')
    {
        if (here && here.team === 'blue' && !here.acted) return choose(here);
        return;
    }
    if (mode === 'move')
    {
        if (!reach.some(c=> c.x === cursor.x && c.y === cursor.y)) return;
        from = vec2(selected.x, selected.y);
        selected.x = cursor.x; selected.y = cursor.y;
        zzfx(...[.2,,500,,.02,.04]);
        return openActions();
    }
    if (mode === 'target' && here && targets.includes(here))
    {
        const attacker = selected;
        finishUnit();
        attack(attacker, here);
        afterAction();
    }
}

function choose(unit)
{
    selected = unit;
    reach = reachable(unit);
    mode = 'move';
    zzfx(...[.2,,700,,.02,.03]);
    if (tutorialStep === 0) { tutorialStep = 1; tutorial('tactics.tut_move', 'confirm'); }
}

// back: target -> menu, move -> idle (the menu's own back undoes the move)
function cancel()
{
    if (mode === 'target') { cursor = vec2(selected.x, selected.y); return openActions(); }
    if (mode === 'move') { cursor = vec2(selected.x, selected.y); selected = null; mode = 'idle'; reach = []; }
}

function undoMove()
{
    selected.x = from.x; selected.y = from.y;
    cursor = vec2(from.x, from.y);
    mode = 'move';
}

function finishUnit()
{
    selected.acted = true;
    selected = null; reach = []; targets = [];
    mode = 'idle';
    if (tutorialStep < 3) { tutorialStep = 3; tutorial(); }
}

// after an action: the turn ends by itself when every unit has acted
function afterAction()
{
    if (state !== 'play') return;
    const next = team('blue').find(u=> !u.acted);
    if (!next) return startEnemyPhase();
    cursor = vec2(next.x, next.y);
}

function nextUnit()
{
    const ready = team('blue').filter(u=> !u.acted);
    if (!ready.length) return;
    const i = ready.findIndex(u=> u.x === cursor.x && u.y === cursor.y);
    const u = ready[(i + 1) % ready.length];
    cursor = vec2(u.x, u.y);
}

function askEndTurn()
{
    if (team('blue').some(u=> !u.acted)) confirmDialog('tactics.end_turn_confirm', 'action.end_turn', startEnemyPhase);
    else startEnemyPhase();
}

// the action menu (HTML): Attack (disabled with the reason when nobody is in range) and Wait; back undoes the move
function openActions()
{
    mode = 'menu';
    targets = foesInRange(selected);
    const items = [
        {id: 'act-attack', t: 'action.attack', disabled: !targets.length, onSelect: ()=> { closeActions(); mode = 'target'; cursor = vec2(targets[0].x, targets[0].y); tutorial('tactics.tut_target', 'confirm'); }},
        {id: 'act-wait', t: 'action.wait', onSelect: ()=> { closeActions(); finishUnit(); afterAction(); }},
    ];
    const el = kitSection('actions', `
<section id="actions" class="game-overlay" role="dialog" aria-labelledby="actions-title" style="background:none;place-items:center end;padding:24px;pointer-events:none" hidden>
  <div class="game-panel" style="pointer-events:auto;min-width:170px;display:grid;gap:8px">
    <h2 id="actions-title" class="game-h" data-t="tactics.actions"></h2>
    ${menuHTML(items)}
    ${targets.length ? '' : '<p class="game-small" data-t="tactics.no_target"></p>'}
    <p class="game-hint"><span class="game-row"><span data-prompt="back"></span><span data-t="game.back"></span></span></p>
  </div>
</section>`);
    wireMenu(el, items);
    el.addEventListener('game:back', ()=> { closeActions(); undoMove(); });
    el.addEventListener('game:pause', ()=> openPause());
    // Space clicks a focused button on key up: the Space that opened this menu must not choose in it
    let armed = false;
    const down = ()=> { armed = true; };
    const up = (e)=> { if (!armed && e.code === 'Space') e.preventDefault(); };
    addEventListener('keydown', down, true); addEventListener('keyup', up, true);
    el.cleanup = ()=> { removeEventListener('keydown', down, true); removeEventListener('keyup', up, true); };
    openScreen(el);
    document.getElementById('hud').hidden = false; // keep the unit card and the turn in view beside the menu
}

function closeActions()
{
    const el = document.getElementById('actions');
    if (!el) return;
    el.cleanup && el.cleanup();
    closeScreen(el);
    el.remove();
}

///////////////////////////////////////////////////////////////////////////////
// Enemy Phase: approach the nearest unit, attack the weakest in range

function startEnemyPhase()
{
    if (state !== 'play') return;
    if (mode === 'menu') closeActions();
    selected = null; reach = []; targets = []; mode = 'idle';
    phase = 'enemy';
    bannerTimer = 1.2;
    enemyQueue = team('red');
    enemyTimer = .9;
    zzfx(...[.3,,300,.05,.1,.2,1,,-2]);
}

function enemyAct(enemy)
{
    const cells = reachable(enemy), foes = team('blue');
    let best = null;
    for (const c of cells) for (const foe of foes)
        if (inRange(enemy, c, foe))
        {
            const score = foe.hp * 10 + c.cost;
            if (!best || score < best.score) best = {c, foe, score};
        }
    if (best)
    {
        enemy.x = best.c.x; enemy.y = best.c.y;
        return attack(enemy, best.foe);
    }
    // nobody in reach: walk to the tile closest to any of your units
    let near = null;
    for (const c of cells)
    {
        const d = Math.min(...foes.map(f=> dist(c, f)));
        if (!near || d < near.d || d === near.d && c.cost < near.c.cost) near = {c, d};
    }
    if (near) { enemy.x = near.c.x; enemy.y = near.c.y; }
}

function updateEnemyPhase()
{
    if ((enemyTimer -= timeDelta) > 0) return;
    enemyTimer = .5;
    const enemy = enemyQueue.shift();
    if (enemy && units.includes(enemy)) { enemyAct(enemy); return; }
    if (enemyQueue.length || state !== 'play') return;
    // a new turn
    turn++;
    phase = 'player';
    bannerTimer = 1.2;
    for (const u of units) u.acted = false;
    const first = team('blue')[0];
    cursor = vec2(first.x, first.y);
}

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> battle -> results or game over -> retry

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    tutorial();
    closeActions();
    showScreen(titleScreen({items: [
        {id: 'title-start', t: 'title.new', onSelect: start},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ]}));
}

function start()
{
    units = START.map(makeUnit);
    turn = 1; phase = 'player'; mode = 'idle';
    selected = null; reach = []; targets = []; enemyQueue = [];
    cursor = vec2(START[0].x, START[0].y);
    bannerTimer = 1.2; battleTime = 0; tutorialStep = 0;
    state = 'play';
    kitPlaying = true;
    hudInit(`
      <div data-slot="tl" class="game-stack">
        <b class="game-num" id="hud-turn"></b>
        <span class="game-small" id="hud-goal" data-t="goal.defeat_all"></span>
      </div>
      <div data-slot="tc"><b class="game-big" id="hud-banner" aria-live="polite"></b></div>
      <div data-slot="tr" class="game-stack game-small" data-align="end">
        <span class="game-row"><span data-prompt="end_turn"></span><span data-t="action.end_turn"></span></span>
        <span class="game-row"><span data-prompt="next_unit"></span><span data-t="action.next_unit"></span></span>
      </div>
      <div data-slot="bl" class="game-panel game-stack" id="hud-unit" style="min-width:180px">
        <b id="hud-unit-name"></b>
        <div role="meter" aria-valuemin="0" aria-label="HP"><span class="game-bar" id="hud-hp"></span></div>
        <span class="game-num game-small" id="hud-hp-text"></span>
        <span class="game-small" id="hud-unit-stats"></span>
      </div>
      <div data-slot="br" class="game-panel game-stack" id="hud-info" style="max-width:260px">
        <b id="hud-info-title"></b>
        <span class="game-small" id="hud-info-text"></span>
      </div>`);
    showScreen(document.getElementById('hud'));
    tutorial('tactics.tut_select', 'confirm');
}

function win()
{
    state = 'over';
    tutorial();
    const left = team('blue').length;
    results({title: 'tactics.victory', rows: [['tactics.turns', String(turn)], ['tactics.units_left', left + ' / 3']], stars: max(1, left),
        items: [{id: 'res-retry', t: 'results.retry', onSelect: start}, {t: 'gameover.title_screen', onSelect: toTitle}]});
}

function lose()
{
    state = 'over';
    tutorial();
    gameOver({title: 'tactics.defeat', detail: t('tactics.defeat_detail', {n: turn}),
        items: [{id: 'over-retry', t: 'results.retry', onSelect: start}, {id: 'over-title', t: 'gameover.title_screen', onSelect: toTitle}]});
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'confirm', 'end_turn', 'next_unit']);
    pauseMenu({onQuit: toTitle});
    // turn-based: tap a tile like the mouse; the buttons are Back, Next Unit and End Turn
    touchControls({stick: false, buttons: [{action: 'back', label: 'game.back'}, {action: 'next_unit', label: 'action.next_unit'}, {action: 'end_turn', label: 'action.end_turn'}]});
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    if (state !== 'play' || menuOpen()) { menuHeld = true; return; }
    if (menuHeld) { menuHeld = false; return; }
    // Esc is back while a unit is chosen, pause otherwise
    const backing = input.pressed.back && mode !== 'idle';
    if (input.pressed.pause && !backing) return openPause();
    battleTime += timeDelta;
    bannerTimer -= timeDelta;
    for (const u of units) u.draw = u.draw.lerp(cellPos(u.x, u.y), .3);
    if (phase === 'enemy') return updateEnemyPhase();

    // the mouse (or a tap) moves the cursor to the tile under it; on touch the first tap only moves the cursor
    let tapMoved = false;
    if (input.device === 'mouse' && (input.mouse.delta.x || input.mouse.delta.y || input.pressed.confirm))
    {
        const c = cellOf(input.mouse.pos);
        if (inside(c.x, c.y) && (mode !== 'target' || unitAt(c.x, c.y)))
        {
            tapMoved = c.x !== cursor.x || c.y !== cursor.y;
            cursor = c;
        }
        else if (input.pressed.confirm) return; // a click off the map does nothing
    }
    stepCursor(input);

    if (backing) return cancel();
    if (input.pressed.confirm && !(tapMoved && inputDevice() === 'touch'))
    {
        return confirmCell();
    }
    if (mode === 'idle' && input.pressed.end_turn) return askEndTurn();
    if (mode === 'idle' && input.pressed.next_unit) nextUnit();
}

function gameUpdatePost()
{
    // zoom so the whole map fits the window with room for the HUD
    cameraScale = min(mainCanvasSize.x / (COLS + 1), mainCanvasSize.y / (ROWS + 4.5));
    cameraPos = vec2(0, -.6); // the map sits a little high: the tutorial line is under it
    if (state === 'title') return;
    hudText('hud-turn', t('hud.turn', {n: turn}) + ' · ' + t(phase === 'player' ? 'phase.player' : 'phase.enemy'));
    hudText('hud-banner', bannerTimer > 0 ? t(phase === 'player' ? 'phase.player' : 'phase.enemy') : '');
    // the unit card: the chosen unit, or the one under the cursor
    const u = selected || unitAt(cursor.x, cursor.y);
    const card = document.getElementById('hud-unit');
    if (card) card.hidden = !u;
    if (u)
    {
        hudText('hud-unit-name', t('unit.' + u.cls));
        hudBar('hud-hp', u.hp, u.maxHp);
        hudText('hud-hp-text', t('tactics.hp', {hp: u.hp, max: u.maxHp}));
        hudText('hud-unit-stats', t('tactics.stats', {atk: u.atk, move: u.move, range: u.range}));
    }
    // bottom right: the forecast while choosing a target, the terrain under the cursor otherwise
    const foe = mode === 'target' && unitAt(cursor.x, cursor.y);
    if (foe && selected && targets.includes(foe))
    {
        const f = forecast(selected, foe);
        hudText('hud-info-title', t('unit.' + foe.cls) + ' ' + foe.hp + ' → ' + f.after);
        hudText('hud-info-text', [t('forecast.damage', {n: f.damage}), t('forecast.hit', {n: f.hit}),
            f.counter ? t('forecast.counter') + ' ' + f.counterDamage : t('forecast.no_counter')].join(' · '));
    }
    else
    {
        const ter = terrainAt(cursor.x, cursor.y);
        hudText('hud-info-title', t('terrain.' + ter.id));
        hudText('hud-info-text', t('terrain.' + ter.id + '.desc'));
    }
}

const TEAM_BLUE = hsl(.6, .65, .55), TEAM_RED = hsl(0, .65, .55);

function drawUnit(u)
{
    const p = u.draw, tired = u.acted && phase === 'player' && u.team === 'blue';
    const body = tired ? hsl(u.team === 'blue' ? .6 : 0, .1, .45) : u.team === 'blue' ? TEAM_BLUE : TEAM_RED;
    drawCircle(p, .72, body, .06, hsl(0, 0, .1));
    const mark = hsl(0, 0, .95);
    const shape = CLASSES[u.cls].shape;
    if (shape === 'sword') drawRect(p, vec2(.26, .3), mark);
    if (shape === 'bow') drawPoly([vec2(-.16, -.14), vec2(.16, -.14), vec2(0, .18)], mark, 0, mark, p);
    if (shape === 'lance') drawLine(p.add(vec2(-.2, -.2)), p.add(vec2(.2, .2)), .08, mark);
    // HP as a bar shape under the unit (the numbers are in the HUD)
    drawRect(p.add(vec2(0, -.44)), vec2(.7, .1), hsl(0, 0, .1));
    const w = .7 * u.hp / u.maxHp;
    drawRect(p.add(vec2(-.35 + w / 2, -.44)), vec2(w, .08), u.hp / u.maxHp > .25 ? hsl(.33, .7, .5) : hsl(0, .8, .5));
}

function gameRender()
{
    drawRect(vec2(), vec2(COLS + .3, ROWS + .3), hsl(.3, .2, .12));
    for (let y = 0; y < ROWS; ++y) for (let x = 0; x < COLS; ++x)
    {
        const p = cellPos(x, y), ter = terrainAt(x, y).id;
        drawRect(p, vec2(.96), ter === 'water' ? hsl(.58, .5, .4) : hsl(.28, .45, (x + y) % 2 ? .42 : .45));
        if (ter === 'forest') { drawCircle(p.add(vec2(-.18, -.05)), .4, hsl(.33, .5, .25)); drawCircle(p.add(vec2(.18, .1)), .45, hsl(.33, .5, .3)); }
        if (ter === 'rock') drawPoly([vec2(-.38, -.32), vec2(.38, -.32), vec2(.22, .3), vec2(-.15, .36)], hsl(.1, .05, .5), .04, hsl(0, 0, .25), p);
        if (ter === 'water') drawLine(p.add(vec2(-.3, Math.sin(time * 2 + x) * .08)), p.add(vec2(.3, Math.sin(time * 2 + x) * .08)), .05, hsl(.58, .5, .7));
    }
    if (state === 'title') return;
    // blue tiles it can reach, red tiles it could attack from there
    if (mode === 'move')
    {
        const danger = new Set();
        for (const c of reach) for (let y = 0; y < ROWS; ++y) for (let x = 0; x < COLS; ++x)
            if (terrainAt(x, y).cost && inRange(selected, c, {x, y}) && !reach.some(r=> r.x === x && r.y === y)) danger.add(x + ',' + y);
        for (const key of danger) { const [x, y] = key.split(',').map(Number); drawRect(cellPos(x, y), vec2(.96), hsl(0, .8, .5, .45)); }
        for (const c of reach) drawRect(cellPos(c.x, c.y), vec2(.96), hsl(.6, .8, .55, .45));
    }
    if (mode === 'target' || mode === 'menu') for (const u of targets) drawRect(cellPos(u.x, u.y), vec2(.96), hsl(0, .8, .5, .45));
    for (const u of units) drawUnit(u);
    // the gold cursor
    if (phase === 'player')
    {
        const p = cellPos(cursor.x, cursor.y), s = .5 + Math.sin(time * 6) * .03, gold = hsl(.13, .9, .6), w = .07;
        drawLine(p.add(vec2(-s, -s)), p.add(vec2(s, -s)), w, gold); drawLine(p.add(vec2(s, -s)), p.add(vec2(s, s)), w, gold);
        drawLine(p.add(vec2(s, s)), p.add(vec2(-s, s)), w, gold); drawLine(p.add(vec2(-s, s)), p.add(vec2(-s, -s)), w, gold);
    }
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
