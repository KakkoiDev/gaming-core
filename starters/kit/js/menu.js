/*
    GameKit menus (from the designer's GameKit card): one focus model for every screen.
    Arrow keys, the d-pad and the left stick move focus between .game-btn, .game-option, .game-slot, .game-card,
    [role=tab] and list rows of the open screen; confirm and back are gaming-core's `confirm` and `back` actions
    (back is fixed, so it is always the same button). Keys and clicks reach the focused HTML button by themselves.

    Two kinds of screens, each a direct child <section> of #ui:
      showScreen(el)        the base screen: title, play (the HUD), game over, results; one at a time
      openScreen(el)        an overlay on top (pause, settings, controls, saves, bag...); closeScreen(el) goes back
    The world is paused by whoever opens an overlay during play (openPause does), never by the menu code itself.
*/
'use strict';

const ui = document.getElementById('ui');
gameBox.tabIndex = -1; // focusable, so keys leave a closed menu's buttons
let baseScreen = null;
let menuCapture = false;   // true while a screen reads every key itself (ControlsRemap listening)
const screenStack = [];   // [{el, opener, hidden: [sections hidden under it]}]
let screenOpenedTick = -1; // input on the tick a screen opens belongs to whatever opened it

function topScreen() { return screenStack.length ? screenStack[screenStack.length - 1].el : baseScreen; }
function menuOpen() { return screenStack.length > 0; }

function focusFirst(el)
{
    // HUD buttons for the pointer (tabindex="-1" or data-pointer-only) never take focus
    const skip = ':not([tabindex="-1"]):not([data-pointer-only])';
    const target = el.querySelector('[autofocus]:not([disabled])' + skip) ||
        el.querySelector(['.game-btn:not(:disabled)', '[role=tab][aria-selected="true"]', '.game-list > li[tabindex="0"]', '.game-option', '.game-slot', '.game-card', 'button:not(:disabled)'].map(s=> s + skip).join(', '));
    if (target) target.focus({preventScroll: true});
    else gameBox.focus({preventScroll: true}); // nothing to focus: keys go to the game, not a hidden button
}

// a screen whose keys belong to HTML controls (not pointer-only HUD buttons)
function hasMenuItems(el) { return !!el.querySelector('button:not([tabindex="-1"]):not([data-pointer-only]), [tabindex]:not([tabindex="-1"]), input'); }

// the Space or Enter that opened a screen must not click its newly focused button on keyup
let swallowKeyup = false;
document.addEventListener('keydown', ()=> { swallowKeyup = false; }, true);
document.addEventListener('keyup', (e)=> { if (swallowKeyup && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); swallowKeyup = false; } }, true);

function showScreen(el)
{
    // a new base screen ends whatever menus were open over the old one
    while (screenStack.length) { const entry = screenStack.pop(); entry.el.hidden = true; }
    for (const s of ui.querySelectorAll(':scope > section')) if (!s.dataset.overlay) s.hidden = s !== el;
    baseScreen = el;
    screenOpenedTick = gcInput.tick;
    if (el && !screenStack.length)
    {
        setInputPreventDefault(!hasMenuItems(el));
        focusFirst(el);
    }
    else if (!el && document.activeElement && document.activeElement !== document.body) gameBox.focus({preventScroll: true});
}

function openScreen(el, opener = document.activeElement)
{
    el.dataset.overlay = 'true';
    const hidden = [...ui.querySelectorAll(':scope > section')].filter(s=> s !== el && !s.hidden);
    for (const s of hidden) s.hidden = true;
    screenStack.push({el, opener, hidden});
    el.hidden = false;
    screenOpenedTick = gcInput.tick;
    swallowKeyup = true;
    setInputPreventDefault(false);          // let keys reach the HTML buttons
    focusFirst(el);
}

function closeScreen(el)
{
    const i = screenStack.findIndex(s=> s.el === el);
    if (i < 0) return;
    const [entry] = screenStack.splice(i, 1);
    el.hidden = true;
    for (const s of entry.hidden) s.hidden = false;
    screenOpenedTick = gcInput.tick;
    if (!screenStack.length) setInputPreventDefault(!(baseScreen && hasMenuItems(baseScreen)));
    if (entry.opener && entry.opener.isConnected && !entry.opener.closest('[hidden]')) entry.opener.focus({preventScroll: true});
    else if (topScreen()) focusFirst(topScreen());
}

