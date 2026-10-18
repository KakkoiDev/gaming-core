# Idle game (Coin Garden)

```sh
python3 -B tools/game.py init idle --out /absolute/fresh/game
```

Designer card: GameIdle. Tap the big coin to earn, buy helpers that earn on their own, come back later to
collect what they made while you were away. Reach a million coins for the results, then keep growing or
start over with a bigger bonus (prestige). No fail state. Portrait first: the garden on top, the helper list
as a sheet below; on landscape the list sits on the right. Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `PRODUCERS` | the helpers: `{id, price, rate, hue}`; price grows `GROWTH` (×1.15) per one owned |
| `rate`, `cost(i, n)`, `maxAffordable`, `buyCount`, `fmtBig`, `fmtDuration` | the numbers: income, prices, short scale (1.25 M, 125万) |
| `saveGame`, `continueGame` | autosave to `<game-id>.save.auto` with the kit's `saveWrite`; offline progress on load (`OFFLINE_CAP` 8 h, `OFFLINE_SHARE` half) in a welcome-back dialog |
| `toTitle`, `newGame`, `startPlay`, `resumePlay`, `reachGoal`, `askPrestige`, `prestige` | the flow; the title is skipped when a save exists |
| `HUD_HTML`, `buildShop`, `hudUpdate`, `pop` | coins and rate on top, the helper list (HTML buttons), `+amount` pops (HTML) |
| `GAME_ACTIONS` | `fire` is Earn (Space, click on the coin, south), `buy` (Enter, west), `buy_amount` (Tab, shoulders); `move` up/down chooses a row |
| `drawGarden` | shapes that grow with the helpers: sprouts, bees, fountains, windmills, golden trees |

Saves happen every `AUTOSAVE` (10) seconds, on every pause (Esc, the window losing focus, the touch pause
button), at the goal, on prestige and on Quit.

## Change it

- A helper: an entry in `PRODUCERS`, its `gen.<id>` text in both languages, a few shapes in `drawGarden()`.
- Pace: `GOAL`, `GROWTH`, the prices and rates; `tapValue()` for what a tap is worth.
- Offline: `OFFLINE_CAP` and `OFFLINE_SHARE`; the dialog only shows after 10 s away.
- Prestige: `prestige()` adds 1 to `mult`; make it depend on `total` for a classic curve.
- Rows 1-9 as keys: add `buy1`..`buy9` actions (`key:Digit1`...) and buy that row when pressed.

## Tested (tests/genres/idle.cjs)

Enter starts from the title; Space and a click on the coin earn (a click beside it does not); the buy prompt
shows when the first helper is affordable and Enter buys it; income rises with time alone; a click on the list
buys another; Tab cycles ×1 ×10 ×100 Max; the gamepad's south earns and the d-pad chooses rows; Esc freezes
the world and saves; a reload (the save shifted an hour back once) skips the title, restores the garden and pays
half an hour of income in the welcome-back dialog; one push near the goal and Space reaches it into the results
(Keep Growing focused); prestige asks first with Cancel focused and restarts with ×2; Quit returns to the title,
which now offers Continue. Then the kit checks (tests/genres/kit.cjs).
