# Turn-based roguelike (Deepwell)

```sh
python3 -B tools/game.py init roguelike --out /absolute/fresh/game
```

Designer card: GameRoguelike. A grid roguelike in the classic style: seeded floors of rooms and
corridors, one step per direction press (a turn), bump a monster to attack it, monsters move after
you, potions to pick up and drink, stairs down. The stairs on floor 3 win (the run summary);
HP 0 ends the run in permadeath style (GameOver `gameover.run_over`, `gameover.floor` and the cause
in the detail, New Run first, no Load). Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `makeFloor()` | rooms (up to 8, no overlap) sorted left to right, L corridors between neighbours, start in the first room, stairs in the last, monsters and 2 potions in the others |
| `seed`, `rng`, `nextSeed` | `rng = new RandomGenerator(seed * 7 + depth * 1013)` (LittleJS): the same seed and floor give the same floor; set `nextSeed` before New Run for a fixed seed |
| `readStep`, `playerTurn`, `endTurn` | one step per press (repeats when held); a step into a monster attacks; then each monster next to you hits, a near one steps toward you |
| `MONSTERS`, `FLOORS`, `MAX_HP`, `POTION_HEAL`, `PLAYER_DAMAGE` | the numbers to tune; one monster kind per floor |
| `toTitle`, `newRun`, `takeStairs`, `die`, `win` | the flow |
| `GAME_ACTIONS` | `wait` (. Z, south), `use_item_1` (1, north); `move` and `fire` (attack a monster next to you) are gaming-core's |
| `MAP` | 40 x 24 tiles, y up like the world; `gameUpdatePost` zooms the camera to fit the window |

The variable for the floor number is `depth`: LittleJS already has a global `floor` (Math.floor).

## Change it

- A monster: add `{id, hp, damage, hue}` to `MONSTERS` and its `enemy.<id>` text in both languages
  (the death cause names it). Mix kinds per floor in `makeFloor`.
- More floors: raise `FLOORS`; `makeFloor` takes the monster for `min(depth, MONSTERS.length)`.
- Another item: a list like `potions`, picked up in `playerTurn`, a `use_item_2` action, a HUD slot.
- Fog of war or a minimap: keep a `seen` set in `playerTurn` and skip unseen tiles in `gameRender`.

## Tested (tests/genres/roguelike.cjs)

A fixed seed (4242) started with Enter, the same layout for the same seed and floor, one tap one
step, walking with the arrow keys (shortest path read from the page) to bump a monster until it
dies and it hits back, a potion picked up and drunk with 1, pause freezes the world, a gamepad
d-pad step, the stairs to floor 2; floor 3 with the player put next to the stairs once, the last
step into the run summary, New Run; at 1 HP walking into a slime into Run Over (cause and floor in
the detail, New Run first, no Load), New Run, Quit to the title. Then the kit checks
(tests/genres/kit.cjs).
