# Scenarios: Deepwell (roguelike)

A turn-based grid roguelike: seeded floors, one step per direction press, bump a monster to attack it, potions to
drink, stairs down; floor 3's stairs win the run and HP 0 ends it for good. Each scenario is one test of the same
title in `tests/e2e/genres/roguelike.cjs` (a fresh game each time); the game kit's own scenarios run too
(`starters/kit/SCENARIOS.md`).

### Scenario: Start Run opens floor 1 of a seeded run
- Given the title screen with Start Run focused and the next seed set to 4242
- When I press Enter
- Then the HUD shows Seed 4242, Floor 1 and 20 / 20 health
- And the move tutorial shows
- And building floor 1 again from the same seed gives the same layout

### Scenario: One arrow press is one step and one turn
- Given a run on floor 1
- When I tap the arrow key towards the nearest monster
- Then I move exactly one tile and the turn counter reads 1
- And the move tutorial goes away

### Scenario: Bumping a monster attacks it and it hits back
- Given a run on floor 1
- When I walk into the nearest monster until it dies
- Then my kills count is 1
- And my health is below the maximum because it hit back

### Scenario: A potion picked up and drunk heals me
- Given a run on floor 1 with some health lost
- When I walk onto a potion and press 1
- Then the HUD shows the potion in my bag before I drink it
- And drinking it raises my health and empties that slot

### Scenario: Esc pauses the world and Esc resumes
- Given a run on floor 1
- When I press Esc and then the down arrow
- Then the pause menu is open and nothing moves for 12 ticks: not the clock, the turn or me
- And Esc again resumes the run

### Scenario: The gamepad d-pad takes one step
- Given a run on floor 1 with a gamepad plugged in
- When I press the d-pad towards the stairs
- Then one turn passes

### Scenario: The stairs lead down to floor 2
- Given a run on floor 1
- When I walk onto the stairs
- Then the HUD shows Floor 2

### Scenario: The stairs on floor 3 win the run
- Given a run on floor 3, standing next to the stairs
- When I step onto the stairs
- Then the results read "You Escaped the Well" and list my Kills
- And New Run is focused first
- And Back to Title returns to the title

### Scenario: HP 0 ends the run for good
- Given a run with 1 health left
- When I walk into a monster and it hits me
- Then the game over screen reads "Run Over" with the floor, time and the monster that slew me
- And New Run is focused first and there is no Load a Save
- And New Run starts a fresh run on floor 1 with full health

### Scenario: Quit from the pause menu goes back to the title
- Given the pause menu is open during a run
- When I choose Quit to Title and confirm
- Then the title screen shows

### Scenario: The on-screen buttons wait and drink on a touch screen
- Given a run played on a touch screen with a potion in my bag and some health lost
- When I press the on-screen Wait a Turn button
- Then one turn passes
- And pressing the on-screen Drink Potion button raises my health

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Move, Attack, Wait a Turn and Drink Potion, then the fixed Pause and Back (menus) rows
