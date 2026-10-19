# Grid puzzle (Sokoban)

```sh
python3 -B tools/game.py init puzzle --out /absolute/fresh/game
```

Designer card: GamePuzzle, Sokoban variant. Push every crate onto a mark: one step per direction
press, Undo and Restart always available, moves counted, solved into results with stars by moves
and Next. Sokoban never fails, so there is no Game Over. Portrait first: the level fits a phone.
Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `LEVELS = [{par, map}]` | maps as strings: `#` wall, space floor, `.` mark, `$` crate, `*` crate on a mark, `@` player, `+` player on a mark; `par` = moves of a known solution |
| `loadLevel`, `step(dx, dy)`, `undo`, `restart`, `stars(moves, par)` | the rules; grid y grows downward; every move pushes a snapshot on `history` (Restart too, so it can be undone) |
| `toTitle`, `start(i)`, `solved`, `openLevels` | the flow: title (Play = next unsolved, Levels, Settings) -> play -> results (Next, Try Again, Level Select, Title) |
| `pressDir(input)` in `gameUpdate` | one step per press of the move axes (keys, d-pad, stick), repeat after 0.3 s held |
| pointer listeners | a swipe (12 px dead zone) or a tap on a cell next to the player is one step |
| `GAME_ACTIONS.undo` / `.restart` | Z, Backspace, west / R, north; the HUD's Undo and Restart buttons show their keys |
| `PROGRESS_KEY` | `<game-id>.progress`: `{levels: {<index>: {stars, best}}}`; a level opens when the one before is solved |

Pieces have a shape and a colour each: crate = square with an X (a diamond once on a mark), mark =
ring with a diamond, player = round body with eyes, wall = bricks.

## Change it

- A new level: add `{par, map}` to `LEVELS`. Solve it yourself and write the solution next to it as a
  comment; `par` is its length (3 stars at par, 2 up to par x 1.5, 1 otherwise).
- Hint (the card's third button): add a `hint` action (H, `pad:8`), find the next push with a small
  breadth-first search over `snapshot()` states and highlight it for 2 s; mark the level hinted (no third star).
- Match-3 or sliding tiles: keep the shell (`start`, `solved`, `openLevels`, HUD, progress) and swap
  `loadLevel`/`step`/`gameRender` for the variant's rule; match-3 adds a move limit and `gameOver()`
  with "+5 Moves" (texts `hud.moves_left`, `over.more_moves`).

## Tested (tests/e2e/genres/puzzle.cjs, one test per scenario)

Level 1 solved with real key presses and one gamepad d-pad push: a push undone with Z puts the crate
back, a wall blocks, Restart resets and can be undone, Backspace and the HUD's Restart button work,
Esc pauses (keys do not move the player). Results show 3 stars at par and save progress, Next (focused)
opens level 2, a click on a neighbour cell steps, a far click does not, level 2 solved, portrait layout,
Play continues at level 3, Quit asks first, LevelSelect shows stars and focuses the next unsolved level.
Then the kit checks (tests/e2e/kit.cjs).

## Scenarios

What this starter does, as Given/When/Then: [SCENARIOS.md](../../starters/genres/puzzle/SCENARIOS.md), plus the
[game kit's](../../starters/kit/SCENARIOS.md). Each scenario is one test of the same title in
`tests/e2e/genres/puzzle.cjs` (`node tests/e2e.cjs puzzle`). A change to the game changes its scenario and test first.