// the focusable items of a screen, in order
function menuItems(screen)
{
    return [...screen.querySelectorAll('.game-btn:not(:disabled), .game-option, .game-slot, .game-card, [role=tab], .game-list > li[tabindex], .game-name-entry input')]
        .filter(e=> !e.closest('[hidden]') && !e.closest('[inert]'));
}

// dx/dy: -1, 0, 1 (dy up is -1 in screen terms). Grids (.game-slots) move by row; tabs switch tabs.
function moveFocus(dx, dy)
{
    const screen = topScreen();
    if (!screen) return;
    const active = document.activeElement;
    if (active && active.matches('.game-option') && dx && !dy) return optionStep(active, dx);
    if (active && active.matches('[role=tab]') && dx && !dy)
    {
        const tabs = [...active.parentElement.querySelectorAll('[role=tab]')];
        const next = tabs[(tabs.indexOf(active) + dx + tabs.length) % tabs.length];
        next.focus(); next.click(); return;
    }
    const grid = active && active.closest('.game-slots');
    if (grid && dy)
    {
        const cells = [...grid.querySelectorAll('.game-slot')], cols = +getComputedStyle(grid).getPropertyValue('--cols') || 6;
        const i = cells.indexOf(active) + dy * cols;
        if (i >= 0 && i < cells.length) return cells[i].focus();
    }
    const items = menuItems(screen);
    if (!items.length) return;
    const step = dy || dx;
    const i = items.indexOf(active);
    items[i < 0 ? 0 : (i + step + items.length) % items.length].focus({preventScroll: true});
}

// a settings row: ← → change its value (GameSettings fills in optionStep's handler through data-step)
function optionStep(option, dir) { option.dispatchEvent(new CustomEvent('game:step', {detail: dir})); }

// keyboard arrows move focus inside the open screen (Enter and Space click the focused button natively)
document.addEventListener('keydown', (e)=>
{
    const screen = topScreen();
    if (!screen || screen.hidden || menuCapture) return;
    if (document.activeElement && document.activeElement.matches('input')) return;
    const dirs = {ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0]};
    if (dirs[e.code] && menuItems(screen).length)
    {
        e.preventDefault();
        moveFocus(...dirs[e.code]);
    }
    // a list row or option is not a button: Enter and Space choose it
    if ((e.code === 'Enter' || e.code === 'Space') && document.activeElement && document.activeElement.matches('.game-list > li[tabindex], .game-option'))
    {
        e.preventDefault();
        document.activeElement.click();
    }
});

// call every tick with gameInput()'s snapshot (the kit does, from its plugin): gamepad navigation, confirm and back
let menuStick = {x: 0, y: 0};
function menuUpdate(input)
{
    const screen = topScreen();
    const stick = input.gamepad.left;
    const crossed = (now, was)=> Math.abs(now) >= .5 && Math.abs(was) < .5 ? Math.sign(now) : 0;
    const stickX = crossed(stick.x, menuStick.x), stickY = crossed(stick.y, menuStick.y);
    menuStick = {x: stick.x, y: stick.y};
    if (!screen || screen.hidden || gcInput.tick === screenOpenedTick || !menuItems(screen).length && !screenStack.length) return;
    if (screen.dispatchEvent(new CustomEvent('game:input', {detail: input, cancelable: true})) === false) return; // a screen that reads input itself
    if (input.device === 'gamepad')
    {
        const pad = (b)=> gamepadWasPressed(b);
        const dy = pad(12) ? -1 : pad(13) ? 1 : -stickY, dx = pad(14) ? -1 : pad(15) ? 1 : stickX;
        if (dx || dy) moveFocus(dy ? 0 : dx, dy);
        if (input.pressed.confirm && document.activeElement && screen.contains(document.activeElement)) document.activeElement.click();
    }
    if (input.pressed.back && !(document.activeElement && document.activeElement.matches('input')))
        screen.dispatchEvent(new CustomEvent('game:back'));
    else if (input.pressed.pause && screenStack.length)
        screen.dispatchEvent(new CustomEvent('game:pause'));
}

// pausing on blur: a game sets kitPauseOnBlur = () => state === 'play' (the kit's openPause does the rest)
addEventListener('blur', ()=> { if (typeof openPause === 'function' && kitCanPause()) openPause('blur'); });
document.addEventListener('visibilitychange', ()=> { if (document.hidden && typeof openPause === 'function' && kitCanPause()) openPause('blur'); });
