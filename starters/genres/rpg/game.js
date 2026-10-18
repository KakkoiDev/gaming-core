/*
    Meadow Tale: a small top-down RPG (designer card GameRpg).
    Walk a tile map (grass, trees, water), talk to the elder, accept her quest, fight slimes with action combat,
    pick up potions into the bag and drink them, save in three slots, bring the lost key back.
    The canvas draws shapes only; every word, menu and number is the game kit's HTML (js/kit.js).

    Extend it: a new tile is one MAP character + solidAt() + drawMapTile(); a new NPC is an entry like ELDER with its
    own talk lines; a new item is an id in ITEMS plus 'item.<id>' and 'item.<id>.desc' texts in both languages.
*/
'use strict';

const GAME_TEXTS = {
    en: {'game.name': 'Meadow Tale', 'rpg.title': 'Meadow Tale', 'rpg.new_game': 'New Game', 'rpg.continue': 'Continue',
        'hud.hp': 'HP', 'prompt.talk': 'Talk', 'prompt.attack': 'Attack', 'menu.items': 'Items',
        'action.confirm': 'Confirm / talk', 'action.menu': 'Field menu (bag)',
        'quest.find_key': 'Find the lost key in the forest', 'quest.return_key': 'Bring the key back to the elder',
        'place.village': 'Willow Village', 'place.forest': 'Slime Forest', 'npc.elder': 'Elder Rowan',
        'elder.hello': 'Ah, a traveller! Slimes chased me out of the forest and I dropped my house key.',
        'elder.ask': 'Will you find it for me? It lies past the slimes, to the east.',
        'elder.accept': 'I will find it', 'elder.decline': 'Not now',
        'elder.later': 'Come back if you change your mind.', 'elder.waiting': 'The key should be at the far east of the forest. Mind the slimes!',
        'elder.thanks': 'My key! Thank you, brave one.', 'elder.reward': 'Willow Village is in your debt.',
        'elder.after': 'Rest well, traveller.',
        'item.potion': 'Potion', 'item.potion.desc': 'Restores 5 HP.', 'item.key': 'Old Key', 'item.key.desc': 'The elder\'s house key.',
        'rpg.hp_full': 'Your HP is already full.', 'rpg.picked': 'Picked up: {item}', 'rpg.bag_full': 'Your bag is full.',
        'rpg.tut_attack': 'Press {button} to attack', 'rpg.tut_bag': '{button} opens the bag',
        'rpg.quest_done': 'Quest Complete', 'rpg.slimes': 'Slimes defeated', 'rpg.time': 'Play time',
        'rpg.keep_exploring': 'Keep Exploring', 'rpg.fell': 'You fainted in {place}.'},
    ja: {'game.name': 'メドウ物語', 'rpg.title': 'メドウ物語', 'rpg.new_game': 'はじめから', 'rpg.continue': 'つづきから',
        'hud.hp': 'HP', 'prompt.talk': 'はなす', 'prompt.attack': 'こうげき', 'menu.items': 'もちもの',
        'action.confirm': '決定・はなす', 'action.menu': 'フィールドメニュー（もちもの）',
        'quest.find_key': '森でなくした鍵をさがす', 'quest.return_key': '鍵を長老にとどける',
        'place.village': 'ヤナギ村', 'place.forest': 'スライムの森', 'npc.elder': '長老ローワン',
        'elder.hello': 'おお、旅の方！スライムに森から追い出されて、家の鍵を落としてしまったのじゃ。',
        'elder.ask': '鍵をさがしてくれんかの？東の、スライムたちの向こうにあるはずじゃ。',
        'elder.accept': 'さがしてくる', 'elder.decline': 'いまはやめておく',
        'elder.later': '気が変わったら、また来ておくれ。', 'elder.waiting': '鍵は森のいちばん東にあるはずじゃ。スライムに気をつけるのじゃぞ！',
        'elder.thanks': 'わしの鍵じゃ！ありがとう、勇敢な方よ。', 'elder.reward': 'ヤナギ村はそなたに恩ができたのう。',
        'elder.after': 'ゆっくり休んでいきなされ。',
        'item.potion': 'ポーション', 'item.potion.desc': 'HPを5回復する。', 'item.key': '古い鍵', 'item.key.desc': '長老の家の鍵。',
        'rpg.hp_full': 'HPはもう満タンです。', 'rpg.picked': '{item}を手に入れた', 'rpg.bag_full': 'もちものがいっぱいです。',
        'rpg.tut_attack': '{button} でこうげき', 'rpg.tut_bag': '{button} でもちものを開く',
        'rpg.quest_done': 'クエスト達成', 'rpg.slimes': 'たおしたスライム', 'rpg.time': 'プレイ時間',
        'rpg.keep_exploring': '冒険をつづける', 'rpg.fell': '{place}でたおれてしまった。'},
};

