/*
    Coin Garden: an idle game (designer card GameIdle).
    Tap the big coin to earn, buy helpers that earn on their own, come back later to collect what they made.
    Reach GOAL coins for the results screen, then keep growing or start over with a bigger bonus (prestige).
    No fail state. Progress autosaves to localStorage '<game-id>.save.auto' every 10 s, on pause and on leaving.
    The canvas draws shapes only (the coin and a garden that grows with the helpers); every word and number is
    the game kit's HTML (js/kit.js): the HUD, the helper list, the welcome-back and results dialogs.

    Add a helper: one entry in PRODUCERS (id, base price, base rate, colour), its 'gen.<id>' text in both
    languages, and a few shapes in drawGarden().
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Coin Garden', 'idle.title': 'Coin Garden', 'hud.rate': '+{rate} / s', 'hud.bonus': 'Bonus ×{mult}',
        'away.title': 'While you were away ({time})', 'away.collect': 'Collect', 'away.earned': 'Coins made',
        'buy.times': '×{n}', 'buy.amount_max': 'Max', 'shop.title': 'Helpers', 'upgrade.afford_in': 'in {time}',
        'upgrade.each': '+{rate} / s each', 'upgrade.level': 'Lv {n}',
        'prestige.confirm': 'Start Over with ×{mult}', 'prestige.panel': 'Coins and helpers reset; total earned stays. Your bonus goes from ×{now} to ×{mult}.',
        'number.million': '{n} M', 'number.billion': '{n} B', 'number.trillion': '{n} T',
        'number.man': '{n}万', 'number.oku': '{n}億', 'number.cho': '{n}兆',
        'time.hm': '{h} h {m} min', 'time.m': '{m} min', 'time.s': '{s} s',
        'idle.goal': 'Garden in Full Bloom', 'idle.keep': 'Keep Growing', 'idle.new_confirm': 'Start a new garden? Your saved garden is lost.',
        'stats.total': 'Total earned', 'stats.taps': 'Taps', 'stats.time': 'Time played', 'stats.bonus': 'Bonus',
        'idle.tut_tap': 'Press {button} or click the coin to earn', 'idle.tut_buy': 'Press {button} to buy your first helper',
        'action.fire': 'Earn', 'action.buy': 'Buy', 'action.buy_amount': 'Buy amount', 'action.move': 'Choose a helper',
        'gen.sprout': 'Sprout', 'gen.bee': 'Bee Hive', 'gen.fountain': 'Fountain', 'gen.windmill': 'Windmill', 'gen.tree': 'Golden Tree'},
    ja: {'game.name': 'コインガーデン', 'idle.title': 'コインガーデン', 'hud.rate': '毎秒 +{rate}', 'hud.bonus': 'ボーナス ×{mult}',
        'away.title': '留守のあいだに（{time}）', 'away.collect': '受け取る', 'away.earned': '増えたコイン',
        'buy.times': '×{n}', 'buy.amount_max': '最大', 'shop.title': 'おてつだい', 'upgrade.afford_in': 'あと {time}',
        'upgrade.each': '1つ 毎秒 +{rate}', 'upgrade.level': 'Lv {n}',
        'prestige.confirm': '×{mult} でやり直す', 'prestige.panel': 'コインとおてつだいはリセット、累計は残ります。ボーナスが ×{now} から ×{mult} になります。',
        'number.million': '{n}百万', 'number.billion': '{n}十億', 'number.trillion': '{n}兆',
        'number.man': '{n}万', 'number.oku': '{n}億', 'number.cho': '{n}兆',
        'time.hm': '{h}時間{m}分', 'time.m': '{m}分', 'time.s': '{s}秒',
        'idle.goal': '満開の庭', 'idle.keep': 'さらに育てる', 'idle.new_confirm': '新しい庭をはじめますか？ セーブした庭は消えます。',
        'stats.total': '累計コイン', 'stats.taps': 'タップ数', 'stats.time': 'プレイ時間', 'stats.bonus': 'ボーナス',
        'idle.tut_tap': '{button} かコインをクリックして稼ごう', 'idle.tut_buy': '{button} で最初のおてつだいを買おう',
        'action.fire': '稼ぐ', 'action.buy': '買う', 'action.buy_amount': '買う数', 'action.move': 'おてつだいを選ぶ',
        'gen.sprout': '芽', 'gen.bee': 'ミツバチの巣', 'gen.fountain': '噴水', 'gen.windmill': '風車', 'gen.tree': '金のなる木'},
};

// gaming-core's own actions plus the genre's; `fire` is the primary action (Earn), so it gets Space and South
const GAME_ACTIONS = {
    fire: ['key:Space', 'key:KeyX', 'mouse:0', 'pad:0'],
    buy: ['key:Enter', 'pad:2'],
    buy_amount: ['key:Tab', 'pad:4', 'pad:5'],
};

// the helpers: price grows ×GROWTH per one owned; rate is coins per second each
const PRODUCERS = [
    {id: 'sprout', price: 10, rate: .5, hue: .3},
    {id: 'bee', price: 100, rate: 4, hue: .14},
    {id: 'fountain', price: 1100, rate: 30, hue: .55},
    {id: 'windmill', price: 12000, rate: 260, hue: .07},
    {id: 'tree', price: 130000, rate: 2000, hue: .12},
];
const GROWTH = 1.15;
const BUY_MODES = [1, 10, 100, 'max'];
const GOAL = 1e6;               // coins for the results screen (and prestige)
const AUTOSAVE = 10;            // seconds between autosaves
const OFFLINE_CAP = 8 * 3600;   // offline progress counts at most 8 hours
const OFFLINE_SHARE = .5;       // helpers make half while you are away
const SCENE = vec2(20, 20);     // world units; the camera fits it next to the helper list
const COIN = vec2(0, 2), COIN_R = 3;

let state = 'title';            // title | play | away | done
let coins = 0, total = 0, taps = 0, played = 0, mult = 1, goalDone = false, tutStep = 0;
let owned = PRODUCERS.map(()=> 0);
let selected = 0, buyMode = 0, lastDir = 0;
let saveTimer = 0, wasPaused = false, playStartTick = -1, squash = 0;
let sceneArea = null;           // the canvas rectangle left for the garden (css px)

///////////////////////////////////////////////////////////////////////////////
// Numbers: prices, rates and short-scale coins

function rate() { return PRODUCERS.reduce((sum, p, i)=> sum + p.rate * owned[i], 0) * mult; }
function tapValue() { return mult; }
function cost(i, n = 1) { const p = PRODUCERS[i]; return Math.ceil(p.price * GROWTH ** owned[i] * (GROWTH ** n - 1) / (GROWTH - 1)); }
function maxAffordable(i) { const first = PRODUCERS[i].price * GROWTH ** owned[i]; return Math.max(0, Math.floor(Math.log(coins * (GROWTH - 1) / first + 1) / Math.log(GROWTH))); }
function buyCount(i) { const mode = BUY_MODES[buyMode]; return mode === 'max' ? Math.max(1, maxAffordable(i)) : mode; }

// grouping below a million, then the short scale: 1.25 M (English), 125万 (Japanese); never 15+ digits
function fmtBig(n)
{
    n = Math.floor(n);
    const short = (v)=> v.toLocaleString(settings.lang, {maximumFractionDigits: 2});
    if (n < 1e6) return fmt(n);
    if (settings.lang === 'ja') return n >= 1e12 ? t('number.cho', {n: short(n / 1e12)}) : n >= 1e8 ? t('number.oku', {n: short(n / 1e8)}) : t('number.man', {n: fmt(Math.floor(n / 1e4))});
    return n >= 1e12 ? t('number.trillion', {n: short(n / 1e12)}) : n >= 1e9 ? t('number.billion', {n: short(n / 1e9)}) : t('number.million', {n: short(n / 1e6)});
}
function fmtRate(r) { return r < 1e6 ? r.toLocaleString(settings.lang, {maximumFractionDigits: 1}) : fmtBig(r); }
function fmtDuration(seconds)
{
    seconds = Math.max(0, Math.floor(seconds));
    const h = Math.floor(seconds / 3600), m = Math.floor(seconds / 60) % 60;
    return h ? t('time.hm', {h, m}) : m ? t('time.m', {m}) : t('time.s', {s: seconds});
}

///////////////////////////////////////////////////////////////////////////////
// Save: one autosave slot through the kit's saveWrite/saveRead ('<game-id>.save.auto')

function saveGame() { return saveWrite('auto', {coins, total, taps, played, mult, goalDone, tutStep, owned}, 'idle.title'); }
function hasSave() { const value = saveRead('auto'); return !!value && !value.broken; }

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> play (welcome back first when away) -> goal results -> keep growing or prestige

function toTitle()
{
    if (state === 'play') saveGame();
    state = 'title';
    kitPlaying = false;
    tutorial();
    const saved = hasSave();
    showScreen(titleScreen({items: [
        {id: 'title-start', t: saved ? 'title.continue' : 'title.new', onSelect: saved ? continueGame : newGame},
        ...(saved ? [{id: 'title-new', t: 'title.new', onSelect: ()=> confirmDialog('idle.new_confirm', 'title.new', newGame)}] : []),
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ]}));
}

function newGame()
{
    coins = total = taps = played = 0; mult = 1; goalDone = false; tutStep = 0;
    owned = PRODUCERS.map(()=> 0);
    startPlay();
    tutorial('idle.tut_tap', 'fire');
    saveGame();
}

// the saved garden, plus what the helpers made while away (capped), shown in a welcome-back dialog
function continueGame()
{
    const value = saveRead('auto');
    if (!value || value.broken) return newGame();
    const s = value.state;
    coins = s.coins; total = s.total; taps = s.taps; played = s.played; mult = s.mult; goalDone = s.goalDone; tutStep = s.tutStep;
    owned = PRODUCERS.map((p, i)=> s.owned[i] || 0);
    startPlay();
    const away = Math.min(OFFLINE_CAP, (Date.now() - Date.parse(value.savedAt)) / 1000);
    const gain = Math.floor(rate() * away * OFFLINE_SHARE);
    if (away < 10 || gain < 1) return;
    state = 'away';
    results({title: 'away.title', titleVars: {time: fmtDuration(away)}, rows: [['away.earned', '+' + fmtBig(gain)]],
        items: [{id: 'away-collect', t: 'away.collect', onSelect: ()=> { coins += gain; total += gain; resumePlay(); saveGame(); }}]});
}

function startPlay()
{
    selected = 0; saveTimer = 0;
    hudInit(HUD_HTML);
    buildShop();
    showScreen(document.getElementById('hud'));
    resumePlay();
}

// back to the garden from a dialog: the world runs, the keys belong to the game (not the helper buttons)
function resumePlay()
{
    const dialog = document.getElementById('results');
    if (dialog && !dialog.hidden) closeScreen(dialog);
    state = 'play';
    kitPlaying = true;
    playStartTick = gcInput.tick;   // the press that closed the dialog is not a tap
    gameBox.focus({preventScroll: true});
}

function reachGoal()
{
    goalDone = true;
    state = 'done';
    tutorial();
    saveGame();
    zzfx(...[.4,,600,.02,.2,.3,,,,,200,.05]);
    const el = results({title: 'idle.goal', rows: [['stats.total', fmt(Math.floor(total))], ['stats.taps', fmt(taps)],
        ['stats.time', fmtDuration(played)], ['stats.bonus', '×' + mult]], items: [
        {id: 'goal-keep', t: 'idle.keep', onSelect: resumePlay},           // the default: prestige never is
        {id: 'goal-prestige', t: 'prestige.confirm', onSelect: askPrestige},
        {id: 'goal-title', t: 'gameover.title_screen', onSelect: ()=> { state = 'play'; toTitle(); }},
    ]});
    withVars(el.querySelector('#goal-prestige'), 'prestige.confirm', {mult: mult + 1});
}

function askPrestige()
{
    const el = confirmDialog('prestige.panel', 'prestige.confirm', prestige, {now: mult, mult: mult + 1});
    const ok = el.querySelector('#confirm-ok');
    withVars(ok, 'prestige.confirm', {mult: mult + 1});
    ok.style.background = 'var(--g-bad)';   // destructive; Cancel stays focused
}

function prestige()
{
    mult += 1; coins = 0; goalDone = false;
    owned = PRODUCERS.map(()=> 0);
    buildShop();
    resumePlay();
    saveGame();
}

// a kit text with {vars} on a button the kit made from a key (it keeps them on a language change)
function withVars(el, key, vars) { el.dataset.tVars = JSON.stringify(vars); el.textContent = t(key, vars); }

///////////////////////////////////////////////////////////////////////////////
// HUD and the helper list (ShopScreen layout): HTML buttons the mouse clicks; keys and pad go through actions

const HUD_HTML = `
<style>
  #idle-top { position: absolute; top: 12px; left: 12px; right: 12px; display: grid; justify-items: center; gap: 4px; text-align: center; }
  #shop { position: absolute; pointer-events: auto; display: grid; gap: 6px; align-content: start; overflow: auto; text-shadow: none; }
  #shop-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .idle-row, #shop-amount { font: inherit; color: var(--g-text); background: transparent; border: 0; cursor: pointer; text-align: left; }
  .idle-row { display: grid; grid-template-columns: 16px 1fr auto; gap: 4px 10px; align-items: center; min-height: 48px; padding: 4px 8px; width: 100%; }
  .idle-row[aria-current="true"] { background: color-mix(in srgb, var(--g-accent) 22%, transparent); box-shadow: inset var(--g-px) 0 0 var(--g-accent); }
  .idle-row:hover { background: color-mix(in srgb, var(--g-accent) 14%, transparent); }
  .idle-row .idle-price { color: var(--g-dim); grid-column: 3; grid-row: 1 / 3; text-align: right; }
  .idle-row[data-afford] .idle-price { color: var(--g-accent); }
  .idle-row .idle-icon { width: 16px; height: 16px; grid-row: 1 / 3; box-shadow: 0 0 0 2px var(--g-ink); }
  #shop-amount { padding: 4px 10px; color: var(--g-ink); background: var(--g-accent); box-shadow: 0 0 0 2px var(--g-ink); }
  .idle-pop { position: absolute; pointer-events: none; color: var(--g-accent); font-size: 18px; animation: idle-up .8s ease-out forwards; }
  .idle-pop.still { animation-name: idle-fade; }
  @keyframes idle-up { to { transform: translateY(-48px); opacity: 0; } }
  @keyframes idle-fade { to { opacity: 0; } }
  @media (orientation: landscape) { #idle-top { right: calc(min(40%, 420px) + 24px); } #shop { top: 12px; right: 12px; bottom: 12px; width: min(40%, 420px); }
    #tutorial { left: calc((100% - min(40%, 420px)) / 2); max-width: 55%; } }
  @media (orientation: portrait) { #shop { left: 8px; right: 8px; bottom: 8px; max-height: 46%; } #tutorial { bottom: 50%; } }
</style>
<div id="idle-top">
  <b class="game-num game-big" id="hud-coins" aria-live="off"></b>
  <span class="game-num" id="hud-rate"></span>
  <span class="game-small" id="hud-bonus"></span>
</div>
<div id="shop" class="game-panel" aria-labelledby="shop-title">
  <div id="shop-head"><h2 id="shop-title" class="game-h" data-t="shop.title"></h2><button id="shop-amount" tabindex="-1" data-t-label="action.buy_amount"></button></div>
  <div id="shop-rows"></div>
</div>`;

function buildShop()
{
    const rows = document.getElementById('shop-rows');
    if (!rows) return;
    rows.innerHTML = PRODUCERS.map((p, i)=> `
      <button class="idle-row" id="shop-row-${i}" data-i="${i}" tabindex="-1">
        <span class="idle-icon" style="background:hsl(${p.hue * 360} 65% 55%)"></span>
        <span><b data-t="gen.${p.id}">${esc(t('gen.' + p.id))}</b> <span class="game-small game-num" id="shop-lv-${i}"></span></span>
        <span class="idle-price game-num" id="shop-price-${i}"></span>
        <span class="game-small game-num" id="shop-each-${i}"></span>
      </button>`).join('');
    const keepFocus = (b)=> b.addEventListener('mousedown', (e)=> e.preventDefault()); // clicks never take the keys
    for (const b of rows.querySelectorAll('.idle-row'))
    {
        keepFocus(b);
        b.addEventListener('click', ()=> { if (state !== 'play' || menuOpen()) return; selected = +b.dataset.i; buy(selected); });
    }
    const amount = document.getElementById('shop-amount');
    keepFocus(amount);
    amount.addEventListener('click', ()=> { if (state === 'play' && !menuOpen()) buyMode = (buyMode + 1) % BUY_MODES.length; });
    for (const key in rowCache) delete rowCache[key];
}

// buy the chosen amount of helper i when affordable; true when bought
function buy(i)
{
    const n = buyCount(i), price = cost(i, n);
    if (price > coins) return false;
    coins -= price;
    owned[i] += n;
    zzfx(...[.3,,500,.01,.05,.1]);
    if (tutStep < 3) { tutStep = 3; tutorial(); }
    return true;
}

function earn()
{
    const value = tapValue();
    coins += value; total += value; taps++;
    squash = 1;
    zzfx(...[.15,,900,,.01,.02]);
    pop('+' + fmtBig(value));
    if (tutStep === 0 && taps >= 3) { tutStep = 1; tutorial(); }
}

// a +amount that drifts up from the coin (a fade only with reduced motion); HTML, not canvas text
function pop(text)
{
    const hud = document.getElementById('hud');
    if (!hud || hud.querySelectorAll('.idle-pop').length > 12) return;
    const p = worldToScreen(COIN.add(vec2(rand(-1.5, 1.5), COIN_R)));
    const el = h(`<span class="idle-pop game-num${kitReduceMotion() ? ' still' : ''}" aria-hidden="true" style="left:${p.x}px;top:${p.y}px">${esc(text)}</span>`);
    hud.appendChild(el);
    kitAfter(.8, ()=> el.remove());
}

const rowCache = {};
function rowState(i, afford, current)
{
    const key = (afford ? 'a' : '') + (current ? 'c' : '');
    if (rowCache[i] === key) return;
    rowCache[i] = key;
    const row = document.getElementById('shop-row-' + i);
    if (!row) return;
    afford ? row.dataset.afford = '' : delete row.dataset.afford;
    row.setAttribute('aria-current', current);
    const shop = document.getElementById('shop');   // keep the chosen row in view inside the scrolling list
    if (current && row.offsetTop < shop.scrollTop) shop.scrollTop = row.offsetTop;
    else if (current && row.offsetTop + row.offsetHeight > shop.scrollTop + shop.clientHeight) shop.scrollTop = row.offsetTop + row.offsetHeight - shop.clientHeight;
}

function hudUpdate()
{
    const r = rate();
    hudText('hud-coins', fmtBig(coins));
    hudText('hud-rate', t('hud.rate', {rate: fmtRate(r)}));
    hudText('hud-bonus', mult > 1 ? t('hud.bonus', {mult}) : '');
    const mode = BUY_MODES[buyMode];
    hudText('shop-amount', mode === 'max' ? t('buy.amount_max') : t('buy.times', {n: mode}));
    PRODUCERS.forEach((p, i)=>
    {
        const n = buyCount(i), price = cost(i, n), afford = price <= coins;
        hudText('shop-lv-' + i, t('upgrade.level', {n: owned[i]}));
        hudText('shop-each-' + i, t('upgrade.each', {rate: fmtRate(p.rate * mult)}));
        // affordable: the price; otherwise the price and how long until the helpers earn it
        hudText('shop-price-' + i, fmtBig(price) + (afford || !r ? '' : ' · ' + t('upgrade.afford_in', {time: fmtDuration((price - coins) / r)})));
        rowState(i, afford, i === selected);
    });
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['fire', 'buy', 'buy_amount', 'move']);
    pauseMenu({onQuit: toTitle});
    touchControls({stick: false, buttons: []});   // the coin and the list are tapped directly; this adds the pause button
    hasSave() ? continueGame() : toTitle();          // the title is skipped after the first visit
}

function gameUpdate()
{
    const input = gameInput();
    if (state !== 'play' || menuOpen()) return;
    if (input.pressed.pause) { saveGame(); return openPause(); }
    // keys belong to the game while it runs: no helper button keeps focus, Space and Tab do not reach the page
    setInputPreventDefault(true);
    if (document.activeElement !== gameBox && document.getElementById('hud').contains(document.activeElement)) gameBox.focus({preventScroll: true});
    if (gcInput.tick === playStartTick) return;

    // earn: Space / South anywhere, the mouse on the coin
    if (input.pressed.fire && (input.device !== 'mouse' || input.mouse.pos.distance(COIN) < COIN_R)) earn();

    // choose a row (up/down, d-pad), cycle the amount (Tab, shoulders), buy (Enter, West)
    const dir = input.moveY > .5 ? -1 : input.moveY < -.5 ? 1 : 0;
    if (dir && dir !== lastDir) selected = (selected + dir + PRODUCERS.length) % PRODUCERS.length;
    lastDir = dir;
    if (input.pressed.buy_amount) buyMode = (buyMode + 1) % BUY_MODES.length;
    if (input.pressed.buy) buy(selected);

    // the helpers earn every tick
    const gain = rate() * timeDelta;
    coins += gain; total += gain; played += timeDelta;
    squash = Math.max(0, squash - timeDelta * 6);
    if (tutStep === 1 && owned[0] === 0 && coins >= cost(0)) { tutStep = 2; tutorial('idle.tut_buy', 'buy'); }
    if ((saveTimer += timeDelta) >= AUTOSAVE) { saveTimer = 0; saveGame(); }
    if (!goalDone && coins >= GOAL) reachGoal();
}

function gameUpdatePost()
{
    // a pause from anywhere (Esc, blur, the touch button) saves
    if (paused && !wasPaused && state === 'play') saveGame();
    wasPaused = paused;

    // fit the garden into the part of the window the helper list leaves (right on landscape, top on portrait)
    const W = mainCanvasSize.x, H = mainCanvasSize.y;
    let area = {x: 0, y: 0, w: W, h: H};
    const shop = state !== 'title' && document.getElementById('shop');
    if (shop)
    {
        const r = shop.getBoundingClientRect(), c = mainCanvas.getBoundingClientRect();
        if (r.width) sceneArea = r.left - c.left > c.width * .35 ? {x: 0, y: 70, w: r.left - c.left, h: c.height - 70} : {x: 0, y: 70, w: c.width, h: r.top - c.top - 70};
        if (sceneArea) area = sceneArea;
    }
    cameraScale = Math.max(1, Math.min(area.w / SCENE.x, area.h / SCENE.y));
    cameraPos = vec2((W / 2 - (area.x + area.w / 2)) / cameraScale, (area.y + area.h / 2 - H / 2) / cameraScale);
    if (state !== 'title') hudUpdate();
}

function gameRender()
{
    drawRect(vec2(), vec2(400, 400), hsl(.55, .45, .2));                 // sky
    drawRect(vec2(0, -29), vec2(400, 44), hsl(.3, .45, .3));             // meadow
    drawGarden();
    // the coin: a squash on each tap, a bob on the title
    const s = 1 + squash * .15, bob = state === 'title' ? Math.sin(time * 2) * .3 : 0;
    const pos = COIN.add(vec2(0, bob));
    drawEllipse(pos, vec2(COIN_R * 2 * s, COIN_R * 2 / s), hsl(.12, .85, .55), 0, .3, hsl(.09, .8, .3));
    drawEllipse(pos, vec2(COIN_R * 1.3 * s, COIN_R * 1.3 / s), hsl(.13, .9, .65));
    drawRect(pos, vec2(.7, 2.6 / s), hsl(.1, .8, .45));
}

// the garden grows with the helpers (counts capped so it stays readable)
function drawGarden()
{
    for (let i = 0; i < Math.min(owned[0], 24); ++i)                     // sprouts along the meadow
    {
        const x = -9.5 + (i % 12) * 1.7 + (i >= 12 ? .85 : 0), y = -7 - (i >= 12 ? .6 : 0);
        drawLine(vec2(x, y), vec2(x, y + .9), .15, hsl(.3, .6, .45));
        drawEllipse(vec2(x + .25, y + .9), vec2(.35, .18), hsl(.3, .7, .55), .4);
    }
    for (let i = 0; i < Math.min(owned[2], 6); ++i)                      // fountains
    {
        const x = -8 + i * 3.2, k = (time * 2 + i) % 1;
        drawRect(vec2(x, -6.6), vec2(1.4, .6), hsl(0, 0, .7));
        drawCircle(vec2(x, -6.2 + Math.sin(k * Math.PI) * 1.5), .3, hsl(.55, .8, .7));
    }
    for (let i = 0; i < Math.min(owned[3], 4); ++i)                      // windmills turning
    {
        const base = vec2([-8, 8, -3.2, 3.2][i], i < 2 ? -2 : -3.4);
        drawLine(base, vec2(base.x, -7), .3, hsl(.08, .3, .55));
        for (let b = 0; b < 4; ++b) drawLine(base, base.add(vec2().setAngle(time * 2 + b * Math.PI / 2, 1.6)), .25, hsl(0, 0, .9));
    }
    for (let i = 0; i < Math.min(owned[4], 3); ++i)                      // golden trees
    {
        const x = [-5.8, 5.8, 0][i], y = i === 2 ? 7.2 : -5.2;
        drawRect(vec2(x, y - 1), vec2(.5, 1.6), hsl(.08, .5, .3));
        drawCircle(vec2(x, y + .5), 2.2, hsl(.13, .8, .5));
    }
    for (let i = 0; i < Math.min(owned[1], 16); ++i)                     // bees around the coin
    {
        const a = time * (1 + i % 3 * .3) + i * 2.4, r = COIN_R + 1 + (i % 4) * .4;
        drawCircle(COIN.add(vec2(Math.cos(a) * r, Math.sin(a) * r * .7)), .35, hsl(.14, .9, .55));
    }
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
