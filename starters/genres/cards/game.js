/*
    Pocket Duel: a small trading card game against the computer (designer card GameCards).
    A fixed 20-card deck of 6 kinds, energy that grows each turn, phases Draw -> Main -> Attack -> End,
    four lanes per side, 20 health each. The canvas draws the table and the units as shapes; every word and
    number (hand, health, energy, phases, unit stats) is the game kit's HTML (js/kit.js).

    Your turn: choose a card with left/right (or hover), play it with confirm (Enter, Space, click, south),
    Attack with `fire` (F, west) and end the turn with `end_turn` (E, north). Units attack the unit in their
    lane, or the opponent when the lane is open.

    Add a card: one entry in CARDS (type unit | spell | heal), its id in DECK, and 'card.<id>' + 'card.<id>.text'
    in both languages of GAME_TEXTS. New effects go in playCard().
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Pocket Duel', 'cards.title': 'Pocket Duel', 'cards.play': 'Play vs Computer',
        'phase.draw': 'Draw', 'phase.main': 'Main', 'phase.attack': 'Attack', 'phase.end': 'End',
        'match.end_turn': 'End Turn', 'hud.energy': 'Energy {n} / {max}', 'action.end_turn': 'End Turn',
        'cards.attack': 'Attack', 'cards.play_card': 'Play card', 'cards.your_turn': 'Your turn',
        'cards.board_full': 'Your board is full', 'cards.foe_played': 'Computer plays {card}',
        'cards.foe_hand': 'Opponent’s hand: {n} cards', 'cards.health': 'Health {n}', 'cards.unit': '{card}: attack {atk}, health {hp}',
        'cards.victory': 'Victory', 'cards.defeat': 'Defeat', 'cards.turns': 'Turns', 'cards.health_left': 'Health left',
        'cards.lost_detail': 'The computer won on turn {turn}.', 'cards.rematch': 'Rematch',
        'card.squire': 'Squire', 'card.squire.text': 'Unit · attack 1 · health 2',
        'card.knight': 'Knight', 'card.knight.text': 'Unit · attack 2 · health 3',
        'card.archer': 'Archer', 'card.archer.text': 'Unit · attack 3 · health 1',
        'card.giant': 'Giant', 'card.giant.text': 'Unit · attack 4 · health 5',
        'card.spark': 'Spark', 'card.spark.text': 'Deal 3 damage (strongest enemy unit first).',
        'card.heal': 'Heal', 'card.heal.text': 'Restore 4 of your health.'},
    ja: {'game.name': 'ポケットデュエル', 'cards.title': 'ポケットデュエル', 'cards.play': 'コンピューターと対戦',
        'phase.draw': 'ドロー', 'phase.main': 'メイン', 'phase.attack': 'アタック', 'phase.end': 'エンド',
        'match.end_turn': 'ターン終了', 'hud.energy': 'エネルギー {n} / {max}', 'action.end_turn': 'ターン終了',
        'cards.attack': 'アタック', 'cards.play_card': 'カードを出す', 'cards.your_turn': 'あなたのターン',
        'cards.board_full': '場がいっぱいです', 'cards.foe_played': 'コンピューターが {card} を出した',
        'cards.foe_hand': '相手の手札：{n} 枚', 'cards.health': '体力 {n}', 'cards.unit': '{card}：攻撃 {atk}・体力 {hp}',
        'cards.victory': '勝利', 'cards.defeat': '敗北', 'cards.turns': 'ターン数', 'cards.health_left': '残り体力',
        'cards.lost_detail': 'コンピューターが {turn} ターン目に勝ちました。', 'cards.rematch': '再戦',
        'card.squire': '見習い騎士', 'card.squire.text': 'ユニット・攻撃 1・体力 2',
        'card.knight': '騎士', 'card.knight.text': 'ユニット・攻撃 2・体力 3',
        'card.archer': '弓兵', 'card.archer.text': 'ユニット・攻撃 3・体力 1',
        'card.giant': '巨人', 'card.giant.text': 'ユニット・攻撃 4・体力 5',
        'card.spark': 'スパーク', 'card.spark.text': '3 ダメージ（最も強い敵ユニットから）。',
        'card.heal': 'ヒール', 'card.heal.text': '自分の体力を 4 回復する。'},
};

// the game's own actions on top of gaming-core's; fire (Attack) leaves out the left click, which plays a card
const GAME_ACTIONS = {
    fire: ['key:KeyF', 'key:KeyX', 'pad:2'],
    end_turn: ['key:KeyE', 'pad:3'],      // north: Start is gaming-core's fixed Pause
};

///////////////////////////////////////////////////////////////////////////////
// Cards and rules

const CARDS = {
    squire: {type: 'unit', cost: 1, atk: 1, hp: 2, hue: .33},
    knight: {type: 'unit', cost: 2, atk: 2, hp: 3, hue: .6},
    archer: {type: 'unit', cost: 2, atk: 3, hp: 1, hue: .08},
    giant:  {type: 'unit', cost: 4, atk: 4, hp: 5, hue: .78},
    spark:  {type: 'spell', cost: 1, damage: 3, hue: .14},
    heal:   {type: 'heal', cost: 2, heal: 4, hue: .5},
};
const DECK = ['squire', 'squire', 'squire', 'squire', 'knight', 'knight', 'knight', 'knight', 'archer', 'archer', 'archer',
    'giant', 'giant', 'spark', 'spark', 'spark', 'spark', 'heal', 'heal', 'heal'];   // 20 cards
const START_HEALTH = 20, HAND_START = 3, HAND_MAX = 7, LANES = 4, ENERGY_CAP = 10;

const BOARD = vec2(22, 15);                // world units; the camera fits it between the top HUD and the hand
const LANE_X = [-7.5, -2.5, 2.5, 7.5];
const ROW_Y = {you: -2.6, foe: 2.6}, HERO_Y = {you: -6.2, foe: 6.2};
const UNIT_SIZE = vec2(3.6, 4.2);

let state = 'title';                       // title | play | over
let you, foe;                              // players: {who, hp, energy, max, deck, hand, discard, board, flash}
let turn = 0;                              // your turn count
let side = 'you';                          // whose turn: you | foe
let phase = 'draw';                        // draw | main | attack | end
let selected = 0;                          // the focused card in your hand
let status = {key: '', vars: null};        // the line at the top centre
let steps = [];                            // [{t, fn}]: world-time callbacks, frozen with the world (pause, menus)
let handKey = '', hudKey = {};

function after(seconds, fn) { steps.push({t: seconds, fn}); }
function runSteps()
{
    for (const s of steps.slice())
        if (steps.includes(s) && (s.t -= timeDelta) <= 0) { steps.splice(steps.indexOf(s), 1); s.fn(); }
}
function say(key, vars = null) { status = {key, vars}; }
function other(p) { return p === you ? foe : you; }
function shuffled(list)
{
    const a = list.slice();
    for (let i = a.length; i-- > 1;) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

function newPlayer(who)
{
    const p = {who, hp: START_HEALTH, energy: 0, max: 0, deck: shuffled(DECK), hand: [], discard: [], board: Array(LANES).fill(null), flash: 0};
    for (let i = 0; i < HAND_START; ++i) draw(p);
    // the opening hand always holds a 1-cost unit, so turn 1 has a play
    if (!p.hand.includes('squire')) { const j = p.deck.indexOf('squire'); [p.hand[0], p.deck[j]] = [p.deck[j], p.hand[0]]; }
    return p;
}

function draw(p)
{
    if (!p.deck.length)
    {
        if (!p.discard.length) return;
        p.deck = shuffled(p.discard); p.discard = [];
        if (p === you) say('cards.reshuffle');
    }
    const id = p.deck.pop();
    p.hand.length < HAND_MAX ? p.hand.push(id) : p.discard.push(id);   // a full hand burns the card
}

function hitHero(p, n) { p.hp = max(0, p.hp - n); p.flash = 1; zzfx(...[.4,,150,,.05,.15,,,-4]); }
function strongest(p) { let best = -1; p.board.forEach((u, i)=> { if (u && (best < 0 || u.atk > p.board[best].atk)) best = i; }); return best; }
function bury(p) { p.board.forEach((u, i)=> { if (u && u.hp <= 0) { p.discard.push(u.id); p.board[i] = null; } }); }

// play the card at hand index i for player p; false (and a reason on your status line) when it can't be played
function playCard(i, p = you)
{
    const id = p.hand[i], card = CARDS[id];
    if (!card) return false;
    if (card.cost > p.energy) { if (p === you) say('cards.need_energy', {n: card.cost - p.energy}); return false; }
    const lane = p.board.indexOf(null);
    if (card.type === 'unit' && lane < 0) { if (p === you) say('cards.board_full'); return false; }
    p.energy -= card.cost;
    p.hand.splice(i, 1);
    if (card.type === 'unit') p.board[lane] = {id, atk: card.atk, hp: card.hp, ready: true, flash: 0, lunge: 0};
    else
    {
        p.discard.push(id);
        const them = other(p), target = strongest(them);
        if (card.type === 'spell' && target >= 0) { them.board[target].hp -= card.damage; them.board[target].flash = 1; bury(them); }
        else if (card.type === 'spell') hitHero(them, card.damage);
        if (card.type === 'heal') p.hp = min(START_HEALTH, p.hp + card.heal);
    }
    zzfx(...[.3,,400,.01,.03,.1]);
    checkEnd();
    return true;
}

// the Attack phase: every ready unit strikes its lane, one after another
function attack(p)
{
    phase = 'attack';
    const lanes = [];
    p.board.forEach((u, i)=> { if (u && u.ready) lanes.push(i); });
    lanes.forEach((lane, n)=> after(.35 * (n + 1), ()=> strike(p, lane)));
    if (p === foe) after(.35 * (lanes.length + 1), ()=> endTurn(foe));   // you end your own turn
}

function strike(p, lane)
{
    const u = p.board[lane], them = other(p), target = them.board[lane];
    if (!u || state !== 'play') return;
    u.ready = false; u.lunge = 1;
    if (target) { target.hp -= u.atk; u.hp -= target.atk; target.flash = u.flash = 1; bury(p); bury(them); zzfx(...[.3,,220,,.04,.1,,,-2]); }
    else hitHero(them, u.atk);
    checkEnd();
}

///////////////////////////////////////////////////////////////////////////////
// Turns: beginTurn -> draw -> main (cards) -> attack -> end -> the other side

function beginTurn(p)
{
    side = p.who;
    phase = 'draw';
    if (p === you) turn++;
    p.max = min(p.max + 1, ENERGY_CAP);
    p.energy = p.max;
    for (const u of p.board) if (u) u.ready = true;
    draw(p);
    zzfx(...[.2,,700,,.02,.04]);
    say(p === you ? 'cards.your_turn' : 'cards.their_turn');
    after(.5, ()=> { phase = 'main'; p === you ? after(0, focusHand) : after(.5, aiStep); });
}

function endTurn(p) { phase = 'end'; after(.4, ()=> beginTurn(other(p))); }

function canPlay() { return state === 'play' && side === 'you' && phase === 'main'; }
function playerAttack() { if (canPlay() && !steps.length) { attack(you); after(0, ()=> document.getElementById('hud-end')?.focus()); } }
function playerEndTurn() { if (state === 'play' && side === 'you' && (phase === 'main' || phase === 'attack') && !steps.length) endTurn(you); }

// the computer: the most expensive card it can use well, one every 0.7 s; then it attacks with everything
function aiChoice()
{
    let best = -1;
    foe.hand.forEach((id, i)=>
    {
        const c = CARDS[id];
        if (c.cost > foe.energy || c.type === 'unit' && !foe.board.includes(null) || c.type === 'heal' && foe.hp > START_HEALTH - c.heal) return;
        if (best < 0 || c.cost > CARDS[foe.hand[best]].cost) best = i;
    });
    return best;
}
function aiStep()
{
    if (state !== 'play') return;
    const i = aiChoice();
    if (i < 0) return attack(foe);
    const id = foe.hand[i];
    playCard(i, foe);
    say('cards.foe_played', {card: id});
    after(.7, aiStep);
}

function checkEnd()
{
    if (state !== 'play') return;
    if (foe.hp <= 0) win();
    else if (you.hp <= 0) lose();
}

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> match -> results (win) or game over (loss)

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    steps = [];
    showScreen(titleScreen({items: [
        {id: 'title-start', t: 'cards.play', onSelect: start},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ]}));
}

function start()
{
    you = newPlayer('you'); foe = newPlayer('foe');
    turn = 0; selected = 0; steps = []; handKey = ''; hudKey = {};
    state = 'play';
    kitPlaying = true;
    showScreen(buildHud());
    beginTurn(you);
}

function win()
{
    state = 'over'; steps = [];
    results({title: 'cards.victory', rows: [['cards.turns', String(turn)], ['cards.health_left', String(you.hp)]],
        items: [{t: 'cards.rematch', onSelect: start}, {t: 'gameover.title_screen', onSelect: toTitle}]});
}

function lose()
{
    state = 'over'; steps = [];
    gameOver({title: 'cards.defeat', detail: t('cards.lost_detail', {turn}),
        items: [{t: 'cards.rematch', onSelect: start}, {t: 'gameover.title_screen', onSelect: toTitle}]});
}

///////////////////////////////////////////////////////////////////////////////
// HUD (HudPieces) and hand (CardHand): HTML over the canvas; gameUpdatePost writes only what changed

const HUD_STYLE = `<style>
#hud .cards-hp{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--g-bad);box-shadow:0 0 0 3px var(--g-ink);font-size:18px}
#hud .cards-pips{display:inline-flex;gap:3px}#hud .cards-pips i{width:8px;height:14px;background:var(--g-ink);box-shadow:0 0 0 1px var(--g-energy)}#hud .cards-pips i[data-on]{background:var(--g-energy)}
#hud .cards-phases{list-style:none;margin:0;padding:0;display:grid;gap:2px;font-size:12px}#hud .cards-phases li{padding:2px 8px;color:var(--g-dim)}#hud .cards-phases li[data-on]{background:var(--g-accent);color:var(--g-ink);text-shadow:none}
#hud .cards-back{display:inline-block;width:12px;height:18px;margin-right:-4px;background:var(--g-panel);box-shadow:0 0 0 2px var(--g-ink),inset 0 0 0 3px var(--g-dim)}
#hud #hud-status{max-width:40cqi;font-size:13px}
#hand-area{position:absolute;left:0;right:0;bottom:max(8px,env(safe-area-inset-bottom));display:grid;gap:6px;pointer-events:none}
#hand-area>*{pointer-events:auto}#me-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:0 12px}
#hand{padding:22px 0 20px;min-height:60px}#hand .game-card{cursor:pointer}#hand .game-card>b{padding-left:12px}#hand .game-art{min-height:18px}#hand[data-small] .game-art{display:none}
#hud .cards-btn{min-height:40px;font-size:13px;padding:0 10px}#hud .cards-pile{--g-px:1.5px;font-size:11px}
#hud .cards-label{position:absolute;transform:translate(-50%,-50%);padding:1px 6px;background:rgb(0 0 0 / .65);font-size:13px;white-space:nowrap;pointer-events:none}
</style>`;

function buildHud()
{
    const phases = ['draw', 'main', 'attack', 'end'].map(p=> `<li data-phase="${p}" data-t="phase.${p}"></li>`).join('');
    const labels = ['you', 'foe'].map(w=> LANE_X.map((x, i)=> `<span class="cards-label game-num" id="lbl-${w}-${i}" hidden></span>`).join('')).join('');
    const el = hudInit(`${HUD_STYLE}
      <div data-slot="tl" class="game-stack">
        <span class="game-row"><b class="cards-hp game-num" id="hud-foe-hp"></b><span id="hud-foe-hand" class="game-row"></span></span>
        <span class="game-small game-num" id="hud-foe-energy"></span>
      </div>
      <p data-slot="tc" id="hud-status" class="game-line" role="status" style="margin:0"></p>
      <ol data-slot="tr" class="cards-phases" id="hud-phase" aria-label="Phase">${phases}</ol>
      <div id="board-labels">${labels}</div>
      <div id="hand-area">
        <div id="me-row">
          <span class="game-row"><b class="cards-hp game-num" id="hud-you-hp"></b><span class="cards-pips" id="hud-pips" aria-hidden="true"></span>
            <span class="game-num" id="hud-you-energy"></span></span>
          <span class="game-row">
            <button class="game-btn cards-btn" id="hud-attack" disabled><span data-prompt="fire"></span><span data-t="cards.attack"></span></button>
            <button class="game-btn cards-btn" id="hud-end" disabled><span data-prompt="end_turn"></span><span data-t="match.end_turn"></span></button>
            <span class="game-pile cards-pile" id="hud-deck" role="img"><span class="game-num"></span></span>
            <span class="game-pile cards-pile" id="hud-discard" role="img" style="opacity:.8"><span class="game-num"></span></span>
          </span>
        </div>
        <p class="game-hint" style="justify-content:center;margin:0">${hint('confirm', 'cards.play_card')}</p>
        <div id="hand" aria-label="Hand"></div>
      </div>`);
    renderPrompts(el);
    const hand = el.querySelector('#hand');
    hand.addEventListener('click', (e)=> { const c = e.target.closest('.game-card'); if (c && canPlay()) playCard(+c.dataset.i); });
    hand.addEventListener('mousemove', (e)=>     // hover chooses a card, only when the mouse really moved
    {
        const c = e.target.closest('.game-card');
        if (c && (e.movementX || e.movementY) && document.activeElement !== c) c.focus({preventScroll: true});
    });
    hand.addEventListener('focusin', (e)=>
    {
        const c = e.target.closest('.game-card');
        if (!c) return;
        selected = +c.dataset.i;
        for (const card of hand.querySelectorAll('.game-card')) card.setAttribute('aria-selected', card === c);
    });
    el.querySelector('#hud-attack').addEventListener('click', playerAttack);
    el.querySelector('#hud-end').addEventListener('click', playerEndTurn);
    return el;
}

function focusHand()
{
    const cards = document.querySelectorAll('#hand .game-card');
    if (cards.length) cards[clamp(selected, 0, cards.length - 1)].focus({preventScroll: true});
}

function renderHand()
{
    const el = document.getElementById('hand');
    const active = document.activeElement, hadFocus = !active || active === document.body || active === gameBox || el.contains(active);
    selected = clamp(selected, 0, max(0, you.hand.length - 1));
    el.innerHTML = handHTML(you.hand.map(id=> ({id, cost: CARDS[id].cost, disabled: CARDS[id].cost > you.energy})), selected);
    // cards shrink on a narrow screen (the designer's 66 px phone cards are --g-px 3)
    const n = max(1, you.hand.length), px = mainCanvasSize.x >= n * 72 + 48 ? 4 : mainCanvasSize.x >= n * 50 + 40 ? 3 : 2;
    el.style.setProperty('--g-px', px + 'px');
    el.toggleAttribute('data-small', px < 4);
    el.inert = !canPlay();
    if (hadFocus && !el.inert) focusHand();
}

// a value only reaches the DOM when it changed
function hudHTML(id, html) { if (hudKey[id] !== html) { hudKey[id] = html; const e = document.getElementById(id); if (e) e.innerHTML = html; } }
function hudAttr(id, name, value) { const k = id + '@' + name; if (hudKey[k] !== value) { hudKey[k] = value; document.getElementById(id)?.setAttribute(name, value); } }

function updateHud()
{
    hudText('hud-you-hp', String(you.hp)); hudText('hud-foe-hp', String(foe.hp));
    hudAttr('hud-you-hp', 'aria-label', t('cards.health', {n: you.hp})); hudAttr('hud-foe-hp', 'aria-label', t('cards.health', {n: foe.hp}));
    hudText('hud-you-energy', t('hud.energy', {n: you.energy, max: you.max}));
    hudText('hud-foe-energy', t('hud.energy', {n: foe.energy, max: foe.max}));
    hudHTML('hud-pips', Array.from({length: you.max}, (_, i)=> `<i ${i < you.energy ? 'data-on' : ''}></i>`).join(''));
    hudHTML('hud-foe-hand', '<span class="cards-back"></span>'.repeat(foe.hand.length) + `<span class="game-num" style="margin-left:6px">${foe.hand.length}</span>`);
    hudAttr('hud-foe-hand', 'aria-label', t('cards.foe_hand', {n: foe.hand.length}));
    for (const [id, list, key] of [['hud-deck', you.deck, 'cards.deck'], ['hud-discard', you.discard, 'cards.discard']])
    {
        hudHTML(id, `<span class="game-num">${list.length}</span>`);
        hudAttr(id, 'aria-label', t(key, {n: list.length}));
    }
    const vars = status.vars && status.vars.card ? {...status.vars, card: t('card.' + status.vars.card)} : status.vars;
    hudText('hud-status', status.key ? t(status.key, vars) : '');
    if (hudKey.phase !== phase)
    {
        hudKey.phase = phase;
        for (const li of document.querySelectorAll('#hud-phase li')) li.toggleAttribute('data-on', li.dataset.phase === phase);
    }
    const attack = document.getElementById('hud-attack'), end = document.getElementById('hud-end');
    if (attack) attack.disabled = !canPlay() || steps.length > 0;
    if (end) end.disabled = !(state === 'play' && side === 'you' && (phase === 'main' || phase === 'attack')) || steps.length > 0;
    const key = you.hand.join() + '|' + you.energy + '|' + canPlay() + '|' + mainCanvasSize.x;
    if (key !== handKey) { handKey = key; renderHand(); }
    updateLabels();
}

// each unit's numbers as an HTML label over its shape on the canvas
function updateLabels()
{
    const scale = mainCanvas.getBoundingClientRect().width / mainCanvasSize.x || 1;
    for (const p of [you, foe]) p.board.forEach((u, i)=>
    {
        const el = document.getElementById(`lbl-${p.who}-${i}`);
        if (!el) return;
        const pos = worldToScreen(unitPos(p, i, u).add(vec2(0, -UNIT_SIZE.y / 2 + .7)));
        const k = u ? `${u.atk}/${u.hp}/${pos.x | 0}/${pos.y | 0}/${settings.lang}` : '';
        if (el.dataset.k === k) return;
        el.dataset.k = k;
        el.hidden = !u;
        if (!u) return;
        el.textContent = `${u.atk} / ${u.hp}`;
        el.setAttribute('aria-label', t('cards.unit', {card: t('card.' + u.id), atk: u.atk, hp: u.hp}));
        el.style.left = pos.x * scale + 'px';
        el.style.top = pos.y * scale + 'px';
    });
}

///////////////////////////////////////////////////////////////////////////////
// Drawing: shapes only

function unitPos(p, lane, u)
{
    const dir = p === you ? 1 : -1;
    return vec2(LANE_X[lane], ROW_Y[p.who] + dir * (u ? u.lunge : 0) * 1.5);
}

function drawUnit(u, pos)
{
    const c = CARDS[u.id], light = u.ready ? .5 : .38;
    drawRect(pos, UNIT_SIZE.add(vec2(.3)), hsl(0, 0, .05));
    drawRect(pos, UNIT_SIZE, hsl(c.hue, .5, light));
    drawRect(pos.add(vec2(0, .5)), vec2(2.6, 2.2), hsl(c.hue, .45, light - .15));
    const icon = pos.add(vec2(0, .5)), white = hsl(0, 0, .95);
    if (u.id === 'archer') { drawLine(icon.add(vec2(-.4, -.9)), icon.add(vec2(-.4, .9)), .15, white); drawLine(icon.add(vec2(-.6, 0)), icon.add(vec2(.8, 0)), .15, white); }
    else if (u.id === 'giant') drawCircle(icon, 1.5, white);
    else if (u.id === 'squire') drawPoly([vec2(-.7, .7), vec2(.7, .7), vec2(.6, -.2), vec2(0, -.9), vec2(-.6, -.2)], white, 0, white, icon);
    else { drawLine(icon.add(vec2(-.7, -.7)), icon.add(vec2(.7, .7)), .2, white); drawLine(icon.add(vec2(-.6, .2)), icon.add(vec2(-.2, -.6)), .2, white); }
    if (u.flash > 0) drawRect(pos, UNIT_SIZE, hsl(0, 0, 1, u.flash * .7));
}

function drawHero(p)
{
    const pos = vec2(0, HERO_Y[p.who]);
    drawCircle(pos, 2.6, p === you ? hsl(.55, .5, .45) : hsl(0, .5, .45), .15, hsl(0, 0, .05));
    drawCircle(pos.add(vec2(0, .3)), .9, hsl(.1, .4, .8));
    if (p.flash > 0) drawCircle(pos, 2.6, hsl(0, 0, 1, p.flash * .7));
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'fire', 'end_turn']);
    pauseMenu({onQuit: toTitle});
    touchControls({stick: false, buttons: []});   // on touch: the pause button only; cards and buttons are tapped
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    if (state === 'over') fadeEffects();          // the last hit settles behind Results / Game Over
    if (state !== 'play' || menuOpen()) return;
    if (input.pressed.pause) return openPause();
    if (input.pressed.fire) playerAttack();
    if (input.pressed.end_turn) playerEndTurn();
    // choosing and playing cards is the kit's focus model: arrows / d-pad move focus, confirm clicks the card
    runSteps();
    fadeEffects();
}

function fadeEffects()
{
    for (const p of [you, foe])
    {
        p.flash = max(0, p.flash - timeDelta * 3);
        for (const u of p.board) if (u) { u.flash = max(0, u.flash - timeDelta * 3); u.lunge = max(0, u.lunge - timeDelta * 4); }
    }
}

function gameUpdatePost()
{
    // fit the board between the top HUD and the hand, in any window shape
    const bottomOf = (sel)=> { const e = document.querySelector(sel); return e && !e.closest('[hidden]') ? e.getBoundingClientRect().bottom : 0; };
    const area = document.getElementById('hand-area'), playing = state !== 'title' && area && !area.closest('[hidden]');
    const top = playing ? max(bottomOf('#hud [data-slot="tl"]'), bottomOf('#hud-phase'), bottomOf('#hud-status')) + 8 : 0;
    const bottom = playing ? area.offsetHeight + 12 : 0;
    const room = max(80, mainCanvasSize.y - top - bottom);
    cameraScale = min(mainCanvasSize.x / (BOARD.x + 1), room / BOARD.y);
    cameraPos = vec2(0, (top + room / 2 - mainCanvasSize.y / 2) / cameraScale);
    if (you && document.getElementById('hand')) updateHud();
}

function gameRender()
{
    drawRect(cameraPos, vec2(400), hsl(.38, .25, .1));
    if (state === 'title')
    {
        for (let i = 0; i < 5; ++i) drawRect(vec2((i - 2) * 3.2, -5 + Math.sin(time * 1.5 + i) * .3), vec2(2.6, 3.6), hsl(i / 5, .45, .45, .6), (i - 2) * .12);
        return;
    }
    drawRect(vec2(), BOARD, hsl(.36, .3, .2));
    drawRect(vec2(), vec2(BOARD.x, .08), hsl(0, 0, 1, .2));
    for (const p of [foe, you])
    {
        drawHero(p);
        p.board.forEach((u, i)=>
        {
            drawRect(vec2(LANE_X[i], ROW_Y[p.who]), UNIT_SIZE, hsl(0, 0, 0, .25));
            if (u) drawUnit(u, unitPos(p, i, u));
        });
    }
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