// on top of gaming-core's actions: Attack is C/J/left click/west (X is left for back), confirm adds Z, the field menu
const GAME_ACTIONS = {
    fire: ['key:KeyC', 'key:KeyJ', 'mouse:0', 'pad:2'],
    confirm: ['key:Enter', 'key:Space', 'key:KeyZ', 'mouse:0', 'pad:0'],
    menu: ['key:Tab', 'key:KeyI', 'pad:3'],
};

///////////////////////////////////////////////////////////////////////////////
// The map: one character per tile, top row first. # tree, ~ water, , path, . grass;
// H hero start, E elder, s slime, k the key, p a potion on the ground (all stand on grass)

const MAP = [
    '############################',
    '#..........#...............#',
    '#..H.......#....s.....##...#',
    '#.....E....#..........##.p.#',
    '#..........,.......s.......#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,..#',
    '#..........#..........s..k.#',
    '#..~~~.....#...............#',
    '#..~~~.....#....##.........#',
    '#..~~~.....#....##.........#',
    '#..........#...............#',
    '############################',
];
const W = MAP[0].length, H = MAP.length;       // one world unit per tile, y up
const HP_MAX = 10, HERO_SPEED = 5, TALK_RANGE = 1.6, BAG_MAX = 12;
const SLIME_HP = 3, SLIME_SPEED = 1.6, SLIME_CHASE = 4, SLIME_DAMAGE = 1, HURT_TIME = 1.2;
const ITEMS = {potion: {kind: 'consumable'}, key: {kind: 'key'}};

const tileAt = (c, r)=> c < 0 || r < 0 || c >= W || r >= H ? '#' : MAP[r][c];
const tileCenter = (c, r)=> vec2(c + .5, H - 1 - r + .5);
function findTiles(ch) { const out = []; MAP.forEach((row, r)=> [...row].forEach((x, c)=> x === ch && out.push(tileCenter(c, r)))); return out; }
const ELDER = {pos: findTiles('E')[0]};

let state = 'title';          // title | play | over
let hero, slimes, pickups, bag, quest, defeated, playTime, inputLockUntil = 0;
// quest: 'none' -> 'find' (accepted) -> 'return' (key in the bag) -> 'done'

///////////////////////////////////////////////////////////////////////////////
// Collision: tiles only (trees and water are solid); bodies are small boxes moved one axis at a time

function solidAt(x, y) { const ch = tileAt(Math.floor(x), H - 1 - Math.floor(y)); return ch === '#' || ch === '~'; }
function blocked(p, r) { return solidAt(p.x - r, p.y - r) || solidAt(p.x + r, p.y - r) || solidAt(p.x - r, p.y + r) || solidAt(p.x + r, p.y + r); }
function moveBody(body, d, r = .3)
{
    const x = vec2(body.pos.x + d.x, body.pos.y);
    if (!blocked(x, r)) body.pos = x;
    const y = vec2(body.pos.x, body.pos.y + d.y);
    if (!blocked(y, r)) body.pos = y;
}

///////////////////////////////////////////////////////////////////////////////
// World setup, saving and loading

