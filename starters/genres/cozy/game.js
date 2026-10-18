/*
    Sunny Acre: a cozy farming starter (designer card GameCozy).
    A small grid farm: walk, pick a tool (hoe, seeds, watering can, hands), use it on the tile in front,
    water turnips each day, sleep, harvest, sell at the bin, talk to Mabel next door. Earn GOAL coins.
    Nothing fails: the day ends at the bed or at 24:00 with a "End of Day" summary and an autosave next morning.
    The canvas draws shapes only; every word and number is the game kit's HTML (js/kit.js).

    Extend it: a new crop is an entry in CROPS (price, nights to ripen, colours); a new tool is an entry in TOOLS
    with a case in useTool(); a new villager is an object in OBJECTS with kind 'npc' and its lines in talk().
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Sunny Acre', 'cozy.title': 'Sunny Acre',
        'hud.season_day': '{season} {day}', 'season.spring': 'Spring', 'season.summer': 'Summer', 'season.fall': 'Fall', 'season.winter': 'Winter',
        'hud.money': '{amount} g', 'hud.energy': 'Energy',
        'tool.hoe': 'Hoe', 'tool.seeds': 'Turnip Seeds', 'tool.can': 'Watering Can', 'tool.hands': 'Hands',
        'summary.title': 'End of Day {day}', 'summary.shipped': 'Shipped', 'summary.earned': 'Earned', 'summary.money': 'Money',
        'cozy.goal': 'Goal', 'cozy.goal_value': '{amount} / {goal} g', 'cozy.crops': 'Turnips: {n}',
        'cozy.next_day': 'Next Morning', 'cozy.goal_title': 'Farm Goal Reached', 'cozy.days': 'Days',
        'cozy.shipped_total': 'Turnips shipped', 'cozy.keep': 'Keep Farming',
        'cozy.continue_detail': '{date} · {money}', 'cozy.place': 'Sunny Acre farm',
        'cozy.new_confirm': 'Start a new farm? The autosave is replaced.',
        'cozy.sleep_confirm': 'Go to bed and end the day?', 'cozy.sleep': 'Sleep',
        'cozy.npc': 'Mabel', 'cozy.npc_hello': 'Morning, neighbour! The soil is soft this spring.',
        'cozy.npc_tip': 'Till with the hoe, plant, water every day and sleep. Turnips ripen in three nights.',
        'cozy.npc_ask': 'Need anything?', 'cozy.ask_seeds': 'Any seeds to spare?', 'cozy.bye': 'Just saying hi',
        'cozy.msg_seeds': 'Mabel gave you {n} seeds', 'cozy.msg_no_gift': 'Mabel already shared seeds today',
        'cozy.msg_tired': 'Too tired. Go to bed.', 'cozy.msg_sold': 'Sold {n} for {amount} g', 'cozy.msg_nothing': 'Nothing to sell',
        'cozy.msg_no_seeds': 'No seeds left. Ask Mabel.', 'cozy.msg_harvest': 'Harvested a turnip', 'cozy.msg_saved': 'Autosaved',
        'cozy.tip_use': 'Press {button} to use the tool on the tile in front',
        'action.fire': 'Use Tool', 'action.use': 'Use', 'action.interact': 'Talk / Harvest', 'action.talk': 'Talk',
        'action.tool_next': 'Next Tool', 'action.tool_prev': 'Previous Tool', 'action.tool': 'Tool'},
    ja: {'game.name': 'ひだまり農園', 'cozy.title': 'ひだまり農園',
        'hud.season_day': '{season} {day}日', 'season.spring': '春', 'season.summer': '夏', 'season.fall': '秋', 'season.winter': '冬',
        'hud.money': '{amount} G', 'hud.energy': 'たいりょく',
        'tool.hoe': 'くわ', 'tool.seeds': 'カブのたね', 'tool.can': 'じょうろ', 'tool.hands': 'て',
        'summary.title': '{day}日目のおわり', 'summary.shipped': '出荷', 'summary.earned': '売上', 'summary.money': '所持金',
        'cozy.goal': '目標', 'cozy.goal_value': '{amount} / {goal} G', 'cozy.crops': 'カブ: {n}',
        'cozy.next_day': '次の朝へ', 'cozy.goal_title': '農園の目標達成', 'cozy.days': '日数',
        'cozy.shipped_total': '出荷したカブ', 'cozy.keep': '農園を続ける',
        'cozy.continue_detail': '{date}・{money}', 'cozy.place': 'ひだまり農園',
        'cozy.new_confirm': '新しい農園をはじめますか？オートセーブは上書きされます。',
        'cozy.sleep_confirm': 'ベッドで休んで一日を終えますか？', 'cozy.sleep': 'ねる',
        'cozy.npc': 'メイベル', 'cozy.npc_hello': 'おはよう、おとなりさん！今年の春は土がやわらかいね。',
        'cozy.npc_tip': 'くわで耕して、たねをまいて、毎日水をやって、ねる。カブは三晩で実るよ。',
        'cozy.npc_ask': 'なにか用かい？', 'cozy.ask_seeds': 'たねを分けてもらえる？', 'cozy.bye': 'あいさつに来ただけ',
        'cozy.msg_seeds': 'メイベルからたねを{n}つもらった', 'cozy.msg_no_gift': '今日はもうたねをもらった',
        'cozy.msg_tired': 'つかれた。ベッドで休もう。', 'cozy.msg_sold': '{n}こを{amount} Gで売った', 'cozy.msg_nothing': '売るものがない',
        'cozy.msg_no_seeds': 'たねがない。メイベルに聞いてみよう。', 'cozy.msg_harvest': 'カブを収穫した', 'cozy.msg_saved': 'オートセーブしました',
        'cozy.tip_use': '{button} で前のマスに道具を使う',
        'action.fire': '道具を使う', 'action.use': '使う', 'action.interact': '話す・収穫', 'action.talk': '話す',
        'action.tool_next': '次の道具', 'action.tool_prev': '前の道具', 'action.tool': '道具'},
};

// gaming-core's own actions: moveX/moveY, jump, fire (here: use the tool; C added as the card asks), confirm, back, pause
const GAME_ACTIONS = {
    fire: ['key:KeyC', 'key:KeyX', 'key:KeyJ', 'mouse:0', 'pad:2', 'pad:7'],
    interact: ['key:KeyE', 'key:KeyF', 'pad:0'],
    tool_next: ['key:KeyR', 'pad:5'],
    tool_prev: ['key:KeyQ', 'pad:4'],
    tool_1: ['key:Digit1'], tool_2: ['key:Digit2'], tool_3: ['key:Digit3'], tool_4: ['key:Digit4'],
};

///////////////////////////////////////////////////////////////////////////////
// The farm: a W x H grid, y up; tile (x, y) is drawn at tilePos(x, y)

const W = 16, H = 10, FIELD = vec2(W, H);
const PLOT = {x0: 4, y0: 1, x1: 11, y1: 5};       // the tillable field, inclusive
const GOAL = 500;                                // coins to reach the farm goal
const MINUTE_SECONDS = .7;                       // one in-game minute in real seconds (card: 6:00 to 24:00)
const DAY_START = 6 * 60, DAY_END = 24 * 60;
const ENERGY_MAX = 100, TOOL_COST = 2;
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const CROPS = {turnip: {price: 30, nights: 3, ripe: hsl(.85, .35, .85), leaf: hsl(.3, .6, .4)}};
const TOOLS = ['hoe', 'seeds', 'can', 'hands'];
const HANDS = 3;
// things that stand on tiles and block walking; interact() acts on them
const OBJECTS = [
    {kind: 'bed', x: 1, y: 6}, {kind: 'bin', x: 14, y: 6}, {kind: 'npc', x: 13, y: 7},
    ...[0, 1, 2].flatMap(x=> [7, 8, 9].map(y=> ({kind: 'house', x, y}))),
];

let state = 'title';           // title | play | night | goal
let day, minutes, coins, energy, seeds, crops, tool, giftDay, goalReached;
let shippedToday, earnedToday, shippedTotal;
let tiles = [];                // tiles[y * W + x] = {till: 0|1, wet: 0|1, crop: -1 (none) .. 3 (ripe)}
let player = {x: 4, y: 6, face: vec2(0, -1), draw: vec2()};
let moveTimer = 0;
let message = {key: '', vars: null, until: 0};   // the short line in the HUD (top centre)
let hudTool = -1;

function tilePos(x, y) { return vec2(x - W / 2 + .5, y - H / 2 + .5); }
function inPlot(x, y) { return x >= PLOT.x0 && x <= PLOT.x1 && y >= PLOT.y0 && y <= PLOT.y1; }
function tileAt(x, y) { return x >= 0 && y >= 0 && x < W && y < H ? tiles[y * W + x] : null; }
function objectAt(x, y) { return OBJECTS.find(o=> o.x === x && o.y === y); }
function front() { return {x: player.x + player.face.x, y: player.y + player.face.y}; }
function say(key, vars) { message = {key, vars, until: timeReal + 2.5}; }
function dateText() { return t('hud.season_day', {season: t('season.' + SEASONS[floor((day - 1) / 28) % 4]), day: (day - 1) % 28 + 1}); }

function newFarm()
{
    tiles = Array.from({length: W * H}, ()=> ({till: 0, wet: 0, crop: -1}));
    day = 1; minutes = DAY_START; coins = 0; energy = ENERGY_MAX; seeds = 10; crops = 0; tool = 0;
    giftDay = 0; goalReached = false; shippedToday = earnedToday = shippedTotal = 0;
    player = {x: 4, y: 6, face: vec2(0, -1), draw: tilePos(4, 6)};
}

///////////////////////////////////////////////////////////////////////////////
// Save: one autosave each morning through the kit ('<game-id>.save.auto'); Continue loads it

function getState()
{
    return {day, coins, seeds, crops, tool, giftDay, goalReached, shippedTotal, energy,
        player: {x: player.x, y: player.y, fx: player.face.x, fy: player.face.y}, tiles: tiles.map(c=> [c.till, c.wet, c.crop])};
}
function applyState(s)
{
    newFarm();
    ({day, coins, seeds, crops, tool, giftDay, goalReached, shippedTotal, energy} = s);
    tiles = s.tiles.map(([till, wet, crop])=> ({till, wet, crop}));
    player = {x: s.player.x, y: s.player.y, face: vec2(s.player.fx, s.player.fy), draw: tilePos(s.player.x, s.player.y)};
    minutes = DAY_START;
}
function autosave() { if (saveWrite('auto', getState(), 'cozy.place')) say('cozy.msg_saved'); }
function autosaveState() { const value = saveRead('auto'); return value && !value.broken ? value.state : null; }

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> play (a day) -> night summary -> next morning (autosave) ... -> goal results -> keep farming

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    tutorial();
    const saved = autosaveState();
    if (!saved) newFarm();
    const items = [];
    if (saved) items.push({id: 'title-continue', t: 'title.continue', onSelect: continueGame});
    items.push({id: 'title-new', t: 'title.new', onSelect: ()=> saved ? confirmDialog('cozy.new_confirm', 'title.new', newGame) : newGame()},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings});
    let detail = '';
    if (saved) { applyState(saved); detail = t('cozy.continue_detail', {date: dateText(), money: t('hud.money', {amount: fmt(coins)})}); }
    showScreen(titleScreen({items, detail}));
}

function showHud()
{
    const icon = {
        hoe: '<path d="M3 14L11 4" stroke="#b58a52" stroke-width="2"/><path d="M9 2h5v4h-2z" fill="#cfd6dc"/>',
        seeds: '<ellipse cx="5" cy="9" rx="2" ry="3" fill="#d9b779"/><ellipse cx="11" cy="7" rx="2" ry="3" fill="#c79a52"/><ellipse cx="9" cy="12" rx="2" ry="2.5" fill="#e6c98f"/>',
        can: '<rect x="3" y="6" width="8" height="7" fill="#7fa7c9"/><path d="M11 8l4-3" stroke="#7fa7c9" stroke-width="2"/><path d="M4 6a3 3 0 0 1 6 0" stroke="#55708a" stroke-width="1.5" fill="none"/>',
        hands: '<circle cx="8" cy="10" r="4" fill="#f0c49a"/><rect x="4" y="3" width="2" height="6" fill="#f0c49a"/><rect x="7" y="2" width="2" height="6" fill="#f0c49a"/><rect x="10" y="3" width="2" height="6" fill="#f0c49a"/>',
    };
    const slots = TOOLS.map((id, i)=> `<span class="game-slot" id="hot-${i}" data-i="${i}" role="gridcell" aria-selected="${i === tool}" data-t-label="tool.${id}">
        <svg viewBox="0 0 16 16" width="32" height="32" aria-hidden="true">${icon[id]}</svg>${id === 'seeds' ? '<span class="game-count" id="hud-seeds"></span>' : ''}</span>`).join('');
    hudInit(`
      <div data-slot="tl" class="game-panel game-stack" style="padding:8px 10px;justify-self:start">
        <span class="game-small" data-t="cozy.goal"></span>
        <b class="game-num" id="hud-goal"></b>
        <span class="game-small game-num" id="hud-crops"></span>
      </div>
      <div data-slot="tc"><span id="hud-msg" class="game-objective" role="status" hidden></span></div>
      <div data-slot="tr" class="game-panel game-stack" data-align="end" style="padding:8px 10px">
        <span id="hud-day"></span>
        <b class="game-num game-big" id="hud-time"></b>
        <span class="game-row"><span class="game-icon" data-kind="coin" aria-hidden="true"></span><b class="game-num" id="hud-money"></b></span>
      </div>
      <div data-slot="bl" class="game-stack" role="meter" aria-valuemin="0" aria-valuemax="${ENERGY_MAX}" data-t-label="hud.energy">
        <span class="game-small" data-t="hud.energy"></span><span class="game-bar" id="hud-energy"></span>
      </div>
      <div data-slot="bc" class="game-stack" style="justify-items:center">
        <span class="game-small" id="hud-tool"></span>
        <div class="game-slots" role="grid" style="--cols:4;pointer-events:auto">${slots}</div>
      </div>`);
    // a tap or click on a hotbar slot picks that tool (and does not reach the canvas as a tool use)
    for (const slot of document.querySelectorAll('#hud .game-slot'))
    {
        for (const type of ['pointerdown', 'mousedown', 'touchstart']) slot.addEventListener(type, (e)=> e.stopPropagation());
        slot.addEventListener('click', ()=> { tool = +slot.dataset.i; });
    }
    hudTool = -1;
}

function newGame()
{
    newFarm();
    showHud();
    startDay(true);
    tutorial('cozy.tip_use', 'fire');
}

function continueGame()
{
    const saved = autosaveState();
    if (!saved) return newGame();
    applyState(saved);
    showHud();
    startDay(false);
}

// a morning: the clock at 6:00, energy back, the player beside the bed; autosave
function startDay(save = true)
{
    state = 'play';
    kitPlaying = true;
    minutes = DAY_START;
    energy = ENERGY_MAX;
    shippedToday = earnedToday = 0;
    showScreen(document.getElementById('hud'));
    if (save) autosave();
}

// the night: watered crops grow one stage, the soil dries, then the summary; Next Morning starts the next day
function endDay()
{
    state = 'night';
    tutorial();
    for (const c of tiles)
    {
        if (c.crop >= 0 && c.crop < CROPS.turnip.nights && c.wet) c.crop++;
        c.wet = 0;
    }
    zzfx(...[.3,,220,.05,.2,.4,,,-1]);
    results({title: 'summary.title', titleVars: {day}, rows: [['summary.shipped', fmt(shippedToday)],
        ['summary.earned', t('hud.money', {amount: fmt(earnedToday)})], ['summary.money', t('hud.money', {amount: fmt(coins)})]],
        items: [{id: 'night-next', t: 'cozy.next_day', onSelect: nextMorning}]});
}
function nextMorning()
{
    day++;
    player = {x: 2, y: 6, face: vec2(1, 0), draw: tilePos(2, 6)};
    startDay(true);
}

function goalResults()
{
    state = 'goal';
    tutorial();
    results({title: 'cozy.goal_title', stars: 3, rows: [['cozy.days', fmt(day)], ['cozy.shipped_total', fmt(shippedTotal)],
        ['summary.money', t('hud.money', {amount: fmt(coins)})]],
        items: [{id: 'goal-keep', t: 'cozy.keep', onSelect: ()=> { state = 'play'; kitPlaying = true; showScreen(document.getElementById('hud')); }},
            {t: 'gameover.title_screen', onSelect: toTitle}]});
}

///////////////////////////////////////////////////////////////////////////////
// Actions: walk a tile at a time, use the tool on the tile in front, interact with things

// one tile per press; a new direction first only turns (so you can face a tile without stepping on it)
function walk(input)
{
    const ax = abs(input.moveX), ay = abs(input.moveY);
    if (max(ax, ay) < .4) { moveTimer = 0; return; }
    if ((moveTimer -= timeDelta) > 0) return;
    const dir = ax > ay ? vec2(sign(input.moveX), 0) : vec2(0, sign(input.moveY));
    if (dir.x !== player.face.x || dir.y !== player.face.y) { player.face = dir; moveTimer = .14; return; }
    moveTimer = .16;
    const x = player.x + dir.x, y = player.y + dir.y;
    if (tileAt(x, y) && !objectAt(x, y)) { player.x = x; player.y = y; }
}

function useTool()
{
    if (tool === HANDS) return interact();
    const {x, y} = front(), c = tileAt(x, y);
    if (objectAt(x, y)) return interact();
    if (!c || !inPlot(x, y)) return;
    if (c.crop === CROPS.turnip.nights) return interact();   // any tool picks a ripe crop
    if (energy <= 0) return say('cozy.msg_tired');
    tutorial();
    if (tool === 0 && !c.till) { c.till = 1; zzfx(...[.3,,120,,.03,.08,4]); }
    else if (tool === 1 && c.till && c.crop < 0)
    {
        if (seeds <= 0) return say('cozy.msg_no_seeds');
        seeds--; c.crop = 0; zzfx(...[.2,,500,,.02,.05]);
    }
    else if (tool === 2 && c.till) { c.wet = 1; zzfx(...[.2,,900,.02,.05,.15,,,,,,,,2]); }
    else return;
    energy = max(0, energy - TOOL_COST);
}

function interact()
{
    const {x, y} = front(), o = objectAt(x, y), c = tileAt(x, y);
    if (o && o.kind === 'npc') return talk();
    if (o && o.kind === 'bin') return sell();
    if (o && o.kind === 'bed') return confirmDialog('cozy.sleep_confirm', 'cozy.sleep', endDay);
    if (c && c.crop === CROPS.turnip.nights)
    {
        c.crop = -1; crops++; tutorial();
        zzfx(...[.3,,700,,.03,.1,,,8]);
        say('cozy.msg_harvest');
    }
}

function sell()
{
    if (!crops) return say('cozy.msg_nothing');
    const amount = crops * CROPS.turnip.price;
    say('cozy.msg_sold', {n: crops, amount: fmt(amount)});
    coins += amount; earnedToday += amount; shippedToday += crops; shippedTotal += crops; crops = 0;
    zzfx(...[.4,,1200,,.05,.2,,,,,300,.05]);
    if (!goalReached && coins >= GOAL) { goalReached = true; goalResults(); }
}

// DialogueBox with a choice; Mabel shares 5 seeds once a day
function talk()
{
    const lines = [{speaker: 'cozy.npc', t: 'cozy.npc_hello'}];
    if (day === 1) lines.push({speaker: 'cozy.npc', t: 'cozy.npc_tip'});
    lines.push({speaker: 'cozy.npc', t: 'cozy.npc_ask', choices: [{t: 'cozy.ask_seeds', value: 'seeds'}, {t: 'cozy.bye', value: 'bye'}]});
    dialogue(lines, (choice)=>
    {
        if (choice !== 'seeds') return;
        if (giftDay === day) return say('cozy.msg_no_gift');
        giftDay = day; seeds += 5;
        say('cozy.msg_seeds', {n: 5});
    });
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'fire', 'interact', 'tool_next', 'tool_prev']);
    pauseMenu({onQuit: toTitle});
    touchControls({stick: true, buttons: [{action: 'tool_next', label: 'action.tool'}, {action: 'interact', label: 'action.talk'}, {action: 'fire', label: 'action.use'}]});
    // HUD values made with t() follow a language change
    document.addEventListener('game:lang', ()=> { for (const key in hudCache) delete hudCache[key]; hudTool = -1; });
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    if (state !== 'play' || menuOpen()) return;
    if (input.pressed.pause) return openPause();
    // a click that just closed a menu or dialogue (mouse:0 is also `fire`) belongs to that menu, not the farm
    if (gcInput.tick - screenOpenedTick <= 1) return;

    // tools: number keys, shoulders, Q / R, the mouse wheel
    for (let i = 0; i < 4; ++i) if (input.pressed['tool_' + (i + 1)]) tool = i;
    if (input.pressed.tool_next || input.mouse.wheel > 0) tool = (tool + 1) % TOOLS.length;
    if (input.pressed.tool_prev || input.mouse.wheel < 0) tool = (tool + TOOLS.length - 1) % TOOLS.length;

    walk(input);
    if (input.pressed.fire) useTool();
    else if (input.pressed.interact) interact();
    if (state !== 'play') return;

    // the clock; at 24:00 the day ends by itself (no penalty)
    minutes += timeDelta / MINUTE_SECONDS;
    if (minutes >= DAY_END) endDay();
}

function gameUpdatePost()
{
    // zoom so the whole farm fits the window, with room for the HUD above and below
    cameraScale = min(mainCanvasSize.x / (W + 1), mainCanvasSize.y / (H + 5));
    cameraPos = vec2(0, .3);
    player.draw = player.draw.lerp(tilePos(player.x, player.y), .35);
    if (state === 'title') return;

    const m = floor(min(minutes, DAY_END - 1) / 10) * 10;
    hudText('hud-day', dateText());
    hudText('hud-time', floor(m / 60) + ':' + String(m % 60).padStart(2, '0'));
    hudText('hud-money', t('hud.money', {amount: fmt(coins)}));
    hudText('hud-goal', t('cozy.goal_value', {amount: fmt(coins), goal: fmt(GOAL)}));
    hudText('hud-crops', t('cozy.crops', {n: crops}));
    hudText('hud-seeds', String(seeds));
    hudText('hud-tool', t('tool.' + TOOLS[tool]));
    hudBar('hud-energy', energy, ENERGY_MAX);
    const text = message.key && timeReal < message.until ? t(message.key, message.vars) : '';
    hudText('hud-msg', text);
    const msg = document.getElementById('hud-msg');
    if (msg && msg.hidden !== !text) msg.hidden = !text;
    if (hudTool !== tool)
    {
        hudTool = tool;
        document.querySelectorAll('#hud .game-slot').forEach((s, i)=> s.setAttribute('aria-selected', String(i === tool)));
    }
}

function drawCrop(pos, stage)
{
    const crop = CROPS.turnip, bob = Math.sin(time * 2 + pos.x) * .02;
    if (stage === 0) { for (const dx of [-.15, 0, .15]) drawCircle(pos.add(vec2(dx, -.05)), .1, hsl(.1, .4, .7)); return; }
    if (stage === 1) { drawLine(pos.add(vec2(0, -.2)), pos.add(vec2(0, .05)), .06, crop.leaf); drawEllipse(pos.add(vec2(.1, .1 + bob)), vec2(.2, .1), crop.leaf, .5); return; }
    const leaves = stage === 2 ? .3 : .38;
    for (const a of [-.6, 0, .6]) drawEllipse(pos.add(vec2(Math.sin(a) * .15, .12 + bob)), vec2(.14, leaves), crop.leaf, a);
    if (stage === 3)
    {
        drawCircle(pos.add(vec2(0, -.15)), .42, crop.ripe);
        drawCircle(pos.add(vec2(0, -.22)), .22, hsl(.85, .5, .65));
        drawRect(pos.add(vec2(.18, -.02)), vec2(.07), hsl(.13, 1, .65));   // the gold glint
    }
}

function gameRender()
{
    // grass, the field, soil and crops
    drawRect(vec2(), FIELD.add(vec2(.4)), hsl(.3, .35, .25));
    for (let y = 0; y < H; ++y) for (let x = 0; x < W; ++x)
    {
        const pos = tilePos(x, y), c = tiles[y * W + x];
        drawRect(pos, vec2(1), (x + y) % 2 ? hsl(.29, .45, .42) : hsl(.3, .45, .45));
        if (inPlot(x, y)) drawRect(pos, vec2(.96), hsl(.25, .35, .38));
        if (c.till) drawRect(pos, vec2(.9), c.wet ? hsl(.07, .45, .2) : hsl(.07, .45, .33));
        if (c.crop >= 0) drawCrop(pos, c.crop);
    }
    // the house and the things on the farm
    const house = tilePos(1, 8);
    drawRect(house.add(vec2(0, -.3)), vec2(2.8, 2), hsl(.08, .35, .7));
    drawPoly([vec2(-1.7, .6), vec2(1.7, .6), vec2(0, 1.6)], hsl(0, .5, .45), 0, BLACK, house);
    drawRect(house.add(vec2(0, -.8)), vec2(.6, 1), hsl(.07, .4, .3));
    drawRect(house.add(vec2(-.9, -.1)), vec2(.5), hsl(.55, .5, .75));
    for (const o of OBJECTS)
    {
        const pos = tilePos(o.x, o.y);
        if (o.kind === 'bed')
        {
            drawRect(pos, vec2(.9, .8), hsl(.08, .4, .35));
            drawRect(pos.add(vec2(0, .22)), vec2(.7, .22), WHITE);
            drawRect(pos.add(vec2(0, -.12)), vec2(.8, .45), hsl(.6, .45, .55));
        }
        if (o.kind === 'bin')
        {
            drawRect(pos, vec2(.9, .75), hsl(.08, .45, .4));
            drawRect(pos.add(vec2(0, .3)), vec2(.96, .2), hsl(.08, .45, .28));
            drawLine(pos.add(vec2(-.4, -.1)), pos.add(vec2(.4, -.1)), .04, hsl(.08, .45, .25));
        }
        if (o.kind === 'npc')
        {
            const bob = Math.sin(time * 1.5) * .03;
            drawEllipse(pos.add(vec2(0, -.15)), vec2(.55, .6), hsl(.95, .45, .55));
            drawCircle(pos.add(vec2(0, .25 + bob)), .4, hsl(.08, .5, .78));
            drawRect(pos.add(vec2(0, .45 + bob)), vec2(.6, .12), hsl(.12, .6, .6));
        }
    }
    // the tile the tool acts on, outlined in gold
    if (state === 'play')
    {
        const f = front();
        if (tileAt(f.x, f.y))
        {
            const p = tilePos(f.x, f.y), d = .48;
            drawLineList([p.add(vec2(-d, -d)), p.add(vec2(d, -d)), p.add(vec2(d, d)), p.add(vec2(-d, d))], .06, hsl(.13, .9, .6), true);
        }
    }
    // the player: body, head, eyes toward the facing direction
    const p = player.draw;
    drawEllipse(p.add(vec2(0, -.15)), vec2(.55, .6), hsl(.55, .45, .45));
    drawCircle(p.add(vec2(0, .22)), .42, hsl(.08, .5, .75));
    drawRect(p.add(vec2(0, .4)), vec2(.5, .14), hsl(.1, .5, .35));
    if (player.face.y <= 0)   // facing up shows the back of the head
        for (const s of [-1, 1]) drawRect(p.add(vec2(player.face.x * .12 + s * .09 * (player.face.x ? .4 : 1), .22 + player.face.y * .05)), vec2(.06), BLACK);
    // the time of day as a soft tint over the world (never over the HTML)
    const hour = minutes / 60;
    const tint = hour < 8 ? hsl(.08, .9, .6, (8 - hour) / 2 * .15) : hour < 17 ? null :
        hour < 20 ? hsl(.07, .9, .5, (hour - 17) / 3 * .2) : hsl(.65, .6, .15, min(.45, .2 + (hour - 20) / 4 * .25));
    if (tint && state !== 'title') drawRect(vec2(), FIELD.add(vec2(.4)), tint);
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
