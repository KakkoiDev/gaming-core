# Scenarios: Push Puzzle (puzzle)

Sokoban: push every crate onto a mark, one step per press, with Undo and Restart always at hand, stars by moves and
a level list that opens level by level. Each scenario is one test of the same title in
`tests/e2e/genres/puzzle.cjs` (a fresh game each time); the game kit's own scenarios run too
(`starters/kit/SCENARIOS.md`).

### Scenario: Play starts the first level with the HUD and the tutorial
- Given the title screen with Play focused
- When I press Enter
- Then level 1 starts with the HUD and the tutorial showing
- And the HUD reads "Level 1" and "0 moves"

### Scenario: A push moves the crate, Undo puts it back and a wall counts no move
- Given level 1 just started
- When I press right once
- Then the player pushed the crate one cell, the HUD reads "1 move" and the tutorial is gone
- And Z puts the crate and the player back
- And walking up into a wall counts no move

### Scenario: Restart resets the board and can itself be undone
- Given level 1 after two moves
- When I press R
- Then the board and the moves are back to the start
- And Z brings the two moves back and Backspace undoes one
- And the HUD's Undo and Restart buttons undo and restart too

### Scenario: Esc pauses the board and the pause menu can restart the level
- Given level 1 just started
- When I press Esc
- Then the pause menu opens and a direction key does not move the player
- And Esc again resumes the game
- And Restart in the pause menu resumes with the board reset

### Scenario: One d-pad press is one push and the prompts follow the gamepad
- Given level 1 with a gamepad plugged in
- When I press right on the d-pad once
- Then the crate is pushed one cell and one move is counted
- And the Undo button shows the west button's position

### Scenario: Solving at par gives three stars, saves progress and Next Level opens level 2
- Given level 1 just started
- When I play its six-move solution
- Then the results read "Solved!" with three stars and the moves
- And the progress saves three stars and a best of 6
- And Next Level, focused, starts level 2

### Scenario: On a phone the level fits between the HUD and the buttons
- Given level 2 just started
- When the window turns into a portrait phone
- Then the whole level fits the screen's width

### Scenario: A tap on the cell next to the player steps there, a far tap does nothing
- Given level 2 just started
- When I click the cell right of the player
- Then the player steps there and one move is counted
- And a click three cells away counts no move

### Scenario: Play continues at the next unsolved level
- Given levels 1 and 2 solved
- When I go back to the title and choose Play
- Then level 3 starts
- And more moves than par give fewer stars
- And Quit to Title from the pause menu asks first, then goes back to the title

### Scenario: The results offer Try Again and Level Select
- Given the results of level 1
- When I choose Try Again
- Then level 1 starts again with no moves
- And after solving it again, Level Select opens the level list where level 2 is open

### Scenario: Level Select shows the stars and starts a chosen level
- Given levels 1 and 2 solved with three stars
- When I choose Levels on the title screen
- Then levels 1 and 2 show three stars, level 3 shows none and is focused
- And Esc goes back to the title
- And choosing level 2 from the list starts it

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Move, Undo and Restart, then the fixed Pause and Back (menus) rows
