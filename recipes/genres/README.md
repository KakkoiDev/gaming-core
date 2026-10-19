# Genre starters

`python3 -B tools/game.py genres` lists them; `python3 -B tools/game.py init <genre> --out <dir>`
scaffolds one. Each is a playable game on the [game kit](../game-kit.md) with a browser test that
plays its scenarios (starters/genres/<genre>/SCENARIOS.md, one test each in tests/e2e/genres/<genre>.cjs, run by `node tests/e2e.cjs`).

| Genre | Game | Recipe | Designer card |
|---|---|---|---|
| arcade | Arcade Pack | [arcade](arcade.md) | GameArcade |
| cards | Pocket Duel | [cards](cards.md) | GameCards |
| cozy | Sunny Acre | [cozy](cozy.md) | GameCozy |
| idle | Coin Garden | [idle](idle.md) | GameIdle |
| platformer | Hop Hill (Platformer) | [platformer](platformer.md) | GamePlatformer |
| puzzle | Push Puzzle | [puzzle](puzzle.md) | GamePuzzle |
| racing | Turbo Loop | [racing](racing.md) | GameRacing |
| roguelike | Deepwell (turn-based roguelike) | [roguelike](roguelike.md) | GameRoguelike |
| rpg | Meadow Tale (top-down RPG) | [rpg](rpg.md) | GameRpg |
| shooter | Star Lane | [shooter](shooter.md) | GameShooter |
| tactics | Grid Oath (Tactics) | [tactics](tactics.md) | GameTactics |
| towerdefence | Garden Guard (Tower Defence) | [towerdefence](towerdefence.md) | GameTowerDefence |
| visualnovel | Lantern Lane (visual novel) | [visualnovel](visualnovel.md) | GameVisualNovel |
