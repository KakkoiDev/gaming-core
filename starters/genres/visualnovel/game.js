/*
    Lantern Lane: a short visual novel (designer card GameVisualNovel).
    The story is data (SCENES): each scene has a background, a cast, lines with speakers, and either a `next`
    scene, choices on its last line (set flags, jump to a scene) or an `ending`. No game over: endings complete it.
    The kit's DialogueBox shows the lines (typing, Next, choices); SaveSlots keep scene + line + flags;
    the canvas draws the backgrounds and character silhouettes with shapes only. Every word is kit HTML.

    Add a scene: one entry in SCENES and its texts (s.<scene>.<n>) in both languages in GAME_TEXTS.
    Add a route: a choice with `set: {flag: true}`, a line with `if: 'flag'`, or a new ending entry in ENDINGS.
*/
'use strict';

///////////////////////////////////////////////////////////////////////////////
// Texts: the card's keys, the story, both languages

const GAME_TEXTS = {
    en: {'game.name': 'Lantern Lane', 'vn.title': 'Lantern Lane', 'vn.start': 'Start', 'vn.continue': 'Continue',
        'vn.endings': 'Endings', 'box.log': 'Log', 'box.auto': 'Auto', 'box.skip': 'Skip', 'box.save': 'Save', 'box.menu': 'Menu',
        'ending.card': 'Ending {n} of {total}: {name}', 'vn.choices_made': 'Choices made', 'vn.endings_found': 'Endings found',
        'vn.locked': '???', 'vn.log_empty': 'Nothing said yet.', 'game.close': 'Close',
        'action.confirm': 'Next line', 'action.log': 'Log', 'action.auto': 'Auto',
        'vn.who.mika': 'Mika', 'vn.who.keeper': 'Keeper',
        'vn.place.lane': 'Lantern Lane', 'vn.place.river': 'The River', 'vn.place.dawn': 'Lane at Dawn',
        'end.1': 'The River Lights', 'end.1.hint': 'Let the river carry it.',
        'end.2': 'The Lane at Dawn', 'end.2.hint': 'Bring it home.',
        's.lane.1': 'The festival lanterns of Lantern Lane flicker on, one by one.',
        's.lane.2': 'You came! I was starting to think you had forgotten.',
        's.lane.3': 'Tonight the Keeper lights the last lantern. Everyone makes a wish.',
        's.lane.4': 'At the end of the lane, an old woman waves a long brass pole.',
        's.keeper.1': 'You two! My hands are slow tonight, and one lantern is missing.',
        's.keeper.2': 'Missing? The wish lantern?',
        's.keeper.3': 'Help an old woman, or go looking. Your choice.',
        'c.help': 'Help light the lanterns', 'c.search': 'Look for the missing lantern',
        's.lighting.1': 'You lift the pole. Lantern after lantern glows warm and gold.',
        's.lighting.2': 'Steady hands. The missing one floated down to the river, I think.',
        's.search.1': 'You peer under stalls and behind barrels. Mika finds a trail of wax.',
        's.search.2': 'It leads down to the river. Come on!',
        's.river.1': 'The river is dark and still. A single lantern bobs at the edge.',
        's.river.2': 'Your hands smell of lamp oil. The Keeper will be proud.',
        's.river.3': 'We found it! The detectives of Lantern Lane.',
        's.river.4': 'Do we send it down the river with a wish, or carry it back?',
        'c.release': 'Release it on the river', 'c.carry': 'Carry it back to the lane',
        's.endA.1': 'The lantern drifts away, and the whole river lights up behind it.',
        's.endA.2': 'I will not tell you my wish. But I think it already came true.',
        's.endB.1': 'You hang the lantern back in its place as the sky turns pale.',
        's.endB.2': 'The lane is whole again. Come back next year, you two.'},
    ja: {'game.name': 'ランタン横丁', 'vn.title': 'ランタン横丁', 'vn.start': 'はじめる', 'vn.continue': 'つづきから',
        'vn.endings': 'エンディング', 'box.log': 'ログ', 'box.auto': 'オート', 'box.skip': 'スキップ', 'box.save': 'セーブ', 'box.menu': 'メニュー',
        'ending.card': 'エンディング {n} / {total}：{name}', 'vn.choices_made': '選んだ選択肢', 'vn.endings_found': '見つけたエンディング',
        'vn.locked': '？？？', 'vn.log_empty': 'まだ何も話していません。', 'game.close': '閉じる',
        'action.confirm': '次の行へ', 'action.log': 'ログ', 'action.auto': 'オート',
        'vn.who.mika': 'ミカ', 'vn.who.keeper': '灯守り',
        'vn.place.lane': 'ランタン横丁', 'vn.place.river': '川辺', 'vn.place.dawn': '夜明けの横丁',
        'end.1': '川の灯り', 'end.1.hint': '川に運んでもらおう。',
        'end.2': '夜明けの横丁', 'end.2.hint': '家に持ち帰ろう。',
        's.lane.1': 'ランタン横丁の祭りの灯りが、ひとつ、またひとつと灯っていく。',
        's.lane.2': '来てくれた！忘れてるのかと思ったよ。',
        's.lane.3': '今夜は灯守りさんが最後のランタンを灯すの。みんな願いごとをするんだよ。',
        's.lane.4': '横丁の奥で、おばあさんが長い真鍮の竿を振っている。',
        's.keeper.1': 'そこのふたり！今夜は手が遅くてね、それにランタンがひとつ足りないんだよ。',
        's.keeper.2': '足りない？願いのランタンが？',
        's.keeper.3': '年寄りを手伝うか、探しに行くか。好きにおし。',
        'c.help': '灯りをともすのを手伝う', 'c.search': 'なくなったランタンを探す',
        's.lighting.1': '竿を持ち上げる。ランタンが次々と、あたたかな金色に光る。',
        's.lighting.2': 'いい手つきだ。なくなったのは川へ流れていったんだろうね。',
        's.search.1': '屋台の下や樽の陰をのぞく。ミカがろうのしずくの跡を見つけた。',
        's.search.2': '川のほうへ続いてる。行こう！',
        's.river.1': '川は暗く静かだ。ほとりにランタンがひとつ揺れている。',
        's.river.2': '手からランプの油のにおいがする。灯守りさん、きっと喜ぶよ。',
        's.river.3': '見つけた！わたしたち、ランタン横丁の探偵だね。',
        's.river.4': '願いをこめて川に流す？それとも持って帰る？',
        'c.release': '川に流して願う', 'c.carry': '横丁へ持ち帰る',
        's.endA.1': 'ランタンが流れていくと、その後ろで川じゅうが光りだした。',
        's.endA.2': '願いごとは内緒。でも、もう叶った気がする。',
        's.endB.1': '空が白むころ、ランタンを元の場所に掛け直した。',
        's.endB.2': 'これで横丁は元どおり。また来年もおいで、ふたりとも。'},
};

