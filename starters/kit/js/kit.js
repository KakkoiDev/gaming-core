/*
    gaming-core game kit: the designer's game blocks (GameKit cards) as small builders over the HTML layer.
    Load order: js/littlejs.js, js/gc-input.js (gaming-core input), js/messages.js, js/input.js, js/menu.js, js/kit.js, game.js.

    In game.js:
        function gameInit() { kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS}); ... showScreen(titleScreen({...})); }
        function gameUpdate() { const input = gameInput(); if (state !== 'play' || menuOpen()) return; ... }
    The kit reads input every tick itself (menus, dialogue, ControlsRemap), paused ticks included.

    Blocks: titleScreen, hudInit/hudText/hudBar, openPause (PauseMenu), openSettings (GameSettings), openControls
    (ControlsRemap), confirmDialog, dialogue (DialogueBox), openInventory (InventoryGrid), openSaves (SaveSlots),
    handHTML (CardHand), gameOver (GameOver), results + highScores (ResultsScores), tutorial (TutorialPrompt),
    touchControls (TouchControls). Every text is a key in js/messages.js or the game's own messages, English and Japanese.
*/
'use strict';

///////////////////////////////////////////////////////////////////////////////
// Settings and texts

debugWatermark = false;   // no FPS corner over the HUD
debugKey = 'Backquote';   // Esc is pause and back, so ` opens the LittleJS debug overlay

const SETTINGS_KEY = GAME_ID + '.settings';
const settings = Object.assign({v: 1, lang: /^ja/i.test(navigator.language || '') ? 'ja' : 'en', music: .8, sfx: 1, muteBackground: false,
    fullscreen: false, scale: 'auto', reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, textSize: 'normal'},
    readSaveData(SETTINGS_KEY, {}));
if (!GAME_MESSAGES[settings.lang]) settings.lang = 'en';
function saveSettings() { return writeSaveData(SETTINGS_KEY, settings); }

function addMessages(messages = {})
{
    for (const lang in messages) GAME_MESSAGES[lang] = Object.assign(GAME_MESSAGES[lang] || {}, messages[lang]);
}

// t('pause.saved', {slot: 2}) -> 'Saved to slot 2.' in the current language (English, then the key, when missing)
function t(key, vars)
{
    const text = (GAME_MESSAGES[settings.lang] || {})[key] ?? GAME_MESSAGES.en[key] ?? key;
    return vars ? String(text).replace(/\{(\w+)\}/g, (m, name)=> vars[name] ?? m) : text;
}

