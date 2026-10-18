# Vertical shoot 'em up (Star Lane)

```sh
python3 -B tools/game.py init shooter --out /absolute/fresh/game
```

Designer card: GameShooter. A 9:16 field centred in the window: waves of enemies from the top, enemy bullets,
the Hive Queen with her HP bar top centre ends the stage. Hold Fire to shoot, Bomb clears enemy bullets, lives,
bombs, power 1-4, a top-10 table with a name entry. Losing the last life opens Game Over: Continue (score back
to 0, 3 per run) or Title. Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `WAVES` | `{t, kind, x, n}`: seconds into the stage, an `ENEMY_KINDS` key, the centre, how many side by side |
| `ENEMY_KINDS`, `enemyUpdate(e)` | `dart` swoops down and curls away; `grape` hovers, fires aimed shots, drops a power-up |
| `BOSS_AT`, `BOSS_HP`, `bossUpdate()` | the boss comes after the waves; rings and aimed fans, faster under half HP |
| `playerUpdate(input)`, `useBomb()`, `hitPlayer()` | move (keys, stick, or the pointer while the left button is held), fire, bomb, lose a life |
| `playUpdate(input)` | one tick: spawn, move, collide, the boss beaten -> `win()` |
| `toTitle`, `start`, `lose`, `continueRun`, `win`, `showScores` | the flow |
| `GAME_ACTIONS` | `fire` Z/Space/left click/south/right trigger, `bomb` X/right click/east, `focus` Shift/middle/left trigger |
| `FIELD` | 18 x 32 world units; `gameUpdatePost` fits it to the window; the HUD corners sit in the side margins on desktop |

Touch: the kit's stick moves the ship, firing is automatic, the Bomb button is bottom right.

## Change it

- A longer stage: add entries to `WAVES` and raise `BOSS_AT`. A new enemy: a kind in `ENEMY_KINDS`, its path in
  `enemyUpdate`, its shape in `drawEnemy`.
- A harder boss: `BOSS_HP`, the timers and bullet speeds in `bossUpdate` (keep enemy bullets slower than the ship).
- More stages: keep a `stage` number, give each its `WAVES` and boss, and add a `results.next` item to `win()`.
- The card's upgrade pick between stages: a `handHTML` of three cards (Spread, Shield, Speed) in an overlay.

## Tested (tests/genres/shooter.cjs)

Start from the title with Enter, hold Z and sweep with the arrow keys until enemies fall and the score rises, a
bomb clears the enemy bullets, Esc pauses and the stage stops, the gamepad stick moves the ship and south fires,
the boss arrives with its HP bar, its HP is lowered once and the mouse (left button held) steers and fires until
it is beaten, the name goes into the top-10 table; a new run where the last life is hit (forced once) opens Game
Over, Continue resets the score, Quit returns to the title. Then the kit checks (tests/genres/kit.cjs).