// the game's own actions on top of gaming-core's; `confirm` (Enter, Space, click, south) is Next line in the box
const GAME_ACTIONS = {log: ['key:KeyL', 'pad:3'], auto: ['key:KeyA', 'pad:2']};

///////////////////////////////////////////////////////////////////////////////
// The story: scenes of lines. speaker: a key under vn.who.*; if: a flag the line needs; choices on a last line.

const SCENES = {
    lane: {place: 'vn.place.lane', bg: 'lane', cast: [{id: 'mika', x: 0}], next: 'keeper', lines: [
        {t: 's.lane.1'}, {speaker: 'mika', t: 's.lane.2'}, {speaker: 'mika', t: 's.lane.3'}, {t: 's.lane.4'}]},
    keeper: {place: 'vn.place.lane', bg: 'lane', cast: [{id: 'mika', x: -1}, {id: 'keeper', x: 1}], lines: [
        {speaker: 'keeper', t: 's.keeper.1'}, {speaker: 'mika', t: 's.keeper.2'},
        {speaker: 'keeper', t: 's.keeper.3', choices: [
            {t: 'c.help', set: {helped: true}, go: 'lighting'},
            {t: 'c.search', set: {searched: true}, go: 'search'}]}]},
    lighting: {place: 'vn.place.lane', bg: 'lane', cast: [{id: 'mika', x: -1}, {id: 'keeper', x: 1}], next: 'river', lines: [
        {t: 's.lighting.1'}, {speaker: 'keeper', t: 's.lighting.2'}]},
    search: {place: 'vn.place.lane', bg: 'lane', cast: [{id: 'mika', x: 0}], next: 'river', lines: [
        {t: 's.search.1'}, {speaker: 'mika', t: 's.search.2'}]},
    river: {place: 'vn.place.river', bg: 'river', cast: [{id: 'mika', x: 0}], lines: [
        {t: 's.river.1'}, {speaker: 'mika', t: 's.river.2', if: 'helped'}, {speaker: 'mika', t: 's.river.3', if: 'searched'},
        {speaker: 'mika', t: 's.river.4', choices: [
            {t: 'c.release', go: 'endA'},
            {t: 'c.carry', go: 'endB'}]}]},
    endA: {place: 'vn.place.river', bg: 'river', cast: [{id: 'mika', x: 0}], ending: 1, lines: [
        {t: 's.endA.1'}, {speaker: 'mika', t: 's.endA.2'}]},
    endB: {place: 'vn.place.dawn', bg: 'dawn', cast: [{id: 'mika', x: -1}, {id: 'keeper', x: 1}], ending: 2, lines: [
        {t: 's.endB.1'}, {speaker: 'keeper', t: 's.endB.2'}]},
};
const FIRST_SCENE = 'lane';
const ENDINGS = [1, 2];                                   // texts end.<n> and end.<n>.hint
const ENDINGS_KEY = GAME_ID + '.endings';                 // unlocked endings, kept across plays