function freshWorld()
{
    hero = {pos: findTiles('H')[0], hp: HP_MAX, facing: vec2(0, -1), swing: 0, hurt: 0};
    slimes = findTiles('s').map((p)=> ({pos: p, home: p, hp: SLIME_HP, alive: true, hurt: 0, knock: vec2()}));
    pickups = [...findTiles('k').map((p)=> ({id: 'key', pos: p})), ...findTiles('p').map((p)=> ({id: 'potion', pos: p}))];
    bag = [];
    quest = 'none';
    defeated = 0;
    playTime = 0;
}

function placeKey() { return hero.pos.x > 12 ? 'place.forest' : 'place.village'; }
function getState()
{
    return {hero: {x: hero.pos.x, y: hero.pos.y, hp: hero.hp}, bag: bag.filter(Boolean).map((i)=> ({id: i.id, n: i.n})), quest, defeated, playTime,
        slimes: slimes.map((s)=> ({x: s.pos.x, y: s.pos.y, hp: s.hp, alive: s.alive})), pickups: pickups.map((p)=> ({id: p.id, x: p.pos.x, y: p.pos.y}))};
}
function loadGame(s)
{
    freshWorld();
    hero.pos = vec2(s.hero.x, s.hero.y); hero.hp = s.hero.hp;
    bag = s.bag.map((i)=> ({id: i.id, n: i.n, kind: ITEMS[i.id].kind}));
    quest = s.quest; defeated = s.defeated; playTime = s.playTime;
    s.slimes.forEach((v, i)=> { if (slimes[i]) Object.assign(slimes[i], {pos: vec2(v.x, v.y), hp: v.hp, alive: v.alive}); });
    pickups = s.pickups.map((p)=> ({id: p.id, pos: vec2(p.x, p.y)}));
    startPlay();
}

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> play -> results (quest complete) or game over (HP 0)

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    tutorial();
    const latest = saveLatest();
    showScreen(titleScreen({
        items: [
            {id: 'title-new', t: 'rpg.new_game', onSelect: ()=> { freshWorld(); startPlay(); tutorial('tutorial.move', 'move'); }},
            ...(latest ? [{id: 'title-continue', t: 'rpg.continue', onSelect: ()=> loadGame(latest.value.state)}] : []),
            {id: 'title-load', t: 'title.load', onSelect: ()=> openSaves('load'), disabled: !latest},
            {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
        ],
        detail: latest ? t('title.continue_detail', {place: t(latest.value.place), time: fmtTime(latest.value.playTime)}) : '',
    }));
}

function startPlay()
{
    state = 'play';
    kitPlaying = true;
    tutorial();
    hudInit(`
      <div data-slot="tl" class="game-stack">
        <div class="game-row" role="meter" aria-labelledby="hud-hp-l" aria-valuemin="0" aria-valuemax="${HP_MAX}" aria-valuenow="${HP_MAX}">
          <span class="game-icon" data-kind="heart" aria-hidden="true"></span>
          <span id="hud-hp-l" class="game-small" data-t="hud.hp"></span>
          <span class="game-bar" id="hud-hp" style="--value:1;width:120px"></span>
          <span class="game-num" id="hud-hp-num"></span>
        </div>
      </div>
      <div data-slot="tr" class="game-objective" role="status" id="hud-quest" hidden>
        <span class="game-h" data-t="hud.objective"></span>
        <p class="game-line" style="margin:2px 0 0;font-size:12px" id="hud-quest-text"></p>
      </div>
      <div data-slot="br" class="game-row" id="hud-action" hidden><span data-prompt="confirm"></span><span data-t="prompt.talk"></span></div>`);
    hudObjectiveKey = null;
    showScreen(document.getElementById('hud'));
}

function setQuest(next)
{
    quest = next;
    const key = questText();
    if (key) announce(t('hud.new_objective', {text: t(key)}));
    if (next === 'find') tutorial('rpg.tut_attack', 'fire');
}
function questText() { return {find: 'quest.find_key', return: 'quest.return_key'}[quest] || ''; }

function questComplete()
{
    state = 'over';
    tutorial();
    zzfx(...[.5,,500,.05,.2,.3,1,,,,200,.05]);
    results({title: 'rpg.quest_done', rows: [['rpg.slimes', String(defeated)], ['rpg.time', fmtTime(playTime)]], stars: 3,
        items: [{id: 'res-continue', t: 'rpg.keep_exploring', onSelect: ()=> { state = 'play'; kitPlaying = true; showScreen(document.getElementById('hud')); }},
            {id: 'res-to-title', t: 'gameover.title_screen', onSelect: toTitle}]});
}

