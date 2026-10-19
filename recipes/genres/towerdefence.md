# Tower defence (Garden Guard)

```sh
python3 -B tools/game.py init towerdefence --out /absolute/fresh/game
```

Designer card: GameTowerDefence. A grid map with one fixed path; enemies walk it in waves. Move the cursor
cell by cell (arrows/WASD, d-pad or stick) or hover with the mouse, pick a tower (1-3, Q/E, the shoulders or
the mouse wheel) and place it on free grass with `fire` (Space, Enter, left click, south). Towers shoot the
nearest enemy in range by themselves; kills and cleared waves give gold; a leak costs a life. Start Wave is
N or the north button (start is pause). Survive 5 waves for the results (stars by lives left); lives at 0 is
Game Over. Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `GRID`, `CELL`, `PATH` | 16 x 10 cells of 2 world units; `PATH` lists the corner cells, entrance left, exit right |
| `TOWERS` | `{id, cost, range (cells), damage, rate (s), color, slow?}`: Bolt, Cannon, Frost |
| `waveSize`, `waveHealth`, `waveSpeed`, `SPAWN_GAP`, `KILL_GOLD`, `WAVE_GOLD`, `WAVES` | the difficulty curve |
| `moveCursor`, `followMouse`, `chooseTower`, `place`, `placeProblem`, `startWave` | the player's actions |
| `spawn`, `walk`, `shoot`, `updateWorld` | enemies along the waypoints, towers firing at the nearest one |
| `toTitle`, `start`, `win`, `lose` | the flow: title, play, ResultsScores (stars) or GameOver |
| `GAME_ACTIONS` | `fire` re-bound to the card's Place keys; `start_wave`, `tower_next`/`tower_prev`, `tower1`-`tower3` |

The HUD: lives and gold top left, `Wave n / 5` top centre, the Start Wave prompt top right, the build bar
(tower, price, dimmed when unaffordable) bottom left, the refusal ("Not on the path", "Not enough gold")
bottom right. The range circle shows for the chosen tower under the cursor.

## Change it

- A new tower: an entry in `TOWERS`, a `tower.<id>` text in both languages, and a `tower4` action if you
  want a number key for it; the build bar and shoulders pick it up.
- A new map: edit `PATH` (horizontal and vertical legs only); `pathCells` and the waypoints follow.
- Harder or longer: `WAVES` and the `wave*` functions (keep `waveSpeed` capped).
- Upgrade and Sell (the card's tower panel): select a tower with `fire` when the cursor is on it
  (`towerAt(cursor)`), open an overlay with `openScreen` and two menu buttons, `tower.upgrade` / `tower.sell`.

## Tested (tests/e2e/genres/towerdefence.cjs, one test per scenario)

Enter starts without placing, a Bolt placed with the arrow keys and Space, the path and gold refusals in the
HUD, a second Bolt placed with the mouse, the gamepad d-pad steps the cursor and the shoulders cycle towers,
N starts wave 1 and kills raise the gold, Esc freezes the enemies, wave gold buys more towers, a skip to the
last wave survived into the results with stars by lives, and a new game with lives forced to 1 lost into
Game Over. Then the kit checks (tests/e2e/kit.cjs).

## Scenarios

What this starter does, as Given/When/Then: [SCENARIOS.md](../../starters/genres/towerdefence/SCENARIOS.md), plus the
[game kit's](../../starters/kit/SCENARIOS.md). Each scenario is one test of the same title in
`tests/e2e/genres/towerdefence.cjs` (`node tests/e2e.cjs towerdefence`). A change to the game changes its scenario and test first.
