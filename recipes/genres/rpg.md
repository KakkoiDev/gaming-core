# Top-down RPG (Meadow Tale)

```sh
python3 -B tools/game.py init rpg --out /absolute/fresh/game
```

Designer card: GameRpg. A small tile map (trees, water, a path, grass) drawn as shapes, a village elder whose
dialogue gives a quest, action combat against slimes, potions in a bag, three save slots, Continue and Load on the
title, Quest Complete results and a Game Over that continues from the last save.
Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `MAP` | one string per row, top first: `#` tree, `~` water, `,` path, `.` grass, `H` hero, `E` elder, `s` slime, `k` key, `p` potion |
| `solidAt`, `blocked`, `moveBody` | tile collision; bodies move one axis at a time |
| `freshWorld`, `getState`, `loadGame` | the world from `MAP`; the save state (`savesInit`) and loading it |
| `toTitle`, `startPlay`, `setQuest`, `questComplete`, `lose` | the flow: title -> play -> results or game over |
| `talk` | the elder's lines (`dialogue([...], done)`), the Accept / Not now choice; `quest` is `none` -> `find` -> `return` -> `done` |
| `openBag`, `addToBag`, `ITEMS` | `openInventory` with Use (a potion heals 5) and Drop (back on the ground) |
| `attack`, `updateSlimes`, `updatePickups` | Attack hits in front of the hero; slimes chase within `SLIME_CHASE`; a dead slime drops a potion |
| `GAME_ACTIONS` | `fire` C/J/left click/west, `confirm` adds Z, `menu` Tab/I/north (the bag); `move`, `back`, `pause` are gaming-core's |
| HUD | HP bar and number (top left), the objective (top right), the Talk prompt near the elder (bottom right) |

`inputLockUntil` keeps the click or key that closed a menu from also talking or attacking.

## Change it

- A bigger map: edit `MAP` (keep the border of `#`); the camera follows the hero and stops at the edges.
- A new NPC: a position from `findTiles('<letter>')`, a range check in `gameUpdate` like the elder's, its own lines.
- A new item: an entry in `ITEMS`, `item.<id>` and `item.<id>.desc` in both languages, its effect in `openBag`'s `onUse`.
- Harder fights: `SLIME_HP`, `SLIME_SPEED`, `SLIME_DAMAGE`, `HURT_TIME`; keep slimes slower than `HERO_SPEED`.
- Save points only: pass `onSave` to `pauseMenu` only while the hero stands on one (call `pauseMenu` again).
- Not in this starter (on the card): MP, Equipment, ShopScreen, QuestLog, MapScreen and the minimap, turn-based battles.

## Tested (tests/genres/rpg.cjs)

New Game from the title, the gamepad stick walks and north/east open and close the bag, walk to the elder, talk and
accept the quest (the objective shows), fight the nearest slime with Attack until it dies, pick up its potion and
drink it from the bag, Esc pauses and freezes the slimes, save in slot 1, fetch the key (one teleport) and walk it
back: Quest Complete, Keep Exploring, faint (HP forced to 0): Game Over, Back to Title, Continue loads slot 1, quit
to the title. Then the kit checks (tests/genres/kit.cjs).