// how each character looks: coat hue, hair lightness, hair style
const CAST = {
    mika: {hue: .95, sat: .55, hair: .18, bun: false, height: 15},
    keeper: {hue: .08, sat: .35, hair: .62, bun: true, height: 14},
};

///////////////////////////////////////////////////////////////////////////////
// State (top-level so tests and extensions can read it)

const VIEW_H = 20;          // world units shown top to bottom; the width follows the window (portrait or landscape)
let state = 'title';        // title | fade | play | ending
let scene = FIRST_SCENE;    // the scene id being shown
let lineOffset = 0;         // the dialogue started at this line of the scene (after a load)
let flags = {};             // set by choices, read by `if` lines
let logLines = [];          // the log: [{s: speaker key, t: text key}] and [{choice: text key}], the last 200
let choicesMade = 0;
let auto = false, autoFullAt = 0;
let fade = 0;               // 1 = black, eases to 0 when a scene opens
let transitionToken = 0;    // a stale scene change (quit to title meanwhile) does nothing

function sceneLines(id) { return SCENES[id].lines.filter(l=> !l.if || flags[l.if]); }
function currentLine() { return lineOffset + (dialogueState ? max(0, dialogueState.i) : 0); }
function unlockedEndings() { return readSaveData(ENDINGS_KEY, {list: []}).list || []; }

///////////////////////////////////////////////////////////////////////////////
// Scenes: open one (with a short fade), show its lines in the DialogueBox, follow the choice or `next`

function goScene(id, line = 0)
{
    const token = ++transitionToken;
    state = 'fade';
    fade = 1;
    kitAfter(.35, ()=> { if (token === transitionToken && state === 'fade') openScene(id, line); });
}

