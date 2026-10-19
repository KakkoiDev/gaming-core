# Cozy farming (Sunny Acre)

```sh
python3 -B tools/game.py init cozy --out /absolute/fresh/game
```

Designer card: GameCozy. A small grid farm: walk a tile at a time, pick a tool (hoe, turnip seeds,
watering can, hands), use it on the tile in front (till, plant, water, harvest), sleep in the bed
or let the day end at 24:00, sell turnips at the bin, ask Mabel next door for seeds. Earn 500 g for
the farm goal. Nothing fails: each night is an "End of Day" summary and the next morning autosaves;
Continue on the title loads that autosave. Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `W`, `H`, `PLOT`, `tiles[y * W + x]` | the 16 x 10 grid, the tillable field, each tile `{till, wet, crop}` (crop -1 none, 0 seed .. 3 ripe) |
| `OBJECTS` | bed, bin, Mabel (`npc`) and the house tiles; they block walking, `interact()` acts on them |
| `walk`, `useTool`, `interact`, `sell`, `talk` | the actions; a new direction first turns, then steps |
| `toTitle`, `newGame`, `continueGame`, `startDay`, `endDay`, `nextMorning`, `goalResults` | the flow |
| `getState`, `applyState`, `autosave` | one autosave through the kit's `saveWrite('auto', ...)` every morning |
| `GAME_ACTIONS` | `fire` (Use Tool: C, X, left click, west), `interact` (E, F, south), `tool_next`/`tool_prev` (R/Q, shoulders), `tool_1`..`tool_4` (1-4); the wheel also cycles |
| `CROPS`, `GOAL`, `MINUTE_SECONDS`, `ENERGY_MAX`, `TOOL_COST` | the numbers to tune |

HUD (HudPieces): goal and turnips top left, a short status line top centre, the clock panel top right
(season and day, time, money with a coin), energy bottom left, the 4-slot hotbar bottom centre (a tap or
click picks a slot). Touch: stick, Tool, Talk and Use buttons.

## Change it

- A new crop: an entry in `CROPS` (price, nights, colours), a seed tool in `TOOLS` with its icon in
  `showHud()` and texts `tool.<id>` in both languages; store the crop id on the tile next to `crop`.
- A shop: a `kind: 'shop'` object and an overlay listing seeds to buy; open it from `interact()`.
- More villagers: objects with `kind: 'npc'` and their own lines in `talk()`; keep friendship in the save.
- Save slots: pass `onSave` to `pauseMenu` and call `savesInit({getState, place: ()=> 'cozy.place', onLoad})`.

## Tested (tests/e2e/genres/cozy.cjs, one test per scenario)

New Game from the title with Enter, the gamepad's shoulders switch tools and the d-pad turns and steps,
till, plant and water with C and 1-3, walk to the bed and sleep (confirm), the End of Day summary and the
sprout, Next Morning autosaves, water again, the clock runs and the day ends at 24:00 (forced to a minute
before), the crop ripens (forced once), harvest with the hands, sell at the bin with the goal near (forced),
the Farm Goal results, Keep Farming, talk to Mabel and take the seeds choice, pause freezes the clock,
quit, reload and Continue restores day 3's farm. Then the kit checks (tests/e2e/kit.cjs).

## Scenarios

What this starter does, as Given/When/Then: [SCENARIOS.md](../../starters/genres/cozy/SCENARIOS.md), plus the
[game kit's](../../starters/kit/SCENARIOS.md). Each scenario is one test of the same title in
`tests/e2e/genres/cozy.cjs` (`node tests/e2e.cjs cozy`). A change to the game changes its scenario and test first.