function lose()
{
    state = 'over';
    tutorial();
    zzfx(...[.5,,150,.02,.2,.4,,,-5]);
    const latest = saveLatest();
    gameOver({detail: t('rpg.fell', {place: t(placeKey())}), items: [
        {id: 'over-continue', t: 'rpg.continue', disabled: !latest, onSelect: ()=> loadGame(saveLatest().value.state)},
        {id: 'over-title', t: 'gameover.title_screen', onSelect: toTitle}]});
}

///////////////////////////////////////////////////////////////////////////////
// Talking (DialogueBox) and the bag (InventoryGrid)

function hasItem(id) { return bag.some((i)=> i && i.id === id); }
function talk()
{
    const say = (lines, done)=> dialogue(lines.map((l)=> typeof l === 'string' ? {speaker: 'npc.elder', t: l} : {speaker: 'npc.elder', ...l}),
        done);
    if (quest === 'none')
        say(['elder.hello', {t: 'elder.ask', choices: [{t: 'elder.accept', value: 'yes'}, {t: 'elder.decline', value: 'no'}]}],
            (v)=> v === 'yes' ? setQuest(hasItem('key') ? 'return' : 'find') : say(['elder.later']));
    else if (quest === 'find') say(['elder.waiting']);
    else if (quest === 'return')
        say(['elder.thanks', 'elder.reward'], ()=> { bag = bag.filter((i)=> i && i.id !== 'key'); setQuest('done'); questComplete(); });
    else say(['elder.after']);
}

function addToBag(id)
{
    const stack = bag.find((i)=> i && i.id === id && ITEMS[id].kind !== 'key');
    if (stack) return ++stack.n;
    if (bag.filter(Boolean).length >= BAG_MAX) return announce(t('rpg.bag_full')), false;
    const item = {id, n: 1, kind: ITEMS[id].kind}, hole = bag.indexOf(null);
    hole >= 0 ? bag[hole] = item : bag.push(item);
    return true;
}

function openBag()
{
    tutorial();
    const el = openInventory({items: bag, max: BAG_MAX, cols: 6,
        onUse: (item)=>
        {
            if (item.id !== 'potion') return false;
            if (hero.hp >= HP_MAX) { announce(t('rpg.hp_full')); return false; }
            hero.hp = min(HP_MAX, hero.hp + 5);
            zzfx(...[.4,,700,.02,.1,.2,1,,8]);
        },
        onDrop: (item)=> pickups.push({id: item.id, pos: hero.pos, wait: true})});   // back on the ground under the hero
    // the menu action (Tab / I / north) closes the bag again
    el.addEventListener('game:input', (e)=> { if (e.detail.pressed.menu) { e.preventDefault(); el.dispatchEvent(new CustomEvent('game:back')); } });
}

///////////////////////////////////////////////////////////////////////////////
// Play: the hero, combat, slimes and pickups

function attack(input)
{
    if (input.device === 'mouse') hero.facing = input.mouse.pos.subtract(hero.pos).normalize();
    hero.swing = .3;
    tutorial();
    zzfx(...[.3,,300,,.03,.05,4]);
    const center = hero.pos.add(hero.facing.scale(.8));
    for (const s of slimes)
    {
        if (!s.alive || s.pos.distance(center) > 1) continue;
        s.hp--; s.hurt = .2;
        s.knock = s.pos.subtract(hero.pos).normalize(6);
        zzfx(...[.4,,200,,.05,.1,2]);
        if (s.hp <= 0) { s.alive = false; defeated++; pickups.push({id: 'potion', pos: s.pos}); }
    }
}

