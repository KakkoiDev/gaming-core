# Game primitives

Start from the pinned LittleJS engine for full projects. The small HTML previews are references for an isolated chat surface. Keep each primitive narrow enough to test in isolation, and compose them into a playable starter.

1. **Session:** ready, play, pause, win, lose, restart; fixed-step updates or explicit turns.
2. **Input:** named move, aim, fire, confirm and pause actions; keyboard, pointer and touch adapters.
3. **World:** tile grid, level data, camera follow, spawn points and checkpoints.
4. **Movement and collisions:** grid steps, kinematic platforming, swept projectiles, overlaps, gravity and stacked bodies. Use engine physics for complex rigid-body scenes.
5. **Actors:** player, projectile, enemy patrol/chase, destructible target, pickup and goal.
6. **Rules:** score, lives, health, cooldowns and win conditions. Board games also need legal moves, capture rules, promotion, turn order and undo.
7. **Presentation:** responsive playfield, HUD, sound cues and accessible start/restart controls.
8. **Verification:** deterministic scenario with input and observable outcomes: move, hit, score, win or lose, reset.

References: [Phaser examples](https://phaser.io/oss/examples) organize scenes, input, physics and tilemaps as composable examples and include complete games. [LittleJS FAQ](https://github.com/KilledByAPixel/LittleJS/blob/main/FAQ.md) describes built-in physics, a Box2D plugin and a platformer character example. For chess, use [chess.js](https://github.com/jhlywa/chess.js) as a candidate rules library and verify castling, en passant, promotion, checkmate and draws. For checkers, choose a ruleset explicitly and verify mandatory captures, chained jumps and king promotion.
