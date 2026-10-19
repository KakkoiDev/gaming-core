# Scenarios: Star Lane (shooter)

A vertical shoot 'em up: waves come from the top, hold Shoot to fire, Bomb clears the enemy bullets and the Hive
Queen ends the stage; lives, continues and a top-10 table. Each scenario is one test of the same title in
`tests/e2e/genres/shooter.cjs` (a fresh game each time); the game kit's own scenarios run too
(`starters/kit/SCENARIOS.md`).

### Scenario: Start opens the stage with the fire hint
- Given the title screen with Start focused
- When I press Enter
- Then the HUD shows and the title is gone
- And the hint to hold Shoot shows

### Scenario: Holding Z while sweeping shoots the waves and the score rises
- Given a new stage
- When I hold Z and sweep the ship left and right with the arrow keys
- Then my shots hit and the score reaches 500
- And the HUD shows the score

### Scenario: A bomb clears the enemy bullets
- Given a stage with enemy bullets flying
- When I press X
- Then one bomb is used and no enemy bullet is left on screen
- And the HUD shows one bomb icon fewer

### Scenario: Esc pauses the stage and Esc resumes
- Given a stage in play
- When I press Esc
- Then the pause menu opens and the stage clock does not move for 15 ticks
- And Esc again resumes the stage

### Scenario: The gamepad stick moves the ship and south fires
- Given a stage in play with a gamepad plugged in
- When I push the left stick towards the far side
- Then the ship moves more than one unit that way
- And holding the south button fires

### Scenario: The Hive Queen arrives when the waves are done
- Given a stage whose waves are all over
- When the boss time comes
- Then the Hive Queen flies in
- And her name and HP bar show at the top of the HUD

### Scenario: Beating the Hive Queen with the mouse clears the stage and records a top score
- Given the Hive Queen on screen with 6 HP left
- When I hold the left mouse button under her and follow her with the pointer
- Then she is beaten and the results read "Stage Clear" with a name entry
- And after I type "ace" the high score table shows ACE
- And Play Again starts a new stage at 0 with three lives

### Scenario: Losing the last life offers a Continue
- Given a stage with some score and one life left
- When an enemy bullet hits the ship
- Then the game over screen reads "Game Over" with Continue focused
- And Continue goes back to the stage with the score at 0, three lives and one continue fewer

### Scenario: With no continues left Game Over goes back to the title
- Given a stage with one life and no continues left
- When an enemy bullet hits the ship
- Then Continue is disabled and Back to Title is focused
- And Back to Title shows the title screen

### Scenario: High Scores on the title shows the table and Back closes it
- Given the title screen
- When I choose High Scores
- Then the high score table opens
- And Back returns to the title menu

### Scenario: Quit from the pause menu goes back to the title
- Given the pause menu is open during a stage
- When I choose Quit to Title and confirm
- Then the title screen shows

### Scenario: The on-screen Bomb button bombs on a touch screen
- Given a stage played on a touch screen
- When I press the on-screen Bomb button
- Then one bomb is used

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Move, Shoot, Bomb and Focus (slow), then the fixed Pause and Back (menus) rows
