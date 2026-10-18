/*
    GameKit input glue (from the designer's GameKit card), on top of gaming-core's input layer js/gc-input.js:
    the game id, the device in use written on .game as data-device, touch, and prompts as HTML.
    The card's inputInit() and inputUpdate() are named gameInputInit() and gameInput() here: LittleJS 1.27.0 has
    internal globals with the card's names, and replacing them stops the engine's own input.
    gcInput holds, saves and resets every binding (under '<game-id>.input'); there is no other copy.
*/
'use strict';

// <html data-game-id="star-lane">; the folder name in kebab case otherwise
const GAME_ID = document.documentElement.dataset.gameId || gcInput.defaultStorageKey().replace(/\.input$/, '');
const gameBox = document.getElementById('game');

// call from gameInit() with the genre's own actions (gaming-core's: moveX/moveY, jump, fire, confirm, back, pause)
function gameInputInit(actions = {}, axes = undefined)
{
    gcInput.init({storageKey: GAME_ID + '.input', padStyle: 'position', fixed: ['pause', 'back'], actions, axes});
}

// keyboard | mouse | gamepad from gaming-core; touch from pointer events (LittleJS reports a tap as the mouse)
// touch stays the device until a key, a real mouse or the gamepad is used (a tap may reach LittleJS as the mouse or not at all)
let touching = false, padWas = false;
addEventListener('pointerdown', (e)=> { touching = e.pointerType === 'touch'; if (touching) gameBox.dataset.device = 'touch'; }, true);
addEventListener('pointermove', (e)=> { if (e.pointerType === 'mouse') touching = false; }, true);
addEventListener('keydown', ()=> { touching = false; }, true);

// TouchControls fills this; gameInput() merges it so on-screen buttons press the same actions
const touchState = {pressed: {}, held: {}, move: null};

// call first in gameUpdate(); returns gaming-core's snapshot (the same object for the rest of the tick)
function gameInput()
{
    const input = gcInput.update();
    if (input.touchMerged) return input;
    input.touchMerged = true;
    if (input.device === 'gamepad' && !padWas) touching = false;
    padWas = input.device === 'gamepad';
    gameBox.dataset.device = touching ? 'touch' : input.device;
    const t = touchState.pressed;
    for (const name in t) { input.pressed[name] = input.pressed[name] || t[name]; }
    for (const name in touchState.held) { input.held[name] = input.held[name] || touchState.held[name]; }
    if (touchState.move) { input.moveX = input.moveX || touchState.move.x; input.moveY = input.moveY || touchState.move.y; }
    touchState.pressed = {};
    return input;
}

function inputDevice() { return gameBox.dataset.device || 'keyboard'; }

// The prompt for an action on the device in use, as HTML, in the page's language. 'move' is the move axes.
const PAD = ['south', 'east', 'west', 'north', 'left_shoulder', 'right_shoulder', 'left_trigger', 'right_trigger',
    'select', 'start', 'left_stick', 'right_stick', 'dpad_up', 'dpad_down', 'dpad_left', 'dpad_right', 'home'];
function bindingHTML(binding)
{
    const [kind, code] = binding.split(':');
    if (kind === 'pad')
    {
        const pos = PAD[+code];
        return +code < 4
            ? `<span class="game-padpos" data-pos="${pos}" aria-label="${t('game.pad.' + pos)}"></span>`
            : `<span class="game-padkey" aria-label="${t('game.pad.' + pos)}">${t('game.pad.' + pos + '.short')}</span>`;
    }
    const button = ['left', 'middle', 'right'][+code] || 'left';
    if (kind === 'mouse') return `<span class="game-mouse" data-button="${button === 'middle' ? 'wheel' : button}" aria-label="${t('game.mouse.' + button)}"></span>`;
    if (kind === 'key') return `<span class="game-key">${gcInputCore.label(binding)}</span>`;
    return '';
}
function promptHTML(action, device = inputDevice())
{
    if (device === 'touch') return gcInput.binding(action, 'mouse').startsWith('mouse:0') ? `<span class="game-key">${t('dlg.tap')}</span>` : '';
    if (action === 'move')
    {
        if (device === 'gamepad') return `<span class="game-padkey">${t('game.pad.left_stick_move')}</span>`;
        const axes = gcInput.bindings.axes, first = (list)=> gcInputCore.first(list, 'keyboard');
        return [first(axes.moveY.positive), first(axes.moveX.negative), first(axes.moveY.negative), first(axes.moveX.positive)]
            .filter(Boolean).map(bindingHTML).join('');
    }
    const binding = gcInput.binding(action, device);
    return binding ? bindingHTML(binding) : '';
}
