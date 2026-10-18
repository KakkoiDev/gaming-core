# Visual novel (Lantern Lane)

```sh
python3 -B tools/game.py init visualnovel --out /absolute/fresh/game
```

Designer card: GameVisualNovel. A short branching story told in scenes: a background, up to three
characters as shape silhouettes, and the kit's DialogueBox (typed lines, Next, 2-4 choices). Choices set
flags and jump to scenes; two endings, each an end card ("Ending 1 of 2: The River Lights") and back to
the title. No game over. Saves in three slots plus an autosave; Continue on the title; a log of what was
said; Auto. Portrait on a phone (the scene crops to the centre, the box at the bottom).
Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `SCENES` | the story as data: `{place, bg, cast: [{id, x: -1/0/1}], lines: [{speaker, t, if, choices}], next or ending}` |
| choices | on a scene's last line: `{t, set: {flag: true}, go: 'scene'}`; a line with `if: 'flag'` shows only on that route |
| `GAME_TEXTS` | the card's keys, story lines `s.<scene>.<n>`, choices `c.*`, speakers `vn.who.*`, endings `end.<n>` and `end.<n>.hint`, both languages |
| `goScene`, `openScene`, `sceneDone`, `showEnding` | the flow: fade, `dialogue(lines, onChoice)`, follow the choice or `next`, results |
| `saveState` / `loadState` | scene + line + flags + the log; `savesInit` and `openSaves`; slot `auto` at each scene start, removed at an ending |
| `openLog`, `toggleAuto`, `addBoxControls` | Log (L / north), Auto (A / west), the Log · Auto · Save · Menu row on the box |
| `openEndings` | the title's Endings list: found names, `???` and a hint for the rest (`<game-id>.endings`) |
| `drawBackground`, `drawCharacter`, `CAST` | lane, river and dawn backdrops; silhouettes: the speaker at full colour, others dimmed |

Next line is gaming-core's `confirm` (Enter, Space, click, south); choices are ↑ ↓ then Enter, 1-4, the
d-pad then south, or a click. Esc or the Menu button pauses (Save, Settings, Controls, Quit).

## Change it

- A scene: add an entry to `SCENES` and its `s.<scene>.<n>` texts in `en` and `ja`; point a `next` or a
  choice's `go` at it. Keep choices on the last line of a scene (the save stores the line index).
- A route: a choice with `set: {flag: true}`, then lines with `if: 'flag'` or a branch scene.
- An ending: a scene with `ending: 3`, add `3` to `ENDINGS` and the `end.3` / `end.3.hint` texts.
- A character: an entry in `CAST` (coat hue, hair, height) and `vn.who.<id>`; expressions would be extra
  shapes in `drawCharacter` keyed by a `face` on the line.

## Tested (tests/genres/visualnovel.cjs)

New Game from the title with Enter, a line still typing completed by Enter then advanced by Enter, one
line advanced with the gamepad's south button, the log opened with L and closed with Esc in place, the
first choice picked with ↓ Enter, Esc pauses and the scene freezes, Save to slot 1 from the pause menu
(scene, line, flags), the searched route's line on the river, choice 1 by the 1 key, ending 1. Then a
page reload, Continue (focused) restores the saved line and flags, Auto advances by itself and A turns
it off, a portrait screenshot, the other branch to ending 2, and the Endings list shows both. Then the
kit checks (tests/genres/kit.cjs).
