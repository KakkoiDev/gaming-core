# Scenarios: Lantern Lane (visualnovel)

A short visual novel: lines typed in a dialogue box, two choices, a log, Auto, three save slots and two endings.
Each scenario is one test of the same title in `tests/e2e/genres/visualnovel.cjs` (a fresh game, with no saves,
each time); the game kit's own scenarios run too (`starters/kit/SCENARIOS.md`).

### Scenario: The title offers Start and no Continue before a save
- Given the title screen of a first visit
- When I look at the menu
- Then Start is focused, Continue is hidden and Load Game is disabled
- And choosing Start types the first line of the story

### Scenario: Enter finishes a typing line, then goes to the next one
- Given the first line of the story still typing
- When I press Enter
- Then the whole line shows
- And Enter again shows the next line, spoken by Mika

### Scenario: The gamepad's south button is Next line too
- Given the second line of the story
- When I plug a gamepad and press the south button twice
- Then the line finishes, then the third line shows

### Scenario: The log shows the lines so far and closes again
- Given the third line of the story
- When I press L
- Then the log lists the lines so far with what Mika said
- And Esc closes it and the box keeps its place
- And the Log button on the box opens it again and Close closes it

### Scenario: Choosing with the keys follows the search route
- Given the Keeper's question with its two choices
- When I press down and Enter
- Then the search scene opens and the story remembers that I searched

### Scenario: Clicking a choice follows the helping route
- Given the Keeper's question with its two choices
- When I click "Help light the lanterns"
- Then the lighting scene opens
- And at the river Mika says the line of the helping route

### Scenario: Esc pauses the scene
- Given a line of the search scene
- When I press Esc
- Then the pause menu opens and the scene stops
- And Resume brings the box back

### Scenario: Saving from the pause menu keeps the scene, the line and the choices
- Given the second line of the search scene
- When I open the pause menu, choose Save and pick Slot 1
- Then slot 1 holds the search scene, line 2 and the search choice

### Scenario: Saving over a used slot asks first
- Given slot 1 already holds a save
- When I press the Save button on the box and pick Slot 1
- Then a confirm dialog asks before replacing it
- And Overwrite saves the current line in slot 1

### Scenario: Releasing the lantern reaches ending 1
- Given the river's choice on the search route
- When I press 1
- Then the story reaches "Ending 1 of 2: The River Lights"
- And Back to Title shows the title screen

### Scenario: Continue after a reload brings back the saved line
- Given a save in slot 1 on the search scene and a reloaded page
- When I choose Continue, which is focused
- Then the saved scene, line and choices are back

### Scenario: Load Game opens a saved slot
- Given a save in slot 1 on the search scene and a reloaded page
- When I choose Load Game and pick Slot 1
- Then the saved scene and line are back

### Scenario: Auto advances the lines by itself and A turns it off
- Given a line of the search scene
- When I press the Auto button on the box
- Then the lines advance without a press
- And A turns Auto off
- And the Menu button on the box opens the pause menu

### Scenario: Carrying the lantern back reaches ending 2 and both endings are listed
- Given ending 1 found before and the river's choice
- When I press down and Enter
- Then the story reaches "Ending 2 of 2: The Lane at Dawn" with 2 / 2 endings found
- And Endings on the title lists both, and Close closes it

### Scenario: In a portrait window the box sits under the scene
- Given a line of the story in a portrait window
- When I look at the screen
- Then the dialogue box is at the bottom, inside the window

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Next line, Log and Auto, then the fixed Pause and Back (menus) rows