function esc(text) { return String(text).replace(/[&<>"]/g, (c)=> ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]); }

// one element from markup
function h(html)
{
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
}

// fill [data-t] (text, with JSON data-t-vars) and [data-t-label] (aria-label) under root, then the prompts
function applyTexts(root = document)
{
    document.documentElement.lang = settings.lang;
    document.documentElement.dataset.textSize = settings.textSize;
    for (const e of root.querySelectorAll('[data-t]'))
        e.textContent = t(e.dataset.t, e.dataset.tVars ? JSON.parse(e.dataset.tVars) : undefined);
    for (const e of root.querySelectorAll('[data-t-label]'))
        e.setAttribute('aria-label', t(e.dataset.tLabel, e.dataset.tVars ? JSON.parse(e.dataset.tVars) : undefined));
    renderPrompts(root);
}

function setLang(lang)
{
    settings.lang = GAME_MESSAGES[lang] ? lang : 'en';
    saveSettings();
    applyTexts();
    document.dispatchEvent(new CustomEvent('game:lang', {detail: settings.lang}));
}

// numbers with the language's grouping
function fmt(n) { return Number(n).toLocaleString(settings.lang); }
function fmtTime(seconds) { seconds = Math.max(0, Math.floor(seconds)); return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0'); }

// screen readers: at most one message a second
let liveAt = 0, liveQueue = '';
function announce(text)
{
    const live = document.getElementById('live');
    if (!live) return;
    const now = performance.now();
    if (now - liveAt < 1000) { liveQueue = text; return; }
    liveAt = now; live.textContent = text;
}

///////////////////////////////////////////////////////////////////////////////
// Prompts: <span data-prompt="jump"></span> shows the input for the device in use

function renderPrompts(root = document)
{
    for (const e of root.querySelectorAll('[data-prompt]')) e.innerHTML = promptHTML(e.dataset.prompt);
}

// a hint row: the prompt for an action, then a text key ('game.confirm')
function hint(action, key) { return `<span class="game-row"><span data-prompt="${action}">${promptHTML(action)}</span><span data-t="${key}">${esc(t(key))}</span></span>`; }

///////////////////////////////////////////////////////////////////////////////
// Kit lifecycle

let kitPlaying = false;             // the game sets it while the world runs (pause on Esc and on blur)
let kitReady = false;
let kitSeen = {device: '', bindings: ''};
const kitTimers = [];               // [{at (timeReal), fn}] that run in real time, paused or not

function kitCanPause() { return kitPlaying && !document.getElementById('pause')?.dataset.open; }
function kitReduceMotion() { return !!settings.reduceMotion; }
function kitAfter(seconds, fn) { kitTimers.push({at: timeReal + seconds, fn}); }

// call first in gameInit(); options: actions (gaming-core binding strings), axes, messages ({en, ja}), name (text key)
function kitInit(options = {})
{
    addMessages(options.messages);
    gameInputInit(options.actions, options.axes);
    if (!kitReady)
    {
        kitReady = true;
        engineAddPlugin(kitUpdate);
        document.addEventListener('visibilitychange', ()=> { if (settings.muteBackground) setSoundEnable(!document.hidden); });
    }
    setSoundVolume(.3 * settings.sfx);
    applyTexts();
}

// every tick, after gameUpdate, paused or not
function kitUpdate()
{
    const input = gameInput();
    const bindings = JSON.stringify(gcInput.bindings);
    if (input.device !== kitSeen.device || bindings !== kitSeen.bindings || gameBox.dataset.device !== kitSeen.box)
    {
        kitSeen = {device: input.device, bindings, box: gameBox.dataset.device};
        renderPrompts();
    }
    for (let i = kitTimers.length; i--;)
        if (timeReal >= kitTimers[i].at) { const [timer] = kitTimers.splice(i, 1); timer.fn(); }
    if (liveQueue && performance.now() - liveAt >= 1000) { const text = liveQueue; liveQueue = ''; announce(text); }
    menuUpdate(input);
}

// a <section> in #ui, made once and reused by id
function kitSection(id, html)
{
    let el = document.getElementById(id);
    if (el) el.remove();
    el = h(html);
    el.hidden = true;
    ui.insertBefore(el, document.getElementById('live'));
    applyTexts(el);
    return el;
}

// a menu of buttons: [{id, t (text key), onSelect, disabled, autofocus}]
function menuHTML(items)
{
    return `<ul class="game-menu">${items.filter(i=> !i.hiddenItem).map((i, n)=>
        `<li><button class="game-btn" ${i.id ? `id="${i.id}"` : ''} data-t="${i.t}" ${i.disabled ? 'disabled' : ''} ${i.autofocus || (!n && !items.some(x=> x.autofocus)) ? 'autofocus' : ''}>${esc(t(i.t))}</button></li>`).join('')}</ul>`;
}
function wireMenu(el, items)
{
    const buttons = el.querySelectorAll('.game-menu .game-btn');
    items.filter(i=> !i.hiddenItem).forEach((item, n)=> buttons[n].addEventListener('click', ()=> item.onSelect && item.onSelect()));
}

///////////////////////////////////////////////////////////////////////////////
// TitleScreen: titleScreen({items: [{id, t, onSelect}], detail}) -> section; show it with showScreen()

function titleScreen({items, detail = '', version = '1.0'})
{
    const el = kitSection('title', `
<section id="title" class="game-center" aria-labelledby="title-name">
  <h1 id="title-name" class="game-title" data-t="game.name"></h1>
  <nav aria-label="Title menu">${menuHTML(items)}</nav>
  ${detail ? `<p id="title-continue-detail" class="game-small">${esc(detail)}</p>` : ''}
  <p class="game-hint">${hint('confirm', 'game.confirm')}
    <span class="game-small" data-t="title.version" data-t-vars='${JSON.stringify({version})}'></span></p>
</section>`);
    wireMenu(el, items);
    return el;
}

///////////////////////////////////////////////////////////////////////////////
// HudPieces: hudInit(markup with data-slot corners) then hudText(id, value) / hudBar(id, 0..1); only changes reach the DOM

const hudCache = {};
function hudInit(slots)
{
    const el = kitSection('hud', `<section id="hud" class="game-hud" aria-label="Status">${slots}</section>`);
    for (const key in hudCache) delete hudCache[key];
    return el;
}
function hudText(id, value)
{
    if (hudCache[id] === value) return;
    hudCache[id] = value;
    const e = document.getElementById(id);
    if (e) e.textContent = value;
}
function hudBar(id, value, max = 1)
{
    const v = Math.max(0, Math.min(1, value / max));
    if (hudCache[id] === v) return;
    hudCache[id] = v;
    const e = document.getElementById(id);
    if (!e) return;
    e.style.setProperty('--value', v);
    if (e.dataset.kind !== 'energy') v <= .25 ? e.dataset.kind = 'danger' : delete e.dataset.kind;
    const meter = e.closest('[role=meter]');
    if (meter) meter.setAttribute('aria-valuenow', Math.round(value));
}
// lives as hearts: up to 5 icons, then ×N
function hudLives(id, n)
{
    if (hudCache[id] === n) return;
    hudCache[id] = n;
    const e = document.getElementById(id);
    if (e) e.innerHTML = n > 5 ? `<span class="game-icon" data-kind="heart" aria-hidden="true"></span> ×${n}` :
        '<span class="game-icon" data-kind="heart" aria-hidden="true"></span>'.repeat(Math.max(0, n));
}

///////////////////////////////////////////////////////////////////////////////
// PauseMenu: pauseMenu({canSave, onSave, onQuit, extra}) once, then openPause() during play; resume() closes it

let pauseOptions = {};
function pauseMenu(options = {})
{
    pauseOptions = options;
    const items = [{id: 'pause-resume', t: 'pause.resume', onSelect: resume, autofocus: true}, ...(options.extra || [])];
    if (options.onSave) items.push({id: 'pause-save', t: 'pause.save', onSelect: ()=> openSaves('save')});
    items.push({id: 'pause-settings', t: 'pause.settings', onSelect: ()=> openSettings()},
        {id: 'pause-controls', t: 'pause.controls', onSelect: ()=> openControls()},
        {id: 'pause-quit', t: 'pause.quit', onSelect: ()=> confirmDialog('pause.quit_confirm', 'pause.quit', ()=> { resume(); options.onQuit && options.onQuit(); })});
    const el = kitSection('pause', `
<section id="pause" class="game-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title" hidden>
  <div class="game-panel" style="min-width:min(320px,100%)">
    <h2 id="pause-title" class="game-h" data-t="pause.title"></h2>
    <p id="pause-blur" class="game-small" data-t="game.paused_on_blur" hidden></p>
    ${menuHTML(items).replace('class="game-menu"', 'class="game-menu" style="margin-top:12px"')}
    <p id="pause-hint" class="game-hint" style="margin-top:12px">${hint('back', 'pause.resume')}</p>
  </div>
</section>`);
    wireMenu(el, items);
    el.addEventListener('game:back', resume);
    el.addEventListener('game:pause', resume);
    return el;
}

function openPause(reason = 'menu')
{
    const el = document.getElementById('pause') || pauseMenu(pauseOptions);
    if (!kitPlaying || el.dataset.open) return;
    el.dataset.open = 'true';
    setPaused(true);
    document.getElementById('pause-blur').hidden = reason !== 'blur';
    openScreen(el);
}

function resume()
{
    const el = document.getElementById('pause');
    if (!el || !el.dataset.open) return;
    delete el.dataset.open;
    // overlays opened from the pause menu close with it
    while (screenStack.length && topScreen() !== el) closeScreen(topScreen());
    closeScreen(el);
    setPaused(false);
}

///////////////////////////////////////////////////////////////////////////////
// A game-style confirm: confirmDialog(textKey, okKey, onOk, vars); Cancel is focused, back cancels

function confirmDialog(textKey, okKey, onOk, vars)
{
    const el = kitSection('confirm', `
<section id="confirm" class="game-overlay" role="alertdialog" aria-modal="true" aria-describedby="confirm-text" hidden>
  <div class="game-panel" style="width:min(420px,100%);display:grid;gap:12px">
    <p id="confirm-text" class="game-line" data-t="${textKey}" ${vars ? `data-t-vars='${esc(JSON.stringify(vars))}'` : ''}></p>
    <div class="game-row" style="justify-content:flex-end">
      <button class="game-btn" id="confirm-cancel" data-t="game.cancel" autofocus></button>
      <button class="game-btn" id="confirm-ok" data-variant="solid" data-t="${okKey}"></button>
    </div>
  </div>
</section>`);
    const close = ()=> { closeScreen(el); el.remove(); };
    el.querySelector('#confirm-cancel').addEventListener('click', close);
    el.querySelector('#confirm-ok').addEventListener('click', ()=> { close(); onOk(); });
    el.addEventListener('game:back', close);
    openScreen(el);
    return el;
}

///////////////////////////////////////////////////////////////////////////////
// GameSettings: Audio, Language, Display and Controls; every change applies and saves at once

function openSettings()
{
    const meter = (v)=> `<span class="game-meter" aria-hidden="true">${Array.from({length: 10}, (_, i)=> `<i ${i < Math.round(v * 10) ? 'data-on' : ''}></i>`).join('')}</span>`;
    const onOff = (v)=> t(v ? 'settings.on' : 'settings.off');
    const canFullscreen = !!document.documentElement.requestFullscreen;
    const el = kitSection('settings', `
<section id="settings" class="game-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title" hidden>
  <div class="game-panel" style="width:min(520px,100%)">
    <h2 id="settings-title" class="game-h" data-t="settings.title"></h2>
    <div class="game-tabs" role="tablist" data-t-label="settings.title" style="margin:10px 0">
      <button class="game-tab" role="tab" id="tab-audio" aria-selected="true" aria-controls="panel-audio" data-t="settings.audio"></button>
      <button class="game-tab" role="tab" id="tab-lang" aria-selected="false" aria-controls="panel-lang" tabindex="-1" data-t="settings.language"></button>
      <button class="game-tab" role="tab" id="tab-display" aria-selected="false" aria-controls="panel-display" tabindex="-1" data-t="settings.display"></button>
      <button class="game-tab" role="tab" id="tab-controls" aria-selected="false" tabindex="-1" data-t="settings.controls"></button>
    </div>
    <div id="panel-audio" role="tabpanel" aria-labelledby="tab-audio">
      <div class="game-option" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="10" data-setting="music"><span data-t="settings.music"></span><span class="game-value"></span></div>
      <div class="game-option" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="10" data-setting="sfx"><span data-t="settings.sfx"></span><span class="game-value"></span></div>
      <div class="game-option" tabindex="0" role="switch" data-setting="muteBackground"><span data-t="settings.mute_background"></span><span class="game-value"></span></div>
    </div>
    <div id="panel-lang" role="tabpanel" aria-labelledby="tab-lang" hidden>
      <div class="game-option" tabindex="0" role="button" data-setting="lang"><span data-t="settings.language"></span><span class="game-value"></span></div>
    </div>
    <div id="panel-display" role="tabpanel" aria-labelledby="tab-display" hidden>
      <div class="game-option" tabindex="0" role="switch" data-setting="fullscreen" ${canFullscreen ? '' : 'aria-disabled="true"'}><span data-t="settings.fullscreen"></span><span class="game-value"></span></div>
      <div class="game-option" tabindex="0" role="switch" data-setting="reduceMotion"><span data-t="settings.reduce_motion"></span><span class="game-value"></span></div>
      <div class="game-option" tabindex="0" role="button" data-setting="textSize"><span data-t="settings.text_size"></span><span class="game-value"></span></div>
    </div>
    <p class="game-hint" style="margin-top:12px">${hint('back', 'game.back')}</p>
  </div>
</section>`);
    const render = ()=>
    {
        for (const option of el.querySelectorAll('[data-setting]'))
        {
            const name = option.dataset.setting, value = option.querySelector('.game-value'), v = settings[name];
            if (name === 'music' || name === 'sfx') { value.innerHTML = v ? meter(v) : esc(t('settings.off')); option.setAttribute('aria-valuenow', Math.round(v * 10)); }
            else if (name === 'lang') value.textContent = settings.lang === 'ja' ? '日本語' : 'English';
            else if (name === 'textSize') value.textContent = t(v === 'large' ? 'settings.text_large' : 'settings.text_normal');
            else if (name === 'fullscreen' && !canFullscreen) value.textContent = t('settings.fullscreen_unavailable');
            else { value.textContent = onOff(v); option.setAttribute('aria-checked', !!v); }
        }
    };
    const change = (option, dir)=>
    {
        const name = option.dataset.setting;
        if (option.getAttribute('aria-disabled') === 'true') return;
        if (name === 'music' || name === 'sfx') settings[name] = Math.max(0, Math.min(1, Math.round(settings[name] * 10 + dir) / 10));
        else if (name === 'lang') { setLang(settings.lang === 'ja' ? 'en' : 'ja'); return render(); }
        else if (name === 'textSize') settings.textSize = settings.textSize === 'large' ? 'normal' : 'large';
        else if (name === 'fullscreen')
        {
            settings.fullscreen = !settings.fullscreen;
            settings.fullscreen ? gameBox.requestFullscreen?.().catch(()=> {}) : document.fullscreenElement && document.exitFullscreen();
        }
        else settings[name] = !settings[name];
        if (name === 'sfx') { setSoundVolume(.3 * settings.sfx); }
        saveSettings();
        applyTexts();
        render();
    };
    for (const option of el.querySelectorAll('[data-setting]'))
    {
        option.addEventListener('game:step', (e)=> change(option, e.detail));
        option.addEventListener('click', (e)=>
        {
            const box = option.getBoundingClientRect();
            change(option, e.clientX && e.clientX < box.left + box.width / 2 ? -1 : 1); // left half lowers, right half raises
        });
    }
    for (const tab of el.querySelectorAll('[role=tab]'))
        tab.addEventListener('click', ()=>
        {
            if (tab.id === 'tab-controls') return openControls();
            for (const other of el.querySelectorAll('[role=tab]'))
            {
                other.setAttribute('aria-selected', other === tab);
                other.tabIndex = other === tab ? 0 : -1;
                const panel = other.getAttribute('aria-controls');
                if (panel) document.getElementById(panel).hidden = other !== tab;
            }
        });
    el.addEventListener('game:back', ()=> closeScreen(el));
    render();
    openScreen(el);
    return el;
}

///////////////////////////////////////////////////////////////////////////////
// ControlsRemap: every action with its inputs; Change listens for the next key or button through gcInput

let controlsRows = ['move', 'jump', 'fire'];  // the game's rows: kitControls(['move', 'fire', 'interact'])
function kitControls(rows) { controlsRows = rows; }

const MOVE_SIDES = [['moveY', 'positive', 'controls.move_up'], ['moveX', 'negative', 'controls.move_left'],
    ['moveY', 'negative', 'controls.move_down'], ['moveX', 'positive', 'controls.move_right']];

function openControls()
{
    let tab = inputDevice() === 'gamepad' ? 'gamepad' : 'keyboard', listen = null, swapped = {};
    const rows = [...controlsRows.filter(r=> !gcInput.isFixed(r)), 'pause', 'back'];
    const el = kitSection('controls', `
<section id="controls" class="game-overlay" role="dialog" aria-modal="true" aria-labelledby="controls-title" hidden>
  <div class="game-panel" style="width:min(620px,100%)">
    <h2 id="controls-title" class="game-h" data-t="controls.title"></h2>
    <div class="game-tabs" role="tablist" data-t-label="controls.title" style="margin:10px 0">
      <button class="game-tab" role="tab" data-device-tab="keyboard" data-t="game.device.keyboard"></button>
      <button class="game-tab" role="tab" data-device-tab="gamepad" data-t="game.device.gamepad"></button>
    </div>
    <p id="controls-nopad" class="game-small" data-t="controls.no_gamepad" hidden></p>
    <ul class="game-list" role="listbox" data-t-label="controls.title"></ul>
    <p class="game-hint" style="margin-top:12px">${hint('confirm', 'controls.change')}
      <span class="game-row"><span data-for="keyboard mouse"><span class="game-key">R</span></span><span data-for="gamepad"><span class="game-padpos" data-pos="north" data-t-label="game.pad.north"></span></span><span data-t="controls.reset"></span></span>
      ${hint('back', 'game.back')}</p>
    <p id="controls-live" class="sr-only" aria-live="assertive"></p>
  </div>
</section>`);
    const list = el.querySelector('.game-list'), live = el.querySelector('#controls-live');
    const inputsHTML = (action)=>
    {
        const all = (kind, l)=> (l || []).filter(b=> b.startsWith(kind + ':'));
        if (action === 'move')
            return tab === 'gamepad' ? `<span class="game-padkey">${esc(t('game.pad.left_stick_move'))}</span>` :
                MOVE_SIDES.map(([axis, side])=> all('key', gcInput.bindings.axes[axis][side])[0]).filter(Boolean).map(bindingHTML).join('');
        const l = gcInput.bindings.actions[action] || [];
        return tab === 'gamepad' ? all('pad', l).slice(0, 1).map(bindingHTML).join('') :
            [...all('key', l).slice(0, 1), ...all('mouse', l).slice(0, 1)].map(bindingHTML).join('');
    };
    const render = (focusAction)=>
    {
        const connected = gamepadConnected();
        el.querySelector('#controls-nopad').hidden = tab !== 'gamepad' || connected;
        for (const b of el.querySelectorAll('[data-device-tab]'))
        { b.setAttribute('aria-selected', b.dataset.deviceTab === tab); b.tabIndex = b.dataset.deviceTab === tab ? 0 : -1; }
        list.innerHTML = rows.map((action, i)=>
        {
            const fixed = gcInput.isFixed(action) || (action === 'move' && tab === 'gamepad') || (tab === 'gamepad' && !connected);
            const listening = listen && listen.action === action;
            const label = listening && action === 'move' ? t(MOVE_SIDES[listen.step][2]) + ' · ' + t('controls.press_new') : listening ? t('controls.press_new') : '';
            return `<li role="option" tabindex="${i ? -1 : 0}" data-action="${action}" ${fixed ? 'aria-disabled="true"' : ''} aria-selected="${!!listening}">
              <span style="flex:1">${esc(t('action.' + action))}</span>
              ${listening ? `<span class="game-small">${esc(label)}</span><span class="game-bar" data-kind="energy" style="--value:1;width:60px"></span>` : inputsHTML(action)}
              ${gcInput.isFixed(action) ? `<span class="game-small">${esc(t('controls.fixed'))}</span>` : ''}
              ${swapped[action] ? `<span class="game-small">${esc(t('controls.swapped', {action: t('action.' + swapped[action])}))}</span>` : ''}</li>`;
        }).join('');
        for (const li of list.children) li.addEventListener('click', ()=> startListen(li.dataset.action, li));
        const target = focusAction && list.querySelector(`[data-action="${focusAction}"]`);
        if (target) { target.tabIndex = 0; target.focus({preventScroll: true}); }
    };
    const startListen = (action, li)=>
    {
        if (listen || li.getAttribute('aria-disabled') === 'true') return;
        listen = {action, step: 0, tick: gcInput.tick, start: timeReal};
        menuCapture = true;
        live.textContent = t('controls.press_new');
        render(action);
    };
    const stopListen = (focusAction)=> { listen = null; menuCapture = false; render(focusAction); };
    // the inputs an action or a move side holds, as one list to edit
    const listOf = (action, step)=> action === 'move' ? gcInput.bindings.axes[MOVE_SIDES[step][0]][MOVE_SIDES[step][1]] : gcInput.bindings.actions[action];
    const bindName = (action, step)=> action === 'move' ? MOVE_SIDES[step][0] + '.' + MOVE_SIDES[step][1] : action;
    const apply = (binding)=>
    {
        const {action, step} = listen, kind = binding.split(':')[0];
        const mine = listOf(action, step).slice();
        const at = mine.findIndex(b=> b.startsWith(kind + ':'));
        const old = at >= 0 ? mine[at] : '';
        if (old === binding) return stopListen(action);
        // who else holds it: a fixed action refuses, another row swaps
        const holders = [...rows.flatMap(r=> r === 'move' ? MOVE_SIDES.map((_, s)=> [r, s]) : [[r, 0]])];
        for (const [other, s] of holders)
        {
            if (other === action && s === step) continue;
            const theirs = listOf(other, s);
            if (!theirs || !theirs.includes(binding)) continue;
            if (gcInput.isFixed(other))
            {
                live.textContent = t('controls.taken_fixed', {input: gcInputCore.label(binding), action: t('action.' + other)});
                return;
            }
            const next = theirs.slice(), i = next.indexOf(binding);
            old ? next[i] = old : next.splice(i, 1);
            gcInput.bind(bindName(other, s), next);
            if (other !== action) { swapped[other] = action; kitAfter(3, ()=> { delete swapped[other]; if (!el.hidden && !listen) render(); }); }
        }
        at >= 0 ? mine[at] = binding : mine.unshift(binding);
        gcInput.bind(bindName(action, step), mine);
        gcInput.save();
        if (action === 'move' && step < 3) { listen.step++; listen.tick = gcInput.tick; listen.start = timeReal; render(action); return; }
        live.textContent = t('controls.changed', {action: t('action.' + action), input: gcInputCore.label(binding)});
        stopListen(action);
    };
    el.addEventListener('game:input', (e)=>
    {
        const input = e.detail;
        if (!listen)
        {
            if (gcInput.lastBinding === 'key:KeyR' || input.device === 'gamepad' && gamepadWasPressed(3))
            {
                e.preventDefault();
                confirmDialog('controls.reset_confirm', 'controls.reset', ()=> { gcInput.reset(); render(); });
            }
            return;
        }
        e.preventDefault(); // listening: every input is the new binding, nothing else
        if (timeReal - listen.start > 5) return stopListen(listen.action);
        if (gcInput.tick === listen.tick) return;
        const binding = gcInput.lastBinding;
        if (!binding) return;
        if (tab === 'keyboard')
        {
            if (binding === 'key:Escape') return stopListen(listen.action);
            if (binding.startsWith('key:') || binding.startsWith('mouse:') && listen.action !== 'move') apply(binding);
        }
        else if (binding.startsWith('pad:'))
        {
            if (binding === 'pad:1' && timeReal - listen.start > 1) return stopListen(listen.action);
            apply(binding);
        }
    });
    for (const b of el.querySelectorAll('[data-device-tab]'))
        b.addEventListener('click', ()=> { tab = b.dataset.deviceTab; render(); b.focus(); });
    el.addEventListener('game:back', ()=> { if (!listen) closeScreen(el); });
    render();
    openScreen(el);
    return el;
}

///////////////////////////////////////////////////////////////////////////////
// DialogueBox: dialogue([{speaker, t, vars, choices: [{t, value}]}], (choiceValue) => {}) ; the world keeps running

let dialogueState = null;
function dialogueOpen() { return !!dialogueState; }
function dialogue(lines, onDone)
{
    const el = kitSection('dialogue', `
<section id="dialogue" class="game-dialogue" role="dialog" aria-labelledby="dlg-speaker" aria-describedby="dlg-line" hidden>
  <div class="game-panel" data-tone="light" style="grid-column:1 / -1">
    <span id="dlg-speaker" class="game-speaker"></span>
    <p id="dlg-line" class="game-line"></p>
    <ul class="game-menu" style="margin-top:8px" hidden></ul>
    <p class="game-hint" style="justify-content:flex-end">${hint('confirm', 'dlg.next')}</p>
  </div>
</section>`);
    const lineEl = el.querySelector('#dlg-line'), menu = el.querySelector('.game-menu'), speaker = el.querySelector('#dlg-speaker');
    dialogueState = {lines, i: -1, shown: 0, text: '', start: 0, onDone, el};
    const next = ()=>
    {
        const d = dialogueState;
        d.i++;
        if (d.i >= lines.length) return finish();
        const line = lines[d.i];
        d.text = t(line.t, line.vars); d.shown = settings.reduceMotion ? d.text.length : 0; d.start = timeReal;
        speaker.textContent = line.speaker ? t(line.speaker) : '';
        speaker.hidden = !line.speaker;
        menu.hidden = true; menu.innerHTML = '';
        draw();
    };
    const finish = (value)=>
    {
        const done = dialogueState.onDone;
        dialogueState = null;
        closeScreen(el);
        el.remove();
        done && done(value);
    };
    const draw = ()=>
    {
        const d = dialogueState, line = lines[d.i], full = d.shown >= d.text.length;
        lineEl.innerHTML = esc(d.text.slice(0, d.shown)) + (full && !line.choices && d.i < lines.length - 1 ? '<span class="game-more">▼</span>' : '');
        if (full && line.choices && menu.hidden)
        {
            menu.innerHTML = line.choices.map((c, n)=> `<li><button class="game-btn" data-choice="${n}" ${n ? '' : 'autofocus'}>${esc(t(c.t))}</button></li>`).join('');
            menu.hidden = false;
            menu.querySelectorAll('button').forEach((b, n)=> b.addEventListener('click', ()=> finish(line.choices[n].value)));
            menu.querySelector('button').focus();
        }
    };
    const advance = ()=>
    {
        const d = dialogueState;
        if (!d) return;
        if (d.shown < d.text.length) { d.shown = d.text.length; draw(); }
        else if (!lines[d.i].choices) next();
    };
    el.querySelector('.game-panel').addEventListener('click', (e)=> { if (!e.target.closest('button')) advance(); });
    el.addEventListener('game:input', (e)=>
    {
        const d = dialogueState;
        if (!d) return;
        const perSecond = settings.lang === 'ja' ? 25 : 40;
        if (d.shown < d.text.length)
        {
            const shown = Math.min(d.text.length, Math.floor((timeReal - d.start) * perSecond));
            if (shown !== d.shown) { d.shown = shown; draw(); }
        }
        const choosing = !menu.hidden;
        for (let n = 1; choosing && n <= 4; ++n) if (keyWasPressed('Digit' + n)) menu.querySelectorAll('button')[n - 1]?.click();
        if (choosing) return; // the menu code moves focus and confirms on the choices
        e.preventDefault();
        if (e.detail.pressed.confirm && e.detail.device !== 'mouse') advance();
        if (e.detail.pressed.pause) openPause();
    });
    el.addEventListener('game:pause', ()=> openPause());
    openScreen(el);
    next();
    return el;
}

///////////////////////////////////////////////////////////////////////////////
// InventoryGrid: openInventory({items: [{id, n, kind}], max, onUse(item)}); item texts are 'item.<id>' and 'item.<id>.desc'

function openInventory({items, max = 24, cols = 6, onUse, onDrop})
{
    let selected = 0;
    const el = kitSection('inventory', `
<section id="inventory" class="game-overlay" role="dialog" aria-modal="true" aria-labelledby="inv-title" hidden>
  <div class="game-panel" style="width:min(640px,100%);display:grid;gap:12px">
    <div class="game-row" style="justify-content:space-between">
      <h2 id="inv-title" class="game-h" data-t="inv.title"></h2>
      <span class="game-small" id="inv-used"></span>
    </div>
    <div class="game-row" style="align-items:flex-start;gap:16px">
      <div class="game-slots" role="grid" data-t-label="inv.title" style="--cols:${cols}"></div>
      <div class="game-detail" aria-live="polite">
        <span class="game-speaker" id="inv-name"></span>
        <p class="game-line" style="font-size:13px;margin:0" id="inv-desc"></p>
        <ul class="game-menu"><li><button class="game-btn" id="inv-use" data-t="inv.use"></button></li><li><button class="game-btn" id="inv-drop" data-t="inv.drop"></button></li></ul>
      </div>
    </div>
    <p class="game-hint">${hint('confirm', 'inv.use')}${hint('back', 'game.back')}</p>
  </div>
</section>`);
    const grid = el.querySelector('.game-slots');
    const render = ()=>
    {
        const filled = items.filter(Boolean);
        el.querySelector('#inv-used').textContent = t('inv.slots_used', {used: filled.length, max});
        grid.innerHTML = Array.from({length: max}, (_, i)=>
        {
            const item = items[i];
            return item ? `<button class="game-slot" role="gridcell" data-i="${i}" aria-selected="${i === selected}" aria-label="${esc(t('item.' + item.id))}, ${item.n}"><span aria-hidden="true">${esc((item.icon || t('item.' + item.id)).slice(0, 2))}</span>${item.n > 1 ? `<span class="game-count">${item.n > 99 ? '99+' : item.n}</span>` : ''}</button>` :
                `<span class="game-slot" role="gridcell" aria-label="Empty"></span>`;
        }).join('');
        const item = items[selected];
        el.querySelector('#inv-name').textContent = item ? t('item.' + item.id) : '';
        el.querySelector('#inv-desc').textContent = item ? t('item.' + item.id + '.desc') : t('inv.empty');
        el.querySelector('#inv-use').disabled = !item || item.kind === 'key';
        el.querySelector('#inv-drop').disabled = !item || item.kind === 'key';
        for (const slot of grid.querySelectorAll('button.game-slot'))
        {
            slot.addEventListener('focus', ()=> { if (selected !== +slot.dataset.i) { selected = +slot.dataset.i; render(); grid.querySelector(`[data-i="${selected}"]`).focus(); } });
            slot.addEventListener('click', ()=> el.querySelector('#inv-use').focus());
        }
    };
    const remove = (item)=> { if (--item.n <= 0) items[items.indexOf(item)] = null; };
    el.querySelector('#inv-use').addEventListener('click', ()=> { const item = items[selected]; if (item && onUse && onUse(item) !== false) remove(item); render(); grid.querySelector('.game-slot')?.focus(); });
    el.querySelector('#inv-drop').addEventListener('click', ()=> { const item = items[selected]; if (item) { remove(item); onDrop && onDrop(item); } render(); grid.querySelector('.game-slot')?.focus(); });
    el.addEventListener('game:back', ()=> { closeScreen(el); setPaused(false); });
    render();
    setPaused(true);
    openScreen(el);
    return el;
}

///////////////////////////////////////////////////////////////////////////////
// SaveSlots: three slots in localStorage['<game-id>.save.<n>']; saveOptions({getState, place, onLoad}) once

let saveOptions = {};
function savesInit(options) { saveOptions = options; }
function saveRead(slot)
{
    try { const text = localStorage.getItem(GAME_ID + '.save.' + slot); return text ? JSON.parse(text) : null; }
    catch { return {broken: true}; }
}
function saveLatest()
{
    let best = null;
    for (const slot of [1, 2, 3, 'auto'])
    {
        const value = saveRead(slot);
        if (value && !value.broken && (!best || value.savedAt > best.value.savedAt)) best = {slot, value};
    }
    return best;
}
function saveWrite(slot, state, place = '')
{
    const value = {v: 1, game: '1.0.0', savedAt: new Date().toISOString(), playTime: Math.round(time), place, state};
    const ok = writeSaveData(GAME_ID + '.save.' + slot, value);
    const check = saveRead(slot);
    return ok && check && check.savedAt === value.savedAt;
}

function openSaves(mode = 'save')
{
    const el = kitSection('saves', `
<section id="saves" class="game-overlay" role="dialog" aria-modal="true" aria-labelledby="saves-title" data-mode="${mode}" hidden>
  <div class="game-panel" style="width:min(620px,100%);display:grid;gap:10px">
    <h2 id="saves-title" class="game-h" data-t="${mode === 'save' ? 'saves.save_title' : 'saves.load_title'}"></h2>
    <ul class="game-list" role="listbox" data-t-label="saves.slot"></ul>
    <p class="game-small" data-t="saves.device_note"></p>
    <p class="game-hint">${hint('confirm', mode === 'save' ? 'saves.save_here' : 'saves.load_title')}${hint('back', 'game.back')}</p>
    <p class="sr-only" aria-live="polite" id="saves-live"></p>
  </div>
</section>`);
    const list = el.querySelector('.game-list');
    const render = (focus = 1)=>
    {
        list.innerHTML = [1, 2, 3].map((slot)=>
        {
            const value = saveRead(slot), empty = !value, broken = value && value.broken;
            const disabled = mode === 'load' && (empty || broken);
            return `<li role="option" tabindex="${slot === focus ? 0 : -1}" data-slot="${slot}" ${disabled ? 'aria-disabled="true"' : ''}>
              <span style="flex:1"><span class="game-small">${esc(t('saves.slot', {n: slot}))}</span><br>${esc(empty ? t('saves.empty') : broken ? t('saves.broken') : (value.place ? t(value.place) : ''))}</span>
              ${value && !broken ? `<span class="game-small game-num" style="text-align:right">${fmtTime(value.playTime)}<br>${esc(new Date(value.savedAt).toLocaleString(settings.lang, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}))}</span>` : ''}</li>`;
        }).join('');
        for (const li of list.children) li.addEventListener('click', ()=> choose(+li.dataset.slot));
        list.querySelector(`[data-slot="${focus}"]`).focus({preventScroll: true});
    };
    const choose = (slot)=>
    {
        const value = saveRead(slot);
        if (mode === 'load')
        {
            if (!value || value.broken) return;
            closeScreen(el);
            saveOptions.onLoad && saveOptions.onLoad(value.state, value);
            return;
        }
        const write = ()=>
        {
            const ok = saveWrite(slot, saveOptions.getState(), saveOptions.place ? saveOptions.place() : '');
            el.querySelector('#saves-live').textContent = t(ok ? 'saves.saved' : 'saves.storage_full', {n: slot});
            announce(t(ok ? 'saves.saved' : 'saves.storage_full', {n: slot}));
            render(slot);
        };
        value ? confirmDialog('saves.overwrite', 'saves.overwrite_btn', write, {n: slot}) : write();
    };
    el.addEventListener('game:back', ()=> closeScreen(el));
    render();
    openScreen(el);
    return el;
}

///////////////////////////////////////////////////////////////////////////////
// CardHand: handHTML(cards, selected) -> the fan; a card is {id, cost, disabled}; texts 'card.<id>' and 'card.<id>.text'

function cardHTML(card, i, n, selected)
{
    return `<button class="game-card" role="option" data-i="${i}" aria-selected="${i === selected}" ${card.disabled ? 'aria-disabled="true"' : ''}
      style="--i:${i};--d:${Math.abs(i - (n - 1) / 2)}">
      <span class="game-cost" aria-label="Cost ${card.cost}">${card.cost}</span>
      <b>${esc(t('card.' + card.id))}</b><span class="game-art" aria-hidden="true"></span>
      <span>${esc(t('card.' + card.id + '.text'))}</span></button>`;
}
function handHTML(cards, selected = -1)
{
    return `<div class="game-hand" role="listbox" aria-orientation="horizontal" style="--mid:${(cards.length - 1) / 2}">${cards.map((c, i)=> cardHTML(c, i, cards.length, selected)).join('')}</div>`;
}

///////////////////////////////////////////////////////////////////////////////
// GameOver: gameOver({title, detail, items}) after a 0.8 s beat; input in the beat is ignored

function gameOver({title = 'gameover.title', detail = '', items})
{
    kitPlaying = false;
    const el = kitSection('gameover', `
<section id="gameover" class="game-center game-scrim" role="alertdialog" aria-labelledby="go-title" aria-describedby="go-detail" hidden>
  <h2 id="go-title" class="game-title" style="color:var(--g-bad)" data-t="${title}"></h2>
  <p id="go-detail" class="game-line">${esc(detail)}</p>
  ${menuHTML(items)}
</section>`);
    wireMenu(el, items);
    kitAfter(.8, ()=> { if (el.isConnected) showScreen(el); });
    return el;
}

///////////////////////////////////////////////////////////////////////////////
// ResultsScores: results({title, rows: [[labelKey, value]], stars, items, scores: {table, score}})

function highScores(table)
{
    const key = GAME_ID + '.scores.' + table, list = ()=> readSaveData(key, {list: []}).list || [];
    return {
        list,
        qualifies: (score)=> score > 0 && (list().length < 10 || score > list()[list().length - 1].score),
        add(name, score)
        {
            const entry = {name: String(name).slice(0, 10) || '???', score, date: new Date().toISOString().slice(0, 10)};
            const next = [...list(), entry].sort((a, b)=> b.score - a.score).slice(0, 10);
            writeSaveData(key, {list: next});
            return next.indexOf(entry);
        },
    };
}

function results({title = 'results.clear', titleVars, rows = [], stars, newBest = false, items, scores})
{
    kitPlaying = false;
    const table = scores && highScores(scores.table);
    const entering = table && table.qualifies(scores.score);
    const el = kitSection('results', `
<section id="results" class="game-overlay" role="dialog" aria-modal="true" aria-labelledby="res-title" hidden>
  <div class="game-panel" style="width:min(520px,100%);display:grid;gap:12px">
    <h2 id="res-title" class="game-h" data-t="${title}" ${titleVars ? `data-t-vars='${esc(JSON.stringify(titleVars))}'` : ''}></h2>
    <dl class="game-num" style="display:grid;grid-template-columns:1fr auto;gap:6px 16px;margin:0">
      ${rows.map(([key, value])=> `<dt data-t="${key}"></dt><dd style="margin:0">${esc(value)}</dd>`).join('')}
    </dl>
    ${stars === undefined ? '' : `<p class="game-stars" aria-label="${stars} / 3">${[0, 1, 2].map(i=> `<span class="game-icon" data-kind="star" ${i < stars ? '' : 'data-off'}></span>`).join('')}</p>`}
    ${newBest ? '<p class="game-row" role="status" style="justify-content:center;margin:0;color:var(--g-accent)" data-t="results.new_best"></p>' : ''}
    ${entering ? `<form class="game-name-entry"><label class="game-small" for="res-name" data-t="results.your_name"></label><input id="res-name" maxlength="10" autocomplete="off" value="${esc(readSaveData(GAME_ID + '.scores', {name: ''}).name)}"><button class="game-btn" data-variant="solid" data-t="game.confirm"></button></form>` : ''}
    <div id="res-table"></div>
    ${menuHTML(items)}
  </div>
</section>`);
    const showTable = (highlight = -1)=>
    {
        if (!table) return;
        const list = table.list();
        el.querySelector('#res-table').innerHTML = `<h3 class="game-h" data-t="results.high_scores">${esc(t('results.high_scores'))}</h3>
          <ol class="game-scores">${list.map((s, i)=> `<li ${i === highlight ? 'data-new' : ''}><span>${i + 1}</span><span>${esc(s.name)}</span><span>${fmt(s.score)}</span><span class="game-small">${esc(s.date)}</span></li>`).join('')}</ol>
          ${!entering && list.length >= 10 ? `<p class="game-small">${esc(t('results.top_needed', {score: fmt(list[list.length - 1].score)}))}</p>` : ''}`;
    };
    wireMenu(el, items);
    const form = el.querySelector('form');
    if (form)
    {
        const input = form.querySelector('input');
        form.addEventListener('submit', (e)=>
        {
            e.preventDefault();
            const name = input.value.trim().toUpperCase();
            writeSaveData(GAME_ID + '.scores', {name});
            showTable(table.add(name, scores.score));
            form.remove();
            focusFirst(el);
        });
        kitAfter(0, ()=> input.focus());
    }
    else showTable();
    el.addEventListener('game:back', ()=> {});
    openScreen(el);
    return el;
}

///////////////////////////////////////////////////////////////////////////////
// TutorialPrompt: tutorial('prompt.serve', 'serve') shows the action's input and a line; a {button} in the text is
// where the input goes ('Press {button} to serve'); tutorial() hides it. It follows language and device changes.

let tutorialArgs = null;
function tutorial(key, action, vars)
{
    document.getElementById('tutorial')?.remove();
    tutorialArgs = key ? [key, action, vars] : null;
    if (!key) return;
    const glyph = action ? `<span data-prompt="${action}">${promptHTML(action)}</span>` : '';
    const parts = String(t(key, vars)).split('{button}');
    const body = parts.length > 1 ? parts.map(esc).join(glyph) : glyph + esc(parts[0]);
    ui.appendChild(h(`<div id="tutorial" class="game-tutorial game-row" role="status">${body}</div>`));
}
document.addEventListener('game:lang', ()=> { if (tutorialArgs) tutorial(...tutorialArgs); });

///////////////////////////////////////////////////////////////////////////////
// TouchControls: touchControls({stick: true, buttons: [{action: 'fire', label: 'action.fire'}]}); shown only on touch

function touchControls({stick = true, buttons = [], leftHanded = false} = {})
{
    document.getElementById('touch')?.remove();
    document.getElementById('touch-pause')?.remove();
    const el = h(`<div id="touch" class="game-touch" data-for="touch" data-t-label="touch.move" ${leftHanded ? 'data-left-handed' : ''}>
      ${stick ? '<div class="game-stick" id="stick" role="application" data-t-label="touch.move"></div>' : '<span></span>'}
      <div class="game-row" style="gap:16px;align-items:end">${buttons.map((b)=> `<button class="game-touchbtn" tabindex="-1" data-action="${b.action}" data-t-label="${b.label}">${esc(b.text || t(b.label))}</button>`).join('')}</div></div>`);
    const pause = h(`<button id="touch-pause" class="game-touchbtn" tabindex="-1" data-for="touch" data-action="pause" data-t-label="game.pause"
      style="position:absolute;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));width:44px;height:44px">II</button>`);
    ui.appendChild(el); ui.appendChild(pause);
    applyTexts(el); applyTexts(pause);
    const press = (action, down, button)=>
    {
        if (down) { touchState.pressed[action] = true; button.dataset.pressed = ''; navigator.vibrate?.(10); }
        else delete button.dataset.pressed;
        touchState.held[action] = down;
        if (down && action === 'pause') openPause();
    };
    for (const b of [...el.querySelectorAll('.game-touchbtn'), pause])
    {
        b.addEventListener('pointerdown', (e)=> { e.preventDefault(); press(b.dataset.action, true, b); });
        for (const type of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(type, ()=> press(b.dataset.action, false, b));
    }
    const knob = el.querySelector('#stick');
    if (knob)
    {
        let id = null, origin = null;
        knob.addEventListener('pointerdown', (e)=> { id = e.pointerId; origin = [e.clientX, e.clientY]; knob.setPointerCapture?.(id); });
        knob.addEventListener('pointermove', (e)=>
        {
            if (e.pointerId !== id) return;
            const dx = e.clientX - origin[0], dy = e.clientY - origin[1], d = Math.hypot(dx, dy);
            touchState.move = d < 12 ? null : {x: clamp(dx / 48, -1, 1), y: clamp(-dy / 48, -1, 1)};
        });
        for (const type of ['pointerup', 'pointercancel']) knob.addEventListener(type, ()=> { id = null; touchState.move = null; });
    }
    return el;
}
