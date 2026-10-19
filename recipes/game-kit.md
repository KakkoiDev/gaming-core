# Game kit: menus, HUD and prompts as HTML over the canvas

Genre starters (`tools/game.py init <genre>`) ship the designer's GameKit blocks as small builders in
`js/kit.js`. The canvas draws the world; every word, menu and number is HTML in `#ui`, so it can be
focused, read aloud and shown in English or Japanese. Only the functions below exist; do not invent others.

## Files in a scaffolded game

| File | What |
|---|---|
| `index.html` | the GameKit page: `#game` (LittleJS canvas root) with `#ui` (one `<section>` per screen) |
| `styles/game.css` | the designer's GameKit stylesheet, unchanged (palette roles `--g-*`) |
| `styles/kit.css` | gaming-core's few additions (`.sr-only`, hidden sections, layering) |
| `static/fonts.css` | placeholder: Silkscreen and DotGothic16 are not vendored; system fonts show |
| `js/gc-input.js` | gaming-core's input layer ([input-actions](input-actions.md)) |
| `js/messages.js` | every block's texts, `en` and `ja` |
| `js/input.js`, `js/menu.js`, `js/kit.js` | input glue, focus model, blocks |
| `game.js` | the genre: edit this |

## game.js shape

```js
const GAME_TEXTS = {en: {'game.name': 'Star Lane'}, ja: {'game.name': 'スターレーン'}};
const GAME_ACTIONS = {bomb: ['key:KeyX', 'mouse:2', 'pad:1']};   // added to gaming-core's own actions
let state = 'title';

function gameInit()
{
    kitInit({actions: GAME_ACTIONS, messages: GAME_TEXTS});
    kitControls(['move', 'fire', 'bomb']);         // ControlsRemap rows; pause and back are added, fixed
    pauseMenu({onQuit: toTitle});
    toTitle();
}
function toTitle() { state = 'title'; kitPlaying = false; showScreen(titleScreen({items: [{id: 'title-start', t: 'title.new', onSelect: start}]})); }
function start() { state = 'play'; kitPlaying = true; hudInit('<b data-slot="tl" id="hud-score"></b>'); showScreen(document.getElementById('hud')); }
function gameUpdate()
{
    const input = gameInput();                     // once, first line
    if (state !== 'play' || menuOpen()) return;    // menus and dialogue have the input
    if (input.pressed.pause) return openPause();
    // ... input.moveX, input.pressed.fire ...
}
function gameUpdatePost() { hudText('hud-score', fmt(score)); }   // only changed values reach the DOM
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [], document.getElementById('game'));
```

`gameInput()` and `gameInputInit()` are the GameKit card's `inputUpdate()` and `inputInit()`, renamed
because LittleJS 1.27.0 already has internal globals with those names.

## Blocks

| Call | Block | Notes |
|---|---|---|
| `t(key, vars)`, `addMessages({en, ja})`, `setLang('ja')`, `fmt(n)`, `fmtTime(s)` | texts | `data-t="key"` elements update on a language change |
| `showScreen(el)` | base screen | title, HUD, game over, results; one at a time |
| `openScreen(el)`, `closeScreen(el)`, `menuOpen()` | overlays | focus moves inside; back closes |
| `titleScreen({items: [{id, t, onSelect}]})` | TitleScreen | returns the section; `showScreen()` it |
| `hudInit(html)`, `hudText(id, v)`, `hudBar(id, v, max)`, `hudLives(id, n)` | HudPieces | slots `data-slot="tl|tc|tr|bl|bc|br"` |
| `pauseMenu({onQuit, onSave, extra})`, `openPause()`, `resume()` | PauseMenu | world paused with `setPaused`; opens on blur while `kitPlaying` |
| `openSettings()` | GameSettings | audio, language, display; saved in `<game-id>.settings` |
| `kitControls(rows)`, `openControls()` | ControlsRemap | rebinding through `gcInput`, saved in `<game-id>.input` |
| `confirmDialog(textKey, okKey, onOk, vars)` | confirm | Cancel focused |
| `dialogue([{speaker, t, choices: [{t, value}]}], done)`, `dialogueOpen()`, `dialogueLine()`, `dialogueAdvance()`, `dialogueClose()` | DialogueBox | typed text; the world keeps running |
| `openInventory({items, max, onUse})` | InventoryGrid | texts `item.<id>`, `item.<id>.desc` |
| `savesInit({getState, place, onLoad})`, `openSaves('save'|'load')`, `saveLatest()` | SaveSlots | `<game-id>.save.<n>` |
| `handHTML(cards, selected)` | CardHand | texts `card.<id>`, `card.<id>.text` |
| `gameOver({title, detail, items})` | GameOver | shown after a 0.8 s beat |
| `results({title, rows, stars, items, scores: {table, score}})`, `highScores(table)` | ResultsScores | name entry when the score is top 10 |
| `tutorial(key, action)` / `tutorial()` | TutorialPrompt | `{button}` in the text is where the input goes |
| `touchControls({stick, buttons: [{action, label}]})` | TouchControls | shown only when touch is the device |
| `promptHTML(action)`, `<span data-prompt="jump">` | prompts | keycap, mouse or gamepad position for the device in use |

## Do not

- Do not reuse the kit's element ids for your own buttons: `title`, `title-name`, `hud`, `pause`, `pause-*`,
  `settings`, `tab-*`, `panel-*`, `controls`, `confirm`, `confirm-ok`, `confirm-cancel`, `dialogue`, `dlg-*`,
  `inventory`, `inv-*`, `saves`, `gameover`, `go-title`, `go-detail`, `results`, `res-title`, `res-name`,
  `res-table`, `tutorial`, `touch`, `touch-pause`, `stick`, `live`.
- HUD buttons meant for the pointer get `tabindex="-1"` (or `data-pointer-only`): they never take focus,
  so Space and Enter stay with the game.

- Do not name a top-level variable like an engine global (`floor`, `min`, `max`, `abs`, `time`, `frame`,
  `paused`, `drawTile`, `BLUE`, `inputUpdate`...): LittleJS declares them, and the page stops loading. Check with
  `grep -n "^const name\|^let name\|^function name" js/littlejs.js`.

- Do not draw text, menus or numbers on the canvas.
- Do not read keys directly; add an action to `GAME_ACTIONS` and read `input.pressed.<name>`.
- Do not name gamepad buttons by letters; prompts come from `promptHTML`.
- Do not load fonts or scripts from a CDN.
- Do not keep the world running behind a pause menu (`setPaused` does it; check `menuOpen()`).

Local reference paths:

- [kit.js](../starters/kit/js/kit.js)
- [menu.js](../starters/kit/js/menu.js)
- [input.js (kit)](../starters/kit/js/input.js)
- [game.css](../starters/kit/styles/game.css)
- [messages.js](../starters/kit/js/messages.js)
- [genre recipes](genres/README.md)

Scenarios: [the game kit's](../starters/kit/SCENARIOS.md), played on every genre by `node tests/e2e.cjs`.
