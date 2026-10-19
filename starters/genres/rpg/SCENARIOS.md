# Scenarios: Meadow Tale (rpg)

A small top-down RPG: walk the village and the forest, talk to the elder and take her quest, fight slimes, drink
potions from the bag, save in three slots and bring the lost key back. Each scenario is one test of the same title in
`tests/e2e/genres/rpg.cjs` (a fresh game each time); the game kit's own scenarios run too (`starters/kit/SCENARIOS.md`).

### Scenario: New Game starts in the village with full health
- Given the title screen with no save
- When I read the menu
- Then New Game is focused, Load Game is disabled and there is no Continue
- And Enter starts the game with the HUD showing 10/10 health and the move tutorial

### Scenario: The gamepad stick walks and its face buttons open and close the bag
- Given a new game with a gamepad plugged in
- When I push the left stick right
- Then the hero walks right
- And the north button opens the bag and pauses the world
- And the east button closes it and the world runs again

### Scenario: Talking to the elder and accepting starts the quest
- Given a new game
- When I walk to the elder and press Enter
- Then a dialogue from Elder Rowan opens and its lines type out as I press Enter
- And the first choice is focused
- And choosing "I will find it" closes the dialogue and the objective reads "Find the lost key in the forest"

### Scenario: Declining the elder leaves the quest for later
- Given a new game on a touch screen, standing next to the elder
- When I press the on-screen Talk button and choose "Not now" when she asks me to find her key
- Then she says to come back if I change my mind
- And no quest starts

### Scenario: Attack defeats a slime and it drops a potion
- Given the quest to find the key, standing in the forest
- When I face the nearest slime and press J until it dies
- Then one slime is defeated and the HUD shows my health
- And walking onto the potion it dropped puts it in my bag

### Scenario: The bag drinks one potion and drops another
- Given two potions in my bag and 4 health
- When I open the bag with I and use the Potion
- Then my health rises by 5 and one potion is left
- And Drop puts the last potion back on the ground and empties the bag

### Scenario: The pause menu stops the slimes and saves in slot 1
- Given the quest to find the key, standing in the forest
- When I press Esc
- Then the pause menu opens and the slimes do not move for 15 ticks
- And Save, then Slot 1, writes a save of the forest with the quest in it
- And Slots 2 and 3 are still empty

### Scenario: Bringing the key back completes the quest
- Given the quest to find the key, the slimes gone, standing next to the key in the far east
- When I step onto the key and walk it back to the elder and talk to her
- Then the objective reads "Bring the key back to the elder" on the way
- And the results read "Quest Complete" and the key has left my bag
- And Keep Exploring goes back to playing

### Scenario: Fainting offers Continue from the last save
- Given a save in slot 1 of the forest and a game in progress
- When my health reaches 0
- Then Game Over offers Continue
- And Back to Title shows the title with Continue and the save's place and time
- And Continue loads the save

### Scenario: Load Game on the title loads a chosen slot
- Given a save in slot 1 of the forest
- When I choose Load Game on the title and then Slot 1
- Then the game starts in the forest at the saved place with the saved quest

### Scenario: Quit from the pause menu goes back to the title
- Given the pause menu is open during a game
- When I choose Quit to Title and confirm
- Then the title screen shows

### Scenario: The on-screen buttons attack and open the bag on a touch screen
- Given a new game played on a touch screen, a slime right in front of the hero
- When I press the on-screen Attack button
- Then the hero swings and hits the slime in front of it
- And the on-screen Items button opens the bag and pauses the world

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Move, Attack, Confirm / talk and Field menu (bag), then the fixed Pause and Back (menus) rows
