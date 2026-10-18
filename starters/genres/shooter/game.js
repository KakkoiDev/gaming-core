/*
    Star Lane: a vertical shoot 'em up (designer card GameShooter).
    A 9:16 field centred in the window: waves come from the top, the Hive Queen ends the stage.
    Hold Fire to shoot, Bomb clears enemy bullets, Focus slows the ship. Lives, bombs, power 1-4, a top-10 table.
    The canvas draws shapes only; every word and number is the game kit's HTML (js/kit.js).

    Extend it: add waves to WAVES (time, kind, x, count), a kind to ENEMY_KINDS, or a new boss pattern in bossUpdate().
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Star Lane', 'shooter.title': 'Star Lane', 'shooter.start': 'Start', 'hud.score': 'Score', 'hud.hi': 'Hi',
        'hud.lives': 'Lives', 'hud.bombs': 'Bombs', 'hud.power': 'Power', 'hud.boss': 'Hive Queen',
        'action.fire': 'Shoot', 'action.bomb': 'Bomb', 'action.focus': 'Focus (slow)',
        'shooter.tut_fire': 'Hold {button} to fire', 'shooter.tut_bomb': '{button} for a bomb',
        'shooter.clear': 'Stage Clear', 'shooter.hits': 'Enemies hit', 'shooter.lives_left': 'Lives left',
        'shooter.again': 'Play Again', 'shooter.continue': 'Continue', 'shooter.continues': 'Score {score} · Continues left: {n}',
        'shooter.back': 'Back'},
    ja: {'game.name': 'スターレーン', 'shooter.title': 'スターレーン', 'shooter.start': 'スタート', 'hud.score': 'スコア', 'hud.hi': 'ハイ',
        'hud.lives': 'のこり', 'hud.bombs': 'ボム', 'hud.power': 'パワー', 'hud.boss': 'ハイブクイーン',
        'action.fire': 'ショット', 'action.bomb': 'ボム', 'action.focus': '低速移動',
        'shooter.tut_fire': '{button} 長押しでショット', 'shooter.tut_bomb': '{button} でボム',
        'shooter.clear': 'ステージクリア', 'shooter.hits': '命中率', 'shooter.lives_left': '残機',
        'shooter.again': 'もう一度', 'shooter.continue': 'コンティニュー', 'shooter.continues': 'スコア {score}・のこりコンティニュー {n}',
        'shooter.back': 'もどる'},
};

// gaming-core's own actions (moveX/moveY, jump, fire, confirm, back, pause) plus the card's: fire is Z/Space here
const GAME_ACTIONS = {
    fire:  ['key:KeyZ', 'key:Space', 'mouse:0', 'pad:0', 'pad:7'],
    bomb:  ['key:KeyX', 'mouse:2', 'pad:1'],
    focus: ['key:ShiftLeft', 'mouse:1', 'pad:6'],
};

const FIELD = vec2(18, 32);         // world units, 9:16; the camera fits it to the window
const HALF = FIELD.scale(.5);
const SCORE_TABLE = 'stage1';
const CONTINUES = 3;

let state = 'title';                // title | play | over
let player, shots, enemies, enemyShots, pickups, sparks, boss;
let score, lives, bombs, power, continues, stageTime, waveIndex, shotTimer, invuln, bombFlash, clearTimer;
let shotsFired, shotsHit, fireHeldTime, tutorialStep;

function best() { const list = highScores(SCORE_TABLE).list(); return list.length ? list[0].score : 0; }

///////////////////////////////////////////////////////////////////////////////
// The stage: waves by time, then the boss

// t: seconds into the stage; kind: ENEMY_KINDS key; x: centre; n: how many side by side
const WAVES = [
    {t: 1, kind: 'dart', x: -4, n: 3}, {t: 2.5, kind: 'dart', x: 4, n: 3}, {t: 4.5, kind: 'grape', x: 0, n: 1},
    {t: 6, kind: 'dart', x: 0, n: 5}, {t: 8, kind: 'grape', x: -5, n: 1}, {t: 8, kind: 'grape', x: 5, n: 1},
    {t: 10, kind: 'dart', x: -3, n: 4}, {t: 11.5, kind: 'dart', x: 3, n: 4}, {t: 13, kind: 'grape', x: 0, n: 2},
];
const BOSS_AT = 17;                 // the boss comes when the waves are done and this time has passed

const ENEMY_KINDS = {
    dart:  {hp: 1, size: 1.2, points: 100, color: hsl(0, .75, .55)},     // swoops down, curls away; never shoots
    grape: {hp: 4, size: 1.6, points: 300, color: hsl(.8, .55, .55)},    // stops high up, fires aimed shots, drops power
};

function spawnWave(wave)
{
    for (let i = 0; i < wave.n; ++i)
    {
        const kind = ENEMY_KINDS[wave.kind];
        const x = clamp(wave.x + (i - (wave.n - 1) / 2) * 2, -HALF.x + 1, HALF.x - 1);
        enemies.push({kind: wave.kind, pos: vec2(x, HALF.y + 1 + i * .6), hp: kind.hp, age: 0, flash: 0, side: sign(x) || 1, shots: 2});
    }
}

function enemyUpdate(e)
{
    e.age += timeDelta;
    if (e.kind === 'dart')
    {
        // down to the middle, then curl out to its side
        if (e.pos.y > 2) e.pos.y -= .16;
        else { e.pos.x += .14 * e.side; e.pos.y += .05; }
    }
    else
    {
        // down to y = 9, hover and fire, then leave upwards
        if (e.age < 7) e.pos.y = max(9, e.pos.y - .1);
        else e.pos.y += .08;
        e.pos.x += Math.sin(e.age * 1.5) * .03;
        if (e.shots && e.age > 2.5 + (2 - e.shots) * 1.8) { e.shots--; aimedShot(e.pos, .15); }
    }
    e.flash = max(0, e.flash - 1);
    return abs(e.pos.x) < HALF.x + 3 && e.pos.y < HALF.y + 6;
}

function aimedShot(from, speed, angleOffset = 0)
{
    const dir = player.pos.subtract(from);
    const angle = Math.atan2(dir.x, dir.y) + angleOffset;
    enemyShots.push({pos: from.copy(), vel: vec2(Math.sin(angle), Math.cos(angle)).scale(speed)});
}

function killEnemy(e)
{
    score += ENEMY_KINDS[e.kind].points;
    explode(e.pos, ENEMY_KINDS[e.kind].color, 1.5);
    if (e.kind === 'grape') pickups.push({pos: e.pos.copy()});
    zzfx(...[.4,,90,.01,.1,.3,4,,-2]);
}

///////////////////////////////////////////////////////////////////////////////
// The boss: the Hive Queen sways, fires rings and aimed fans; its HP bar is the HUD's top centre

const BOSS_HP = 300;

function bossUpdate()
{
    const b = boss;
    b.age += timeDelta;
    if (!b.ready)
    {
        b.pos.y = max(10, b.pos.y - .08);
        b.ready = b.pos.y <= 10;
        return;
    }
    b.pos.x = Math.sin(b.age * .7) * 4;     // wings stay inside the field
    b.flash = max(0, b.flash - 1);
    b.ringTimer -= timeDelta;
    b.fanTimer -= timeDelta;
    if (b.ringTimer <= 0)
    {
        b.ringTimer = b.hp < BOSS_HP / 2 ? 1.2 : 1.8;
        for (let i = 0; i < 14; ++i)
        {
            const a = i / 14 * PI * 2 + b.age;
            enemyShots.push({pos: b.pos.copy(), vel: vec2(Math.sin(a), Math.cos(a)).scale(.12)});
        }
    }
    if (b.fanTimer <= 0) { b.fanTimer = 1.1; for (const o of [-.25, 0, .25]) aimedShot(b.pos.add(vec2(0, -1.5)), .18, o); }
}

///////////////////////////////////////////////////////////////////////////////
// The ship: move, fire, bomb, get hit

function playerUpdate(input)
{
    const speed = input.held.focus ? .14 : .28;
    if (input.device === 'mouse' && inputDevice() === 'mouse' && input.held.fire)
    {
        // the mouse: the ship follows the pointer while the left button is held
        const to = input.mouse.pos.subtract(player.pos);
        player.pos = player.pos.add(to.length() > speed ? to.normalize(speed) : to);
    }
    else
    {
        const move = vec2(input.moveX, input.moveY);
        player.pos = player.pos.add(move.length() > 1 ? move.normalize(speed) : move.scale(speed));
    }
    player.pos = vec2(clamp(player.pos.x, -HALF.x + .8, HALF.x - .8), clamp(player.pos.y, -HALF.y + 1, HALF.y - 2));

    // fire: held (automatic on touch)
    const firing = input.held.fire || inputDevice() === 'touch';
    shotTimer = max(0, shotTimer - 1);
    if (firing)
    {
        fireHeldTime += timeDelta;
        if (!shotTimer)
        {
            shotTimer = 6;
            const spread = [[0], [-.3, .3], [-.5, 0, .5], [-.8, -.3, .3, .8]][power - 1];
            for (const dx of spread) { shots.push({pos: player.pos.add(vec2(dx, .8)), vel: vec2(dx * .08, .8)}); shotsFired++; }
            zzfx(...[.05,,800,,.01,.02,,,-20]);
        }
    }

    if (input.pressed.bomb && bombs > 0) useBomb();
    invuln = max(0, invuln - timeDelta);
}

function useBomb()
{
    bombs--;
    bombFlash = 1;
    invuln = max(invuln, 1);
    for (const s of enemyShots) explode(s.pos, hsl(0, .8, .6), .4);
    enemyShots = [];
    for (const e of enemies) e.hp -= 10;
    if (boss && boss.ready) boss.hp -= 20;
    zzfx(...[.6,,60,.05,.3,.5,4,,,,,,,1]);
}

function hitPlayer()
{
    if (invuln > 0) return;
    explode(player.pos, hsl(.5, .8, .6), 2);
    zzfx(...[.6,,150,.02,.2,.4,4,,-5]);
    lives--;
    power = max(1, power - 1);
    if (lives <= 0) return lose();
    bombs = 3;
    invuln = 2;
    enemyShots = enemyShots.filter(s=> s.pos.distance(player.pos) > 5);
}

function explode(pos, color, size) { sparks.push({pos: pos.copy(), color, size, t: 0}); }

///////////////////////////////////////////////////////////////////////////////
// One tick of play: spawn, move, collide

function playUpdate(input)
{
    stageTime += timeDelta;
    while (waveIndex < WAVES.length && stageTime >= WAVES[waveIndex].t) spawnWave(WAVES[waveIndex++]);
    if (!boss && waveIndex >= WAVES.length && stageTime >= BOSS_AT && !enemies.length)
        boss = {pos: vec2(0, HALF.y + 4), hp: BOSS_HP, age: 0, ready: false, flash: 0, ringTimer: 1.5, fanTimer: 2.5};

    if (clearTimer < 0) playerUpdate(input);
    enemies = enemies.filter(enemyUpdate);
    if (boss && boss.hp > 0) bossUpdate();

    // the ship's shots against enemies and the boss
    for (const s of shots) s.pos = s.pos.add(s.vel);
    shots = shots.filter(s=>
    {
        if (s.pos.y > HALF.y + 1) return false;
        const e = enemies.find(e=> isOverlapping(s.pos, vec2(.3, .6), e.pos, vec2(ENEMY_KINDS[e.kind].size)));
        if (e) { e.hp--; e.flash = 3; shotsHit++; return false; }
        if (boss && boss.ready && boss.hp > 0 && isOverlapping(s.pos, vec2(.3, .6), boss.pos, vec2(6, 3)))
        { boss.hp--; boss.flash = 3; shotsHit++; score += 10; return false; }
        return true;
    });
    enemies = enemies.filter(e=> e.hp > 0 || (killEnemy(e), false));

    // enemy shots, bodies and pickups against the ship (a small hitbox in the middle of the ship)
    for (const s of enemyShots) s.pos = s.pos.add(s.vel);
    enemyShots = enemyShots.filter(s=> abs(s.pos.x) < HALF.x + 1 && abs(s.pos.y) < HALF.y + 2);
    if (clearTimer < 0)
    {
        if (enemyShots.some(s=> s.pos.distance(player.pos) < .5) || enemies.some(e=> e.pos.distance(player.pos) < ENEMY_KINDS[e.kind].size / 2 + .3))
            hitPlayer();
        if (state !== 'play') return;
        pickups = pickups.filter(p=>
        {
            p.pos.y -= .06;
            if (p.pos.distance(player.pos) < 1.2) { power = min(4, power + 1); score += 500; zzfx(...[.4,,500,,.05,.2,,,10]); return false; }
            return p.pos.y > -HALF.y - 1;
        });
    }

    // the boss beaten: a short beat of explosions, then the results
    if (boss && boss.hp <= 0 && clearTimer < 0)
    {
        clearTimer = 1.2;
        score += 10000;
        enemyShots = [];
        for (let i = 0; i < 6; ++i) explode(boss.pos.add(vec2(rand(-3, 3), rand(-1.5, 1.5))), hsl(rand(.7, 1), .7, .6), 3);
        zzfx(...[1,,40,.05,.5,.8,4,,-1]);
    }
    if (clearTimer >= 0 && (clearTimer -= timeDelta) < 0) return win();

    bombFlash = max(0, bombFlash - timeDelta * 1.5);
    for (const p of sparks) p.t += timeDelta;
    sparks = sparks.filter(p=> p.t < .4);

    // first-run hints: hold fire, then the bomb
    if (tutorialStep === 0 && fireHeldTime > 1.5) { tutorialStep = 1; tutorial('shooter.tut_bomb', 'bomb'); }
    if (tutorialStep === 1 && (bombs < 3 || fireHeldTime > 6)) { tutorialStep = 2; tutorial(); }
}

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> play -> results (boss beaten) or game over (continue / title)

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    tutorial();
    showScreen(titleScreen({items: [
        {id: 'title-start', t: 'shooter.start', onSelect: start},
        {id: 'title-scores', t: 'results.high_scores', onSelect: showScores},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ]}));
}

function showScores()
{
    const el = results({title: 'results.high_scores', scores: {table: SCORE_TABLE, score: 0},
        items: [{id: 'scores-back', t: 'shooter.back', onSelect: ()=> closeScreen(document.getElementById('results'))}]});
    el.addEventListener('game:back', ()=> closeScreen(el));
}

function start()
{
    player = {pos: vec2(0, -13.5)};   // low, under the tutorial line
    shots = []; enemies = []; enemyShots = []; pickups = []; sparks = []; boss = null;
    score = 0; lives = 3; bombs = 3; power = 1; continues = CONTINUES;
    stageTime = 0; waveIndex = 0; shotTimer = 0; invuln = 1; bombFlash = 0; clearTimer = -1;
    shotsFired = 0; shotsHit = 0; fireHeldTime = 0; tutorialStep = 0;
    hudInit(`
      <div data-slot="tl" style="display:grid;gap:2px">
        <span class="game-small" data-t="hud.score"></span>
        <b class="game-num" id="hud-score" style="font-size:22px" aria-live="off"></b>
        <span class="game-small"><span data-t="hud.hi"></span> <span class="game-num" id="hud-hi"></span></span>
      </div>
      <div data-slot="tc" id="hud-boss" style="display:grid;gap:4px;justify-items:center" hidden>
        <span class="game-small" id="hud-boss-name" data-t="hud.boss"></span>
        <span role="meter" aria-labelledby="hud-boss-name" aria-valuemin="0" aria-valuemax="${BOSS_HP}" aria-valuenow="${BOSS_HP}">
          <span class="game-bar" id="hud-boss-bar" style="width:min(220px,40vw)"></span></span>
      </div>
      <div data-slot="tr" style="display:grid;gap:6px;justify-items:end">
        <span class="game-row" id="hud-lives" style="gap:4px"></span>
        <span class="game-row" id="hud-bombs" style="gap:4px"></span>
      </div>
      <div data-slot="bc" class="game-row" style="gap:6px;align-items:center">
        <span class="game-small" data-t="hud.power"></span><span class="game-row" id="hud-power" style="gap:3px"></span>
      </div>`);
    resumePlay();
    tutorial('shooter.tut_fire', 'fire');
}

function resumePlay()
{
    state = 'play';
    kitPlaying = true;
    showScreen(document.getElementById('hud'));
}

function lose()
{
    state = 'over';
    tutorial();
    gameOver({detail: t('shooter.continues', {score: fmt(score), n: continues}), items: [
        {id: 'over-continue', t: 'shooter.continue', onSelect: continueRun, disabled: continues <= 0},
        {id: 'over-title', t: 'gameover.title_screen', onSelect: toTitle, autofocus: continues <= 0},
    ]});
}

// Continue: the score goes back to 0, the stage stays where it was
function continueRun()
{
    continues--;
    score = 0; lives = 3; bombs = 3; invuln = 2;
    shots = []; enemyShots = [];   // nothing in flight scores or hits after the continue
    resumePlay();
}

function win()
{
    state = 'over';
    tutorial();
    const hit = shotsFired ? Math.round(shotsHit / shotsFired * 100) : 0;
    results({title: 'shooter.clear', stars: lives,
        rows: [['hud.score', fmt(score)], ['shooter.hits', hit + '%'], ['shooter.lives_left', String(lives)]],
        items: [{id: 'res-again', t: 'shooter.again', onSelect: start}, {id: 'res-title', t: 'gameover.title_screen', onSelect: toTitle}],
        scores: {table: SCORE_TABLE, score}});
}

///////////////////////////////////////////////////////////////////////////////
// HUD helpers: icons as HTML (ships for lives, round bombs, power pips); only changes reach the DOM

const SHIP_ICON = '<span class="game-icon" aria-hidden="true" style="width:14px;height:14px;background:var(--g-energy);clip-path:polygon(50% 0,100% 100%,50% 75%,0 100%)"></span>';
const BOMB_ICON = '<span class="game-icon" aria-hidden="true" style="width:9px;height:9px;border-radius:50%;background:var(--g-accent)"></span>';

function hudIcons(id, n, icon, labelKey)
{
    const key = id + ':' + n;
    if (hudCache[id] === key) return;
    hudCache[id] = key;
    const e = document.getElementById(id);
    if (!e) return;
    e.innerHTML = icon.repeat(max(0, min(n, 6)));
    e.setAttribute('aria-label', t(labelKey) + ' ' + n);
}

function hudPower(n)
{
    if (hudCache['hud-power'] === n) return;
    hudCache['hud-power'] = n;
    const e = document.getElementById('hud-power');
    if (e) e.innerHTML = [1, 2, 3, 4].map(i=> `<span class="game-icon" aria-hidden="true" style="width:10px;height:10px;background:${i <= n ? 'var(--g-accent)' : 'var(--g-dim)'};opacity:${i <= n ? 1 : .4}"></span>`).join('') + `<span class="sr-only">${n}/4</span>`;
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'fire', 'bomb', 'focus']);
    pauseMenu({onQuit: toTitle});
    touchControls({stick: true, buttons: [{action: 'bomb', label: 'action.bomb'}]});
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    if (state !== 'play' || menuOpen()) return;
    if (input.pressed.pause) return openPause();
    playUpdate(input);
}

function gameUpdatePost()
{
    // the 9:16 field fits the window's height (or width on a narrow phone)
    cameraScale = min(mainCanvasSize.x / (FIELD.x + .5), mainCanvasSize.y / (FIELD.y + .5));
    cameraPos = vec2();
    if (state !== 'play' && state !== 'over') return;
    hudText('hud-score', fmt(score));
    hudText('hud-hi', fmt(max(best(), score)));
    hudIcons('hud-lives', lives, SHIP_ICON, 'hud.lives');
    hudIcons('hud-bombs', bombs, BOMB_ICON, 'hud.bombs');
    hudPower(power);
    const bossShown = !!boss && boss.hp > 0;
    const bossEl = document.getElementById('hud-boss');
    if (bossEl && bossEl.hidden === bossShown) bossEl.hidden = !bossShown;
    if (bossShown) hudBar('hud-boss-bar', boss.hp, BOSS_HP);
}

///////////////////////////////////////////////////////////////////////////////
// Drawing: shapes only (starfield, ships, bullets, sparks)

// three star layers at 1x, 2x and 4x speed, plus a few drifting rocks; positions fixed so screenshots match
const STARS = Array.from({length: 90}, (_, i)=> ({x: ((i * 7919) % 1800) / 100 - 9, y: ((i * 104729) % 3200) / 100, layer: i % 3}));
const ROCKS = Array.from({length: 4}, (_, i)=> ({x: -6 + i * 4, y: i * 9, size: 1 + (i % 2) * .8, spin: i}));

function drawBackground()
{
    drawRect(vec2(), FIELD, hsl(.66, .45, .07));
    const t = state === 'title' ? time : stageTime || 0;   // stage time: the stars stop while paused
    for (const s of STARS)
    {
        const speed = [1, 2, 4][s.layer];
        const y = ((s.y - t * speed) % FIELD.y + FIELD.y) % FIELD.y - HALF.y;
        drawRect(vec2(s.x, y), vec2(.06 + s.layer * .05, .06 + s.layer * .12), hsl(.6, .3, .5 + s.layer * .15, .4 + s.layer * .2));
    }
    for (const r of ROCKS)
    {
        const y = ((r.y - t * .5) % (FIELD.y + 6) + FIELD.y + 6) % (FIELD.y + 6) - HALF.y - 3;
        const points = [0, 1, 2, 3, 4, 5].map(i=> vec2(Math.cos(i / 6 * PI * 2), Math.sin(i / 6 * PI * 2)).scale(r.size * (i % 2 ? .8 : 1)));
        drawPoly(points, hsl(.7, .2, .18), 0, BLACK, vec2(r.x, y), t * .2 + r.spin);
    }
}

function drawShip(pos, blink)
{
    if (blink) return;
    drawPoly([vec2(0, .9), vec2(.7, -.6), vec2(0, -.3), vec2(-.7, -.6)], hsl(.5, .8, .6), .08, hsl(.5, .9, .85), pos);
    drawRect(pos.add(vec2(0, -.55)), vec2(.25, .3), hsl(.1, 1, .6));   // the engine
    drawCircle(pos, .25, WHITE);                                        // the hitbox shows as the core
}

function drawEnemy(e)
{
    const kind = ENEMY_KINDS[e.kind], color = e.flash ? WHITE : kind.color;
    if (e.kind === 'dart') drawPoly([vec2(0, -.7), vec2(.6, .5), vec2(0, .2), vec2(-.6, .5)], color, .06, BLACK, e.pos);
    else for (const [x, y] of [[0, 0], [-.45, .35], [.45, .35], [0, .6], [-.3, -.35], [.3, -.35]]) drawCircle(e.pos.add(vec2(x, y)), .65, color, .05, BLACK);
}

function drawBoss(b)
{
    const color = b.flash ? WHITE : hsl(.92, .6, .5);
    drawPoly([vec2(-3, .5), vec2(-1.5, 1.5), vec2(1.5, 1.5), vec2(3, .5), vec2(1.5, -1.5), vec2(-1.5, -1.5)], color, .1, BLACK, b.pos);
    drawPoly([vec2(-3, .5), vec2(-4.5, 2), vec2(-4, -1)], hsl(.8, .5, .45), .08, BLACK, b.pos);
    drawPoly([vec2(3, .5), vec2(4.5, 2), vec2(4, -1)], hsl(.8, .5, .45), .08, BLACK, b.pos);
    drawCircle(b.pos.add(vec2(0, -.3)), 1.2 + Math.sin(b.age * 6) * .1, hsl(.12, 1, .6));
}

function gameRender()
{
    drawBackground();
    if (state === 'title' || !player) { drawShip(vec2(0, -11 + Math.sin(time * 2) * .5)); return; }
    for (const p of pickups) { drawRect(p.pos, vec2(.9), hsl(.15, .9, .55), time * 3); drawRect(p.pos, vec2(.4), WHITE, time * 3); }
    for (const e of enemies) drawEnemy(e);
    if (boss && (boss.hp > 0 || clearTimer >= 0)) drawBoss(boss);
    for (const s of shots) { drawRect(s.pos, vec2(.22, .6), hsl(.11, 1, .55)); drawRect(s.pos, vec2(.08, .4), WHITE); }
    if (state === 'play' || state === 'over') drawShip(player.pos, (state === 'over' && lives <= 0) || (invuln > 0 && (time * 12 | 0) % 2));
    for (const s of enemyShots) { drawCircle(s.pos, .42, hsl(0, .85, .55)); drawCircle(s.pos, .18, WHITE); }
    if (state === 'play') for (const p of sparks) drawCircle(p.pos, p.size * (.3 + p.t * 2.5), hsl(0, 0, 1, 0).lerp(p.color, 1 - p.t / .4));
    if (bombFlash > 0) drawCircle(player.pos, (1 - bombFlash) * 30, hsl(.12, 1, .6, bombFlash * .35), .3, hsl(.12, 1, .8, bombFlash));
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
