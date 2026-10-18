# Platformer (Hop Hill)

```sh
python3 -B tools/game.py init platformer --out /absolute/fresh/game
```

Designer card: GamePlatformer. Run and jump through a level wider than the screen: hold jump to go
higher, coyote time and a jump buffer forgive late and early presses, coins, enemies you stomp or
that hurt you, a checkpoint flag midway and a goal flag that ends the level into the results (time,
coins, three stars). Three lives; a lost life returns to the last checkpoint; no lives left is
Game Over with Continue. Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `LEVELS` | each `{name (text key), par (seconds for the time star), map}`; the map is strings, see TILE KEY |
| TILE KEY | `#` ground, `=` one-way plank, `o` coin, `e` enemy, `P` start, `C` checkpoint, `F` flag |
| `PHYS` | walk/run speed, acceleration, gravity, jump speed, jump cut, fall cap, coyote and buffer times (larger on touch) |
| `updateHero`, `moveBody` | input to velocity, jump rules, axis-by-axis tile collision, drop through planks with `down` |
| `updateWorld` | enemy patrol (3 tiles around home), stomp or hurt, coins, checkpoint, flag, pits |
| `toTitle`, `startLevel`, `hurt`, `win`, `lose` | the flow; `win` builds the results and saves the best time |
| `GAME_ACTIONS` | `jump` (Space, Z, ↑, south), `run` (Shift, X, west), `down` (↓, S, d-pad down); `move` is gaming-core's axes |
| HUD | lives and coins top left, timer and best time top right, the level name top centre for 2 s |
| Touch | left and right buttons bottom left, jump bottom right; touch always runs |

## Change it

- A new level: add an entry to `LEVELS` and its name in both languages; results then offer Next Level.
  Keep pits and enemies visible before the hero reaches them, and jumps within about 4 tiles up.
- A different feel: `PHYS` (keep `fall` below 60 so the hero never moves a whole tile per tick).
- A new move (wall jump, dash): an action in `GAME_ACTIONS`, a row in `kitControls`, a `tutorial()` prompt.
- A new enemy kind: a map letter, a case in `build()`, its motion in `updateWorld()`, its shape in `gameRender()`.

## Tested (tests/genres/platformer.cjs)

Play from the title with Enter, walk with the arrow keys over coins (HUD updates), a held jump onto a
raised platform, walk into an enemy (a life lost, back to the start), the hero moved once near the
flag then walks into it: results with time, coins, stars and a saved best time, Replay, Esc freezes the
world, the gamepad's d-pad walks and south jumps, the last life forced once then lost to an enemy:
Game Over, back to the title. Then the kit checks (tests/genres/kit.cjs).
