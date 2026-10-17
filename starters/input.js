/*
    gaming-core input layer for LittleJS 1.27.0 (classic script, MIT, see LICENSE-gaming-core.txt)
    Load order in index.html: dist/littlejs.js, then input.js, then game.js.

    One call per frame, at the top of gameUpdate:
        const input = gcInput.update();
        input.moveX, input.moveY              // -1..1, y up, length never above 1
        input.held.jump / input.pressed.jump / input.released.jump
        input.device                          // 'keyboard' | 'mouse' | 'gamepad'
        input.mouse.pos (world), input.mouse.screen, input.mouse.wheel
        input.gamepad.connected, input.gamepad.left / right sticks {x, y}
    Elsewhere in the same frame read gcInput.state instead of calling update() again.

    Bindings are strings: 'key:<KeyboardEvent.code>', 'mouse:<0 left|1 middle|2 right>',
    'pad:<standard button 0..16>'. Axes also take stick: 'left.x' | 'left.y' | 'right.x' | 'right.y'.
*/

'use strict';

const GC_INPUT_VERSION = 1;

// default controls; add game actions with gcInput.init({actions: {dash: ['key:ShiftLeft', 'pad:5']}})
const GC_INPUT_DEFAULTS = {
    axes: {
        moveX: {negative: ['key:ArrowLeft', 'key:KeyA', 'pad:14'], positive: ['key:ArrowRight', 'key:KeyD', 'pad:15'], stick: 'left.x'},
        moveY: {negative: ['key:ArrowDown', 'key:KeyS', 'pad:13'], positive: ['key:ArrowUp', 'key:KeyW', 'pad:12'], stick: 'left.y'},
    },
    actions: {
        jump:    ['key:Space', 'key:KeyZ', 'pad:0'],
        fire:    ['key:KeyX', 'key:KeyJ', 'mouse:0', 'pad:2', 'pad:7'],
        confirm: ['key:Enter', 'key:Space', 'mouse:0', 'pad:0'],
        back:    ['key:Escape', 'key:Backspace', 'mouse:2', 'pad:1'],
        pause:   ['key:Escape', 'key:KeyP', 'pad:9'],
    },
};

// standard mapping button names, index = button number
const GC_INPUT_PAD_NAMES = {
    xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L3', 'R3', 'D-pad Up', 'D-pad Down', 'D-pad Left', 'D-pad Right', 'Home'],
    playstation: ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'D-pad Up', 'D-pad Down', 'D-pad Left', 'D-pad Right', 'PS'],
};
const GC_INPUT_MOUSE_NAMES = ['Left click', 'Middle click', 'Right click', 'Mouse 4', 'Mouse 5'];

///////////////////////////////////////////////////////////////////////////////
// Pure mapping logic, no engine globals: unit tested in node by tests/input_core.cjs

