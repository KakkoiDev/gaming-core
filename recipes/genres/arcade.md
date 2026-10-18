# Arcade classics (Bricks, Snake, Paddle)

```sh
python3 -B tools/game.py init arcade --out /absolute/fresh/game
```

Designer card: GameArcade. One shell, three classics: the title lists them, play starts at once,
lives and a rising score, a top-10 table per game with a 3-letter name entry, Retry first.
Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `GAMES = {bricks, snake, paddle}` | each `{id, start(), update(input), render(), hud()}` |
| `toTitle`, `start(id)`, `loseLife`, `lose`, `win`, `levelCleared` | the flow |
| `GAME_ACTIONS.serve` | Space, left click, south button; `move` is gaming-core's axes |
| `FIELD` | 32 x 24 world units; `gameUpdatePost` zooms the camera to fit the window |

## Change it

- A new classic: add an object to `GAMES` with the five members, a title button and its texts in
  both languages. Use `loseLife()` and `lose()` so the HUD, Game Over and the scores table work.
- Faster or slower: `bricks.speed()` (keep the cap so a phone can follow), `snake` step time.
- Two players in Paddle: add a `p2` axis action (W/S) and read it instead of the computer.

## Tested (tests/genres/arcade.cjs)

Title focus and gamepad navigation, Bricks served and played with the mouse until bricks break,
the wall cleared into Next Level, every life lost into the name entry and the table, pause freezes
the ball, Quit asks first, Snake eats and crashes, Paddle scores and wins. Then the kit checks
(tests/genres/kit.cjs): language, saved settings, ControlsRemap listen, refuse a fixed key and reset,
pause on blur, touch.