function updateSlimes()
{
    for (const s of slimes)
    {
        if (!s.alive) continue;
        s.hurt = max(0, s.hurt - timeDelta);
        const toHero = hero.pos.subtract(s.pos), d = toHero.length();
        const homeward = s.home.subtract(s.pos);
        const want = d < SLIME_CHASE ? toHero.normalize(SLIME_SPEED) : homeward.length() > .2 ? homeward.normalize(SLIME_SPEED * .5) : vec2();
        moveBody(s, want.add(s.knock).scale(timeDelta));
        s.knock = s.knock.scale(.85);
        if (d < .75 && hero.hurt <= 0)
        {
            hero.hp = max(0, hero.hp - SLIME_DAMAGE);
            hero.hurt = HURT_TIME;
            moveBody(hero, toHero.normalize(.5));
            zzfx(...[.4,,120,.01,.05,.15,3]);
        }
    }
}

function updatePickups()
{
    for (const p of pickups.slice())
    {
        const d = p.pos.distance(hero.pos);
        if (p.wait) { if (d > 1.2) p.wait = false; continue; }   // a dropped item waits until the hero steps away
        if (d > .7 || !addToBag(p.id)) continue;
        pickups.splice(pickups.indexOf(p), 1);
        announce(t('rpg.picked', {item: t('item.' + p.id)}));
        zzfx(...[.3,,900,,.04,.1,1]);
        if (p.id === 'key' && quest === 'find') setQuest('return');
        if (p.id === 'potion' && !tutorialArgs) tutorial('rpg.tut_bag', 'menu');
    }
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'fire', 'confirm', 'menu']);
    pauseMenu({onQuit: toTitle, onSave: true});
    savesInit({getState, place: placeKey, onLoad: loadGame});
    touchControls({stick: true, buttons: [{action: 'menu', label: 'menu.items'}, {action: 'confirm', label: 'prompt.talk'}, {action: 'fire', label: 'prompt.attack'}]});
    freshWorld();
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    // the click or key that closed a menu (Resume, a dialogue choice, Keep Exploring) must not also talk or attack
    if (state !== 'play' || menuOpen()) { inputLockUntil = timeReal + .2; return; }
    if (input.pressed.pause) return openPause();
    if (input.pressed.menu) return openBag();
    playTime += timeDelta;

    let move = vec2(input.moveX, input.moveY);
    if (move.length() > 1) move = move.normalize();
    if (move.length() > .2) { hero.facing = move.normalize(); if (tutorialArgs && tutorialArgs[1] === 'move') tutorial(); }
    moveBody(hero, move.scale(HERO_SPEED * timeDelta));
    hero.swing = max(0, hero.swing - timeDelta);
    hero.hurt = max(0, hero.hurt - timeDelta);

    const near = hero.pos.distance(ELDER.pos) < TALK_RANGE;
    if (input.pressed.confirm && near && timeReal > inputLockUntil) return talk();
    if (input.pressed.fire && !near && hero.swing <= 0 && timeReal > inputLockUntil) attack(input);
    updateSlimes();
    updatePickups();
    if (hero.hp <= 0) lose();
}

let hudObjectiveKey = null;
function gameUpdatePost()
{
    // zoom so about 18 x 12 tiles show, then follow the hero without leaving the map
    cameraScale = min(mainCanvasSize.x / 18, mainCanvasSize.y / 12);
    const half = mainCanvasSize.scale(.5 / cameraScale);
    const follow = (v, size, h)=> size <= h * 2 ? size / 2 : clamp(v, h, size - h);
    cameraPos = state === 'title' ? vec2(W / 2, H / 2) : vec2(follow(hero.pos.x, W, half.x), follow(hero.pos.y, H, half.y));

    const tip = document.getElementById('tutorial');
    if (tip) tip.hidden = menuOpen();
    if (state !== 'play' && state !== 'over') return;
    hudBar('hud-hp', hero.hp, HP_MAX);
    hudText('hud-hp-num', hero.hp + '/' + HP_MAX);
    const key = questText();
    if (key !== hudObjectiveKey)
    {
        hudObjectiveKey = key;
        const text = document.getElementById('hud-quest-text');
        if (text) { text.dataset.t = key; text.textContent = key ? t(key) : ''; }
        document.getElementById('hud-quest').hidden = !key;
    }
    const action = document.getElementById('hud-action'), near = hero.pos.distance(ELDER.pos) < TALK_RANGE;
    if (action && action.hidden === near) action.hidden = !near;
}