const gcInputCore = {
    // 'key:Space' -> {device: 'key', code: 'Space'}, 'pad:0' -> {device: 'pad', code: 0}; undefined if invalid
    parse(binding)
    {
        if (typeof binding !== 'string') return;
        const split = binding.indexOf(':');
        const device = binding.slice(0, split), code = binding.slice(split + 1);
        if (device === 'key' && /^[A-Za-z][A-Za-z0-9]+$/.test(code)) return {device, code};
        if (device === 'mouse' && /^[0-4]$/.test(code)) return {device, code: +code};
        if (device === 'pad' && /^([0-9]|1[0-6])$/.test(code)) return {device, code: +code};
    },

    // radial dead zone: inside `zone` is 0, outside is rescaled so the edge of the zone is 0 and full tilt is 1
    deadZone(x, y, zone)
    {
        const length = Math.hypot(x, y);
        if (!(length > zone) || zone >= 1) return {x: 0, y: 0};
        const scale = Math.min(1, (length - zone) / (1 - zone)) / length;
        return {x: x * scale, y: y * scale};
    },

    // digital negative/positive plus an analog value, clamped to -1..1
    axis(negative, positive, analog = 0)
    {
        return Math.max(-1, Math.min(1, (positive ? 1 : 0) - (negative ? 1 : 0) + analog));
    },

    // pressed/released edges from last frame's held state, this frame's held state and a tap
    // (a source pressed and let go inside one frame still counts as pressed then released)
    edges(wasHeld, held, tapped)
    {
        const pressed = !wasHeld && (held || tapped);
        return {pressed, released: (wasHeld && !held) || (pressed && !held)};
    },

    // read a list of bindings through a reader {down(source), pressed(source)}
    read(reader, list)
    {
        let held = false, tapped = false;
        for (const binding of list || [])
        {
            const source = gcInputCore.parse(binding);
            if (!source) continue;
            held = held || reader.down(source);
            tapped = tapped || reader.pressed(source);
        }
        return {held, tapped};
    },

    // build one frame's snapshot; reader: {down, pressed, stick(side)->{x,y}}, previous: last snapshot or undefined
    snapshot(bindings, reader, previous, stickDeadZone = 0)
    {
        const left = reader.stick('left'), right = reader.stick('right');
        const sticks = {left: gcInputCore.deadZone(left.x, left.y, stickDeadZone), right: gcInputCore.deadZone(right.x, right.y, stickDeadZone)};
        const state = {held: {}, pressed: {}, released: {}, axes: {}, sticks};
        for (const name in bindings.axes)
        {
            const axis = bindings.axes[name], stick = String(axis.stick || '').split('.');
            const analog = sticks[stick[0]] ? sticks[stick[0]][stick[1]] || 0 : 0;
            state.axes[name] = gcInputCore.axis(gcInputCore.read(reader, axis.negative).held, gcInputCore.read(reader, axis.positive).held, analog);
        }
        // the move vector is clamped to length 1 so diagonals are not faster
        let moveX = state.axes.moveX || 0, moveY = state.axes.moveY || 0;
        const length = Math.hypot(moveX, moveY);
        if (length > 1) moveX /= length, moveY /= length;
        state.moveX = moveX, state.moveY = moveY;
        for (const name in bindings.actions)
        {
            const {held, tapped} = gcInputCore.read(reader, bindings.actions[name]);
            const edge = gcInputCore.edges(!!(previous && previous.held[name]), held, tapped);
            state.held[name] = held, state.pressed[name] = edge.pressed, state.released[name] = edge.released;
        }
        return state;
    },

    copy(bindings) { return JSON.parse(JSON.stringify(bindings)); },

    // defaults plus game additions; extra = {actions: {...}, axes: {...}}
    merge(defaults, extra = {})
    {
        const result = gcInputCore.copy(defaults);
        Object.assign(result.actions, gcInputCore.copy(extra.actions || {}));
        Object.assign(result.axes, gcInputCore.copy(extra.axes || {}));
        return result;
    },

    // saved data -> bindings, keeping only known names and valid binding strings; anything else is the default
    restore(saved, defaults)
    {
        const result = gcInputCore.copy(defaults);
        if (!saved || saved.version !== GC_INPUT_VERSION) return result;
        const valid = (list)=> Array.isArray(list) && list.every(b=> gcInputCore.parse(b));
        for (const name in result.actions)
            if (saved.actions && valid(saved.actions[name])) result.actions[name] = saved.actions[name].slice();
        for (const name in result.axes)
            for (const side of ['negative', 'positive'])
                if (saved.axes && saved.axes[name] && valid(saved.axes[name][side])) result.axes[name][side] = saved.axes[name][side].slice();
        return result;
    },

    // replace the bindings of 'jump' or 'moveX.negative'; returns false (and changes nothing) if invalid
    bind(bindings, name, list)
    {
        if (!Array.isArray(list) || !list.every(b=> gcInputCore.parse(b))) return false;
        const [axisName, side] = name.split('.');
        if (side && bindings.axes[axisName] && (side === 'negative' || side === 'positive'))
            return bindings.axes[axisName][side] = list.slice(), true;
        if (!side && bindings.actions[name]) return bindings.actions[name] = list.slice(), true;
        return false;
    },

    // readable name of one binding: 'key:KeyW' -> 'W', 'pad:0' -> 'A', 'mouse:0' -> 'Left click'
    label(binding, padStyle = 'xbox')
    {
        const source = gcInputCore.parse(binding);
        if (!source) return '?';
        if (source.device === 'pad') return (GC_INPUT_PAD_NAMES[padStyle] || GC_INPUT_PAD_NAMES.xbox)[source.code];
        if (source.device === 'mouse') return GC_INPUT_MOUSE_NAMES[source.code];
        const code = source.code, words = {Escape: 'Esc', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right'};
        return words[code] || code.replace(/^(Key|Digit)/, '').replace(/(Left|Right)$/, ' $1');
    },

    // prompt text for an action, an axis or 'move': ('jump','gamepad') -> 'A', ('moveX','keyboard') -> 'Left/Right'
    prompt(bindings, name, device, padStyle = 'xbox')
    {
        const want = device === 'gamepad' ? ['pad'] : device === 'mouse' ? ['mouse', 'key'] : ['key'];
        const first = (list)=>
        {
            for (const kind of want)
                for (const binding of list || [])
                    if (gcInputCore.parse(binding)?.device === kind) return gcInputCore.label(binding, padStyle);
            return '';
        };
        if (name === 'move' && bindings.axes.moveX && bindings.axes.moveY)
            return device === 'gamepad' ? gcInputCore.prompt(bindings, 'moveX', device, padStyle) :
                gcInputCore.prompt(bindings, 'moveX', device, padStyle) + ' ' + gcInputCore.prompt(bindings, 'moveY', device, padStyle);
        const axis = bindings.axes[name];
        if (axis)
        {
            if (device === 'gamepad' && axis.stick) return axis.stick.startsWith('right') ? 'Right stick' : 'Left stick';
            const negative = first(axis.negative), positive = first(axis.positive);
            return negative && positive ? negative + '/' + positive : negative || positive;
        }
        return first(bindings.actions[name]);
    },
};

///////////////////////////////////////////////////////////////////////////////
// Engine adapter: reads LittleJS 1.27.0 input globals

const gcInput = {
    options: {storageKey: 'gaming-core.input', stickDeadZone: .1, padStyle: 'xbox'},
    defaults: gcInputCore.copy(GC_INPUT_DEFAULTS),
    bindings: gcInputCore.copy(GC_INPUT_DEFAULTS),
    state: undefined,
    ready: false,
    lastBinding: '',      // binding pressed this frame on any device, for rebinding screens
    keyQueue: [],
    frame: -1,

    // call once in gameInit; options: storageKey, stickDeadZone, padStyle, actions, axes
    init(options = {})
    {
        const {actions, axes, ...rest} = options;
        Object.assign(this.options, rest);
        this.defaults = gcInputCore.merge(GC_INPUT_DEFAULTS, {actions, axes});
        // the binding table owns WASD and the d-pad, so the engine's built-in aliases are turned off
        inputWASDEmulateDirection = false;
        gamepadDirectionEmulateStick = false;
        if (!this.ready && typeof document !== 'undefined')
            document.addEventListener('keydown', (e)=> this.keyQueue.length < 32 && this.keyQueue.push(e.code));
        this.ready = true;
        this.load();
        this.state = undefined;
        return this;
    },

    update()
    {
        if (!this.ready) this.init();
        if (this.state && !paused && frame === this.frame) return this.state; // already read this frame
        this.frame = frame;
        const reader = {
            down: (s)=> s.device === 'key' ? keyIsDown(s.code) : s.device === 'mouse' ? mouseIsDown(s.code) : gamepadIsDown(s.code),
            pressed: (s)=> s.device === 'key' ? keyWasPressed(s.code) : s.device === 'mouse' ? mouseWasPressed(s.code) : gamepadWasPressed(s.code),
            stick: (side)=> gamepadStick(side === 'right' ? 1 : 0),
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
        // a pulled controller no longer counts as the active device
        state.device = lastInputDevice === 'gamepad' && !connected ? 'keyboard' : lastInputDevice;
        state.mouse = {pos: mousePos.copy(), screen: mousePosScreen.copy(), delta: mouseDelta.copy(), wheel: mouseWheel, inWindow: mouseInWindow};
        this.lastBinding = this.findPressed();
        this.keyQueue.length = 0;
        return this.state = state;
    },

    // the binding string pressed this frame on any device, '' if none (use it to rebind)
    findPressed()
    {
        for (const code of this.keyQueue)
            if (keyWasPressed(code)) return 'key:' + code;
        for (let b = 0; b < 3; ++b)
            if (mouseWasPressed(b)) return 'mouse:' + b;
        for (let b = 0; b < 17; ++b)
            if (gamepadWasPressed(b)) return 'pad:' + b;
        return '';
    },

    // replace bindings: gcInput.bind('jump', ['key:KeyK', 'pad:0']) or gcInput.bind('moveX.negative', [...])
    bind(name, list) { return gcInputCore.bind(this.bindings, name, list); },
    prompt(name, device = this.state ? this.state.device : lastInputDevice)
    { return gcInputCore.prompt(this.bindings, name, device, this.options.padStyle); },
    save() { return writeSaveData(this.options.storageKey, {version: GC_INPUT_VERSION, actions: this.bindings.actions, axes: this.bindings.axes}); },
    load() { this.bindings = gcInputCore.restore(readSaveData(this.options.storageKey, {}), this.defaults); },
    reset() { this.bindings = gcInputCore.copy(this.defaults); return this.save(); },
};

if (typeof module !== 'undefined') module.exports = {gcInputCore, gcInput, GC_INPUT_DEFAULTS, GC_INPUT_PAD_NAMES, GC_INPUT_VERSION};
