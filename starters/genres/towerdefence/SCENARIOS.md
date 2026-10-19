# Scenarios: Garden Guard (towerdefence)

A grid tower defence: enemies walk a fixed path in five waves; you place towers on the grass with the keys, the
mouse, a gamepad or a touch screen. Each scenario is one test of the same title in
`tests/e2e/genres/towerdefence.cjs` (a fresh game each time); the game kit's own scenarios run too
(`starters/kit/SCENARIOS.md`).

### Scenario: New Game opens the garden with the HUD and nothing placed
- Given the title screen with New Game focused
- When I choose New Game
- Then the HUD and the place tutorial show
- And no tower is placed and I have 120 gold

### Scenario: The arrow keys step the cursor and Space places a Bolt
- Given a new game started with Enter, the cursor on (5,5)
- When I press down twice and then Space
- Then the cursor is on (5,3)
- And a Bolt stands there and my gold drops to 70

### Scenario: The HUD explains a placement it refuses
- Given a new game with a Bolt placed on (5,3)
- When I press Space on the path
- Then the HUD reads "Not on the path"
- And after I pick the Cannon with 2, Space on grass reads "Not enough gold" and nothing is placed

### Scenario: The mouse places a tower where it points
- Given a new game
- When I point at cell (10,6) and click
- Then a Bolt stands on (10,6) and my gold drops to 70

### Scenario: The gamepad steps the cursor and the shoulders cycle the towers
- Given a new game
- When I plug a gamepad and press left on the d-pad
- Then the cursor steps one cell left
- And the right shoulder picks the next tower, the left shoulder the previous one

### Scenario: Q and E cycle the towers
- Given a new game with the Bolt picked
- When I press E, then Q
- Then the Cannon is picked, then the Bolt again

### Scenario: Starting a wave sends enemies the towers stop for gold
- Given a new game with two Cannons beside the path
- When I press N
- Then wave 1 starts, the HUD reads "Wave 1 / 5" and enemies walk the path
- And the towers stop enemies and my gold rises

### Scenario: Esc stops the enemies and Esc resumes
- Given enemies walking the path in wave 1
- When I press Esc
- Then the pause menu opens and the enemies stop
- And Esc again resumes the wave

### Scenario: A finished wave pays gold that buys another tower
- Given wave 1 running with towers beside the path
- When the last enemy of the wave is stopped
- Then the wave bonus is paid
- And Space places another Bolt with that gold

### Scenario: Surviving the last wave saves the garden
- Given the last wave about to start with strong towers at the entrance
- When I press N and the wave is survived
- Then the results read "Garden Saved" with stars by the lives left
- And Back to Title shows the title screen

### Scenario: Losing the last life is a defeat and Try Again starts over
- Given a new game with one life left
- When I press N and the first enemy walks through the garden
- Then Game Over reads "Defeat" and "The garden fell on wave 1"
- And Try Again starts a new game with 120 gold and no towers

### Scenario: The on-screen buttons pick a tower and start the wave on a touch screen
- Given a new game played on a touch screen
- When I press the on-screen Next Tower button
- Then the Cannon is picked
- And the on-screen Start Wave button starts wave 1

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Move, Place Tower, Start Wave, Next Tower, Previous Tower, Tower 1, Tower 2 and Tower 3, then the fixed Pause and Back (menus) rows
