# Scenarios: Grid Oath (tactics)

A turn-based grid battle: three of your units against three enemies on a 10 x 8 map. Each scenario is one test of
the same title in `tests/e2e/genres/tactics.cjs` (a fresh game each time); the game kit's own scenarios run too
(`starters/kit/SCENARIOS.md`).

### Scenario: New Game starts the battle on the first unit
- Given the title screen with New Game focused
- When I choose New Game
- Then the battle starts with the cursor on the Knight and the select tutorial showing
- And the unit card reads "Knight" and "HP 14 / 14"

### Scenario: The gamepad d-pad steps the cursor
- Given a battle on the Knight
- When I plug a gamepad and press right, then left, on the d-pad
- Then the cursor steps one tile right and back

### Scenario: Moving a unit opens the action menu and Back undoes the move
- Given a battle on the Knight
- When I select the Knight and move it three tiles right with the arrow keys
- Then the action menu opens with Attack disabled and Wait focused
- And the HUD stays in view beside the menu
- And Esc puts the Knight back where it stood

### Scenario: Wait ends a unit's turn where it stands
- Given the Knight moved three tiles right with the action menu open
- When I choose Wait
- Then the Knight has acted and stays on its new tile

### Scenario: The mouse hovers, chooses and cancels a unit
- Given a battle in the Player Phase
- When I hover the Archer, click it, then right click
- Then the cursor follows the mouse, the Archer is chosen, and the right click cancels it

### Scenario: End Turn asks first, then the enemies move and turn 2 begins
- Given a battle where no unit has acted
- When I press E
- Then a confirm dialog opens with Cancel focused
- And confirming End Turn runs the Enemy Phase, the enemies move, and turn 2 begins

### Scenario: An attack shows the forecast and the enemy loses HP
- Given a Brute standing beside the Knight
- When I select the Knight, stay, and choose Attack
- Then the forecast shows "Hit 100%"
- And confirming the target takes HP from the Brute

### Scenario: Defeating the last enemy shows Victory and Try Again starts over
- Given the last enemy at 1 HP beside the Knight
- When the Knight attacks it
- Then the results read "Victory" with stars
- And Try Again starts a new battle on turn 1 with six units

### Scenario: Esc pauses the battle and Esc resumes
- Given a battle with nothing chosen
- When I press Esc
- Then the pause menu opens and the battle clock stops
- And Esc again resumes the battle

### Scenario: Losing every unit shows Defeat, then the title
- Given my last unit at 1 HP beside a Brute
- When I end the turn and the Enemy Phase runs
- Then Game Over reads "Defeat"
- And Back to Title shows the title screen

### Scenario: Try Again after a defeat starts a new battle
- Given Game Over after my last unit fell
- When I choose Try Again
- Then a new battle starts on turn 1 with six units

### Scenario: The on-screen buttons pick the next unit, cancel and end the turn on a touch screen
- Given a battle played on a touch screen
- When I press the on-screen Next Unit button
- Then the cursor moves to the next unit that has not acted
- And with a unit chosen, the on-screen Back button cancels it
- And the on-screen End Turn button asks first, and Cancel keeps the turn

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Move, Select / Confirm, End Turn and Next Unit, then the fixed Pause and Back (menus) rows