function openScene(id, line)
{
    scene = id;
    const lines = sceneLines(id);
    lineOffset = clamp(line, 0, lines.length - 1);
    state = 'play';
    kitPlaying = true;
    autoFullAt = 0;
    const el = dialogue(lines.slice(lineOffset).map(l=> ({speaker: l.speaker && 'vn.who.' + l.speaker, t: l.t,
        choices: l.choices && l.choices.map((c, n)=> ({t: c.t, value: n}))})), (value)=> sceneDone(id, lines, value));
    addBoxControls(el);
    saveWrite('auto', saveState(), SCENES[id].place);   // Continue on the title picks the newest save
}

function sceneDone(id, lines, value)
{
    const data = SCENES[id];
    logLines.push(...lines.map(l=> ({s: l.speaker || '', t: l.t})));
    const last = lines[lines.length - 1];
    if (last.choices && value !== undefined)
    {
        const choice = last.choices[value];
        logLines.push({choice: choice.t});
        Object.assign(flags, choice.set || {});
        choicesMade++;
        zzfx(...[.3,,700,,.02,.08]);
        logLines = logLines.slice(-200);
        return goScene(choice.go);
    }
    logLines = logLines.slice(-200);
    if (data.ending) return showEnding(data.ending);
    goScene(data.next);
}

function showEnding(n)
{
    state = 'ending';
    kitPlaying = false;
    const list = unlockedEndings();
    if (!list.includes(n)) writeSaveData(ENDINGS_KEY, {list: [...list, n].sort()});
    try { localStorage.removeItem(GAME_ID + '.save.auto'); } catch {}   // finished: Continue goes back to a manual save
    showScreen(hudInit(''));
    results({title: 'ending.card', titleVars: {n, total: ENDINGS.length, name: t('end.' + n)},
        rows: [['vn.choices_made', String(choicesMade)], ['vn.endings_found', unlockedEndings().length + ' / ' + ENDINGS.length]],
        items: [{id: 'ending-title', t: 'gameover.title_screen', onSelect: toTitle}]});
}

///////////////////////////////////////////////////////////////////////////////
// The row on the box: Log · Auto · Save · Menu (plain buttons, outside the box's focus order; keys do the same)

function addBoxControls(el)
{
    const row = h(`<div class="game-row" id="vn-box" style="justify-content:flex-end;gap:4px;margin-top:4px">
      <button class="game-tab" data-box="log" style="color:var(--g-ink)" data-t="box.log"></button>
      <button class="game-tab" data-box="auto" style="color:var(--g-ink)" aria-pressed="${auto}" aria-selected="${auto}" data-t="box.auto"></button>
      <button class="game-tab" data-box="save" style="color:var(--g-ink)" data-t="box.save"></button>
      <button class="game-tab" data-box="menu" style="color:var(--g-ink)" data-t="box.menu"></button></div>`);
    el.querySelector('.game-panel').appendChild(row);
    applyTexts(row);
    const act = {log: openLog, auto: toggleAuto, save: ()=> openSaves('save'), menu: ()=> openPause()};
    row.querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=> { gameBox.focus({preventScroll: true}); act[b.dataset.box](); }));
}

function toggleAuto()
{
    auto = !auto;
    autoFullAt = 0;
    const b = document.querySelector('#vn-box [data-box="auto"]');
    if (b) { b.setAttribute('aria-pressed', auto); b.setAttribute('aria-selected', auto); }
}

// Auto: a fully typed line without choices advances after a pause based on its length
function autoUpdate()
{
    const d = dialogueState;
    if (!auto || !d || topScreen() !== d.el) return;
    const line = d.lines[d.i];
    if (!line || line.choices || d.shown < d.text.length) return void (autoFullAt = 0);
    if (!autoFullAt) autoFullAt = timeReal;
    if (timeReal - autoFullAt > 1 + d.text.length * .03) { autoFullAt = 0; d.el.querySelector('.game-panel').click(); }
}

///////////////////////////////////////////////////////////////////////////////
// Log (backlog): the last 200 lines with speakers, choices marked; ↑ ↓ scroll it, back or L closes it

