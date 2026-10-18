# Top-down racer (Turbo Loop)

```sh
python3 -B tools/game.py init racing --out /absolute/fresh/game
```

Designer card: GameRacing. One closed track, your car against 3 computer cars: a 3 · 2 · 1 · GO countdown,
checkpoints that count only in order, 3 laps, position, lap and time in the HUD, then a results table
(place, racer, time, best lap). Finishing last is a loss (Game Over with Retry). Time Trial races the
same track alone and keeps your best lap. The camera follows the car.
Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `TRACK` (waypoints, a loop), `ROAD`, `CHECK_R`, `LAPS`, `GRID` | the track; `TRACK[0]` is the start/finish line, every waypoint a checkpoint |
| `drive(car, steer, gas, brake, boost)` | one physics for every car; off the road (`distToTrack`) the top speed is `GRASS_MAX` |
| `steerAI(car)` | rivals aim at their next waypoint (with a lane `offset`) and slow into sharp turns |
| `checkpoints(car)`, `lapDone(car)` | only `TRACK[car.next]` counts; reaching `TRACK[0]` completes a lap |
| `progress`, `standings()` | position: finished cars by time, then laps + checkpoints + share of the segment |
| `toTitle`, `start(timeTrial)`, `finish()` | the flow; `finish()` shows `results()` with the race table in `#res-table`, or `gameOver()` when last |
| `GAME_ACTIONS` | `accelerate` (Up, W, Z, right trigger, south), `brake` (Down, S, X, left trigger, west), `boost` (Space, east); steering is gaming-core's `moveX` |
| HUD | position top left with the minimap under it (shapes), lap/time/best lap top right, speed and boost bars bottom right, countdown and Final Lap / Wrong Way in the centre (`hud-msg`) |
| Touch | stick to steer, Brake, Boost and Gas buttons |

## Change it

- A new track: another waypoint loop in `TRACK` (keep the start straight at `TRACK[0]` and `GRID` behind it);
  the road, curbs, minimap (its 120 x 80 box maps x -58..62, y -38..42) and rivals follow the list.
- Car feel: the Tuning constants (`MAX_SPEED`, `ACCEL`, `TURN`, `GRASS_MAX`, boost). Rivals' pace: `RIVALS[].maxSpeed`.
- More rivals: add entries to `RIVALS` and slots to `GRID` (the player takes the last slot).
- Card items left for you: a Grand Prix of 4 tracks with points, LevelSelect of tracks with best laps, car pick,
  the time-trial ghost, skid marks, tilt steering.

## Tested (tests/genres/racing.cjs)

Countdown holds the cars, the accelerator drives down the straight to checkpoint 1 (the start line at the start is
not a lap), steering and brake, the HUD speed, pause freezes the race, the line without the checkpoints before it
is not a lap, 3 laps (moved to the last checkpoint once per lap) into "You finished 1st" and the race table, Retry,
the gamepad's right trigger accelerating and its stick steering, finishing last into Game Over, Back to Title,
Time Trial with the best lap saved. Then the kit checks (tests/genres/kit.cjs).
