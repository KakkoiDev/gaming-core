# Grid tactics (Grid Oath)

```sh
python3 -B tools/game.py init tactics --out /absolute/fresh/game
```

Designer card: GameTactics. One battle on a 10 x 8 map (grass, forest, rocks, water), 3 of your
units against 3 enemies. Player Phase: choose a unit, blue tiles it can reach and red tiles it could
attack, move, then the HTML action menu (Attack / Wait), then a target with the forecast in the HUD.
Back undoes the move until you act. Enemy Phase: each enemy approaches and attacks. Defeat every
enemy for the results (turns, units left, stars); lose every unit for Game Over.
Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `MAP`, `TERRAIN` | the map as strings (top row first) and each terrain's move cost (0 = blocked) |
| `CLASSES`, `START` | hp, attack, move, range and shape per class; the six units' start tiles |
| `reachable(unit)`, `forecast(a, d)`, `attack(a, d)` | the rules: cheapest walk, damage and counter, deaths and the win/loss check |
| `stepCursor`, `confirmCell`, `cancel`, `openActions`, `askEndTurn` | Player Phase: `mode` is `idle`, `move`, `menu` or `target` |
| `startEnemyPhase`, `enemyAct`, `updateEnemyPhase` | Enemy Phase: one enemy every 0.5 s, then a new turn |
| `toTitle`, `start`, `win`, `lose` | the flow; `results` and `gameOver` are the kit's |
| `GAME_ACTIONS` | `end_turn` (E, select button), `next_unit` (Tab, right shoulder); the cursor is gaming-core's `move`, select is `confirm`, cancel is `back` |

Esc is `back` while a unit is chosen and `pause` otherwise. The mouse hovers a tile and clicks it;
on touch the first tap moves the cursor and the second confirms. The camera fits the map to the
window every frame in `gameUpdatePost`.

## Change it

- A class: an entry in `CLASSES` (`shape` is `sword`, `bow` or `lance`, drawn in `drawUnit`) and its
  `unit.<id>` text in both languages.
- A battle: edit `MAP` and `START`; a new terrain is a letter in `TERRAIN`, a `terrain.<id>` and
  `terrain.<id>.desc` text and a look in `gameRender`.
- Hit chances or terrain dodge: change `forecast()` only; the HUD shows its numbers, so they stay true.
- Smarter enemies: `enemyAct` (hold a tile, guard, retreat when weak).
- Another goal ("Survive 8 turns"): check it in `updateEnemyPhase` and change `goal.defeat_all`.

## Tested (tests/e2e/genres/tactics.cjs, one test per scenario)

Enter starts; the gamepad d-pad steps the cursor; keys select the Knight, move it, open the action
menu (Attack disabled), back undoes the move, Wait; the mouse hovers, selects and right-click
cancels; End Turn asks first and the enemy phase moves the enemies; a real attack after walking
the cursor with keys, with the forecast's hit chance checked; a win with the last enemy forced to
1 HP beside a unit, into the results with stars; Retry; Esc pauses and freezes the battle; a loss
forced once (one unit at 1 HP beside a Brute, End Turn) into Game Over, then the title. Then the
kit checks (tests/e2e/kit.cjs).

## Scenarios

What this starter does, as Given/When/Then: [SCENARIOS.md](../../starters/genres/tactics/SCENARIOS.md), plus the
[game kit's](../../starters/kit/SCENARIOS.md). Each scenario is one test of the same title in
`tests/e2e/genres/tactics.cjs` (`node tests/e2e.cjs tactics`). A change to the game changes its scenario and test first.
