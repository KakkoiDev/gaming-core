# Trading card game (Pocket Duel)

```sh
python3 -B tools/game.py init cards --out /absolute/fresh/game
```

Designer card: GameCards. A small card duel against the computer: a fixed 20-card deck of 6 kinds,
energy that grows by one each turn (up to 10), phases Draw -> Main -> Attack -> End always shown in the
HUD, four lanes per side, 20 health each. Win into Results, lose into Game Over, Rematch first.
Read the [game kit](../game-kit.md) recipe for the blocks.

## What is in game.js

| Part | Where |
|---|---|
| `CARDS`, `DECK` | card kinds (`unit` with `atk`/`hp`, `spell` with `damage`, `heal`) and the 20-card deck |
| `you`, `foe` | players `{hp, energy, max, deck, hand, discard, board[4]}`; a unit is `{id, atk, hp, ready}` |
| `beginTurn`, `attack`, `strike`, `endTurn` | the phases; `steps`/`after()` time them in world time, so pause freezes them |
| `playCard(i, p)` | every card effect; returns false with a reason on the status line |
| `aiChoice`, `aiStep` | the computer: its most expensive useful card, one every 0.7 s, then it attacks |
| `buildHud`, `updateHud`, `renderHand`, `updateLabels` | HudPieces (health circles, energy pips, phase strip, piles, the opponent's card backs), the kit's `handHTML` CardHand, and each unit's numbers as an HTML label over its shape |
| `GAME_ACTIONS` | `fire` = Attack (F, X, west), `end_turn` (E, north); Start stays gaming-core's fixed Pause |

Choosing and playing a card is the kit's focus model: the hand's `.game-card` buttons are focused with
left/right (d-pad, stick) or a mouse hover, and confirm (Enter, Space, south) or a click plays the
focused card. The hand is `inert` outside your Main phase. Units attack the unit in their lane, or the
opponent when the lane is open; they can attack on the turn they are played.

## Change it

- A new card: an entry in `CARDS`, its id in `DECK`, `card.<id>` and `card.<id>.text` in both languages.
  A new effect type is one branch in `playCard()` and one rule in `aiChoice()`.
- Summoning sickness: set `ready: false` when a unit is played in `playCard()`.
- A deck builder (the card's InventoryGrid screen): build `DECK` from a saved list before `start()`.
- Targeted spells (the card's target choice): after `playCard` picks a spell, focus the enemy labels and
  wait for confirm instead of `strongest()`.

## Tested (tests/genres/cards.cjs)

Enter starts a match, arrows choose a 1-cost unit and Enter plays it (its label shows its numbers), F
attacks the open lane, E ends the turn, the computer's turn freezes under Esc and goes on after it, a
click plays a card, the gamepad's d-pad moves the choice and west attacks, a portrait screenshot, a win
(the opponent at 1 health facing your unit) into Results and Rematch, a loss (you at 1 health facing a
computer unit) into Game Over and back to the title. Then the kit checks (tests/genres/kit.cjs).
