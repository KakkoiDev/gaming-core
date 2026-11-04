# Classic game patterns

Use a familiar title to identify a mechanic. Use original names, sprites, audio and level layouts. The [machine-readable catalog](classic-patterns.json) maps references to playable starters and identifies gaps explicitly.

For a row with a starter, run `python3 -B tools/game.py init <starter> --out <fresh-directory>`; for Arcade Pack select the mode listed in the catalog. The slingshot preview opens directly. A row marked `needed` is a backlog item, not a playable starter. Star Lane is a vertical shooter, not a substitute for the Space Invaders formation rules; Hop Hill is a platformer, not a Metal Slug run-and-gun.

Give the model one selected recipe and one change. Keep controls, collisions, scoring, and restart working while it changes a level, wave, or visual style. Use each row's check as the first browser scenario. Code that parses or renders a canvas has not passed gameplay verification.

Maze chase and run-and-gun now have small browser demos on the pinned LittleJS loop. Run their browser checks with `node tests/e2e/classics.cjs` with Playwright available. Checkers, formation shooter, falling blocks and one-button flight are still backlog items. Keep levels and tuning as editable data so smaller models can customize them without rewriting the loop.

See [game primitives](game-primitives.md) for the reusable parts and upstream references.

Chess uses bundled chess.js 1.4.0. Open the starter HTML for local two-player play, or run `node tests/e2e/chess.cjs` with Playwright available.
