/*
    Turbo Loop: a top-down racer (designer card GameRacing).
    One closed track (a loop of waypoints drawn as road shapes; grass slows you), your car and 3 computer cars,
    a 3 · 2 · 1 · GO countdown, checkpoints that count only in order, 3 laps, then a results table.
    Finishing last is a loss (Game Over with Retry). Time Trial is the same track alone, with your best lap saved.
    The canvas draws shapes only; every word and number is the game kit's HTML (js/kit.js).

    Extend it: a new track is another TRACK list (keep it a loop, start line at TRACK[0]);
    a new car is an entry in RIVALS; car feel is the constants under "Tuning".
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Turbo Loop', 'race.title': 'Turbo Loop', 'race.start': 'Race', 'race.trial': 'Time Trial',
        'hud.position': '{n}{suffix} / {total}', 'hud.lap': 'Lap {n} / {total}', 'race.go': 'GO', 'race.final_lap': 'Final Lap',
        'race.wrong_way': 'Wrong Way', 'results.next': 'Next Race', 'race.best_lap': 'Best {time}', 'race.speed': '{n} km/h',
        'race.best': 'Best lap', 'race.place': 'Place', 'race.finished': 'You finished {place}', 'race.trial_done': 'Time Trial',
        'race.new_record': 'New best lap!', 'race.last': 'Last Place', 'race.last_detail': 'Time {time} · Best lap {best}',
        'race.standings': 'Race', 'race.you': 'You', 'race.rival1': 'Blaze', 'race.rival2': 'Volt', 'race.rival3': 'Mint',
        'race.tip': 'Hold {button} to brake · boost when the bar is full', 'race.retry': 'Retry',
        'suffix.1': 'st', 'suffix.2': 'nd', 'suffix.3': 'rd', 'suffix.n': 'th',
        'action.move': 'Steer', 'action.accelerate': 'Accelerate', 'action.brake': 'Brake / reverse', 'action.boost': 'Boost',
        'touch.gas': 'Gas', 'touch.brake': 'Brake', 'touch.boost': 'Boost'},
    ja: {'game.name': 'ターボループ', 'race.title': 'ターボループ', 'race.start': 'レース', 'race.trial': 'タイムアタック',
        'hud.position': '{n}位 / {total}', 'hud.lap': 'ラップ {n} / {total}', 'race.go': 'ゴー', 'race.final_lap': 'ファイナルラップ',
        'race.wrong_way': '逆走', 'results.next': '次のレース', 'race.best_lap': 'ベスト {time}', 'race.speed': '{n} km/h',
        'race.best': 'ベストラップ', 'race.place': '順位', 'race.finished': '{place}でゴール', 'race.trial_done': 'タイムアタック',
        'race.new_record': 'ベストラップ更新！', 'race.last': '最下位', 'race.last_detail': 'タイム {time}・ベストラップ {best}',
        'race.standings': 'レース結果', 'race.you': 'あなた', 'race.rival1': 'ブレイズ', 'race.rival2': 'ボルト', 'race.rival3': 'ミント',
        'race.tip': '{button} でブレーキ・ゲージが満タンでブースト', 'race.retry': 'リトライ',
        'suffix.1': '位', 'suffix.2': '位', 'suffix.3': '位', 'suffix.n': '位',
        'action.move': 'ハンドル', 'action.accelerate': 'アクセル', 'action.brake': 'ブレーキ・バック', 'action.boost': 'ブースト',
        'touch.gas': 'アクセル', 'touch.brake': 'ブレーキ', 'touch.boost': 'ブースト'},
};

// the game's own actions on top of gaming-core's; steering is gaming-core's moveX axis (arrows, A/D, d-pad, left stick)
const GAME_ACTIONS = {
    accelerate: ['key:ArrowUp', 'key:KeyW', 'key:KeyZ', 'pad:7', 'pad:0'],   // right trigger or south
    brake: ['key:ArrowDown', 'key:KeyS', 'key:KeyX', 'pad:6', 'pad:2'],       // left trigger or west
    boost: ['key:Space', 'pad:1'],                                           // east
};

///////////////////////////////////////////////////////////////////////////////
// Track: a loop of waypoints (world units, y up). TRACK[0] is the start/finish line; every waypoint is a checkpoint.

const TRACK = [vec2(0, -30), vec2(40, -30), vec2(58, -18), vec2(60, 5), vec2(45, 22), vec2(20, 20),
    vec2(5, 35), vec2(-25, 38), vec2(-50, 25), vec2(-55, 0), vec2(-45, -22), vec2(-25, -30)];
const ROAD = 10;          // road width
const CHECK_R = 10;       // a checkpoint counts within this distance of its waypoint
const LAPS = 3;
const GRID = [vec2(-4, -28), vec2(-4, -32), vec2(-10, -28), vec2(-10, -32)];   // behind the line, facing east

// Tuning (world units per tick at 60 ticks a second)
const MAX_SPEED = .55, GRASS_MAX = .2, ACCEL = .01, BRAKE = .02, REVERSE = .15, DRAG = .99, TURN = .05;
const BOOST_TIME = 1.2, BOOST_FACTOR = 1.4, BOOST_REFILL = 6;   // seconds of boost, speed factor, seconds to refill

const RIVALS = [
    {name: 'race.rival1', color: hsl(0, .75, .55), maxSpeed: .47, offset: -1.5},
    {name: 'race.rival2', color: hsl(.15, .85, .55), maxSpeed: .45, offset: 1.5},
    {name: 'race.rival3', color: hsl(.4, .6, .5), maxSpeed: .43, offset: 0},
];

let state = 'title';       // title | play | over
let trial = false;         // Time Trial: no rivals
let racers = [], player;   // every car; player is racers' last entry
let countdown = 0;         // seconds before GO; the cars wait while > 0
let raceTime = 0;          // seconds since GO
let clock = 0;             // seconds of play (for messages)
let message = null;        // {key, vars, until}: the big centre text
let wrongTimer = 0;        // seconds driving backwards
let boostCharge = 0;       // 0..1, Boost works when full
let place = 0;             // the player's final place

const BEST_KEY = GAME_ID + '.bestlap';
function bestLapSaved() { return readSaveData(BEST_KEY, {time: 0}).time || 0; }

///////////////////////////////////////////////////////////////////////////////
// Helpers

function wrapAngle(a) { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; }
function segDist(p, a, b)
{
    const ab = b.subtract(a), k = clamp(p.subtract(a).dot(ab) / ab.lengthSquared(), 0, 1);
    return p.distance(a.add(ab.scale(k)));
}
function distToTrack(p) { let d = 1e9; TRACK.forEach((a, i)=> d = min(d, segDist(p, a, TRACK[(i + 1) % TRACK.length]))); return d; }
function segDir(i) { const n = TRACK.length; return TRACK[i].subtract(TRACK[(i - 1 + n) % n]).normalize(); }   // into waypoint i
function lapClock(s) { s = max(0, s); return Math.floor(s / 60) + ':' + (s % 60).toFixed(2).padStart(5, '0'); }   // 1:05.32
function ordinal(n) { return n + t(n <= 3 ? 'suffix.' + n : 'suffix.n'); }
function flash(key, seconds, vars) { message = {key, vars, until: clock + seconds}; }

function makeCar(spec, slot)
{
    return {name: spec.name, color: spec.color, maxSpeed: spec.maxSpeed, offset: spec.offset || 0, ai: !!spec.ai,
        pos: GRID[slot].copy(), angle: PI / 2, speed: 0, next: 1, lap: 0, lapStart: 0, best: Infinity,
        finished: false, finishTime: 0, boostTime: 0, onRoad: true};
}

// how far along the race a car is: passed checkpoints plus the share of the current segment
function progress(c)
{
    const n = TRACK.length, prev = TRACK[(c.next - 1 + n) % n], len = prev.distance(TRACK[c.next]);
    return c.lap * n + (c.next - 1 + n) % n + clamp(1 - c.pos.distance(TRACK[c.next]) / len, 0, 1);
}
function standings()
{
    return racers.slice().sort((a, b)=> a.finished !== b.finished ? (a.finished ? -1 : 1) :
        a.finished ? a.finishTime - b.finishTime : progress(b) - progress(a));
}

///////////////////////////////////////////////////////////////////////////////
// Driving: the same physics for every car; the player's inputs come from gameInput(), the rivals' from steerAI()

function drive(c, steer, gas, brake, boost)
{
    c.onRoad = distToTrack(c.pos) <= ROAD / 2;
    if (boost && !c.boostTime) c.boostTime = BOOST_TIME;
    let top = c.maxSpeed * (c.boostTime > 0 ? BOOST_FACTOR : 1);
    if (!c.onRoad) top = min(top, GRASS_MAX);               // grass slows you
    if (gas) c.speed += ACCEL;
    if (brake) c.speed -= c.speed > 0 ? BRAKE : ACCEL * .6; // brake, then reverse
    if (!gas && !brake) c.speed *= DRAG;
    if (c.speed > top) c.speed = max(top, c.speed - .02);
    c.speed = max(c.speed, -REVERSE);
    c.angle = wrapAngle(c.angle + steer * TURN * clamp(c.speed / .2, -1, 1));   // steering needs speed; flips in reverse
    c.pos = c.pos.add(vec2().setAngle(c.angle, c.speed));
    c.boostTime = max(0, c.boostTime - timeDelta);
}

function steerAI(c)
{
    const d = segDir(c.next), target = TRACK[c.next].add(vec2(-d.y, d.x).scale(c.offset));
    const diff = wrapAngle(target.subtract(c.pos).angle() - c.angle);
    const want = c.maxSpeed * (1 - min(abs(diff), 1) * .5);   // slow into sharp turns
    drive(c, clamp(diff * 4, -1, 1), c.speed < want, c.speed > want + .05, false);
}

// checkpoints in order: only TRACK[c.next] counts; reaching TRACK[0] completes a lap
function checkpoints(c)
{
    if (c.pos.distance(TRACK[c.next]) >= CHECK_R) return;
    if (c.next === 0) lapDone(c);
    c.next = (c.next + 1) % TRACK.length;
}

function lapDone(c)
{
    c.best = min(c.best, raceTime - c.lapStart);
    c.lapStart = raceTime;
    if (++c.lap >= LAPS && !c.finished) { c.finished = true; c.finishTime = raceTime; }
    if (c !== player) return;
    zzfx(...[.4,,800,,.05,.15]);
    if (c.finished) return finish();
    if (c.lap === LAPS - 1) flash('race.final_lap', 2);
}

function bump()
{
    for (let i = 0; i < racers.length; ++i)
        for (let j = i + 1; j < racers.length; ++j)
        {
            const a = racers[i], b = racers[j], d = a.pos.subtract(b.pos), l = d.length();
            if (l >= 2 || l === 0) continue;
            const push = d.scale((2 - l) / l / 2);
            a.pos = a.pos.add(push); b.pos = b.pos.subtract(push);
            a.speed *= .97; b.speed *= .97;
        }
}

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> countdown and race -> results (or Game Over when last) -> retry

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    tutorial();
    racers = [];
    showScreen(titleScreen({items: [
        {id: 'title-race', t: 'race.start', onSelect: ()=> start(false)},
        {id: 'title-trial', t: 'race.trial', onSelect: ()=> start(true)},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ]}));
}

function start(timeTrial)
{
    trial = timeTrial;
    racers = trial ? [] : RIVALS.map((r, i)=> makeCar({...r, ai: true}, i));
    player = makeCar({name: 'race.you', color: hsl(.6, .8, .6), maxSpeed: MAX_SPEED}, 3);
    racers.push(player);
    countdown = 3; raceTime = 0; clock = 0; message = null; wrongTimer = 0; boostCharge = 0; place = 0;
    state = 'play';
    kitPlaying = true;
    tutorial();
    hudInit(`
      <div data-slot="tl"><b class="game-num game-big" id="hud-pos"></b></div>
      <div data-slot="tr" class="game-stack" data-align="end">
        <b class="game-num game-big" id="hud-lap"></b>
        <span class="game-num" id="hud-time"></span>
        <span class="game-num game-small" id="hud-best"></span>
      </div>
      <div data-slot="br" class="game-stack" data-align="end">
        <span class="game-num" id="hud-speed"></span>
        <span class="game-bar" id="hud-speedbar" style="width:120px"></span>
        <span class="game-bar" data-kind="energy" id="hud-boost" style="width:120px" data-t-label="action.boost"></span>
      </div>
      <b id="hud-msg" class="game-title game-num" aria-live="polite"
        style="position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);margin:0;white-space:nowrap"></b>`);
    showScreen(document.getElementById('hud'));
}

function finish()
{
    state = 'over';
    tutorial();
    const order = standings(), items = [{t: 'race.retry', onSelect: ()=> start(trial)}, {t: 'gameover.title_screen', onSelect: toTitle}];
    place = order.indexOf(player) + 1;
    zzfx(...[.5,,600,.02,.2,.3,,,5]);
    if (trial)
    {
        const old = bestLapSaved(), record = !old || player.best < old;
        if (record) writeSaveData(BEST_KEY, {time: player.best});
        return results({title: 'race.trial_done', newBest: record, items,
            rows: [['hud.time', lapClock(player.finishTime)], ['race.best', lapClock(player.best)]]});
    }
    if (place === racers.length)   // last: a loss
        return gameOver({title: 'race.last', items,
            detail: t('race.last_detail', {time: lapClock(player.finishTime), best: lapClock(player.best)})});
    const el = results({title: 'race.finished', titleVars: {place: ordinal(place)}, items,
        rows: [['race.place', ordinal(place) + ' / ' + racers.length], ['hud.time', lapClock(player.finishTime)], ['race.best', lapClock(player.best)]]});
    // the position table: place, racer, total time, best lap (yours highlighted). results() has no table option for
    // times (its scores table is points, higher first), so the race table goes into its #res-table slot.
    el.querySelector('#res-table').innerHTML = `<h3 class="game-h">${esc(t('race.standings'))}</h3><ol class="game-scores" id="race-table">${
        order.map((c, i)=> `<li ${c === player ? 'data-new' : ''}><span>${esc(ordinal(i + 1))}</span><span>${esc(t(c.name))}</span>
          <span>${c.finished ? lapClock(c.finishTime) : '—'}</span><span class="game-small">${c.best < Infinity ? lapClock(c.best) : '—'}</span></li>`).join('')}</ol>`;
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'accelerate', 'brake', 'boost']);
    pauseMenu({onQuit: toTitle});
    touchControls({stick: true, buttons: [{action: 'brake', label: 'touch.brake'}, {action: 'boost', label: 'touch.boost'},
        {action: 'accelerate', label: 'touch.gas'}]});
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    if (state !== 'play' || menuOpen()) return;
    if (input.pressed.pause) return openPause();
    clock += timeDelta;

    // countdown: 3 · 2 · 1 · GO, the cars wait
    if (countdown > 0)
    {
        const before = Math.ceil(countdown);
        countdown -= timeDelta;
        if (Math.ceil(countdown) !== before || before === 3 && clock <= timeDelta) zzfx(...[.3,,countdown > 0 ? 400 : 800,,.05,.1]);
        if (countdown <= 0) { flash('race.go', 1); tutorial('race.tip', 'brake'); }
        return;
    }
    raceTime += timeDelta;

    // the player
    boostCharge = min(1, boostCharge + timeDelta / BOOST_REFILL);
    const boost = input.pressed.boost && boostCharge >= 1;
    if (boost) { boostCharge = 0; tutorial(); zzfx(...[.4,,200,.05,.3,.2,,,10]); }
    drive(player, input.moveX, input.held.accelerate, input.held.brake, boost);

    // wrong way: moving against the track for more than a second
    const along = vec2().setAngle(player.angle, player.speed).dot(segDir(player.next));
    wrongTimer = along < -.05 ? wrongTimer + timeDelta : 0;
    if (wrongTimer > 1) flash('race.wrong_way', .3);

    for (const c of racers) if (c.ai) steerAI(c);
    bump();
    for (const c of racers) if (state === 'play') checkpoints(c);
}

function gameUpdatePost()
{
    // camera: the whole track on the title, else follow the car (zoomed out a step in portrait)
    if (state === 'title' || !player)
    {
        cameraPos = vec2(2, 4);
        cameraScale = min(mainCanvasSize.x / 130, mainCanvasSize.y / 90);
    }
    else
    {
        cameraPos = player.pos.add(vec2().setAngle(player.angle, player.speed * 8));
        cameraScale = min(mainCanvasSize.x, mainCanvasSize.y) / (mainCanvasSize.y > mainCanvasSize.x ? 44 : 36);
    }
    if (state !== 'play' && state !== 'over') return;

    const pos = standings().indexOf(player) + 1;
    hudText('hud-pos', trial ? '' : t('hud.position', {n: pos, suffix: t(pos <= 3 ? 'suffix.' + pos : 'suffix.n'), total: racers.length}));
    hudText('hud-lap', t('hud.lap', {n: min(player.lap + 1, LAPS), total: LAPS}));
    hudText('hud-time', lapClock(raceTime));
    const best = trial ? min(player.best, bestLapSaved() || Infinity) : player.best;
    hudText('hud-best', best < Infinity ? t('race.best_lap', {time: lapClock(best)}) : '');
    hudText('hud-speed', t('race.speed', {n: Math.round(abs(player.speed) * 300)}));
    hudBar('hud-speedbar', abs(player.speed), MAX_SPEED * BOOST_FACTOR);
    hudBar('hud-boost', boostCharge);
    const msg = countdown > 0 ? String(Math.ceil(countdown)) : message && clock < message.until ? t(message.key, message.vars) : '';
    hudText('hud-msg', msg);
}

function drawCar(c)
{
    if (c === player) drawRect(c.pos, vec2(2, 3.4), WHITE, c.angle);   // you, outlined
    drawRect(c.pos, vec2(1.6, 3), c.color, c.angle);
    drawRect(c.pos.add(vec2().setAngle(c.angle, .5)), vec2(1.2, .7), hsl(.6, .3, .15), c.angle);   // windscreen
    if (c.boostTime > 0) drawRect(c.pos.add(vec2().setAngle(c.angle, -1.9)), vec2(.8, .8), hsl(.08, 1, .6), c.angle);
}

function gameRender()
{
    drawRect(vec2(2, 4), vec2(400, 300), hsl(.3, .45, .3));                     // grass
    const curb = ROAD + 1.4;
    drawLineList(TRACK, curb, hsl(0, .7, .5), true);                           // curbs
    for (const p of TRACK) drawCircle(p, curb, hsl(0, .7, .5));
    drawLineList(TRACK, ROAD, hsl(0, 0, .28), true);                           // asphalt
    for (const p of TRACK) drawCircle(p, ROAD, hsl(0, 0, .28));
    for (let y = 0; y < ROAD; ++y)                                             // checkered start line at TRACK[0]
        for (let x = 0; x < 2; ++x)
            drawRect(vec2(TRACK[0].x - .5 + x, TRACK[0].y - ROAD / 2 + .5 + y), vec2(1), (x + y) % 2 ? WHITE : BLACK);
    if (player && state !== 'title')   // the next checkpoint, faint
        drawCircle(TRACK[player.next], 1.2, hsl(.15, 1, .6, .5));
    for (const c of racers) drawCar(c);
}

function gameRenderPost()
{
    if (state === 'title' || !player) return;
    // minimap under the position, every racer a dot (you outlined); laid out in screen pixels, drawn in world space
    const size = min(mainCanvasSize.x, mainCanvasSize.y) * .22, s = size / 120, px = 1 / cameraScale;
    const map = (p)=> screenToWorld(vec2(14 + (p.x + 58) * s, 64 + (42 - p.y) * s));
    drawRect(screenToWorld(vec2(14 + size / 2, 64 + 40 * s)), vec2(size, 80 * s).scale(px), hsl(0, 0, 0, .35));
    drawLineList(TRACK.map(map), 3 * px, hsl(0, 0, .8), true);
    for (const c of racers)
    {
        if (c === player) drawCircle(map(c.pos), 10 * px, WHITE);
        drawCircle(map(c.pos), 7 * px, c.color);
    }
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
