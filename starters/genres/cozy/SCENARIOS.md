# Scenarios: Sunny Acre (cozy)

A small farm: walk a tile at a time, pick a tool, till, plant and water turnips, sleep, harvest, sell at the bin
and talk to Mabel next door, towards a goal of 500 coins. Nothing fails; each morning autosaves. Each scenario is
one test of the same title in `tests/e2e/genres/cozy.cjs` (a fresh game each time); the game kit's own scenarios
run too (`starters/kit/SCENARIOS.md`).

### Scenario: New Game starts the first spring morning and autosaves it
- Given the title screen with no save, New Game focused and no Continue
- When I press Enter
- Then the HUD shows Spring 1, 6:00 and the Hoe
- And the tool tip shows and the first morning is autosaved

### Scenario: Tools change with the shoulders, Q and R and the hotbar, and the d-pad turns before it steps
- Given the first morning of a new farm and a gamepad
- When I press the right shoulder, then the left one
- Then the tool goes to Turnip Seeds, outlined on the hotbar, and back to the Hoe
- And R picks the next tool, Q the previous one, and a click on the Watering Can slot picks it
- And the first press right on the d-pad only turns me, the second steps one tile

### Scenario: The hoe, the seeds and the watering can work the tile in front
- Given the first morning of a new farm, facing the field
- When I press C with the Hoe, then 2 and C, then 3 and C
- Then the tile is tilled, costing energy, and the tool tip goes
- And a seed is planted, leaving 9 seeds
- And the tile is watered

### Scenario: Sleeping in the bed ends the day and the watered seed sprouts
- Given a watered seed planted on the first day
- When I walk to the bed, press E and choose Sleep
- Then the results read "End of Day 1" and the seed has sprouted
- And Next Morning starts Spring 2 and autosaves it

### Scenario: The clock runs and the day ends by itself at midnight
- Given the first morning of a new farm
- When time passes
- Then the clock moves on
- And at 24:00 the results read "End of Day 1"
- And Next Morning starts Spring 2

### Scenario: A ripe turnip is harvested and sold at the bin, reaching the farm goal
- Given a ripe turnip in front of me and 480 coins
- When I pick it with the Hands and press E at the bin
- Then the HUD counts one turnip, then sells it for 30 g
- And the results read "Farm Goal Reached"
- And Keep Farming returns to the farm with 510 g

### Scenario: Mabel talks and shares seeds once a day
- Given I face Mabel on the first day
- When I talk to her and answer "Any seeds to spare?"
- Then I have 15 seeds and the HUD says so
- And asking again the same day gives no more seeds
- And "Just saying hi" ends the talk with nothing given

### Scenario: Esc pauses the clock and Esc resumes
- Given the farm day is running
- When I press Esc
- Then the pause menu opens and the clock stops
- And Esc again resumes the day

### Scenario: Continue after a reload brings back the saved morning
- Given a farm autosaved on the morning of Spring 3 with a young turnip
- When I quit to the title, reload the page and choose Continue
- Then Continue was focused and showed Spring 3
- And the farm comes back as it was saved

### Scenario: Leaving at the farm goal keeps the save and New Game asks before replacing it
- Given a saved farm at the Farm Goal Reached results
- When I choose Back to Title
- Then the title shows Continue, focused
- And New Game asks first, Cancel keeps the title
- And confirming New Game starts a fresh farm on Spring 1

### Scenario: The on-screen Use, Tool and Talk buttons farm on a touch screen
- Given the first morning of a new farm on a touch screen
- When I press Use, then Tool, then Talk in front of Mabel
- Then the tile in front is tilled
- And the next tool is picked
- And Mabel starts talking

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Move, Use Tool, Talk / Harvest, Next Tool and Previous Tool, then the fixed Pause and Back (menus) rows
