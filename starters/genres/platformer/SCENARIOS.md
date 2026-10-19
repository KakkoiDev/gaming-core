# Scenarios: Hop Hill (platformer)

A side-scrolling platformer: walk and jump (hold for higher), collect coins, avoid or stomp enemies, pass the
checkpoint and reach the flag. Each scenario is one test of the same title in `tests/e2e/genres/platformer.cjs`
(a fresh game each time); the game kit's own scenarios run too (`starters/kit/SCENARIOS.md`).

### Scenario: Play starts the first level with the HUD and its name
- Given the title screen with Play focused
- When I press Enter
- Then the level starts with the HUD and the movement tutorial showing
- And the HUD shows the level name "1-1 Windy Ledge"

### Scenario: Walking collects coins and a held jump reaches the raised platform
- Given the first level just started
- When I walk right over the first coins and hold Space to jump while still walking
- Then the hero lands on the raised platform
- And at least three coins are collected and the HUD shows them

### Scenario: Running into an enemy costs a life and sends the hero back to the start
- Given the first level just started with three lives
- When I walk right into the first enemy
- Then a life is lost and the hero is back at the start
- And the HUD shows two lives

### Scenario: Reaching the flag shows the results with time, coins and stars
- Given the hero just past the last block, after the checkpoint
- When I walk right to the flag
- Then the results read "Level Clear" with Time and Coins rows and three stars
- And the best time is saved
- And Back to Title returns to the title

### Scenario: Replay after the results starts again with the best time showing
- Given the results after reaching the flag, with Replay focused
- When I press Enter
- Then the level starts again with three lives, no coins and the timer at zero
- And the best time shows under the timer

### Scenario: Esc pauses the world and Esc resumes
- Given the hero walking right in the first level
- When I press Esc
- Then the pause menu opens and nothing moves for 12 ticks
- And Esc again resumes the game

### Scenario: The gamepad walks with the d-pad and jumps with the south button
- Given the first level with a gamepad plugged in
- When I hold right on the d-pad, then press the south button
- Then the hero walks right, then jumps and lands again

### Scenario: Losing the last life shows Game Over
- Given the hero on the last life, walking toward an enemy
- When the enemy touches the hero
- Then the Game Over screen reads "Game Over"
- And Back to Title returns to the title

### Scenario: Continue after Game Over starts the level again with three lives
- Given the Game Over screen after losing the last life
- When I choose Continue
- Then the level starts again with three lives and no coins

### Scenario: The on-screen arrows and Jump button move the hero on a touch screen
- Given the first level played on a touch screen
- When I press the on-screen Right button, then Left, then Jump
- Then the hero walks right, walks back left, and jumps

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Move, Jump, Run and Down / Drop Through, then the fixed Pause and Back (menus) rows