function openLog()
{
    const now = sceneLines(scene).slice(0, currentLine() + 1).map(l=> ({s: l.speaker || '', t: l.t}));
    const entries = [...logLines, ...now].slice(-200);
    const el = kitSection('backlog', `
<section id="backlog" class="game-overlay" role="dialog" aria-modal="true" aria-labelledby="log-title" hidden>
  <div class="game-panel" style="width:min(620px,100%);display:grid;gap:10px">
    <h2 id="log-title" class="game-h" data-t="box.log"></h2>
    <ul class="game-list" style="max-height:55vh;overflow:auto">${entries.length ? entries.map(e=> e.choice ?
        `<li tabindex="-1" data-choice style="color:var(--g-accent)">▶ ${esc(t(e.choice))}</li>` :
        `<li tabindex="-1"><span>${e.s ? `<span class="game-small">${esc(t('vn.who.' + e.s))}</span><br>` : ''}${esc(t(e.t))}</span></li>`).join('') :
        `<li tabindex="-1" data-t="vn.log_empty"></li>`}</ul>
    <ul class="game-menu"><li><button class="game-btn" id="log-close" data-t="game.close"></button></li></ul>
    <p class="game-hint">${hint('back', 'game.back')}</p>
  </div>
</section>`);
    const close = ()=> closeScreen(el);
    el.querySelector('#log-close').addEventListener('click', close);
    el.addEventListener('game:back', close);
    openScreen(el);
    const items = el.querySelectorAll('.game-list > li');
    items[items.length - 1].focus({preventScroll: true});
    items[items.length - 1].scrollIntoView({block: 'end'});
}

///////////////////////////////////////////////////////////////////////////////
// Saves: scene + line + flags (+ the log); the place shown in a slot is the scene's place

function saveState() { return {scene, line: currentLine(), flags: {...flags}, log: logLines.slice(-200), choicesMade}; }

function loadState(saved)
{
    if (!saved || !SCENES[saved.scene]) return;
    flags = {...saved.flags};
    logLines = saved.log || [];
    choicesMade = saved.choicesMade || 0;
    beginPlay();
    goScene(saved.scene, saved.line || 0);
}

///////////////////////////////////////////////////////////////////////////////
// Endings list (title): unlocked names, ??? with a hint for the rest

function openEndings()
{
    const found = unlockedEndings();
    const el = kitSection('endings', `
<section id="endings" class="game-overlay" role="dialog" aria-modal="true" aria-labelledby="endings-title" hidden>
  <div class="game-panel" style="width:min(480px,100%);display:grid;gap:10px">
    <h2 id="endings-title" class="game-h" data-t="vn.endings"></h2>
    <ul class="game-list">${ENDINGS.map(n=> `<li tabindex="-1" data-ending="${n}" ${found.includes(n) ? 'data-found' : ''}><span style="flex:1">${n}. ${
        found.includes(n) ? esc(t('end.' + n)) : `${esc(t('vn.locked'))}<br><span class="game-small">${esc(t('end.' + n + '.hint'))}</span>`}</span></li>`).join('')}</ul>
    <ul class="game-menu"><li><button class="game-btn" id="endings-close" data-t="game.close" autofocus></button></li></ul>
  </div>
</section>`);
    const close = ()=> closeScreen(el);
    el.querySelector('#endings-close').addEventListener('click', close);
    el.addEventListener('game:back', close);
    openScreen(el);
}

///////////////////////////////////////////////////////////////////////////////
// Flow: title -> scenes -> an ending (results) -> title

