# Scenarios: Pocket Duel (cards)

A small trading card game against the computer: play cards from your hand with the energy you have, attack down
four lanes, end your turn and let the computer take its own. Each scenario is one test of the same title in
`tests/e2e/genres/cards.cjs` (a fresh game each time); the game kit's own scenarios run too
(`starters/kit/SCENARIOS.md`).

### Scenario: Play vs Computer starts a match on my turn
- Given the title screen with Play vs Computer focused
- When I press Enter
- Then the match starts on my Main phase with 1 / 1 energy and the opponent at 20 health
- And my hand is shown as cards with their names

### Scenario: Arrow keys choose a card and Enter plays it
- Given my first turn of a match
- When I choose a 1-cost unit with the arrow keys and press Enter
- Then the unit stands on my board and my hand has one card less
- And the unit's attack and health are shown over it

### Scenario: F attacks and an open lane hits the opponent
- Given a unit of mine on the board
- When I press F
- Then the Attack phase starts
- And the opponent loses health equal to my unit's attack, as the HUD shows

### Scenario: The computer takes its turn and waits while paused
- Given my first turn of a match
- When I press E to end my turn
- Then it is the opponent's turn and my hand cannot be used
- And while the game is paused with Esc nothing the computer does moves on
- And after Esc it plays and hands the turn back to me for turn 2

### Scenario: The mouse plays a card and the on-screen buttons attack and end the turn
- Given my first turn of a match
- When I click the Squire in my hand
- Then it is played
- And the Attack button starts the Attack phase
- And the End Turn button hands the turn to the opponent

### Scenario: The gamepad d-pad chooses a card and the west button attacks
- Given my first turn of a match and a gamepad
- When I press right on the d-pad
- Then the next card is chosen
- And the west button starts the Attack phase

### Scenario: Every kind of card does what its text says
- Given my turn with 10 energy, 10 health, a Knight facing me and one card of each kind in hand
- When I click Squire, Knight, Archer and Giant
- Then each stands on my board
- And Spark destroys the opponent's Knight
- And Heal brings my health to 14

### Scenario: Bringing the opponent to 0 health wins and Rematch starts again
- Given the opponent at 1 health with an open lane facing my unit
- When I press F
- Then the results read "Victory"
- And Rematch starts a new match on turn 1

### Scenario: Losing my last health is a defeat and Back to Title leaves
- Given I am at 1 health facing a computer Giant
- When I end my turn
- Then the game over screen reads "Defeat"
- And Back to Title shows the title screen

### Scenario: The match fits a phone held upright
- Given my first turn of a match
- When the window becomes a 390 by 844 portrait phone
- Then the whole hand and the buttons fit on the screen

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Move, Attack and End Turn, then the fixed Pause and Back (menus) rows
