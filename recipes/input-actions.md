# Input actions: keyboard, mouse, gamepad and touch

Both starters load [input.js](../starters/input.js) between the engine and game.js.
It turns keyboard keys, mouse buttons, the first gamepad and on-screen touch controls into
named actions. Read actions, not raw keys. Only the functions below exist; do not invent others.

## Read input (once per tick)

```js
function gameUpdate()
{
    const input = gcInput.update();     // first line of gameUpdate
    player.pos = player.pos.add(vec2(input.moveX, input.moveY).scale(0.2)); // -1..1, y up
    if (input.pressed.jump) jump();      // true for one tick
    if (input.held.attack) swing();      // true while down
    if (input.released.attack) stopSwing();
    if (input.step.move.x) cursor.x += input.step.move.x; // one cell per push (grids, menus)
    if (input.device === 'mouse') aimAt(input.mouse.pos);  // mouse.pos is world space
}
```

More calls in the same tick return the same snapshot. While the world is paused with
`setPaused(true)` LittleJS skips gameUpdate, so read `gcInput.update()` in gameUpdatePost then.

| Field | Meaning |
|---|---|
| `moveX`, `moveY` | the `move` direction: keys + d-pad + left stick + touch stick, -1..1, length at most 1 |
| `dirs.<name>`, `step.<name>` | any direction `{x, y}`; `step` is -1/0/1 for the one tick a key or d-pad is pressed or a stick crosses half tilt |
| `held.<name>`, `pressed.<name>`, `released.<name>` | per action |
| `device` | `'keyboard'`, `'mouse'`, `'gamepad'` or `'touch'` (used last) |
| `mouse.pos`, `mouse.screen`, `mouse.delta`, `mouse.wheel` | world/screen position, wheel this tick |
| `gamepad.connected`, `justConnected`, `justDisconnected`, `index` | primary pad |
| `gamepad.left`, `gamepad.right` | sticks `{x, y}`, y up |

Default actions (the GameKit names):

| Action | Keyboard | Mouse | Gamepad | |
|---|---|---|---|---|
| `move` | W A S D, arrows | | left stick, d-pad | direction |
| `confirm` | Enter, Space | left | south | menu |
| `back` | Esc, Backspace | right | east | menu, fixed |
| `pause` | Esc, P | | start | fixed |
| `jump` | Space, Z | | south | |
| `attack` | J, X | left | west, right trigger | |
| `interact` | E | | north | |

Aliases read the same action: `fire` is `attack`, `use` and `talk` are `interact`,
`cancel` is `back`, `select` is `confirm` (unless the game binds its own entry with that name).

## Bindings: the ControlsRemap format

One entry per action: `{keyboard, mouse, gamepad}`, each one value or a list, `null` for none.
Keyboard values are `KeyboardEvent.code` (`KeyQ`, `Digit1`, `ShiftLeft`, `Space`, `ArrowUp`).
Gamepad numbers are the standard mapping by position: 0 south, 1 east, 2 west, 3 north,
4/5 left/right shoulder, 6/7 left/right trigger, 8 back, 9 start, 10/11 stick presses,
12-15 d-pad up/down/left/right. Mouse: 0 left, 1 middle, 2 right.
A direction takes four keys in W A S D order (up, left, down, right), or a list of such sets,
and `'leftStick'`, `'rightStick'` or `'dpad'`.

```js
function gameInit()
{
    gcInput.init({bindings: {
        dash: {keyboard: 'ShiftLeft', gamepad: 5},
        aim:  {keyboard: ['KeyI', 'KeyJ', 'KeyK', 'KeyL'], gamepad: 'rightStick'},
    }});
}
// later: if (gcInput.update().pressed.dash) ...   input.dirs.aim.x ...
```

Same-name entries replace the default. `fixed: true` on an entry (or `init({fixed: ['dash']})`)
makes it impossible to rebind; `pause` and `back` are fixed by default.

## Show prompts for the active device

```js
drawTextScreen(gcInput.prompt('jump') + ' to jump', vec2(mainCanvasSize.x / 2, 60), 32);
```

`prompt` gives `'Space'` on keyboard, `'Left click'` on mouse (falls back to the key),
`'South button'` on gamepad (`'下ボタン'` when `<html lang="ja">` or `init({lang: 'ja'})`),
`'Tap'` on touch for actions on the left mouse button; `prompt('move')` gives `'W A S D'` or
`'Left stick'`. Gamepad buttons are named by position; `init({padStyle: 'xbox'})` or
`'playstation'` switches to a console's names. `gcInput.glyphs('jump')` gives the parts
(`{kind: 'pad', pos: 'south', label, short}`) for HTML prompts such as GameKit's `.game-padpos`.
A pulled controller switches prompts back to the keyboard.

## Rebind and save

```js
gcInput.bind('jump', {keyboard: ['KeyK']});      // replaces the keyboard keys only; false if fixed or invalid
gcInput.rebind('jump', 'keyboard', 'KeyJ');      // ControlsRemap: one new input, swaps with the action that had it, saves
                                                 // -> {ok: true, swapped: 'attack'} or {ok: false, reason: 'fixed'}
gcInput.save();                                  // after bind()
gcInput.reset();                                 // back to the defaults, saved
```

Bindings are saved in `localStorage['<game-id>.settings'].bindings` (GameKit's settings
object, next to language and volume), `<game-id>` being the game's folder name in kebab case
(`init({gameId: 'star-lane'})` to set it). An old string-format save (`'key:Space'` lists under
`'<folder>.input'`, `'gaming-core.input'` or `init({storageKey})`) is migrated once, `fire`
becoming `attack`. Invalid saved values fall back to the defaults per device.

For a "press a key" screen read `gcInput.lastInput` after `gcInput.update()`: the input
pressed this tick on any device (`{device: 'keyboard', code: 'KeyK'}`) or `null`.

## Touch

A touch on the page makes `device` `'touch'`. On-screen controls call
`gcInput.press('jump', true)` / `gcInput.press('jump', false)` and
`gcInput.stick('move', x, y)` (y up, `0, 0` on release); the game reads the same actions.
Taps also reach left-mouse bindings through the engine.

## Do not

- Do not call `keyIsDown`/`mouseWasPressed`/`gamepadIsDown` for actions the table covers;
  rebinding would not reach them. Engine input is still fine for debug keys.
- Do not name gamepad buttons A/B/X/Y in your own text; use `gcInput.prompt`.
- Do not bind Escape while `debugKey` is `'Escape'`; the starters set `debugKey = 'Backquote'`.
- init turns off the engine's WASD-to-arrows and d-pad-to-stick aliases; the table owns them.
- Sticks already pass the engine dead zone (raw 0.3 to 0.8); `stickDeadZone` (default 0.1)
  is extra and applies to the 0..1 stick. Raise it only for drifting pads.
- Pointer lock is the engine's `pointerLockRequest()` after a click; `mouse.delta` keeps working.

Tests: [input_core.cjs](../tests/input_core.cjs) (mapping) and [browser.cjs](../tests/browser.cjs)
(keyboard, mouse, mocked gamepad, touch, rebinding, migration in both starters).

Local reference paths:

- [input.js](../starters/input.js)
- [pong game.js](../starters/pong/game.js)
- [emptyGame game.js](../starters/emptyGame/game.js)
- [engine input reference](../vendor/littlejs-ai/reference.md)

Read the pinned upstream AGENTS.md/reference for the selected engine before adapting.
Keep copied upstream license notices. Reference availability is not browser verification
of every example. Test the actual host result and report any unsupported features.