function toTitle()
{
    state = 'title';
    kitPlaying = false;
    ++transitionToken;
    auto = false;
    dialogueState = null;                      // the kit's DialogueBox, ended without its callback
    document.getElementById('dialogue')?.remove();
    const latest = saveLatest();
    const anySlot = [1, 2, 3].some(n=> { const s = saveRead(n); return s && !s.broken; });
    showScreen(titleScreen({items: [
        {id: 'title-new', t: 'vn.start', onSelect: newGame},
        {id: 'title-continue', t: 'vn.continue', onSelect: ()=> loadState(saveLatest()?.value.state), hiddenItem: !latest, autofocus: !!latest},
        {id: 'title-load', t: 'title.load', onSelect: ()=> openSaves('load'), disabled: !anySlot},
        {id: 'title-endings', t: 'vn.endings', onSelect: openEndings},
        {id: 'title-settings', t: 'title.settings', onSelect: openSettings},
    ], detail: latest ? t('title.continue_detail', {place: t(latest.value.place), time: fmtTime(latest.value.playTime)}) : ''}));
}

function beginPlay()
{
    showScreen(hudInit(''));                   // nothing over the scene but the dialogue box
    kitPlaying = true;
}

function newGame()
{
    flags = {};
    logLines = [];
    choicesMade = 0;
    beginPlay();
    goScene(FIRST_SCENE);
}

///////////////////////////////////////////////////////////////////////////////
// Drawing: backgrounds and silhouettes, shapes only

function halfWidth() { return mainCanvasSize.x / cameraScale / 2; }

function drawLanterns(y, hw, glow)
{
    drawLine(vec2(-hw - 1, y + .6), vec2(hw + 1, y + .6), .06, hsl(0, 0, .1));
    for (let x = -hw + 1, i = 0; x < hw; x += 2.4, ++i)
    {
        const flicker = .85 + .15 * Math.sin(time * 3 + i * 1.3);
        drawCircle(vec2(x, y), 1.3, hsl(.1, 1, .65, .1 * glow * flicker));
        drawCircle(vec2(x, y), .9, hsl(.1, 1, .65, .16 * glow * flicker));
        drawEllipse(vec2(x, y), vec2(.45, .6), hsl(i % 3 ? .02 : .1, .85, .45 + .15 * glow * flicker));
    }
}

function drawBackground(bg)
{
    const hw = halfWidth(), w = hw * 2 + 2;
    if (bg === 'river')
    {
        drawRect(vec2(0, 2), vec2(w, 18), hsl(.66, .45, .1));
        drawCircle(vec2(hw * .5, 7), 2.4, hsl(.15, .4, .85));
        drawRect(vec2(0, -1), vec2(w, 1.2), hsl(.66, .3, .05));           // far bank
        drawRect(vec2(0, -6), vec2(w, 9), hsl(.62, .5, .16));             // water
        for (let i = 0; i < 9; ++i)
            drawRect(vec2(((i * 3.7 + time * .4) % w) - w / 2, -2.5 - i * .7), vec2(1.5, .06), hsl(.6, .4, .4, .5));
        const lights = scene === 'endA' && state !== 'title' ? 14 : 1;    // the ending fills the river
        for (let i = 0; i < lights; ++i)
        {
            const p = vec2(((i * 2.9 + time * .3 * (i ? 1 : 0)) % w) - w / 2 + (i ? 0 : hw * .45), -3 - (i % 4) * .9 + Math.sin(time * 2 + i) * .1);
            drawCircle(p, .9, hsl(.1, 1, .65, .18));
            drawEllipse(p, vec2(.45, .55), hsl(.07, .9, .6));
        }
        return;
    }
    const dawn = bg === 'dawn';
    drawRect(vec2(0, 2), vec2(w, 18), dawn ? hsl(.04, .6, .62) : hsl(.68, .5, .12));
    if (dawn) drawRect(vec2(0, 8), vec2(w, 6), hsl(.6, .35, .7));
    for (let i = -8; i <= 8; ++i)                                         // houses along the lane
    {
        const x = i * 3.4, hgt = 7 + 2.5 * (.5 + .5 * Math.sin(i * 1.7));
        if (abs(x) > hw + 2) continue;
        drawRect(vec2(x, -10 + hgt / 2 + 2), vec2(3.2, hgt), dawn ? hsl(.02, .25, .35) : hsl(.7, .3, .07));
        drawPoly([vec2(-1.9, 0), vec2(1.9, 0), vec2(0, 1.4)], dawn ? hsl(.0, .3, .28) : hsl(.7, .25, .05), 0, undefined, vec2(x, -8 + hgt));
        for (let k = 0; k < 2; ++k) drawRect(vec2(x - .7 + k * 1.4, -10 + hgt + .5), vec2(.6, .8), hsl(.12, .8, dawn ? .55 : .6, dawn ? .3 : .8));
    }
    drawRect(vec2(0, -9), vec2(w, 4), dawn ? hsl(.05, .2, .4) : hsl(.66, .2, .1));   // the lane
    drawLanterns(7, hw, dawn ? .3 : 1);
}

