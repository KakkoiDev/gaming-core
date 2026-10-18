/*
    gaming-core input layer for LittleJS 1.27.0 (classic script, MIT, see LICENSE-gaming-core.txt)
    Load order in index.html: dist/littlejs.js, then input.js, then game.js.

    One call per engine tick, at the top of gameUpdate:
        const input = gcInput.update();
        input.moveX, input.moveY              // -1..1, y up, length never above 1 (the 'move' direction)
        input.step.move                       // {x, y} -1/0/1 for one tick when a direction is pushed (grids, menus)
        input.held.jump / input.pressed.jump / input.released.jump
        input.device                          // 'keyboard' | 'mouse' | 'gamepad' | 'touch'
        input.mouse.pos (world), input.mouse.screen, input.mouse.wheel
        input.gamepad.connected, input.gamepad.left / right sticks {x, y}
    While the world is paused with setPaused(true), gameUpdate does not run: call gcInput.update() in
    gameUpdatePost instead (the game kit does). More calls in the same tick return the same snapshot.

    Bindings, the same format as the ControlsRemap block, one entry per action:
        jump:   {keyboard: 'Space' or ['Space', 'KeyZ'], mouse: null | 0..4, gamepad: 0..16 or a list}
        move:   {keyboard: ['KeyW', 'KeyA', 'KeyS', 'KeyD'] (up, left, down, right) or a list of such sets,
                 gamepad: 'leftStick' | 'rightStick' | 'dpad' or a list of them}
        pause:  {..., fixed: true}            // fixed entries can not be rebound (pause and back by default)
    Keyboard values are KeyboardEvent.code; gamepad numbers are the standard mapping:
    0 south, 1 east, 2 west, 3 north, 4/5 shoulders, 6/7 triggers, 8 back, 9 start, 10/11 stick presses,
    12-15 d-pad up/down/left/right, 16 home. Saved in localStorage['<game-id>.settings'].bindings.
*/

'use strict';