function drawMapTile(c, r)
{
    const ch = MAP[r][c], p = tileCenter(c, r);
    const grass = (c + r) % 2 ? hsl(.28, .45, .42) : hsl(.28, .45, .45);
    if (ch === '~')
    {
        drawRect(p, vec2(1), hsl(.58, .6, .45));
        drawRect(p.add(vec2(Math.sin(time * 2 + c) * .2, .1)), vec2(.5, .06), hsl(.58, .6, .7));
        return;
    }
    drawRect(p, vec2(1), ch === ',' ? hsl(.1, .35, .6) : grass);
    if (ch === '#')
    {
        drawRect(p.add(vec2(0, -.3)), vec2(.2, .4), hsl(.07, .5, .3));
        drawCircle(p.add(vec2(0, .1)), .9, hsl(.33, .5, .25));
    }
}

function drawPerson(pos, body, head)
{
    drawEllipse(pos.add(vec2(0, -.35)), vec2(.6, .2), hsl(0, 0, 0, .25));
    drawEllipse(pos.add(vec2(0, -.1)), vec2(.55, .6), body);
    drawCircle(pos.add(vec2(0, .3)), .4, head);
}

function gameRender()
{
    for (let r = 0; r < H; ++r) for (let c = 0; c < W; ++c) drawMapTile(c, r);
    if (state === 'title') return;

    for (const p of pickups)
    {
        const bob = vec2(0, Math.sin(time * 4) * .05);
        if (p.id === 'key') { drawCircle(p.pos.add(bob).add(vec2(-.15, 0)), .3, hsl(.13, .9, .55)); drawRect(p.pos.add(bob).add(vec2(.15, 0)), vec2(.4, .1), hsl(.13, .9, .55)); }
        else { drawCircle(p.pos.add(bob), .4, hsl(0, .75, .55)); drawRect(p.pos.add(bob).add(vec2(0, .25)), vec2(.14, .16), hsl(0, 0, .85)); }
    }

    drawPerson(ELDER.pos, hsl(.78, .4, .45), hsl(.08, .5, .75));
    if (quest === 'none' || quest === 'return')   // a "!" made of two shapes over the elder
    {
        drawRect(ELDER.pos.add(vec2(0, 1.05)), vec2(.12, .35), hsl(.13, .9, .6));
        drawRect(ELDER.pos.add(vec2(0, .78)), vec2(.12, .1), hsl(.13, .9, .6));
    }

    for (const s of slimes)
    {
        if (!s.alive) continue;
        const squash = 1 + Math.sin(time * 6 + s.home.x) * .08;
        drawEllipse(s.pos.add(vec2(0, -.1)), vec2(.8 * squash, .6 / squash), s.hurt > 0 ? WHITE : hsl(.38, .7, .5));
        drawCircle(s.pos.add(vec2(-.15, 0)), .1, BLACK); drawCircle(s.pos.add(vec2(.15, 0)), .1, BLACK);
        if (s.hp < SLIME_HP)   // the slime's health as two bars, no numbers
        {
            drawRect(s.pos.add(vec2(0, .45)), vec2(.8, .1), hsl(0, .6, .3));
            drawRect(s.pos.add(vec2(-.4 + .4 * s.hp / SLIME_HP, .45)), vec2(.8 * s.hp / SLIME_HP, .1), hsl(.33, .7, .5));
        }
    }

    if (!(hero.hurt > 0 && Math.floor(time * 10) % 2))   // blink while hurt
        drawPerson(hero.pos, hsl(.6, .6, .5), hsl(.08, .5, .75));
    if (hero.swing > 0)
    {
        const tip = hero.pos.add(hero.facing.scale(1.1)), side = vec2(-hero.facing.y, hero.facing.x).scale((hero.swing - .15) * 3);
        drawLine(hero.pos.add(hero.facing.scale(.3)), tip.add(side), .12, hsl(0, 0, .9));
    }
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