// a character: coat, head, hair; the speaker at full colour, the others one step dimmer
function drawCharacter(id, slot, speaking)
{
    const c = CAST[id], hw = halfWidth(), x = slot * min(hw * .55, 5.5), dim = speaking ? 1 : .6;
    const feet = -VIEW_H / 2, top = feet + c.height, bob = speaking ? Math.sin(time * 4) * .05 : 0;
    const coat = hsl(c.hue, c.sat, .45 * dim), skin = hsl(.07, .4, .7 * dim), hair = hsl(.05, .2, c.hair * dim);
    drawPoly([vec2(-2.4, 0), vec2(2.4, 0), vec2(1.4, c.height - 3.4), vec2(-1.4, c.height - 3.4)], coat, 0, undefined, vec2(x, feet + bob));
    drawRect(vec2(x, top - 3.2 + bob), vec2(.7, .8), skin);                                   // neck
    drawCircle(vec2(x, top - 1.6 + bob), 2.6, skin);                                          // head
    drawEllipse(vec2(x, top - .8 + bob), vec2(1.45, .9), hair);                               // hair
    if (c.bun) drawCircle(vec2(x, top + .1 + bob), .8, hair);
    else drawRect(vec2(x - 1.1, top - 2 + bob), vec2(.5, 2), hair), drawRect(vec2(x + 1.1, top - 2 + bob), vec2(.5, 2), hair);
    for (const e of [-.45, .45]) drawCircle(vec2(x + e, top - 1.7 + bob), .22, hsl(0, 0, .1));
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['confirm', 'log', 'auto']);
    pauseMenu({onQuit: toTitle, onSave: true});
    savesInit({getState: saveState, place: ()=> SCENES[scene].place, onLoad: loadState});
    toTitle();
}

function gameUpdate()
{
    const input = gameInput();
    // the box's own keys while it is open (the DialogueBox reads confirm, choices and pause itself)
    if (state === 'play' && !paused)
    {
        const top = topScreen();
        if (input.pressed.log && top && top.id === 'dialogue') openLog();
        else if (input.pressed.log && top && top.id === 'backlog') closeScreen(top);
        if (input.pressed.auto && top && top.id === 'dialogue') toggleAuto();
        autoUpdate();
    }
    if (state !== 'play' || menuOpen()) return;
    if (input.pressed.pause) return openPause();
}

function gameUpdatePost()
{
    cameraScale = mainCanvasSize.y / VIEW_H;    // the whole height fits; a portrait window shows the centre
    cameraPos = vec2(0, 0);
    if (state === 'play' && !paused) fade = max(0, fade - timeDelta * 3);
}

function gameRender()
{
    if (state === 'title') return drawBackground('lane');
    const data = SCENES[scene];
    drawBackground(data.bg);
    const line = dialogueState && dialogueState.lines[dialogueState.i];
    const speaker = line && line.speaker && line.speaker.replace('vn.who.', '');
    for (const c of data.cast) drawCharacter(c.id, c.x, !line || speaker === c.id);
}

function gameRenderPost()
{
    const darkness = state === 'fade' ? 1 : fade;
    if (darkness > 0) drawRect(vec2(0, 0), vec2(halfWidth() * 2 + 2, VIEW_H + 2), rgb(0, 0, 0, darkness));
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