// the default controls; games add or replace entries with gcInput.init({bindings: {dash: {keyboard: 'ShiftLeft', gamepad: 5}}})
const GC_INPUT_DEFAULTS = {
    move:     {keyboard: [['KeyW', 'KeyA', 'KeyS', 'KeyD'], ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']], gamepad: ['leftStick', 'dpad']},
    confirm:  {keyboard: ['Enter', 'Space'], mouse: 0, gamepad: 0, menu: true},
    back:     {keyboard: ['Escape', 'Backspace'], mouse: 2, gamepad: 1, menu: true, fixed: true},
    pause:    {keyboard: ['Escape', 'KeyP'], gamepad: 9, fixed: true},
    jump:     {keyboard: ['Space', 'KeyZ'], gamepad: 0},
    attack:   {keyboard: ['KeyJ', 'KeyX'], mouse: 0, gamepad: [2, 7]},
    interact: {keyboard: 'KeyE', gamepad: 3},
};

// other names games use for the same action; input.pressed.fire is input.pressed.attack unless the game binds its own fire
const GC_INPUT_ALIASES = {fire: 'attack', use: 'interact', talk: 'interact', cancel: 'back', select: 'confirm'};

const GC_INPUT_STICKS = ['leftStick', 'rightStick', 'dpad'];

// gamepad buttons by position (default, the GameKit words), or by a console's names on request
const GC_INPUT_PAD_NAMES = {
    position: {
        en: ['South button', 'East button', 'West button', 'North button', 'Left shoulder', 'Right shoulder', 'Left trigger', 'Right trigger',
            'Back', 'Start', 'Left stick press', 'Right stick press', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home'],
        ja: ['下ボタン', '右ボタン', '左ボタン', '上ボタン', '左ショルダー', '右ショルダー', '左トリガー', '右トリガー',
            'バック', 'スタート', '左スティック押し込み', '右スティック押し込み', '十字キー上', '十字キー下', '十字キー左', '十字キー右', 'ホーム'],
        short: ['South', 'East', 'West', 'North', 'L1', 'R1', 'L2', 'R2', 'Back', 'Start', 'L3', 'R3', '↑', '↓', '←', '→', 'Home'],
    },
    xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L3', 'R3', 'D-pad Up', 'D-pad Down', 'D-pad Left', 'D-pad Right', 'Home'],
    playstation: ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'D-pad Up', 'D-pad Down', 'D-pad Left', 'D-pad Right', 'PS'],
};
const GC_INPUT_POSITIONS = ['south', 'east', 'west', 'north'];
const GC_INPUT_WORDS = {
    en: {mouse: ['Left click', 'Middle click', 'Right click', 'Mouse 4', 'Mouse 5'], leftStick: 'Left stick', rightStick: 'Right stick', dpad: 'D-pad', tap: 'Tap'},
    ja: {mouse: ['左クリック', 'ホイールクリック', '右クリック', 'マウス4', 'マウス5'], leftStick: '左スティック', rightStick: '右スティック', dpad: '十字キー', tap: 'タップ'},
};

///////////////////////////////////////////////////////////////////////////////
// Pure mapping logic, no engine globals: unit tested in node by tests/input_core.cjs

const gcInputCore = {
    validKey: (code)=> typeof code === 'string' && /^[A-Z][A-Za-z0-9]+$/.test(code),
    validMouse: (b)=> Number.isInteger(b) && b >= 0 && b <= 4,
    validPad: (b)=> Number.isInteger(b) && b >= 0 && b <= 16,
    list: (value)=> value === undefined || value === null ? [] : Array.isArray(value) ? value : [value],

    // an old 'key:Space' / 'mouse:0' / 'pad:0' string list -> {keyboard, mouse, gamepad}; undefined if it is not one
    fromLegacy(list)
    {
        if (!Array.isArray(list) || !list.length || !list.every(b=> typeof b === 'string' && b.includes(':'))) return;
        const entry = {keyboard: [], mouse: [], gamepad: []};
        for (const binding of list)
        {
            const [device, code] = binding.split(':');
            if (device === 'key') entry.keyboard.push(code);
            else if (device === 'mouse') entry.mouse.push(+code);
            else if (device === 'pad') entry.gamepad.push(+code);
            else return;
        }
        return entry;
    },

    // old axes {moveX: {negative, positive, stick}, moveY: ...} -> the move direction entry
    fromLegacyAxes(axes)
    {
        if (!axes || !axes.moveX || !axes.moveY) return;
        const keys = (list)=> (Array.isArray(list) ? list : []).filter(b=> typeof b === 'string' && b.startsWith('key:')).map(b=> b.slice(4));
        const up = keys(axes.moveY.positive), left = keys(axes.moveX.negative), down = keys(axes.moveY.negative), right = keys(axes.moveX.positive);
        const sets = [];
        for (let i = 0; i < Math.min(up.length, left.length, down.length, right.length); ++i)
            sets.push([up[i], left[i], down[i], right[i]]);
        const gamepad = [], stick = String(axes.moveX.stick || '');
        if (stick.startsWith('left')) gamepad.push('leftStick');
        if (stick.startsWith('right')) gamepad.push('rightStick');
        if ((axes.moveX.negative || []).includes('pad:14')) gamepad.push('dpad');
        return {keyboard: sets, gamepad};
    },

    // a binding entry -> {keyboard: [], mouse: [], gamepad: [], fixed, menu, direction}; undefined if anything is invalid
    // direction entries: keyboard is a list of [up, left, down, right] sets, gamepad a list of stick names
    normalize(entry, direction)
    {
        const legacy = gcInputCore.fromLegacy(entry);
        if (legacy) entry = legacy;
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
        const gamepad = gcInputCore.list(entry.gamepad), mouse = gcInputCore.list(entry.mouse);
        let keyboard = gcInputCore.list(entry.keyboard);
        if (direction === undefined)
            direction = !!entry.direction || gamepad.some(b=> GC_INPUT_STICKS.includes(b)) || Array.isArray(keyboard[0]);
        if (direction)
        {
            if (keyboard.length && !Array.isArray(keyboard[0])) keyboard = [keyboard]; // one set written flat, as ControlsRemap does
            if (!keyboard.every(set=> Array.isArray(set) && set.length === 4 && set.every(gcInputCore.validKey))) return;
            if (!gamepad.every(b=> GC_INPUT_STICKS.includes(b)) || mouse.length) return;
        }
        else if (!keyboard.every(gcInputCore.validKey) || !gamepad.every(gcInputCore.validPad) || !mouse.every(gcInputCore.validMouse)) return;
        const result = {keyboard: keyboard.map(k=> Array.isArray(k) ? k.slice() : k), mouse: mouse.slice(), gamepad: gamepad.slice()};
        if (direction) result.direction = true;
        if (entry.fixed) result.fixed = true;
        if (entry.menu) result.menu = true;
        return result;
    },

    // a whole table -> normalized; throws with the entry's name when one is invalid (a game's own mistake)
    normalizeAll(table)
    {
        const result = {};
        for (const name in table)
        {
            const entry = gcInputCore.normalize(table[name]);
            if (!entry) throw new Error('gcInput: invalid binding for ' + name);
            result[name] = entry;
        }
        return result;
    },

    // the saved form: one value instead of a list of one, null for none (ControlsRemap's Data)
    compact(bindings)
    {
        const one = (list)=> !list.length ? null : list.length === 1 ? list[0] : list.slice();
        const result = {};
        for (const name in bindings)
        {
            const e = bindings[name], out = {keyboard: one(e.keyboard)};
            if (!e.direction) out.mouse = one(e.mouse);
            out.gamepad = one(e.gamepad);
            if (e.fixed) out.fixed = true;
            result[name] = out;
        }
        return result;
    },

    copy(bindings) { return JSON.parse(JSON.stringify(bindings)); },

    // defaults plus a game's entries (new names added, same names replaced); fixed lists more names that can not be rebound
    merge(defaults, extra = {}, fixed = [])
    {
        const result = gcInputCore.copy(defaults);
        Object.assign(result, gcInputCore.normalizeAll(extra || {}));
        for (const name of fixed) if (result[name]) result[name].fixed = true;
        return result;
    },

    // saved bindings -> bindings: known names only, fixed entries stay default, each device kept only when valid
    restore(saved, defaults)
    {
        const result = gcInputCore.copy(defaults);
        if (!saved || typeof saved !== 'object') return result;
        for (const name in result)
        {
            const base = result[name], entry = saved[name];
            if (base.fixed || !entry) continue;
            const source = gcInputCore.fromLegacy(entry) || entry;
            if (typeof source !== 'object' || Array.isArray(source)) continue;
            for (const device of base.direction ? ['keyboard', 'gamepad'] : ['keyboard', 'mouse', 'gamepad'])
            {
                if (!(device in source)) continue;
                const probe = gcInputCore.normalize({[device]: source[device]}, !!base.direction);
                if (probe) base[device] = probe[device];
            }
        }
        return result;
    },

    // the old saved shape {version: 1, actions: {...}, axes: {...}} -> a partial table restore() accepts
    migrate(old)
    {
        if (!old || typeof old !== 'object' || !old.actions || typeof old.actions !== 'object') return;
        const table = {};
        for (const name in old.actions)
        {
            const entry = gcInputCore.fromLegacy(old.actions[name]);
            if (entry) table[name === 'fire' ? 'attack' : name] = entry;
        }
        const move = gcInputCore.fromLegacyAxes(old.axes);
        if (move) table.move = move;
        return table;
    },

    resolve(bindings, name) { return bindings[name] || !GC_INPUT_ALIASES[name] ? name : GC_INPUT_ALIASES[name]; },

    // replace one or more devices of an action: bind(b, 'jump', {keyboard: ['KeyK']}); false (nothing changed) if fixed or invalid
    bind(bindings, name, value)
    {
        name = gcInputCore.resolve(bindings, name);
        const base = bindings[name];
        if (!base || base.fixed) return false;
        const legacy = gcInputCore.fromLegacy(value);
        const source = legacy || value;
        if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
        const probe = gcInputCore.normalize(source, !!base.direction);
        if (!probe) return false;
        for (const device of ['keyboard', 'mouse', 'gamepad'])
            if (device in source || legacy) base[device] = probe[device];
        return true;
    },

    // the ControlsRemap change: set input `code` on `device` as the action's slot (default 0; 0-3 = up, left, down, right of
    // a direction's first key set). If another action of the same kind (menu or play) uses it, the two swap.
    // Returns {ok: true, swapped: name | null} or {ok: false, reason: 'fixed' | 'invalid' | 'unknown'}
    rebind(bindings, name, device, code, slot = 0)
    {
        name = gcInputCore.resolve(bindings, name);
        const base = bindings[name];
        if (!base) return {ok: false, reason: 'unknown'};
        if (base.fixed) return {ok: false, reason: 'fixed'};
        const valid = device === 'keyboard' ? gcInputCore.validKey(code) : device === 'mouse' ? !base.direction && gcInputCore.validMouse(code) :
            device === 'gamepad' ? (base.direction ? GC_INPUT_STICKS.includes(code) : gcInputCore.validPad(code)) : false;
        if (!valid || slot < 0 || (base.direction && device === 'keyboard' && slot > 3)) return {ok: false, reason: 'invalid'};
        const directionKeys = base.direction && device === 'keyboard';
        if (directionKeys && !base.keyboard.length) return {ok: false, reason: 'invalid'};
        const list = directionKeys ? base.keyboard[0] : base[device];
        const old = list[slot];
        if (old === code) return {ok: true, swapped: null};
        // who else of the same kind uses it
        let other, where;
        for (const otherName in bindings)
        {
            const e = bindings[otherName];
            if (!!e.menu !== !!base.menu) continue;
            for (const l of e.direction && device === 'keyboard' ? e.keyboard : [e[device]])
            {
                const i = l.indexOf(code);
                if (i >= 0 && !(l === list && i === slot)) { other = otherName; where = [l, i]; break; }
            }
            if (other) break;
        }
        if (other && bindings[other].fixed) return {ok: false, reason: 'fixed'};
        if (other)
        {
            if (old === undefined) where[0].splice(where[1], 1);
            else where[0][where[1]] = old;
        }
        if (slot >= list.length) list.push(code); else list[slot] = code;
        return {ok: true, swapped: other && other !== name ? other : null};
    },

    // radial dead zone: inside `zone` is 0, outside is rescaled so the edge of the zone is 0 and full tilt is 1
    deadZone(x, y, zone)
    {
        const length = Math.hypot(x, y);
        if (!(length > zone) || zone >= 1) return {x: 0, y: 0};
        const scale = Math.min(1, (length - zone) / (1 - zone)) / length;
        return {x: x * scale, y: y * scale};
    },

    clampLength(x, y)
    {
        const length = Math.hypot(x, y);
        return length > 1 ? {x: x / length, y: y / length} : {x, y};
    },

    // pressed/released edges from last tick's held state, this tick's held state and a tap
    // (a source pressed and let go inside one tick still counts as pressed then released)
    edges(wasHeld, held, tapped)
    {
        const pressed = !wasHeld && (held || tapped);
        return {pressed, released: (wasHeld && !held) || (pressed && !held)};
    },

    // one tick's snapshot. reader: {down(source), pressed(source), stick('left'|'right') -> {x, y}, and optionally
    // virtualHeld(name), virtualTapped(name), virtualDir(name) -> {x, y}}; source = {device, code}
    snapshot(bindings, reader, previous, stickDeadZone = 0)
    {
        const left = reader.stick('left'), right = reader.stick('right');
        const sticks = {left: gcInputCore.deadZone(left.x, left.y, stickDeadZone), right: gcInputCore.deadZone(right.x, right.y, stickDeadZone)};
        const state = {held: {}, pressed: {}, released: {}, dirs: {}, step: {}, sticks};
        const read = (device, code)=> ({down: reader.down({device, code}), pressed: reader.pressed({device, code})});
        for (const name in bindings)
        {
            const e = bindings[name];
            if (e.direction)
            {
                // digital: keys and d-pad; analog: sticks and an on-screen stick
                let x = 0, y = 0, stepX = 0, stepY = 0;
                const digital = (up, leftDir, down, rightDir)=>
                {
                    x += (rightDir.down ? 1 : 0) - (leftDir.down ? 1 : 0), y += (up.down ? 1 : 0) - (down.down ? 1 : 0);
                    stepX += (rightDir.pressed ? 1 : 0) - (leftDir.pressed ? 1 : 0), stepY += (up.pressed ? 1 : 0) - (down.pressed ? 1 : 0);
                };
                for (const set of e.keyboard)
                    digital(...set.map(code=> read('keyboard', code)));
                for (const source of e.gamepad)
                {
                    if (source === 'dpad') digital(read('gamepad', 12), read('gamepad', 14), read('gamepad', 13), read('gamepad', 15));
                    else { const s = sticks[source === 'rightStick' ? 'right' : 'left']; x += s.x, y += s.y; }
                }
                const virtual = reader.virtualDir && reader.virtualDir(name);
                if (virtual) x += virtual.x, y += virtual.y;
                const dir = gcInputCore.clampLength(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
                // analog steps: crossing half tilt counts as one push, so a stick moves a grid cursor one cell at a time
                const was = previous && previous.dirs[name] || {x: 0, y: 0};
                const cross = (now, before)=> Math.abs(now) >= .5 && Math.abs(before) < .5 ? Math.sign(now) : 0;
                if (!stepX) stepX = cross(dir.x, was.x);
                if (!stepY) stepY = cross(dir.y, was.y);
                state.dirs[name] = dir;
                state.step[name] = {x: Math.sign(stepX), y: Math.sign(stepY)};
                continue;
            }
            let held = false, tapped = false;
            for (const device of ['keyboard', 'mouse', 'gamepad'])
                for (const code of e[device])
                {
                    const r = read(device, code);
                    held = held || r.down, tapped = tapped || r.pressed;
                }
            if (reader.virtualHeld) held = held || !!reader.virtualHeld(name);
            if (reader.virtualTapped) tapped = tapped || !!reader.virtualTapped(name);
            const edge = gcInputCore.edges(!!(previous && previous.held[name]), held, tapped);
            state.held[name] = held, state.pressed[name] = edge.pressed, state.released[name] = edge.released;
        }
        for (const alias in GC_INPUT_ALIASES)
        {
            const target = GC_INPUT_ALIASES[alias];
            if (bindings[alias] || !bindings[target] || bindings[target].direction) continue;
            state.held[alias] = state.held[target], state.pressed[alias] = state.pressed[target], state.released[alias] = state.released[target];
        }
        const move = state.dirs.move || {x: 0, y: 0};
        state.moveX = move.x, state.moveY = move.y;
        return state;
    },

    // the key as printed: 'KeyW' -> 'W', 'Escape' -> 'Esc', arrows as arrows; layout = navigator.keyboard's map when known
    keyLabel(code, layout)
    {
        const words = {Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backspace: 'Backspace', Enter: 'Enter', Space: 'Space'};
        if (words[code]) return words[code];
        const printed = layout && layout[code];
        if (printed && printed.trim()) return printed.toUpperCase();
        return code.replace(/^(Key|Digit|Numpad)/, '').replace(/(Left|Right)$/, '');
    },

    // the parts of a prompt for an action on a device, for HTML prompts (the game kit) and text:
    // [{kind: 'key'|'mouse'|'pad'|'stick'|'tap', code, label, short, pos?, button?}]; a direction's keys come as four parts
    glyphs(bindings, name, device, padStyle = 'position', lang = 'en', layout)
    {
        name = gcInputCore.resolve(bindings, name);
        const e = bindings[name], words = GC_INPUT_WORDS[lang] || GC_INPUT_WORDS.en;
        if (!e) return [];
        const pad = (b)=>
        {
            if (GC_INPUT_PAD_NAMES[padStyle] && padStyle !== 'position')
                return {kind: 'pad', code: b, label: GC_INPUT_PAD_NAMES[padStyle][b], short: GC_INPUT_PAD_NAMES[padStyle][b]};
            const names = GC_INPUT_PAD_NAMES.position, glyph = {kind: 'pad', code: b, label: (names[lang] || names.en)[b], short: names.short[b]};
            if (b < 4) glyph.pos = GC_INPUT_POSITIONS[b];
            return glyph;
        };
        const key = (code)=> ({kind: 'key', code, label: gcInputCore.keyLabel(code, layout), short: gcInputCore.keyLabel(code, layout)});
        const mouse = (b)=> ({kind: 'mouse', code: b, label: words.mouse[b], short: words.mouse[b], button: ['left', 'wheel', 'right'][b]});
        if (e.direction)
        {
            if (device === 'gamepad') return e.gamepad.length ? [{kind: 'stick', code: e.gamepad[0], label: words[e.gamepad[0]], short: words[e.gamepad[0]]}] : [];
            if (device === 'touch') return [];
            return e.keyboard.length ? e.keyboard[0].map(key) : [];
        }
        if (device === 'gamepad') return e.gamepad.length ? [pad(e.gamepad[0])] : [];
        if (device === 'touch') return e.mouse.includes(0) ? [{kind: 'tap', code: 0, label: words.tap, short: words.tap}] : [];
        if (device === 'mouse' && e.mouse.length) return [mouse(e.mouse[0])];
        return e.keyboard.length ? [key(e.keyboard[0])] : [];
    },

    // prompt text for an action or a direction: ('jump','keyboard') -> 'Space', ('jump','gamepad') -> 'South button',
    // ('move','keyboard') -> 'W A S D', ('move','gamepad') -> 'Left stick'; '' when the device has no binding for it
    prompt(bindings, name, device, padStyle = 'position', lang = 'en', layout)
    {
        return gcInputCore.glyphs(bindings, name, device, padStyle, lang, layout).map(g=> g.label).join(' ');
    },
};

///////////////////////////////////////////////////////////////////////////////
// Engine adapter: reads LittleJS 1.27.0 input globals

const gcInput = {
    options: {gameId: '', stickDeadZone: .1, padStyle: 'position', lang: ''},
    defaults: gcInputCore.normalizeAll(GC_INPUT_DEFAULTS),
    bindings: gcInputCore.normalizeAll(GC_INPUT_DEFAULTS),
    state: undefined,
    ready: false,
    lastInput: null,      // {device, code} pressed this tick on any device, for "press a key" screens
    keyQueue: [],
    tick: 0,              // engine ticks seen, paused ones included
    readTick: -1,
    touchActive: false,
    virtual: {held: {}, tapped: {}, dirs: {}},
    layout: undefined,    // printed key names from navigator.keyboard, when the browser has it
    legacyKeys: [],

    // the storage key: localStorage['<game-id>.settings'], <game-id> = the game's folder name in kebab case
    storageKey() { return (this.options.gameId || gcInput.gameIdFromPath()) + '.settings'; },
    gameIdFromPath()
    {
        const parts = typeof location !== 'undefined' ? location.pathname.split('/').filter(p=> p && !p.includes('.')) : [];
        const folder = parts.length ? decodeURIComponent(parts[parts.length - 1]) : 'game';
        return folder.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'game';
    },

    // call once in gameInit; options: gameId, bindings (added or replaced entries), fixed (more names that can not be
    // rebound), stickDeadZone, padStyle ('position' | 'xbox' | 'playstation'), lang ('en' | 'ja', default from <html lang>),
    // storageKey (an old 'mygame.input' save to migrate from)
    init(options = {})
    {
        const {bindings, actions, axes, fixed, storageKey, ...rest} = options;
        Object.assign(this.options, rest);
        const extra = {...(bindings || {})};
        // the old init({actions: {dash: ['key:ShiftLeft', 'pad:5']}}) still works
        for (const name in actions || {}) extra[name === 'fire' ? 'attack' : name] = actions[name];
        if (axes) { const move = gcInputCore.fromLegacyAxes(axes); if (move) extra.move = move; }
        this.defaults = gcInputCore.merge(gcInputCore.normalizeAll(GC_INPUT_DEFAULTS), extra, fixed || []);
        // old saves: the given storageKey, '<folder>.input' as the old starters named it, and the old default
        const folder = typeof location !== 'undefined' ? decodeURIComponent(location.pathname.split('/').filter(p=> p && !p.includes('.')).pop() || '') : '';
        this.legacyKeys = [storageKey, folder && folder + '.input', (this.options.gameId || this.gameIdFromPath()) + '.input', 'gaming-core.input'].filter(Boolean);
        // the binding table owns WASD and the d-pad, so the engine's built-in aliases are turned off
        inputWASDEmulateDirection = false;
        gamepadDirectionEmulateStick = false;
        if (!this.ready && typeof document !== 'undefined')
        {
            document.addEventListener('keydown', (e)=> { this.touchActive = false; this.keyQueue.length < 32 && this.keyQueue.push(e.code); });
            // touch is its own device: LittleJS reports a tap as the mouse
            addEventListener('pointerdown', (e)=> this.touchActive = e.pointerType === 'touch', true);
            addEventListener('pointermove', (e)=> { if (e.pointerType === 'mouse') this.touchActive = false; }, true);
            if (typeof navigator !== 'undefined' && navigator.keyboard && navigator.keyboard.getLayoutMap)
                navigator.keyboard.getLayoutMap().then(map=> this.layout = Object.fromEntries(map), ()=> {});
            // count engine ticks, paused ones too, so update() reads each tick exactly once
            const end = inputUpdatePost;
            inputUpdatePost = function() { end(); gcInput.tick++; gcInput.virtual.tapped = {}; };
        }
        this.ready = true;
        this.load();
        this.state = undefined;
        return this;
    },

    update()
    {
        if (!this.ready) this.init();
        if (this.state && this.readTick === this.tick) return this.state; // already read this tick
        this.readTick = this.tick;
        const virtual = this.virtual;
        const reader = {
            down: (s)=> s.device === 'keyboard' ? keyIsDown(s.code) : s.device === 'mouse' ? mouseIsDown(s.code) : gamepadIsDown(s.code),
            pressed: (s)=> s.device === 'keyboard' ? keyWasPressed(s.code) : s.device === 'mouse' ? mouseWasPressed(s.code) : gamepadWasPressed(s.code),
            stick: (side)=> gamepadStick(side === 'right' ? 1 : 0),
            virtualHeld: (name)=> virtual.held[name],
            virtualTapped: (name)=> virtual.tapped[name],
            virtualDir: (name)=> virtual.dirs[name],
        };
        const previous = this.state;
        const state = gcInputCore.snapshot(this.bindings, reader, previous, this.options.stickDeadZone);
        const connected = gamepadConnected();
        state.gamepad = {
            connected, index: gamepadPrimary,
            justConnected: connected && !(previous && previous.gamepad.connected),
            justDisconnected: !connected && !!(previous && previous.gamepad.connected),
            left: state.sticks.left, right: state.sticks.right,
        };
        // a pulled controller no longer counts as the active device; a tap is touch, not the mouse
        let device = lastInputDevice === 'gamepad' && !connected ? 'keyboard' : lastInputDevice;
        if (this.touchActive && device !== 'gamepad') device = 'touch';
        state.device = device;
        state.mouse = {pos: mousePos.copy(), screen: mousePosScreen.copy(), delta: mouseDelta.copy(), wheel: mouseWheel, inWindow: mouseInWindow};
        this.lastInput = this.findPressed();
        this.keyQueue.length = 0;
        return this.state = state;
    },

    // the input pressed this tick on any device, null if none (use it to rebind): {device: 'keyboard', code: 'KeyK'}
    findPressed()
    {
        for (const code of this.keyQueue)
            if (keyWasPressed(code)) return {device: 'keyboard', code};
        for (let b = 0; b < 3; ++b)
            if (mouseWasPressed(b)) return {device: 'mouse', code: b};
        for (let b = 0; b < 17; ++b)
            if (gamepadWasPressed(b)) return {device: 'gamepad', code: b};
        return null;
    },

    // on-screen controls (TouchControls): press('jump', true) ... press('jump', false); stick('move', x, y), y up
    press(name, down)
    {
        name = gcInputCore.resolve(this.bindings, name);
        this.touchActive = true;
        if (down && !this.virtual.held[name]) this.virtual.tapped[name] = true;
        this.virtual.held[name] = !!down;
    },
    stick(name, x, y) { this.touchActive = true; this.virtual.dirs[name] = x || y ? {x, y} : undefined; },

    lang() { return this.options.lang || (typeof document !== 'undefined' && /^ja/i.test(document.documentElement.lang) ? 'ja' : 'en'); },
    device() { return this.state ? this.state.device : lastInputDevice; },
    // replace devices of an action: gcInput.bind('jump', {keyboard: ['KeyK'], gamepad: 0}); false if fixed or invalid
    bind(name, value) { return gcInputCore.bind(this.bindings, name, value); },
    // ControlsRemap: one new input with swapping, saved at once; returns {ok, swapped} or {ok: false, reason}
    rebind(name, device, code, slot)
    {
        const result = gcInputCore.rebind(this.bindings, name, device, code, slot);
        if (result.ok) this.save();
        return result;
    },
    isFixed(name) { const e = this.bindings[gcInputCore.resolve(this.bindings, name)]; return !!(e && e.fixed); },
    prompt(name, device = this.device())
    { return gcInputCore.prompt(this.bindings, name, device, this.options.padStyle, this.lang(), this.layout); },
    glyphs(name, device = this.device())
    { return gcInputCore.glyphs(this.bindings, name, device, this.options.padStyle, this.lang(), this.layout); },

    // bindings live inside the game's settings object, next to language and volume (GameKit's Data)
    save()
    {
        const key = this.storageKey(), settings = readSaveData(key, {});
        if (!settings.v) settings.v = 1;
        settings.bindings = gcInputCore.compact(this.bindings);
        return writeSaveData(key, settings);
    },
    load()
    {
        const settings = readSaveData(this.storageKey(), {});
        if (settings.bindings && typeof settings.bindings === 'object')
            return this.bindings = gcInputCore.restore(settings.bindings, this.defaults);
        // migrate an old string-format save once, into the settings object (the old key is left as it was)
        this.bindings = gcInputCore.copy(this.defaults);
        for (const key of this.legacyKeys)
        {
            const table = gcInputCore.migrate(readSaveData(key, {}));
            if (!table) continue;
            this.bindings = gcInputCore.restore(table, this.defaults);
            this.save();
            break;
        }
        return this.bindings;
    },
    reset() { this.bindings = gcInputCore.copy(this.defaults); return this.save(); },
};

if (typeof module !== 'undefined') module.exports = {gcInputCore, gcInput, GC_INPUT_DEFAULTS, GC_INPUT_ALIASES, GC_INPUT_PAD_NAMES};
