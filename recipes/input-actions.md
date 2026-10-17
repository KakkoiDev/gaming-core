# Input actions: keyboard, mouse and gamepad

Both starters load [input.js](../starters/input.js) between the engine and game.js.
It turns keyboard keys, mouse buttons and the first gamepad into named actions.
Read actions, not raw keys. Only the functions below exist; do not invent others.

## Read input (once per frame)

```js
function gameUpdate()
{
    const input = gcInput.update();     // call exactly once, first line of gameUpdate
    player.pos = player.pos.add(vec2(input.moveX, input.moveY).scale(0.2)); // -1..1, y up
    if (input.pressed.jump) jump();      // true for one frame
    if (input.held.fire) shoot();        // true while down
    if (input.released.fire) stopShoot();
    if (input.device === 'mouse') aimAt(input.mouse.pos); // mouse.pos is world space
}
```

In gameUpdatePost or gameRenderPost read `gcInput.state`; do not call update() again.

| Field | Meaning |
|---|---|
| `moveX`, `moveY` | keys + d-pad + left stick, -1..1, length at most 1 |
| `held.<name>`, `pressed.<name>`, `released.<name>` | per action |
| `device` | `'keyboard'`, `'mouse'` or `'gamepad'` (used last) |
| `mouse.pos`, `mouse.screen`, `mouse.delta`, `mouse.wheel` | world/screen position, wheel this frame |
| `gamepad.connected`, `justConnected`, `justDisconnected`, `index` | primary pad |
| `gamepad.left`, `gamepad.right` | sticks `{x, y}`, y up |

Default actions: `jump` (Space, Z, A), `fire` (X, J, left click, X, RT),
`confirm` (Enter, Space, left click, A), `back` (Esc, Backspace, right click, B),
`pause` (Esc, P, Start/Menu). Axes: `moveX`/`moveY` (arrows, WASD, d-pad, left stick).

## Add an action

Pass it to init in gameInit. A binding is `'key:<code>'`, `'mouse:<0|1|2>'` or `'pad:<0..16>'`.
Key codes are KeyboardEvent.code names: `KeyQ`, `Digit1`, `ShiftLeft`, `Space`, `ArrowUp`.
Pad numbers are the standard mapping: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT,
8 View, 9 Menu, 10 L3, 11 R3, 12-15 d-pad up/down/left/right.

```js
function gameInit()
{
    gcInput.init({storageKey: 'mygame.input', actions: {dash: ['key:ShiftLeft', 'pad:5']}});
}
// later: if (gcInput.update().pressed.dash) ...
```

Use a unique `storageKey` per game. An axis is `{negative: [...], positive: [...], stick: 'right.x'}`
passed as `axes: {aimX: ...}`; read it as `input.axes.aimX`.

## Show prompts for the active device

```js
drawTextScreen(gcInput.prompt('jump') + ' to jump', vec2(mainCanvasSize.x / 2, 60), 32);
```

`prompt` gives `'Space'` on keyboard, `'Left click'` on mouse (falls back to the key), `'A'`
on gamepad; `prompt('move')` gives `'Left/Right Down/Up'` or `'Left stick'`. For PlayStation
names call `gcInput.init({padStyle: 'playstation'})`. A pulled controller switches prompts back
to the keyboard.

## Rebind and save

```js
gcInput.bind('jump', ['key:KeyK', 'pad:0']);     // false if a binding string is invalid
gcInput.bind('moveX.negative', ['key:KeyJ']);    // axis sides are 'name.negative' / 'name.positive'
gcInput.save();                                  // localStorage via writeSaveData
gcInput.reset();                                 // back to defaults, saved
```

For a "press a key" screen read `gcInput.lastBinding` after `gcInput.update()`: it is the
binding pressed this frame on any device (`'key:KeyK'`, `'mouse:0'`, `'pad:3'`) or `''`.
Saved bindings load in init; invalid or unknown saved entries fall back to the defaults.

## Do not

- Do not call `keyIsDown`/`mouseWasPressed`/`gamepadIsDown` for actions the table covers;
  rebinding would not reach them. Engine input is still fine for debug keys.
- Do not call `gcInput.update()` twice in a frame or skip it while paused; keep your own
  `paused` flag and return after reading input (see the pong starter), not `setPaused`.
- Do not bind Escape while `debugKey` is `'Escape'`; the starters set `debugKey = 'Backquote'`.
- init turns off the engine's WASD-to-arrows and d-pad-to-stick aliases; the table owns them.
- Sticks already pass the engine dead zone (raw 0.3 to 0.8); `stickDeadZone` (default 0.1)
  is extra and applies to the 0..1 stick. Raise it only for drifting pads.
- Touch taps arrive as left click through the engine. Turn on the engine touch gamepad
  (`touchGamepadEnable = true`) for stick and buttons; it is not covered by these tests.
- Pointer lock is the engine's `pointerLockRequest()` after a click; `mouse.delta` keeps working.

Tests: [input_core.cjs](../tests/input_core.cjs) (mapping) and [browser.cjs](../tests/browser.cjs)
(keyboard, mouse, mocked gamepad, rebinding in both starters).

Local reference paths:

- [input.js](../starters/input.js)
- [pong game.js](../starters/pong/game.js)
- [emptyGame game.js](../starters/emptyGame/game.js)
- [engine input reference](../vendor/littlejs-ai/reference.md)

Read the pinned upstream AGENTS.md/reference for the selected engine before adapting.
Keep copied upstream license notices. Reference availability is not browser verification
of every example. Test the actual host result and report any unsupported features.
