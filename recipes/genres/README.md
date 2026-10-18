# Genre starters

`python3 -B tools/game.py genres` lists them; `python3 -B tools/game.py init <genre> --out <dir>`
scaffolds one. Each is a playable game on the [game kit](../game-kit.md) with a browser test that
plays it (tests/genres/<genre>.cjs, run by `node tests/genres.cjs`).

| Genre | Recipe | Designer card |
|---|---|---|
| arcade | [arcade](arcade.md) | GameArcade |
